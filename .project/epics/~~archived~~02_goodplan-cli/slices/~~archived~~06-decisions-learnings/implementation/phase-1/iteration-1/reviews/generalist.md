# Phase 1 Review: Decision & Rollup State Machine

**Reviewer:** Generalist
**Score:** 9/10
**Findings:** Critical: 0, Important: 1, Minor: 2

## Summary

All plan tasks completed. Three new event types (CREATE_DECISION, UPDATE_DECISION, ROLLUP_LEARNINGS) added to the StateEvent union, wired in reduce.ts, with pure transition handlers and comprehensive tests. The O(n^2) learnings rollup fix in slice-complete.ts and quest-complete.ts is clean and correct. Architecture doc updated. Build and tests pass.

## Important

1. **ROLLUP_LEARNINGS removes entries from source on rollup** — The plan specifies this for idempotency, and the implementation correctly does it. However, this means a learning tagged `rollupTo: ["epic", "project"]` that gets rolled up to "project" first will be removed from the source, so a subsequent rollup to "epic" would miss it. This is by design per the plan ("Only matching entries are rolled up... remove them from source"), but the RPC layer will need to ensure correct invocation order or invoke both targets in a single pass. The COMPLETE_SLICE handler (which does inline rollup) handles multi-target correctly via the batch pattern — so this is only a concern for the standalone ROLLUP_LEARNINGS event. Worth documenting at the RPC layer.

## Minor

1. **No test for `revisiting -> revisiting` rejection** — The transition table excludes `revisiting -> revisiting`, and the code correctly rejects it via the `validTransitions` map. However, there is no explicit test covering this invalid transition. Low risk since the logic is clearly correct, but adding one would improve coverage of the transition table contract.

2. **`validTransitions` map recreated on every call** — In `handleUpdateDecision`, the `validTransitions` record with its `new Set(...)` values is allocated on every invocation. This is a hot-path-irrelevant micro-optimization concern — but moving it to module scope (like `DECISION_TERMINAL_STATUSES`) would be more consistent with the pattern already used in that file.

## Correctness

- CREATE_DECISION: correct shape, duplicate guard, activity log — all verified.
- UPDATE_DECISION: all transition table rows covered (active->active, active->revisiting, active->superseded, revisiting->active, revisiting->superseded). Terminal guard correct. supersededBy guard correct. Immutable id/date preserved via explicit override after spread.
- ROLLUP_LEARNINGS: source resolution, target resolution (project/epic), rollupTo filtering, idempotent removal, batch append, error guards — all correct.
- O(n^2) fix: both slice-complete and quest-complete now batch-collect entries per scope, then do a single getJsonl+setEntry per scope. Regression tests confirm correctness with multiple entries.
- StateEvent union and StateErrorCode extended correctly. Exhaustiveness test updated from 35 to 38.
- Architecture doc (state-machine-api.md) updated: `Partial<DecisionEntry>` -> `Partial<Omit<DecisionEntry, "id" | "date">>`.
- No fs imports in state layer — pure functions maintained.
