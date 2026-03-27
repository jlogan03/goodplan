# Generalist Review — Phase 1: Schema, State Machine, and RPC Layer

## Score: 9/10

## Summary

This is a well-executed phase that cleanly separates concerns across all four architectural layers. The schema union approach, slug derivation, shared `processLearnings` helper, RPC-layer markdown file orchestration, and rollup copy logic are all implemented correctly and match the plan. Build passes, 20 new tests added, no regressions.

## Plan Adherence

All tasks from Phase 1 are addressed:

- **Schema union** (`learningEntrySchemaNew` / `learningEntrySchemaLegacy` / union): Done correctly. `LearningEventEntry` narrow type exported for state event payloads.
- **State events updated**: `COMPLETE_SLICE` and `COMPLETE_QUEST` both use `LearningEventEntry[]`. Verified in `state-events.ts`.
- **Slug derivation utility**: `src/util/slug.ts` — kebab-case, truncation at word boundary, collision handling with `Set<string>`, fallback for empty/special-char summaries. All edge cases covered.
- **Markdown file I/O helpers**: `src/core/data/markdown-files.ts` — `writeMarkdownFiles` and `copyMarkdownFiles` with atomic writes (tmp + rename), directory creation, proper error wrapping.
- **Shared `processLearnings` helper**: Extracted into `helpers.ts` with `availableTargets: Set<string>` parameter. Slices pass `{"epic", "project"}`; quests pass `{"project"}`. Batched rollup (single `setEntry` per scope) instead of per-entry — good O(n) fix.
- **`slice-complete.ts` and `quest-complete.ts`**: Both use `LearningEventEntry[]`, delegate to `processLearnings`. State machine stays pure (INV-003).
- **`rollup-learnings.ts`**: Already copies entries verbatim including `file` field — no changes needed to the state machine handler. The `begin.ts` rollup path handles `.md` file copying via `collectRollupMarkdownCopies`.
- **RPC `complete.ts`**: Maps `LearningInput[]` to `LearningEventEntry[]`, derives slugs, writes `.md` files after `reduce()` but before `commitState()`. Correct ordering for orphan prevention.
- **RPC `begin.ts`**: `collectRollupMarkdownCopies` correctly identifies new entries with `file` field at target scope and copies physical `.md` files from source to target.
- **Tests**: Unit tests for slug derivation (12 cases), state machine transitions (updated for `file` field), RPC integration tests (7 cases covering .md creation, multiple learnings, slug collisions, detail-to-file transformation, error paths, rollup).

## Cross-File Integration

The data flow is clean and well-verified:
1. Skills pass `LearningInput` (with `detail`) to `complete()`
2. `complete()` calls `mapLearningInputs()` which derives slugs and builds `LearningEventEntry[]` (with `file`)
3. `buildCompleteEventWithLearnings()` builds `StateEvent` with `LearningEventEntry[]`
4. `reduce()` runs pure state machine — `processLearnings` stores `file` in JSONL entries
5. `writeMarkdownFiles()` writes `.md` files after reduce succeeds
6. `commitState()` persists JSONL

For rollup: `begin()` with `phase === "rollup"` calls `collectRollupMarkdownCopies()` then `copyMarkdownFiles()` — correctly handling the standalone rollup case.

## Code Reuse

The `processLearnings` helper effectively eliminates duplication between `slice-complete.ts` and `quest-complete.ts`. The parameterized `availableTargets` makes the skip-epic case explicit.

## Issues

### Minor

1. **Fallback slug collision not handled**: In `deriveSlug`, when the summary normalizes to empty, the fallback is `learning-<existingSlugs.size + 1>`. If `existingSlugs` already contains `"learning-3"` and `existingSlugs.size` is 2, the fallback `"learning-3"` would collide and bypass the collision handler (because the collision check runs only on the non-fallback path — actually, looking again, the collision handler at line 43 DOES run after the fallback assignment at line 28, so this is handled correctly). No issue here — retracted.

2. **`collectRollupMarkdownCopies` uses `newEntries.slice(oldEntries.length)` to detect added entries**: This assumes entries are only ever appended (never reordered or deleted). This is true today given the append-only JSONL pattern, but the assumption is implicit. A comment would help future maintainability. **(Minor)**

3. **`copyMarkdownFiles` silently skips missing source files**: In `markdown-files.ts` line 73, if the source file doesn't exist, it logs a debug message and continues. This is the correct behavior (graceful degradation for legacy entries without `.md` files), but worth noting as a design choice — a missing file during rollup is not an error. The plan mentions "JSONL entries with missing `.md` files degrade gracefully at read time" which aligns. **(Minor — design choice, not a bug)**

4. **`processLearnings` reads source JSONL as `LearningEventEntry` but existing entries could be legacy format**: At `helpers.ts` line 578, `getJsonl<LearningEventEntry>` is used to read existing source learnings. During the transition period, some entries may be legacy (with `detail` instead of `file`). The generic parameter is a type assertion — runtime data still flows through. Since `setEntry` just appends the new `LearningEventEntry[]` entries to the existing array, and the union schema validates both formats, this works correctly at runtime. The type assertion is slightly loose but doesn't cause bugs. **(Minor)**

## Verdict

Clean, well-structured implementation that follows the plan closely. The architectural layering (state machine purity, RPC orchestration, data layer I/O) is properly maintained. Tests cover the key scenarios including edge cases. No critical or important issues found.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Important | 0 |
| Minor | 2 |
