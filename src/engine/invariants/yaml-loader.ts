import type { EventDomain } from "../../schemas/envelope.js";
import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import type { CheckContext, InvariantRule, InvariantRuleType } from "./types.js";

/**
 * Declarative check definition -- a discriminated union of supported check types.
 * No arbitrary code execution. Each variant is type-safe, portable, and auditable.
 */
export type YamlCheckDef =
	| {
			/** Count events matching a given type and compare against a threshold */
			checkType: "event-count";
			eventType: string;
			comparison: "eq" | "lt" | "lte" | "gt" | "gte";
			value: number;
	  }
	| {
			/** Check that a specific field exists in the event payload */
			checkType: "field-exists";
			field: string;
	  }
	| {
			/** Check that a payload field matches an expected value */
			checkType: "field-matches";
			field: string;
			expected: string | number | boolean;
	  };

export interface YamlInvariantDef {
	id: string;
	description: string;
	ruleType: InvariantRuleType;
	appliesTo: EventDomain[];
	/** Declarative check specification -- no arbitrary code */
	check: YamlCheckDef;
}

const VALID_CHECK_TYPES = new Set(["event-count", "field-exists", "field-matches"]);
const VALID_COMPARISONS = new Set(["eq", "lt", "lte", "gt", "gte"]);

/**
 * Parse extensible invariants from .goodplan/invariants.md YAML block.
 * Expects a fenced code block with language tag `yaml` containing an array of invariant defs.
 * Returns parsed definitions (not yet registered -- caller filters by
 * activation status from the event log before registering).
 */
export function parseInvariantDefinitions(markdownContent: string): YamlInvariantDef[] {
	// Extract YAML from fenced code block
	const yamlMatch = markdownContent.match(/```yaml\s*\n([\s\S]*?)```/);
	if (!yamlMatch) {
		return [];
	}

	const yamlContent = yamlMatch[1];
	if (yamlContent === undefined) {
		return [];
	}

	// Simple YAML array parser for our structured format
	const definitions: YamlInvariantDef[] = [];
	const items = splitYamlArrayItems(yamlContent);

	for (const item of items) {
		const def = parseYamlItem(item);
		if (def !== null) {
			definitions.push(def);
		}
	}

	return definitions;
}

/**
 * Filter definitions to only those currently active, by scanning for
 * invariant-activated / invariant-deactivated events in the event log.
 * An invariant is active if its last activation/deactivation event is "invariant-activated",
 * or if it has never been deactivated (default active).
 */
export function filterActiveInvariants(
	definitions: YamlInvariantDef[],
	events: readonly AnyEventEnvelope[],
): YamlInvariantDef[] {
	// Build a map of last activation state per invariant ID
	const lastState = new Map<string, boolean>();

	for (const e of events) {
		if (e.type === "invariant-activated" || e.type === "invariant-deactivated") {
			if (typeof e.payload === "object" && e.payload !== null) {
				const payload = e.payload as Record<string, unknown>;
				const invariantId = payload.invariantId;
				if (typeof invariantId === "string") {
					lastState.set(invariantId, e.type === "invariant-activated");
				}
			}
		}
	}

	return definitions.filter((def) => {
		const state = lastState.get(def.id);
		// Default: active (not explicitly deactivated)
		return state !== false;
	});
}

/**
 * Convert a YamlInvariantDef into an InvariantRule by constructing a pure
 * check function from the declarative spec. No eval() or new Function().
 */
export function buildYamlInvariantRule(def: YamlInvariantDef): InvariantRule {
	const { id, description, ruleType, appliesTo, check } = def;
	return {
		id,
		ruleType,
		description,
		appliesTo,
		check: buildCheckFunction(check, description),
	};
}

function buildCheckFunction(spec: YamlCheckDef, description: string): InvariantRule["check"] {
	switch (spec.checkType) {
		case "event-count": {
			const { eventType, comparison, value } = spec;
			return (_event: AnyEventEnvelope, ctx: CheckContext) => {
				const events = ctx.eventsByType.get(eventType);
				const count = events?.length ?? 0;
				const passed =
					comparison === "eq"
						? count === value
						: comparison === "lt"
							? count < value
							: comparison === "lte"
								? count <= value
								: comparison === "gt"
									? count > value
									: count >= value; // gte
				return passed
					? null
					: {
							message: `${description}: expected ${eventType} count ${comparison} ${value}, got ${count}`,
						};
			};
		}
		case "field-exists": {
			const { field } = spec;
			return (event: AnyEventEnvelope, _ctx: CheckContext) => {
				const payload = event.payload;
				if (typeof payload === "object" && payload !== null && field in payload) {
					return null;
				}
				return {
					message: `${description}: missing required field "${field}" in payload`,
				};
			};
		}
		case "field-matches": {
			const { field, expected } = spec;
			return (event: AnyEventEnvelope, _ctx: CheckContext) => {
				const payload = event.payload;
				if (typeof payload !== "object" || payload === null) {
					return {
						message: `${description}: expected ${field} = ${String(expected)}, got undefined`,
					};
				}
				const actual = (payload as Record<string, unknown>)[field];
				return actual === expected
					? null
					: {
							message: `${description}: expected ${field} = ${String(expected)}, got ${String(actual)}`,
						};
			};
		}
	}
}

