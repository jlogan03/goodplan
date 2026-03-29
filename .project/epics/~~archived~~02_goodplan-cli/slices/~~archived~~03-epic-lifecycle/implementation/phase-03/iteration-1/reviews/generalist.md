# Phase 03 Review: Epic State Machine Transitions

**Reviewer:** Generalist
**Score:** 8/10
**Critical: 0, Important: 3, Minor: 3**

---

## Summary

Solid implementation. The `reduce.ts` refactor to handler Map with `satisfies` exhaustiveness checking is clean. All ~20 transition handlers are present as pure functions, no fs imports found, 66 tests pass. The shared refinement circuit breaker in `helpers.ts` is well-factored and reused across epic-refine and slice/quest submit handlers. Transition table exports are provided for fitness function enumeration.

---

## Important Issues

### I1. `updated` timestamp not set on most epic transitions

The `setEpicStatus` helper (helpers.ts:22-32) spreads the existing epic and only overrides `status`. It does NOT update the `updated` field. The Epic schema requires `updated: timestampSchema` (epic.ts:46). Most phase handlers (`BEGIN_EXPLORE`, `COMPLETE_EXPLORE`, `BEGIN_ARCHITECTURE`, etc.) use `setEpicStatus`, so the `updated` field stays frozen at the creation timestamp through the entire lifecycle. Only `ACTIVATE_EPIC` explicitly sets `updated`.

This is problematic because:
- Events like `BEGIN_EXPLORE`, `COMPLETE_EXPLORE` etc. don't carry a `ts` field (by design -- "Only events that produce timestamped entities carry `ts`"), so the handler doesn't have a timestamp to set.
- The RPC layer may inject `updated` later, but the state machine contract says it produces the new state -- downstream consumers could see stale `updated` values.

**Recommendation:** Decide whether `updated` should be set by the state machine (requiring `ts` on more events) or by the RPC layer post-reduce. Document the decision explicitly. If the RPC layer handles it, add a comment in `setEpicStatus` noting this.

### I2. `evaluateRefinement` with `refinement === null` and low scores silently advances

In `helpers.ts:144-146`, when `refinement === null` (skip path from a non-refining status) AND scores are below threshold AND override is false, the function returns `{ action: "advance" }`. This means COMPLETE_REFINE_ARCHITECTURE from `architecture-defined` with scores of 3 will still advance to `architecture-refined`.

Per transition-tables.md row 25, the skip path from `architecture-defined` is unconditional (no guard), so this is arguably correct. But the same `evaluateRefinement` is called for `COMPLETE_REFINE_SLICES` from `slices-defined` (row 31, also unconditional skip). The behavior is consistent with the transition table but may surprise callers who expect scores to matter on skip paths.

**Recommendation:** Add a comment in `evaluateRefinement` at the `refinement === null` branch explaining that this is the skip-path behavior and that scores are ignored when there's no refinement state (because the entity was never in a refining status).

### I3. Missing transition table rows in `sliceSubmitTransitions` export

The transition-tables.md shows for COMPLETE_REFINEMENT_ROUND:
- Row 71: `refining -> refining` (scores below, round < max, !override)
- Row 72: `refining -> plan-refined` (scores meet OR override)
- Row 73: `refining -> (error)` (round >= max AND !override)
- Row 74: `plan-created -> plan-refined` (scores meet, first round skip)

The `sliceSubmitTransitions` export (slice-submit.ts:272-278) includes rows for `plan-created -> plan-refined`, `refining -> refining`, `refining -> plan-refined`, but does NOT include the error row (`refining -> (error)` for STATE_MAX_ROUNDS_REACHED). Same gap for quest variants.

Similarly, `epicRefineTransitions` (epic-refine.ts:125-132) omits the error rows from the transition tables.

**Recommendation:** Include error transition rows in the exports (with `to: "(error)"`) so fitness functions can verify the full transition spec including error paths.

---

## Minor Issues

### M1. Non-null assertions (`!`) used extensively

Throughout all handlers, `epic!`, `slice!`, `quest!` are used after the guard check. While logically safe (the guard returns an error if undefined), TypeScript's control flow doesn't narrow past the helper function. Consider having guard functions return the entity via a discriminated union instead:
```
type GuardResult<T> = { ok: true; entity: T } | { ok: false; error: StateError }
```
This would eliminate all `!` assertions.

### M2. `appendActivityLog` uses `project.updated` as timestamp fallback

In `helpers.ts:82`, `appendActivityLog` uses `project?.updated ?? ""` for the timestamp. For events that don't carry `ts`, this means the activity log timestamp equals the project's last `updated` value, which could be stale (see I1). The activity log entries may all share the same timestamp as `INIT_PROJECT`.

### M3. Hardcoded `maxRounds: 10` in BEGIN_REFINE handlers

`handleBeginRefineArchitecture` (epic-phase.ts:94) and `handleBeginRefineSlices` (epic-phase.ts:142) hardcode `maxRounds: 10`. This value should ideally come from a config constant or the event payload to allow per-epic customization. Currently it's duplicated in two places.

---

## Verification Checklist

- [x] All transition rows from transition-tables.md are implemented as handlers
- [x] Guards match the spec (status checks, cross-cutting guards for ACTIVATE/COMPLETE_EPIC)
- [x] Activity log entries appended on every transition
- [x] No fs imports in src/core/state/ (confirmed via grep)
- [x] Tests cover key paths: happy path, error paths, circuit breaker, skip paths, override
- [x] `satisfies` exhaustiveness checking ensures every StateEvent type has a handler
- [x] Transition table exports provided for fitness function enumeration
- [ ] `updated` timestamp propagation (see I1)
- [ ] Error rows in transition exports (see I3)
