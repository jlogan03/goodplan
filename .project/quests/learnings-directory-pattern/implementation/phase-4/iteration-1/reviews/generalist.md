# Generalist Review — Phase 4: Migration and Testing

**Score: 8/10** | Critical: 0, Important: 2, Minor: 2

## Summary

Phase 4 delivers a solid migration implementation that converts monolithic `learnings.md` and inline JSONL `detail` entries to the per-file `learnings/` directory pattern. The schema is properly tightened, migration is idempotent, and `completion/learnings.md` is preserved. The core parsing, conversion, and scope-walking logic is well-structured. Tests cover the main paths including re-migration. All 1074 tests pass.

## Important

### 1. No test that the tightened schema rejects legacy `detail`-only entries

The schema tightening removes the union and makes `file` required. However, there is no test asserting that `learningEntrySchema.safeParse({ ...validLearning, detail: "x" })` with `file` removed actually fails. The `records.test.ts` `validLearning` fixture already uses `file`, but there is no explicit "rejects legacy format" test case. This is an important regression guard -- if someone accidentally re-adds the union, no test would catch it.

**Suggestion**: Add a test case in `tests/unit/schemas/records.test.ts`:
```ts
it("rejects legacy detail-only entries (no file field)", () => {
    const { file: _, ...legacy } = validLearning;
    expect(learningEntrySchema.safeParse({ ...legacy, detail: "some detail" }).success).toBe(false);
});
```

### 2. `convertLearningsMd` hardcodes `category: "domain"` for all parsed learnings

In `migrate.ts` line 719, every entry parsed from `learnings.md` gets `category: "domain"`. The monolithic `learnings.md` format does not encode category, so this is understandable -- but there is no comment explaining this default or consideration of heuristics (e.g., could keywords in the summary inform category?). More importantly, the test fixture `learnings.md` has entries that may represent "worked" or "do-differently" categories but will all be migrated as "domain".

**Suggestion**: Add a code comment explaining that `learnings.md` lacks category metadata, so "domain" is the safe default. Consider whether this should be documented as a known limitation of migration so users can manually re-categorize post-migration.

## Minor

### 3. `LearningSummary.file` remains optional despite schema tightening

After Phase 4 tightens `learningEntrySchema` to require `file`, every `LearningEntry` will always have a `file` field. Yet `LearningSummary` in `src/core/context/types.ts` still declares `file?: string`. The `projectLearning()` function now directly assigns `file: entry.file` (which works since `entry.file` is always `string`), but the optional type on `LearningSummary` means downstream consumers still need `"file" in learning` guards. This is technically correct for backward compatibility if external consumers exist, but since this is pre-1.0 and the schema was intentionally tightened, making `file` required on `LearningSummary` would be cleaner.

### 4. Integration test `completion/learnings.md` assertion uses conditional existence check

In `migrate-learnings.test.ts` lines 301 and 313, the test checks `if (fs.existsSync(epicCompletionLearnings))` before asserting on the content. This means the test silently passes even if the file is missing. Since the plan explicitly requires `completion/learnings.md` preservation, this should be an unconditional assertion (`expect(fs.existsSync(...)).toBe(true)`) followed by a content check, so a regression in artifact copying would be caught.

## What Went Well

- **Migration scope coverage**: All scopes (project, epic, slice, quest) are walked and converted. The `migrateLearnings` function properly handles both the monolithic `.md` path and the JSONL-only path.
- **Re-migration idempotency**: The test creates a full second migration pass and asserts file sets are identical. The slug collision detection via `existingSlugs` set is correct.
- **Error handling**: Migration failures are non-fatal (logged to stderr), preserving the committed state. This matches the plan's recovery semantics.
- **`parseLearningsMd` parser**: Clean state-machine approach with proper flush-on-heading logic. Edge cases (empty content, entries without detail body) are tested.
- **Schema tightening order**: Correctly done after migration -- the tightened schema only applies to new data paths, while migration converts legacy data first.
