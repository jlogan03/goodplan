import { describe, expect, it } from "vitest";
import {
	ArchitectureDeltaSchema,
	DeferredItemSchema,
} from "../../../../src/schemas/entities/slice-artifacts.js";
import { sliceLandedPayloadSchema } from "../../../../src/schemas/events/slice.js";
import { learningInputSchema } from "../../../../src/schemas/records/learning.js";

describe("DeferredItemSchema", () => {
	it("accepts valid deferred items", () => {
		const valid = {
			type: "task",
			title: "Fix the flaky test",
		};
		expect(DeferredItemSchema.parse(valid)).toEqual(valid);
	});

	it("accepts all type variants", () => {
		for (const type of ["task", "slice", "side-quest"] as const) {
			const result = DeferredItemSchema.safeParse({ type, title: "Test" });
			expect(result.success).toBe(true);
		}
	});

	it("accepts optional description and epic", () => {
		const full = {
			type: "slice" as const,
			title: "New slice",
			description: "Handles edge case",
			epic: "other-epic",
		};
		expect(DeferredItemSchema.parse(full)).toEqual(full);
	});

	it("rejects missing title", () => {
		const result = DeferredItemSchema.safeParse({ type: "task" });
		expect(result.success).toBe(false);
	});

	it("rejects invalid type", () => {
		const result = DeferredItemSchema.safeParse({ type: "epic", title: "Nope" });
		expect(result.success).toBe(false);
	});
});

describe("ArchitectureDeltaSchema", () => {
	it("accepts valid delta", () => {
		const valid = {
			subsystem: "auth",
			change: "Added OAuth2 provider support",
		};
		expect(ArchitectureDeltaSchema.parse(valid)).toEqual(valid);
	});

	it("accepts optional reason", () => {
		const withReason = {
			subsystem: "db",
			change: "Added migration table",
			reason: "Needed for schema versioning",
		};
		expect(ArchitectureDeltaSchema.parse(withReason)).toEqual(withReason);
	});

	it("rejects missing subsystem", () => {
		const result = ArchitectureDeltaSchema.safeParse({ change: "Something" });
		expect(result.success).toBe(false);
	});
});

describe("sliceLandedPayloadSchema", () => {
	it("accepts minimal payload (sliceRef only)", () => {
		const payload = { sliceRef: "slice-01" };
		expect(sliceLandedPayloadSchema.parse(payload)).toEqual(payload);
	});

	it("accepts full payload with all optional fields", () => {
		const payload = {
			sliceRef: "slice-01",
			deferred: [{ type: "task" as const, title: "Fix later" }],
			learnings: [
				{
					category: "worked" as const,
					summary: "TDD worked well",
					detail: "Red-green cycle caught 3 bugs",
					tags: ["tdd"],
					rollupTo: ["epic" as const],
				},
			],
			architectureDelta: [
				{
					subsystem: "cli",
					change: "Added slice:land command",
				},
			],
		};
		const parsed = sliceLandedPayloadSchema.parse(payload);
		expect(parsed.sliceRef).toBe("slice-01");
		expect(parsed.deferred).toHaveLength(1);
		expect(parsed.learnings).toHaveLength(1);
		expect(parsed.architectureDelta).toHaveLength(1);
	});

	it("conditional-spread pattern works under exactOptionalPropertyTypes", () => {
		// Simulates what land.ts does at the call site
		const deferred = undefined;
		const learnings = [
			{
				category: "domain" as const,
				summary: "s",
				detail: "d",
				tags: [],
				rollupTo: [] as Array<"epic" | "project">,
			},
		];
		const architectureDelta = undefined;

		const payload = {
			sliceRef: "test",
			...(deferred ? { deferred } : {}),
			...(learnings ? { learnings } : {}),
			...(architectureDelta ? { architectureDelta } : {}),
		};

		const result = sliceLandedPayloadSchema.safeParse(payload);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.learnings).toHaveLength(1);
			// deferred and architectureDelta should not be present
			expect(result.data.deferred).toBeUndefined();
			expect(result.data.architectureDelta).toBeUndefined();
		}
	});

	it("re-parses through schema after conditional spread", () => {
		const deferred = [{ type: "side-quest" as const, title: "Research caching" }];

		const payload = {
			sliceRef: "s1",
			...(deferred ? { deferred } : {}),
		};

		const parsed = sliceLandedPayloadSchema.parse(payload);
		// Round-trip: re-parse the parsed output
		const reparsed = sliceLandedPayloadSchema.parse(parsed);
		expect(reparsed).toEqual(parsed);
	});
});

describe("learningInputSchema (transitional reuse)", () => {
	it("accepts valid learning input", () => {
		const input = {
			category: "worked",
			summary: "TDD was effective",
			detail: "Caught regressions early",
			tags: ["testing"],
			rollupTo: ["epic"],
		};
		const result = learningInputSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it("rejects invalid category", () => {
		const result = learningInputSchema.safeParse({
			category: "invalid",
			summary: "s",
			detail: "d",
			tags: [],
			rollupTo: [],
		});
		expect(result.success).toBe(false);
	});
});
