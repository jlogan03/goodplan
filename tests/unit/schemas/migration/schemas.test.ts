import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	confirmationResponseSchema,
	epicDetailResponseSchema,
	inventoryResponseSchema,
	migrationResultSchema,
	migrationStateSchema,
	validateAnswer,
} from "../../../../src/commands/global/migrate/schemas.js";
import type { MigrationAnswer } from "../../../../src/commands/global/migrate/schemas.js";

// ---------------------------------------------------------------------------
// Inventory Response Schema
// ---------------------------------------------------------------------------

describe("inventoryResponseSchema", () => {
	const validInput = {
		project: { name: "my-project", goal: "Build something great" },
		epics: [
			{
				name: "epic-one",
				goal: "First epic goal",
				status: "activated",
				sourcePath: "epics/epic-one",
			},
		],
		quests: [
			{
				name: "quest-one",
				goal: "First quest goal",
				status: "created",
				sourcePath: "quests/quest-one",
			},
		],
	};

	it("accepts valid inventory response", () => {
		const result = inventoryResponseSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("rejects missing project name", () => {
		const result = inventoryResponseSchema.safeParse({
			...validInput,
			project: { name: "", goal: "some goal" },
		});
		expect(result.success).toBe(false);
	});

	it("rejects missing required fields", () => {
		const result = inventoryResponseSchema.safeParse({
			project: { name: "test" },
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid epic status", () => {
		const result = inventoryResponseSchema.safeParse({
			...validInput,
			epics: [{ ...validInput.epics[0], status: "invalid-status" }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid quest status", () => {
		const result = inventoryResponseSchema.safeParse({
			...validInput,
			quests: [{ ...validInput.quests[0], status: "invalid-status" }],
		});
		expect(result.success).toBe(false);
	});

	it("accepts empty arrays for epics and quests", () => {
		const result = inventoryResponseSchema.safeParse({
			project: { name: "test", goal: "test goal" },
			epics: [],
			quests: [],
		});
		expect(result.success).toBe(true);
	});

	it("ensures quest goal field is present and non-empty", () => {
		const result = inventoryResponseSchema.safeParse({
			...validInput,
			quests: [{ ...validInput.quests[0], goal: "" }],
		});
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// z.toJSONSchema() integration
// ---------------------------------------------------------------------------

describe("z.toJSONSchema() integration", () => {
	it("produces valid JSON Schema with properties and required for inventory", () => {
		const jsonSchema = z.toJSONSchema(inventoryResponseSchema, { unrepresentable: "any" });
		expect(jsonSchema).toHaveProperty("properties");
		expect(jsonSchema).toHaveProperty("required");
	});

	it("preserves .describe() annotations in JSON Schema output", () => {
		const jsonSchema = z.toJSONSchema(inventoryResponseSchema, {
			unrepresentable: "any",
		}) as Record<string, unknown>;
		const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;
		// The top-level "project" property should have a description from .describe()
		expect(properties.project).toBeDefined();
		expect(properties.project.description).toBe("Project-level information");
	});

	it("produces valid JSON Schema for epicDetailResponseSchema", () => {
		const jsonSchema = z.toJSONSchema(epicDetailResponseSchema, { unrepresentable: "any" });
		expect(jsonSchema).toHaveProperty("properties");
		expect(jsonSchema).toHaveProperty("required");
	});

	it("produces valid JSON Schema for confirmationResponseSchema", () => {
		const jsonSchema = z.toJSONSchema(confirmationResponseSchema, { unrepresentable: "any" });
		// Discriminated unions produce oneOf or anyOf
		expect("oneOf" in jsonSchema || "anyOf" in jsonSchema || "discriminator" in jsonSchema).toBe(
			true,
		);
	});
});

// ---------------------------------------------------------------------------
// Epic Detail Response Schema
// ---------------------------------------------------------------------------

describe("epicDetailResponseSchema", () => {
	const validDetail = {
		slices: [
			{
				name: "slice-one",
				goal: "First slice",
				status: "created",
				sourcePath: "slices/slice-one",
			},
		],
		sliceSequence: ["slice-one"],
		hasArchitecture: true,
		activatedDate: "2026-03-20T00:00:00Z",
	};

	it("accepts valid epic detail response", () => {
		const result = epicDetailResponseSchema.safeParse(validDetail);
		expect(result.success).toBe(true);
	});

	it("accepts null activatedDate", () => {
		const result = epicDetailResponseSchema.safeParse({
			...validDetail,
			activatedDate: null,
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid activatedDate format", () => {
		const result = epicDetailResponseSchema.safeParse({
			...validDetail,
			activatedDate: "not-a-date",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid slice status", () => {
		const result = epicDetailResponseSchema.safeParse({
			...validDetail,
			slices: [{ ...validDetail.slices[0], status: "bogus" }],
		});
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Confirmation Response Schema
// ---------------------------------------------------------------------------

describe("confirmationResponseSchema", () => {
	it("accepts approved=true without reAnswerIds", () => {
		const result = confirmationResponseSchema.safeParse({
			approved: true,
			notes: "Looks good",
		});
		expect(result.success).toBe(true);
	});

	it("accepts approved=false with reAnswerIds", () => {
		const result = confirmationResponseSchema.safeParse({
			approved: false,
			reAnswerIds: ["project-info"],
			notes: "Need to fix project name",
		});
		expect(result.success).toBe(true);
	});

	it("rejects approved=false with empty reAnswerIds", () => {
		const result = confirmationResponseSchema.safeParse({
			approved: false,
			reAnswerIds: [],
			notes: "Need corrections",
		});
		expect(result.success).toBe(false);
	});

	it("rejects approved=false without reAnswerIds", () => {
		const result = confirmationResponseSchema.safeParse({
			approved: false,
			notes: "Missing IDs",
		});
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Migration State Schema
// ---------------------------------------------------------------------------

describe("migrationStateSchema", () => {
	it("accepts valid migration state", () => {
		const result = migrationStateSchema.safeParse({
			status: "in-progress",
			round: 1,
			answers: { "project-info": { name: "test" } },
			correctionRound: 0,
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid status", () => {
		const result = migrationStateSchema.safeParse({
			status: "invalid",
			round: 1,
			answers: {},
			correctionRound: 0,
		});
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Migration Result Schema
// ---------------------------------------------------------------------------

describe("migrationResultSchema", () => {
	it("accepts questions result", () => {
		const result = migrationResultSchema.safeParse({
			status: "questions",
			round: {
				round: 1,
				questions: [
					{
						id: "project-info",
						question: "What is the project?",
						hint: "Read the old .project/ files",
						responseSchema: { type: "object" },
					},
				],
			},
		});
		expect(result.success).toBe(true);
	});

	it("accepts complete result", () => {
		const result = migrationResultSchema.safeParse({
			status: "complete",
			summary: {
				projectName: "test-project",
				epicCount: 2,
				questCount: 1,
				sliceCount: 5,
			},
		});
		expect(result.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// validateAnswer helper
// ---------------------------------------------------------------------------

describe("validateAnswer", () => {
	const schema = z.object({ name: z.string() });

	it("returns narrowed answer on valid data", () => {
		const answer: MigrationAnswer = { id: "test", data: { name: "hello" } };
		const validated = validateAnswer(answer, schema);
		expect(validated.id).toBe("test");
		expect(validated.data.name).toBe("hello");
	});

	it("throws on invalid data", () => {
		const answer: MigrationAnswer = { id: "test", data: { name: 123 } };
		expect(() => validateAnswer(answer, schema)).toThrow();
	});
});
