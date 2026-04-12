import { describe, expect, it, vi } from "vitest";
import { globalArgs } from "../../../src/commands/global-args.js";
import {
	commandRegistry,
	eventSchemaRegistry,
	stdinSchemaRegistry,
} from "../../../src/commands/global/schema.js";
import { mainCommand } from "../../../src/commands/main.js";

describe("schema command", () => {
	async function runSchema(args: {
		json?: boolean;
		command?: string;
		events?: boolean;
		query?: string;
		quiet?: boolean;
		verbose?: boolean;
	}) {
		const { schemaCommand } = await import("../../../src/commands/global/schema.js");
		const def = await schemaCommand;
		if (def.run) {
			await def.run({
				args: {
					json: args.json ?? false,
					command: args.command ?? undefined,
					events: args.events ?? false,
					query: args.query ?? undefined,
					quiet: args.quiet ?? false,
					verbose: args.verbose ?? false,
				},
				rawArgs: [],
				cmd: def,
			});
		}
	}

	it("returns full command hierarchy with --json", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runSchema({ json: true });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed).toHaveProperty("commands");
		expect(Array.isArray(parsed.commands)).toBe(true);
		expect(parsed.commands.length).toBeGreaterThan(0);

		// Verify some known commands are present
		const names = parsed.commands.map((c: { name: string }) => c.name);
		expect(names).toContain("status");
		expect(names).toContain("init");
		expect(names).toContain("epic:create");
		expect(names).toContain("slice:create");
		expect(names).toContain("slice:abandon");
		expect(names).toContain("decision:create");

		vi.restoreAllMocks();
	});

	it("returns command detail with --command and includes stdin schema", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runSchema({ json: true, command: "quest:complete" });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed.name).toBe("quest:complete");
		expect(parsed.description).toBeTruthy();
		expect(parsed.args).toBeTruthy();
		expect(parsed.stdinSchema).toBeTruthy();

		// Verify stdin schema has expected properties
		expect(parsed.stdinSchema.type).toBe("object");
		expect(parsed.stdinSchema.properties).toHaveProperty("verificationPassed");

		vi.restoreAllMocks();
	});

	it("returns command detail without stdin schema for read-only commands", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runSchema({ json: true, command: "epic:list" });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed.name).toBe("epic:list");
		expect(parsed).not.toHaveProperty("stdinSchema");

		vi.restoreAllMocks();
	});

	it("throws error for unknown command name", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await expect(runSchema({ json: true, command: "nonexistent:cmd" })).rejects.toThrow(
			"Unknown command",
		);

		vi.restoreAllMocks();
	});

	it("supports --query on schema output", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runSchema({ json: true, query: ".commands | length" });

		const outputStr = chunks.join("").trim();
		const count = JSON.parse(outputStr);
		expect(typeof count).toBe("number");
		expect(count).toBeGreaterThan(0);

		vi.restoreAllMocks();
	});

	it("outputs human-readable JSON without --json flag", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runSchema({ command: "status" });

		const outputStr = chunks.join("");
		// Human-readable output uses JSON.stringify with 2-space indent
		expect(outputStr).toContain('"name": "status"');
		// Should be indented (not tab-indented like deterministicStringify)
		expect(outputStr).toContain("  ");

		vi.restoreAllMocks();
	});

	it("returns event catalog with --events --json", async () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runSchema({ json: true, events: true });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		expect(parsed).toHaveProperty("events");
		expect(Array.isArray(parsed.events)).toBe(true);
		expect(parsed.events.length).toBeGreaterThan(0);

		// Verify project-initialized event is present with JSON Schema payload
		const projectInit = parsed.events.find(
			(e: { type: string }) => e.type === "project-initialized",
		);
		expect(projectInit).toBeDefined();
		expect(projectInit.payloadSchema).toBeDefined();
		expect(projectInit.payloadSchema.type).toBe("object");
		expect(projectInit.payloadSchema.properties).toHaveProperty("name");

		vi.restoreAllMocks();
	});
});

