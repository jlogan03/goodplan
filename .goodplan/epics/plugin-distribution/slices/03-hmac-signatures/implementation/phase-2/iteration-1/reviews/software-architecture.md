# Software Architecture Review — Phase 2: Write Path Integration (Iteration 1)

## Issues

**[CRITICAL]** `vitest.config.ts` missing `__GP_HMAC_KEY__` define — unit tests silently use dev-key fallback
The plan explicitly states: "both `global-setup.ts` AND `vitest.config.ts` need defines" and warns that "If one is omitted, the dev-key fallback in `getHmacKey()` silently masks the missing define." The `global-setup.ts` was correctly updated with the `--define __GP_HMAC_KEY__` entry, but `vitest.config.ts` still only defines `__GOODPLAN_VERSION__`. Unit tests that import source files directly (e.g., `commit.test.ts` importing `hmac.ts`) hit the `typeof __GP_HMAC_KEY__ !== "undefined"` guard, which evaluates to `false` because Vitest's module transform never replaces the identifier. The code falls through to `DEV_KEY` — which happens to be the same value `"goodplan-dev-hmac-key"` — so tests pass, but they never exercise the injected-key code path. This is exactly the silent masking the plan warned about.

Fix: Add `__GP_HMAC_KEY__: JSON.stringify("goodplan-dev-hmac-key")` to the `define` block in `vitest.config.ts`.
File: vitest.config.ts:8
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `atomicWrite` exported but plan scope is write-path integration only
`atomicWrite` was changed from a module-private function to `export function atomicWrite(...)`. The JSDoc comment says "Callers outside commit.ts should be limited to `verify --fix`" — but there are currently no external callers (grep confirms no imports of `atomicWrite` from outside `commit.ts`). Exporting it pre-emptively widens the module's public API surface. This is a shallow change (the function was already callable internally), but it means a future Phase 3 (`verify --fix`) will find the export ready. The concern: if other code starts importing `atomicWrite` before `verify --fix` is built, writes will bypass `commitState()` and violate INV-001 (all mutations through state machine) and INV-009 (signature embedding). The JSDoc warning is good but not enforceable.

Consider: keep `atomicWrite` unexported until Phase 3 needs it, or add an `@internal` annotation and a fitness function that asserts only `commit.ts` and `verify.ts` import it.
File: src/core/data/commit.ts:266
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** State cache stores `newState` without embedded `stateSignature`
`writeStateCache(projectDir, newState)` is called at line 62 with the original `newState` — which does NOT contain the `stateSignature` field because `embedStateSignature` deliberately avoids mutating `newState`. The on-disk `project.json` has `stateSignature`, but the cached state tree does not. This divergence is safe today because:
1. `loadState` returning cached state as `oldState` for the next `commitState` triggers `checkConcurrentModification` which strips `stateSignature` from both sides.
2. `embedStateSignature` always recomputes and embeds regardless of what's in `newState`.

However, this divergence creates a subtle inconsistency: `assembleState()` returns state WITH `stateSignature`, but `loadState()` (cache hit) returns state WITHOUT it. Any caller comparing states from these two paths would see different trees for the same on-disk content. This is not a bug today but is a latent hazard as the codebase grows.

No immediate fix required — but document this asymmetry in a code comment near `writeStateCache` and consider whether the cache should store the post-signature state instead.
File: src/core/data/commit.ts:62
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `processJsonEntry` unchanged-check compares pre-signature content for project.json
When `embedStateSignature` finds an existing `jsonWrites` entry for `project.json` (the common case when project.json changed), it overwrites the entry's `content` with the signature-embedded version. This works correctly. But when project.json is unchanged (no entry in `jsonWrites`), `embedStateSignature` creates a new entry and compares against on-disk content to skip unnecessary writes. The on-disk content has the old signature; the new content has the new signature. If only child entities changed, the signature changes, so the write proceeds correctly. If nothing changed at all, `signStateTree(newState)` produces the same signature (deterministic), so the on-disk comparison correctly skips the write. This is architecturally sound.
File: src/core/data/commit.ts:210
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Fixture `stateSignature` values are dev-key-dependent
The four fixture `project.json` files now contain hardcoded `stateSignature` hex strings computed with the dev HMAC key. If the dev key constant changes, all fixtures must be regenerated. This coupling is acceptable for Developing maturity but should be documented.
File: tests/fixtures/fresh-init/.goodplan/project.json:7
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The core architectural integration is well-designed: `embedStateSignature` is correctly positioned between `diffTree` and the flush loop, the concurrent modification check properly strips signatures, and the test suite covers the four required scenarios plus the child-entity-change edge case. The critical gap is the missing `vitest.config.ts` define, which means unit tests are not actually exercising the compile-time key injection path — the exact failure mode the plan warned about. The `atomicWrite` export and cache divergence are secondary concerns. Fixing the vitest define and reverting the `atomicWrite` export would bring this to 9+.

## Summary
- Critical: 1
- Important: 2
- Minor: 2
