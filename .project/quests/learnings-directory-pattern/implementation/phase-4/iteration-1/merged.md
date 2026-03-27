# Merged Review — Phase 4: Migration and Testing

**Scores**: Generalist 8/10, Software Architecture 9/10 | Critical: 0, Important: 2, Minor: 3

## Summary

Phase 4 delivers a solid migration implementation converting monolithic `learnings.md` and inline JSONL `detail` entries to the per-file `learnings/` directory pattern. Schema is properly tightened, migration is idempotent, `completion/learnings.md` is preserved. Parsing, conversion, and scope-walking logic are well-structured. All 1074 tests pass including fitness functions.

---

## Important

### 1. `LearningSummary.file` should be required now that legacy entries are gone

`LearningSummary` in `src/core/context/types.ts` still has `file?: string` with a JSDoc comment referencing "legacy entries (inline detail)." Now that `learningEntrySchema` requires `file`, no legacy entries can exist. The optional field and its comment are stale.

Making `file` required on `LearningSummary` would:
- Eliminate `"file" in learning` guards by consumers (simpler API)
- Keep context types consistent with the underlying schema
- Remove the conditional spread pattern only needed for `exactOptionalPropertyTypes` compatibility with the old union type

The `collectLearnings` projection in `src/core/context/learnings.ts` already unconditionally assigns `file: entry.file` (line 68), confirming it always has a value.

**File**: `src/core/context/types.ts:35` | Resolution: DIRECTLY_ACTIONABLE

### 2. No test that tightened schema rejects legacy `detail`-only entries

`learningEntrySchema` now requires `file`, but there is no test asserting a `detail`-only entry (no `file`) actually fails validation. If someone accidentally re-adds the union, no test would catch it.

**Suggestion**: Add to `tests/unit/schemas/records.test.ts`:
```ts
it("rejects legacy detail-only entries (no file field)", () => {
    const { file: _, ...legacy } = validLearning;
    expect(learningEntrySchema.safeParse({ ...legacy, detail: "some detail" }).success).toBe(false);
});
```

---

## Minor

### 3. Migration JSONL writes bypass deterministic key ordering (INV-002)

In `migrateLearnings`, JSONL entries are written via `JSON.stringify(e)` (migrate.ts ~lines 900-901) rather than through `deterministicStringify()`. INV-002 requires all JSON/JSONL writes to use deterministic key ordering for git merge friendliness. `deterministicStringify` is already imported in the file.

**File**: `src/core/rpc/migrate.ts:900` | Resolution: DIRECTLY_ACTIONABLE

### 4. `convertLearningsMd` hardcodes `category: "domain"` for all parsed learnings

Every entry from `learnings.md` gets `category: "domain"` (migrate.ts line 719). The monolithic format doesn't encode category, so the default is reasonable — but there's no comment explaining this or flagging it as a known limitation. Entries representing "worked" or "do-differently" learnings will all be migrated as "domain".

**Suggestion**: Add a code comment noting that `learnings.md` lacks category metadata and "domain" is the safe default. Consider documenting as a known migration limitation so users can manually re-categorize post-migration.

### 5. Integration test `completion/learnings.md` assertion uses conditional existence check

In `migrate-learnings.test.ts` lines 301 and 313, the test checks `if (fs.existsSync(epicCompletionLearnings))` before asserting content. This silently passes if the file is missing. Since the plan explicitly requires `completion/learnings.md` preservation, this should be an unconditional `expect(fs.existsSync(...)).toBe(true)` followed by a content check.

### 6. `convertInlineDetailEntries` uses `unknown[]` — loses type safety (minor, migration-only)

Accepts and returns `unknown[]`, relying on duck-typing to distinguish formats. Acceptable for a migration-only code path, but the `as Record<string, unknown>` casts could be replaced with a local migration-only interface for clarity.

**File**: `src/core/rpc/migrate.ts:740` | Resolution: DIRECTLY_ACTIONABLE (low priority)

---

## What Went Well

- **Migration scope coverage**: All scopes (project, epic, slice, quest) walked and converted correctly.
- **Re-migration idempotency**: Full second pass asserted with identical file sets; slug collision detection via `existingSlugs` set is correct.
- **Error handling**: Migration failures are non-fatal (logged to stderr), preserving committed state — matches plan recovery semantics.
- **`parseLearningsMd` parser**: Clean state-machine approach with flush-on-heading logic. Edge cases (empty content, entries without detail body) tested.
- **Schema tightening order**: Correctly done after migration — tightened schema only applies to new data paths while migration converts legacy data first.
- **Module boundaries**: Migration logic in `migrate.ts`, schema changes in `learning.ts`, RPC/context layers updated consistently.
