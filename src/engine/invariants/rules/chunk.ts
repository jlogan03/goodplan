import { z } from "zod";
import type { InvariantRule } from "../types.js";
import { narrowPayload } from "./_helpers.js";

// Payload schema for chunk-verified events
const ChunkVerifiedPayload = z.object({
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

// Payload schema for chunk-green-test-passed events
const ChunkGreenPayload = z.object({
	chunkId: z.string().min(1),
});

/**
 * chunk.red-test-failed-before-green: A green test pass requires a prior
 * red test failure for the same chunk (RED/GREEN cycle).
 */
export const chunkRedTestFailedBeforeGreen: InvariantRule = {
	id: "chunk.red-test-failed-before-green",
	ruleType: "precondition",
	description: "Red test must fail before green test can pass for a chunk",
	appliesTo: ["spine"],
	check(event, ctx) {
		if (event.type !== "chunk-green-test-passed") return null;

		const payload = narrowPayload(event.payload, ChunkGreenPayload);
		if (payload === null) return null;

		const redEvents = ctx.eventsByType.get("chunk-red-test-failed");
		if (redEvents) {
			for (const e of redEvents) {
				const redPayload = narrowPayload(e.payload, ChunkGreenPayload);
				if (redPayload !== null && redPayload.chunkId === payload.chunkId) {
					return null;
				}
			}
		}

		return {
			message: `Cannot mark green test passed for chunk "${payload.chunkId}" without a prior red test failure.`,
			context: { chunkId: payload.chunkId },
		};
	},
};
