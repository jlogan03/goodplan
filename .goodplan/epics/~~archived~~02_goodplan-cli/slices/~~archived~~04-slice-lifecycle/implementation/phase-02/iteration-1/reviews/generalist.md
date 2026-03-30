# Phase 02 Review: Slice State Machine Transitions

**Reviewer**: Generalist
**Score**: 9/10

## Summary

Excellent implementation of the most complex phase in the slice lifecycle. All 5 handler files and 5 test files are well-structured, follow established patterns from the epic state machine, and correctly implement the plan's requirements. The refactoring of `slice-submit.ts` to use shared helpers eliminates all `slice!` non-null assertions cleanly. The `COMPLETE_SLICE` handler correctly implements all 6 documented steps (deferred routing, learnings rollup, architecture deltas, status update, activeSlice clearing, activity log).

## Plan Adherence

All plan tasks are completed:

- [x] `slice-create.ts` — CREATE_SLICE with duplicate guard, epic existence guard, overview update, sliceSequence update
- [x] `slice-plan.ts` — BEGIN_PLAN with sequential enforcement guard (checks previous slice in sliceSequence)
- [x] `slice-implement.ts` — BEGIN_REFINEMENT (initializes refinement) + BEGIN_IMPLEMENTATION (guards plan-refined.md)
- [x] `slice-complete.ts` — COMPLETE_SLICE with all 6 steps per plan (deferred routing, learnings, arch deltas, status, activeSlice clear, activity log)
- [x] `slice-abandon.ts` — ABANDON_SLICE from non-terminal states, clears activeSlice if active
- [x] `reduce.ts` — placeholder stubs replaced with real imports
- [x] Transition tables exported from each handler
- [x] Shared helpers added to `helpers.ts` (getSlice, guardSliceStatus, setSliceJson, setSliceStatus, updateSliceOverviewStatus, isSliceTerminal)
- [x] `slice-submit.ts` refactored: local helpers removed, `isStateError()` narrowing replaces `err !== null` + `slice!`, TODO comment added for quest helper consolidation
- [x] Tests cover all specified scenarios

## Code Reuse

Strong code reuse throughout:
- `guardSliceStatus` return type changed from `StateError | null` to `Slice | StateError` (matching `guardEpicStatus` pattern), enabling direct narrowing without non-null assertions
- `setSliceStatus` correctly bundles status + overview sync + timestamp to prevent partial updates
- `appendActivityLog` reused in every handler
- `evaluateRefinement` shared helper reused for refinement logic

## Cross-File Integration

- `reduce.ts` cleanly imports all new handlers, removes `handleNotImplemented` placeholder
- `slice-submit.ts` correctly imports shared helpers from `helpers.ts` and uses new narrowing pattern
- `helpers.ts` import organization updated (type imports moved to top, formatter-driven reformat)
- Tests exercise full lifecycle paths (e.g., slice-plan test runs a slice from created through completed to unblock a second slice)

## Issues

### Important (1)

1. **ABANDON_SLICE does not record `reason` in slice.json** (slice-abandon.ts:46). The plan says "Sets abandoned, records reason" but the handler only uses `reason` in the activity log summary string. The `Slice` schema has no `reason` field, so this is consistent with the epic abandon pattern (epics also only log reason). However, the plan text is ambiguous. If the intent is activity-log-only, this is fine. If the intent was to persist `reason` on the entity, it would require a schema change. **Verdict**: likely intentional given epic precedent, but worth confirming.

### Minor (2)

1. **`handleBeginRefinement` uses `setSliceJson` + `updateSliceOverviewStatus` separately** (slice-implement.ts:44-50) instead of `setSliceStatus`. This is functionally correct because `setSliceStatus` can't simultaneously set the refinement field (it spreads the original slice object). However, the plan lists `setSliceStatus` as the intended sugar for all status changes. A small refactor could pass a pre-modified slice to `setSliceStatus`: `setSliceStatus(tree, name, {...sliceOrErr, refinement: ...}, "refining", ts)`. This would be cleaner and ensure the "bundle all status-change side effects" invariant is maintained through the helper.

2. **Import ordering in new files** — several new files (slice-create.ts, slice-plan.ts, slice-implement.ts, slice-complete.ts) have type imports placed before the module docstring comment. For example in `slice-create.ts`, the `import type` for Epic, Overview, SliceStatus appears on lines 1-3, before the `/** ... */` JSDoc block on lines 4-9. The existing codebase pattern (e.g., epic handlers) places the docstring first. This is cosmetic only and biome doesn't flag it, but it's inconsistent with existing convention.

## Strengths

- The `COMPLETE_SLICE` handler is impressively thorough: deferred routing with skip+warn for missing targets (INV-007), learnings with per-target rollup, architecture deltas with ts injection, and clean separation of concerns (state machine writes data, RPC layer derives counts)
- Sequential enforcement in `BEGIN_PLAN` correctly uses the epic's `sliceSequence` array and overview status lookup
- Test coverage is comprehensive: 39 new tests covering happy paths, guards, edge cases (deferred to nonexistent target), lifecycle integration (completing slice to unblock next)
- The `guardSliceStatus` return-type change from `StateError | null` to `Slice | StateError` is a meaningful improvement that removes all `slice!` assertions in `slice-submit.ts`
