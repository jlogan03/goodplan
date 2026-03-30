# Software Architecture Review — Phase 2: Write Path Integration (Iteration 2)

## Issues

**[MINOR]** `embedStateSignature` return type is `unknown | undefined` — consider narrowing
The return type `unknown | undefined` on `embedStateSignature` is technically correct (it returns `projectSchema.parse()` output or `undefined`), but `unknown | undefined` collapses to `unknown` — the `undefined` branch is invisible to callers. The function either returns a parsed project object or `undefined`. Narrowing the return type (e.g., using the inferred type from `projectSchema.parse()`) would make the cache-sync code at lines 65-77 more self-documenting. This is cosmetic — the runtime behavior is correct and the conditional check on `signedProjectContent !== undefined` works because JavaScript distinguishes `undefined` at runtime regardless of the TypeScript type.
File: src/core/data/commit.ts:234
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Fixture signatures are dev-key-dependent (carried from iteration 1, documented but not mitigated)
The four fixture `project.json` files contain hardcoded `stateSignature` hex values computed with the dev HMAC key `"goodplan-dev-hmac-key"`. If the dev key changes, all fixtures silently produce wrong signatures and tests that use these fixtures may break in confusing ways. A comment in one fixture or in the test helpers noting this coupling would help future maintainers. Acceptable for Developing maturity.
File: tests/fixtures/fresh-init/.goodplan/project.json:7
Resolution: DIRECTLY_ACTIONABLE

## Iteration 1 Issue Resolution

All CRITICAL and IMPORTANT issues from iteration 1 have been addressed:

- **C1 (CRITICAL): Missing `__GP_HMAC_KEY__` in `vitest.config.ts`** — Fixed. Line 9 of `vitest.config.ts` now has `__GP_HMAC_KEY__: JSON.stringify("goodplan-dev-hmac-key")`, matching the `global-setup.ts` define. Unit tests now exercise the injected-key path.

- **I1 (IMPORTANT): `atomicWrite` exported prematurely** — Fixed. `atomicWrite` is now a module-private `function` (no `export` keyword). Grep confirms no external imports. The JSDoc comment is retained for Phase 4 context.

- **I2 (IMPORTANT): State cache missing `stateSignature`** — Fixed. Lines 61-80 of `commit.ts` build a `stateToCache` that patches the project.json entry with the signed content returned by `embedStateSignature`. The `loadState` test at `load.test.ts:105-111` was updated to compare against `assembleState()` output (which includes the signature), confirming cache/disk parity.

## Architectural Assessment

**Module boundaries:** `embedStateSignature` is correctly scoped as a private function within `commit.ts`. It operates on the `jsonWrites` array (an implementation detail of `commitState`) and returns the signed content for cache sync. No HMAC logic leaks into `diffTree`, `processJsonEntry`, or external modules. The Data Layer boundary is clean.

**Dependency direction:** `commit.ts` imports `signStateTree` from `hmac.ts` and `projectSchema` from the schemas layer. Both are appropriate — `commit.ts` is the integration point where signing meets persistence. The `hmac.ts` module remains agnostic to write mechanics.

**INV-001 compliance:** All state mutations still route through `commitState`. The `atomicWrite` function is private, preventing external bypass.

**INV-002 compliance:** The signed project.json content goes through `deterministicStringify` (line 253), preserving alphabetical key ordering.

**INV-005 compliance:** The signature-embedded clone passes through `projectSchema.parse()` (line 252) before serialization, preserving Zod validation on the write path.

**INV-009 compliance:** The signature is computed after `diffTree` but before flushing writes (lines 44-47), ensuring it's embedded atomically. The cache stores the signed state, preventing cache/disk divergence. The concurrent modification check strips signatures from both sides, preventing false positives when `oldState` came from cache (with signature) vs. caller-constructed state (without).

**Test boundary alignment:** Tests exercise `commitState` through its public API and verify signature behavior by reading files from disk and re-assembling state. No internal mocking. The write-read equivalence test (line 570) is particularly valuable — it proves the serialization paths are consistent across the write and read boundaries.

**Layering:** The `checkConcurrentModification` asymmetry (parsed comparison for project.json, byte comparison for others) is well-documented in comments at lines 332-339. The asymmetry is necessary because the signature is injected outside the normal diffTree flow, but the comment makes the design decision explicit.

## Score: 9/10

All critical and important issues from iteration 1 are resolved. The architecture is clean: signature embedding is correctly positioned in the write pipeline, cache sync eliminates the divergence hazard, and concurrent modification detection handles the signature correctly. The two remaining minor issues are cosmetic (return type narrowing, fixture documentation). Tests pass and cover all specified scenarios plus edge cases.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
