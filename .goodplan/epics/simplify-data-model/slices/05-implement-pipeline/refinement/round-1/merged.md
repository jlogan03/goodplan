# Merged Feedback — Slice 05 Implement Pipeline (Round 1)

## CRITICAL Issues

**C1. Missing `slice:implement` and `submit-implementation` state transitions**
The plan omits required CLI state transitions. The transition tables specify: (1) `plan-refined` -> `implementing` via `$GP slice:implement`, and (2) `implementing` -> `implementation-complete` via `submit-implementation` (COMPLETE_IMPLEMENTATION event). Only then can `slice:complete` move to `completed`. The plan's normal flow assumes the slice is already in `implementing` without showing the transition, and Step 6-7 jump straight to `slice:complete` without calling `submit-implementation`. Without both transitions, `slice:complete` will fail with `STATE_INVALID_TRANSITION`.
**Fix:** Add explicit `$GP slice:implement --slice <name>` call before the implementation loop (when status is `plan-refined`). Add `$GP submit-implementation --slice <name>` after all phases complete and before `slice:complete`.
Sources: software-architecture
Resolution: DIRECTLY_ACTIONABLE

**C2. Review loop described inline in SKILL.md instead of delegating to established patterns**
Phase 2 Step 5 describes the full review loop (spawn refinement-coordinator, spawn reviewers, spawn synthesis, check scores, iterate) within the SKILL.md body. This contradicts the orchestrator pattern in `plan-slice` and `create-epic`, where the orchestrator delegates to sub-agents and follows structured coordinator instructions. Describing the loop inline bloats the orchestrator and risks exceeding the ~500 line SKILL.md target. Additionally, the plan references porting `sub-agent-prompts.md` from the old `implement-plan` skill, but the new agent model uses named agent definitions — porting prompt templates is architecturally regressive.
**Fix:** Specify that the review loop follows the same mechanical pattern as plan-slice (coordinator returns spawn plan, orchestrator follows it). Extract loop details to a shared reference file or reuse `skills/_shared/references/iteration-loop.md`. Do NOT port `sub-agent-prompts.md` — verify that existing agent definitions (`refinement-coordinator.md`, `synthesis.md`, reviewer agents) cover the review loop needs. Port only skill-specific content: `reviewer-registry.md`, `dependency-research.md`, `codebase-context-discovery.md` (the latter two via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/` injection).
Sources: agent-skill (primary), holistic (reference file paths)
Resolution: DIRECTLY_ACTIONABLE

**C3. Ambiguous orchestrator/agent boundary for RED/GREEN checks**
The plan says the implement-phase agent "handles red-green Expected Behavior checks as part of its work," but then Step 5 sub-step 8 describes the orchestrator running GREEN checks "via one more implement-phase spawn if needed," and the orchestrator parsing `redGreenResults` from the agent return. The current `implement-plan` has a clear boundary where the orchestrator runs red-green checks. The new plan is a hybrid that will confuse implementation.
**Fix:** Pick one clear boundary. Recommended: the agent handles both implementation and verification, the orchestrator only checks the agent's return for pass/fail status. Remove any implication that the orchestrator reads or interprets Expected Behavior content directly.
Sources: software-architecture, agent-skill
Resolution: DIRECTLY_ACTIONABLE

## IMPORTANT Issues

**I1. `completion-phase` dual-mode agent should be split into two agents**
The plan proposes a single `completion-phase.md` with `## Slice Mode` and `## Epic Mode` sections. These modes have fundamentally different inputs, outputs, and responsibilities. No caller uses both modes. The dual-mode pattern has no precedent in the codebase and risks cross-contamination (slice mode accidentally performing epic-level synthesis). Splitting into `completion-slice.md` and `completion-epic.md` produces deeper modules with clearer boundaries.
**Fix:** Split into two agent files. Update Phase 2 to spawn `completion-slice`, and Phase 3 (complete-epic) to spawn `completion-epic`. If the architecture spec (`skill-model-api.md`) specifies a single `completion-phase.md`, note this as a minor architecture deviation and justify the split.
Sources: software-architecture, agent-skill
Resolution: DIRECTLY_ACTIONABLE

**I2. Phase 2 is too large — combines orchestrator logic, review infrastructure, and completion into one phase**
Phase 2 builds the entire implement orchestrator in one phase. This is the most complex orchestrator in the system (per-phase loops, review cycles, RED/GREEN checks, stall detection, iteration caps, research handling, and completion).
**Fix:** Split Phase 2 into sub-phases: (a) Core orchestrator skeleton (scope resolution, re-entry, plan loading, implementation loop with single-iteration pass-through, git commit), (b) Review loop integration (spawn refinement-coordinator, reviewers, synthesis, feedback loop, iteration safeguards), (c) Slice completion integration (completion-phase spawn, recommendations, CLI submit). Each sub-phase is independently verifiable.
Sources: software-architecture
Resolution: DIRECTLY_ACTIONABLE

**I3. Missing `review_context: "code-implementation"` handling detail**
The plan spawns `refinement-coordinator` with `review_context: "code-implementation"`, but this is the first skill to exercise this context type. The plan doesn't ensure the refinement-coordinator agent knows how to select appropriate reviewers for code review vs. plan/architecture review. The reviewer-registry.md from implement-plan may need adaptation.
**Fix:** Add a task to verify/adapt the refinement-coordinator and reviewer-registry.md for the `"code-implementation"` context type. Include an end-to-end test confirming the coordinator selects appropriate reviewers.
Sources: holistic, agent-skill
Resolution: DIRECTLY_ACTIONABLE

**I4. Missing `$GP` variable definition in skill templates**
Phase 2 and Phase 3 skill templates reference `$GP` extensively but don't include the explicit `GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"` assignment in Step 0, which is established in plan-slice and create-epic.
**Fix:** Add explicit `GP` variable assignment to Step 0 of both implement and complete-epic skill templates.
Sources: holistic, agent-skill
Resolution: DIRECTLY_ACTIONABLE

**I5. Missing `user-invocable: true` in frontmatter for both new skills**
Both `plan-slice` and `create-epic` include `user-invocable: true`. The plan's frontmatter for implement and complete-epic omits it. Without it, skills may not appear in slash-command autocomplete.
**Fix:** Add `user-invocable: true` to both skills' frontmatter specifications.
Sources: software-architecture, agent-skill
Resolution: DIRECTLY_ACTIONABLE

**I6. Refinement-coordinator receives ambiguous input for code review context**
Step 5 sub-step 4 says "pass artifact path (the changed files)" to the refinement-coordinator. For plan/architecture review, the coordinator receives a single document. For code implementation, "changed files" is a list, not a single artifact. The plan doesn't clarify what the coordinator receives.
**Fix:** Specify that the coordinator receives the list of changed file paths (or a diff summary) rather than a single artifact path. Update the coordinator's input spec if needed.
Sources: holistic
Resolution: DIRECTLY_ACTIONABLE

**I7. Re-entry via git log is fragile and diverges from CLI-based re-entry pattern**
The plan uses git log for `[slug] Phase N:` commits to detect re-entry. This violates the spirit of CLI-based re-entry (architecture conventions: "Phase detection uses the CLI exclusively"). Amending commit messages or format changes would break re-entry silently. Two alternatives: (1) store phase index in CLI state, (2) accept restart from phase 1 and rely on RED/GREEN UNEXPECTED-PASS to skip completed phases.
Sources: software-architecture
Resolution: USER_INPUT

**I8. Phase 4 re-entry test fixture setup is underspecified**
The re-entry test says "Create a fixture with phase 1 commits already present" but doesn't specify how to create git commits with the exact `[slug] Phase N:` format in a test fixture. The fixture setup must create properly formatted commits and ensure slice status is `implementing`.
**Fix:** Specify the fixture setup sequence: (a) create slice via CLI, (b) advance to `implementing` status, (c) make file changes and commit with the exact format, (d) then invoke the skill and verify resume from phase 2.
Sources: software-architecture, holistic, agent-skill
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**M1. Phase 1 before-check for build may give false results with stale dist**
The before-check doesn't clean dist first. Add `rm -rf dist &&` before the build command.
Sources: holistic
Resolution: DIRECTLY_ACTIONABLE

**M2. No documentation update task for new skills**
No task to update CLAUDE.md or skill-model-api.md for the new implement and complete-epic skills. Plan should note whether documentation is in or out of scope.
Sources: holistic
Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 5 before-checks are not falsifiable**
"Not yet validated end-to-end" is a statement, not a runnable check. Replace with a concrete check (e.g., run tests expecting specific failure mode).
Sources: holistic
Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 5 integration test lacks iteration bounds**
"Fix any issues found" should specify "iterate until all checks pass" with a concrete exit criterion.
Sources: software-architecture
Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 1 After dist check only verifies one agent file**
The After check for `bun run build:plugin && ls ...` only checks `implement-phase.md` but should also check `completion-phase.md` (or the split equivalents).
Sources: agent-skill
Resolution: DIRECTLY_ACTIONABLE

**M6. Implement skill description missing trigger phrases**
Per `skill-model-api.md`, the implement skill must trigger for: "implement", "execute plan", "build slice", "complete slice". The plan's frontmatter doesn't specify these.
Sources: agent-skill
Resolution: DIRECTLY_ACTIONABLE

**M7. Phase 4 mode-isolation test assertion is vague**
"Assert output does NOT contain cross-slice synthesis" needs concrete checks: verify return JSON has no `consolidatedLearnings` field, summary doesn't mention "cross-slice" or "epic-level."
Sources: agent-skill
Resolution: DIRECTLY_ACTIONABLE

**M8. Maturity context loading approach unspecified**
Step 4 says "Load maturity context via `$GP` CLI" but no CLI command currently returns maturity data directly.
Sources: software-architecture
Resolution: CODEBASE_EXPLORATION

**M9. `review_context: "code-implementation"` string needs validation**
This is the first usage of this context value — no existing code path to validate against. Plan should include a verification step.
Sources: agent-skill
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (for loop exit)

1. **C1 — State transitions:** In Phase 2, add `$GP slice:implement --slice <name>` before the implementation loop (when status is `plan-refined`). Add `$GP submit-implementation --slice <name>` after all phases complete and before `slice:complete`. Reference transition tables for exact event names.

2. **C2 — Review loop extraction:** Remove inline review loop description from Phase 2 Step 5. Replace with: "Follow the same mechanical review loop pattern as plan-slice: spawn refinement-coordinator with review_context, follow coordinator's spawn plan for reviewers, spawn synthesis, check scores." Reference `iteration-loop.md` or create implement-specific reference file. Remove the porting of `sub-agent-prompts.md`. Correct reference file paths: `dependency-research.md` and `codebase-context-discovery.md` live in `skills/_shared/references/`, not `skills/implement-plan/references/`.

3. **C3 — RED/GREEN boundary:** In Phase 2 Step 5, clarify: the implement-phase agent handles all RED/GREEN check execution and reports pass/fail in its return. The orchestrator reads only pass/fail status from the agent return, never Expected Behavior content. Remove Step 5 sub-step 8 ("run GREEN checks via one more implement-phase spawn").

4. **I1 — Split completion agent:** Replace `completion-phase.md` with `completion-slice.md` and `completion-epic.md`. Update Phase 2 to spawn `completion-slice`, Phase 3 to spawn `completion-epic`. Update Phase 1 build manifest and Phase 4 tests accordingly.

5. **I2 — Split Phase 2:** Break into Phase 2a (core skeleton: scope resolution, re-entry, plan loading, single-pass implementation loop, git commit), Phase 2b (review loop: coordinator, reviewers, synthesis, feedback, iteration caps), Phase 2c (completion: completion-slice spawn, recommendations, CLI submit-implementation and slice:complete). Renumber subsequent phases.

6. **I3 — Review context handling:** Add task in Phase 2b: verify refinement-coordinator handles `review_context: "code-implementation"`, adapt reviewer-registry.md if needed, add integration test for reviewer selection.

7. **I4 — $GP variable:** Add `GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"` to Step 0 of both implement and complete-epic skill templates.

8. **I5 — Frontmatter:** Add `user-invocable: true` to both skill frontmatter specifications.

9. **I6 — Coordinator input:** Specify that for code-implementation context, the coordinator receives a list of changed file paths (from `git diff --name-only`) rather than a single artifact path.

10. **I8 — Re-entry test fixture:** Specify fixture setup: create slice via CLI -> advance to `implementing` -> make file changes -> commit with `[slug] Phase 1: <description>` format -> invoke skill -> assert resume from phase 2.

11. **M1-M7, M9 — Minor fixes:** Apply as described in the MINOR section above. Each is self-contained and can be applied directly to the plan.

## RESEARCH_NEEDED

**R1. Maturity context loading (CODEBASE_EXPLORATION)**
The plan says "Load maturity context via `$GP` CLI" but no CLI command currently returns maturity data. Need to determine: (a) does `gp status --json` or any other command expose subsystem maturity levels? (b) if not, should the orchestrator read `.goodplan/architecture/_overview.md` via a sub-agent, or should a CLI command be added?
Tool strategy: `Grep` for "maturity" in `src/` to find if any CLI command returns it. `Read` `src/commands/status.ts` to check status output format. Check `gp status --json` output schema.

## Contradictions Resolved

1. **Review loop location (agent-skill vs. holistic):** Agent-skill reviewer flagged the review loop as CRITICAL (wrong abstraction level — belongs in reference file, not SKILL.md). Holistic reviewer flagged the review loop as IMPORTANT (missing detail on how coordinator selects reviewers). Trusted agent-skill as the domain specialist — the abstraction-level issue is the root cause; once resolved, the reviewer-selection detail follows naturally. Merged as CRITICAL C2.

2. **Reference file paths (holistic vs. agent-skill):** Holistic reviewer noted `dependency-research.md` and `codebase-context-discovery.md` don't exist in `skills/implement-plan/references/`. Agent-skill reviewer noted `sub-agent-prompts.md` should NOT be ported. These are complementary, not contradictory. Merged into C2 with both corrections.

3. **Dual-mode agent (software-architecture vs. agent-skill):** Software-architecture recommended splitting into two agents. Agent-skill recommended either splitting or adding explicit cross-contamination mitigation. Trusted software-architecture as the domain specialist — splitting is the cleaner architectural solution. Merged as I1.

4. **RED/GREEN check boundary (software-architecture vs. agent-skill):** Both flagged the ambiguity. Software-architecture said "clarify that the agent handles all RED/GREEN logic." Agent-skill said "pick one boundary." These are consistent — merged as C3 with the agent-handles-all recommendation.

## Unresolved (USER_INPUT required)

None remaining.

### USER_INPUT Resolved

1. **Re-entry strategy for implementation phases:** User chose **CLI state tracking**. Add an `implementationPhase` field to the slice entity to track the current phase index. The orchestrator queries `$GP slice:show --slice <name> --json` to get the current phase and resumes from there. This is a data model change — add a task to define the field in the slice schema. Remove the git log approach.

### Available Research

1. **Maturity context loading:** No CLI command currently exposes subsystem maturity data. The maturity table lives in architecture `_overview.md` files (LLM-owned markdown). The orchestrator should pass the architecture `_overview.md` path to the implement-phase agent and let the agent extract maturity context itself (consistent with context discipline — orchestrator doesn't read artifact content). Update the plan to replace "Load maturity context via $GP CLI" with "Pass architecture _overview.md path to implement-phase agent for maturity extraction."
