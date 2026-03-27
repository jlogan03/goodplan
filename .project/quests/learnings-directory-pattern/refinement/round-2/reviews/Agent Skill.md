## Issues

**[IMPORTANT]** `create-plan/references/guidance.md` Context Loading section uses bare `learnings.md` — plan misses this reference file
Phase 3 has a task for `skills/create-plan/SKILL.md` (line 64: `.project/learnings.md`) but does not mention `skills/create-plan/references/guidance.md`. Line 13 of that file includes `learnings.md` in the Context Loading list: `"Read (skip missing): ... learnings.md, ..."`. This bare `learnings.md` reference resolves to `.project/learnings.md` — it needs updating to either use the CLI command or reference the new `learnings/` directory. Add an explicit task for this file alongside the existing `create-plan/SKILL.md` task.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `audit-architecture/SKILL.md` line 116 has a second bare `learnings.md` reference the plan misses
The plan's Phase 3 task for `audit-architecture/SKILL.md` addresses line 69 (`Read .project/learnings.md`), but line 116 says: `"Based on reconciled gap findings + learnings.md + decisions + the conversation, evaluate:"`. This bare `learnings.md` reference also needs updating. The task description should note both occurrences.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 Expected Behavior grep patterns could false-match on `completion/learnings.md`
The "After implementation" check `grep -rc '\.project/learnings\.md' skills/` is correct and would not match `completion/learnings.md` (since those references don't include the `.project/` prefix). However, the "Before implementation" checks use `grep -c '\.project/learnings\.md' skills/create-slices/SKILL.md` which is fine, but the second check `grep -c '\.project/learnings\.md' skills/audit-architecture/SKILL.md` only catches line 69, not line 116 (which uses bare `learnings.md` without `.project/` prefix). The "After" aggregate grep would also miss line 116 since it only matches `.project/learnings.md`. Consider adding a broader before/after check: `grep -c 'learnings\.md' skills/audit-architecture/SKILL.md` with expected count adjustments to catch all references.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `create-architecture/references/guidance.md` task description could be more specific
The plan says "Update conditional learnings inclusion" for this file. The actual content (line 17) is `<!-- Add learnings.md line only if that file exists -->`, which is an HTML comment instructing the LLM how to build the CLAUDE.md Project Context section. The task should specify that this comment needs to say `learnings/` directory instead of `learnings.md`, and the corresponding line format should change from a single file reference to a directory reference.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `create-architecture/SKILL.md` Step 9 line 302 has a complex `ls` command checking `learnings.md` — task description should note the specific change
The plan says "Replace `.project/learnings.md` reference" but the actual content at line 302 is an `ls` command: `ls .project/brainstorm/ .project/research/ .project/prototypes/ .project/learnings.md .project/sequencing.md 2>/dev/null`. The task should specify that `learnings.md` in this `ls` command changes to `learnings/` (directory check), and the accompanying note "Note: sequencing.md and learnings.md are written by later skills -- only reference them if they already exist" also needs updating.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
Round 1's critical issues (INV-003 violation, completion/learnings.md conflation) have been thoroughly addressed — the plan now correctly routes file I/O through the RPC layer and explicitly preserves `completion/learnings.md`. The skills audit is much more complete, with explicit tasks for all 5 previously missing skill files. Two important issues remain: a missed reference file (`create-plan/references/guidance.md`) and a second bare reference in `audit-architecture/SKILL.md`. To reach 9+: add the `create-plan/references/guidance.md` task, note both occurrences in the `audit-architecture` task, and tighten the grep patterns to catch bare `learnings.md` references.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
