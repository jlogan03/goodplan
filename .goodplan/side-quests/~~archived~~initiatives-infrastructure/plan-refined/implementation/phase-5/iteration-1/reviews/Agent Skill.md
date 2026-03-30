## Issues

**[IMPORTANT]** audit-architecture missing scaffold detection on fallback path
`/refine-architecture` correctly detects the `<!-- scaffold -->` marker when falling back to `.project/architecture/` (Step 0b) and stops with a helpful message. `/audit-architecture` lacks this check entirely. When no active initiative exists and top-level architecture is a scaffold (e.g., after first initiative's `/define-architecture`), the audit skill would glob the scaffold `_overview.md`, treat it as real architecture, and produce a misleading gap analysis.
File: ~/.claude/skills/audit-architecture/SKILL.md:38
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** explore-complete.md template missing initiative scope option
The `explore-complete.md` template in `explore-logic.md` lists scope options as `<project-level | vertical-slices/<name> | side-quests/<name>>` but omits `initiatives/<name>`. Since explore now supports initiative scope (the path mapping table correctly includes an Initiative row), the template should include it so agents writing the file at initiative scope produce correct output.
File: ~/.claude/skills/explore/references/explore-logic.md:22
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Flow-log echo commands use `$FLOW_SCOPE` inside single quotes
In `/refine-architecture` (line 216) and `/audit-architecture` (line 267), the flow-log echo commands use `$FLOW_SCOPE` inside single-quoted strings. While these are pseudo-code for LLM interpretation (not literal bash), other skills use `<scope>` angle-bracket placeholder style (e.g., `/explore` line 125). The mixed placeholder conventions (`$VARIABLE` vs `<placeholder>`) across skills could cause minor confusion. Both skills have clarifying text below the code block, so this is cosmetic.
File: ~/.claude/skills/refine-architecture/SKILL.md:216
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Explore prototype mode scope escalation message inconsistent
In Step 4a, if a user selects Prototype at slice/quest scope, the skill offers to switch to "project scope." Since initiatives also support prototypes, this should say "project or initiative scope" to be consistent with the mode availability listed just above.
File: ~/.claude/skills/explore/SKILL.md:145
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

All four skills correctly implement initiative awareness per the plan. Path resolution, state machine integration, scaffold creation, and flow-log scoping are well-structured. The two IMPORTANT issues are real gaps: audit-architecture would misbehave on scaffold fallback, and the explore-complete template would produce incomplete scope annotations. Fixing those two and the two minor items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
