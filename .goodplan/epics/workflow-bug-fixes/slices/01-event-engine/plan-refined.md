# Implementation Plan: 01-event-engine

## Overview

Build the append-only event log engine that forms the foundation of goodplan v2's event-sourced architecture. This slice delivers the `src/engine/events/` subsystem: Zod-first schemas for the event envelope, a flock-safe JSONL append function, filtered replay, and schema version handling with migration hooks. No CLI commands or invariant checks are exposed -- this is a pure library slice consumed by later slices (invariant engine, derived state, CLI commands).

The engine depends only on `src/schemas/` and `src/util/`. Tests live in `tests/engine/` and mirror the src structure.

---

## Phase 1: EventEnvelope Schema + Types

### Objective

Define the Zod schemas and derived TypeScript types for the event envelope, ContentRef, actor, scope, and domain. Establish ID generation and timestamp helpers. This phase produces the type foundation that all subsequent phases build on.

### Files

- `src/schemas/envelope.ts` -- EventEnvelope Zod schema, ContentRef schema, ActorSchema, ScopeSchema, EventDomain enum, AnyEventEnvelope type
- `src/schemas/shared.ts` -- Add `timestampSchema` (`z.string().datetime({ precision: 3 })`) for ISO-8601 UTC ms-precision timestamps (extend existing file). The envelope's `ts` field and all other timestamp fields should reference this shared schema.
- `src/engine/events/id.ts` -- UUID v4 generation, timestamp generation
- `src/engine/events/index.ts` -- Public API barrel for the events subsystem (re-exports)
- `tests/engine/events/envelope.test.ts` -- Schema validation tests

### Implementation Details

**`src/schemas/envelope.ts`:**

```typescript
import { z } from "zod";

// Actor who caused the event
export const ActorSchema = z.object({
  kind: z.enum(["user", "cli", "skill", "agent"]),
  id: z.string().min(1),
});
export type Actor = z.infer<typeof ActorSchema>;

// Scope of the event log
export const ScopeSchema = z.enum(["project", "epic", "side-quest"]);
export type Scope = z.infer<typeof ScopeSchema>;

// Top-level event domain (first-level discriminant)
export const EventDomainSchema = z.enum([
  "entity-lifecycle",
  "spine",
  "refinement",
  "exploration",
  "pressure-test",
  "finding",
  "briefing",
  "decision-learning",
  "pause-steering",
  "reshape",
  "milestone",
]);
export type EventDomain = z.infer<typeof EventDomainSchema>;

// Content reference to git blob
export const ContentRefSchema = z.object({
  sha: z.string().regex(/^[0-9a-f]{40}$/),
  size: z.number().int().nonnegative(),
  path: z.string().min(1),
  mediaType: z.string().min(1),
});
export type ContentRef = z.infer<typeof ContentRefSchema>;

// The universal event envelope
// Generic version used for type-safe event definitions per domain
// AnyEventEnvelopeSchema is the runtime-parseable version with unknown payload
export const AnyEventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.number().int().positive(),
  ts: z.string().datetime({ precision: 3 }),
  scope: ScopeSchema,
  scopeRef: z.string().nullable(),
  actor: ActorSchema,
  branch: z.string().min(1),
  commitHint: z.string().nullable(),
  domain: EventDomainSchema,
  type: z.string().min(1),
  payload: z.unknown(),
  prevId: z.string().uuid().nullable(),
});
export type AnyEventEnvelope = z.infer<typeof AnyEventEnvelopeSchema>;
```

**`timestampSchema` reuse:** The envelope's `ts` field should reference the `timestampSchema` export from `src/schemas/shared.ts` (e.g., `ts: timestampSchema`) rather than defining `z.string().datetime({ precision: 3 })` inline. Update `shared.ts` to export `timestampSchema` with `precision: 3`, then import and use it in the envelope schema.

Note: The generic `EventEnvelope<D, T, P>` TypeScript interface is defined manually (not via Zod) for type-safe domain-specific event construction. `AnyEventEnvelopeSchema` is the Zod schema for runtime parsing/validation of any event regardless of payload type.

