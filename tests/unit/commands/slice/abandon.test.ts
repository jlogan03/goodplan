import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../../../src/core/rpc/init.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-slice-abandon-"));
	projectDir = path.join(tmpDir, ".goodplan");
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

function initProject(name = "test") {
	rpcInit(projectDir, name);
}

function captureStdout(): { chunks: string[]; restore: () => void } {
	const chunks: string[] = [];
	const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
		chunks.push(String(chunk));
		return true;
	});
	return { chunks, restore: () => spy.mockRestore() };
}

async function runEpicCreate(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { epicCreateCommand } = await import("../../../../src/commands/epic/create.js");
	const def = await epicCreateCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSliceCreate(args: Record<string, unknown>, stdin: Record<string, unknown> = {}) {
	const stdinModule = await import("../../../../src/util/stdin.js");
	vi.spyOn(stdinModule, "readStdin").mockResolvedValue(stdin);
	const { sliceCreateCommand } = await import("../../../../src/commands/slice/create.js");
	const def = await sliceCreateCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

async function runSliceAbandon(args: Record<string, unknown>) {
	const { sliceAbandonCommand } = await import("../../../../src/commands/slice/abandon.js");
	const def = await sliceAbandonCommand;
	if (def.run) {
		await def.run({
			args: { json: false, quiet: false, verbose: false, ...args },
			rawArgs: [],
			cmd: def,
		});
	}
}

describe("slice:abandon (v2)", () => {
	it("appends slice-abandoned event and returns MutatingCommandOutput", async () => {
		initProject();
		await runEpicCreate({ json: true }, { name: "e1" });
		await runSliceCreate({ epic: "e1", json: true }, { name: "s1" });

		const { chunks, restore } = captureStdout();
		await runSliceAbandon({
			epic: "e1",
			slice: "s1",
			reason: "Not needed",
			json: true,
		});

		const parsed = JSON.parse(chunks.join(""));
		expect(parsed.ok).toBe(true);
		expect(parsed.event).toBeTruthy();
		expect(parsed.entity).toBe("slice:s1");

		restore();
	});

	it("appends correct payload to events.jsonl", async () => {
		initProject();
		await runEpicCreate({ json: true }, { name: "e1" });
		await runSliceCreate({ epic: "e1", json: true }, { name: "s1" });

		const { restore } = captureStdout();
		await runSliceAbandon({
			epic: "e1",
			slice: "s1",
			reason: "Changed plans",
			json: true,
		});

		const eventsPath = path.join(projectDir, "epics", "e1", "events.jsonl");
		const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n");
		const events = lines.map((l) => JSON.parse(l));
		const abandonEvent = events.find((e) => e.type === "slice-abandoned");
		expect(abandonEvent).toBeDefined();
		expect(abandonEvent.domain).toBe("entity-lifecycle");
		expect(abandonEvent.payload.sliceRef).toBe("s1");
		expect(abandonEvent.payload.reason).toBe("Changed plans");

		restore();
	});

	it("shows human-readable output", async () => {
		initProject();
		await runEpicCreate({ json: true }, { name: "e1" });
		await runSliceCreate({ epic: "e1", json: true }, { name: "s1" });

		const { chunks, restore } = captureStdout();
		await runSliceAbandon({
			epic: "e1",
			slice: "s1",
			reason: "Done",
		});

		const outputStr = chunks.join("");
		expect(outputStr).toContain("Abandoned");
		expect(outputStr).toContain("s1");

		restore();
	});
});
