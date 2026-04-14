import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildStatusResult, formatStatusHuman } from "../../../src/commands/global/status.js";
import { createEmptyState } from "../../../src/engine/derived-state/index.js";
import { statusResultSchema } from "../../../src/schemas/commands/status.js";
import type {
	DerivedStateData,
	EpicState,
	SideQuestState,
	SliceState,
} from "../../../src/schemas/entities/derived-state.js";
import { applyQuery } from "../../../src/util/query.js";

let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-status-v2-test-"));
	originalCwd = process.cwd();
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

/** Create a .goodplan/ directory with optional filesystem artifacts */
function createGoodplanDir(opts?: {
	decisions?: number;
	learnings?: number;
	architectureFiles?: string[];
	researchFiles?: string[];
	brainstormFiles?: string[];
	prototypesDirs?: string[];
	epicArchFiles?: Array<{ epic: string; file: string }>;
	epicResearchFiles?: Array<{ epic: string; file: string }>;
	epicBrainstormFiles?: Array<{ epic: string; file: string }>;
	epicPrototypeDirs?: Array<{ epic: string; dir: string }>;
	overview?: { tasks?: Array<{ status: string }> };
}): string {
	const goodplanDir = path.join(tmpDir, ".goodplan");
	fs.mkdirSync(goodplanDir, { recursive: true });

	// Decisions JSONL
	if (opts?.decisions !== undefined && opts.decisions > 0) {
		const entries = Array.from({ length: opts.decisions }, (_, i) =>
			JSON.stringify({
				id: `d${i}`,
				status: "active",
				domain: "arch",
				title: `T${i}`,
				summary: `S${i}`,
				date: "2026-03-20",
				supersededBy: null,
			}),
		);
		fs.writeFileSync(path.join(goodplanDir, "decisions.jsonl"), `${entries.join("\n")}\n`);
	}

	// Learnings JSONL
	if (opts?.learnings !== undefined && opts.learnings > 0) {
		const entries = Array.from({ length: opts.learnings }, (_, i) =>
			JSON.stringify({
				category: "worked",
				summary: `L${i}`,
				file: `learnings/l${i}.md`,
				tags: [],
				source: "project",
				rollup: false,
				rollupTo: [],
			}),
		);
		fs.writeFileSync(path.join(goodplanDir, "learnings.jsonl"), `${entries.join("\n")}\n`);
	}

	// Project-level architecture files
	if (opts?.architectureFiles) {
		const dir = path.join(goodplanDir, "architecture");
		fs.mkdirSync(dir, { recursive: true });
		for (const f of opts.architectureFiles) {
			fs.writeFileSync(path.join(dir, f), `# ${f}`);
		}
	}

	// Project-level research files
	if (opts?.researchFiles) {
		const dir = path.join(goodplanDir, "research");
		fs.mkdirSync(dir, { recursive: true });
		for (const f of opts.researchFiles) {
			fs.writeFileSync(path.join(dir, f), `# ${f}`);
		}
	}

	// Project-level brainstorm files
	if (opts?.brainstormFiles) {
		const dir = path.join(goodplanDir, "brainstorm");
		fs.mkdirSync(dir, { recursive: true });
		for (const f of opts.brainstormFiles) {
			fs.writeFileSync(path.join(dir, f), `# ${f}`);
		}
	}

	// Project-level prototype dirs
	if (opts?.prototypesDirs) {
		const dir = path.join(goodplanDir, "prototypes");
		fs.mkdirSync(dir, { recursive: true });
		for (const d of opts.prototypesDirs) {
			fs.mkdirSync(path.join(dir, d), { recursive: true });
		}
	}

	// Epic-level architecture files
	if (opts?.epicArchFiles) {
		for (const { epic, file } of opts.epicArchFiles) {
			const dir = path.join(goodplanDir, "epics", epic, "architecture");
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(path.join(dir, file), `# ${file}`);
		}
	}

	// Epic-level research files
	if (opts?.epicResearchFiles) {
		for (const { epic, file } of opts.epicResearchFiles) {
			const dir = path.join(goodplanDir, "epics", epic, "research");
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(path.join(dir, file), `# ${file}`);
		}
	}

	// Epic-level brainstorm files
	if (opts?.epicBrainstormFiles) {
		for (const { epic, file } of opts.epicBrainstormFiles) {
			const dir = path.join(goodplanDir, "epics", epic, "brainstorm");
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(path.join(dir, file), `# ${file}`);
		}
	}

	// Epic-level prototype dirs
	if (opts?.epicPrototypeDirs) {
		for (const { epic, dir: d } of opts.epicPrototypeDirs) {
			const protoDir = path.join(goodplanDir, "epics", epic, "prototypes");
			fs.mkdirSync(path.join(protoDir, d), { recursive: true });
		}
	}

	// Overview JSON
	if (opts?.overview) {
		fs.writeFileSync(path.join(goodplanDir, "overview.json"), JSON.stringify(opts.overview));
	}

	return goodplanDir;
}

