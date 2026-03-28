# Software Architecture Review — Phase 03, Iteration 2

**Reviewer:** Software Architecture Domain Specialist
**Date:** 2026-03-22
**Score:** 9/10

---

## I1–I4 Fix Verification

### I1: Timestamps stale — FIXED correctly

`appendActivityLog` now takes an explicit `ts: string` parameter and all call sites pass `event.ts`. No usage of `Date.now()` or `new Date()` anywhere in the transition files. The sole helper is correctly the only path for writing activity log entries.

### I2: Non-null assertions — FIXED correctly

`guardEpicStatus` returns `Epic | StateError`. Every call site immediately narrows via `isStateError()` before using the result. No `!` non-null assertions remain. The `isStateError` narrowing is clean and consistent across all four transition files.

### I3: Overview.json stale — FIXED correctly

`updateOverviewStatus` is called on every status-changing operation across all handlers:
- `epic-phase.ts`: all 8 handlers call it after `setEpicStatus` or `setEntry`
- `epic-refine.ts`: advance path calls it; stay path deliberately does not (correct — status is unchanged when staying)
- `epic-lifecycle.ts`: all 3 handlers call it

One minor note: the "stay in refining" paths in `epic-refine.ts` (lines 67–74, 121–127) do not call `updateOverviewStatus`, which is semantically correct since the status is unchanged.

### I4: Missing error rows in transition exports — FIXED correctly

`epicRefineTransitions` now includes `(error)` rows for both `COMPLETE_REFINE_ARCHITECTURE` and `COMPLETE_REFINE_SLICES`. `epicLifecycleTransitions` includes `(error)` rows for `ACTIVATE_EPIC` and `COMPLETE_EPIC`. The `ABANDON_EPIC` error row (terminal-status guard) is missing from `epicLifecycleTransitions` — the spec shows `* (terminal) | ABANDON_EPIC | (error)` but the export only has the success row. This is a minor documentation gap, not a runtime defect.

---

## New Issues Introduced

### Important: `updateOverviewStatus` drops `overview.updated` field

`updateOverviewStatus` reconstructs the overview object as `{ items: [...] }`, dropping any top-level fields on the overview beyond `items`. The current `Overview` schema only has `items`, so this is not a defect today. However, if a top-level `updated` or similar field is added to `overviewSchema` later, this helper will silently drop it. The spread pattern `{ ...overview, items: [...] }` would be safer. Low risk now, worth noting.

### Minor: `epicPhaseTransitions` export has incomplete error rows

`epicPhaseTransitions` has no `(error)` rows at all. The phase handlers do return `StateError` on invalid status (via `guardEpicStatus`). The export is used for documentation/introspection — omitting error rows is inconsistent with the pattern established in `epicRefineTransitions` and `epicLifecycleTransitions` after the I4 fix.

### Minor: `ABANDON_EPIC` error row missing from `epicLifecycleTransitions`

The transition table spec (row `* (terminal) | ABANDON_EPIC | (error)`) is not reflected in the export array. The runtime behavior is correct — `isEpicTerminal` guard returns the error. The export is incomplete.

---

## Architecture Boundary Check

- All four files are pure functions with no I/O — correct per the state-machine layer contract.
- `setEntry` / `getJson` / `getJsonl` are the only tree operations used — no filesystem calls.
- `reduce.ts` uses `satisfies { [K in StateEvent["type"]]: Handler<K> }` for compile-time exhaustiveness — correct pattern, no gaps.
- The `as never` cast in `reduce.ts` line 102 is the correct idiom for Map-based dispatch where the discriminant is lost; the `satisfies` check above provides the safety guarantee.

---

## Summary

| Category | Count | Items |
|---|---|---|
| Critical | 0 | — |
| Important | 1 | `updateOverviewStatus` uses destructive object literal instead of spread (silent field-drop risk) |
| Minor | 2 | `epicPhaseTransitions` missing error rows; `epicLifecycleTransitions` missing ABANDON terminal error row |

All four I1–I4 fixes are correctly applied. No architectural boundary violations. The implementation is production-ready as written; the important finding is a latent risk that will only manifest if the `Overview` schema gains new top-level fields.
