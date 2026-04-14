# Architecture Delta: 01-event-engine

## Alignment

The implementation aligns with the architecture on these points:

1. **Event envelope schema** -- all 12 fields match the architecture spec in `engine.md`. The `EventEnvelope<D,T,P>` generic + `AnyEventEnvelopeSchema` Zod schema matches the documented pattern.
2. **JSONL format** -- one line per event, append-only, newline-terminated.
3. **prevId chain** -- first event has `prevId: null`, each subsequent event chains to the previous.
4. **Schema evolution** -- `schemaVersion` field present, migration registry with version chaining implemented.
5. **Dependency rules** -- `src/engine/events/` imports only from `src/schemas/` and `src/util/`, matching the layer diagram.
6. **Subsystem barrel file** -- `src/engine/events/index.ts` serves as the public API surface per v2 convention.
7. **Scope-per-JSONL** -- architecture describes one JSONL per scope (project/epic/side-quest); the `eventsPath` parameter enables this without hardcoding paths.

## Drift (requires architecture doc updates)

### 1. Locking mechanism: `flock` -> `proper-lockfile`
- **Architecture says:** "flock on macOS/Linux"
- **Implementation uses:** `proper-lockfile` (mkdir-based locking)
- **Reason:** Bun doesn't expose flock APIs. `proper-lockfile` is cross-platform, no native bindings.
- **File to update:** `engine.md`, Write Safety section

### 2. Error code: `STATE_CONFLICT` -> `DATA_CONCURRENT_MODIFICATION`
- **Architecture says:** "fails with STATE_CONFLICT"
- **Implementation uses:** `GoodplanError` with code `DATA_CONCURRENT_MODIFICATION`
- **Reason:** `DATA_CONCURRENT_MODIFICATION` is the existing error code in `src/util/errors.ts`; no `STATE_CONFLICT` code exists.
- **File to update:** `engine.md`, Write Safety section

### 3. Timestamp schema: separate `eventTimestampSchema`
- **Architecture says:** `shared.ts` has `timestampSchema` with ms precision for envelope `ts`
- **Implementation:** Created separate `eventTimestampSchema` (precision:3) alongside existing `timestampSchema` (no precision constraint)
- **Reason:** Modifying `timestampSchema` would break 11+ existing consumers
- **File to update:** `engine.md`, Event Envelope Schema section (minor: clarify which schema the `ts` field uses)

## Gaps (not yet realized)

1. **`GitOps` ports-and-adapters** -- architecture describes `GitOps` interface for `hashObject`, `catFile`, `createMilestoneCommit`. Not needed by event engine (no git operations), but slice-02+ will need it.
2. **`gp verify` command** -- architecture describes structural verification. Not in scope for this slice (commands layer).
3. **Domain-specific event schemas** -- `src/schemas/events/*.ts` (per-domain payload schemas) are referenced in architecture but not built yet. Only the envelope and `AnyEventEnvelopeSchema` with `payload: z.unknown()` exist.
4. **Two-level discriminated union** -- architecture describes `z.discriminatedUnion()` for domain+type dispatch. Current implementation uses `z.unknown()` for payload. This will be built when domain-specific event types are defined.

## Emergent Patterns

1. **Sidecar lock file pattern** -- `${eventsPath}.lock` touched before locking, separate from the data file. This avoids interfering with readers and works well with `proper-lockfile`.
2. **Synchronous `readLastEventId`** -- uses `fs.readFileSync` for tail-read within the locked critical section, keeping the pattern simple and avoiding async complexity under lock.
3. **`structuredClone` for migration immutability** -- migration registry uses `structuredClone` before passing events to migrate functions, ensuring original events are never mutated even if migrate functions are careless.
