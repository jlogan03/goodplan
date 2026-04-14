import { buildContextBundle } from "../../context/index.js";
import type { ContextBundle } from "../../context/types.js";
import { readContentRef } from "../../engine/content/resolve.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import type { Phase } from "../../schemas/entities/derived-state.js";
import type { AnyEventEnvelope } from "../../schemas/envelope.js";

/**
 * Build a context bundle for an epic command's JSON output.
 *
 * Computes derived state from events, then assembles the context bundle
 * for the given phase and scope. The bundle provides inline content and
 * reference paths that skills need for their prompts.
 *
 * @param events - The replayed event list (from appendEvent result or replayEvents)
 * @param phase - The phase to build context for
 * @param epicName - The epic name (used as scopeRef)
 * @returns The assembled ContextBundle, or undefined if bundle construction fails
 */
export function buildEpicContextBundle(
	events: AnyEventEnvelope[],
	phase: Phase,
	epicName: string,
): ContextBundle | undefined {
	try {
		const state = computeDerivedState(events);
		return buildContextBundle(state, phase, epicName, readContentRef);
	} catch {
		// Context bundle is advisory — failures should not block the command
		return undefined;
	}
}
