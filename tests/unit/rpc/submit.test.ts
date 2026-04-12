import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { begin } from "../../../src/core/rpc/begin.js";
import { rpcInit } from "../../../src/core/rpc/init.js";
import { submit } from "../../../src/core/rpc/submit.js";
import { GoodplanError } from "../../../src/util/errors.js";

let tmpDir: string;
let projectDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-rpc-submit-"));
	projectDir = path.join(tmpDir, ".goodplan");
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function initWithEpic() {
	rpcInit(projectDir, "test");
	begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
}

describe("submit — COMPLETE_EXPLORE", () => {
	it("transitions exploring → explored", () => {
		initWithEpic();
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});

		const result = submit(
			projectDir,
			"explore",
			{ type: "epic", name: "e1" },
			{ phase: "explore" },
		);

		expect(result.entity).toBe("e1");
		expect(result.phase).toBe("explore");
		expect(result.previousStatus).toBe("exploring");
		expect(result.newStatus).toBe("explored");
		expect(result.advanced).toBe(true);
	});
});

describe("submit — COMPLETE_ARCHITECTURE", () => {
	it("transitions defining-architecture → architecture-defined", () => {
		initWithEpic();
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});

		const result = submit(
			projectDir,
			"architecture",
			{ type: "epic", name: "e1" },
			{ phase: "architecture" },
		);

		expect(result.previousStatus).toBe("defining-architecture");
		expect(result.newStatus).toBe("architecture-defined");
		expect(result.advanced).toBe(true);
	});
});

describe("submit — COMPLETE_REFINE_ARCHITECTURE", () => {
	it("transitions with high scores → architecture-refined", () => {
		initWithEpic();
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
		submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
		begin(projectDir, "refine-architecture", { type: "epic", name: "e1" }, {});

		const result = submit(
			projectDir,
			"refine-architecture",
			{ type: "epic", name: "e1" },
			{ phase: "refine-architecture", scores: { quality: 10, completeness: 10 } },
		);

		expect(result.previousStatus).toBe("refining-architecture");
		expect(result.newStatus).toBe("architecture-refined");
		expect(result.advanced).toBe(true);
	});

	it("stays in refining-architecture with low scores", () => {
		initWithEpic();
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
		submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
		begin(projectDir, "refine-architecture", { type: "epic", name: "e1" }, {});

		const result = submit(
			projectDir,
			"refine-architecture",
			{ type: "epic", name: "e1" },
			{ phase: "refine-architecture", scores: { quality: 5, completeness: 5 } },
		);

		expect(result.previousStatus).toBe("refining-architecture");
		expect(result.newStatus).toBe("refining-architecture");
		expect(result.advanced).toBe(false);
	});
});

describe("submit — phase mismatch assertion", () => {
	it("throws INTERNAL_ERROR when phase parameter !== content.phase", () => {
		initWithEpic();

		expect(() =>
			submit(
				projectDir,
				"explore",
				{ type: "epic", name: "e1" },
				// Intentional mismatch: content.phase is 'architecture' but parameter is 'explore'
				{ phase: "architecture" } as never,
			),
		).toThrow(GoodplanError);

		try {
			submit(projectDir, "explore", { type: "epic", name: "e1" }, {
				phase: "architecture",
			} as never);
		} catch (err) {
			expect((err as GoodplanError).code).toBe("INTERNAL_ERROR");
		}
	});
});

describe("submit — complete phase error", () => {
	it("throws INTERNAL_ERROR when phase is 'complete'", () => {
		initWithEpic();

		expect(() =>
			submit(
				projectDir,
				"complete",
				{ type: "slice", name: "s1", epic: "e1" },
				// complete is not a valid submit phase — must use the complete() RPC function.
				// We force the type here to test the runtime guard.
				{ phase: "complete" } as never,
			),
		).toThrow(GoodplanError);

		try {
			submit(projectDir, "complete", { type: "slice", name: "s1", epic: "e1" }, {
				phase: "complete",
			} as never);
		} catch (err) {
			expect((err as GoodplanError).code).toBe("INTERNAL_ERROR");
			expect((err as GoodplanError).message).toContain("submit('complete') is not valid");
		}
	});
});

describe("submit — paths field", () => {
	it("includes paths in submit result for explore phase", () => {
		initWithEpic();
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});

		const result = submit(
			projectDir,
			"explore",
			{ type: "epic", name: "e1" },
			{ phase: "explore" },
		);

		expect(result.paths).toBeDefined();
		expect(result.paths).toEqual({
			research: path.join(projectDir, "epics", "e1", "research"),
			brainstorm: path.join(projectDir, "epics", "e1", "brainstorm"),
		});
	});

	it("includes paths for architecture submit", () => {
		initWithEpic();
		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});

		const result = submit(
			projectDir,
			"architecture",
			{ type: "epic", name: "e1" },
			{ phase: "architecture" },
		);

		expect(result.paths).toEqual({
			architecture: path.join(projectDir, "epics", "e1", "architecture"),
		});
	});
});

describe("submit — full slicing lifecycle", () => {
	it("goes through explore → architecture → refine-arch → slicing → refine-slices", () => {
		initWithEpic();

		begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
		submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });

		begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
		submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });

		begin(projectDir, "refine-architecture", { type: "epic", name: "e1" }, {});
		submit(
			projectDir,
			"refine-architecture",
			{ type: "epic", name: "e1" },
			{
				phase: "refine-architecture",
				scores: { q: 10 },
			},
		);

		begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
		submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });

		begin(projectDir, "refine-slices", { type: "epic", name: "e1" }, {});
		const result = submit(
			projectDir,
			"refine-slices",
			{ type: "epic", name: "e1" },
			{
				phase: "refine-slices",
				scores: { q: 10 },
			},
		);

		expect(result.newStatus).toBe("slices-refined");
	});
});