describe("command registry drift detection (INV-006)", () => {
	it("every subCommand in main.ts has a corresponding registry entry", () => {
		const subCommands = mainCommand.subCommands;
		expect(subCommands).toBeTruthy();
		if (!subCommands) return;

		const subCommandKeys = Object.keys(subCommands);
		const registryKeys = Array.from(commandRegistry.keys());

		for (const key of subCommandKeys) {
			expect(
				registryKeys,
				`subCommand "${key}" is registered in citty but missing from commandRegistry`,
			).toContain(key);
		}
	});

	it("every registry entry has a corresponding subCommand in main.ts", () => {
		const subCommands = mainCommand.subCommands;
		expect(subCommands).toBeTruthy();
		if (!subCommands) return;

		const subCommandKeys = Object.keys(subCommands);
		const registryKeys = Array.from(commandRegistry.keys());

		for (const key of registryKeys) {
			expect(
				subCommandKeys,
				`registry entry "${key}" exists in commandRegistry but missing from subCommands`,
			).toContain(key);
		}
	});

	it("registry arg keys match actual command arg keys (excluding global args)", () => {
		const subCommands = mainCommand.subCommands;
		expect(subCommands).toBeTruthy();
		if (!subCommands) return;

		const globalArgKeys = new Set(Object.keys(globalArgs));

		for (const [name, entry] of commandRegistry.entries()) {
			const cmd = subCommands[name];
			if (cmd === undefined) continue;

			// Get command-specific arg keys from registry (exclude global args)
			const registryArgKeys = Object.keys(entry.args)
				.filter((k) => !globalArgKeys.has(k))
				.sort();

			// Get command-specific arg keys from actual citty command definition
			const cmdArgs = (cmd as Record<string, unknown>).args as Record<string, unknown> | undefined;
			const actualArgKeys = cmdArgs
				? Object.keys(cmdArgs)
						.filter((k) => !globalArgKeys.has(k))
						.sort()
				: [];

			expect(
				registryArgKeys,
				`registry arg keys for "${name}" don't match actual command definition`,
			).toEqual(actualArgKeys);
		}
	});
});

describe("eventSchemaRegistry", () => {
	it("contains project-initialized event", () => {
		expect(eventSchemaRegistry).toHaveProperty("project-initialized");
	});

	it("every entry is a valid Zod schema", () => {
		for (const [type, schema] of Object.entries(eventSchemaRegistry)) {
			expect(schema, `event "${type}" should be a Zod schema with safeParse`).toHaveProperty(
				"safeParse",
			);
		}
	});
});

describe("stdinSchemaRegistry drift detection", () => {
	it("every command that accepts stdin has a stdinSchemaRegistry entry", async () => {
		// Commands known to accept stdin input (via validateInput or direct safeParse).
		// This list is derived from grep for validateInput/readStdin in src/commands/.
		// If a new stdin-accepting command is added, it must appear here AND in stdinSchemaRegistry.
		const stdinCommands = [
			"epic:create",
			"epic:complete",
			// v1 epic:add-verification, epic:update-verification removed (core/rpc dependency)
			"slice:create",
			"slice:complete",
			"quest:create",
			"quest:complete",
			"task:create",
			"decision:create",
			"decision:update",
			"submit-plan",
			"submit-refinement",
			"submit-implementation",
			// v1 epic subagent commands removed (submit-explore, submit-architecture,
			// submit-slices, submit-refine-architecture, submit-refine-slices)
		];

		const registryKeys = Object.keys(stdinSchemaRegistry);

		for (const cmd of stdinCommands) {
			expect(
				registryKeys,
				`command "${cmd}" uses validateInput but has no stdinSchemaRegistry entry`,
			).toContain(cmd);
		}

		// Reverse: every registry entry should be a known stdin command
		for (const key of registryKeys) {
			expect(
				stdinCommands,
				`stdinSchemaRegistry entry "${key}" has no corresponding stdin-accepting command`,
			).toContain(key);
		}
	});
});
