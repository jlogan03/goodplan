# Merged Review — Phase 4: Semver Compatibility (Iteration 1)

## Scores

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| Generalist | 9/10 | 0 | 1 | 2 |
| Software Architecture | 9/10 | 0 | 0 | 2 |
| TypeScript | 6/10 | 1 | 3 | 2 |

---

## Issues

### Critical

**C1. All integration tests fail**
All 7 tests in `tests/integration/version-compat.test.ts` fail. The "compatible" test exits with code 2 instead of 0; the "major-behind" test shows `VALIDATION_INVALID_INPUT` instead of `VALIDATION_VERSION_MAJOR_MISMATCH`. Two likely causes:
1. The `createProjectWithVersion` fixture is missing newly-required fields introduced in Phase 2's schema changes, causing a validation error unrelated to version compat.
2. The `--version` test expects `"1.0.0"` but the compiled binary returns `"0.0.0-dev"` — the `globalSetup` compilation may not be passing the `--define:__GOODPLAN_VERSION__` flag correctly.
File: `tests/integration/version-compat.test.ts:49`
Resolution: CODEBASE_EXPLORATION — inspect fixture construction, schema requirements, and build pipeline `--define` flag.

---

### Important

**I1. Biome formatting violation — `CompatibilityResult` union type**
The `CompatibilityResult` union type on line 48 of `semver.ts` is written on a single line; Biome's formatter expects it split across multiple lines with leading `|` separators. Will fail CI lint.
File: `src/util/semver.ts:48`
Resolution: DIRECTLY_ACTIONABLE — reformat to multi-line union.

**I2. Biome import ordering violation in `src/index.ts`**
`resolveProjectDir` and `loadState` imports are out of alphabetical order — `loadState` (from `./core/data/load.js`) should precede `resolveProjectDir` (from `./core/data/project.js`). Biome's `organizeImports` rule will flag this.
File: `src/index.ts:5`
Resolution: DIRECTLY_ACTIONABLE — reorder imports.

**I3. `noUncheckedIndexedAccess` gap in `parseSemver`**
`parts[0]`, `parts[1]`, `parts[2]` have type `string | undefined` under `noUncheckedIndexedAccess: true`. The preceding regex guarantees three parts at runtime, but TypeScript doesn't know this — `Number(undefined)` returns `NaN` silently. Add non-null assertions (`parts[0]!`) or destructure with explicit undefined checks to document the safety invariant.
File: `src/util/semver.ts:33`
Resolution: DIRECTLY_ACTIONABLE — add `!` assertions after the regex guard, or destructure.

---

### Minor

**M1. `VERSION` import in RPC layer creates coupling to application-level module** *(Generalist + Software Architecture — same issue)*
`begin.ts`, `submit.ts`, `complete.ts` import `VERSION` from `../../version.js`. The `version.ts` module has a filesystem fallback (reads `package.json` in dev/test mode), so the RPC layer transitively depends on filesystem reads. In compiled builds this is a literal string constant and benign. The plan explicitly specified this pattern, so no action is required now. The alternative — passing `cliVersion` as a parameter to the RPC functions — would be cleaner and improve testability, but is out of scope for this slice.
Files: `src/core/rpc/begin.ts`, `submit.ts`, `complete.ts`
Resolution: NOTE — acceptable per plan; revisit in a future refactor if RPC testability becomes a concern.

**M2. `checkCompatibility` patch-behind treated as "compatible" — docstring inaccurate** *(Generalist + Software Architecture + TypeScript — same observation, TypeScript adds the docstring fix)*
When CLI and data share the same major/minor but CLI patch < data patch (e.g., CLI `1.0.0` vs data `1.0.5`), the function returns `"compatible"`. This is correct per spec (patches are bug-fix only, no data model changes). However, the JSDoc says "CLI >= data" for the compatible case, which is imprecise. Update the docstring to say "same major, CLI minor >= data minor; patch differences are always ignored."
File: `src/util/semver.ts:43`
Resolution: DIRECTLY_ACTIONABLE — one-line docstring update.

**M3. Empty catch block in `checkVersionCompatibility`**
The outer catch in the compat-check block at `src/index.ts:185–187` silently swallows unexpected (non-GoodplanError) errors. The inline comment says "don't block command execution" which is reasonable, but project conventions prohibit empty catch blocks. At minimum add a debug-level `process.stderr.write` (only when not `--quiet` and not `--json`).
File: `src/index.ts:185`
Resolution: DIRECTLY_ACTIONABLE — add a conditional stderr debug message.

---

## Contradictions / Resolutions

None. The three reviewers agreed on all overlapping observations. The Generalist and Software Architecture reviewers both noted the `VERSION` import coupling and the patch-behind docstring gap (M1, M2) independently — both assessed them as non-blocking and consistent with the plan. The TypeScript reviewer rated the overall score lower due to the failing tests (C1) and lint violations (I1, I2), which the other reviewers did not run.

---

## Summary

The implementation logic is sound: `semver.ts` is pure, `version-stamp.ts` is cleanly isolated with thorough INV-001 documentation, and the `checkVersionCompatibility` dispatch integration uses the idiomatic `DATA_NO_PROJECT` try-catch pattern. The critical issue is that all integration tests fail — likely a fixture/schema staleness problem from Phase 2 changes and a missing `--define` flag in the build step. Two Biome lint violations will also block CI. These three issues (C1, I1, I2) plus the `noUncheckedIndexedAccess` gap (I3) must be fixed before this phase is complete. The minor items (M1–M3) are low-effort cleanups that would bring the score to 9+.

### Action priority

| Priority | Issue | Effort |
|---|---|---|
| Fix first | C1 — integration tests failing | Medium (investigate fixture + build) |
| Fix first | I1 — Biome union type format | Trivial |
| Fix first | I2 — Biome import order | Trivial |
| Fix first | I3 — non-null assertions in `parseSemver` | Trivial |
| Nice to have | M2 — docstring accuracy | Trivial |
| Nice to have | M3 — empty catch → debug log | Trivial |
| Defer | M1 — VERSION import coupling | Future slice |
