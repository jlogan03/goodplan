import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { begin } from "../../../src/core/rpc/begin.js";
import { rpcInit } from "../../../src/core/rpc/init.js";
import type { Verification } from "../../../src/schemas/entities/epic.js";
import { GoodplanError } from "../../../src/util/errors.js";

let tmpDir: string;
let projectDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-rpc-begin-"));
	projectDir = path.join(tmpDir, ".goodplan");
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function initProject(name = "test") {
	rpcInit(projectDir, name);
}

describe("begin — CREATE_EPIC", () => {
	it("creates epic tree via begin('create', {type:'epic'})", () => {
		initProject();

		const result = begin(
			projectDir,
			"create",
			{ type: "epic", name: "my-epic" },
			{
				name: "my-epic",
				goal: "Build something great",
			},
		);

		expect(result.entity).toBe("my-epic");
		expect(result.phase).toBe("create");
		expect(result.previousStatus).toBe("none");
		expect(result.newStatus).toBe("created");

		// Verify epic.json exists on disk
		const epicJson = path.join(projectDir, "epics", "my-epic", "epic.json");
		expect(fs.existsSync(epicJson)).toBe(true);

		const epic = JSON.parse(fs.readFileSync(epicJson, "utf-8"));
		expect(epic.name).toBe("my-epic");
		expect(epic.status).toBe("created");
		expect(epic.goal).toBe("Build something great");
	});

	it("rejects epic creation without goal", () => {
		initProject();

		expect(() =>
			begin(
				projectDir,
				"create",
				{ type: "epic", name: "no-goal" },
				{
					name: "no-goal",
				},
			),
		).toThrow(GoodplanError);
	});
});

describe("begin — BEGIN_EXPLORE", () => {
	it("transitions epic from created to exploring", () => {
		initProject();
		begin(
			projectDir,
			"create",
			{ type: "epic", name: "e1" },
			{
				name: "e1",
				goal: "Test",
			},
		);

		const result = begin(projectDir, "explore", { type: "epic", name: "e1" }, {});

		expect(result.entity).toBe("e1");
		expect(result.phase).toBe("explore");
		expect(result.previousStatus).toBe("created");
		expect(result.newStatus).toBe("exploring");
	});
});

describe("begin — ADD_VERIFICATION (via activate setup)", () => {
	it("adds verification to epic via begin('add-verification')", () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		// Walk through the full epic lifecycle to get to slices-refined
		// COMPLETE_EXPLORE, COMPLETE_ARCHITECTURE etc. are submit operations,
		// but BEGIN_* phases go through begin()
		// For this test, we use begin for the begin phases and need submits for completion.
		// Since submit is tested separately, we'll test what we can with begin alone.

		// Add verification via begin
		const verification: Verification = {
			description: "CLI works",
			status: "pending",
			addedDuring: "defining-slices",
			modifiedDuring: null,
		};
		begin(projectDir, "add-verification", { type: "epic", name: "e1" }, { verification });

		// Verify the verification was added by checking disk
		const epicJson = path.join(projectDir, "epics", "e1", "epic.json");
		const epic = JSON.parse(fs.readFileSync(epicJson, "utf-8"));
		expect(epic.verifications).toHaveLength(1);
		expect(epic.verifications[0].description).toBe("CLI works");
	});
});

describe("begin — ABANDON_EPIC", () => {
	it("transitions epic to abandoned with reason", () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });

		const result = begin(
			projectDir,
			"abandon",
			{ type: "epic", name: "e1" },
			{
				reason: "No longer needed",
			},
		);

		expect(result.entity).toBe("e1");
		expect(result.phase).toBe("abandon");
		expect(result.previousStatus).toBe("created");
		expect(result.newStatus).toBe("abandoned");
	});
});

describe("begin — UPDATE_VERIFICATION", () => {
	it("updates an existing verification", () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });

		const v1: Verification = {
			description: "Original",
			status: "pending",
			addedDuring: "exploring",
			modifiedDuring: null,
		};
		begin(projectDir, "add-verification", { type: "epic", name: "e1" }, { verification: v1 });

		const v2: Verification = {
			description: "Updated",
			status: "passed",
			addedDuring: "exploring",
			modifiedDuring: "defining-architecture",
		};
		begin(
			projectDir,
			"update-verification",
			{ type: "epic", name: "e1" },
			{
				index: 0,
				verification: v2,
			},
		);

		const epicJson = path.join(projectDir, "epics", "e1", "epic.json");
		const epic = JSON.parse(fs.readFileSync(epicJson, "utf-8"));
		expect(epic.verifications[0].description).toBe("Updated");
		expect(epic.verifications[0].status).toBe("passed");
	});
});