```typescript
// Generic envelope type for type-safe event construction
export interface EventEnvelope<
  D extends EventDomain,
  T extends string,
  P,
> {
  id: string;
  schemaVersion: number;
  ts: string;
  scope: Scope;
  scopeRef: string | null;
  actor: Actor;
  branch: string;
  commitHint: string | null;
  domain: D;
  type: T;
  payload: P;
  prevId: string | null;
}
```

**`src/engine/events/id.ts`:**

```typescript
export function generateEventId(): string {
  return crypto.randomUUID();
}

export function generateTimestamp(): string {
  return new Date().toISOString(); // ISO-8601 UTC with ms precision
}
```

Use `crypto.randomUUID()` (available in Bun globally). Timestamp uses `Date.toISOString()` which produces UTC ms-precision format.

**`src/engine/events/index.ts`:**

Re-export public API: `generateEventId`, `generateTimestamp`, and all schema types from `src/schemas/envelope.ts`. Include `EventEnvelope` in the `export type` statement -- downstream slices will need the generic envelope type.

**Barrel file note:** This `index.ts` is an intentional deviation from the general "no barrel files" convention. It serves as the engine subsystem's public API surface -- the single import point for all consumers. This is the v2 convention for subsystem boundaries (each `src/<subsystem>/` directory exposes one `index.ts`).

**`verbatimModuleSyntax` note:** Under this flag, type-only re-exports must use `export type { ... }` syntax, separate from value re-exports. Example:
```typescript
export { generateEventId, generateTimestamp } from "./id.js";
export type { Actor, Scope, EventDomain, AnyEventEnvelope, ContentRef, EventEnvelope } from "../../schemas/envelope.js";
export { ActorSchema, ScopeSchema, EventDomainSchema, AnyEventEnvelopeSchema, ContentRefSchema } from "../../schemas/envelope.js";
```

**`exactOptionalPropertyTypes` note:** The envelope has no optional properties (all are required, some are nullable). No conditional spread workaround needed in this phase.

**Compile-time structural assertion:** Add a type-level check that `EventEnvelope<D, T, P>` is assignable to `AnyEventEnvelope` for any valid `D`, `T`, `P`. This catches drift between the manual interface and the Zod schema:
```typescript
// Compile-time check: EventEnvelope must be assignable to AnyEventEnvelope
// Pure type-level assertion -- no runtime artifact
type _AssertAssignable = EventEnvelope<EventDomain, string, unknown> extends AnyEventEnvelope ? true : never;
type _Check = [_AssertAssignable] extends [true] ? true : never;
```

### Expected Behavior

- `AnyEventEnvelopeSchema.parse(validEnvelope)` succeeds for a well-formed envelope object.
- `AnyEventEnvelopeSchema.parse(invalidEnvelope)` throws ZodError for: missing `id`, non-UUID `id`, missing `ts`, invalid `ts` format, invalid `scope` value, missing `actor`, invalid `actor.kind`, missing `domain`, missing `type`, missing `prevId` key.
- `ContentRefSchema.parse(validRef)` succeeds; rejects invalid SHA (wrong length, non-hex), negative size, empty path.
- `generateEventId()` returns a valid UUID v4 string (passes UUID regex).
- `generateTimestamp()` returns an ISO-8601 UTC string that passes `z.string().datetime()`.
- Calling `generateEventId()` twice produces different values.

### Verification

```bash
bun run test tests/engine/events/envelope.test.ts
```

Tests to write in `tests/engine/events/envelope.test.ts`:

1. **Valid envelope parses** -- construct a complete valid envelope, assert parse succeeds and output matches input.
2. **Invalid UUID rejected** -- `id: "not-a-uuid"` causes parse failure.
3. **Invalid timestamp rejected** -- `ts: "2024-01-01"` (missing time) causes parse failure.
4. **Invalid scope rejected** -- `scope: "unknown"` causes parse failure.
5. **Invalid actor kind rejected** -- `actor.kind: "bot"` causes parse failure.
6. **Invalid domain rejected** -- `domain: "unknown-domain"` causes parse failure.
7. **ContentRef valid parse** -- valid 40-char hex SHA, positive size, non-empty path.
8. **ContentRef invalid SHA rejected** -- too short, non-hex characters.
9. **ID generation uniqueness** -- 100 calls to `generateEventId()` produce 100 unique values.
10. **Timestamp format** -- `generateTimestamp()` output passes the datetime schema.

