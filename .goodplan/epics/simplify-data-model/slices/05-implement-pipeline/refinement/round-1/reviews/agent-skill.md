# Agent Skill Review — Implement Pipeline Plan

## Issues

**[CRITICAL]** Implement orchestrator (Phase 2) duplicates the refinement-coordinator/reviewer/synthesis loop inline instead of following established patterns

The plan's Phase 2 Step 5 describes the full review loop (spawn refinement-coordinator, spawn reviewers in parallel, spawn synthesis, check scores, iterate) entirely within the SKILL.md body. This contradicts the orchestrator pattern established in `plan-slice` and `create-epic`, where the orchestrator delegates content-level decisions to sub-agents and follows structured coordinator instructions. The current `implement-plan/SKILL.md` already handles this loop at ~140 lines — the new skill would need a similar or larger section. This bloats the orchestrator's context and risks exceeding the ~500 line SKILL.md target.

The plan should specify that the review loop is extracted to a shared reference file (e.g., `skills/_shared/references/iteration-loop.md` already exists) or that the implement skill reuses the same pattern as plan-slice's refinement loop (coordinator returns spawn plan, orchestrator follows it mechanically). The plan currently describes the loop at a level of detail that belongs in a reference file, not the SKILL.md body.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Plan references porting `references/` from `implement-plan` but the new skill uses agents instead of inline sub-agent prompts

Phase 2 Task 4 says: "Port relevant reference files from `skills/implement-plan/references/` — reviewer-registry.md, sub-agent-prompts.md, dependency-research.md, codebase-context-discovery.md." However, the new skill model uses named agent definitions in `agents/` (spawned by name), not inline prompt templates from `sub-agent-prompts.md`. The existing `implement-plan` uses prompt templates because it predates the agent model. Porting `sub-agent-prompts.md` into the new skill would be architecturally regressive — the `implement-phase` agent definition replaces the implementation sub-agent prompt template, the reviewer agents replace the reviewer bootstrap prompt, and synthesis.md replaces the synthesis template.

The plan should instead specify: (a) verify the existing agent definitions (`refinement-coordinator.md`, `synthesis.md`, reviewer agents) cover the review loop needs, (b) port only skill-specific content (reviewer-registry.md for domain selection, dependency-research.md and codebase-context-discovery.md for pre-implementation research steps), and (c) explicitly NOT port sub-agent-prompts.md.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** The `completion-phase.md` agent definition uses a dual-mode pattern (`## Slice Mode` / `## Epic Mode`) with no established precedent — needs clearer separation strategy

The codebase research notes confirm: "completion-phase agent is new — no prior art for dual-mode agents in this codebase." The plan specifies the agent has two mode sections, but doesn't address how the agent avoids cross-contamination between modes (e.g., slice mode accidentally performing epic-level synthesis). With a single agent file containing both modes, the full instructions for both are always loaded — the agent must rely on the `mode` field in the task prompt to ignore irrelevant sections.

The plan should specify: (a) explicit "If mode is slice, IGNORE the Epic Mode section entirely" instruction at the top of each mode section, (b) distinct return format documentation per mode (the plan shows a single return format that mixes slice and epic fields), or (c) consider whether two separate agents (`completion-slice.md` and `completion-epic.md`) would be cleaner given the different input/output shapes. The architecture spec (`skill-model-api.md`) does specify a single `completion-phase.md` with dual modes, so option (c) would need an architecture discussion, but the plan should at least acknowledge the risk and specify the mitigation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 Step 5 describes the review loop at the SKILL.md level, but the implement-phase agent already handles red-green checks — the boundary between orchestrator and agent responsibilities is ambiguous for review feedback routing

The plan says the orchestrator spawns `implement-phase` with a merged feedback path, and if GREEN checks fail, the orchestrator feeds failures "back into the implementation-review cycle as a CRITICAL issue." But it also says the implement-phase agent "handles red-green Expected Behavior checks as part of its work." The current `implement-plan` skill has a clear boundary: the orchestrator runs red-green checks (Steps 3.0, 3.4), and the implementation sub-agent does pure implementation. The new plan tries to move red-green into the agent but then also describes the orchestrator running GREEN checks "via one more implement-phase spawn if needed" (Step 5 sub-step 8).

