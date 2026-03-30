# Generalist Review — Phase 2: Write Path Integration (Iteration 2)

**Score: 9/10** | Critical: 0, Important: 0, Minor: 2

## Summary

Clean iteration. All three prior issues (missing vitest define, premature `atomicWrite` export, cache divergence) are resolved. The `embedStateSignature` function is well-structured: it avoids mutating `newState`, validates through `projectSchema.parse()` (preserving INV-005), and handles both the "project.json already in jsonWrites" and "project.json skipped by diffTree" cases. The cache sync logic correctly injects the signed project content into the cached state so cache and disk stay aligned. Tests are thorough — all four planned tests are present plus an extra "child-only changes still embed signature" test that covers the diffTree-skip path.

## Previous Issues — Status

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | CRITICAL | Missing `__GP_HMAC_KEY__` define in `vitest.config.ts` | **Fixed** — added with `JSON.stringify()` pattern, matches `__GOODPLAN_VERSION__` |
| 2 | IMPORTANT | Premature `atomicWrite` export | **Fixed** — `atomicWrite` remains module-private (no `export`). Phase 4 plan still notes the future export with JSDoc |
| 3 | IMPORTANT | Cache/disk divergence for `stateSignature` | **Fixed** — `embedStateSignature` returns the validated parsed content, `commitState` injects it into `stateToCache.contents["project.json"]` before writing cache |
| 4-8 | MINOR | Various (comment, empty catch, etc.) | Addressed or no longer applicable |

## New Findings

### MINOR-01: `[goodplan]` to `[gp]` rename is out of Phase 2 scope

The diff includes a change in `checkConcurrentModification` renaming the stderr prefix from `[goodplan]` to `[gp]` (line 259). This is a correct change (aligns with CLI rename), but it is not part of the HMAC Phase 2 task list. It was likely done during this phase but should have been a separate commit to keep the phase diff clean. Not a correctness issue.

**Recommendation:** Note for future — keep unrelated renames in separate commits.

### MINOR-02: Fixture renames (`.project` to `.goodplan`) included in Phase 2 diff

The diff includes 50+ fixture directory renames from `.project/` to `.goodplan/`. Like MINOR-01, these are correct but unrelated to HMAC write-path integration. They inflate the diff and make review harder.

**Recommendation:** Same as MINOR-01 — separate commits for unrelated changes.

## Positive Observations

1. **Signature-stripping in concurrent modification detection** — The `checkConcurrentModification` function now strips `stateSignature` from both the expected (oldState) and actual (on-disk) content before comparison. This is necessary because `oldState` from the caller lacks `stateSignature` while on-disk has it. The asymmetry between project.json (parsed comparison) and other files (byte comparison) is documented in a comment. Well-handled.

2. **Disk-read optimization for unchanged signatures** — When `diffTree` skips `project.json`, `embedStateSignature` reads the on-disk content and compares before writing. This avoids unnecessary writes when the signature hasn't changed (e.g., idempotent commits). Good for mtime-based cache invalidation.

3. **Test coverage** — Five HMAC-specific tests cover: signature presence, verification against committed state, signature change on mutation, write-read equivalence, and child-only changes. The write-read equivalence test (reassemble from disk, recompute HMAC, compare) is the key proof that serialization paths are aligned.

4. **`global-setup.ts` define quoting** — The `--define` for `__GP_HMAC_KEY__` uses the correct quoting pattern: `'__GP_HMAC_KEY__="goodplan-dev-hmac-key"'` as a single string array element. This differs from the plan's two-element approach (`"--define"`, `"__GP_HMAC_KEY__=..."`) but is functionally equivalent and arguably cleaner since `execFileSync` handles it correctly.

5. **Vitest config parity** — Both `vitest.config.ts` (`JSON.stringify("goodplan-dev-hmac-key")`) and `global-setup.ts` (`"goodplan-dev-hmac-key"` in the define string) produce the same runtime value. Parity confirmed.

## Plan Compliance

All Phase 2 tasks are complete:

- [x] `commitState()` modified to compute and embed signature before flushing writes
- [x] `newState` not mutated — shallow clone with conditional spread (line 246-248)
- [x] `projectSchema.parse()` on clone before serializing (line 252)
- [x] Handles both existing and missing `jsonWrites` entry for `project.json` (lines 256-278)
- [x] Write ordering preserved: JSON first, JSONL second, cache last
- [x] Tests: signature presence, verification, change detection, write-read equivalence
- [x] `__GP_HMAC_KEY__` added to `global-setup.ts`
- [x] `__GP_HMAC_KEY__` added to `vitest.config.ts`

## Verdict

**PASS.** No blocking issues. The two minor items are hygiene observations about commit scope, not code quality problems. Ready to proceed to Phase 3.
