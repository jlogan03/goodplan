import type { AnyEventEnvelope } from "../../../../src/schemas/envelope.js";
import { AnyEventEnvelopeSchema } from "../../../../src/schemas/envelope.js";

/**
 * Build a well-typed test envelope from an overrides bag.
 * Uses AnyEventEnvelopeSchema.parse() for runtime validation,
 * respecting exactOptionalPropertyTypes (no Partial<AnyEventEnvelope>).
 */
export function makeEnvelope(overrides: Record<string, unknown>): AnyEventEnvelope {
	return AnyEventEnvelopeSchema.parse({
		id: crypto.randomUUID(),
		schemaVersion: 1,
		ts: new Date().toISOString(),
		scope: "project",
		scopeRef: null,
		actor: { kind: "cli", id: "test" },
		branch: "main",
		commitHint: null,
		domain: "entity-lifecycle",
		type: "project-initialized",
		payload: {},
		prevId: null,
		...overrides,
	});
}
