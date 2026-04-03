# Agent Skill Review — Plan-Slice PoC

## Issues

**[CRITICAL]** Incorrect CLI command for status transition in Phase 3

The plan instructs the orchestrator to run `gp start-plan --slice <name> --json` to transition the slice to `planning` status (Phase 3, task "Transition status"). However, `start-plan` is a **read-only context assembly** command in `src/commands/subagent/start-plan.ts` — it returns a ContextBundle JSON but does not mutate state. The actual status transition command is `gp slice:plan --slice <name>` (in `src/commands/slice/plan.ts`), which triggers the `BEGIN_PLAN` state event and transitions `created -> planning`.

This is referenced in multiple locations:
- Phase 3 Expected Behavior line 108: "SKILL.md queries CLI status via `gp slice:show --slice <name> --json` for phase detection" (correct for reads)
- Phase 3 Expected Behavior line 109: "Orchestrator handles status transitions: `gp start-plan --slice <name>` at Q&A start" (incorrect — should be `gp slice:plan --slice <name>`)
- Phase 3 Tasks line 122: "Transition status: `gp start-plan --slice <name> --json`" (incorrect)

The `submit-plan` command is correctly identified — it does perform a status transition. Only `start-plan` is wrong.

Resolution: DIRECTLY_ACTIONABLE

Fix: Replace `gp start-plan --slice <name>` with `gp slice:plan --slice <name>` everywhere it is used as a status transition command. Optionally keep `gp start-plan` as a separate step for context assembly if the orchestrator needs the ContextBundle, but do not rely on it for the state transition.

---

**[CRITICAL]** Severity level mismatch between plan and existing conventions

The plan's Phase 1 task for `review-preamble.md` (line 42) defines severity levels as "CRITICAL, IMPORTANT, SUGGESTION, NITPICK". The existing refine-plan skill and the installed reviewer infrastructure (v1.0.3) use "CRITICAL, IMPORTANT, MINOR" — three levels, not four. The shared preamble template (which this reviewer is currently using) also uses CRITICAL/IMPORTANT/MINOR.

The plan's Phase 3 Expected Behavior (line 108) and the refinement loop exit conditions reference "CRITICAL or IMPORTANT issues" which aligns with the 3-level scheme, but the Phase 1 task explicitly lists 4 levels. This inconsistency will cause reviewer output to diverge from what the synthesis agent and the orchestrator expect.

Resolution: DIRECTLY_ACTIONABLE

Fix: Change "CRITICAL, IMPORTANT, SUGGESTION, NITPICK" to "CRITICAL, IMPORTANT, MINOR" in the Phase 1 task for `review-preamble.md`, matching the established convention used by the existing refine-plan skill and iteration-loop shared reference.

---

**[IMPORTANT]** Agent `@` references use different shared file names than the plan creates

The plan creates shared references in `skills/_shared/references/` with these names (Phase 1 tasks):
- `review-preamble.md`
- `review-holistic.md`
- `review-software-architecture.md`
- `review-agent-skill.md`

