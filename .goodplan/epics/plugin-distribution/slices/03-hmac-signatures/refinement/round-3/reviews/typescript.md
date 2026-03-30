# TypeScript and JavaScript Review — HMAC Signatures (Round 3)

## Issues

**[IMPORTANT]** Phase 2: Signature computation approach has a correctness gap with the described flow

The plan says to compute the signature "from the actual serialized content that will be written to disk (the `PendingWrite` content strings), not from the in-memory `newState`." This is good — it addresses the Zod round-trip concern from round 2. However, the plan then says to adapt `serializeForHmac()` to accept this content. But `serializeForHmac()` is defined in Phase 1 as accepting `ProjectState` and calling `serializeStateTree()`. These are two incompatible signatures. The plan needs to pick one:

Option A: Keep `serializeForHmac(state: ProjectState)` as designed in Phase 1. Call it after `diffTree()` on `newState`. Accept the (tiny, theoretical) Zod round-trip risk — in practice, `newState` content was already Zod-validated on read via `assembleState()`, and the state machine is pure (INV-003), so no new keys or coercions are introduced. This is simpler and consistent with Phase 1's design.

Option B: Change `serializeForHmac` to accept the PendingWrite content strings. This means Phase 1's signature and tests need updating, and the function no longer operates on the typed `ProjectState` — it would work on raw serialized strings, losing type safety.

Option A is cleaner. The plan should commit to it and remove the contradictory "adapted to accept this content" language.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3: `incrementalUpdate` path in `loadState` bypasses HMAC verification

The plan says to verify HMAC "only on the `assembleState()` fallback path, NOT on cache hits." This is correct for pure cache hits. But `loadState` has a third code path: `incrementalUpdate()` (lines 84-85 of `load.ts`), triggered when directory mtimes changed but no full reassembly is needed. `incrementalUpdate` returns a state that was partially reconstructed from disk — it is neither a trusted cache hit nor a full `assembleState()` result. The plan should specify whether HMAC verification runs after `incrementalUpdate`. Since incremental updates re-read files from disk (potential tampering vector), verification should apply here too. One simple approach: verify on any non-cache-hit return (both `assembleState()` and `incrementalUpdate()` paths).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4: `verify --fix` should validate through Zod before writing

The plan says `verify --fix` uses `atomicWrite()` to write `goodplan.json` directly. Since it bypasses `commitState()` (and `processJsonEntry`), it also bypasses Zod validation (INV-005). While the data was just read via `assembleState()` (which does validate), the newly injected `stateSignature` field means the written object differs from what was validated. The plan should specify: validate the complete project object (including `stateSignature`) through `projectSchema.parse()` before writing — this costs one parse call and preserves INV-005 compliance.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3: `vitest.config.ts` define and `global-setup.ts` define serve different purposes — plan should clarify

The plan adds `__GP_HMAC_KEY__` to both `vitest.config.ts` (Phase 3) and `global-setup.ts` (Phase 2). These serve different purposes: `vitest.config.ts` defines the value for unit tests (source imports transformed by Vitest), while `global-setup.ts` defines it for the compiled binary (integration tests). The plan's Phase 2 note about incorrect quoting causing silent fallback is good. But the Phase 3 task for `vitest.config.ts` uses `JSON.stringify("goodplan-dev-hmac-key")` (producing `"\"goodplan-dev-hmac-key\""`) while Phase 2's `global-setup.ts` uses `"__GP_HMAC_KEY__=\"goodplan-dev-hmac-key\""`. These must produce the same effective string value at runtime. The `JSON.stringify` approach is correct for Vitest's `define` (which expects a JS expression string). The `global-setup.ts` approach wraps in escaped quotes for Bun's `--define` flag. Both should resolve to the string `goodplan-dev-hmac-key` at runtime, which they do — but the plan should add a brief note confirming parity to prevent future confusion.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1: `getHmacKey()` should use the same `typeof` guard pattern as `version.ts`

The plan declares `const __GP_HMAC_KEY__: string | undefined` and says `getHmacKey()` returns it if defined, else a dev key. But the existing `version.ts` pattern uses `typeof __GOODPLAN_VERSION__ !== "undefined"` as the guard — this is important because `--define` replaces the identifier textually, and at compile time the value might be the string literal itself (not `undefined`). Using `__GP_HMAC_KEY__ !== undefined` could behave differently from `typeof __GP_HMAC_KEY__ !== "undefined"` depending on how Bun handles the define replacement. The plan should specify the `typeof` guard to match the established pattern.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Significant improvement from round 2. All four IMPORTANT issues from round 2 are addressed: immutable injection via spread is specified, `assembleState` call sites in `status.ts` and `state.ts` are enumerated with the fix (switch to `loadState`), the `verify --fix` write mechanism is now explicit (`atomicWrite` export), and the Zod round-trip concern is addressed (compute from PendingWrite content). The remaining issues are one IMPORTANT (contradictory signature for `serializeForHmac` between Phase 1 and Phase 2) and four MINOR (incremental update verification gap, verify --fix Zod validation, define parity note, typeof guard pattern). To reach 9+: resolve the Phase 1/Phase 2 `serializeForHmac` signature contradiction and address the `incrementalUpdate` verification gap.

## Summary
- Critical: 0
- Important: 1
- Minor: 4