---

## Phase 2: Append with Flock

### Objective

Implement `appendEvent` -- the core write function that serializes an event envelope as a JSONL line and appends it to a scope's `events.jsonl` file with flock-based file locking. This phase establishes write safety and the prevId chain.

### Files

- `src/engine/events/append.ts` -- `appendEvent` function, `buildEnvelope` helper
- `src/engine/events/lock.ts` -- flock-based file locking utility
- `src/engine/events/read-last-event.ts` -- read last line of JSONL to resolve prevId
- `src/engine/events/index.ts` -- update exports
- `tests/engine/events/append.test.ts` -- append + locking tests

### Implementation Details

**Install dependency:** As the first step of Phase 2, install the locking library: `bun add proper-lockfile` (and `bun add -d @types/proper-lockfile` for type definitions).

**`src/engine/events/lock.ts`:**

```typescript
import lockfile from "proper-lockfile";

export interface LockHandle {
  release(): void;
}

/**
 * Acquire an exclusive lock on the given path using `proper-lockfile`
 * (mkdir-based locking -- cross-platform, no native bindings needed).
 * Creates a `.lock` sidecar file (not the events.jsonl itself) to avoid
 * interfering with readers.
 * Throws DATA_CONCURRENT_MODIFICATION if lock not acquired within timeoutMs.
 */
export function acquireLock(lockPath: string, timeoutMs?: number): Promise<LockHandle>;

/**
 * Execute fn while holding lock. Lock is released after fn completes
 * (or throws).
 */
export async function withLock<T>(
  lockPath: string,
  fn: () => T | Promise<T>,
  timeoutMs?: number,
): Promise<T>;
```

**Locking approach decision: `proper-lockfile` npm package.**

Rationale:
- Bun does NOT expose `Bun.file().lock()` or any native flock API.
- `flockSync` does not exist in `node:fs` (neither Node.js nor Bun).
- `proper-lockfile` uses mkdir-based locking which is atomic on all filesystems, works cross-platform (macOS + Linux), requires no native bindings, and works correctly under Bun.
- Alternative considered: `Bun.spawn(["flock", ...])` -- rejected because `flock` CLI is Linux-only (not available on macOS without Homebrew), adds subprocess overhead, and complicates timeout handling.

Implementation notes:
- Use `proper-lockfile.lock(sidecarPath, { retries: { retries: N, minTimeout: 50, maxTimeout: 200 } })` with retry count derived from `timeoutMs`.
- `proper-lockfile.lock()` returns a `release` function directly -- wrap it as `LockHandle`.
- Lock file path: `${eventsJsonlPath}.lock` (sidecar, not the JSONL file itself). Create the sidecar file if it does not exist (touch it) before locking, as `proper-lockfile` requires the target file to exist.
- Default timeout: 5000ms. On timeout, throw structured error with code `DATA_CONCURRENT_MODIFICATION` (from existing `GoodplanErrorCode`).

**`src/engine/events/read-last-event.ts`:**

```typescript
/**
 * Read the last event ID from an events.jsonl file (for use as prevId).
 * Returns null if the file is empty or does not exist.
 * Skips partial/corrupt trailing lines (crash safety).
 *
 * Uses a tail-read strategy: reads only the last ~4KB of the file,
 * keeping lock-hold time constant regardless of log size.
 */
export async function readLastEventId(eventsPath: string): Promise<string | null>;
```

Implementation: Open the file, seek to `max(0, fileSize - 4096)`, read the tail chunk. Split by newlines. Scan backward through lines (using `.at(-1)`, `.at(-2)`, etc. with `undefined` checks per `noUncheckedIndexedAccess`) until a line successfully parses as JSON with a valid `.id` field. Return that `id`, or `null` if no valid line is found. This keeps lock-hold time constant regardless of log size.

**`noUncheckedIndexedAccess` note:** Array access via `.at(-N)` returns `T | undefined`. Each access must be guarded: `const line = lines.at(-1); if (line === undefined) return null;` before attempting JSON parse.

