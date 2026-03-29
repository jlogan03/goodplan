## Issues

**[MINOR]** Flow-log echo commands still use `$FLOW_SCOPE` inside single quotes
Both `/refine-architecture` (line 216) and `/audit-architecture` (line 275) still embed `$FLOW_SCOPE` inside single-quoted echo strings. As flagged in iteration 1, this is a cosmetic inconsistency with `/explore` and other skills that use `<scope>` angle-bracket style. The clarifying prose below each code block prevents confusion, so the behaviour is correct — the issue is purely stylistic. Since the previous iteration did not fix these, they remain MINOR and unresolved.
File: ~/.claude/skills/refine-architecture/SKILL.md:216
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Both IMPORTANT issues from iteration 1 are fully resolved:

1. **Scaffold detection in audit-architecture** — Step 1b now correctly checks `head -5 .project/architecture/_overview.md` for the `<!-- scaffold -->` marker when falling back to the top-level path, warns the user with an actionable message ("Run `/define-architecture` first or operate on the initiative architecture directly."), and stops. The fix mirrors the identical check in `/refine-architecture` Step 0b. Logic is sound.

2. **Initiative scope in explore-complete.md template** — Line 22 of `explore-logic.md` now reads `<project-level | initiatives/<name> | vertical-slices/<name> | side-quests/<name>>`, adding `initiatives/<name>` to the options. This is consistent with the scope path mapping table (which already had the Initiative row) and with SKILL.md's scope announcement ("Scope: **<scope>**").

Both MINOR issues from iteration 1 were also addressed:
- The prototype scope escalation message in `/explore` (Step 4a, line 145) was updated to "project or initiative scope" — correct.
- The `$FLOW_SCOPE` single-quote issue was not fixed (see remaining MINOR issue above).

`$FLOW_SCOPE` in `/define-architecture` is correctly set in Step 0 and used correctly in Step 10's flow-log write. No new issues introduced.

## Summary
- Critical: 0
- Important: 0
- Minor: 1
