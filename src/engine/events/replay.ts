import * as fs from "node:fs";
import type { AnyEventEnvelope, EventDomain } from "../../schemas/envelope.js";
import { AnyEventEnvelopeSchema } from "../../schemas/envelope.js";

/**
 * Filter options for replaying events.
 *
 * All conditions are ANDed. All properties are optional.
 *
 * **`exactOptionalPropertyTypes` note:** When constructing `ReplayFilter`
 * dynamically, use conditional spread to avoid passing `undefined` explicitly:
 * ```ts
 * const filter: ReplayFilter = {
 *   ...(domain !== undefined ? { domain } : {}),
 *   ...(since !== undefined ? { since } : {}),
 * };
 * ```
 *
 * **Pre-migration note:** Filters are applied before any future migration
 * transforms. Callers should be aware that filter values (e.g., domain names,
 * type strings) must match the on-disk schema version, not a migrated version.
 */
export interface ReplayFilter {
	/** Filter by event domain(s) */
	domain?: EventDomain | EventDomain[];
	/** Filter by event type(s) */
	type?: string | string[];
	/** Only events at or after this ISO-8601 timestamp */
	since?: string;
	/** Only events within this time range (inclusive) */
	timeRange?: {
		start: string; // ISO-8601
		end: string; // ISO-8601
	};
	/** Only events after this event ID (exclusive) */
	afterId?: string;
}

export interface ReplayOptions {
	/** Path to events.jsonl */
	eventsPath: string;
	/** Optional filters -- all conditions are ANDed */
	filter?: ReplayFilter;
	/** If true, skip lines that fail JSON parse (crash recovery). Default: true */
	skipCorrupt?: boolean;
}

export interface ReplayResult {
	events: AnyEventEnvelope[];
	/** Number of lines skipped due to parse errors */
	skippedLines: number;
	/** If afterId filter was used, whether the referenced ID was found in the log */
	afterIdFound?: boolean;
}

/**
 * Replay events from a JSONL file, optionally filtered.
 *
 * Reads the file in full (acceptable for v2 scale, < 2MB). Each non-empty line is:
 * 1. Parsed as JSON (skip if corrupt and skipCorrupt=true, default)
 * 2. Validated against AnyEventEnvelopeSchema (skip if invalid and skipCorrupt=true)
 * 3. Checked against filter conditions (all ANDed)
 * 4. Included in results if all conditions pass
 *
 * Returns events in file order (which is write order, guaranteed by flock).
 *
 * **Pre-migration note:** Filters are applied before any future migration
 * transforms. Filter values must match on-disk schema versions.
 */
export async function replayEvents(opts: ReplayOptions): Promise<ReplayResult> {
	const { eventsPath, filter } = opts;
	const skipCorrupt = opts.skipCorrupt ?? true;

	// Non-existent file returns empty results
	if (!fs.existsSync(eventsPath)) {
		return {
			events: [],
			skippedLines: 0,
			// afterIdFound only present when afterId filter is used
			...(filter?.afterId !== undefined ? { afterIdFound: false } : {}),
		};
	}

	const content = fs.readFileSync(eventsPath, "utf-8");

	// Filter out empty lines before processing (trailing newline produces empty string)
	const lines = content.split("\n").filter((line) => line !== "");

	const events: AnyEventEnvelope[] = [];
	let skippedLines = 0;

	// afterId tracking: skip events until we find the anchor event
	const useAfterId = filter?.afterId !== undefined;
	let afterIdFound = false;
	let pastAfterId = false;

	for (const line of lines) {
		// Step 1: Parse JSON
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			if (skipCorrupt) {
				skippedLines++;
				continue;
			}
			throw new Error(`Failed to parse JSON line: ${line}`);
		}

		// Step 2: Validate against schema
		const result = AnyEventEnvelopeSchema.safeParse(parsed);
		if (!result.success) {
			if (skipCorrupt) {
				skippedLines++;
				continue;
			}
			throw new Error(`Event validation failed: ${result.error.message}`);
		}

		const event = result.data;

		// Step 3: afterId filter — must find the anchor before including events
		if (useAfterId) {
			if (!pastAfterId) {
				if (event.id === filter.afterId) {
					afterIdFound = true;
					pastAfterId = true;
				}
				// Skip the anchor event itself and all events before it
				continue;
			}
		}

		// Step 3 (continued): Apply remaining filters (all ANDed)
		if (!matchesFilter(event, filter)) {
			continue;
		}

		// Step 4: Include event
		events.push(event);
	}

	return {
		events,
		skippedLines,
		...(useAfterId ? { afterIdFound } : {}),
	};
}

/**
 * Check if an event matches all filter conditions (ANDed).
 * Returns true if no filter is provided or all conditions pass.
 */
function matchesFilter(event: AnyEventEnvelope, filter: ReplayFilter | undefined): boolean {
	if (filter === undefined) {
		return true;
	}

	// Domain filter
	if (filter.domain !== undefined) {
		if (Array.isArray(filter.domain)) {
			if (!filter.domain.includes(event.domain)) {
				return false;
			}
		} else {
			if (event.domain !== filter.domain) {
				return false;
			}
		}
	}

	// Type filter
	if (filter.type !== undefined) {
		if (Array.isArray(filter.type)) {
			if (!filter.type.includes(event.type)) {
				return false;
			}
		} else {
			if (event.type !== filter.type) {
				return false;
			}
		}
	}

	// Since filter (string comparison, ISO-8601 with ms precision sorts correctly)
	if (filter.since !== undefined) {
		if (event.ts < filter.since) {
			return false;
		}
	}

	// Time range filter (inclusive, string comparison)
	if (filter.timeRange !== undefined) {
		if (event.ts < filter.timeRange.start || event.ts > filter.timeRange.end) {
			return false;
		}
	}

	return true;
}
