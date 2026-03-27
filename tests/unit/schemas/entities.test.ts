import { describe, expect, it } from "vitest";
import {
	epicSchema,
	epicStatusSchema,
	verificationSchema,
} from "../../../src/schemas/entities/epic.js";
import {
	sliceSchema,
	sliceStatusSchema,
} from "../../../src/schemas/entities/slice.js";
import {
	questSchema,
	questStatusSchema,
} from "../../../src/schemas/entities/quest.js";
import {
	epicOverviewItemSchema,
	epicOverviewSchema,
	overviewSchema,
	sliceOverviewItemSchema,
} from "../../../src/schemas/entities/overview.js";

// --- Epic ---

const validVerification = {
	description: "CLI can create epics",
	status: "pending" as const,
	addedDuring: "defining-slices",
	modifiedDuring: null,
};

const validEpic = {
	name: "goodplan-cli",
	status: "activated" as const,
	goal: "Build a compiled TypeScript CLI",
	verifications: [validVerification],
	refinement: null,
	created: "2026-03-20T00:00:00Z",
	activated: "2026-03-20T12:00:00Z",
	updated: "2026-03-20T12:00:00Z",
};

describe("epicStatusSchema", () => {
	it("accepts all valid epic statuses", () => {
		const statuses = [
			"created",
			"exploring",
			"explored",
			"defining-architecture",
			"architecture-defined",
			"refining-architecture",
			"architecture-refined",
			"defining-slices",
			"slices-defined",
			"refining-slices",
			"slices-refined",
			"activated",
			"completed",
			"abandoned",
		];
		for (const s of statuses) {
			expect(epicStatusSchema.safeParse(s).success).toBe(true);
		}
	});

	it("rejects invalid status", () => {
		expect(epicStatusSchema.safeParse("invalid").success).toBe(false);
	});
});

describe("verificationSchema", () => {
	it("accepts a valid verification", () => {
		expect(verificationSchema.safeParse(validVerification).success).toBe(true);
	});

	it("accepts verification with modifiedDuring set", () => {
		expect(
			verificationSchema.safeParse({
				...validVerification,
				modifiedDuring: "activated",
			}).success,
		).toBe(true);
	});

	it("rejects empty description", () => {
		expect(
			verificationSchema.safeParse({ ...validVerification, description: "" })
				.success,
		).toBe(false);
	});

	it("rejects invalid status", () => {
		expect(
			verificationSchema.safeParse({ ...validVerification, status: "unknown" })
				.success,
		).toBe(false);
	});
});

describe("epicSchema", () => {
	it("accepts a valid epic", () => {
		expect(epicSchema.safeParse(validEpic).success).toBe(true);
	});

	it("accepts epic with null activated", () => {
		expect(
			epicSchema.safeParse({ ...validEpic, activated: null }).success,
		).toBe(true);
	});

	it("accepts epic with empty verifications", () => {
		expect(
			epicSchema.safeParse({
				...validEpic,
				verifications: [],
			}).success,
		).toBe(true);
	});

	it("rejects missing name", () => {
		const { name: _, ...noName } = validEpic;
		expect(epicSchema.safeParse(noName).success).toBe(false);
	});

	it("rejects invalid status", () => {
		expect(
			epicSchema.safeParse({ ...validEpic, status: "bogus" }).success,
		).toBe(false);
	});

	it("rejects invalid timestamp", () => {
		expect(
			epicSchema.safeParse({ ...validEpic, created: "not-a-date" }).success,
		).toBe(false);
	});

	it("rejects empty goal", () => {
		expect(
			epicSchema.safeParse({ ...validEpic, goal: "" }).success,
		).toBe(false);
	});
});

// --- Slice ---

const validSlice = {
	name: "01-data-layer",
	epic: "goodplan-cli",
	status: "implementing" as const,
	goal: "Implement filesystem I/O layer",
	deferred: [],
	refinement: {
		round: 2,
		maxRounds: 10,
		scoreHistory: [
			{ round: 1, scores: { correctness: 7, completeness: 8 } },
			{ round: 2, scores: { correctness: 9, completeness: 9 } },
		],
	},
	created: "2026-03-20T00:00:00Z",
	updated: "2026-03-20T12:00:00Z",
};