**`src/engine/events/append.ts`:**

```typescript
import type { AnyEventEnvelope, Actor, EventDomain, Scope } from "../../schemas/envelope.js";

export interface AppendEventOptions {
  eventsPath: string;       // path to events.jsonl
  schemaVersion?: number;   // defaults to 1
  scope: Scope;
  scopeRef: string | null;
  actor: Actor;
  branch: string;
  commitHint: string | null;
  domain: EventDomain;
  type: string;
  payload: unknown;
  /**
   * Optional pre-append hook for invariant checking.
   * Called after envelope construction but before writing to disk.
   * Throw to abort the append. Slice 02 (invariant engine) will
   * provide the concrete implementation; this is the extension point.
   */
  beforeAppend?: (envelope: AnyEventEnvelope) => void | Promise<void>;
}

export interface AppendResult {
  event: AnyEventEnvelope;
}

/**
 * Append a single event to the JSONL log.
 *
 * Sequence:
 * 1. mkdirSync parent directory (create if not exists)
 * 2. Touch sidecar file with create-or-noop write: appendFileSync(sidecarPath, "")
 *    (NOT check-then-create -- avoids TOCTOU race)
 * 3. Acquire lock on eventsPath.lock (via proper-lockfile)
 * 4. Read last event ID for prevId (tail-read, constant time)
 * 5. Build envelope (generate id, ts, resolve prevId)
 * 6. Validate envelope against AnyEventEnvelopeSchema
 * 7. Call beforeAppend hook if provided (invariant checking extension point)
 * 8. Serialize as JSON + newline
 * 9. Append to file with single appendFileSync call (create if not exists)
 * 10. Release lock
 * 11. Return the appended event
 */
export async function appendEvent(opts: AppendEventOptions): Promise<AppendResult>;
```

Key implementation details:
- The lock is held only during steps 4-9 (read prevId + append). Milliseconds.
- Serialize with `JSON.stringify(envelope) + "\n"` -- newline-terminated for JSONL.
- **Atomicity:** Use a single `fs.appendFileSync(eventsPath, line)` call for the write. Under `O_APPEND`, the OS guarantees atomic seek+write. Combined with the lock held during write, this ensures no interleaving. Events are expected to be 200-500 bytes, well within filesystem block sizes. Do NOT use a streaming writer.
- **Directory and sidecar setup (steps 1-2):** Create parent directories (`mkdirSync` with `recursive: true`) and touch the sidecar file (`appendFileSync(sidecarPath, "")` -- create-or-noop, avoids TOCTOU race) BEFORE acquiring the lock. `proper-lockfile` requires the sidecar file to exist.
- Validate the built envelope with `AnyEventEnvelopeSchema.parse()` before writing (catch programming errors).
- If `opts.beforeAppend` is provided, call it after validation but before writing. If it throws, release the lock and propagate the error (event is NOT written).

**`exactOptionalPropertyTypes` note:** `AppendEventOptions.schemaVersion` is optional. Since `schemaVersion` is a required field on the envelope (not optional), use nullish coalescing: `schemaVersion: opts.schemaVersion ?? 1`.

### Expected Behavior

- `appendEvent(opts)` creates `events.jsonl` if it doesn't exist and writes the first event with `prevId: null`.
- A second `appendEvent` call produces an event whose `prevId` equals the first event's `id`.
- The JSONL file contains exactly one JSON object per line, each terminated by `\n`.
- Each line parses as a valid `AnyEventEnvelope`.
- Concurrent `appendEvent` calls (e.g., via `Promise.all`) do not corrupt the file -- all events are present and the prevId chain is unbroken.
- If the lock cannot be acquired within the timeout, `appendEvent` throws with error code `DATA_CONCURRENT_MODIFICATION`.

### Verification

```bash
bun run test tests/engine/events/append.test.ts
```

Tests to write in `tests/engine/events/append.test.ts`:

