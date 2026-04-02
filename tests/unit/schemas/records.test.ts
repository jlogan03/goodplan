import { describe, expect, it } from "vitest";
import { activityEntrySchema } from "../../../src/schemas/records/activity-log.js";
import { decisionEntrySchema } from "../../../src/schemas/records/decision.js";
import { learningEntrySchema } from "../../../src/schemas/records/learning.js";
import { architectureDeltaSchema } from "../../../src/schemas/records/architecture-delta.js";

// --- Activity Log ---

const validActivity = {
	ts: "2026-03-20T12:00:00Z",
	phase: "begin-plan",
	scope: "slices/01-data-layer",
	status: "complete",
	summary: "Plan created for data layer slice",
};

describe("activityEntrySchema", () => {
	it("accepts a valid activity entry", () => {
		expect(activityEntrySchema.safeParse(validActivity).success).toBe(true);
	});

	it("accepts activity with detail", () => {
		expect(
			activityEntrySchema.safeParse({
				...validActivity,
				detail: "Additional context here",
			}).success,
		).toBe(true);
	});

	it("accepts activity without detail", () => {
		const { detail: _, ...noDetail } = { ...validActivity, detail: "x" };
		expect(activityEntrySchema.safeParse(noDetail).success).toBe(true);
	});

	it("rejects empty phase", () => {
		expect(
			activityEntrySchema.safeParse({ ...validActivity, phase: "" }).success,
		).toBe(false);
	});

	it("rejects empty scope", () => {
		expect(
			activityEntrySchema.safeParse({ ...validActivity, scope: "" }).success,
		).toBe(false);
	});

	it("rejects invalid timestamp", () => {
		expect(
			activityEntrySchema.safeParse({ ...validActivity, ts: "not-a-date" })
				.success,
		).toBe(false);
	});

	it("rejects missing required fields", () => {
		expect(activityEntrySchema.safeParse({}).success).toBe(false);
	});
});

// --- Decision ---

const validDecision = {
	id: "2026-03-20-layered-architecture",
	status: "active" as const,
	domain: "architecture",
	title: "Four-Layer Unidirectional Architecture",
	summary: "Commands → RPC → State Machine + Data Layer",
	date: "2026-03-20",
	supersededBy: null,
};

describe("decisionEntrySchema", () => {
	it("accepts a valid decision", () => {
		expect(decisionEntrySchema.safeParse(validDecision).success).toBe(true);
	});

	it("accepts decision with supersededBy", () => {
		expect(
			decisionEntrySchema.safeParse({
				...validDecision,
				status: "superseded",
				supersededBy: "2026-03-21-new-decision",
			}).success,
		).toBe(true);
	});

	it("accepts revisiting status", () => {
		expect(
			decisionEntrySchema.safeParse({
				...validDecision,
				status: "revisiting",
			}).success,
		).toBe(true);
	});

	it("rejects invalid status", () => {
		expect(
			decisionEntrySchema.safeParse({ ...validDecision, status: "bogus" })
				.success,
		).toBe(false);
	});

	it("rejects empty id", () => {
		expect(
			decisionEntrySchema.safeParse({ ...validDecision, id: "" }).success,
		).toBe(false);
	});

	it("rejects missing fields", () => {
		expect(decisionEntrySchema.safeParse({}).success).toBe(false);
	});
});

// --- Learning ---

const validLearning = {
	category: "domain",
	summary: "Brief actionable statement",
	file: "learnings/brief-actionable-statement.md",
	tags: ["auth", "testing"],
	source: "slices/01-auth",
	rollup: true,
	rollupTo: ["epic", "project"],
};

describe("learningEntrySchema", () => {
	it("accepts a valid learning", () => {
		expect(learningEntrySchema.safeParse(validLearning).success).toBe(true);
	});

	it("accepts learning with rollup false and empty rollupTo", () => {
		expect(
			learningEntrySchema.safeParse({
				...validLearning,
				rollup: false,
				rollupTo: [],
			}).success,
		).toBe(true);
	});

	it("accepts learning with empty tags", () => {
		expect(
			learningEntrySchema.safeParse({ ...validLearning, tags: [] }).success,
		).toBe(true);
	});

	it("rejects missing rollup", () => {
		const { rollup: _, ...noRollup } = validLearning;
		expect(learningEntrySchema.safeParse(noRollup).success).toBe(false);
	});

	it("rejects missing rollupTo", () => {
		const { rollupTo: _, ...noRollupTo } = validLearning;
		expect(learningEntrySchema.safeParse(noRollupTo).success).toBe(false);
	});

	it("rejects missing source", () => {
		const { source: _, ...noSource } = validLearning;
		expect(learningEntrySchema.safeParse(noSource).success).toBe(false);
	});

	it("rejects empty category", () => {
		expect(
			learningEntrySchema.safeParse({ ...validLearning, category: "" })
				.success,
		).toBe(false);
	});

	it("rejects missing fields", () => {
		expect(learningEntrySchema.safeParse({}).success).toBe(false);
	});

	it("rejects legacy detail-only entries (no file field)", () => {
		const { file: _, ...legacy } = validLearning;
		expect(learningEntrySchema.safeParse({ ...legacy, detail: "some detail" }).success).toBe(false);
	});

	it("accepts learning with validUntil", () => {
		expect(
			learningEntrySchema.safeParse({
				...validLearning,
				validUntil: ["Build pipeline migrates to TypeScript"],
			}).success,
		).toBe(true);
	});

	it("accepts learning with empty validUntil array", () => {
		expect(
			learningEntrySchema.safeParse({
				...validLearning,
				validUntil: [],
			}).success,
		).toBe(true);
	});

	it("accepts learning without validUntil (backward compat)", () => {
		// validLearning has no validUntil — should still parse
		expect(learningEntrySchema.safeParse(validLearning).success).toBe(true);
	});
});

// --- Architecture Delta ---

const validArchDelta = {
	subsystem: "auth",
	type: "modify" as const,
	description: "Added OAuth2 token refresh flow",
	ts: "2026-03-20T12:00:00Z",
};

describe("architectureDeltaSchema", () => {
	it("accepts a valid architecture delta", () => {
		expect(architectureDeltaSchema.safeParse(validArchDelta).success).toBe(
			true,
		);
	});

	it("accepts all valid types", () => {
		for (const t of ["add", "modify", "remove"]) {
			expect(
				architectureDeltaSchema.safeParse({ ...validArchDelta, type: t })
					.success,
			).toBe(true);
		}
	});

	it("rejects invalid type", () => {
		expect(
			architectureDeltaSchema.safeParse({ ...validArchDelta, type: "update" })
				.success,
		).toBe(false);
	});

	it("rejects empty subsystem", () => {
		expect(
			architectureDeltaSchema.safeParse({ ...validArchDelta, subsystem: "" })
				.success,
		).toBe(false);
	});

	it("rejects invalid timestamp", () => {
		expect(
			architectureDeltaSchema.safeParse({ ...validArchDelta, ts: "bad" })
				.success,
		).toBe(false);
	});

	it("rejects missing fields", () => {
		expect(architectureDeltaSchema.safeParse({}).success).toBe(false);
	});
});
