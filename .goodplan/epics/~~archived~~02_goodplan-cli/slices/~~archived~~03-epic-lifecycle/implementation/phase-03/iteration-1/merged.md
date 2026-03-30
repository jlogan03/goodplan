# Phase 03 Merged Review — Epic State Machine Transitions

**Reviewers:** Generalist (8/10), Software Architecture (8/10), TypeScript (9/10)
**Consensus Score: 8/10**
**Critical: 0 | Important: 4 | Minor: 4**

---

## Important Issues

### I1. `updated` timestamp stale on most epic transitions (and activity log inherits staleness)

**Raised by:** All three reviewers (Generalist I1, Architecture I2, TypeScript I2)

`setEpicStatus` only overrides `status`, leaving `updated` frozen at creation. Only `CREATE_EPIC` and `ACTIVATE_EPIC` set `updated`. All phase transitions (BEGIN_EXPLORE, COMPLETE_EXPLORE, BEGIN_ARCHITECTURE, etc.) leave it stale.

Compounding this: `appendActivityLog` uses `project.updated` as its timestamp source (helpers.ts:82), which itself stagnates after `INIT_PROJECT`. Activity log entries for phase transitions all carry the project creation timestamp.

Events without `ts` have no timestamp to inject — this is by design ("only events that produce timestamped entities carry `ts`"). The question is whether the RPC layer should inject `updated` before calling `reduce()`, or the state machine needs `ts` on more events.

**Resolution:** USER_INPUT — decide on timestamp propagation strategy and document the decision.

### I2. Non-null assertions (`!`) after guard functions — replace with narrowing return type

**Raised by:** Generalist (M1), TypeScript (I1)

30+ `epic!`, `slice!`, `quest!` assertions across all handler files. The guard functions confirm entities are defined but TypeScript can't narrow through the helper return. Logically safe but verbose and a maintenance concern.

**Recommendation:** Have guard functions return `Epic | StateError` (or a discriminated union) so `isStateError()` check narrows the type, eliminating all `!` assertions.

**Resolution:** DIRECTLY_ACTIONABLE

### I3. Overview.json not updated on epic status changes after creation

**Raised by:** Architecture (I1)

`CREATE_EPIC` inserts into overview.json with `status: "created"`, but no subsequent handler updates it. Overview permanently shows `status: "created"` regardless of actual lifecycle state. This is consistent with the documented spec (state-machine-api.md doesn't list overview.json as a write target for these events), but `epic:list --json` will return stale data.

**Resolution:** USER_INPUT — clarify whether overview is rebuilt at read time, deferred to a later slice, or needs handler updates now.

### I4. Missing error rows in transition table exports

**Raised by:** Generalist (I3)

`epicRefineTransitions`, `sliceSubmitTransitions` exports omit error transition rows (e.g., `refining -> (error)` for STATE_MAX_ROUNDS_REACHED). Fitness functions cannot verify error paths without these.

**Recommendation:** Include error rows with `to: "(error)"` in all transition exports.

**Resolution:** DIRECTLY_ACTIONABLE

---

## Minor Issues

### M1. `evaluateRefinement` skip-path behavior deserves clarifying comment

**Raised by:** Generalist (I2), Architecture (M2)

When `refinement === null` and scores are below threshold, `evaluateRefinement` returns `advance`. This is correct for skip paths (entering from a non-refining status) but may surprise callers who expect scores to matter. The existing comment ("No refinement state yet") could note explicitly that scores are ignored on skip paths because no refinement state was initialized.

**Resolution:** DIRECTLY_ACTIONABLE

### M2. Hardcoded `maxRounds: 10` in BEGIN_REFINE handlers

**Raised by:** Generalist (M3)

`handleBeginRefineArchitecture` and `handleBeginRefineSlices` both hardcode `maxRounds: 10`. Should come from a config constant or event payload. Duplicated in two places.

**Resolution:** DIRECTLY_ACTIONABLE

### M3. `override` optional type mismatch between StateEvent and RefinementInput

**Raised by:** TypeScript (M2)

`StateEvent` uses `override?: boolean` (omission allowed, explicit `undefined` forbidden under `exactOptionalPropertyTypes`). `RefinementInput` uses `override?: boolean | undefined` (both allowed). Types are inconsistent though behavior is correct because `=== true` handles both. Align the types.

**Resolution:** DIRECTLY_ACTIONABLE

### M4. Duplicate helper patterns between epic and slice/quest handlers

**Raised by:** Architecture (M1)

`getSlice`, `setSliceJson`, `guardSliceStatus` etc. in `slice-submit.ts` mirror epic helpers in `helpers.ts`. Fine for this phase but will need extraction when slice/quest lifecycle slices arrive.

**Resolution:** DIRECTLY_ACTIONABLE (defer to slice 04/05, note as tech debt)

---

## Strengths (consensus)

- Handler Map with `satisfies` exhaustiveness checking ensures compile-time completeness
- Zero I/O imports — pure functions throughout, clean layering
- Shared `evaluateRefinement` circuit breaker is well-factored deep module
- All 66 tests pass covering happy paths, error paths, circuit breaker, skip paths, override
- Transition table exports provided for fitness function enumeration
- Correct use of `Extract<StateEvent, {type: T}>` narrowing, `import type`, `noUncheckedIndexedAccess`
