# Generalist Review: Phase 2 — Write Path Integration

**Score: 8/10** | Critical: 0, Important: 2, Minor: 2

## Summary

Phase 2 hooks `signStateTree()` into `commitState()` so every write embeds an HMAC signature in `project.json`. The implementation closely follows the plan: signature is computed after `diffTree` but before flush, `project.json` is updated or created in `jsonWrites`, `atomicWrite` is exported for Phase 4, concurrent modification detection strips `stateSignature` for comparisons, and test fixtures are updated. Tests are thorough with 5 new HMAC-specific tests plus adjustments to existing tests for signature awareness.

## Plan Adherence

All plan tasks are completed:

- [x] `embedStateSignature()` computes signature after `diffTree`, before flush
- [x] Does not mutate `newState` -- creates shallow clone with conditional spread
- [x] Validates through `projectSchema.parse()` (INV-005)
- [x] Finds or creates `jsonWrites` entry for `project.json`
- [x] `atomicWrite` exported with JSDoc comment
- [x] `--define __GP_HMAC_KEY__` added to `global-setup.ts`
- [x] All 4 plan-specified tests present, plus a bonus "child entities changed" test

## Important Issues

### I1: State cache does not include `stateSignature`

`writeStateCache(projectDir, newState)` on line 62 writes the original `newState` which lacks `stateSignature`. When Phase 3 adds read-path verification, `loadState()` cache-hit path returns state without `stateSignature`, which would be treated as "bootstrap" (no signature to verify) and skip verification entirely. This means the mtime-matched cache path silently bypasses HMAC verification -- not because it's trusted (plan says cache hits are trusted), but because any *incremental update* path that patches the cached state will also lack the embedded signature.

The plan explicitly says cache hits are trusted (no verification needed), and incremental/full-rebuild paths will verify. But the cached `ProjectState` tree is missing the `stateSignature` field that was written to disk, creating a subtle divergence between the cache representation and the on-disk reality. When Phase 3 adds verification on the incremental path, a partial cache invalidation could yield state from cache (no sig) merged with fresh disk reads (has sig) -- the interaction is unclear.

**Recommendation:** Pass the signature-embedded state to `writeStateCache()` instead of `newState`. This requires either (a) mutating the `newState` tree after `embedStateSignature`, (b) having `embedStateSignature` return the augmented project content so it can be patched into the state passed to `writeStateCache`, or (c) re-reading the project node from `jsonWrites`. Option (b) is cleanest. If intentionally deferred to Phase 3, add a comment noting the gap.

### I2: `checkConcurrentModification` parses disk JSON for `project.json` but not for other files

The `stripSig` branch at line 317 parses disk content with `JSON.parse(diskRaw)` then re-serializes, while the non-project.json path compares raw bytes. This is correct for the signature-stripping need, but introduces a behavioral asymmetry: `project.json` concurrent modification detection is now semantically equivalent (parse-then-compare) while other JSON files use byte-level comparison. If `project.json` on disk has different whitespace/formatting but the same parsed content, it would pass the check, whereas for other files it would correctly flag a modification. This is unlikely to cause real issues (all writes go through `deterministicStringify`), but the asymmetry is worth a comment.

**Recommendation:** Add a brief comment noting that `project.json` uses parsed comparison (required for signature stripping) while other JSON files use byte comparison.

## Minor Issues

### M1: Redundant undefined check on `signature`

In `embedStateSignature` line 227-228:
```typescript
...(signature !== undefined ? { stateSignature: signature } : {}),
```
`signStateTree()` always returns a `string` (never undefined). The conditional spread is a plan requirement for `exactOptionalPropertyTypes` safety, but since the value is always a string, a simpler `{ stateSignature: signature }` would suffice. The conditional spread is harmless and matches the plan exactly, so this is purely cosmetic.

### M2: Formatting-only diff noise

Several hunks in the diff are pure formatting changes (collapsing multi-line function arguments to single lines, removing blank lines in destructured imports). These are presumably from a formatter run but add noise to the review diff. Not a problem -- just noting they aren't substantive changes.

## Strengths

1. **Clean separation of concerns.** `embedStateSignature` is a well-scoped function that doesn't leak HMAC logic into `diffTree` or `processJsonEntry`.

2. **Concurrent modification detection updated correctly.** The `stripSig` approach in `checkConcurrentModification` is a thoughtful solution to the problem that on-disk `project.json` has `stateSignature` but the caller's `oldState` does not.

3. **Test coverage is thorough.** The write-read equivalence test and the "child entities changed" test go beyond the plan minimum and catch real integration concerns. Existing tests were correctly updated to use `assembleState()` for round-trip accuracy.

4. **Disk-read optimization in the else branch.** Checking `diskContent === content` before creating a new `jsonWrites` entry avoids unnecessary writes when only child entities changed but the signature hasn't -- good for performance.

5. **Fixture signatures are correct.** All 4 test fixture `project.json` files have valid 64-char hex signatures that match the dev key.