/** Create initialized DerivedStateData with project name */
function createInitState(name: string): DerivedStateData {
	const state = createEmptyState();
	state.project.initialized = true;
	state.project.name = name;
	state.project.version = "2.0.0";
	return state;
}

/** Create a minimal epic state */
function createEpicState(dir: string, overrides?: Partial<EpicState>): EpicState {
	return {
		dir,
		goal: null,
		architectureTarget: null,
		pressureTest: null,
		sliceSet: null,
		steeringPreference: "best-guess-and-flag",
		phase: "P6",
		slices: new Map(),
		findings: [],
		active: true,
		paused: false,
		completed: false,
		abandoned: false,
		...overrides,
	};
}

/** Create a minimal slice state */
function createSliceState(dir: string, phase: string): SliceState {
	return {
		dir,
		goal: null,
		plan: null,
		phase: phase as SliceState["phase"],
		chunks: new Map(),
		abandoned: false,
	};
}

/** Create a minimal side-quest state */
function createSideQuestState(
	dir: string,
	phase: string,
	overrides?: Partial<SideQuestState>,
): SideQuestState {
	return {
		dir,
		goal: null,
		plan: null,
		phase: phase as SideQuestState["phase"],
		chunks: new Map(),
		active: true,
		landed: false,
		abandoned: false,
		...overrides,
	};
}

