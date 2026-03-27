# Merged Review — Phase 1: Schema, State Machine, and RPC Layer

## Score: 8/10

## Summary

Clean, well-structured implementation with proper layer separation (INV-003 verified). Schema union approach for backward compatibility is sound. The `processLearnings` helper effectively deduplicates slice-complete and quest-complete logic. All tests pass (39 unit + 98 fitness function). Data flow from `LearningInput` through RPC to state machine to disk is well-verified. Two real issues to fix: slug fallback bypasses collision detection, and legacy entries are not properly accounted for in type narrowing and slug collection.

## Issues

### IMPORTANT-1: Slug fallback bypasses collision detection (bug)

**Sources**: TypeScript, Software Architecture

In `slug.ts:28`, when the summary normalizes to empty, the fallback `learning-${existingSlugs.size + 1}` returns early without going through the collision loop at line 43. If `learning-N` already exists in the set, `deriveSlug("!!!", set)` returns a duplicate slug. The set-size-based index is also fragile (unrelated to actual `learning-N` numbering).

**Fix**: Run the fallback slug through the same collision-handling loop instead of returning early.

File: `src/util/slug.ts:28`

### IMPORTANT-2: Legacy entries ignored in slug collection and type narrowing

**Sources**: TypeScript, Software Architecture

Two related sub-issues:

**(a)** `collectExistingSlugs` in `complete.ts:100` only collects slugs from entries with a `file` field. Legacy entries (with `detail`) are skipped, so a new entry could produce a slug that semantically conflicts with an existing legacy learning's summary.

**(b)** Duck-typing `"file" in entry && typeof entry.file === "string"` in `begin.ts:464` and `complete.ts:108` is fragile. The `LearningEntry` union type already distinguishes variants — use a proper type guard (e.g., `hasFileField(entry): entry is LearningEventEntry`) or Zod `safeParse`.

**Fix**: (a) Derive slugs from legacy entries too (normalize their `summary` field). (b) Replace duck-typing with a type guard or schema check.

Files: `src/core/rpc/complete.ts:100`, `src/core/rpc/begin.ts:464`

### IMPORTANT-3: `processLearnings` reads JSONL as `LearningEventEntry` but files may contain legacy entries

**Sources**: TypeScript, Software Architecture

In `helpers.ts:578-608`, `getJsonl<LearningEventEntry>` is used to read existing learnings at epic/project scope. During transition, these files may contain legacy `LearningEntry` entries (with `detail` instead of `file`). The generic parameter should be `LearningEntry` (the union) to accurately represent runtime data. Currently works because `getJsonl` is a type assertion, but misleading and could hide bugs if stricter validation is added.

**Fix**: Change generic parameter from `LearningEventEntry` to `LearningEntry`.

File: `src/core/state/transitions/helpers.ts:578`

### MINOR-1: Markdown written before `commitState` creates orphan window

**Source**: Software Architecture

In `complete.ts:68-71`, markdown files are written after `reduce()` but before `commitState()`. If `commitState` fails, orphan `.md` files remain. Low risk (only concurrent modification failures), but the existing comment should document this inverse trade-off.

File: `src/core/rpc/complete.ts:68`

### MINOR-2: `collectRollupMarkdownCopies` relies on append-only assumption

**Source**: Generalist

Uses `newEntries.slice(oldEntries.length)` to detect added entries, assuming entries are only appended. True today but implicit — add a comment.

File: `src/core/rpc/begin.ts`

### MINOR-3: Redundant `typeof entry.file === "string"` check

**Source**: TypeScript

After `"file" in entry`, TypeScript narrows the union so `entry.file` is already `string`. The `typeof` check is harmless but noisy. Will be resolved if IMPORTANT-2b replaces duck-typing with a type guard.

File: `src/core/rpc/begin.ts:464`

### MINOR-4: Unused `LearningEventEntry` import in test files

**Source**: TypeScript

In `quest-complete.test.ts` and `slice-complete.test.ts`, `LearningEventEntry` is imported but never used as a type annotation. Minor noise.

Files: `tests/unit/state/quest-complete.test.ts:10`, `tests/unit/state/slice-complete.test.ts`

## Verdicts by Reviewer

| Reviewer | Score | Critical | Important | Minor |
|----------|-------|----------|-----------|-------|
| Generalist | 9/10 | 0 | 0 | 2 |
| Software Architecture | 8/10 | 0 | 2 | 2 |
| TypeScript | 8/10 | 0 | 2 | 3 |
| **Merged** | **8/10** | **0** | **3** | **4** |
