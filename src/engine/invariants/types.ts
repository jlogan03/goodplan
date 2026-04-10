import type { DerivedStateData } from "../../schemas/entities/derived-state.js";
import type { AnyEventEnvelope, EventDomain } from "../../schemas/envelope.js";

export type InvariantRuleType =
	| "unique"
	| "count_limit"
	| "required"
	| "foreign_key"
	| "all_match"
	| "precondition"
	| "custom";

/**
 * Context passed to every invariant check function.
 * Extended in slice 03 with optional derivedState for richer checks.
 * Existing invariants continue to work unchanged (field is optional).
 */
export interface CheckContext {
	/** All prior events in this scope, unfiltered, in log order */
	allEvents: readonly AnyEventEnvelope[];
	/** Pre-indexed events by type for O(1) lookup: Map<event.type, events[]> */
	eventsByType: ReadonlyMap<string, readonly AnyEventEnvelope[]>;
	/** Pre-indexed events by scopeRef for O(1) entity-scoped lookups */
	eventsByScopeRef: ReadonlyMap<string, readonly AnyEventEnvelope[]>;
	/** Derived state computed from the same event array. Optional for backward compat. */
	derivedState?: DerivedStateData;
}

/**
 * Build a CheckContext from a raw event array.
 * Pre-indexes events by type and scopeRef for efficient rule evaluation.
 * Optionally injects derivedState (computed from the same events, zero additional I/O).
 */
export function buildCheckContext(
	priorEvents: AnyEventEnvelope[],
	derivedState?: DerivedStateData,
): CheckContext {
	const eventsByType = new Map<string, AnyEventEnvelope[]>();
	const eventsByScopeRef = new Map<string, AnyEventEnvelope[]>();
	for (const e of priorEvents) {
		// Index by type
		const byType = eventsByType.get(e.type);
		if (byType) {
			byType.push(e);
		} else {
			eventsByType.set(e.type, [e]);
		}
		// Index by scopeRef (skip null scopeRef)
		if (e.scopeRef != null) {
			const byRef = eventsByScopeRef.get(e.scopeRef);
			if (byRef) {
				byRef.push(e);
			} else {
				eventsByScopeRef.set(e.scopeRef, [e]);
			}
		}
	}
	return {
		allEvents: priorEvents,
		eventsByType,
		eventsByScopeRef,
		...(derivedState !== undefined ? { derivedState } : {}),
	};
}

/**
 * Type for a function that provides a CheckContext on demand.
 * NOTE: The canonical GetCheckContext with eventsPath parameter is defined in
 * create-before-append-hook.ts. This simpler form is for test convenience only.
 */

export interface InvariantRule {
	/** Unique rule ID, e.g. "epic.single-active-per-branch" */
	id: string;
	/**
	 * Classification of the rule.
	 * Named `ruleType` (not `type`) to avoid collision with the JS `type` keyword
	 * and the `type` field on event envelopes. This is an intentional deviation
	 * from the architecture doc's `type` field name.
	 */
	ruleType: InvariantRuleType;
	/** Human-readable description of what this rule enforces */
	description: string;
	/**
	 * Which event domains this rule applies to.
	 * Empty array means "applies to all domains". To restrict, list specific domains.
	 * Must include ALL domains whose events may trigger this rule, not just
	 * the rule's "logical" domain. For example, entity-lifecycle rules that
	 * need to fire on pressure-test domain events must list both domains.
	 */
	appliesTo: EventDomain[];
	/**
	 * Check the invariant. Returns null if the invariant holds,
	 * or a structured violation with message and optional context if it fails.
	 * Pure synchronous function -- no I/O.
	 */
	check(event: AnyEventEnvelope, ctx: CheckContext): InvariantViolationData | null;
}

/** Structured violation data returned by rule check functions */
export interface InvariantViolationData {
	message: string;
	/** Optional structured context for debugging/reporting */
	context?: Record<string, unknown>;
}

export interface InvariantViolation {
	ruleId: string;
	message: string;
	/**
	 * Optional structured context. Note: when copying from InvariantViolationData,
	 * use conditional spread to satisfy exactOptionalPropertyTypes:
	 * `...(data.context !== undefined ? { context: data.context } : {})`
	 */
	context?: Record<string, unknown>;
}

export type InvariantCheckResult =
	| { passed: true }
	| { passed: false; violations: InvariantViolation[] };

/**
 * Error class for invariant violations.
 * Thrown when invariant checks fail during event append.
 */
export class InvariantError extends Error {
	readonly violations: InvariantViolation[];

	constructor(violations: InvariantViolation[]) {
		const summary = violations.map((v) => `[${v.ruleId}] ${v.message}`).join("; ");
		super(`Invariant violation: ${summary}`);
		this.name = "InvariantError";
		this.violations = violations;
	}
}
