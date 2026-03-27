## Issues

**[IMPORTANT]** Rollup markdown copy in `begin.ts` uses duck-typing instead of schema-derived type guard
The `collectRollupMarkdownCopies` function checks `"file" in entry && typeof entry.file === "string"` to distinguish new-format entries from legacy. This duck-typing is fragile -- if the legacy schema ever gains a `file` field with different semantics, this breaks silently. The `LearningEntry` union type already distinguishes the two variants. Use a proper type narrowing pattern (e.g., a helper `hasFileField(entry): entry is LearningEventEntry`) or check against the Zod schema with `learningEntrySchemaNew.safeParse()`. The same pattern appears in `collectExistingSlugs` in `complete.ts:108`.
File: src/core/rpc/begin.ts:464
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `processLearnings` reads JSONL as `LearningEventEntry` but rollup target may contain legacy entries
In `helpers.ts:578`, `getJsonl<LearningEventEntry>(state, ...)` reads the source scope's learnings. But when reading epic or project level (`helpers.ts:599`, `helpers.ts:608`), these JSONL files may contain legacy `LearningEntry` entries (with `detail` instead of `file`). Using `LearningEventEntry` as the generic type parameter is incorrect -- it should be `LearningEntry` (the union type) to correctly represent what might already be in those files. The spread `[...epicLearnings, ...epicRollups]` still works at runtime since the JSONL is untyped JSON, but the type assertion is misleading and could hide bugs if stricter validation is added later.
File: src/core/state/transitions/helpers.ts:599
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Slug fallback index uses `existingSlugs.size` which may produce collisions
In `slug.ts:28`, when the summary normalizes to empty, the fallback is `learning-${existingSlugs.size + 1}`. If slugs are deleted from the set between completions (e.g., during migration), the size-based index could collide with an existing slug. The collision loop at line 43 would catch this, but the fallback itself could produce `learning-3` when there are already 2 slugs, and `learning-3` might already exist. The test at line 60-64 validates the current behavior, but consider running the fallback through the collision handler too rather than returning early.
File: src/util/slug.ts:28
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Markdown files written before `commitState` creates a partial-write window
In `complete.ts:68-71`, markdown files are written after `reduce()` succeeds but before `commitState()`. If `commitState()` fails (e.g., concurrent modification error), orphan `.md` files remain on disk with no corresponding JSONL references. The comment at line 66 acknowledges this ordering intentionally ("avoids orphans if reduce fails") but the inverse case (orphans if commitState fails) is unaddressed. This is low-risk because `commitState` failures are rare (only concurrent modification), but documenting the trade-off in the comment would clarify the design choice.
File: src/core/rpc/complete.ts:68
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Strong implementation with clean layer separation. The state machine remains pure (INV-003 verified -- no I/O imports in helpers.ts). The `LearningInput -> LearningEventEntry` mapping in the RPC layer correctly keeps slug derivation and file path construction out of the state machine. The `processLearnings` helper is a good deduplication of the slice-complete and quest-complete logic. All 39 unit tests and 98 fitness function tests pass. The schema union approach for backward compatibility is sound.

To reach 9+: fix the type narrowing for mixed legacy/new entries in JSONL reads (the IMPORTANT items), which would make the type system accurately reflect the runtime data shapes.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
