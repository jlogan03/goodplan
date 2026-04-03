# Holistic Review — Create-Epic Pipeline (Round 2)

## Issues

**[IMPORTANT] `decision:list` and `learning:list` do not support `--epic` flag — plan implies CLI-side filtering that doesn't exist**
Phase 3 task says: "load conditions via `gp decision:list --epic <name> --json` and `gp learning:list --epic <name> --json` (scoped to the relevant epic via `entityPath` filtering)." However, `decision:list` (at `src/commands/decision/list.ts`) has no `--epic` flag — it returns ALL decisions. The plan must clarify that filtering by `entityPath` is done client-side (orchestrator parses the returned JSON array and filters entries whose `entityPath` starts with `epics/<name>`). As written, the implementer would try `gp decision:list --epic foo --json` which would fail with a validation error (exit code 2). Either: (a) rewrite the task to show the correct command (`gp decision:list --json`) and describe client-side filtering, or (b) add a prerequisite task to add `--epic` filtering to the CLI commands.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Re-entry test fixture setup uses nonexistent shortcut — advancing epic to `explored` requires submit-explore with actual artifact**
Phase 5 re-entry test says: "Create fixture with epic at `explored` status: `gp init` -> `gp epic:create` -> run CLI commands to advance through goal and explore phases (`gp epic:explore`, `gp submit-explore`) to reach `explored` status." The `submit-explore` command requires an `explore-complete.md` file to exist in the epic directory (verified in `createMinimalFixture` at utils.ts line 911 — it writes `explore-complete.md` before calling `submit-explore`). The test setup task should explicitly include writing this file, or better, reference the proven pattern from `createMinimalFixture` which shows the exact sequence: `gp epic:explore` -> write `explore-complete.md` -> `gp submit-explore`. Without this, the re-entry fixture setup will fail silently or with a confusing error.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5 test setup says "Do not use createMinimalFixture" but could reuse its init+git pattern**
The plan says "Do not use `createMinimalFixture()` (that creates an epic; this test needs a project without one)." This is factually correct — `createMinimalFixture` always creates an epic (defaults to `test-epic`). But the reasoning could be clearer: the full pipeline test needs a project WITHOUT an epic because the create-epic skill itself creates the epic. Meanwhile, the re-entry test DOES need an epic at a specific status, and COULD use `createMinimalFixture` with `activateEpic: false` to get a project + epic in `created` status, then advance it manually. Consider noting this reuse opportunity to reduce test boilerplate.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 before-check agent count assumption may be wrong**
Phase 4 Expected Behavior says: "Before: `bun run build:plugin 2>&1 | grep "Packaged"` -> shows old agent count (10 from previous slices)." But the current `agents/` directory contains exactly 7 agents (editor, plan-phase, refinement-coordinator, reviewer-agent-skill, reviewer-holistic, reviewer-software-architecture, synthesis). The "10" figure doesn't match. This should say 7 (from slice 02), making the after-count 13 (7 existing + 3 phase agents + 3 reviewers). The after-count of 13 is already correct elsewhere in the plan.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 refinement loop references "refinement-coordinator agent" but doesn't specify review_context values for architecture vs slices**
The refinement loop in Phase 4 (architecture) and Phase 6 (slices) both say "Spawn refinement-coordinator agent -> returns reviewer list." Per the epic architecture, reviewer agents adapt their focus based on `review_context` (architecture-proposal, slice-definitions, etc.). The orchestrator must pass the appropriate `review_context` when spawning reviewers, but neither Phase 4 nor Phase 6 specifies what value to use. Add: Phase 4 reviewers get `review_context: "architecture-proposal"`, Phase 6 reviewers get `review_context: "slice-definitions"`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No task to verify `gp epic:refine-slices` precondition status**
The plan notes at the bottom: "Verify this command exists in the CLI before implementation." The research file and codebase confirm it exists at `src/commands/epic/refine-slices.ts` with precondition `slices-defined`. This note can be removed or marked as resolved — it's verified. However, the plan should confirm the precondition status matches the phase table. The command expects `slices-defined` and transitions to `refining-slices`, which matches the plan's Phase 6 flow. Mark the note as resolved.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
The plan addressed all 5 IMPORTANT and 5 MINOR issues from round 1 effectively: version check added, explore-phase trade-off documented, architecture path uses CLI response fields, conventions.md update task added, PARTIAL/FAILED tests added, and `reviewers-language.md` source path clarified. The structure is clear, phasing is logical, and success criteria are concrete. The remaining issues are: one IMPORTANT item (the `decision:list --epic` flag that doesn't exist would cause a runtime failure) and one IMPORTANT item (re-entry test fixture missing the explore-complete.md write step). Fixing both IMPORTANT issues and the 4 MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