describe("begin — CREATE_SLICE", () => {
	it("creates slice via begin('create', {type:'slice'})", () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });

		const result = begin(
			projectDir,
			"create",
			{ type: "slice", name: "s1", epic: "e1" },
			{
				name: "s1",
				goal: "First slice",
				epic: "e1",
			},
		);

		expect(result.entity).toBe("s1");
		expect(result.phase).toBe("create");
		expect(result.previousStatus).toBe("none");
		expect(result.newStatus).toBe("created");

		const sliceJson = path.join(projectDir, "epics", "e1", "slices", "s1", "slice.json");
		expect(fs.existsSync(sliceJson)).toBe(true);

		const slice = JSON.parse(fs.readFileSync(sliceJson, "utf-8"));
		expect(slice.name).toBe("s1");
		expect(slice.epic).toBe("e1");
		expect(slice.status).toBe("created");
		expect(slice.goal).toBe("First slice");
	});

	it("rejects slice creation without --epic", () => {
		initProject();

		expect(() =>
			begin(
				projectDir,
				"create",
				{ type: "slice", name: "s1", epic: "e1" },
				{
					name: "s1",
					goal: "G",
				},
			),
		).toThrow("slice:create requires --epic");
	});

	it("rejects slice creation without goal", () => {
		initProject();

		expect(() =>
			begin(
				projectDir,
				"create",
				{ type: "slice", name: "s1", epic: "e1" },
				{
					name: "s1",
					epic: "e1",
				},
			),
		).toThrow("goal is required");
	});
});

describe("begin — BEGIN_PLAN for slice", () => {
	it("transitions slice from created to planning", () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "s1", epic: "e1" },
			{
				name: "s1",
				goal: "G",
				epic: "e1",
			},
		);

		const result = begin(projectDir, "plan", { type: "slice", name: "s1", epic: "e1" }, {});

		expect(result.entity).toBe("s1");
		expect(result.phase).toBe("plan");
		expect(result.previousStatus).toBe("created");
		expect(result.newStatus).toBe("planning");
	});
});

describe("begin — ABANDON_SLICE", () => {
	it("transitions slice to abandoned with reason", () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "s1", epic: "e1" },
			{
				name: "s1",
				goal: "G",
				epic: "e1",
			},
		);

		const result = begin(
			projectDir,
			"abandon",
			{ type: "slice", name: "s1", epic: "e1" },
			{
				reason: "No longer needed",
			},
		);

		expect(result.entity).toBe("s1");
		expect(result.phase).toBe("abandon");
		expect(result.previousStatus).toBe("created");
		expect(result.newStatus).toBe("abandoned");
	});
});

describe("begin — error propagation", () => {
	it("converts StateError to GoodplanError", () => {
		initProject();

		// Try to explore a non-existent epic
		try {
			begin(projectDir, "explore", { type: "epic", name: "nonexistent" }, {});
			expect.unreachable("Should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(GoodplanError);
			const ge = err as GoodplanError;
			expect(ge.code).toMatch(/^STATE_/);
		}
	});

	it("throws state error for slice begin when slice does not exist", () => {
		initProject();

		expect(() => begin(projectDir, "plan", { type: "slice", name: "s1", epic: "e1" }, {})).toThrow(
			GoodplanError,
		);
	});
});

describe("begin — INIT_PROJECT via begin('create', {type:'project'})", () => {
	it("initializes a project", () => {
		const result = begin(projectDir, "create", { type: "project" }, { name: "my-proj" });

		expect(result.entity).toBe("project");
		expect(result.phase).toBe("create");
		expect(result.previousStatus).toBe("none");
		expect(result.newStatus).toBe("initialized");

		const projectJson = path.join(projectDir, "project.json");
		expect(fs.existsSync(projectJson)).toBe(true);
	});
});

describe("begin — paths field", () => {
	it("includes paths in begin result for plan phase", () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
		begin(projectDir, "create", { type: "slice", name: "s1", epic: "e1" }, { name: "s1", goal: "G", epic: "e1" });

		const result = begin(projectDir, "plan", { type: "slice", name: "s1", epic: "e1" }, {});

		expect(result.paths).toBeDefined();
		expect(result.paths).toEqual({
			plan: path.join(projectDir, "epics", "e1", "slices", "s1", "plan.md"),
		});
	});

	it("includes paths for epic explore phase", () => {
		initProject();
		begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });

		const result = begin(projectDir, "explore", { type: "epic", name: "e1" }, {});

		expect(result.paths).toEqual({
			research: path.join(projectDir, "epics", "e1", "research"),
			brainstorm: path.join(projectDir, "epics", "e1", "brainstorm"),
		});
	});

	it("returns empty paths for create phase", () => {
		initProject();
		const result = begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });

		expect(result.paths).toEqual({});
	});

	it("returns empty paths for project target", () => {
		const result = begin(projectDir, "create", { type: "project" }, { name: "test" });

		expect(result.paths).toEqual({});
	});
});
