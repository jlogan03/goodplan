import { describe, expect, it } from "vitest";
import { isStateError } from "../../../src/schemas/state-events.js";
import type { StateError, StateEvent } from "../../../src/schemas/state-events.js";

describe("StateEvent", () => {
	it("INIT_PROJECT event is structurally valid", () => {
		const event: StateEvent = { type: "INIT_PROJECT", name: "my-project" };
		expect(event.type).toBe("INIT_PROJECT");
		expect(event.name).toBe("my-project");
	});
});

describe("isStateError", () => {
	it("returns true for a valid StateError", () => {
		const err: StateError = {
			code: "STATE_INVALID_TRANSITION",
			message: "Cannot transition from created",
		};
		expect(isStateError(err)).toBe(true);
	});

	it("returns true for StateError with detail", () => {
		const err: StateError = {
			code: "STATE_ALREADY_INITIALIZED",
			message: "Project already exists",
			detail: { existing: "my-project" },
		};
		expect(isStateError(err)).toBe(true);
	});

	it("returns false for null", () => {
		expect(isStateError(null)).toBe(false);
	});

	it("returns false for undefined", () => {
		expect(isStateError(undefined)).toBe(false);
	});

	it("returns false for a string", () => {
		expect(isStateError("error")).toBe(false);
	});

	it("returns false for an object without code", () => {
		expect(isStateError({ message: "no code" })).toBe(false);
	});

	it("returns false for an object with non-string code", () => {
		expect(isStateError({ code: 123, message: "numeric code" })).toBe(false);
	});

	it("returns false for a ProjectState-like directory object", () => {
		// Ensure we don't confuse a tree node with an error
		expect(isStateError({ type: "directory", contents: {} })).toBe(false);
	});
});