describe("buildStatusResult (v2)", () => {
	it("returns valid StatusResult for a fresh initialized project", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("test-project");
		const result = buildStatusResult(state, goodplanDir);

		const parsed = statusResultSchema.safeParse(result);
		expect(parsed.success).toBe(true);

		expect(result.project.name).toBe("test-project");
		expect(result.activeEpic).toBeNull();
		expect(result.activeSlice).toBeNull();
		expect(result.activeQuest).toBeNull();
		expect(result.artifacts.decisions).toBe(0);
		expect(result.artifacts.learnings).toBe(0);
		expect(result.artifacts.completedSlices).toBe(0);
		expect(result.artifacts.totalSlices).toBe(0);
		expect(result.warnings).toEqual([]);
	});

	it("resolves active epic from derived state", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("epic-test");
		const epic = createEpicState("my-epic");
		state.epics.set("my-epic", epic);

		const result = buildStatusResult(state, goodplanDir);
		expect(result.activeEpic).toEqual({ name: "my-epic", status: "activated" });
	});

	it("resolves active slice from derived state", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("slice-test");
		const epic = createEpicState("my-epic");
		epic.slices.set("01-auth", createSliceState("01-auth", "P10"));
		state.epics.set("my-epic", epic);

		const result = buildStatusResult(state, goodplanDir);
		expect(result.activeSlice).toEqual({ name: "01-auth", status: "implementing" });
	});

	it("resolves active side-quest from derived state", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("quest-test");
		state.sideQuests.set("fix-logging", createSideQuestState("fix-logging", "S1"));

		const result = buildStatusResult(state, goodplanDir);
		expect(result.activeQuest).toEqual({ name: "fix-logging", status: "planning" });
	});

	it("excludes abandoned side-quests from activeQuest", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("quest-test");
		state.sideQuests.set(
			"abandoned-quest",
			createSideQuestState("abandoned-quest", "S1", { abandoned: true }),
		);

		const result = buildStatusResult(state, goodplanDir);
		expect(result.activeQuest).toBeNull();
	});

	it("maps side-quest phases correctly: S0->created, S1->planning, S2->implementing, S3->completed", () => {
		const goodplanDir = createGoodplanDir();

		for (const [phase, expected] of [
			["S0", "created"],
			["S1", "planning"],
			["S2", "implementing"],
		] as const) {
			const state = createInitState("phase-map-test");
			state.sideQuests.set("test-quest", createSideQuestState("test-quest", phase));
			const result = buildStatusResult(state, goodplanDir);
			expect(result.activeQuest?.status).toBe(expected);
		}
	});

	it("counts slices from derived state", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("slice-count-test");
		const epic = createEpicState("my-epic");
		epic.slices.set("01-done", createSliceState("01-done", "P12"));
		epic.slices.set("02-wip", createSliceState("02-wip", "P10"));
		epic.slices.set("03-new", createSliceState("03-new", "P6"));
		state.epics.set("my-epic", epic);

		const result = buildStatusResult(state, goodplanDir);
		expect(result.artifacts.completedSlices).toBe(1);
		expect(result.artifacts.totalSlices).toBe(3);
	});

	it("counts decisions from filesystem fallback", () => {
		const goodplanDir = createGoodplanDir({ decisions: 3 });
		const state = createInitState("decisions-test");

		const result = buildStatusResult(state, goodplanDir);
		expect(result.artifacts.decisions).toBe(3);
	});

	it("counts learnings from filesystem fallback", () => {
		const goodplanDir = createGoodplanDir({ learnings: 2 });
		const state = createInitState("learnings-test");

		const result = buildStatusResult(state, goodplanDir);
		expect(result.artifacts.learnings).toBe(2);
	});

	it("counts tasks from overview.json fallback", () => {
		const goodplanDir = createGoodplanDir({
			overview: {
				tasks: [{ status: "open" }, { status: "open" }, { status: "dropped" }],
			},
		});
		const state = createInitState("tasks-test");

		const result = buildStatusResult(state, goodplanDir);
		expect(result.artifacts.openTasks).toBe(2);
		expect(result.artifacts.totalTasks).toBe(3);
	});

	it("scans architecture files from filesystem (project + epic)", () => {
		const goodplanDir = createGoodplanDir({
			architectureFiles: ["overview.md"],
			epicArchFiles: [
				{ epic: "my-epic", file: "_overview.md" },
				{ epic: "my-epic", file: "data-model.md" },
			],
		});
		const state = createInitState("arch-test");

		const result = buildStatusResult(state, goodplanDir);
		expect(result.artifacts.architecture.count).toBe(3);
		expect(result.artifacts.architecture.files).toContain("architecture/overview.md");
		expect(result.artifacts.architecture.files).toContain(
			"epics/my-epic/architecture/_overview.md",
		);
		expect(result.artifacts.architecture.files).toContain(
			"epics/my-epic/architecture/data-model.md",
		);
	});

	it("scans research files from filesystem", () => {
		const goodplanDir = createGoodplanDir({
			researchFiles: ["topic.md"],
			epicResearchFiles: [{ epic: "my-epic", file: "analysis.md" }],
		});
		const state = createInitState("research-test");

		const result = buildStatusResult(state, goodplanDir);
		expect(result.artifacts.research.count).toBe(2);
		expect(result.artifacts.research.files).toContain("research/topic.md");
		expect(result.artifacts.research.files).toContain("epics/my-epic/research/analysis.md");
	});

	it("scans brainstorm files from filesystem", () => {
		const goodplanDir = createGoodplanDir({
			brainstormFiles: ["ideas.md"],
			epicBrainstormFiles: [{ epic: "my-epic", file: "concepts.md" }],
		});
		const state = createInitState("brainstorm-test");

		const result = buildStatusResult(state, goodplanDir);
		expect(result.artifacts.brainstorm.count).toBe(2);
	});

	it("scans prototype directories from filesystem", () => {
		const goodplanDir = createGoodplanDir({
			prototypesDirs: ["proto-a"],
			epicPrototypeDirs: [{ epic: "my-epic", dir: "proto-b" }],
		});
		const state = createInitState("proto-test");

		const result = buildStatusResult(state, goodplanDir);
		expect(result.artifacts.prototypes.count).toBe(2);
		expect(result.artifacts.prototypes.files).toContain("prototypes/proto-a");
		expect(result.artifacts.prototypes.files).toContain("epics/my-epic/prototypes/proto-b");
	});

	it("uses state-tree-relative paths (no absolute paths)", () => {
		const goodplanDir = createGoodplanDir({
			architectureFiles: ["overview.md"],
			epicArchFiles: [{ epic: "my-epic", file: "data.md" }],
		});
		const state = createInitState("rel-paths-test");

		const result = buildStatusResult(state, goodplanDir);
		for (const f of result.artifacts.architecture.files) {
			expect(f).not.toMatch(/^\//);
			expect(f).toMatch(/\.md$/);
		}
	});

	it("fresh project has empty files arrays", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("fresh");

		const result = buildStatusResult(state, goodplanDir);
		expect(result.artifacts.architecture).toEqual({ count: 0, files: [] });
		expect(result.artifacts.research).toEqual({ count: 0, files: [] });
		expect(result.artifacts.brainstorm).toEqual({ count: 0, files: [] });
		expect(result.artifacts.prototypes).toEqual({ count: 0, files: [] });
	});

	it("generates recommendations from suggestedNextSteps", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("rec-test");
		// No epics, no side-quests -- should be empty project
		// suggestedNextSteps for initialized project with no epics returns nothing
		// (since project is initialized, the "gp init" step is skipped)
		const result = buildStatusResult(state, goodplanDir);
		expect(result.recommendations).toEqual([]);
	});

	it("generates 'Initialize the project' recommendation when not initialized", () => {
		const goodplanDir = createGoodplanDir();
		const state = createEmptyState();

		const result = buildStatusResult(state, goodplanDir);
		expect(result.recommendations).toContain("Initialize the project");
	});

	it("validates against statusResultSchema", () => {
		const goodplanDir = createGoodplanDir({ decisions: 2, learnings: 1 });
		const state = createInitState("validate-test");
		const epic = createEpicState("my-epic");
		epic.slices.set("01-auth", createSliceState("01-auth", "P10"));
		epic.slices.set("02-done", createSliceState("02-done", "P12"));
		state.epics.set("my-epic", epic);

		const result = buildStatusResult(state, goodplanDir);
		const parsed = statusResultSchema.safeParse(result);
		expect(parsed.success).toBe(true);
	});

	it("returns null for active entities when no active epic/slice/quest", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("empty-proj");

		const result = buildStatusResult(state, goodplanDir);
		expect(result.activeEpic).toBeNull();
		expect(result.activeSlice).toBeNull();
		expect(result.activeQuest).toBeNull();
	});

	it("decisions, learnings, completedSlices, totalSlices remain plain numbers", () => {
		const goodplanDir = createGoodplanDir({ decisions: 1, learnings: 1 });
		const state = createInitState("number-types");
		const epic = createEpicState("my-epic");
		epic.slices.set("01", createSliceState("01", "P12"));
		state.epics.set("my-epic", epic);

		const result = buildStatusResult(state, goodplanDir);
		expect(typeof result.artifacts.decisions).toBe("number");
		expect(typeof result.artifacts.learnings).toBe("number");
		expect(typeof result.artifacts.completedSlices).toBe("number");
		expect(typeof result.artifacts.totalSlices).toBe("number");
	});
});