The plan should pick one clear boundary: either (a) the orchestrator handles all red-green checks (matching current `implement-plan` pattern) and the agent does pure implementation, or (b) the agent handles both implementation and verification, and the orchestrator only checks the agent's return for pass/fail. The current plan is a hybrid that will confuse implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `complete-epic` skill Step 4 references CLI commands `$GP decision:list` and `$GP learning:list` but the plan doesn't specify the `$GP` variable setup

Phase 3 (complete-epic skill) describes Steps 0-8 but Step 0 only says "Version check" without showing the `$GP` variable assignment pattern used by all other orchestrator skills. Compare with plan-slice and create-epic, which both show the explicit `GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"` assignment in Step 0. The complete-epic skill will fail if the `$GP` variable is not assigned before use in Steps 2, 4, and 7.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan doesn't specify `user-invocable: true` in the frontmatter for either new skill

The architecture spec (`skill-model-api.md`) lists both `implement` and `complete-epic` as user-invocable skills. The plan specifies `name`, `description`, and `requires` in the frontmatter but omits `user-invocable: true`. Both `plan-slice` and `create-epic` include this field. Without it, the skills may not appear in slash-command autocomplete, reducing discoverability and triggering reliability.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 test harness re-entry test uses "fixture with phase 1 commits already present" but doesn't specify how to create git commits in the fixture

The plan says: "Create a fixture with phase 1 commits already present, invoke skill, verify it resumes from phase 2." The existing test harnesses (`test-plan-slice.ts`, `test-create-epic.ts`) create fixtures via CLI commands (`gp epic:create`, `gp slice:create`, etc.). Creating a git commit with a specific message pattern `[slug] Phase 1: ...` in a fixture requires: (a) making actual file changes, (b) committing with the exact format, (c) ensuring the slice status is `implementing`. The plan should specify the fixture setup sequence for re-entry testing — this is non-trivial and the test author will need clear guidance.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 Expected Behavior checks `bun run build:plugin && ls dist/gp-plugin/agents/implement-phase.md` but doesn't verify the completion-phase.md in the same dist check

The Before checks test both agents individually, but the After check for dist only lists `implement-phase.md`. It does list both in the second After check, but the first `bun run build:plugin && ls ...` check only shows one file path. This is inconsistent with the Before check which tests both.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** The implement skill description should include trigger phrases per the `skill-model-api.md` guidelines

The `skill-model-api.md` specifies that `implement` must trigger for: "implement", "execute plan", "build slice", "complete slice". The plan's Phase 2 frontmatter only says `description: ...` without specifying the actual description text or required trigger phrases. Compare with the `plan-slice` and `create-epic` skills which include explicit trigger phrases in their description field.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 mode-isolation test assertion is vague — "assert output does NOT contain cross-slice synthesis" lacks a concrete check

The plan says: "Run completion-phase with slice-level prompt -> assert output does NOT contain cross-slice synthesis." What specific string or structure should be absent? The plan should specify: check that the return JSON does not contain a `consolidatedLearnings` field (or whatever the epic-mode-specific field is), and that the `summary` does not mention "cross-slice" or "epic-level."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan references `refinement-coordinator` in Step 5 sub-step 4 with `review_context: "code-implementation"` but the architecture conventions table uses `"code-implementation"` — verify this exact string matches

The architecture conventions in `conventions.md` specify the review_context value as `"code-implementation"`. The plan uses the same string. However, the codebase research notes say "this is the first skill to exercise it" — meaning there's no existing usage to validate against. The plan should include a verification step confirming the refinement-coordinator and reviewer agents correctly handle this review_context value, or note that this is a new code path that needs end-to-end testing.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan covers the right scope and the phasing is logical, but it has significant structural issues that would cause confusion during implementation: (1) the review loop is described at the wrong abstraction level (inline in SKILL.md vs. delegated to existing patterns), (2) the porting guidance conflates the old prompt-template model with the new agent-definition model, (3) the orchestrator/agent responsibility boundary for red-green checks is ambiguous, and (4) the dual-mode completion agent needs explicit cross-contamination mitigation. To reach 9+: resolve the two CRITICALs by restructuring the review loop delegation and clarifying what gets ported, resolve the IMPORTANT issues by picking clear boundaries and adding missing frontmatter fields, and sharpen the test harness fixture descriptions.

## Summary
- Critical: 2
- Important: 5
- Minor: 4
