import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import type { ReplayFilter, ReplayResult } from "./replay.js";
import { replayEvents } from "./replay.js";

/**
 * A migration function transforms an event envelope from one schema version
 * to the next. Migrations are chained: v1->v2, v2->v3, etc.
 *
 * Migrate functions must be pure: return a new envelope without mutating the input.
 */
export interface EventMigration {
	/** The event type this migration applies to (or "*" for all types) */
	eventType: string;
	/** Source schema version */
	fromVersion: number;
	/** Target schema version */
	toVersion: number;
	/**
	 * Transform the envelope. Must return a new envelope (not mutate the input).
	 * The input is a structuredClone -- safe to modify, but the original must remain unchanged.
	 */
	migrate(event: AnyEventEnvelope): AnyEventEnvelope;
}

/**
 * Registry of migrations. Migrations are registered at startup and
 * applied during replay.
 */
export interface MigrationRegistry {
	/** Register a migration */
	register(migration: EventMigration): void;
	/** Get all migrations for a given event type, ordered by fromVersion */
	getMigrations(eventType: string): EventMigration[];
	/**
	 * Apply all necessary migrations to bring an event to the target version.
	 *
	 * **Type erasure:** The return type is `AnyEventEnvelope` (payload: `unknown`).
	 * Because migrations transform payloads at runtime, the concrete payload type
	 * is erased. Callers must re-validate payloads against domain-specific schemas
	 * after migration if they need typed access.
	 *
	 * **Precedence:** Type-specific migrations take precedence over wildcard (`"*"`)
	 * for the same version step. Both do NOT run -- the type-specific migration wins.
	 *
	 * **Passthrough:** Events with unknown types (no registered migration) or events
	 * already at or above `targetVersion` pass through unchanged.
	 */
	migrateEvent(event: AnyEventEnvelope, targetVersion: number): AnyEventEnvelope;
}

/**
 * Create a new migration registry.
 */
export function createMigrationRegistry(): MigrationRegistry {
	// Internal storage: Map<eventType, EventMigration[]> sorted by fromVersion
	const migrations = new Map<string, EventMigration[]>();

	function register(migration: EventMigration): void {
		const key = migration.eventType;
		const existing = migrations.get(key) ?? [];
		existing.push(migration);
		// Keep sorted by fromVersion for predictable chaining
		existing.sort((a, b) => a.fromVersion - b.fromVersion);
		migrations.set(key, existing);
	}

	function getMigrations(eventType: string): EventMigration[] {
		return migrations.get(eventType) ?? [];
	}

	function migrateEvent(event: AnyEventEnvelope, targetVersion: number): AnyEventEnvelope {
		// Already at or above target -- no migration needed (never downgrade)
		if (event.schemaVersion >= targetVersion) {
			return event;
		}

		// Clone to preserve immutability of the original
		let current: AnyEventEnvelope = structuredClone(event);

		while (current.schemaVersion < targetVersion) {
			const currentVersion = current.schemaVersion;

			// Look up type-specific migration first; fall back to wildcard
			const typeSpecific = findMigration(current.type, currentVersion);
			const wildcard = findMigration("*", currentVersion);

			// Type-specific takes precedence over wildcard -- both do NOT run
			const migration = typeSpecific ?? wildcard;

			if (migration === undefined) {
				// No migration registered for this version step -- passthrough
				break;
			}

			current = migration.migrate(current);
			current.schemaVersion = migration.toVersion;
		}

		return current;
	}

	function findMigration(eventType: string, fromVersion: number): EventMigration | undefined {
		const chain = migrations.get(eventType);
		if (chain === undefined) {
			return undefined;
		}
		return chain.find((m) => m.fromVersion === fromVersion);
	}

	return { register, getMigrations, migrateEvent };
}

/**
 * Options for version-aware replay.
 */
export interface VersionAwareReplayOptions {
	eventsPath: string;
	filter?: ReplayFilter;
	skipCorrupt?: boolean;
	migrations: MigrationRegistry;
	targetVersion: number;
}

/**
 * Replay events with version-aware migration applied.
 *
 * Wraps `replayEvents` and pipes each event through the migration registry.
 *
 * **Return type note:** When migrations are applied, payload types are erased
 * to `unknown` (since migrations transform payloads at runtime). Callers must
 * re-validate payloads against domain-specific schemas after migration if they
 * need typed access.
 *
 * **WARNING: Filters are applied pre-migration.** Filters run during `replayEvents`
 * (before migration transforms). This means:
 * - Filter values (e.g., domain names, type strings) must match the on-disk
 *   schema version, not a migrated version.
 * - Events that would match a filter post-migration may be excluded if they
 *   did not match pre-migration.
 */
export async function replayWithMigrations(opts: VersionAwareReplayOptions): Promise<ReplayResult> {
	const result = await replayEvents({
		eventsPath: opts.eventsPath,
		filter: opts.filter,
		skipCorrupt: opts.skipCorrupt,
	});

	// Apply migrations to each event
	const migratedEvents = result.events.map((event) =>
		opts.migrations.migrateEvent(event, opts.targetVersion),
	);

	return {
		events: migratedEvents,
		skippedLines: result.skippedLines,
		...(result.afterIdFound !== undefined ? { afterIdFound: result.afterIdFound } : {}),
	};
}
