# Merged Review: Phase 02 — Slice State Machine Transitions

**Scores**: Generalist 9/10 | TypeScript 9/10 | SoftwareArchitecture 7/10
**Consensus score**: ~8/10

## Summary

Strong implementation overall: clean module decomposition, consistent use of the `Entity | StateError` guard pattern in all new handlers, comprehensive test coverage (39 tests, all passing), and correct implementation of all 6 COMPLETE_SLICE steps. Two real bugs require fixing before the phase is complete — the overview sync gap is the more serious of the two.

---

## Important Issues (2)

### 1. slice-submit.ts handlers do not sync slices/overview.json on status change

**Source**: TypeScript + SoftwareArchitecture (converging; SA more specific — use SA version)

The three pre-existing handlers in `slice-submit.ts` — `handleCompletePlan`, `handleCompleteRefinementRound`, and `handleCompleteImplementation` — call `setSliceJson()` directly and never call `updateSliceOverviewStatus()` or `setSliceStatus()`. This violates the documented invariant: "Overview.json must be synced by every status-changing handler." The refactoring of `slice-submit.ts` correctly migrated the guard pattern from `StateError | null` to `Entity | StateError`, but missed the overview sync that `setSliceStatus()` was designed to enforce.

Effect: transitions to `plan-created`, `plan-refined`, and `implementation-complete` silently leave `slices/overview.json` showing stale status, which corrupts `list` command output.

Files: `src/core/state/transitions/slice-submit.ts:84`, `:121`, `:132`, `:150`

**Fix**: Replace `setSliceJson()` calls in the three handlers with `setSliceStatus()` where the status is being changed. For `handleCompleteRefinementRound`'s "stay in refining" path (which also sets the `refinement` field), either call `setSliceStatus()` and then update the refinement separately, or call `setSliceJson()` followed by `updateSliceOverviewStatus()`.

---

### 2. handleBeginRefinement and handleBeginImplementation write project.json activeSlice unnecessarily

**Source**: SoftwareArchitecture only

Both handlers set `project.json.activeSlice` to the current slice. Per `transition-tables.md`, only `BEGIN_PLAN` writes `project.json activeSlice`. The slice is already active from `BEGIN_PLAN` — these handlers re-write the same value. This diverges from the spec and adds unnecessary writes. More importantly, if a future handler clears `activeSlice` between phases, these handlers would re-set it, masking that design change.

Files: `src/core/state/transitions/slice-implement.ts:34`, `:84`

**Fix**: Remove the `project.json` activeSlice write from `handleBeginRefinement` and `handleBeginImplementation`.

---

## Minor Issues (2)

### 3. handleBeginRefinement uses setSliceJson + updateSliceOverviewStatus instead of setSliceStatus

**Source**: Generalist + TypeScript + SoftwareArchitecture (all three; use SA version as most specific)

`handleBeginRefinement` in `slice-implement.ts` (lines 44–50) manually calls `setSliceJson()` then `updateSliceOverviewStatus()` as two separate steps rather than going through `setSliceStatus()`. This is functionally correct (issue #1 above is the real bug; this handler does sync the overview) but is fragile — a future editor could remove the overview sync call without realizing it's needed. The `setSliceStatus()` helper was specifically created to prevent partial updates by bundling status + timestamp + overview sync.

File: `src/core/state/transitions/slice-implement.ts:44`

**Fix**: Call `setSliceStatus()` with the pre-modified slice (including the `refinement` field) to preserve the "bundle all status-change side effects" invariant. Or call `setSliceStatus()` first, then `setSliceJson()` to write the `refinement` field.

---

### 4. Quest helpers in slice-submit still use the old StateError | null + ! assertion pattern

**Source**: SoftwareArchitecture

The quest helpers (`guardQuestStatus`, `getQuest`, `setQuestJson`) in `slice-submit.ts` still use the old `StateError | null` guard pattern, resulting in 10+ `quest!` non-null assertions. The new slice handlers use the correct `Entity | StateError` pattern. The coexistence of both patterns in the same file is noted but already tracked by `// TODO(slice-05): consolidate quest helpers to helpers.ts`.

File: `src/core/state/transitions/slice-submit.ts:46`

**No fix needed now** — deferred to slice 05 per existing TODO. Acceptable as-is.

---

## Resolved / Not Issues

- **ABANDON_SLICE does not record `reason` in slice.json** (generalist): Only logs reason in activity log, consistent with epic abandon precedent. Likely intentional.
- **Import ordering in new handler files** (generalist): Type imports before JSDoc docstring. Cosmetic, biome doesn't flag it — skip.
- Two retracted TS minor items: `setEntry` is used; `updateSliceOverviewStatus` import is used.

---

## Strengths

- All 5 new handler files and 5 test files complete and correct per plan.
- `COMPLETE_SLICE` handler implements all 6 documented steps (deferred routing with skip+warn for missing targets per INV-007, learnings rollup, architecture deltas with ts injection, status update, activeSlice clear, activity log).
- `guardSliceStatus` return type change from `StateError | null` to `Slice | StateError` eliminates all `slice!` assertions in `slice-submit.ts`.
- Sequential enforcement in `BEGIN_PLAN` correctly uses `sliceSequence` array and overview status lookup.
- 39 new tests cover happy paths, guards, edge cases (deferred to nonexistent target), and lifecycle integration (completing a slice to unblock the next).
