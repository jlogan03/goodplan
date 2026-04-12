import { describe, expect, it } from "vitest";
import { collectDecisions } from "../../../src/core/context/decisions.js";
import type { ProjectState } from "../../../src/core/data/tree.js";

describe("collectDecisions", () => {
	it("includes active decisions", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"decisions.jsonl": {
					type: "jsonl",
					content: [
						{
							id: "dec-1",
							status: "active",
							domain: "arch",
							title: "Use layers",
							summary: "4-layer architecture",
							date: "2026-03-20",
							supersededBy: null,
						},
					],
				},
			},
		};
		const decisions = collectDecisions(state);
		expect(decisions).toHaveLength(1);
		expect(decisions[0]?.id).toBe("dec-1");
		expect(decisions[0]?.status).toBe("active");
		expect(decisions[0]?.domain).toBe("arch");
		expect(decisions[0]?.title).toBe("Use layers");
		expect(decisions[0]?.summary).toBe("4-layer architecture");
	});

	it("includes revisiting decisions", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"decisions.jsonl": {
					type: "jsonl",
					content: [
						{
							id: "dec-2",
							status: "revisiting",
							domain: "testing",
							title: "Test strategy",
							summary: "Revisit vitest config",
							date: "2026-03-21",
							supersededBy: null,
						},
					],
				},
			},
		};
		const decisions = collectDecisions(state);
		expect(decisions).toHaveLength(1);
		expect(decisions[0]?.status).toBe("revisiting");
	});

	it("excludes superseded decisions", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"decisions.jsonl": {
					type: "jsonl",
					content: [
						{
							id: "dec-1",
							status: "active",
							domain: "arch",
							title: "Current",
							summary: "Active one",
							date: "2026-03-20",
							supersededBy: null,
						},
						{
							id: "dec-2",
							status: "superseded",
							domain: "arch",
							title: "Old",
							summary: "Replaced",
							date: "2026-03-19",
							supersededBy: "dec-1",
						},
					],
				},
			},
		};
		const decisions = collectDecisions(state);
		expect(decisions).toHaveLength(1);
		expect(decisions[0]?.id).toBe("dec-1");
	});

	it("returns empty array when decisions.jsonl doesn't exist", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {},
		};
		const decisions = collectDecisions(state);
		expect(decisions).toEqual([]);
	});

	it("returns empty array when decisions.jsonl is empty", () => {
		const state: ProjectState = {
			type: "directory",
			contents: {
				"decisions.jsonl": { type: "jsonl", content: [] },
			},
		};
		const decisions = collectDecisions(state);
		expect(decisions).toEqual([]);
	});
});