describe("sliceStatusSchema", () => {
	it("accepts all valid slice statuses", () => {
		const statuses = [
			"created",
			"planning",
			"plan-created",
			"refining",
			"plan-refined",
			"implementing",
			"implementation-complete",
			"completed",
			"abandoned",
		];
		for (const s of statuses) {
			expect(sliceStatusSchema.safeParse(s).success).toBe(true);
		}
	});

	it("rejects invalid status", () => {
		expect(sliceStatusSchema.safeParse("invalid").success).toBe(false);
	});
});

describe("sliceSchema", () => {
	it("accepts a valid slice", () => {
		expect(sliceSchema.safeParse(validSlice).success).toBe(true);
	});

	it("accepts slice with null refinement", () => {
		expect(
			sliceSchema.safeParse({ ...validSlice, refinement: null }).success,
		).toBe(true);
	});

	it("accepts slice with deferred items", () => {
		expect(
			sliceSchema.safeParse({
				...validSlice,
				deferred: [
					{ description: "Add caching", targetSlice: "03-caching" },
					{ description: "Add logging", targetSlice: "04-logging" },
				],
			}).success,
		).toBe(true);
	});

	it("rejects missing epic", () => {
		const { epic: _, ...noEpic } = validSlice;
		expect(sliceSchema.safeParse(noEpic).success).toBe(false);
	});

	it("rejects invalid status", () => {
		expect(
			sliceSchema.safeParse({ ...validSlice, status: "bogus" }).success,
		).toBe(false);
	});

	it("rejects invalid refinement shape", () => {
		expect(
			sliceSchema.safeParse({ ...validSlice, refinement: { round: "abc" } })
				.success,
		).toBe(false);
	});
});

// --- Quest ---

const validQuest = {
	name: "fix-logging",
	status: "planning" as const,
	goal: "Fix structured logging to include correlation IDs",
	refinement: null,
	created: "2026-03-20T00:00:00Z",
	updated: "2026-03-20T12:00:00Z",
};

describe("questStatusSchema", () => {
	it("accepts all valid quest statuses", () => {
		const statuses = [
			"created",
			"planning",
			"plan-created",
			"refining",
			"plan-refined",
			"implementing",
			"implementation-complete",
			"completed",
			"abandoned",
		];
		for (const s of statuses) {
			expect(questStatusSchema.safeParse(s).success).toBe(true);
		}
	});

	it("rejects invalid status", () => {
		expect(questStatusSchema.safeParse("invalid").success).toBe(false);
	});
});

describe("questSchema", () => {
	it("accepts a valid quest", () => {
		expect(questSchema.safeParse(validQuest).success).toBe(true);
	});

	it("accepts quest with refinement", () => {
		expect(
			questSchema.safeParse({
				...validQuest,
				refinement: {
					round: 1,
					maxRounds: 10,
					scoreHistory: [
						{ round: 1, scores: { correctness: 7, completeness: 8 } },
					],
				},
			}).success,
		).toBe(true);
	});

	it("rejects missing goal", () => {
		const { goal: _, ...noGoal } = validQuest;
		expect(questSchema.safeParse(noGoal).success).toBe(false);
	});

	it("rejects invalid status", () => {
		expect(
			questSchema.safeParse({ ...validQuest, status: "bogus" }).success,
		).toBe(false);
	});

	it("has no epic field", () => {
		// Quest is project-scoped, not epic-scoped
		const withEpic = { ...validQuest, epic: "goodplan-cli" };
		// Should still parse (extra fields stripped by Zod 4), but the epic field is not in the type
		const result = questSchema.safeParse(withEpic);
		expect(result.success).toBe(true);
		if (result.success) {
			expect("epic" in result.data).toBe(false);
		}
	});
});

// --- Overview ---

const validOverview = {
	items: [
		{
			name: "01-data-layer",
			status: "completed",
			created: "2026-03-20T00:00:00Z",
			completed: "2026-03-21T00:00:00Z",
		},
		{
			name: "02-state-machine",
			status: "implementing",
			created: "2026-03-20T00:00:00Z",
			completed: null,
		},
	],
};

