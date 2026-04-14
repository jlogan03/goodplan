import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import { checkInvariants } from "./checker.js";
import type { InvariantRegistry } from "./registry.js";
import type { CheckContext } from "./types.js";
import { InvariantError } from "./types.js";

/**
 * Factory function that retrieves the CheckContext for a given events file.
 * Injected to decouple the hook from the concrete replay implementation,
 * making it testable without real files.
 */
export type GetCheckContext = (eventsPath: string) => Promise<CheckContext>;

export interface CreateBeforeAppendHookOptions {
	/** Path to the events.jsonl file for this scope */
	eventsPath: string;
	/** The invariant registry with all rules to check */
	registry: InvariantRegistry;
	/**
	 * Injected context factory. In production, wraps replayEvents + buildCheckContext.
	 * In tests, can return a pre-built CheckContext without touching the filesystem.
	 */
	getContext: GetCheckContext;
}

/**
 * Creates a beforeAppend hook function that:
 * 1. Retrieves the CheckContext via the injected factory
 * 2. Runs all applicable invariants
 * 3. Throws InvariantError if any violations found
 *
 * This is the concrete implementation of the beforeAppend
 * extension point defined in slice 01's AppendEventOptions.
 */
export function createBeforeAppendHook(
	opts: CreateBeforeAppendHookOptions,
): (envelope: AnyEventEnvelope) => Promise<void> {
	return async (envelope: AnyEventEnvelope): Promise<void> => {
		// Get check context (replayed events + type index)
		const ctx = await opts.getContext(opts.eventsPath);

		// Get rules applicable to this event's domain
		const rules = opts.registry.getByDomain(envelope.domain);

		// Run all invariant checks
		const result = checkInvariants(envelope, ctx, rules);

		if (!result.passed) {
			throw new InvariantError(result.violations);
		}
	};
}
