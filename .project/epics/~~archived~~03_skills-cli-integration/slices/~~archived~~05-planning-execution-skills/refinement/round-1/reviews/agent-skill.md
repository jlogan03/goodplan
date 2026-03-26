# Agent Skill Review: Planning & Execution Skills Migration

## Issues

**[IMPORTANT]** Plan underestimates implement-plan hit count — missing state.md update step
The plan lists implement-plan/SKILL.md as having "2 hits" (activity-log only). However, the plan's task description also only mentions replacing the activity-log append (Step 4.2 lines 296-299) and adding `requires` frontmatter. This is internally consistent — implement-plan genuinely has no `state.md` write step. But the Phase 1 "Expected Behavior — Before" check (`grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/refine-plan/ skills/implement-plan/ skills/refine-slices/`) expects "~13" hits total. Actual counts: refine-plan=3, implement-plan=2, refine-slices=1 = 6 total (not ~13). The `__active__` pattern hits (which bring the total higher) are NOT included in that grep pattern. This is a cosmetic inaccuracy but could mislead the implementer about what "done" looks like.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing `__active__` pattern from Phase 1 "Before" grep
The Phase 1 "Before" grep only checks `state\.md\|activity-log\.jsonl\|state-and-activity-formats` but does NOT include `__active__` or `ls -d`. The `__active__` hits in refine-plan (1), implement-plan (2 in references), and refine-slices (3) would be missed by this grep. The Phase 1 Verification section (line 57) correctly includes `ls -d.*__active__` in its grep, but the "Expected Behavior — Before" section does not. Fix: add `\|__active__\|ls -d` to the Before grep, and update the expected hit count.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Quest-scoped planning not addressed in create-plan task list
The research file (risk #4) flags: "Quest scope in create-plan: The skill handles side quests (quest:plan, quest:refine-plan) alongside slices. Ensure quest variants of CLI commands are covered." Looking at create-plan/SKILL.md, the scope resolution (lines 27, 29, 31) handles both slices and side-quests. The plan's Phase 2 task for create-plan Step 7 mentions "For quest scope: use the quest equivalent" but doesn't specify the exact command (`quest:plan`, `quest:refine-plan`). The create-plan/references/guidance.md also has side-quest paths with `__active__` references. The plan should be explicit about which CLI commands replace the quest-scoped state writes, similar to how slice commands are spelled out.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Smoke test step 10 syntax: `stdin: ""` is not valid shell
Step 10 uses `stdin: "" | goodplan slice:plan --slice s01 --json`. The `stdin: ""` notation is not valid bash — this is a skill instruction convention, not a shell command. For a smoke test that will be executed in a terminal, use `echo '' | goodplan slice:plan --slice s01 --json` or `echo '{}' | goodplan slice:plan --slice s01 --json` consistently. This applies to steps 10, 12, 13, 16, 18.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `decision:create` task in Phase 2 lacks stdin payload specification
The create-plan Phase 2 task (line 88) says "Replace `mkdir -p .project/decisions/` with `decision:create --json`" but doesn't specify the stdin payload format. The `decision:create` command requires `{ "id": "<id>", "domain": "<domain>", "title": "<title>", "summary": "<summary>" }` per the command definition. The plan should include this payload shape so the implementer knows what to pipe.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** create-slices CLAUDE.md update task (line 101) — unclear what `__active__` paths need replacing
The plan says "Step 9 (CLAUDE.md update) lines 146-148: Replace `__active__` path references with unprefixed paths." Looking at the actual code (line 146-148), these are example paths showing what to add to CLAUDE.md (e.g., `.project/epics/__active__initial/slices/sequencing.md`). The plan should clarify whether this is replacing a hardcoded example path with a dynamic instruction (use `status --json` to get the epic name, then construct the path without `__active__` prefix), or simply updating the example text.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured, follows established migration patterns from slices 03-04, and correctly identifies all target files and their pattern hits. The phasing (low-complexity first, high-complexity second, validation third) is sound. The comprehensive smoke test in Phase 3 is thorough. The main gaps are: (1) the "Before" expected behavior greps in Phase 1 don't match the Verification greps — they omit `__active__` patterns; (2) quest-scoped CLI commands in create-plan aren't spelled out; (3) smoke test uses skill-instruction syntax instead of valid shell. To reach 9+: fix the grep pattern consistency, spell out quest-scoped commands explicitly, and use valid shell in the smoke test.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
