import { describe, expect, it } from "vitest";
import { collectLearnings } from "../../../src/core/context/learnings.js";
import type { DirectoryEntry, ProjectState } from "../../../src/core/data/tree.js";

describe("collectLearnings", () => {
	const stateWithLearnings: ProjectState = {
		type: "directory",
		contents: {
			"learnings.jsonl": {
				type: "jsonl",
				content: [
					{
						category: "worked",
						summary: "Vitest is fast",
						file: "learnings/vitest-is-fast.md",
						tags: ["testing"],
						source: "project",
						rollup: false,
						rollupTo: [],
					},
					{
						category: "domain",
						summary: "Users need X",
						file: "learnings/users-need-x.md",
						tags: ["ux"],
						source: "project",
						rollup: false,
						rollupTo: [],
					},
				],
			},
			slices: {
				type: "directory",
				contents: {
					"01-data-layer": {
						type: "directory",
						contents: {
							"learnings.jsonl": {
								type: "jsonl",
								content: [
									{
										category: "didnt-work",
										summary: "fs.watch unreliable",
										file: "learnings/fs-watch-unreliable.md",
										tags: ["fs"],
										source: "slices/01-data-layer",
										rollup: true,
										rollupTo: ["project"],
									},
								],
							},
						},
					} satisfies DirectoryEntry,
				},
			} satisfies DirectoryEntry,
		},
	};

	it("collects project-level learnings", () => {
		const learnings = collectLearnings(stateWithLearnings);
		expect(learnings).toHaveLength(2);
		expect(learnings[0]?.category).toBe("worked");
		expect(learnings[0]?.summary).toBe("Vitest is fast");
		expect(learnings[0]?.tags).toEqual(["testing"]);
		expect(learnings[0]?.source).toBe("project");
	});

	it("includes scope-level learnings when scope provided", () => {
		const learnings = collectLearnings(stateWithLearnings, "slices/01-data-layer");
		expect(learnings).toHaveLength(3); // 2 project + 1 scope
		const scopedLearning = learnings.find((l) => l.summary === "fs.watch unreliable");
		expect(scopedLearning).toBeDefined();
		expect(scopedLearning?.category).toBe("didnt-work");
		expect(scopedLearning?.source).toBe("slices/01-data-layer");
	});

	it("returns empty array when no learnings.jsonl exists", () => {
		const emptyState: ProjectState = { type: "directory", contents: {} };
		const learnings = collectLearnings(emptyState);
		expect(learnings).toEqual([]);
	});

	it("returns empty array when learnings.jsonl is empty", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"learnings.jsonl": { type: "jsonl", content: [] },
			},
		};
		const learnings = collectLearnings(state);
		expect(learnings).toEqual([]);
	});

	it("handles missing scope gracefully", () => {
		const learnings = collectLearnings(stateWithLearnings, "slices/nonexistent");
		// Still returns project-level learnings
		expect(learnings).toHaveLength(2);
	});

	it("skips entries with invalid categories", () => {
		const stateWithInvalid: ProjectState = {
			type: "directory",
			contents: {
				"learnings.jsonl": {
					type: "jsonl",
					content: [
						{
							category: "worked",
							summary: "Valid",
							file: "learnings/valid.md",
							tags: [],
							source: "project",
							rollup: false,
							rollupTo: [],
						},
						{
							category: "invalid-category",
							summary: "Bad",
							file: "learnings/bad.md",
							tags: [],
							source: "project",
							rollup: false,
							rollupTo: [],
						},
						{
							category: "domain",
							summary: "Also valid",
							file: "learnings/also-valid.md",
							tags: [],
							source: "project",
							rollup: false,
							rollupTo: [],
						},
					],
				},
			},
		};
		const learnings = collectLearnings(stateWithInvalid);
		expect(learnings).toHaveLength(2);
		expect(learnings[0]?.summary).toBe("Valid");
		expect(learnings[1]?.summary).toBe("Also valid");
	});

	it("projects to LearningSummary correctly (omits rollup, rollupTo)", () => {
		const learnings = collectLearnings(stateWithLearnings);
		const first = learnings[0]!;
		expect(first).toEqual({
			category: "worked",
			summary: "Vitest is fast",
			file: "learnings/vitest-is-fast.md",
			tags: ["testing"],
			source: "project",
		});
		// Ensure rollup fields are NOT present
		expect("rollup" in first).toBe(false);
		expect("rollupTo" in first).toBe(false);
	});

	it("includes file field in all entries", () => {
		const learnings = collectLearnings(stateWithLearnings);
		expect(learnings).toHaveLength(2);
		expect(learnings[0]?.file).toBe("learnings/vitest-is-fast.md");
		expect(learnings[1]?.file).toBe("learnings/users-need-x.md");
	});
});
