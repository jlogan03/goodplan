/**
 * `gp verify` — project integrity verification.
 *
 * Performs v2 event log structural checks:
 * 1. JSON validity of each event in events.jsonl files
 * 2. Schema conformance (AnyEventEnvelopeSchema validation)
 * 3. prevId chain integrity (each event's prevId matches previous event's id)
 * 4. ContentRef SHA verification (git blob exists)
 * 5. schemaVersion monotonicity (non-decreasing within each scope)
 *
 * Also performs v1 HMAC check if project.json with stateSignature exists (backward compat).
 *
 * `gp verify --fix` recomputes the v1 HMAC signature (escape hatch for broken signatures).
 *
 * Architecture: INV-001 exception — verify --fix writes signature metadata
 * directly (not through commitState/state machine).
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { atomicWrite } from "../../core/data/commit.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { AnyEventEnvelopeSchema } from "../../schemas/envelope.js";
import { projectSchema } from "../../schemas/entities/project.js";
import type { Project } from "../../schemas/entities/project.js";
import { GoodplanError } from "../../util/errors.js";
import { deterministicStringify } from "../../util/json.js";
import { exitCodeForError, output, outputError, outputUnexpectedError } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

// ─── V2 Event Log Verification ──────────────────────────────

interface EventLogIssue {
	file: string;
	line: number;
	issue: string;
}

interface VerifyResult {
	status: "pass" | "fail";
	eventsChecked: number;
	scopesChecked: number;
	issues: EventLogIssue[];
	v1HmacStatus?: "pass" | "fail" | "bootstrap" | "skipped";
}

function findEventLogFiles(dir: string): string[] {
	const files: string[] = [];

	// Project-level events.jsonl
	const projectEvents = path.join(dir, "events.jsonl");
	if (fs.existsSync(projectEvents)) {
		files.push(projectEvents);
	}

	// Epic-scoped events.jsonl
	const epicsDir = path.join(dir, "epics");
	if (fs.existsSync(epicsDir) && fs.statSync(epicsDir).isDirectory()) {
		for (const entry of fs.readdirSync(epicsDir)) {
			const epicEvents = path.join(epicsDir, entry, "events.jsonl");
			if (fs.existsSync(epicEvents)) {
				files.push(epicEvents);
			}
		}
	}

	// Side-quest-scoped events.jsonl
	const sqDir = path.join(dir, "side-quests");
	if (fs.existsSync(sqDir) && fs.statSync(sqDir).isDirectory()) {
		for (const entry of fs.readdirSync(sqDir)) {
			const sqEvents = path.join(sqDir, entry, "events.jsonl");
			if (fs.existsSync(sqEvents)) {
				files.push(sqEvents);
			}
		}
	}

	return files;
}

function verifyEventLog(filePath: string, dir: string): { eventsChecked: number; issues: EventLogIssue[] } {
	const relPath = path.relative(dir, filePath);
	const issues: EventLogIssue[] = [];
	let eventsChecked = 0;

	let content: string;
	try {
		content = fs.readFileSync(filePath, "utf-8");
	} catch {
		issues.push({ file: relPath, line: 0, issue: "Cannot read file" });
		return { eventsChecked, issues };
	}

	const lines = content.split("\n").filter((l) => l.trim().length > 0);
	let prevId: string | null = null;
	let prevSchemaVersion = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;
		const lineNum = i + 1;
		eventsChecked++;

		// 1. JSON validity
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			issues.push({ file: relPath, line: lineNum, issue: "Invalid JSON" });
			continue;
		}

		// 2. Schema conformance
		const result = AnyEventEnvelopeSchema.safeParse(parsed);
		if (!result.success) {
			const errorMsg = result.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; ");
			issues.push({ file: relPath, line: lineNum, issue: `Schema error: ${errorMsg}` });
			continue;
		}

		const event = result.data;

		// 3. prevId chain integrity
		if (i === 0) {
			if (event.prevId !== null) {
				issues.push({
					file: relPath,
					line: lineNum,
					issue: `First event should have prevId: null, got "${event.prevId}"`,
				});
			}
		} else {
			if (event.prevId !== prevId) {
				issues.push({
					file: relPath,
					line: lineNum,
					issue: `prevId chain broken: expected "${prevId}", got "${event.prevId}"`,
				});
			}
		}
		prevId = event.id;

		// 4. ContentRef SHA verification (check git blob exists)
		const payload = event.payload as Record<string, unknown>;
		for (const [key, value] of Object.entries(payload)) {
			if (
				typeof value === "object" &&
				value !== null &&
				"sha" in value &&
				typeof (value as Record<string, unknown>).sha === "string"
			) {
				const sha = (value as Record<string, unknown>).sha as string;
				try {
					execFileSync("git", ["cat-file", "-t", sha], {
						cwd: dir,
						stdio: "pipe",
						encoding: "utf-8",
					});
				} catch {
					issues.push({
						file: relPath,
						line: lineNum,
						issue: `ContentRef "${key}" SHA ${sha.slice(0, 8)}... not found in git`,
					});
				}
			}
		}

		// 5. schemaVersion monotonicity
		if (event.schemaVersion < prevSchemaVersion) {
			issues.push({
				file: relPath,
				line: lineNum,
				issue: `schemaVersion decreased: ${event.schemaVersion} < ${prevSchemaVersion}`,
			});
		}
		prevSchemaVersion = event.schemaVersion;
	}

	return { eventsChecked, issues };
}

// ─── V1 HMAC Verification (backward compat) ────────────────

function verifyV1Hmac(dir: string): "pass" | "fail" | "bootstrap" | "skipped" {
	const projectJsonPath = path.join(dir, "project.json");
	if (!fs.existsSync(projectJsonPath)) {
		return "skipped";
	}

	try {
		const raw = fs.readFileSync(projectJsonPath, "utf-8");
		const project = JSON.parse(raw) as Record<string, unknown>;
		if (project.stateSignature === undefined) {
			return "bootstrap";
		}

		// Dynamic import to avoid breaking if hmac.ts is eventually removed
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { assembleState } = require("../../core/data/assemble.js") as {
				assembleState: (dir: string) => unknown;
			};
			const { verifyStateTree } = require("../../core/data/hmac.js") as {
				verifyStateTree: (state: unknown, sig: string) => boolean;
			};

			const state = assembleState(dir);
			return verifyStateTree(state, project.stateSignature as string) ? "pass" : "fail";
		} catch {
			// HMAC modules may have been removed — skip v1 check
			return "skipped";
		}
	} catch {
		return "skipped";
	}
}

// ─── Command ────────────────────────────────────────────────

export const verifyCommand = defineCommand({
	meta: {
		name: "verify",
		description:
			"Verify project integrity: event log structure, prevId chains, ContentRef SHAs, schema conformance.",
	},
	args: {
		...globalArgs,
		fix: {
			type: "boolean",
			description: "Recompute and re-embed the v1 HMAC state signature (escape hatch)",
			default: false,
		},
	},
	setup() {},
	async run({ args }) {
		try {
			const dir = resolveProjectDir();

			if (args.fix) {
				// V1 HMAC fix — keep as escape hatch
				try {
					const { assembleState } = await import("../../core/data/assemble.js");
					const { signStateTree } = await import("../../core/data/hmac.js");
					const { getJson } = await import("../../core/data/tree.js");

					const state = assembleState(dir);
					const project = getJson<Project>(state, "project.json");
					if (project === undefined) {
						throw new GoodplanError("DATA_NO_PROJECT", "No project.json found");
					}

					const signature = signStateTree(state);
					const cloneWithSignature = { ...project, stateSignature: signature };
					const parsed = projectSchema.parse(cloneWithSignature);
					const content = `${deterministicStringify(parsed)}\n`;
					atomicWrite(path.join(dir, "project.json"), content, "project.json");

					if (args.query || args.json) {
						output({ status: "fixed" }, args);
					} else {
						output("State signature recomputed.", args);
					}
				} catch (err) {
					if (err instanceof GoodplanError) throw err;
					throw new GoodplanError(
						"DATA_INTEGRITY_CHECK_FAILED",
						`Cannot fix signature: ${err instanceof Error ? err.message : String(err)}`,
					);
				}
				return;
			}

			// V2 event log verification
			const eventFiles = findEventLogFiles(dir);
			let totalEvents = 0;
			const allIssues: EventLogIssue[] = [];

			for (const file of eventFiles) {
				const result = verifyEventLog(file, dir);
				totalEvents += result.eventsChecked;
				allIssues.push(...result.issues);
			}

			// V1 HMAC check (backward compat)
			const hmacStatus = verifyV1Hmac(dir);

			const verifyResult: VerifyResult = {
				status: allIssues.length === 0 ? "pass" : "fail",
				eventsChecked: totalEvents,
				scopesChecked: eventFiles.length,
				issues: allIssues,
				...(hmacStatus !== "skipped" ? { v1HmacStatus: hmacStatus } : {}),
			};

			if (args.query || args.json) {
				output(verifyResult, args);
			} else if (!args.quiet) {
				if (allIssues.length === 0) {
					output(
						`${pc.green("Integrity: pass")} — ${totalEvents} events across ${eventFiles.length} scope(s)`,
						args,
					);
				} else {
					output(`${pc.red("Integrity: FAIL")} — ${allIssues.length} issue(s) found:`, args);
					for (const issue of allIssues.slice(0, 20)) {
						process.stderr.write(`  ${issue.file}:${issue.line}: ${issue.issue}\n`);
					}
					if (allIssues.length > 20) {
						process.stderr.write(`  ... and ${allIssues.length - 20} more\n`);
					}
				}
				if (hmacStatus === "fail") {
					process.stderr.write(
						`${pc.yellow("Warning")}: v1 HMAC signature mismatch. Run 'gp verify --fix' to repair.\n`,
					);
				}
			}

			if (allIssues.length > 0) {
				process.exitCode = 1;
			}
		} catch (error: unknown) {
			const errorArgs = args.query || args.json ? ({ json: true, query: args.query } as const) : {};
			if (error instanceof GoodplanError) {
				outputError(error, errorArgs);
			} else {
				outputUnexpectedError(error, errorArgs);
			}
			process.exitCode = exitCodeForError(error);
		}
	},
});
