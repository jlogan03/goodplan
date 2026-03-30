/**
 * `gp verify` — standalone state integrity check.
 * `gp verify --fix` — recompute and re-embed the state signature.
 *
 * Uses assembleState() directly (bypassing loadState() and its HMAC
 * verification) — this is the escape hatch for broken signatures.
 *
 * Error handling: catches its own errors (like state.ts), not delegating
 * to the top-level handler. This keeps JSON/human output symmetry explicit.
 *
 * Architecture: INV-001 exception — verify --fix writes signature metadata
 * directly (not through commitState/state machine). Signature repair is
 * infrastructure metadata maintenance, not a workflow state transition.
 */

import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { assembleState } from "../../core/data/assemble.js";
import { atomicWrite } from "../../core/data/commit.js";
import { signStateTree, verifyStateTree } from "../../core/data/hmac.js";
import { resolveProjectDir } from "../../core/data/project.js";
import { getJson } from "../../core/data/tree.js";
import { projectSchema } from "../../schemas/entities/project.js";
import type { Project } from "../../schemas/entities/project.js";
import { GoodplanError } from "../../util/errors.js";
import { deterministicStringify } from "../../util/json.js";
import { exitCodeForError, output, outputError, outputUnexpectedError } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

export const verifyCommand = defineCommand({
	meta: {
		name: "verify",
		description:
			"Verify state integrity (HMAC signature). Use --fix to recompute and re-embed the signature.",
	},
	args: {
		...globalArgs,
		fix: {
			type: "boolean",
			description: "Recompute and re-embed the state signature",
			default: false,
		},
	},
	setup() {},
	async run({ args }) {
		try {
			const dir = resolveProjectDir();
			const state = assembleState(dir);

			const project = getJson<Project>(state, "project.json");
			if (project === undefined) {
				throw new GoodplanError("DATA_NO_PROJECT", "No project.json found in .goodplan/ directory");
			}

			if (args.fix) {
				// Recompute signature, embed, validate, write atomically
				const signature = signStateTree(state);
				const cloneWithSignature = {
					...project,
					stateSignature: signature,
				};
				const parsed = projectSchema.parse(cloneWithSignature);
				const content = `${deterministicStringify(parsed)}\n`;
				const absPath = path.join(dir, "project.json");

				atomicWrite(absPath, content, "project.json");

				if (args.query || args.json) {
					output({ status: "fixed" }, args);
				} else {
					output("State signature recomputed.", args);
				}
			} else {
				// Read-only verification
				const signature = project.stateSignature;
				if (signature === undefined) {
					// Bootstrap: no signature yet
					if (args.query || args.json) {
						output({ status: "pass", note: "No signature present (bootstrap)" }, args);
					} else {
						output(
							`${pc.green("State integrity: pass")} ${pc.dim("(no signature — bootstrap)")}`,
							args,
						);
					}
					return;
				}

				if (!verifyStateTree(state, signature)) {
					throw new GoodplanError(
						"DATA_INTEGRITY_CHECK_FAILED",
						"State integrity check failed. Run 'gp verify --fix' to repair.",
					);
				}

				const shortSig = signature.slice(0, 8);
				if (args.query || args.json) {
					output({ status: "pass" }, args);
				} else {
					output(`${pc.green("State integrity: pass")} ${pc.dim(`(sig: ${shortSig})`)}`, args);
				}
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
