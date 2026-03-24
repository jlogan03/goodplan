## Issues

**[IMPORTANT]** create-plan quest scope: Plan Phase 2 task for create-plan Step 7 mentions `quest:plan --quest <name>` but the actual replacement instructions say "For slice scope: use `submit-plan --slice <name> --json`. For quest scope: use the quest equivalent." The "quest equivalent" is vague. The plan should specify the exact command: `submit-plan --quest <name> --json` (per commands-api.md, `submit-plan` accepts `--slice` or `--quest` to disambiguate). Same applies to the scope resolution replacement in Step 2 (lines 27, 29, 31) — the plan covers the `__active__` glob replacement but does not address how quest scope resolution changes. Currently create-plan resolves quests via `side-quests/` directory scanning and `state.md`; after migration, quest detection should use `goodplan status --json` -> `.activeQuest`. The plan's tasks for create-plan Step 2 only mention `.activeEpic` and `.activeSlice`, missing `.activeQuest`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** create-plan guidance.md scope resolution: incomplete replacement specification. The plan lists 7 hits in guidance.md but only specifies replacements for lines 5-7, 13, 95, 99-103, and 113-114. Line 5 says "Replace `state.md` and `__active__` in scope resolution with CLI equivalents" but does not specify the concrete CLI commands. The scope resolution section (lines 1-9) has 3 patterns to replace: (1) `epics/__active__*/slices/` glob in arg resolution, (2) `state.md` read for active slice, (3) `epics/__active__*/slices/` scan in auto-detect. Each needs a specific CLI command: (1) `goodplan status --json` -> `.activeEpic` + unprefixed path, (2) `goodplan status --json` -> `.activeSlice`, (3) `goodplan slice:list --json` to find plannable slices. Without concrete replacements, the implementer must infer the correct commands.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** create-plan graceful stop with quest scope. The plan's Phase 2 task says "For slice scope: use `submit-plan --slice <name> --json`" for Step 7 state write-back. But it also says "Graceful stops leave artifacts in place -- no state.md/activity-log writes" for both guidance.md and SKILL.md. This is correct for the "no plan.md written" case, but the "plan.md written" graceful stop case (guidance.md line 114, SKILL.md line 112) currently says "normal state update (Step 7)". The plan needs to clarify: when a graceful stop happens after plan.md is written, should the skill call `submit-plan` or not? Per the CLI architecture, `submit-plan` triggers `COMPLETE_PLAN` which is a state transition. If the plan is written but the user gracefully stopped mid-process, calling `submit-plan` would advance state to "planned" which may be premature. The plan should explicitly address this: does "plan.md written" mean the full flow completed, or could it be a partial stop? This is a semantic question that affects correctness.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** create-slices graceful stop scenarios not fully mapped. The plan mentions create-slices has 3 graceful stop cases (lines 127-129: no files written, sequencing.md only, sequencing.md + some goal.md files). Cases (b) and (c) currently write to state.md and activity-log.jsonl with partial progress status. The plan says "Stops leave artifacts in place -- no state writes" but this contradicts the existing behavior where partial stops DO record state. The plan should clarify: are cases (b) and (c) now truly silent (no CLI call), or should they call a specific CLI command to record partial progress? If silent, the skill loses the ability to resume from partial state. If a CLI call is needed, what command? There is no `submit-slices --partial` command. This is a gap the plan must address explicitly.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 task for create-plan Step 4c3 says "Replace `mkdir -p .project/decisions/` with `decision:create --json`". But `mkdir -p` and `decision:create` are not equivalent operations. The current code creates the decisions directory preemptively before any writes; `decision:create` actually creates a decision record. The plan should clarify: the `mkdir -p` is simply removed (the CLI creates the directory when the first `decision:create` is called), and each subsequent decision write uses `decision:create --json`. This is how explore and complete already work (confirmed by grep), but the plan's phrasing suggests a 1:1 replacement.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Smoke test steps 10-18 use `stdin: ""` syntax which is a skill-prompt convention, not a shell command. The verification section should use shell-compatible syntax like `echo '' | goodplan submit-plan --slice s01 --json` or document that the tester should translate. Steps 4-9 use `echo '...' | goodplan ...` consistently but steps 10-18 switch to the `stdin: ""` notation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** refine-slices Step 5 activity-log entry (line 115) also writes activity-log.jsonl directly. The plan's Phase 1 tasks for refine-slices mention line 114 (state.md update) but not line 115 (activity-log append). The grep at line 57 of the plan would catch this, but the task list should explicitly mention it for completeness.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan correctly applies established migration patterns from slices 03-04 and groups skills by complexity appropriately. Architecture layering is respected -- no CLI code changes proposed, all changes are in skill prompts, dependency direction is correct (skills depend on CLI, not reverse). However, there are 4 IMPORTANT issues around quest scope coverage, graceful stop semantics, and incomplete replacement specifications that could lead to incorrect implementations if not addressed. The graceful stop gap for create-slices partial progress is the most significant -- it represents a behavioral change that could break resume workflows. To reach 9+: explicitly address quest scope in create-plan, fully specify guidance.md replacements with concrete CLI commands, and resolve the graceful stop semantics for both create-plan and create-slices.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
