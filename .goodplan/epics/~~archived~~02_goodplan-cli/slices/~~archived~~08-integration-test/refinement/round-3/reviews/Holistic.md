# Holistic Review — Round 3

## Issues

**[MINOR]** Phase 2 epic lifecycle test chain has ambiguous "define slices" step

The `workflow-epic.test.ts` task (Phase 2, second bullet) says `submit-explore --epic test-epic` then `submit-architecture --epic test-epic` then "define slices" then `epic:activate --epic test-epic`. The "define slices" step is still a description rather than an exact command. From the commands API, this should be `submit-slices --epic test-epic` (and possibly `submit-refine-architecture --epic test-epic` and `submit-refine-slices --epic test-epic` depending on the intended path). Round 2 MIN-8 flagged this for the "skip explore" phrasing; the plan partially addressed it by adding `submit-explore`/`submit-architecture` but "define slices" remains descriptive.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Missing `globalSetup` file specification

The plan says `vitest.config.ts` should "Configure `globalSetup` to compile the binary once before all test files" and separately says `buildBinary()` should use Vitest `globalSetup`. However, no task explicitly creates the global setup file itself (e.g., `tests/global-setup.ts`). The `vitest.config.ts` task mentions configuring `globalSetup` but the actual setup module that calls `buildBinary()` and exports the binary path is not a named deliverable. An implementer might put `buildBinary()` in `helpers.ts` and reference it from the global setup, or create a separate file -- the plan should specify which.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `commitState` signature in concurrent-modification test description is incomplete

The plan says: "run `assembleState()` to get initial state, externally modify a `.project/` JSON file on disk, then attempt `commitState(dir, state, state)`." Looking at the actual `commitState` signature at `src/core/data/commit.ts:30`, it takes `(projectDir, oldState, newState)`. Passing `(dir, state, state)` (old = new = same assembled state) is correct for testing concurrent modification since the on-disk file was changed externally. This is fine -- no issue here, just confirming the round 2 fix (MIN-7) was applied correctly.

(Withdrawn -- not an issue.)

## Score: 9/10

The plan is well-structured, complete, and addresses all round 2 feedback effectively. Round 2 fixes are correctly applied: stdin payloads are specified for all workflow tests (IMP-1), transition-completeness uses drift detection + smoke test instead of meta-testing (IMP-2), `handlerRecord` export is precisely specified (IMP-3), vitest config is specified as single file (IMP-4), `GOODPLAN_DIR` env var is used in `withFixture` (MIN-3), circuit breaker uses high-round fixture (MIN-4), `globalSetup` for binary compilation (MIN-5), `json` typed as `unknown` (MIN-6), `commitState` call pattern clarified (MIN-7), and `epic:create` error scenario corrected (MIN-9). The two remaining minor issues are small clarity gaps that won't block implementation.

To reach 10: specify the exact "define slices" command in the epic lifecycle test chain, and name the global setup file as a task deliverable.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
