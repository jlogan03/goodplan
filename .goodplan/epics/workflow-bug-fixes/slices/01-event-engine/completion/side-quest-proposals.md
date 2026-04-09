# Side Quest Proposals: 01-event-engine

## 1. Update engine.md to match implementation

**Rationale:** `engine.md` references `flock` and `STATE_CONFLICT` which don't match the implementation. This will confuse implementers of slice-02 (invariant engine) and slice-03 (derived state).

**Scope:** Small -- 2-3 paragraph edits in `engine.md` Write Safety section.

**Priority:** High -- should be done before slice-02 starts.

**Changes:**
- Replace "flock on macOS/Linux" with "proper-lockfile (mkdir-based locking)"
- Replace "STATE_CONFLICT" with "DATA_CONCURRENT_MODIFICATION"
- Note the sidecar lock file pattern
- Clarify `eventTimestampSchema` vs `timestampSchema` distinction

## 2. Post-migration filter support

**Rationale:** `replayWithMigrations` applies filters pre-migration. If a future migration renames a domain or type, callers filtering on the new name will get no results. This is documented but could be a footgun.

**Scope:** Small -- add an optional `postFilter` to `VersionAwareReplayOptions` that runs after migration.

**Priority:** Low -- no migrations exist yet, so this is speculative. Revisit when the first real migration is registered.

## 3. Lock release fire-and-forget audit

**Rationale:** `LockHandle.release()` calls `void release()` (fire-and-forget on the async `proper-lockfile` release). If the release fails silently, stale lock directories could accumulate. This works fine in practice but should be verified under error conditions.

**Scope:** Small -- add a test that verifies lock cleanup after release, possibly add error logging to the void path.

**Priority:** Low -- mkdir-based locks have a stale-check mechanism in `proper-lockfile` that handles this, but worth confirming.
