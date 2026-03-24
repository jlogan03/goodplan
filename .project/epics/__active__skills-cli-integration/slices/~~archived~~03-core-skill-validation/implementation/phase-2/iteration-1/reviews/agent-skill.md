# Agent Skill Review — Phase 2: complete Migration (Iteration 1)

## Issues

**[CRITICAL]** `$EPIC_DIR` path inconsistency between Step 0 and Step 4
Step 0 (line 36) sets `$EPIC_DIR` to `.project/epics/<epic-name>/` with a note that "the filesystem path uses `__active__<name>` but CLI commands use just `<name>`" -- yet the path it defines omits `__active__`. Step 4 (line 150) correctly uses `.project/epics/__active__<name>/` for epic scope directories. The archive commands in Step 10b (lines 415-421) also correctly use `__active__`. An agent following Step 0 literally would construct a path to a non-existent directory. Step 0 should set `$EPIC_DIR` to `.project/epics/__active__<epic-name>/` -- the `__active__` prefix is part of the actual filesystem path for active epics.
File: skills/complete/SKILL.md:36
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing empty-stdin pattern for read-only CLI commands
The `cli-interaction.md` shared reference (line 97-99) documents: "Always pipe empty stdin even when no input is needed -- the compiled binary reads stdin and will block if nothing is piped." Read-only commands in this skill (`goodplan status --json`, `goodplan --version --json`, `goodplan state --json --query ...`, `goodplan slice:show ...`, `goodplan slice:list --json`) are all shown without piping empty stdin. This could cause the agent to hang when executing these commands. Compare with `project-status/SKILL.md` which also does not pipe empty stdin for `status --json` -- so either the convention doc overstates the requirement or both skills have the same bug. Needs investigation.
File: skills/complete/SKILL.md:46
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** `stat` for re-entry detection vs "Must NOT Do" convention tension
The skill uses `stat .project/slices/<name>/completion/learnings.md` (lines 82-85) for re-entry detection. The cli-interaction conventions say skills must not "Use `ls` or file-existence checks to infer entity status." The plan explicitly approves this as a "legitimate directory-structure read" since `completion/` is LLM-owned and the CLI's `artifacts` object has no `completion` field. However, neither the SKILL.md nor the guidance.md includes a comment explaining why this is allowed despite the general prohibition. An agent following the shared conventions doc might flag this as a violation. Add a brief inline note (e.g., "Note: `stat` on LLM-owned completion artifacts is allowed -- the CLI has no `completion` field in `artifacts`, per the plan.") near the first `stat` usage.
File: skills/complete/SKILL.md:82
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `mkdir -p` for `completion/` vs "Must NOT Do" convention tension
Same pattern as above. The skill runs `mkdir -p <scope-dir>/completion/` in Steps 4 and 6 (lines 145, 225). The shared convention says skills must not "Use `mkdir` to create `.project/` subdirectories." The plan documents this as the intended filesystem-backed accumulation pattern, but the skill lacks an inline justification. Without it, a future reader or agent reviewing the skill against conventions will flag it. Add a brief note near first usage: "Note: `completion/` is a skill-owned LLM artifact directory, not a CLI-managed entity directory."
File: skills/complete/SKILL.md:145
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** SKILL.md line count is high for progressive disclosure
The SKILL.md body is approximately 450 lines. The evaluation criteria recommend keeping SKILL.md under 500 lines with overflow in `references/`. The skill is close to the limit and includes substantial detail in Steps 6d (signal tracking), 6e (artifact promotion), 6f (maturity evaluation), and 9 (refactor intelligence) that could live in `references/guidance.md`. This is minor because it doesn't violate the limit yet, but future additions will push it over.
File: skills/complete/SKILL.md:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Epic guardrail (Step 2.8) mentions `abandoned.md` but uses CLI status check
The guardrail says "all slices are either completed or contain `abandoned.md`" in the prose but the actual check uses `goodplan slice:list --json` with `status === "completed"` or `status === "abandoned"`. The mention of `abandoned.md` is a leftover from the pre-CLI pattern. The CLI status check is correct; remove the "or contain `abandoned.md`" phrase to avoid confusion.
File: skills/complete/SKILL.md:93
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** guidance.md auto-detect (section 3) references "slices/quests" but only queries slices
The auto-detect query in guidance.md Scope Resolution section 3 only queries `.slices` in the jq expression but the text says "After scanning slices/quests, scan for epic completion readiness." There is no corresponding quest auto-detect query. If quest auto-detect is intended, add a similar `state --json --query` for quests. If not, clarify the text.
File: skills/complete/references/guidance.md:7
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The migration is thorough and well-structured. All direct structured-state access has been replaced with CLI commands. The filesystem-backed accumulation pattern is cleanly implemented. The graceful stop simplification (eliminating state.md writes) is a significant improvement. The critical `$EPIC_DIR` path bug and the stdin piping question prevent a higher score. Fixing the critical and resolving the two important convention-tension items would bring this to 9+.

## Summary
- Critical: 1
- Important: 2
- Minor: 3
