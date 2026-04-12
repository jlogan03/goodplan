import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rpcInit } from "../../../../src/core/rpc/init.js";

let tmpDir: string;
let projectDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-ctx-helper-"));
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

describe("createEventCommandContext", () => {
	it("returns context with epicName and epicEventsPath for existing epic", async () => {
		initProject();
		// Create epic dir + events file
		const epicDir = path.join(projectDir, "epics", "e1");
		fs.mkdirSync(epicDir, { recursive: true });
		fs.writeFileSync(path.join(epicDir, "events.jsonl"), "");

		const { createEventCommandContext } = await import(
			"../../../../src/commands/_shared/command-context.js"
		);

		const ctx = createEventCommandContext({ epic: "e1" }, { requireSlice: false });
		expect(ctx.epicName).toBe("e1");
		expect(ctx.epicEventsPath).toContain("epics/e1/events.jsonl");
		expect(ctx.branch).toBeDefined();
		expect(typeof ctx.beforeAppend).toBe("function");
		expect(ctx.sliceName).toBeUndefined();
	});

	it("returns sliceName when requireSlice is true", async () => {
		initProject();
		const epicDir = path.join(projectDir, "epics", "e1");
		fs.mkdirSync(epicDir, { recursive: true });
		fs.writeFileSync(path.join(epicDir, "events.jsonl"), "");

		const { createEventCommandContext } = await import(
			"../../../../src/commands/_shared/command-context.js"
		);

		const ctx = createEventCommandContext({ epic: "e1", slice: "s1" }, { requireSlice: true });
		expect(ctx.epicName).toBe("e1");
		expect(ctx.sliceName).toBe("s1");
	});

	it("calls process.exit when epic does not exist", async () => {
		initProject();

		const { createEventCommandContext } = await import(
			"../../../../src/commands/_shared/command-context.js"
		);

		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		expect(() =>
			createEventCommandContext({ epic: "nonexistent", json: true }, { requireSlice: false }),
		).toThrow("process.exit called");

		exitSpy.mockRestore();
	});
});

describe("handleInvariantError", () => {
	it("re-throws non-InvariantError errors", async () => {
		const { handleInvariantError } = await import(
			"../../../../src/commands/_shared/command-context.js"
		);

		expect(() => {
			handleInvariantError(new Error("something else"), { json: true });
		}).toThrow("something else");
	});

	it("exits with formatted error for InvariantError", async () => {
		const { handleInvariantError } = await import(
			"../../../../src/commands/_shared/command-context.js"
		);
		const { InvariantError } = await import("../../../../src/engine/invariants/index.js");

		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called");
		});

		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		const invError = new InvariantError([{ ruleId: "test-rule", message: "Test violation" }]);

		expect(() => {
			handleInvariantError(invError, { json: true });
		}).toThrow("process.exit called");

		const output = chunks.join("");
		expect(output).toContain("Test violation");
		expect(output).toContain("test-rule");

		exitSpy.mockRestore();
	});
});
