# Learnings: 01-event-engine

## What Worked

### Separate `eventTimestampSchema` avoided breaking existing consumers
Creating a new `eventTimestampSchema` (precision:3) alongside the existing `timestampSchema` preserved backward compatibility with 11+ existing consumers of `shared.ts`. The plan originally said to update `timestampSchema` to precision:3, but implementation correctly identified this would break existing imports and created a separate schema instead.

### `proper-lockfile` with mkdir-based locking worked cleanly under Bun
The plan correctly anticipated that Bun lacks native flock APIs. `proper-lockfile` integrated without issues, including the `realpath: false` option needed for macOS compatibility. The `LockHandle` abstraction makes future swaps straightforward.

### Tail-read strategy for prevId resolution
Reading only the last ~4KB of the JSONL file for prevId resolution keeps lock-hold time constant regardless of log size. This is a good pattern for append-only logs.

### `beforeAppend` hook provides clean invariant extension point
The optional `beforeAppend` callback on `AppendEventOptions` lets slice-02 (invariant engine) plug in without modifying append.ts. This is a well-placed seam.

### Compile-time structural assertion caught type drift potential
The `_AssertAssignable` / `_Check` types in `envelope.ts` ensure the manual `EventEnvelope<D,T,P>` interface stays aligned with the `AnyEventEnvelopeSchema` Zod schema. Zero runtime cost, catches drift at compile time.

### Test count and coverage exceeded expectations
72 tests across 7 test files covering schemas, ID generation, append, locking, concurrent safety, replay filtering, migration chaining, and a smoke script. The concurrent safety test (10 parallel appends verifying unbroken prevId chain) is particularly valuable.

## What Didn't Work

### Architecture doc references `flock` and `STATE_CONFLICT` -- now stale
The `engine.md` architecture doc still says "flock on macOS/Linux" and "STATE_CONFLICT" error code. The implementation uses `proper-lockfile` (mkdir-based) and `DATA_CONCURRENT_MODIFICATION`. This needs updating before slice-02 starts to avoid confusing the next implementer.

### Plan said to update `timestampSchema` directly -- would have broken things
The plan's Phase 1 said: "Update `shared.ts` to export `timestampSchema` with `precision: 3`, then import and use it in the envelope schema." Following this literally would have broken 11+ existing consumers. The implementation correctly diverged. Plans for shared schema changes should always check consumer impact.

## Domain Insights

### Event ordering is prevId-chain, not timestamp
UUIDs are not monotonic and timestamps can collide. Canonical ordering comes from prevId chain traversal only. `ts` is informational. This is documented in the architecture but worth reinforcing for future consumers.

### Pre-migration filtering is a subtle gotcha
Filters in `replayWithMigrations` run pre-migration. If a migration changes a domain or type name, events matching post-migration won't be found pre-migration. This is documented but may surprise callers. Consider whether post-migration filtering is needed in a future slice.

## Do Differently Next Time

### Check existing schema consumers before modifying shared types
The plan assumed `timestampSchema` could be modified in-place. A quick grep for imports would have caught the 11+ consumers. Plans modifying shared schemas should include an impact check step.

### Architecture docs should be updated as part of the implementation slice, not deferred
The plan acknowledged the flock/STATE_CONFLICT drift as Risk 6 and deferred it. Since the delta is known at implementation time, updating the architecture doc within the same slice would prevent stale docs from confusing future slices.
