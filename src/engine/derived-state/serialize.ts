import type { DerivedStateData } from "../../schemas/entities/derived-state.js";
import type { DeepReadonly } from "../../util/types.js";

/**
 * Serialized form of DerivedStateData where all Maps are converted to Records.
 * Used for JSON output (e.g., --json flag).
 */
export interface SerializedDerivedState {
	project: {
		name: string;
		version: string;
		steeringPreference: string;
		initialized: boolean;
	};
	epics: Record<string, unknown>;
	sideQuests: Record<string, unknown>;
	convergenceSnapshots: Record<string, unknown>;
	latestDimensionScores: Record<string, unknown>;
}

/**
 * Recursive Map-to-Record walker for serializing DerivedStateData.
 *
 * Type-narrowing rules:
 * 1. instanceof Map -> Object.fromEntries(), recursing into each value
 * 2. Array.isArray(x) -> recurse element-wise
 * 3. Plain objects (Object.getPrototypeOf(x) === Object.prototype) -> recursive descent
 * 4. Everything else (primitives, Dates, class instances) -> pass through
 */
export function serializeDerivedState(
	state: DeepReadonly<DerivedStateData>,
): SerializedDerivedState {
	return deepSerialize(state) as SerializedDerivedState;
}

function deepSerialize(value: unknown): unknown {
	if (value === null || value === undefined) {
		return value;
	}

	if (value instanceof Map) {
		const entries: Array<[string, unknown]> = [];
		for (const [k, v] of value) {
			entries.push([String(k), deepSerialize(v)]);
		}
		return Object.fromEntries(entries);
	}

	if (Array.isArray(value)) {
		return value.map((item) => deepSerialize(item));
	}

	if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			result[k] = deepSerialize(v);
		}
		return result;
	}

	// Primitives, Dates, class instances: pass through
	return value;
}