1. **First event has null prevId** -- append one event, read file, verify `prevId === null`.
2. **Second event chains prevId** -- append two events, verify second event's `prevId` equals first event's `id`.
3. **JSONL format** -- append 3 events, split file by `\n`, verify each line parses as valid JSON and matches `AnyEventEnvelopeSchema`.
4. **File creation** -- append to a path that doesn't exist yet, verify file is created.
5. **Envelope fields populated** -- verify `id` is UUID, `ts` is ISO-8601, `scope`/`scopeRef`/`actor`/`branch`/`domain`/`type` match input, `schemaVersion` defaults to 1.
6. **Concurrent safety** -- `Promise.all` of 10 appends to the same file, then verify: file has exactly 10 lines, all parse as valid envelopes, prevId chain is valid (each event's prevId points to the previous line's id).
7. **Partial line recovery** -- manually write a partial (non-JSON) line to the file, then append a new event. Verify the new event's `prevId` references the last *valid* event, not the corrupt line.
8. **Schema validation** -- attempt to append with an invalid domain value (bypass TypeScript via `as unknown as EventDomain` or `// @ts-expect-error` in test only), verify it throws a validation error.

**Test categorization note:** Phase 1 tests (schema validation, ID generation) are pure unit tests with no filesystem access. Phase 2+ tests that exercise append, locking, and replay are integration tests requiring temp directories (`os.tmpdir()`). Both live under `tests/engine/events/` per v2 convention (which mirrors `src/` structure: `tests/engine/`, `tests/trust/`, `tests/commands/` rather than the old `tests/unit/`/`tests/integration/` split).

**Test directory convention update:** During or after Phase 1, update `.goodplan/conventions.md` test directory section to reflect the v2 `tests/engine/` convention (mirroring `src/` structure).

---

## Phase 3: Replay with Filtering

### Objective

Implement `replayEvents` -- the core read function that streams a JSONL file line-by-line and returns events matching optional filters. This is the read-side complement to `appendEvent` and the foundation for the derived state computer (built in a later slice).

### Files

- `src/engine/events/replay.ts` -- `replayEvents` function with filter options
- `src/engine/events/index.ts` -- update exports
- `tests/engine/events/replay.test.ts` -- replay + filter tests

### Implementation Details

**`src/engine/events/replay.ts`:**

```typescript
import type { AnyEventEnvelope, EventDomain } from "../../schemas/envelope.js";

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
    end: string;   // ISO-8601
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
 * Reads the file line-by-line. Each line is:
 * 1. Parsed as JSON (skip if corrupt and skipCorrupt=true)
 * 2. Validated against AnyEventEnvelopeSchema (skip if invalid and skipCorrupt=true)
 * 3. Checked against filter conditions (all ANDed)
 * 4. Included in results if all conditions pass
 *
 * Returns events in file order (which is write order, guaranteed by flock).
 */
export async function replayEvents(opts: ReplayOptions): Promise<ReplayResult>;
```

