# Phase 1 Merged Review: Decision & Rollup State Machine

**Score:** 9/10
**Findings:** Critical: 0, Important: 1, Minor: 3

## Summary

All plan tasks completed. Three new event types (CREATE_DECISION, UPDATE_DECISION, ROLLUP_LEARNINGS) added to the StateEvent union, wired in reduce.ts, with pure transition handlers and comprehensive tests. The O(n^2) learnings rollup fix in slice-complete.ts and quest-complete.ts is clean and correct. Architecture doc updated. All 53 tests pass (130 assertions). The `satisfies` exhaustiveness check in reduce.ts (updated 35 → 38) ensures compile-time completeness. No invariant violations (INV-001 through INV-007 preserved).

---

## Important

### 1. ROLLUP_LEARNINGS semantic inconsistency with inline rollup (COMPLETE_SLICE / COMPLETE_QUEST)

`ROLLUP_LEARNINGS` removes rolled-up entries from the source `learnings.jsonl` after copying to the target (idempotency design). The existing inline rollup in `COMPLETE_SLICE` and `COMPLETE_QUEST` does NOT remove source entries — it copies while leaving the per-slice/per-quest learnings intact.

This creates two risks if both mechanisms target the same source:
1. If `COMPLETE_SLICE` rolls up entries (e.g. `rollupTo: ["project"]`) and those entries remain in source, a subsequent `ROLLUP_LEARNINGS` call would duplicate them in the target.
2. Conversely, after `ROLLUP_LEARNINGS` removes source entries, the per-scope learnings file becomes an incomplete record.

Additionally, for `ROLLUP_LEARNINGS` itself: a learning tagged `rollupTo: ["epic", "project"]` that gets rolled up to "project" first is removed from source, so a subsequent rollup to "epic" would miss it. The `COMPLETE_SLICE` handler avoids this via its batch pattern — but standalone `ROLLUP_LEARNINGS` callers must ensure correct invocation order or invoke all targets in a single pass.

The implementation matches the plan spec. This is not a code bug — it is an architectural question about which mechanism owns rollup and whether they can overlap. Needs a clear rule at the RPC layer.

Files: `src/core/state/transitions/rollup-learnings.ts:86-91`
Resolution: USER_INPUT

### USER_INPUT Resolved

**Q: Dual rollup mechanism ownership — how to handle overlap?**
**A:** Deduplicate on append. When ROLLUP_LEARNINGS appends entries to the target, skip entries that already exist (match by summary+source fields). This prevents duplicates if auto-rollup already copied entries during completion. The dual mechanisms are by design — auto-rollup during completion, manual rollup for ad-hoc reorganization.

---

## Minor

### 1. `validTransitions` map re-allocated on every `handleUpdateDecision` call

The `validTransitions` Record and its inner `Set` objects are created inside the function body on every invocation. The established codebase pattern (see `DECISION_TERMINAL_STATUSES`, `SLICE_TERMINAL_STATUSES`, `EPIC_TERMINAL_STATUSES` in `helpers.ts`) is module-level constants. Performance impact is negligible for a CLI tool, but this diverges from convention.

File: `src/core/state/transitions/decision.ts:98-101`
Resolution: DIRECTLY_ACTIONABLE

### 2. `validTransitions` key type is `string` instead of typed union

The `validTransitions` Record uses `Record<string, ReadonlySet<string>>` rather than `Record<DecisionEntry["status"], ReadonlySet<DecisionEntry["status"]>>`. A typo in a key would silently pass. Using the typed union would give compile-time safety over the transition table contract.

File: `src/core/state/transitions/decision.ts:98`
Resolution: DIRECTLY_ACTIONABLE

### 3. No test for `revisiting -> revisiting` rejected transition

The transition table excludes `revisiting -> revisiting`, and the code correctly rejects it via `validTransitions`. But there is no explicit test covering this invalid-transition path. Low risk since the logic is clearly correct, but a test would improve coverage of the transition table contract.

Resolution: DIRECTLY_ACTIONABLE

---

## Correctness Confirmed

- CREATE_DECISION: correct shape, duplicate guard, activity log.
- UPDATE_DECISION: all transition table rows covered (active→active, active→revisiting, active→superseded, revisiting→active, revisiting→superseded). Terminal guard correct. `supersededBy` guard correct. Immutable `id`/`date` preserved via explicit override after spread.
- ROLLUP_LEARNINGS: source resolution, target resolution (project/epic), `rollupTo` filtering, idempotent removal, batch append, error guards — all correct.
- O(n^2) fix: both slice-complete and quest-complete batch-collect entries per scope, then do a single `getJsonl`+`setEntry` per scope. Regression tests confirm correctness with multiple entries.
- StateEvent union and StateErrorCode extended correctly.
- Architecture doc updated: `Partial<DecisionEntry>` → `Partial<Omit<DecisionEntry, "id" | "date">>`.
- No fs imports in state layer — pure functions maintained.
- `resolveTargetPath` uses `typeof ... !== "string"` narrowing instead of `isStateError()` — functionally correct but inconsistent with guard pattern used elsewhere in transition layer (`src/core/state/transitions/rollup-learnings.ts:21-44`). Not tracked as a separate item — subsumed by the consistency theme of minor #1/#2.
