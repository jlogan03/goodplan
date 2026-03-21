import { describe, expect, it } from "vitest";
import { projectSchema } from "../../../src/schemas/entities/project.js";

const validProject = {
	version: "1.0.0",
	name: "my-project",
	activeEpic: null,
	activeSlice: null,
	activeQuest: null,
	created: "2026-03-20T00:00:00Z",
	updated: "2026-03-20T12:00:00Z",
};

describe("projectSchema", () => {
	it("accepts a valid project", () => {
		const result = projectSchema.safeParse(validProject);
		expect(result.success).toBe(true);
	});

	it("accepts a project with active pointers", () => {
		const result = projectSchema.safeParse({
			...validProject,
			activeEpic: "goodplan-cli",
			activeSlice: "01-data-layer",
			activeQuest: "fix-logging",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing name", () => {
		const { name: _, ...noName } = validProject;
		expect(projectSchema.safeParse(noName).success).toBe(false);
	});

	it("rejects empty name", () => {
		expect(projectSchema.safeParse({ ...validProject, name: "" }).success).toBe(false);
	});

	it("rejects invalid version", () => {
		expect(projectSchema.safeParse({ ...validProject, version: "bad" }).success).toBe(false);
	});

	it("rejects invalid timestamps", () => {
		expect(projectSchema.safeParse({ ...validProject, created: "not-a-date" }).success).toBe(false);
	});

	it("rejects missing required fields", () => {
		expect(projectSchema.safeParse({}).success).toBe(false);
		expect(projectSchema.safeParse({ version: "1.0.0" }).success).toBe(false);
	});
});