The agent definitions reference them via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-<domain>.md` (Phase 1 Expected Behavior lines 36-37). This is internally consistent.

However, the existing refine-plan skill stores its reviewer content in `skills/refine-plan/references/` (e.g., `reviewers-always.md`, `reviewers-ai-tooling.md`, `shared-preamble.md`) — a different naming convention (`reviewers-*.md` vs `review-*.md`) and a different location (skill-local `references/` vs `skills/_shared/references/`).

The codebase context research (item 4) correctly identifies this as a restructuring, but the plan does not address how the existing refine-plan skill will coexist with the new shared references during the transition period. Will refine-plan continue to use its own copies? Will it be updated to point at the shared ones? If both exist simultaneously, reviewer content will diverge and bug fixes will need to be applied in two places.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a task or a note in Phase 1 clarifying the coexistence strategy. Recommendation: the new `skills/_shared/references/review-*.md` files are the canonical source; existing `skills/refine-plan/references/reviewers-*.md` remain untouched in this slice (they serve the installed v1.0.3 refine-plan skill). A future slice in this epic will migrate refine-plan to use the shared references. Document this explicitly so implementers don't try to reconcile the two sets.

---

**[IMPORTANT]** Plan-format reference extraction lacks migration path

Phase 1 task (line 46) says: "Extract plan format conventions from existing `skills/create-plan/references/plan-format.md` into `skills/_shared/references/plan-format.md`". The word "extract" is ambiguous — does this mean copy, move, or symlink?

If the file is moved, `skills/create-plan/SKILL.md` (which reads `../create-plan/references/plan-format.md` via relative path) will break. If copied, the same dual-source problem applies. The create-plan skill is an existing installed skill that must continue working.

Resolution: DIRECTLY_ACTIONABLE

Fix: Clarify that this is a **copy** (not a move). The original `skills/create-plan/references/plan-format.md` stays in place for backward compatibility with the existing create-plan skill. The new `skills/_shared/references/plan-format.md` is used by the plan-phase agent via `@` reference. Add a note that a future slice will update create-plan to reference the shared copy.

---

**[IMPORTANT]** Refinement loop exit conditions differ from established iteration-loop pattern

The plan (Phase 3, lines 107-108 and 131-137) defines exit conditions:
- All scores >= 9 -> exit
- Warn on stagnation (net score doesn't rise between adjacent rounds)
- Stop after 2 adjacent no-improvement rounds
- Stop after 2 rounds (any position) with net score reduction
- Hard cap 10 iterations

The existing `skills/_shared/references/iteration-loop.md` defines a different pattern:
- Full pass: all scores meet threshold + no CRITICAL/IMPORTANT issues
- Early exit: minimum iteration count + all scores meet lower threshold + no CRITICAL/IMPORTANT issues
- Max iterations (configurable per skill)
- No stagnation detection at all

The plan introduces stagnation detection (2 adjacent no-improvement rounds, 2 net-reduction rounds) which is novel logic not present in the shared iteration loop. This is fine architecturally — the plan-slice orchestrator handles its own loop — but the implementation will need to build stagnation detection from scratch rather than reusing existing patterns.

The plan also omits the CRITICAL/IMPORTANT issue check from exit conditions (it only checks scores), which means a round with score >= 9 but a remaining CRITICAL issue would exit the loop.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add "no CRITICAL or IMPORTANT issues" as a required exit condition alongside the score threshold (matching the established pattern). Consider whether stagnation detection should be documented as a plan-slice-specific extension, or whether it should be proposed as an enhancement to the shared iteration-loop reference for all skills.

---

**[IMPORTANT]** Orchestrator context discipline unclear for Q&A output

Phase 3 states the orchestrator "never reads full artifact content" (line 111). However, the Q&A phase (Phase 1 of the pipeline, lines 119-124) has the orchestrator directly conducting the Q&A and writing output to `<tmpdir>/qa/plan-qa.md`. This is an interactive phase that runs in orchestrator context, which is correct per the architecture.

The ambiguity is: when Phase 2 starts, the orchestrator spawns the `plan-phase` agent and passes the Q&A output path. But the Q&A content is already in the orchestrator's context (it just conducted the Q&A). The plan-phase agent will Read the Q&A file redundantly. This isn't a violation, but the plan should clarify that the orchestrator's context discipline rule ("no Read calls on full artifacts") applies to Phase 2 onward, not Phase 1.

More importantly, the `verifyOrchestratorDiscipline()` function (Phase 4) needs to know that orchestrator-level Read calls during Phase 1 (writing Q&A output) are expected and allowed. The function description (line 173-174) says it "distinguishes orchestrator-level reads from sub-agent reads" but doesn't mention distinguishing Phase 1 (interactive, reads allowed) from Phase 2+ (autonomous, reads not allowed).

Resolution: DIRECTLY_ACTIONABLE

Fix: In the Phase 4 task for `verifyOrchestratorDiscipline()`, add that the function must also filter by phase — reads targeting the temp working directory during the Q&A phase are expected orchestrator behavior. Only reads on architecture files, plan drafts, and source code during autonomous phases are violations.

---

**[IMPORTANT]** Missing `plan-format.md` in shared reference file count

Phase 1 Expected Behavior (line 33) says: `ls skills/_shared/references/review-*.md` -> 3 files: `review-holistic.md`, `review-software-architecture.md`, `review-agent-skill.md`. This is correct for review files.

But the phase also creates `plan-format.md` (line 37, line 46) in `skills/_shared/references/`. The Expected Behavior doesn't verify this file's existence separately — it only checks `review-*.md` via glob. Add an explicit check for `plan-format.md`.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add to Phase 1 Expected Behavior (After implementation): `- [ ] ls skills/_shared/references/plan-format.md -> exists`

---

**[MINOR]** Agent file list inconsistency with epic architecture

The plan creates 7 agents (Phase 1, line 31): `plan-phase`, `refinement-coordinator`, `synthesis`, `editor`, `reviewer-holistic`, `reviewer-software-architecture`, `reviewer-agent-skill`.

The epic architecture `_overview.md` lists additional agents that will be needed later: `explore-phase`, `architecture-phase`, `refine-phase`, `slices-phase`, `implement-phase`, `reviewer` (generic). The plan correctly scopes to just the 7 agents needed for plan-slice, which is appropriate for a PoC. No action needed, but the plan could note that the remaining agents will be created in subsequent slices to set expectations.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a brief note in the Overview section: "This slice creates 7 of the ~15 agents defined in the epic architecture. Remaining agents (explore-phase, architecture-phase, implement-phase, etc.) will be created in subsequent slices."

---

**[MINOR]** Phase 4 test verification is manual-heavy for an "Experimental" subsystem

Phase 4 verification (lines 190-193) relies heavily on manual review: "Read through the SKILL.md and trace the orchestrator flow manually", "Manually review `verifyOrchestratorDiscipline()` implementation". For an Experimental subsystem, this is acceptable, but the Expected Behavior (lines 163-165) includes concrete automated checks which is good.

However, the test for the refinement loop (line 183) says "assert refinement loop ran >= 1 iteration" — with haiku as the model, the simulated reviewers may produce low-quality scores that trigger many iterations (expensive) or may not produce parseable JSON returns at all. The plan should note that structural-tier tests with haiku validate the loop mechanics (spawn, parse return, iterate) but may not produce meaningful scores. A separate quality-tier test with opus would be needed to validate actual review quality.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a note in Phase 4 that haiku-tier tests validate loop mechanics and agent spawn/return parsing, not review quality. Consider adding a `--max-iterations 2` flag to the test script for cost control during structural testing.

---

**[MINOR]** Temp directory pattern lacks cleanup

The plan creates working directories at `/tmp/gp-plan-slice-<name>-<ts>/` (Phase 3, line 105). There is no cleanup mechanism described — no cleanup on success, no cleanup on failure, no age-based pruning. For a PoC this is acceptable, but over time these directories will accumulate. The plan should at minimum note that cleanup is deferred.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a brief note: "Temp directory cleanup is deferred — directories persist after completion for debugging. A future slice may add age-based pruning or cleanup-on-success."

## Score: 6/10

The plan demonstrates strong understanding of the orchestrator pattern and correctly applies `@` reference injection, sub-agent return format parsing, and the context discipline principle. However, the critical CLI command error (`start-plan` vs `slice:plan`) would cause the implementation to fail at the first status transition. The severity level mismatch would cause reviewer output parsing failures. The missing CRITICAL/IMPORTANT exit condition check could let the refinement loop exit with unresolved critical issues.

To reach 9+: fix the two CRITICAL issues (CLI command, severity levels), add the CRITICAL/IMPORTANT exit condition, clarify the coexistence strategy for shared references, and resolve the plan-format extraction ambiguity.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
