/**
 * Unit tests for computeNextCommands and the derived commandMappings registry.
 */
import { describe, expect, it } from "vitest";
import { computeNextCommands } from "../../../src/core/rpc/next-commands.js";

describe("computeNextCommands", () => {
	it("returns entity commands for epic in 'created' status including explore", () => {
		const result = computeNextCommands({ type: "epic", name: "test-epic" }, "created");

		expect(result.entity.length).toBeGreaterThan(0);
		const commands = result.entity.map((c) => c.command);
		expect(commands).toContain("gp epic:explore --epic test-epic");

		// Other section should include quest:create and task:create but NOT epic:create
		const otherCommands = result.other.map((c) => c.command);
		expect(otherCommands).toContain("gp quest:create");
		expect(otherCommands).toContain("gp task:create");
		expect(otherCommands).not.toContain("gp epic:create");
	});

	it("returns entity commands for slice with interpolated --epic", () => {
		const result = computeNextCommands(
			{ type: "slice", name: "my-slice", epic: "my-epic" },
			"plan-created",
		);

		expect(result.entity.length).toBeGreaterThan(0);
		const commands = result.entity.map((c) => c.command);
		// Slice commands should include refine-plan for plan-created status
		expect(commands).toContain("gp slice:refine-plan --slice my-slice");

		// Other section should include epic:create but NOT slice:create
		const otherCommands = result.other.map((c) => c.command);
		expect(otherCommands).toContain("gp epic:create");
		expect(otherCommands).not.toContain("gp slice:create");
	});

	it("returns show-only entity and empty other for terminal status 'completed'", () => {
		const result = computeNextCommands({ type: "epic", name: "done-epic" }, "completed");

		// Entity section should have only the show command
		expect(result.entity.length).toBe(1);
		expect(result.entity[0]?.command).toBe("gp epic:show --epic done-epic");

		// Other section should be empty for terminal statuses
		expect(result.other).toEqual([]);
	});

	it("returns empty arrays for unknown status with valid entity type", () => {
		const result = computeNextCommands({ type: "epic", name: "x" }, "nonexistent-status");

		// Unknown status = graceful degradation, empty result
		expect(result).toEqual({ entity: [], other: [] });
	});

	it("includes submit command for non-terminal same-status transitions (e.g., refining)", () => {
		const result = computeNextCommands({ type: "slice", name: "s1", epic: "e1" }, "refining");

		const commands = result.entity.map((c) => c.command);
		// When in "refining" status, the abandon command should be available
		expect(commands).toContain("gp slice:abandon --slice s1 --reason <reason>");
	});

	it("epic:activate edge case — activated status shows post-activation commands only", () => {
		const result = computeNextCommands({ type: "epic", name: "test" }, "activated");

		const commands = result.entity.map((c) => c.command);
		// After activation, should have complete/abandon but NOT pre-activation commands
		expect(commands).toContain("gp epic:complete --epic test");
		expect(commands).not.toContain("gp epic:define-architecture --epic test");
		expect(commands).not.toContain("gp epic:explore --epic test");
	});

	it("handles task entity type correctly", () => {
		const result = computeNextCommands({ type: "task", name: "my-task" }, "open");

		const commands = result.entity.map((c) => c.command);
		expect(commands).toContain("gp task:drop --task my-task --reason <reason>");
		expect(commands).toContain("gp task:convert --task my-task --to <quest|epic>");
		expect(commands).toContain("gp task:show --task my-task");
	});

	it("handles decision entity type correctly", () => {
		const result = computeNextCommands({ type: "decision", id: "DEC-001" }, "active");

		const commands = result.entity.map((c) => c.command);
		expect(commands).toContain("gp decision:update --id DEC-001");
		expect(commands).toContain("gp decision:show --id DEC-001");
	});

	it("returns empty for project target type", () => {
		const result = computeNextCommands({ type: "project" }, "initialized");
		expect(result).toEqual({ entity: [], other: [] });
	});

	it("abandoned task has only show command and no other section", () => {
		const result = computeNextCommands({ type: "task", name: "t1" }, "dropped");

		expect(result.entity.length).toBe(1);
		expect(result.entity[0]?.command).toBe("gp task:show --task t1");
		expect(result.other).toEqual([]);
	});

	it("epic verification commands available in pre-activated statuses", () => {
		const result = computeNextCommands({ type: "epic", name: "e1" }, "exploring");

		const commands = result.entity.map((c) => c.command);
		expect(commands).toContain("gp epic:add-verification --epic e1");
		expect(commands).toContain("gp epic:update-verification --epic e1 --index <index>");
	});

	it("epic verification commands NOT available post-activation", () => {
		const result = computeNextCommands({ type: "epic", name: "e1" }, "activated");

		const commands = result.entity.map((c) => c.command);
		expect(commands).not.toContain("gp epic:add-verification --epic e1");
	});

	it("other section excludes own entity type creation command after activation", () => {
		const result = computeNextCommands({ type: "epic", name: "e1" }, "activated");

		const otherCommands = result.other.map((c) => c.command);
		// Other section excludes epic:create (same entity type) but includes quest/task creation
		expect(otherCommands).not.toContain("gp epic:create");
		expect(otherCommands).toContain("gp quest:create");
		expect(otherCommands).toContain("gp task:create");
	});

	it("other section is sorted alphabetically", () => {
		const result = computeNextCommands({ type: "slice", name: "s", epic: "e" }, "created");

		const otherCommands = result.other.map((c) => c.command);
		const sorted = [...otherCommands].sort();
		expect(otherCommands).toEqual(sorted);
	});
});
