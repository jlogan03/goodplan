# TypeScript Review — Phase 1, Iteration 2

## Round 1 Fix Verification

All three IMPORTANT issues from iteration 1 are resolved:

1. **Slug fallback bypass (IMPORTANT-1)**: `slug.ts:27-29` now sets `slug = "learning"` and falls through to the collision loop at line 43. No early return. Verified by tests `fallback handles collision via standard loop` and `fallback handles multiple collisions`.

2. **Legacy entries in collectExistingSlugs + duck typing (IMPORTANT-2)**: `collectExistingSlugs` now processes legacy entries by deriving slugs from their `summary` field (line 128). Duck typing replaced with a proper exported type guard `isLearningEventEntry` (line 102-104) using `"file" in entry`, which correctly narrows the `LearningEntry` union. The type guard is reused in both `complete.ts` and `begin.ts`.

3. **processLearnings wrong generic (IMPORTANT-3)**: All three `getJsonl` calls in `processLearnings` (helpers.ts lines 579, 600, 609) now use `LearningEntry` (the union type) instead of `LearningEventEntry`. The comment at line 577 documents why.

## Issues

**[MINOR]** `collectExistingSlugs` calls `deriveSlug` for legacy entries, passing the accumulating `slugs` set — this means earlier legacy entries affect the derived slugs of later legacy entries
The derived slug for a legacy entry depends on which slugs are already in the set, which depends on processing order. If legacy entries are reprocessed in a different order (e.g., after a migration reorders them), the derived slugs could differ, potentially causing a new entry to collide with a legacy entry's "would-be" slug. This is acceptable for the transition period since (a) JSONL order is stable, (b) legacy entries will be migrated in Phase 4, and (c) the worst case is a `-2` suffix — but worth a brief comment noting the order-dependence.
File: src/core/rpc/complete.ts:128
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-1 IMPORTANT issues are properly fixed. Type safety is strong throughout: `LearningEntry` union for reading existing JSONL, `LearningEventEntry` for new entries flowing through the state machine, `LearningInput` for the external API boundary. The type guard is clean and correctly placed. The schema design (union of two object schemas) is the right Zod pattern for backward-compatible evolution. One minor observation about order-dependent slug derivation for legacy entries — low risk, comment-level fix.

## Summary
- Critical: 0
- Important: 0
- Minor: 1
