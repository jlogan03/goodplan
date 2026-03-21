import { describe, expect, it } from "vitest";
import { statusResultSchema } from "../../../src/schemas/commands/status.js";

const validStatus = {
	project: { name: "my-project", version: "1.0.0" },
	activeEpic: null,
	activeSlice: null,
	activeQuest: null,
	artifacts: {},
	recommendations: ["Run epic:create to start"],
	warnings: [],
};

describe("statusResultSchema", () => {
	it("accepts a valid status result with null active pointers", () => {
		const result = statusResultSchema.safeParse(validStatus);
		expect(result.success).toBe(true);
	});

	it("accepts a status result with active entity projections", () => {
		const result = statusResultSchema.safeParse({
			...validStatus,
			activeEpic: { name: "goodplan-cli", status: "executing", phase: null },
			activeSlice: { name: "01-data-layer", status: "implementing", phase: "phase-2" },
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing project field", () => {
		const { project: _, ...noProject } = validStatus;
		expect(statusResultSchema.safeParse(noProject).success).toBe(false);
	});

	it("rejects invalid recommendations type", () => {
		expect(
			statusResultSchema.safeParse({ ...validStatus, recommendations: "not-an-array" }).success,
		).toBe(false);
	});
});