// --- Simple YAML parsing helpers ---

/** Split a YAML array (lines starting with "- ") into individual item blocks */
function splitYamlArrayItems(yamlContent: string): string[] {
	const items: string[] = [];
	let current: string[] = [];

	for (const line of yamlContent.split("\n")) {
		if (line.startsWith("- ")) {
			if (current.length > 0) {
				items.push(current.join("\n"));
			}
			// Remove the leading "- " for the first line of the item
			current = [line.slice(2)];
		} else if (line.startsWith("  ") && current.length > 0) {
			// Continuation line (indented under the array item)
			current.push(line.slice(2));
		}
	}
	if (current.length > 0) {
		items.push(current.join("\n"));
	}

	return items;
}

/** Parse a single YAML item block into a YamlInvariantDef, or null if malformed */
function parseYamlItem(itemYaml: string): YamlInvariantDef | null {
	const fields = parseYamlFields(itemYaml);

	const id = fields.get("id");
	const description = fields.get("description");
	const ruleType = fields.get("ruleType");
	const appliesToRaw = fields.get("appliesTo");
	const checkTypeRaw = fields.get("checkType");

	if (!id || !description || !ruleType || !checkTypeRaw) {
		return null;
	}

	if (!VALID_CHECK_TYPES.has(checkTypeRaw)) {
		return null;
	}

	// Parse appliesTo as a YAML inline array: [a, b, c]
	const appliesTo = parseYamlInlineArray(appliesToRaw ?? "[]") as EventDomain[];

	const check = parseCheckDef(checkTypeRaw, fields);
	if (check === null) {
		return null;
	}

	return { id, description, ruleType: ruleType as InvariantRuleType, appliesTo, check };
}

/** Parse a check definition from fields based on checkType */
function parseCheckDef(checkType: string, fields: Map<string, string>): YamlCheckDef | null {
	switch (checkType) {
		case "event-count": {
			const eventType = fields.get("eventType");
			const comparison = fields.get("comparison");
			const valueStr = fields.get("value");
			if (!eventType || !comparison || !valueStr) return null;
			if (!VALID_COMPARISONS.has(comparison)) return null;
			const value = Number(valueStr);
			if (Number.isNaN(value)) return null;
			return {
				checkType: "event-count",
				eventType,
				comparison: comparison as "eq" | "lt" | "lte" | "gt" | "gte",
				value,
			};
		}
		case "field-exists": {
			const field = fields.get("field");
			if (!field) return null;
			return { checkType: "field-exists", field };
		}
		case "field-matches": {
			const field = fields.get("field");
			const expectedRaw = fields.get("expected");
			if (!field || expectedRaw === undefined) return null;
			const expected = parseYamlValue(expectedRaw);
			return { checkType: "field-matches", field, expected };
		}
		default:
			return null;
	}
}

/** Parse simple YAML key: value fields from a block of text */
function parseYamlFields(text: string): Map<string, string> {
	const fields = new Map<string, string>();
	for (const line of text.split("\n")) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;
		const key = line.slice(0, colonIdx).trim();
		const value = line.slice(colonIdx + 1).trim();
		if (key && value) {
			fields.set(key, value);
		}
	}
	return fields;
}

/** Parse a YAML inline array like [a, b, c] */
function parseYamlInlineArray(raw: string): string[] {
	const trimmed = raw.trim();
	if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
		return [];
	}
	const inner = trimmed.slice(1, -1).trim();
	if (inner === "") return [];
	return inner
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s !== "");
}

/** Parse a YAML scalar value (string, number, boolean) */
function parseYamlValue(raw: string): string | number | boolean {
	if (raw === "true") return true;
	if (raw === "false") return false;
	const num = Number(raw);
	if (!Number.isNaN(num) && raw !== "") return num;
	// Strip quotes if present
	if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
		return raw.slice(1, -1);
	}
	return raw;
}
