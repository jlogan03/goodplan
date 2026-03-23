# Software Architecture Review — Phase 04: RPC Layer (begin/complete/submit)

**Score: 8/10**
**Critical: 0 | Important: 3 | Minor: 3**

---

## Summary

The RPC layer is well-structured. Layer boundary discipline is clean: loadState → reduce → commitState with no I/O leaking into state building or result assembly. The `BeginPayloadMap` indexed-access pattern is the right approach for exhaustive per-phase typing under `exactOptionalPropertyTypes`. The `rpcInit` refactor is correct — it delegates to `begin` and does a second `loadState` to read committed state, which is the safe pattern.

---

## Important Issues

### I-1: `Target` extends spec — `{type:'project'}` not in rpc-layer-api.md

`rpc-layer-api.md` defines `Target` with four variants: `epic`, `slice`, `quest`, `decision`. The implementation adds `{type:'project'}` as a fifth variant. This is a silent spec deviation. The `project` target is required for `begin('create', {type:'project'})` to work, so either the spec is out of date or the implementation introduced an undocumented extension.

**Impact:** Any future code that pattern-matches `Target` from the spec will miss the `project` case. The spec should be updated to reflect the fifth variant, or `project` creation should be routed differently (e.g., `rpcInit` calls internal helpers directly rather than through the public `begin` surface).

### I-2: `complete.ts` — `buildCompleteResult` uses inline ternary chain for entity name, duplicated in `submit.ts`

Both `complete.ts` (line 85-88) and `submit.ts` (line 184-187) contain an identical inline ternary chain to resolve entity name from `Target`. This is precisely what `resolveEntityName` does in `begin.ts` — but that helper was not extracted to a shared location (e.g., `./types.ts` or a shared `./helpers.ts`). The duplication is a maintenance hazard: adding a new `Target` variant requires updating three places.

**Impact:** Low now, high when `Target` grows. `resolveEntityName` and `resolveEntityPath` from `begin.ts` should be moved to a shared module consumed by all three files.

### I-3: `submit.ts` — `buildSubmitResult` marks `advanced: previousStatus !== newStatus` but returns `"unknown"/"unknown"` for slice/quest targets

For non-epic targets, `resolveStatuses` returns `{ previousStatus: "unknown", newStatus: "unknown" }` (lines 216-217), so `advanced` is always `false` regardless of actual state change. This is a silent lie in the result — callers relying on `advanced` for slice/quest workflows will get incorrect data.

The comment says "deferred to slices 04-05" which is acceptable, but the returned value should make the deferral explicit (e.g., `advanced: null` with updated type, or a comment in the result) rather than silently returning a wrong value.

---

## Minor Issues

### M-1: `buildBeginEvent` uses `as` casts for payload narrowing instead of discriminated narrowing

In `buildBeginEvent`, each non-trivial case casts payload via `payload as BeginPayloadMap["create"]`. This works because the `<P extends BeginPhase>` generic constrains `payload: BeginPayloadMap[P]`, but TypeScript can't narrow `P` within a `switch` on `phase` — so the cast is necessary. This is fine but worth documenting inline why the cast is safe, to prevent future readers from removing it in favor of a "proper" fix that would actually weaken the type.

### M-2: `begin.ts` — `buildBeginResult` imports `ProjectState` via inline `import()` syntax

Line 171: `oldState: import("../tree.js").ProjectState`. This is valid TypeScript but inconsistent — `complete.ts` and `submit.ts` both import `ProjectState` at the top of the file. Should use a top-level import for consistency.

### M-3: Test for `begin('activate')` does not actually test the `ACTIVATE_EPIC` transition

The `describe("begin — ACTIVATE_EPIC")` block (begin.test.ts lines 78-103) only tests `add-verification` as a side effect. It never calls `begin(projectDir, "activate", ...)` and does not assert the `activated` status. The test name is misleading. Either rename to `begin — ADD_VERIFICATION (via activate setup)` or complete the activation path (which requires a prior `submit('refine-slices')` with passing scores).

---

## Strengths

- Exhaustive `switch` with `never` guards on both `buildBeginEvent` and `buildSubmitEvent` — compile-time exhaustiveness enforcement is correct.
- `spreadOverride` helper correctly handles `exactOptionalPropertyTypes` constraint; the pattern is sound and the comment explains the why.
- Phase mismatch guard in `submit()` (line 36-40) is the right place for this assertion — before any I/O. The per-case "Unreachable" re-checks in `buildRefinementEvent` etc. are redundant but harmless and aid local reasoning.
- `rpcInit` double-load pattern (commit via `begin`, then re-`loadState`) is correct. It avoids threading internal state between functions and is consistent with the "loadState is cheap" assumption.
- Error propagation from `StateError` → `GoodplanError` is consistent across all three files and matches the contract in rpc-layer-api.md.
- Test coverage is integration-style (real filesystem, full lifecycle paths), appropriate for this layer.