describe("formatStatusHuman (v2)", () => {
	it("shows project name and version", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("human-test");
		const status = buildStatusResult(state, goodplanDir);
		const output = formatStatusHuman(status);

		expect(output).toContain("human-test");
	});

	it("shows 'No active work' when no active entities", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("inactive");
		const status = buildStatusResult(state, goodplanDir);
		const output = formatStatusHuman(status);

		expect(output).toContain("No active work");
	});

	it("shows active work section with entities", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("active-test");
		const epic = createEpicState("my-epic");
		epic.slices.set("01-auth", createSliceState("01-auth", "P10"));
		state.epics.set("my-epic", epic);

		const status = buildStatusResult(state, goodplanDir);
		const output = formatStatusHuman(status);

		expect(output).toContain("Active Work");
		expect(output).toContain("my-epic");
		expect(output).toContain("01-auth");
	});

	it("shows progress section when slices exist", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("progress-test");
		const epic = createEpicState("my-epic");
		epic.slices.set("01-done", createSliceState("01-done", "P12"));
		epic.slices.set("02-wip", createSliceState("02-wip", "P10"));
		epic.slices.set("03-new", createSliceState("03-new", "P6"));
		state.epics.set("my-epic", epic);

		const status = buildStatusResult(state, goodplanDir);
		const output = formatStatusHuman(status);

		expect(output).toContain("Progress");
		expect(output).toContain("1/3 complete");
	});

	it("shows artifacts section when present", () => {
		const goodplanDir = createGoodplanDir({
			decisions: 2,
			architectureFiles: ["overview.md", "data-model.md"],
		});
		const state = createInitState("artifacts-test");

		const status = buildStatusResult(state, goodplanDir);
		const output = formatStatusHuman(status);

		expect(output).toContain("Artifacts");
		expect(output).toContain("Architecture: 2 files");
		expect(output).toContain("Decisions:    2");
	});

	it("shows warnings when present", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("warn-test");
		const status = buildStatusResult(state, goodplanDir);
		status.warnings = ["Something needs attention"];
		const output = formatStatusHuman(status);

		expect(output).toContain("Something needs attention");
	});

	it("omits artifacts section when all zeros", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("empty-artifacts");
		const status = buildStatusResult(state, goodplanDir);
		const output = formatStatusHuman(status);

		expect(output).not.toContain("Artifacts");
	});

	it("omits progress section when no slices", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("no-slices");
		const status = buildStatusResult(state, goodplanDir);
		const output = formatStatusHuman(status);

		expect(output).not.toContain("Progress");
	});
});

