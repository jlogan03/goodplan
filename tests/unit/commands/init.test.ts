import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnyEventEnvelopeSchema } from "../../../src/schemas/envelope.js";
import { projectInitializedPayloadSchema } from "../../../src/schemas/events/project.js";

let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-init-v2-test-"));
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

/**
 * Helper: dynamically import initCommand fresh each test to avoid module caching issues.
 */
async function runInit(args: {
	name?: string;
	json?: boolean;
	quiet?: boolean;
	verbose?: boolean;
}) {
	const { initCommand } = await import("../../../src/commands/global/init.js");
	const def = await initCommand;
	if (def.run) {
		await def.run({
			args: {
				name: args.name ?? "",
				json: args.json ?? false,
				quiet: args.quiet ?? false,
				verbose: args.verbose ?? false,
			},
			rawArgs: [],
			cmd: def,
		});
	}
}

describe("init command (v2)", () => {
	it("creates .goodplan/ with events.jsonl containing project-initialized event", async () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await runInit({ name: "test-project" });

		const eventsPath = path.join(tmpDir, ".goodplan", "events.jsonl");
		expect(fs.existsSync(eventsPath)).toBe(true);

		const content = fs.readFileSync(eventsPath, "utf-8");
		const lines = content.trim().split("\n");
		expect(lines).toHaveLength(1);

		const firstLine = lines[0];
		expect(firstLine).toBeDefined();
		const event = JSON.parse(firstLine as string);
		const envelopeResult = AnyEventEnvelopeSchema.safeParse(event);
		expect(envelopeResult.success).toBe(true);

		expect(event.type).toBe("project-initialized");
		expect(event.domain).toBe("entity-lifecycle");
		expect(event.scope).toBe("project");
		expect(event.scopeRef).toBeNull();
		expect(event.actor).toEqual({ kind: "cli", id: "gp:init" });
		expect(event.prevId).toBeNull(); // first event

		writeSpy.mockRestore();
	});

	it("project-initialized event has correct payload", async () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await runInit({ name: "my-project" });

		const eventsPath = path.join(tmpDir, ".goodplan", "events.jsonl");
		const content = fs.readFileSync(eventsPath, "utf-8");
		const firstLine = content.trim().split("\n")[0];
		expect(firstLine).toBeDefined();
		const event = JSON.parse(firstLine as string);

		const payloadResult = projectInitializedPayloadSchema.safeParse(event.payload);
		expect(payloadResult.success).toBe(true);
		if (payloadResult.success) {
			expect(payloadResult.data.name).toBe("my-project");
		}

		writeSpy.mockRestore();
	});

	it("defaults --name to path.basename(cwd)", async () => {
		const namedDir = path.join(tmpDir, "my-cool-project");
		fs.mkdirSync(namedDir);
		process.chdir(namedDir);

		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await runInit({});

		const eventsPath = path.join(namedDir, ".goodplan", "events.jsonl");
		const content = fs.readFileSync(eventsPath, "utf-8");
		const firstLine = content.trim().split("\n")[0];
		expect(firstLine).toBeDefined();
		const event = JSON.parse(firstLine as string);
		expect(event.payload.name).toBe("my-cool-project");

		writeSpy.mockRestore();
	});

	it("throws STATE_ALREADY_INITIALIZED if .goodplan/ already exists", async () => {
		fs.mkdirSync(path.join(tmpDir, ".goodplan"));

		await expect(runInit({ name: "test" })).rejects.toThrow("already initialized");
	});

	it("does NOT detect parent .goodplan/ (only checks cwd)", async () => {
		fs.mkdirSync(path.join(tmpDir, ".goodplan"));

		const childDir = path.join(tmpDir, "child");
		fs.mkdirSync(childDir);
		process.chdir(childDir);

		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await runInit({ name: "child-project" });

		const eventsPath = path.join(childDir, ".goodplan", "events.jsonl");
		expect(fs.existsSync(eventsPath)).toBe(true);

		writeSpy.mockRestore();
	});

	it("outputs JSON matching MutatingCommandOutput when --json is set", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runInit({ name: "json-test", json: true });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed.ok).toBe(true);
		expect(parsed.event).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		expect(parsed.entity).toBe("project");
	});

	it("outputs human-readable message when --json is not set", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runInit({ name: "human-test" });

		const outputStr = chunks.join("");
		expect(outputStr).toContain("human-test");
		expect(outputStr).toContain("Initialized");
		expect(outputStr).toContain(".goodplan/");
	});

	it("suppresses output with --quiet", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runInit({ name: "quiet-test", quiet: true });

		expect(chunks.join("")).toBe("");

		// But project should still be created
		expect(fs.existsSync(path.join(tmpDir, ".goodplan", "events.jsonl"))).toBe(true);
	});

	it("event envelope has valid branch and commitHint fields", async () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await runInit({ name: "git-test" });

		const eventsPath = path.join(tmpDir, ".goodplan", "events.jsonl");
		const content = fs.readFileSync(eventsPath, "utf-8");
		const firstLine = content.trim().split("\n")[0];
		expect(firstLine).toBeDefined();
		const event = JSON.parse(firstLine as string);

		// branch must be a non-empty string (either real branch or "unknown")
		expect(typeof event.branch).toBe("string");
		expect(event.branch.length).toBeGreaterThan(0);

		// commitHint is either a string (sha) or null
		expect(event.commitHint === null || typeof event.commitHint === "string").toBe(true);

		writeSpy.mockRestore();
	});
});