describe("overviewSchema", () => {
	it("accepts a valid overview", () => {
		expect(overviewSchema.safeParse(validOverview).success).toBe(true);
	});

	it("accepts empty items array", () => {
		expect(overviewSchema.safeParse({ items: [] }).success).toBe(true);
	});

	it("accepts any string as item status (not enum-locked)", () => {
		expect(
			overviewSchema.safeParse({
				items: [
					{
						name: "test",
						status: "any-arbitrary-status",
						created: "2026-03-20T00:00:00Z",
						completed: null,
					},
				],
			}).success,
		).toBe(true);
	});

	it("rejects missing items", () => {
		expect(overviewSchema.safeParse({}).success).toBe(false);
	});

	it("rejects item with empty name", () => {
		expect(
			overviewSchema.safeParse({
				items: [
					{
						name: "",
						status: "active",
						created: "2026-03-20T00:00:00Z",
						completed: null,
					},
				],
			}).success,
		).toBe(false);
	});

	it("rejects item with invalid timestamp", () => {
		expect(
			overviewSchema.safeParse({
				items: [
					{
						name: "test",
						status: "active",
						created: "bad-date",
						completed: null,
					},
				],
			}).success,
		).toBe(false);
	});
});

// --- SliceOverviewItem ---

describe("sliceOverviewItemSchema", () => {
	it("accepts a valid slice overview item", () => {
		expect(
			sliceOverviewItemSchema.safeParse({
				name: "01-data-layer",
				status: "implementing",
				created: "2026-03-20T00:00:00Z",
				completed: null,
			}).success,
		).toBe(true);
	});

	it("strips epic and title fields (omitted from base)", () => {
		const result = sliceOverviewItemSchema.safeParse({
			name: "01-data-layer",
			status: "implementing",
			epic: "my-epic",
			title: "Some Title",
			created: "2026-03-20T00:00:00Z",
			completed: null,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect("epic" in result.data).toBe(false);
			expect("title" in result.data).toBe(false);
		}
	});

	it("rejects missing name", () => {
		expect(
			sliceOverviewItemSchema.safeParse({
				status: "created",
				created: "2026-03-20T00:00:00Z",
				completed: null,
			}).success,
		).toBe(false);
	});
});

// --- EpicOverviewItem ---

describe("epicOverviewItemSchema", () => {
	it("accepts epic overview item with slices", () => {
		expect(
			epicOverviewItemSchema.safeParse({
				name: "my-epic",
				status: "activated",
				created: "2026-03-20T00:00:00Z",
				completed: null,
				slices: [
					{
						name: "01-data-layer",
						status: "completed",
						created: "2026-03-20T00:00:00Z",
						completed: "2026-03-21T00:00:00Z",
					},
				],
			}).success,
		).toBe(true);
	});

	it("accepts epic overview item with empty slices array", () => {
		expect(
			epicOverviewItemSchema.safeParse({
				name: "my-epic",
				status: "created",
				created: "2026-03-20T00:00:00Z",
				completed: null,
				slices: [],
			}).success,
		).toBe(true);
	});

	it("rejects epic overview item without slices", () => {
		expect(
			epicOverviewItemSchema.safeParse({
				name: "my-epic",
				status: "created",
				created: "2026-03-20T00:00:00Z",
				completed: null,
			}).success,
		).toBe(false);
	});
});

// --- EpicOverview ---

describe("epicOverviewSchema", () => {
	it("accepts a valid epic overview", () => {
		expect(
			epicOverviewSchema.safeParse({
				items: [
					{
						name: "my-epic",
						status: "activated",
						created: "2026-03-20T00:00:00Z",
						completed: null,
						slices: [
							{
								name: "01-data-layer",
								status: "implementing",
								created: "2026-03-20T00:00:00Z",
								completed: null,
							},
						],
					},
				],
			}).success,
		).toBe(true);
	});

	it("accepts empty items array", () => {
		expect(
			epicOverviewSchema.safeParse({ items: [] }).success,
		).toBe(true);
	});

	it("rejects items without slices field", () => {
		expect(
			epicOverviewSchema.safeParse({
				items: [
					{
						name: "my-epic",
						status: "activated",
						created: "2026-03-20T00:00:00Z",
						completed: null,
					},
				],
			}).success,
		).toBe(false);
	});
});
