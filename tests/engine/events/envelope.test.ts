import { describe, expect, it } from "vitest";
import { AnyEventEnvelopeSchema, ContentRefSchema } from "../../../src/schemas/envelope.js";

function validEnvelope() {
	return {
		id: "550e8400-e29b-41d4-a716-446655440000",
		schemaVersion: 1,
		ts: "2026-04-09T12:00:00.000Z",
		scope: "project" as const,
		scopeRef: null,
		actor: { kind: "cli" as const, id: "gp:create-epic" },
		branch: "main",
		commitHint: null,
		domain: "entity-lifecycle" as const,
		type: "epic-created",
		payload: { name: "test" },
		prevId: null,
	};
}

describe("AnyEventEnvelopeSchema", () => {
	it("parses a valid envelope", () => {
		const envelope = validEnvelope();
		const result = AnyEventEnvelopeSchema.parse(envelope);
		expect(result.id).toBe(envelope.id);
		expect(result.ts).toBe(envelope.ts);
		expect(result.scope).toBe(envelope.scope);
		expect(result.domain).toBe(envelope.domain);
		expect(result.type).toBe(envelope.type);
	});

	it("rejects invalid UUID for id", () => {
		const envelope = { ...validEnvelope(), id: "not-a-uuid" };
		expect(() => AnyEventEnvelopeSchema.parse(envelope)).toThrow();
	});

	it("rejects invalid timestamp", () => {
		const envelope = { ...validEnvelope(), ts: "2024-01-01" };
		expect(() => AnyEventEnvelopeSchema.parse(envelope)).toThrow();
	});

	it("rejects invalid scope", () => {
		const envelope = { ...validEnvelope(), scope: "unknown" };
		expect(() => AnyEventEnvelopeSchema.parse(envelope)).toThrow();
	});

	it("rejects invalid actor kind", () => {
		const envelope = {
			...validEnvelope(),
			actor: { kind: "bot", id: "test" },
		};
		expect(() => AnyEventEnvelopeSchema.parse(envelope)).toThrow();
	});

	it("rejects invalid domain", () => {
		const envelope = { ...validEnvelope(), domain: "unknown-domain" };
		expect(() => AnyEventEnvelopeSchema.parse(envelope)).toThrow();
	});

	it("rejects missing type", () => {
		const { type: _, ...rest } = validEnvelope();
		expect(() => AnyEventEnvelopeSchema.parse(rest)).toThrow();
	});

	it("rejects missing prevId key", () => {
		const { prevId: _, ...rest } = validEnvelope();
		expect(() => AnyEventEnvelopeSchema.parse(rest)).toThrow();
	});

	it("accepts null prevId", () => {
		const envelope = validEnvelope();
		const result = AnyEventEnvelopeSchema.parse(envelope);
		expect(result.prevId).toBeNull();
	});

	it("accepts valid UUID prevId", () => {
		const envelope = {
			...validEnvelope(),
			prevId: "660e8400-e29b-41d4-a716-446655440001",
		};
		const result = AnyEventEnvelopeSchema.parse(envelope);
		expect(result.prevId).toBe("660e8400-e29b-41d4-a716-446655440001");
	});
});

describe("ContentRefSchema", () => {
	it("parses a valid content ref", () => {
		const ref = {
			sha: "a".repeat(40),
			size: 1024,
			path: ".goodplan/artifacts/test.md",
			mediaType: "text/markdown",
		};
		const result = ContentRefSchema.parse(ref);
		expect(result.sha).toBe(ref.sha);
		expect(result.size).toBe(ref.size);
	});

	it("rejects SHA that is too short", () => {
		const ref = {
			sha: "abc123",
			size: 1024,
			path: "test.md",
			mediaType: "text/markdown",
		};
		expect(() => ContentRefSchema.parse(ref)).toThrow();
	});

	it("rejects SHA with non-hex characters", () => {
		const ref = {
			sha: "g".repeat(40),
			size: 1024,
			path: "test.md",
			mediaType: "text/markdown",
		};
		expect(() => ContentRefSchema.parse(ref)).toThrow();
	});

	it("rejects negative size", () => {
		const ref = {
			sha: "a".repeat(40),
			size: -1,
			path: "test.md",
			mediaType: "text/markdown",
		};
		expect(() => ContentRefSchema.parse(ref)).toThrow();
	});

	it("rejects empty path", () => {
		const ref = {
			sha: "a".repeat(40),
			size: 1024,
			path: "",
			mediaType: "text/markdown",
		};
		expect(() => ContentRefSchema.parse(ref)).toThrow();
	});
});
