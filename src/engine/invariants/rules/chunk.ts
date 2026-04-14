import { z } from "zod";
import type { InvariantRule } from "../types.js";
import { narrowPayload } from "./_helpers.js";

// Shared payload schema for chunk events with sliceRef + chunkId scoping
const ChunkRefPayload = z.object({
	sliceRef: z.string().min(1),
	chunkId: z.string().min(1),
});

// Payload schema for chunk-verified events
const ChunkVerifiedPayload = z.object({
	sliceRef: z.string().min(1),
	chunkId: z.string().min(1),
	evidence: z.string().optional(),
	observation: z.string().optional(),
});

/**
 * chunk.evidence-non-empty: When a chunk is verified, the payload must
 * contain a non-empty `evidence` or `observation` field.
 */
export const chunkEvidenceNonEmpty: InvariantRule = {
	id: "chunk.evidence-non-empty",
	ruleType: "required",
	description: "Chunk verification must include non-empty evidence or observation",
	appliesTo: ["spine"],
	check(event, _ctx) {
		if (event.type !== "chunk-verified") return null;

		const payload = narrowPayload(event.payload, ChunkVerifiedPayload);
		if (payload === null) return null;

		const hasEvidence = payload.evidence !== undefined && payload.evidence.trim().length > 0;
		const hasObservation =
			payload.observation !== undefined && payload.observation.trim().length > 0;

		if (!hasEvidence && !hasObservation) {
			return {
				message: "Chunk verification must include non-empty evidence or observation.",
			};
		}
		return null;
	},
};

/**
 * chunk.red-test-failed-before-green: A green achievement requires a prior
 * red test failure for the same (sliceRef, chunkId) pair (RED/GREEN cycle).
 *
 * Scoping: filters event history by both sliceRef AND chunkId — a red-fail
 * on chunk-A must NOT satisfy the invariant for chunk-B's green.
 */
export const chunkRedTestFailedBeforeGreen: InvariantRule = {
	id: "chunk.red-test-failed-before-green",
	ruleType: "precondition",
	description: "Red test must fail before green can be achieved for a chunk",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "chunk-green-achieved") return null;

		const payload = narrowPayload(event.payload, ChunkRefPayload);
		if (payload === null) return null;

		const redEvents = ctx.eventsByType.get("chunk-red-test-failed");
		if (redEvents) {
			for (const e of redEvents) {
				const redPayload = narrowPayload(e.payload, ChunkRefPayload);
				if (
					redPayload !== null &&
					redPayload.sliceRef === payload.sliceRef &&
					redPayload.chunkId === payload.chunkId
				) {
					return null;
				}
			}
		}

		return {
			message: `Cannot mark green achieved for chunk "${payload.chunkId}" in slice "${payload.sliceRef}" without a prior red test failure.`,
			context: { sliceRef: payload.sliceRef, chunkId: payload.chunkId },
		};
	},
};
