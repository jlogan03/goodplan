# Merged Review — Phase 04: RPC Layer (begin/complete/submit)

**Scores:** Software Architecture 8/10 | TypeScript 9/10
**Critical: 0 | Important: 4 | Minor: 3**

---

## Summary

The RPC layer is well-structured. Layer boundary discipline is clean: `loadState → reduce → commitState` with no I/O leaking into state building or result assembly. The `BeginPayloadMap` indexed-access pattern is the right approach for exhaustive per-phase typing under `exactOptionalPropertyTypes`. The `rpcInit` refactor is correct — it delegates to `begin` and does a second `loadState` to read committed state, which is the safe pattern. `verbatimModuleSyntax` is respected throughout and `noUncheckedIndexedAccess` has no obvious violations.

---

## Important Issues

### I-1: `Target` extends spec — `{type:'project'}` not in rpc-layer-api.md

`rpc-layer-api.md` defines `Target` with four variants: `epic`, `slice`, `quest`, `decision`. The implementation adds `{type:'project'}` as a fifth variant. This is a silent spec deviation. The `project` target is required for `begin('create', {type:'project'})` to work, so either the spec is out of date or the implementation introduced an undocumented extension.

**Impact:** Any future code that pattern-matches `Target` from the spec will miss the `project` case. Either update the spec to reflect the fifth variant, or route `project` creation differently (e.g., `rpcInit` calls internal helpers directly rather than through the public `begin` surface).

### I-2: Shared entity resolution helpers not extracted (duplication across begin/complete/submit)

`begin.ts` defines `resolveEntityName` and `resolveEntityPath`, but they were not extracted to a shared module. Both `complete.ts` (lines 85–88) and `submit.ts` (lines 184–187) contain an identical inline ternary chain duplicating `resolveEntityName`. Adding a new `Target` variant requires updating three places.

**Impact:** Maintenance hazard that grows as `Target` grows. Extract `resolveEntityName` (and `resolveEntityPath`) to `types.ts` or a small `rpc-utils.ts` helper, then consume from all three files.

### I-3: `submit.ts` — `buildSubmitResult` returns `advanced: false` silently for slice/quest targets

For non-epic targets, `resolveStatuses` returns `{ previousStatus: "unknown", newStatus: "unknown" }` (lines 216–217), so `advanced` is always `false` regardless of actual state change. The comment says "deferred to slices 04-05" which is acceptable, but the returned value silently lies — callers relying on `advanced` for slice/quest workflows will get incorrect data.

**Recommendation:** Make the deferral explicit: use `advanced: null` with an updated type, or add a comment in the result object. Do not return a semantically wrong value silently.

### I-4: `buildCompleteResult` in `complete.ts` — `entityPath = "unknown"` fallback is dead but dangerous code

For slice/quest targets, `buildCompleteEvent` throws before `buildCompleteResult` is reached, making the `entityPath = "unknown"` path dead code. However, it is misleading: a future contributor adding slice/quest support to `buildCompleteEvent` without updating `buildCompleteResult` will get silently wrong statuses.

**Recommendation:** Replace the `entityPath = "unknown"` fallback with an explicit `throw new GoodplanError("INTERNAL_ERROR", ...)`, or extract status resolution to a shared helper (aligns with I-2 above).

---

## Minor Issues

### M-1: `buildBeginEvent` — `as` casts for payload narrowing, not documented

In `buildBeginEvent`, non-trivial cases cast payload via `payload as BeginPayloadMap["create"]`. The `<P extends BeginPhase>` generic constrains `payload: BeginPayloadMap[P]`, but TypeScript cannot narrow `P` within a `switch` on `phase`, so the cast is necessary. The inline `add-verification` and `update-verification` branches should use the typed helper pattern already applied to `buildCreateEvent` and `buildAbandonEvent`. At minimum, add an inline comment explaining why the cast is safe, to prevent future readers from removing it.

### M-2: `begin.ts` — inline `import(...)` in function signature

`buildBeginResult` at line 170 uses `import("../tree.js").ProjectState` rather than a top-level `import type`. This is valid but inconsistent with the rest of the file and with `complete.ts` / `submit.ts`, which both use top-level `import type { ProjectState }`. Use a top-level import for consistency.

### M-3: `begin.test.ts` — `describe("begin — ACTIVATE_EPIC")` block is misleadingly named

The block only tests `add-verification` as a side effect. It never calls `begin(projectDir, "activate", ...)` and does not assert the `activated` status. Either rename to `begin — ADD_VERIFICATION (via activate setup)` or complete the activation path (which requires a prior `submit('refine-slices')` with passing scores).

---

## Strengths

- `BeginPayloadMap` with `Record<string, never>` for no-payload phases is correct — avoids `undefined` as a positional arg and satisfies `exactOptionalPropertyTypes`.
- Exhaustive `switch` with `never` guards on both `buildBeginEvent` and `buildSubmitEvent` provide compile-time completeness guarantees.
- `spreadOverride` helper correctly handles `exactOptionalPropertyTypes` constraint; the pattern is sound and the comment explains the why.
- Phase-mismatch guard in `submit()` (line 36–40) is the right place for this assertion — before any I/O. The per-case "Unreachable" re-checks are redundant but harmless.
- `rpcInit` double-load pattern (commit via `begin`, then re-`loadState`) is correct and consistent with the "loadState is cheap" assumption.
- Error propagation from `StateError` → `GoodplanError` is consistent across all three files and matches the contract in rpc-layer-api.md.
- Test coverage is integration-style (real filesystem, full lifecycle paths) — appropriate for this layer. All implemented phases tested, phase-mismatch assertion tested, error propagation tested.
