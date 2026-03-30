# Merged Review — Phase 2: Write Path Integration (Iteration 1)

**Reviewers:** Generalist (8/10), Software Architecture (7/10), TypeScript (7/10)

## Plan Adherence

All plan tasks completed. Signature embedding, concurrent modification detection, test fixtures, and `global-setup.ts` define all implemented correctly.

## Critical

### C1: Missing `__GP_HMAC_KEY__` define in `vitest.config.ts`
**Raised by:** software-architecture, typescript

The plan explicitly requires adding the define to both `global-setup.ts` AND `vitest.config.ts`, and warns that omitting one causes the dev-key fallback to silently mask the missing define. Currently, unit tests hit the `typeof __GP_HMAC_KEY__ === "undefined"` guard, fall through to `DEV_KEY`, and pass — but they never exercise the injected-key code path. If the dev key constant and define value ever diverge, unit tests would silently use a different key than integration tests.

**Fix:** Add `__GP_HMAC_KEY__: JSON.stringify("goodplan-dev-hmac-key")` to the `define` block in `vitest.config.ts`.
**File:** `vitest.config.ts:8`

## Important

### I1: `atomicWrite` exported prematurely
**Raised by:** software-architecture, typescript

`atomicWrite` was changed from module-private to `export function` with a JSDoc noting it's for `verify --fix` (Phase 4). No external consumer exists yet. Exporting widens the public API surface, and other code could start importing it before Phase 4, bypassing `commitState()` and violating INV-001/INV-009. The JSDoc warning is not enforceable.

**Fix:** Remove the `export` keyword. Re-add in Phase 4 when `verify --fix` needs it.
**File:** `src/core/data/commit.ts:266`

### I2: State cache stores `newState` without `stateSignature`
**Raised by:** generalist, software-architecture

`writeStateCache(projectDir, newState)` writes the original `newState` which lacks `stateSignature` (since `embedStateSignature` avoids mutating it). On-disk `project.json` has the signature but the cached state does not. This creates a divergence: `assembleState()` returns state WITH `stateSignature`, but `loadState()` cache-hit returns state WITHOUT it. Safe today (concurrent modification check strips signatures, embed always recomputes), but a latent hazard as the codebase grows — especially if Phase 3 verification interacts with partial cache invalidation.

**Fix:** Either (a) have `embedStateSignature` return the augmented project content so the caller can patch the state before caching, or (b) add a code comment documenting the asymmetry and deferring to Phase 3.
**File:** `src/core/data/commit.ts:62`

## Minor

### M1: Redundant conditional spread on `signature`
**Raised by:** generalist, typescript

`signStateTree()` always returns `string`, so `...(signature !== undefined ? { stateSignature: signature } : {})` is misleading — it suggests undefined is possible. A plain `{ ...projectNode, stateSignature: signature }` is type-safe and clearer. The conditional spread matches the plan literally but is unnecessary.
**File:** `src/core/data/commit.ts:227`

### M2: `as Record<string, unknown>` type assertion on project node content
**Raised by:** typescript

`const projectNode = projectEntry.content as Record<string, unknown>` uses a type assertion. The downstream `projectSchema.parse()` validates, so this is acceptable — but a runtime check would be safer.
**File:** `src/core/data/commit.ts:225`

### M3: `checkConcurrentModification` behavioral asymmetry for `project.json`
**Raised by:** generalist

`project.json` uses parsed comparison (required for signature stripping) while other JSON files use byte-level comparison. Unlikely to cause issues (all writes use `deterministicStringify`) but the asymmetry deserves a comment.
**File:** `src/core/data/commit.ts:317`

### M4: Fixture `stateSignature` values coupled to dev key
**Raised by:** software-architecture

The four fixture `project.json` files contain hardcoded signatures computed with the dev HMAC key. If the dev key changes, all fixtures must be regenerated. Acceptable for Developing maturity but should be documented.
**File:** `tests/fixtures/fresh-init/.goodplan/project.json:7`

### M5: Formatting-only diff noise
**Raised by:** generalist

Several hunks are pure formatting changes (collapsed function arguments, removed blank lines). Not substantive.

## Strengths

- Clean separation: `embedStateSignature` is well-scoped, doesn't leak HMAC logic into `diffTree` or `processJsonEntry`
- Concurrent modification detection updated correctly with `stripSig` approach
- Thorough test coverage: 5 HMAC tests including write-read equivalence and child-entity-change edge case
- Disk-read optimization avoids unnecessary writes when only child entities changed
- Fixture signatures are correct 64-char hex values matching the dev key
