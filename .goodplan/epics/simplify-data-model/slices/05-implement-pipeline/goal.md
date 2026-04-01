# Implement Pipeline + Complete-Epic

## What We're Building
Build the `/gp:implement` pipeline skill (implementation + slice completion in one flow) and the `/gp:complete-epic` standalone skill (epic-level learnings synthesis, architecture reconciliation, artifact promotion). This slice produces the `implement-phase` and `completion-phase` agent definitions. The implement skill is unique among pipelines: it has no interactive phases — user interaction was front-loaded by plan-slice. The approved plan is the user's intent; implementation executes it autonomously.

## Behavior
1. Create agent definitions: `implement-phase.md` (implements a plan phase, reports changed files and status), `completion-phase.md` (synthesizes learnings, reviews architecture — adapts scope based on task prompt: slice-level vs epic-level). The completion-phase agent has two explicit modes with different task prompt contracts:
   - **Slice-level:** Input = slice path, plan path, changed files. Output = learnings, architecture delta, side quest proposals.
   - **Epic-level:** Input = epic path, all slice learnings, cross-slice summary. Output = consolidated learnings, architecture reconciliation, promoted artifacts.

**Maturity Note:** State Machine and Commands subsystems at "Developing (modified)" maturity. This slice builds skills that invoke CLI commands for status transitions. Targets the post-slice-03 CLI API surface.
2. Build the `implement` orchestrator skill (`skills/implement/SKILL.md`):
   - Phase 1 (autonomous): Implementation — spawn `implement-phase` agent per plan phase, with review loops per phase (coordinator → reviewers → synthesis → editor for code quality). Reports changed files and commit hashes.
   - Phase 2 (autonomous): Slice completion — spawn `completion-phase` agent for learnings synthesis and architecture review. If this is the last slice in the epic, prompt "All slices complete. Run `/gp:complete-epic` when ready."
   - Re-entry: query slice status. If `implementing`, check which plan phases have commits and resume from the next incomplete phase.
3. Build the `complete-epic` standalone skill (`skills/complete-epic/SKILL.md`):
   - Spawn `completion-phase` agent with epic-level scope — cross-slice learnings synthesis, architecture reconciliation (compare epic target vs top-level current reality), artifact promotion (research, brainstorm, prototypes from epic to project level).
   - Not a pipeline — single logical step with parallel sub-agents for cross-slice analysis.
4. Review loops during implementation use the same refinement infrastructure (coordinator → reviewers → synthesis → editor) proven in slice 02 but with `review_context: "code-implementation"`. Note: `"code-implementation"` is a new review context type first exercised in this slice — reviewer agents built in slices 02 and 04 must be configured to handle it. The value is already defined in conventions but this is the first skill to reference it.
5. Completion-phase agent evaluates `reconsiderWhen` and `validUntil` conditions.

## Verification
- [ ] Run `bun tools/dogfood/test-implement.ts` — implement pipeline completes: all plan phases implemented with review loops, slice completion runs (learnings written, architecture reviewed)
- [ ] After test run, `gp slice:show --slice <name> --json` returns status `completed`
- [ ] Run `bun tools/dogfood/test-complete-epic.ts` — epic completion flow runs: cross-slice learnings synthesized, architecture reconciled, artifacts promoted
- [ ] After epic completion test, `gp epic:show --epic <name> --json` returns status `completed`
- [ ] Re-entry test: create a fixture with phase 1 commits already present, invoke skill, verify it resumes from phase 2 (pre-populated fixture approach, same pattern as slice 04)
- [ ] Verify implement-phase agent commits after each passing phase
- [ ] Verify completion-phase agent writes learnings and proposes architecture updates
- [ ] Mode-isolation test: run completion-phase with a slice-level prompt and assert output does NOT contain cross-slice synthesis; run with epic-level prompt and assert output contains consolidated learnings + architecture reconciliation

Run `test-implement.ts` against a fixture with a plan-refined slice (created by plan-slice from slice 02). The implementation should execute each plan phase, run review loops on the code, and complete the slice. Then run `test-complete-epic.ts` against a fixture where all slices are completed — verify it synthesizes learnings across slices and reconciles architecture. Test re-entry using the pre-populated fixture approach (fixture with phase 1 commits, verify skill resumes from phase 2).

**Dependency note:** Depends on slice 04 for pattern validation (04 proves multi-phase spawning works), not because they share agents (both implement-phase and completion-phase are built in this slice).

## Scope Boundaries
**In scope:** `skills/implement/SKILL.md`, `skills/complete-epic/SKILL.md`, `agents/implement-phase.md`, `agents/completion-phase.md`, `tools/dogfood/test-implement.ts`, `tools/dogfood/test-complete-epic.ts`, code review loops with `review_context: "code-implementation"`, implementation re-entry via commit history
**Out of scope:** The `/gp:explore` standalone wrapper (slice 06). Additional reviewer agents for code review beyond what's already defined (add as needed).