Implementation details:
- Read file with `Bun.file(eventsPath).text()` then split by `\n`. Filter out empty lines (from trailing newline) before processing to avoid incrementing `skippedLines` incorrectly. For v2 scale (< 2MB), full-file read is acceptable (no streaming needed).
- Filter logic:
  - `domain`: `event.domain === domain` or `domains.includes(event.domain)`
  - `type`: `event.type === type` or `types.includes(event.type)`
  - `since`: `event.ts >= since` (string comparison works for ISO-8601 when all timestamps have consistent ms precision, enforced by the schema's `precision: 3`)
  - `timeRange`: `event.ts >= start && event.ts <= end` (same precision guarantee)
  - `afterId`: skip all events until we find the event with `id === afterId`, then include subsequent events
- All filter conditions are ANDed.
- `skipCorrupt` defaults to `true`. When a line fails JSON parse or Zod validation, increment `skippedLines` counter and continue.
- If the file doesn't exist, return `{ events: [], skippedLines: 0, afterIdFound: undefined }`.
- If `afterId` filter is used, set `afterIdFound` to `true` if the ID was found in the log, `false` otherwise. This helps callers distinguish "no events after ID" from "ID not found" (which may indicate a bug). When `afterId` is not used, `afterIdFound` is `undefined`.

**`exactOptionalPropertyTypes` note:** `ReplayFilter` has all optional properties. Callers constructing filter objects dynamically must use conditional spread to avoid passing `undefined` explicitly: `...(domain !== undefined ? { domain } : {})`. Document this pattern in the JSDoc for `ReplayFilter`.

**`skipCorrupt` and `exactOptionalPropertyTypes`:** Since `skipCorrupt?: boolean` is optional, callers must not pass `skipCorrupt: undefined` explicitly (violates `exactOptionalPropertyTypes`). Either omit the property or pass a concrete `boolean`. The implementation should default via `opts.skipCorrupt ?? true` (nullish coalescing handles both `undefined` and omitted). Same applies to `ReplayOptions.filter`.

**`afterId` filter detail:** This is useful for incremental replay. The derived state computer can replay only events added since the last known event ID. Implementation: maintain a `seen` flag, set to `true` when we encounter the event with `id === afterId`, then include all subsequent events.

### Expected Behavior

- `replayEvents({ eventsPath })` with no filter returns all events in file order.
- `replayEvents` with `domain: "entity-lifecycle"` returns only events with that domain.
- `replayEvents` with `type: "epic-created"` returns only events with that type.
- `replayEvents` with `since: "2026-04-09T12:00:00.000Z"` returns only events at or after that timestamp.
- `replayEvents` with `timeRange` returns only events within the range.
- `replayEvents` with `afterId` returns only events after the specified event.
- Multiple filters are ANDed: `{ domain: "entity-lifecycle", type: "epic-created" }` returns events matching both.
- Corrupt lines (partial JSON) are skipped and counted in `skippedLines`.
- Non-existent file returns empty results (not an error).
- The `afterId` filter correctly handles the case where the referenced event ID is not found (returns empty results).

### Verification

```bash
bun run test tests/engine/events/replay.test.ts
```

Tests to write in `tests/engine/events/replay.test.ts`:

1. **Round-trip: append then replay** -- append 5 events with different domains/types, replay all, verify count and order.
2. **Domain filter** -- append events across 3 domains, filter by one domain, verify only matching events returned.
3. **Type filter** -- append events with different types, filter by one type, verify only matching events returned.
4. **Type filter (array)** -- filter by `type: ["epic-created", "epic-completed"]`, verify both types returned.
5. **Since filter** -- append events with ascending timestamps, filter with `since` set to the third event's timestamp, verify only events 3-5 returned.
6. **Time range filter** -- append events spanning a time range, filter to a sub-range, verify correct subset.
7. **afterId filter** -- append 5 events, set `afterId` to event 3's ID, verify only events 4-5 returned and `afterIdFound === true`.
8. **Combined filters** -- domain + since, verify AND behavior.
9. **Corrupt line handling** -- write a valid event, a corrupt line, and another valid event. Replay with `skipCorrupt: true`, verify 2 events and `skippedLines: 1`.
10. **Non-existent file** -- replay from a path that doesn't exist, verify empty result (no throw).
11. **afterId not found** -- use an ID that doesn't exist in the log, verify empty results and `afterIdFound === false`.
12. **Empty file** -- replay from an empty file, verify empty result.

---

## Phase 4: Schema Version Handling + Migration Hooks

### Objective

Add schema version awareness to the envelope and replay pipeline. Implement a migration hook system that transforms event payloads from older schema versions to the current version during replay. This ensures forward compatibility as event shapes evolve.

### Files

- `src/engine/events/migration.ts` -- migration registry, version-aware replay wrapper
- `src/engine/events/index.ts` -- update exports
- `tests/engine/events/migration.test.ts` -- version handling + migration tests

### Implementation Details

**`src/engine/events/migration.ts`:**

```typescript
import type { AnyEventEnvelope } from "../../schemas/envelope.js";

/**
 * A migration function transforms an event envelope from one schema version
 * to the next. Migrations are chained: v1->v2, v2->v3, etc.
 */
export interface EventMigration {
  /** The event type this migration applies to (or "*" for all types) */
  eventType: string;
  /** Source schema version */
  fromVersion: number;
  /** Target schema version */
  toVersion: number;
  /** Transform the envelope. Must return a new envelope (not mutate). */
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
  /** Apply all necessary migrations to bring an event to the target version */
  migrateEvent(event: AnyEventEnvelope, targetVersion: number): AnyEventEnvelope;
}

/**
 * Create a new migration registry.
 */
export function createMigrationRegistry(): MigrationRegistry;

/**
 * Replay events with version-aware migration applied.
 * Wraps replayEvents and pipes each event through the migration registry.
 */
export interface VersionAwareReplayOptions {
  eventsPath: string;
  filter?: import("./replay.js").ReplayFilter;
  skipCorrupt?: boolean;
  migrations: MigrationRegistry;
  targetVersion: number;
}

/**
 * Note on return type: When migrations are applied, payload types are erased
 * to `unknown` (since migrations transform payloads at runtime). Callers must
 * re-validate payloads against domain-specific schemas after migration if they
 * need typed access.
 */
export async function replayWithMigrations(
  opts: VersionAwareReplayOptions,
): Promise<import("./replay.js").ReplayResult>;
```

Implementation details:

- `createMigrationRegistry()` returns a functional registry (plain object with closures over internal `Map<string, EventMigration[]>`).
- `migrateEvent` chains migrations: if event is at v1 and target is v3, it applies v1->v2 then v2->v3.
- If no migration exists for an event type + version pair, the event is returned as-is (forward compat: unknown types are passed through).
- `replayWithMigrations` calls `replayEvents` then maps each event through `registry.migrateEvent`.
- Migration functions must return a new object (immutable -- no mutation of the input).
- The `schemaVersion` field on the output envelope is updated to `toVersion` after migration.
- **Wildcard precedence:** Type-specific migrations take precedence over wildcard (`"*"`) for the same version step. Both do not run -- the type-specific migration wins.
- **Filter ordering:** In `replayWithMigrations`, filters are applied pre-migration (during `replayEvents`). Callers should be aware that events matching a filter post-migration may be excluded if they did not match pre-migration.

**Schema version conventions (documented in code comments):**
- All v2 launch events use `schemaVersion: 1`.
- When a breaking payload change is needed, increment the version and register a migration.
- Non-breaking changes (new optional fields with defaults) do not require version bumps -- Zod `.default()` handles them.
- Replay with `.strip()` mode means extra fields from newer versions are silently dropped by older parsers.

**Zod `.strip()` integration:**
- The `AnyEventEnvelopeSchema` already uses Zod's default strip behavior (extra keys are dropped).
- Domain-specific payload schemas should also use strip mode so that forward-compatible extra fields don't cause validation failures during replay.

### Expected Behavior

- Events with `schemaVersion: 1` pass through migration unchanged when `targetVersion: 1`.
- An event with `schemaVersion: 1` is migrated to version 2 when a v1->v2 migration is registered and `targetVersion: 2`.
- Chained migrations work: v1->v2->v3 when both migrations are registered and target is 3.
- Events with unknown types (no migrations registered) pass through unchanged.
- Events already at or above `targetVersion` are not migrated.
- `replayWithMigrations` returns the same filtering behavior as `replayEvents` but with migrated payloads.
- Migration functions receive a copy and must not mutate the input (enforced by test).

### Verification

```bash
bun run test tests/engine/events/migration.test.ts
```

Tests to write in `tests/engine/events/migration.test.ts`:

1. **No migration needed** -- event at v1, target v1, verify event unchanged.
2. **Single migration** -- register v1->v2 migration for `epic-created` that adds a field to payload. Apply to v1 event, verify payload has new field and `schemaVersion` is 2.
3. **Chained migration** -- register v1->v2 and v2->v3 migrations. Apply to v1 event with target v3, verify both transformations applied and `schemaVersion` is 3.
4. **Unknown event type passthrough** -- event with unregistered type passes through unchanged.
5. **Wildcard migration** -- register `"*"` migration that applies to all types. Verify it runs on any event type.
6. **Already at target version** -- event at v3, target v3, verify no migration applied.
7. **Above target version** -- event at v3, target v2, verify no migration applied (never downgrade).
8. **Immutability** -- capture input event reference, run migration, verify original object is unchanged.
9. **replayWithMigrations round-trip** -- append events at v1, register v1->v2 migration, replay with migrations, verify all returned events have `schemaVersion: 2`.
10. **Mixed versions in log** -- append some v1 and some v2 events (manually write v2 events). Replay with target v2, verify v1 events are migrated and v2 events pass through.

### Phase 4 Deliverables

In addition to the migration system, Phase 4 delivers the smoke script (`scripts/smoke-event-engine.ts`) described in the Smoke Script section below. This is the final phase and the smoke script exercises all capabilities from Phases 1-4.

---

## Risks & Mitigations

### 1. Locking portability (macOS vs Linux)
**Risk:** File locking behavior differs between macOS and Linux, particularly on NFS.
**Mitigation:** Using `proper-lockfile` (mkdir-based locking) which is atomic on all POSIX filesystems and works identically on macOS and Linux. No platform-specific behavior to manage. Uses a `.lock` sidecar file rather than locking the JSONL directly.

### 2. Crash safety (partial line writes)
**Risk:** If the process crashes mid-write, a partial JSON line may be left at the end of the JSONL file.
**Mitigation:** Newline-terminated writes (write `JSON.stringify(e) + "\n"` atomically). Replay skips lines that fail JSON parse (`skipCorrupt: true` default). `readLastEventId` also skips corrupt trailing lines for prevId resolution. Test this scenario explicitly (Phase 2, test 7).

### 3. Zod v4 + exactOptionalPropertyTypes
**Risk:** Known project issue where Zod's `optional()` conflicts with TypeScript's `exactOptionalPropertyTypes`.
**Mitigation:** The envelope schema has no optional properties (all required, some nullable). `AppendEventOptions.schemaVersion` is the only optional field -- use conditional spread pattern documented in project memory.

### 4. Large log performance
**Risk:** Replay of 100k+ event logs may be slow with full-file read approach.
**Mitigation:** Not in scope for this slice. Architecture estimates <2MB for typical projects (<50ms parse). Flagged for future streaming/caching if profiling shows need.

### 5. Event schema evolution complexity
**Risk:** Migration chain logic may have edge cases with complex version jumps or conflicting wildcard vs. type-specific migrations.
**Mitigation:** Phase 4 tests cover chained migrations, wildcard migrations, and mixed-version logs explicitly. Keep migration registry simple -- linear chain per event type, no branching.

### 6. Architecture doc drift
**Risk:** The architecture doc (`engine.md`) references `flock` and `STATE_CONFLICT` which no longer match the implementation.
**Mitigation:** When this slice lands, update `engine.md` to reflect `proper-lockfile` (mkdir-based locking) and `DATA_CONCURRENT_MODIFICATION` error code. Track this as a post-slice cleanup task.

### 7. `proper-lockfile` dependency
**Risk:** Adding an npm dependency for file locking introduces a supply-chain surface.
**Mitigation:** `proper-lockfile` is a mature, widely-used package (millions of weekly downloads) with minimal transitive dependencies. Its mkdir-based approach is simple and auditable. If the dependency becomes problematic, the `LockHandle` interface abstracts the implementation -- swapping to a hand-rolled mkdir lock is straightforward.

---

## Smoke Script

Create `scripts/smoke-event-engine.ts` -- a standalone Bun script for manual verification.

**What it does:**
1. Creates a temp directory
2. Appends 5 events with different domains and types (simulating an epic lifecycle: `project-initialized`, `epic-created`, `epic-goal-committed`, `slice-plan-drafted`, `slice-landed`)
3. Replays all events and prints them formatted
4. Replays with domain filter (`entity-lifecycle`) and prints count
5. Replays with `afterId` filter (after the 2nd event) and prints IDs
6. Registers a mock v1->v2 migration (adds a `migrated: true` field)
7. Replays with migrations and prints the migrated events
8. Verifies prevId chain integrity (each event's prevId matches previous event's id)
9. Cleans up temp directory
10. Prints "PASS" or lists failures

**Run with:**
```bash
bun scripts/smoke-event-engine.ts
```

Expected output: A formatted summary showing each step's result and a final PASS/FAIL verdict. This script serves as both a manual verification aid and a quick regression check.
