import type { Verification, VerificationResult } from "./entities/epic.js";
import type { DeferredItem } from "./entities/slice.js";
import type { ArchitectureDeltaInput } from "./records/architecture-delta.js";
import type { LearningInput } from "./records/learning.js";

// `ts` field is injected by the RPC layer on ALL events to keep the reducer pure (no Date.now() inside).
// See state-machine-api.md "Timestamp convention" for the documented pattern.
// Handlers use event.ts for activity log timestamps and for setting entity `updated` fields.
export type StateEvent =
	// Project
	| { type: "INIT_PROJECT"; name: string; ts: string }
	// Epic lifecycle (16 events)
	| { type: "CREATE_EPIC"; name: string; goal: string; ts: string }
	| { type: "BEGIN_EXPLORE"; epic: string; ts: string }
	| { type: "COMPLETE_EXPLORE"; epic: string; ts: string }
	| { type: "BEGIN_ARCHITECTURE"; epic: string; ts: string }
	| { type: "COMPLETE_ARCHITECTURE"; epic: string; ts: string }
	| { type: "BEGIN_REFINE_ARCHITECTURE"; epic: string; ts: string }
	| {
			type: "COMPLETE_REFINE_ARCHITECTURE";
			epic: string;
			ts: string;
			scores: Record<string, number>;
			override?: boolean;
	  }
	| { type: "BEGIN_SLICING"; epic: string; ts: string }
	| { type: "COMPLETE_SLICING"; epic: string; ts: string }
	| { type: "BEGIN_REFINE_SLICES"; epic: string; ts: string }
	| {
			type: "COMPLETE_REFINE_SLICES";
			epic: string;
			ts: string;
			scores: Record<string, number>;
			override?: boolean;
	  }
	| { type: "ACTIVATE_EPIC"; epic: string; ts: string }
	| {
			type: "COMPLETE_EPIC";
			epic: string;
			ts: string;
			verificationResults: VerificationResult[];
	  }
	| { type: "ABANDON_EPIC"; epic: string; ts: string; reason: string }
	| { type: "ADD_VERIFICATION"; epic: string; ts: string; verification: Verification }
	| {
			type: "UPDATE_VERIFICATION";
			epic: string;
			ts: string;
			index: number;
			verification: Verification;
	  }
	// Slice lifecycle
	| { type: "CREATE_SLICE"; name: string; epic: string; goal: string; ts: string }
	| { type: "BEGIN_PLAN"; slice: string; ts: string }
	| { type: "COMPLETE_PLAN"; slice: string; ts: string }
	| { type: "BEGIN_REFINEMENT"; slice: string; ts: string }
	| {
			type: "COMPLETE_REFINEMENT_ROUND";
			slice: string;
			ts: string;
			scores: Record<string, number>;
			override?: boolean;
	  }
	| { type: "BEGIN_IMPLEMENTATION"; slice: string; ts: string }
	| { type: "COMPLETE_IMPLEMENTATION"; slice: string; ts: string }
	| {
			type: "COMPLETE_SLICE";
			slice: string;
			ts: string;
			verificationPassed: boolean;
			deferred: DeferredItem[];
			learnings: LearningInput[];
			architectureDelta: ArchitectureDeltaInput[];
	  }
	| { type: "ABANDON_SLICE"; slice: string; ts: string; reason: string }
	// Quest lifecycle
	| { type: "CREATE_QUEST"; name: string; goal: string; ts: string }
	| { type: "BEGIN_QUEST_PLAN"; quest: string; ts: string }
	| { type: "COMPLETE_QUEST_PLAN"; quest: string; ts: string }
	| { type: "BEGIN_QUEST_REFINEMENT"; quest: string; ts: string }
	| {
			type: "COMPLETE_QUEST_REFINEMENT_ROUND";
			quest: string;
			ts: string;
			scores: Record<string, number>;
			override?: boolean;
	  }
	| { type: "BEGIN_QUEST_IMPLEMENTATION"; quest: string; ts: string }
	| { type: "COMPLETE_QUEST_IMPLEMENTATION"; quest: string; ts: string }
	| {
			type: "COMPLETE_QUEST";
			quest: string;
			ts: string;
			verificationPassed: boolean;
			learnings: LearningInput[];
			architectureDelta: ArchitectureDeltaInput[];
	  }
	| { type: "ABANDON_QUEST"; quest: string; ts: string; reason: string };

/** Error codes produced by state machine transitions. Single source of truth — also used by GoodplanErrorCode. */
export type StateErrorCode =
	| "STATE_ALREADY_INITIALIZED"
	| "STATE_INVALID_TRANSITION"
	| "STATE_EPIC_ALREADY_ACTIVE"
	| "STATE_MISSING_VERIFICATIONS"
	| "STATE_VERIFICATION_FAILED"
	| "STATE_SLICE_NOT_READY"
	| "STATE_CONTENT_MISSING"
	| "STATE_MAX_ROUNDS_REACHED"
	| "STATE_QUEST_ALREADY_ACTIVE";

export type StateError = {
	code: StateErrorCode;
	message: string;
	detail?: Record<string, unknown>;
};

// Note: This structural guard matches any object with string `code` + `message`.
// Safe today because ProjectState tree entries use a `type` discriminant ("json" | "jsonl" | "dir")
// that doesn't overlap. If the state tree ever gains entries with `code`/`message` fields,
// add a negative check (e.g., `!("type" in result)`) or a discriminant tag.
export function isStateError(result: unknown): result is StateError {
	if (
		typeof result !== "object" ||
		result === null ||
		!("code" in result) ||
		!("message" in result)
	) {
		return false;
	}
	const rec = result as Record<string, unknown>;
	return typeof rec.code === "string" && typeof rec.message === "string";
}
