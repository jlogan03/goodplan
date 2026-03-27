## Issues

**[IMPORTANT]** `deriveSlug` fallback slug uses set size which is fragile
The fallback for empty-after-normalization summaries uses `existingSlugs.size + 1` (e.g., `learning-3` when set has 2 entries). This is unreliable because the set contains actual slugs, not `learning-N` slugs. If the set has `["foo", "bar"]`, the fallback is `learning-3` -- but if a second empty summary is processed, the set now has `["foo", "bar", "learning-3"]` so the next fallback is `learning-4`, which works by coincidence. However, if someone manually adds `learning-3` as a slug, the fallback collides and falls through to `-2` suffixing which saves it. The real issue: the fallback doesn't check if `learning-N` already exists before returning -- it bypasses the collision loop. If `learning-3` already exists in the set, `deriveSlug("!!!", set)` returns `learning-3` without collision detection.
File: src/util/slug.ts:28
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `collectExistingSlugs` only extracts slugs from new-format entries, missing legacy entries
The function `collectExistingSlugs` in `complete.ts` only collects slugs from entries that have a `file` field (`"file" in entry`). Legacy entries (with `detail` instead of `file`) are silently skipped. During the transition period (Phases 1-3), a scope could have legacy entries whose summaries would produce the same slug as a new entry. The slug derivation would not detect this collision, potentially producing a slug that semantically conflicts with an existing learning.
File: src/core/rpc/complete.ts:100
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Redundant `typeof entry.file === "string"` check after `"file" in entry`
In `collectRollupMarkdownCopies` (begin.ts:464) and `collectExistingSlugs` (complete.ts:105), the code checks `"file" in entry && typeof entry.file === "string"`. Since `LearningEntry` is a union where the `file` variant has `file: z.string().min(1)`, once `"file" in entry` is true, TypeScript narrows the type such that `entry.file` is always `string`. The `typeof` check is redundant. This is harmless but adds noise.
File: src/core/rpc/begin.ts:464
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `processLearnings` uses `LearningEventEntry` for reading existing JSONL that may contain legacy entries
In `processLearnings` (helpers.ts:553), existing learnings are read as `getJsonl<LearningEventEntry>(state, ...)`. During transition, these JSONL files may contain legacy `LearningEntry` objects with `detail` instead of `file`. The generic parameter `LearningEventEntry` would cause a type mismatch at runtime if the data were actually validated -- but since `getJsonl` is a type assertion (not runtime validation), this is only a type-level concern. Using `LearningEntry` (the union) would be more accurate for reading, while `LearningEventEntry` is correct for new entries being appended.
File: src/core/state/transitions/helpers.ts:553
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test imports `LearningEventEntry` type but it's unused in some test files
In `tests/unit/state/quest-complete.test.ts` and `tests/unit/state/slice-complete.test.ts`, both `LearningEntry` and `LearningEventEntry` are imported. The test data now matches `LearningEventEntry` shape. `LearningEntry` is still used for reading JSONL in assertions. This is fine, but the import of `LearningEventEntry` is unused as a type annotation -- it's only needed for the implicit shape of test objects. Consider whether the import adds clarity or noise.
File: tests/unit/state/quest-complete.test.ts:10
Resolution: DIRECTLY_ACTIONABLE

No issues found with:
- Type safety of the Zod union schema (clean discriminated union via `file` vs `detail`)
- INV-003 compliance (state machine transitions import only `type` from I/O modules)
- INV-005 compliance (schema validation covers both variants)
- Module boundaries (slug utility in `util/`, markdown I/O in `data/`, orchestration in `rpc/`)
- `verbatimModuleSyntax` compliance (all type imports use `import type`)
- `exactOptionalPropertyTypes` compliance (no optional properties misused)
- `noUncheckedIndexedAccess` compliance (regex match uses `match?.[1] !== undefined`)
- Error handling in markdown-files.ts (atomic write with tmp+rename, cleanup on failure, structured GoodplanError)
- Test coverage (slug edge cases, integration through RPC, rollup JSONL propagation, error paths)

## Score: 8/10

Solid TypeScript implementation with good type safety, proper Zod union design for backward compatibility, and clean separation of concerns. The two IMPORTANT issues prevent a higher score: the slug fallback bypassing collision detection is a real bug (albeit edge-case), and the legacy slug collision gap could cause subtle issues during the transition period. Fixing those plus the minor cleanups would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
