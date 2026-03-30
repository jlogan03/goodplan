# Agent Skill Review — Phase 02 (define-architecture Update)

## Issues

**[IMPORTANT]** CLAUDE.md Project Context format does not mention `invariants.md`
The guidance.md Project Context template (lines 7-26) lists architecture files to include in CLAUDE.md but has no comment or example line for `architecture/invariants.md`. Step 9 instructs the agent to "add a reference line under the 'Read these before doing any significant work' block with a brief description" for "each architecture file written in Step 8." Since `invariants.md` is written in Step 8g (which is part of Step 8), it should be picked up by this generic instruction. However, the template comment on line 16 says "Add a line for each architecture file actually written (e.g. data-model.md, flows.md, ui-ux.md)" — the examples don't include `invariants.md`, making it easy for an agent to overlook it. Adding `invariants.md` as an explicit example in that comment would reduce the risk of omission.
File: ~/.claude/skills/define-architecture/references/guidance.md:16
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Step 8g uses AskUserQuestion inconsistently with Steps 8f and 8h
Step 8f says "Present the completed maturity table to the user for review using AskUserQuestion" and Step 8h says "Present the candidates to the user using AskUserQuestion." Step 8g says "Ask the user using AskUserQuestion" for the initial question, but for the draft iteration it says "Present the draft and iterate until the user approves" without specifying AskUserQuestion for the approval step. This is inconsistent — the other steps explicitly name the tool for user confirmation. An agent following Step 8g may use inline questions instead of AskUserQuestion for draft approval, which changes the interaction pattern.
File: ~/.claude/skills/define-architecture/SKILL.md:185
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Graceful stop for Step 8f references "Step 9" parenthetically but means Step 9 (CLAUDE.md Update)
The graceful stop case for Step 8f says "Update CLAUDE.md Project Context to reference all files written so far (Step 9)." The "(Step 9)" here is a cross-reference to where CLAUDE.md update happens, not a directive to run Step 9. This is correct but slightly ambiguous — other graceful stop cases (the existing ones for design tree passes) don't have this parenthetical. The inconsistency is minor but could confuse an agent into thinking it should run the full Step 9 procedure during graceful stop.
File: ~/.claude/skills/define-architecture/SKILL.md:162
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 8h sub-step 2 says "each subsystem with an `<subsystem>-api.md` file" but Step 8f covers all subsystems from `_overview.md`
Step 8f creates maturity rows for subsystems from both `_overview.md`'s Subsystems section and `<subsystem>-api.md` files. Step 8h only adds fitness function candidates to subsystems with API files. This is intentional (you can only add a `## Fitness Functions` section to a file that exists), but it means subsystems documented only in `_overview.md` (without their own API file) will have "—" in the Fitness Functions column permanently. The guidance.md section could note this explicitly to avoid confusion during execution.
File: ~/.claude/skills/define-architecture/SKILL.md:193
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `architecture-logic-templates.md` subsystem API template has a bare `<Candidate fitness functions...>` placeholder
The `## Fitness Functions` section in the subsystem API template (line 146) contains `<Candidate fitness functions identified during architecture definition. Full entries added as the subsystem matures.>` in angle brackets. This reads as a placeholder instruction, but the rest of the template uses angle brackets for fill-in-the-blank content (e.g., `<What this subsystem does>`). The fitness functions placeholder is different — it's guidance text, not fill-in content. An agent might try to replace it with content during Step 8b (initial file writing) before Step 8h has run. Consider changing to a markdown comment or a note that Step 8h populates this section.
File: ~/.claude/skills/define-architecture/references/architecture-logic-templates.md:146
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is well-structured and addresses all plan tasks. Steps 8f/8g/8h are clearly sequenced, the graceful stop cases follow existing patterns, and the guidance section provides good practical direction. The step numbering collision identified in research was correctly resolved by using 8f/8g/8h. Two things would bring this to 9+: (1) making `invariants.md` explicit in the CLAUDE.md template comment so agents reliably include it, and (2) making the AskUserQuestion usage consistent across all three new steps.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