describe("applyQuery", () => {
	const sampleData = {
		project: { name: "test", version: "1.0.0" },
		activeEpic: null,
		recommendations: ["Do something", "Do another thing"],
	};

	it("extracts a nested field", () => {
		const result = applyQuery(sampleData, ".project.name");
		expect(result).toBe("test");
	});

	it("returns null when expression matches nothing", () => {
		const result = applyQuery(sampleData, ".nonexistent.field");
		expect(result).toBeNull();
	});

	it("returns array for multiple results", () => {
		const result = applyQuery(sampleData, ".recommendations[]");
		expect(result).toEqual(["Do something", "Do another thing"]);
	});

	it("throws VALIDATION_INVALID_QUERY for invalid expression", () => {
		expect(() => applyQuery(sampleData, ".[invalid!!!")).toThrow("Invalid jq expression");
	});

	it("handles identity expression", () => {
		const result = applyQuery(sampleData, ".");
		expect(result).toEqual(sampleData);
	});

	it("handles null values", () => {
		const result = applyQuery(sampleData, ".activeEpic");
		expect(result).toBeNull();
	});
});

describe("--query on new StatusResult shape", () => {
	it("queries artifacts.decisions", () => {
		const goodplanDir = createGoodplanDir({ decisions: 2 });
		const state = createInitState("query-test");
		const status = buildStatusResult(state, goodplanDir);
		const result = applyQuery(status, ".artifacts.decisions");
		expect(result).toBe(2);
	});

	it("queries activeEpic.name", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("query-epic-test");
		state.epics.set("my-epic", createEpicState("my-epic"));
		const status = buildStatusResult(state, goodplanDir);
		const result = applyQuery(status, ".activeEpic.name");
		expect(result).toBe("my-epic");
	});

	it("queries completedSlices", () => {
		const goodplanDir = createGoodplanDir();
		const state = createInitState("query-slices-test");
		const epic = createEpicState("my-epic");
		epic.slices.set("01", createSliceState("01", "P12"));
		state.epics.set("my-epic", epic);
		const status = buildStatusResult(state, goodplanDir);
		const result = applyQuery(status, ".artifacts.completedSlices");
		expect(result).toBe(1);
	});
});

