import { describe, expect, it } from "vitest";
import {
	chunkEvidenceNonEmpty,
	chunkRedTestFailedBeforeGreen,
} from "../../../../src/engine/invariants/rules/chunk.js";
import { buildCheckContext } from "../../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./_test-helpers.js";

describe("chunk.evidence-non-empty", () => {
	it("passes when evidence is non-empty", () => {
		const event = makeEnvelope({
			type: "chunk-verified",
			domain: "spine",
			payload: { evidence: "Tests pass with 100% coverage" },
		});
		const ctx = buildCheckContext([]);
		expect(chunkEvidenceNonEmpty.check(event, ctx)).toBeNull();
	});

	it("passes when observation is non-empty", () => {
		const event = makeEnvelope({
			type: "chunk-verified",
			domain: "spine",
			payload: { observation: "Manually confirmed working" },
		});
		const ctx = buildCheckContext([]);
		expect(chunkEvidenceNonEmpty.check(event, ctx)).toBeNull();
	});

	it("fails when both evidence and observation are empty", () => {
		const event = makeEnvelope({
			type: "chunk-verified",
			domain: "spine",
			payload: { evidence: "", observation: "" },
		});
		const ctx = buildCheckContext([]);
		const result = chunkEvidenceNonEmpty.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("evidence");
	});

	it("fails when both are whitespace-only", () => {
		const event = makeEnvelope({
			type: "chunk-verified",
			domain: "spine",
			payload: { evidence: "   ", observation: "  " },
		});
		const ctx = buildCheckContext([]);
		expect(chunkEvidenceNonEmpty.check(event, ctx)).not.toBeNull();
	});

	it("fails when both fields are missing", () => {
		const event = makeEnvelope({
			type: "chunk-verified",
			domain: "spine",
			payload: {},
		});
		const ctx = buildCheckContext([]);
		expect(chunkEvidenceNonEmpty.check(event, ctx)).not.toBeNull();
	});

	it("ignores non-chunk-verified events", () => {
		const event = makeEnvelope({ type: "epic-created", domain: "entity-lifecycle" });
		const ctx = buildCheckContext([]);
		expect(chunkEvidenceNonEmpty.check(event, ctx)).toBeNull();
	});

	it("has correct metadata", () => {
		expect(chunkEvidenceNonEmpty.id).toBe("chunk.evidence-non-empty");
		expect(chunkEvidenceNonEmpty.ruleType).toBe("required");
		expect(chunkEvidenceNonEmpty.appliesTo).toContain("spine");
	});
});

describe("chunk.red-test-failed-before-green", () => {
	it("passes when red test exists for the same chunk", () => {
		const red = makeEnvelope({
			type: "chunk-red-test-failed",
			domain: "spine",
			payload: { chunkId: "chunk-1" },
		});
		const green = makeEnvelope({
			type: "chunk-green-test-passed",
			domain: "spine",
			payload: { chunkId: "chunk-1" },
		});
		const ctx = buildCheckContext([red]);
		expect(chunkRedTestFailedBeforeGreen.check(green, ctx)).toBeNull();
	});

	it("fails when no red test exists for the chunk", () => {
		const green = makeEnvelope({
			type: "chunk-green-test-passed",
			domain: "spine",
			payload: { chunkId: "chunk-1" },
		});
		const ctx = buildCheckContext([]);
		const result = chunkRedTestFailedBeforeGreen.check(green, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("chunk-1");
	});

	it("fails when red test exists for a different chunk", () => {
		const red = makeEnvelope({
			type: "chunk-red-test-failed",
			domain: "spine",
			payload: { chunkId: "chunk-2" },
		});
		const green = makeEnvelope({
			type: "chunk-green-test-passed",
			domain: "spine",
			payload: { chunkId: "chunk-1" },
		});
		const ctx = buildCheckContext([red]);
		const result = chunkRedTestFailedBeforeGreen.check(green, ctx);
		expect(result).not.toBeNull();
	});

	it("ignores non-green-test events", () => {
		const event = makeEnvelope({ type: "chunk-verified", domain: "spine" });
		const ctx = buildCheckContext([]);
		expect(chunkRedTestFailedBeforeGreen.check(event, ctx)).toBeNull();
	});

	it("has correct metadata", () => {
		expect(chunkRedTestFailedBeforeGreen.id).toBe("chunk.red-test-failed-before-green");
		expect(chunkRedTestFailedBeforeGreen.ruleType).toBe("precondition");
		expect(chunkRedTestFailedBeforeGreen.appliesTo).toContain("spine");
	});
});
