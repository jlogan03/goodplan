## Issues

**[IMPORTANT]** Flow-log backward compatibility not addressed in Phase 1 or 2
The research file explicitly identifies that `flow-log.jsonl` contains 12+ entries with `"phase":"complete-slice"` and that the signal tracking algorithm (Step 6d) filters on `phase: "complete-slice"`. The plan's Phase 2 tasks extend many steps but never mention updating the signal tracking discovery logic to match BOTH `"complete-slice"` and `"complete"` phase values. Similarly, Step 10's flow-log append template still shows `"phase":"complete-slice"` in the existing SKILL.md — the plan should include a task to change the phase value written to flow-log to `"complete"` AND update the signal tracking filter to match both old and new values.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Historical references in `.project/learnings.md` and `.project/system-profile.md` — no decision documented
The research file flags `.project/learnings.md` (4 occurrences including `_Source: 07-complete-slice_` tags and a learning title) and `.project/system-profile.md` (~8 occurrences including recency markers and descriptive text). The plan's Phase 1 task "Update repo files" lists a grep but only calls out `workflow.md`, `CLAUDE.md`, and `.project/idea.md` — all of which the research confirms already use `/complete`. The actual files needing updates (`learnings.md`, `system-profile.md`, side quest `goal.md` files) are not listed. The plan should explicitly decide: (a) update historical references or (b) leave as-is with a documented rationale (these are historical records). Either way, the plan needs a task or an explicit "leave as-is" note for each.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 tasks reference `initiative-conventions.md` parentheticals that don't exist
The research file explicitly states: "`_shared/references/initiative-conventions.md` already uses `/complete` (no `complete-slice` references). It does NOT have parenthetical annotations to clean up." Yet Phase 3 has two tasks dedicated to updating `initiative-conventions.md` transition tables and Consumer Guide to change `/complete-slice` to `/complete`. These tasks are no-ops — the file already uses `/complete`. The plan should either remove these tasks or correct them to target files that actually need changes.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Side quest goal files with `complete-slice` references not addressed
The research identifies three side quest `goal.md` files with `complete-slice` references: `onboard-repo/goal.md` (1 occurrence), `refactor-intelligence/goal.md` (3 occurrences), and `maturity-context-loading/goal.md` (1 parenthetical). These are active side quests whose goal files reference the old name. The plan's Phase 1 "Update repo files" task does not mention them. They should either be updated or explicitly marked as leave-as-is.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 verification lacks runtime/behavioral verification
Phase 2 verification only checks file contents (Read SKILL.md, Read guidance.md, verify graceful stop cases). For a skill that orchestrates a multi-step interactive workflow, verification should include at least a dry-run scenario: invoke `/complete` against a test initiative scope to confirm the new initiative detection and scope resolution works end-to-end. Even a quick "run Step 0 and Step 2 against `.project/initiatives/__active__*/`" would catch integration issues.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 "Extend Step 0" and "Extend Step 2" overlap on initiative detection
The Step 0 task says "Add `$SCOPE_TYPE = initiative` detection" with matching logic, and the Step 2 task says "Add initiative to scope resolution" with its own matching logic and auto-detect additions. The boundary between what goes in Step 0 (variable resolution) vs Step 2 (scope determination) is unclear for the initiative case. The existing pattern (Step 0 resolves variables AFTER Step 2 identifies scope) should be followed consistently — Step 2 should detect the initiative scope, and Step 0 should only define what variables to set once detected.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan does not address `system-profile-format.md` recency marker format update
After the rename, the recency markers written by the skill change from `complete-slice` to `complete`. The plan updates `system-profile-format.md` references (Phase 1), but the recency markers already embedded in `.project/system-profile.md` will still say `complete-slice`. If the skill's logic checks/overwrites its own markers (as guidance.md suggests: "Overwrites its own previous entries"), the new `complete` marker won't match old `complete-slice` markers. The plan should note this backward compatibility concern or add a task to update existing markers.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has a solid structure and covers the core rename + initiative completion extension well. However, it has significant gaps around backward compatibility (flow-log phase filtering, recency markers), contradicts its own research (Phase 3 targets files that already use `/complete`), and leaves several known reference files unaddressed without documenting a rationale. To reach 9+: fix the flow-log backward compatibility gap, resolve the historical references decision, remove the no-op Phase 3 tasks, and address the side quest goal files.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
