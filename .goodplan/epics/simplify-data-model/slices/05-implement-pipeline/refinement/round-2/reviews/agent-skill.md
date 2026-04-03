# Agent Skill Review — Implement Pipeline Plan (Round 2)

## Issues

**[IMPORTANT]** Plan creates `completion-slice.md` and `completion-epic.md` but architecture spec still defines `completion-phase.md` — no task to reconcile

The round 1 I1 issue was addressed by splitting the dual-mode agent into two separate files (`completion-slice.md` and `completion-epic.md`). This is the better design. However, the architecture spec at `.goodplan/epics/simplify-data-model/architecture/skill-model-api.md` (line 119) and `conventions.md` (line 58) still reference a single `completion-phase.md` agent with dual modes. The plan acknowledges the split in the overview ("Split completion agents: `completion-slice.md` and `completion-epic.md` are separate agents with distinct inputs, outputs, and responsibilities") but includes no task to update `skill-model-api.md` or `conventions.md` to reflect the two-agent approach. During implementation, the implementer will see a mismatch between plan and architecture and may hesitate or revert to the single-agent design.

Add a task (Phase 1 is the natural home) to update `skill-model-api.md` Agent Definitions table and `conventions.md` `reconsiderWhen` ownership list to reference `completion-slice` and `completion-epic` instead of `completion-phase`. This is a minor architecture deviation — document the justification (different input/output shapes, no shared callers, cleaner boundaries).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `implementationPhase` field requires a CLI/schema change but the plan only says "add data model task" — no concrete implementation detail

Phase 2 task list includes "Add data model task: define `implementationPhase` field in the slice schema to track current phase index for re-entry." The field does not exist in the current codebase (confirmed via grep — zero matches in `src/`). This is a schema change to the slice entity, likely requiring updates to `src/schemas/` (Zod schema), `slice:show` output shape, and a CLI command to set/update the value. The plan treats this as a one-line task but it is a non-trivial change that spans multiple source files.

The plan should either: (a) expand this into a concrete sub-task list (schema field, CLI setter command or flag, `slice:show` output inclusion), or (b) extract it as a prerequisite sub-phase at the start of Phase 2 with its own Expected Behavior checks (e.g., `$GP slice:show --slice <name> --json | jq .implementationPhase` returns null for a new slice, returns 2 after being set).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 review loop references `iteration-loop.md` but doesn't define the required Loop Parameters

The plan correctly says "reference `skills/_shared/references/iteration-loop.md` for the loop structure. Do NOT describe the full loop inline in SKILL.md." This addresses the round 1 C2 issue. However, `iteration-loop.md` requires each consuming skill to define a "Loop Parameters" section with 11 specific parameters (reviewer list, exit criteria, early exit thresholds, max iterations, editor prompt path, score thresholds, scope constraints, working directory, run directory, backup directory, review_context). The plan's Phase 3 tasks mention some of these (max 12 iterations, early exit at 5+, stall detection at 3+) but doesn't frame them as a Loop Parameters section. The implementer needs to know they must define all 11 parameters for the iteration-loop reference to work.

Add a task to Phase 3: "Define a Loop Parameters section in `skills/implement/SKILL.md` filling all slots required by `iteration-loop.md`." List the parameter values explicitly (e.g., `review_context: "code-implementation"`, `max_iterations: 12`, `editor_prompt_path: N/A — implement-phase agent handles edits`, etc.).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6 re-entry test fixture setup step (c) says "set `implementationPhase` to 1 via CLI" but no CLI command for this is specified anywhere

The test harness Phase 6 describes a re-entry test with step "(c) set `implementationPhase` to 1 via CLI." The plan's Phase 2 says the orchestrator "updates `implementationPhase` via CLI to track progress" but never specifies which CLI command does this. Is it `slice:implement --phase 1`? A new `slice:update` command? A generic `slice:set-field` command? The test author and the orchestrator skill both need to know the exact command.

Resolution: CODEBASE_EXPLORATION — Check `src/commands/slice/` for any existing field-update commands and determine the appropriate CLI surface for setting `implementationPhase`.

---

**[MINOR]** Phase 5 complete-epic skill Step 6 "Artifact promotion" has the orchestrator copying files via `cp` — this may violate HMAC integrity

The plan says the orchestrator promotes research/brainstorm/prototype files from epic to project level via shell `cp`. Per project conventions (CLAUDE.md: "Never write directly into .goodplan/; HMAC and hooks are integrity safeguards; CLI commands only"), direct file copies into `.goodplan/` directories would bypass HMAC. If the target is inside `.goodplan/` (e.g., `.goodplan/research/`), this needs a CLI command instead. If the target is outside `.goodplan/` (e.g., project-level `docs/`), `cp` is fine.

Clarify whether promoted artifacts land inside or outside `.goodplan/`. If inside, specify the CLI command for promotion (or note that one needs to be added).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 agent definitions specify `model: opus` in frontmatter but existing agents in the codebase also use this — confirm this is the correct field name for the plugin agent spec

All 13 existing agents use `model: opus` in frontmatter (confirmed via `agents/*.md`). The plan follows this pattern correctly. However, the plan's Expected Behavior check says "All files have valid frontmatter (`name`, `description`, `model: opus`)" — the check should also verify the `description` field is under 1024 chars per the agentskills.io spec limit mentioned in the review criteria. This is minor since agent descriptions tend to be short, but worth noting for completeness.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Trigger phrase placement: plan puts trigger phrases in a separate frontmatter field but `plan-slice` puts them in the description body

Phase 2 says "Frontmatter includes trigger phrases" as a separate concept, and the Expected Behavior check says "Frontmatter includes trigger phrases: 'implement', 'execute plan', 'build slice', 'complete slice'." Looking at `plan-slice/SKILL.md`, trigger phrases are embedded in the `description` field value ("Common triggers: 'plan and refine a slice', ..."). The plan should clarify that trigger phrases go inside the `description` field (not a separate frontmatter key), matching the established pattern.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Significant improvement from round 1. The three critical issues (inline review loop, sub-agent-prompts porting, RED/GREEN boundary) are all cleanly resolved. The completion agent split is the right call. The plan's phasing is now well-structured (7 phases with clear boundaries). The remaining issues are: (1) architecture spec drift from the completion agent split needs a reconciliation task, (2) the `implementationPhase` data model change is underspecified for what is actually a multi-file schema change, and (3) the iteration-loop integration needs explicit Loop Parameters. To reach 9+: add the architecture reconciliation task, expand the `implementationPhase` implementation detail, and specify Loop Parameters explicitly.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