describe("status command integration (v2)", () => {
	/** Set up a minimal event-sourced project */
	function createEventProject(name: string): string {
		const goodplanDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(goodplanDir, { recursive: true });

		// Create a minimal events.jsonl with project-initialized
		const event = {
			id: "a0000000-0000-4000-8000-000000000001",
			schemaVersion: 1,
			ts: "2026-03-22T00:00:00.000Z",
			scope: "project",
			scopeRef: null,
			actor: { kind: "cli", id: "gp:init" },
			branch: "main",
			commitHint: null,
			domain: "entity-lifecycle",
			type: "project-initialized",
			payload: { name },
			prevId: null,
		};
		fs.writeFileSync(path.join(goodplanDir, "events.jsonl"), `${JSON.stringify(event)}\n`);

		return goodplanDir;
	}

	async function runStatus(args: {
		json?: boolean;
		query?: string;
		quiet?: boolean;
		verbose?: boolean;
		force?: boolean;
	}) {
		const { statusCommand } = await import("../../../src/commands/global/status.js");
		const def = await statusCommand;
		if (def.run) {
			await def.run({
				args: {
					json: args.json ?? false,
					query: args.query ?? "",
					quiet: args.quiet ?? false,
					verbose: args.verbose ?? false,
					force: args.force ?? false,
				},
				rawArgs: [],
				cmd: def,
			});
		}
	}

	it("outputs valid JSON with --json", async () => {
		createEventProject("json-status");
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runStatus({ json: true });

		const outputStr = chunks.join("");
		const parsed = JSON.parse(outputStr);
		const result = statusResultSchema.safeParse(parsed);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.project.name).toBe("json-status");
		}
	});

	it("outputs human-readable format without --json", async () => {
		createEventProject("human-status");
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runStatus({});

		const outputStr = chunks.join("");
		expect(outputStr).toContain("human-status");
		expect(outputStr).toContain("No active work");
	});

	it("applies --query with --json", async () => {
		createEventProject("query-test");
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		await runStatus({ json: true, query: ".project.name" });

		const outputStr = chunks.join("").trim();
		expect(JSON.parse(outputStr)).toBe("query-test");
	});

	it("--query without --json succeeds (--query implies --json)", async () => {
		createEventProject("no-json-query");

		const chunks: string[] = [];
		const origWrite = process.stdout.write;
		process.stdout.write = ((chunk: string) => {
			chunks.push(chunk);
			return true;
		}) as typeof process.stdout.write;

		try {
			await runStatus({ query: ".project.name" });
		} finally {
			process.stdout.write = origWrite;
		}

		const outputStr = chunks.join("").trim();
		expect(JSON.parse(outputStr)).toBe("no-json-query");
	});
});
