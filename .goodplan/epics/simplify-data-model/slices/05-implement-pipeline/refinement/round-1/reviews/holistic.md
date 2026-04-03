# Holistic Review — Slice 05 Implement Pipeline

## Issues

**[IMPORTANT]** Phase 2 Task: Plan references non-existent reference files for porting
The plan says "Port relevant reference files from `skills/implement-plan/references/` — reviewer-registry.md, sub-agent-prompts.md, dependency-research.md, codebase-context-discovery.md". However, `dependency-research.md` and `codebase-context-discovery.md` do not exist in `skills/implement-plan/references/` — they live in `skills/_shared/references/`. The new implement orchestrator should reference them via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/` injection (the established pattern), not port them into `skills/implement/references/`. The other two files (`reviewer-registry.md` and `sub-agent-prompts.md`) do exist in `skills/implement-plan/references/` but the plan should specify whether they need to be adapted for the new agent-based architecture or simply injected via `@` references.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2: Missing detail on how the refinement-coordinator selects reviewers for code-implementation context
The plan says the orchestrator spawns `refinement-coordinator` with `review_context: "code-implementation"`, but this is the first skill to exercise this context type (as noted in the research file). The plan does not include a task to ensure the refinement-coordinator agent knows how to select appropriate reviewers for code review (vs. plan review or architecture review). The reviewer-registry.md from implement-plan may need adaptation. Without this, the coordinator may not know which reviewer agents to spawn for code implementation reviews.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 Step 5: Review loop spawns refinement-coordinator + reviewers + synthesis but misses the editor agent
The existing implement-plan skill's review loop includes: implementation -> reviewers -> synthesis -> feedback to implementer. The new plan's Step 5 sub-steps 3-7 spawn refinement-coordinator, then reviewer agents, then synthesis, but if scores don't pass, it re-spawns `implement-phase` with merged feedback. This is correct for code implementation (the implementer IS the editor). However, the plan should explicitly state that unlike architecture/plan refinement loops, there is no separate `editor` agent — the `implement-phase` agent itself applies the feedback. This distinction matters for the implementer's understanding.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2: No explicit task for handling the `$GP` variable definition
The plan-slice and create-epic skills both define `GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"` in Step 0 and use `$GP` throughout. The plan references `$GP` extensively but Phase 2 tasks don't include the `GP` variable definition setup. The Step 0 version check mentions `$GP --version --json` but the variable assignment should be explicitly called out as part of the skill template.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 Step 5: Ambiguity in sub-step 4 — what is the "artifact path" for refinement-coordinator?
Sub-step 4 says: "Spawn `refinement-coordinator` — pass artifact path (the changed files), `review_context: "code-implementation"`". The refinement-coordinator in the existing architecture reads an artifact (a single document like an architecture proposal or plan) and selects reviewers. For code implementation, "the changed files" is a list, not a single artifact path. The plan should clarify what the coordinator receives — is it the list of changed file paths? A diff? The phase content? This affects how the coordinator decides which domain reviewers to spawn.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3: No documentation update task for the new complete-epic skill
The plan creates a standalone skill but includes no task for documenting it — no update to CLAUDE.md, no update to skill-model-api.md. The epic architecture's post-migration documentation section notes these updates should be tracked. While this may be deferred to a later slice, the plan should at least note whether documentation updates are in or out of scope.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1: Expected Behavior before-check for build is not truly falsifiable
The before-check says `bun run build:plugin && ls dist/gp-plugin/agents/implement-phase.md` should show "file not found." However, if a previous build's dist directory still exists from a prior run, the dist may contain stale files. The check should either clean dist first (`rm -rf dist`) or check a fresh build. As written, the before-check might give a false RED-CONFIRMED if the dist is stale vs. a false UNEXPECTED-PASS if someone previously created a file with that name.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4: Re-entry test fixture approach underspecified
The re-entry test says "Create a fixture with phase 1 commits already present" but doesn't specify how to simulate the git commits that the orchestrator will look for. The commits need the exact `[slug] Phase N:` format, so the fixture setup must create properly formatted commits. Worth specifying the fixture commit format explicitly.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5: Expected Behavior before-checks are weak — "test not yet validated end-to-end" is not a runnable check
The before-checks say the tests are "not yet validated end-to-end" — but that's a statement of fact, not a falsifiable check. A concrete before-check would be: `bun tools/dogfood/test-implement.ts --dry-run 2>&1 | grep "PASS"` returning no match, or simply running the tests and expecting them to fail because the skills don't exist yet (if this is Phase 5 running after Phases 1-4, the skills DO exist). The before-checks should be re-thought — Phase 5 is an integration phase where prior phases have already created the artifacts.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has good structural coverage — 5 phases, clear phase ordering, well-defined tasks, and strong alignment with the confirmed goal and established orchestrator patterns. The Expected Behavior sections are mostly concrete and runnable. However, there are several important gaps: the reference file porting task references files in wrong locations, the review loop for code-implementation context is underspecified (first use of this context type), and the coordinator's input for code reviews vs. document reviews is ambiguous. These would cause the implementer to stall or make incorrect assumptions. Fixing the 3 IMPORTANT issues and tightening the MINOR ambiguities would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 5
