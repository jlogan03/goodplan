# Merged Feedback: Planning & Execution Skills Migration (Round 1)

## CRITICAL Issues

None.

## IMPORTANT Issues

**IMP-1: Phase 1 "Before" grep pattern omits `__active__` and expected count is wrong**
Flagged by: holistic, agent-skill
The Phase 1 "Expected Behavior — Before" grep checks `state\.md\|activity-log\.jsonl\|state-and-activity-formats` and expects ~13 hits. Actual count for that pattern is 6 (refine-plan=3, implement-plan=2, refine-slices=1). The ~13 figure only holds if `__active__` and `ls -d` patterns are included, but the Before grep omits them. The Phase 1 Verification grep (line 57) correctly includes `__active__` — the Before grep should match it. Fix: add `\|__active__\|ls -d` to the Before grep and update the expected count to match.
Resolution: DIRECTLY_ACTIONABLE

**IMP-2: Quest-scoped CLI commands not spelled out in create-plan**
Flagged by: holistic, software-architecture, agent-skill
Phase 2 create-plan Step 7 says "For quest scope: use the quest equivalent" without specifying the exact command (`submit-plan --quest <name> --json`). Similarly, scope resolution in Step 2 (lines 27, 29, 31) handles both slices and side-quests via `__active__` globs and `state.md`, but the plan only mentions `.activeEpic` and `.activeSlice` replacements — `.activeQuest` is missing. Fix: spell out all quest-scoped commands explicitly, including `submit-plan --quest <name> --json` and `goodplan status --json` -> `.activeQuest` for quest detection.
Resolution: DIRECTLY_ACTIONABLE

**IMP-3: create-plan guidance.md replacement specifications are incomplete**
Flagged by: holistic, software-architecture
The plan lists 7 hits in guidance.md and groups replacements under "Lines 5-7" but these are 3 distinct changes: (1) line 5 `__active__` glob -> `status --json` -> `.activeEpic` + unprefixed path, (2) line 6 `state.md` read -> `status --json` -> `.activeSlice`, (3) line 7 `__active__` auto-detect glob -> `slice:list --json` to find plannable slices. Without concrete CLI commands per line, the implementer must infer the correct replacements.
Resolution: DIRECTLY_ACTIONABLE

**IMP-4: Graceful stop semantics for create-plan "plan.md written" case**
Flagged by: software-architecture
When a graceful stop happens after plan.md is written (guidance.md line 114, SKILL.md line 112), the existing behavior says "normal state update (Step 7)". The plan should clarify: does calling `submit-plan` after a graceful stop prematurely advance state to "planned"? If "plan.md written" means the full flow completed, `submit-plan` is correct. If it could be a partial stop, calling `submit-plan` would be incorrect. The plan must explicitly resolve this semantic question.
Resolution: DIRECTLY_ACTIONABLE

**IMP-5: create-slices graceful stop with partial progress — no CLI command for partial state**
Flagged by: software-architecture
create-slices has 3 graceful stop cases: (a) no files written, (b) sequencing.md only, (c) sequencing.md + some goal.md files. Cases (b) and (c) currently write partial progress to state.md and activity-log.jsonl. The plan says "Stops leave artifacts in place — no state writes," which contradicts the existing behavior. There is no `submit-slices --partial` command. The plan must address: are partial stops now silent (losing resume capability), or is a new CLI mechanism needed?
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**MIN-1: Smoke test steps use `stdin: ""` pseudo-syntax instead of valid shell**
Flagged by: holistic, software-architecture, agent-skill
Steps 10, 12, 13, 16, 18 use `stdin: "" | goodplan ...` which is skill-instruction notation, not runnable shell. Replace with `echo '' | goodplan ...` or `echo '{}' | goodplan ...` for consistency with steps 4-9 and previous slices.
Resolution: DIRECTLY_ACTIONABLE

**MIN-2: Phase 1 refine-slices task unclear about Step 0 version check integration**
Flagged by: holistic
The task says "Add version check (Step 0)" but refine-slices SKILL.md has existing Step 0 content (epic detection via `__active__` glob). Clarify that the version check is prepended to or integrated into the existing Step 0, not a replacement. Use explore/create-architecture skills as pattern reference.
Resolution: DIRECTLY_ACTIONABLE

**MIN-3: create-plan Phase 2 `decision:create` replacement phrasing is misleading**
Flagged by: software-architecture, agent-skill
The plan says "Replace `mkdir -p .project/decisions/` with `decision:create --json`" but these are not equivalent operations. `mkdir -p` is preemptive directory creation; `decision:create` creates an actual decision record. Clarify: the `mkdir -p` is simply removed, and each subsequent decision write uses `decision:create --json` with the required payload shape (`{ "id", "domain", "title", "summary" }`).
Resolution: DIRECTLY_ACTIONABLE

**MIN-4: create-slices CLAUDE.md example path needs rewriting**
Flagged by: holistic, agent-skill
Line 148 has hardcoded `__active__` example path (`.project/epics/__active__initial/slices/sequencing.md`). The plan correctly identifies this needs replacing but should clarify whether the replacement is a dynamic instruction (use `status --json` to get epic name, construct unprefixed path) or simply updated example text.
Resolution: DIRECTLY_ACTIONABLE

**MIN-5: refine-slices activity-log append (line 115) not explicitly listed in Phase 1 tasks**
Flagged by: software-architecture
The plan's Phase 1 tasks for refine-slices mention line 114 (state.md update) but not line 115 (activity-log append). The grep would catch it, but the task list should mention it explicitly.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

All 10 issues (5 IMPORTANT, 5 MINOR) are directly actionable.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

**Graceful stop semantics (software-architecture IMP-3 vs holistic/agent-skill silence)**
Software-architecture raised two graceful stop issues (create-plan "plan.md written" case and create-slices partial progress) that the other reviewers did not flag. These are not contradictions but gaps — the other reviewers simply didn't examine graceful stop paths. Trusting the domain specialist (software-architecture) on these architectural concerns. Both issues kept as IMPORTANT (IMP-4, IMP-5).

## Unresolved (USER_INPUT required)

None. All issues are directly actionable by the plan author.
