# Software Architecture Review — Iteration 3

## Issues

**[MINOR] guidance.md line 13 over-cautionary note**
The plan's task for create-plan/references/guidance.md line 13 warns it is "dense with multiple path references — ensure all `__active__` occurrences within it are caught." In practice, line 13 contains exactly one `__active__` occurrence (in the sequencing.md path). The note is not wrong — it is cautious — but could mislead the implementer into thinking there are hidden occurrences. Consider simplifying to just "Replace `__active__` in the sequencing.md path reference."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] create-plan quest scope CLI commands could be more explicit**
The plan's Phase 2 task for create-plan Step 7 says "For quest scope: use `submit-plan --quest <name> --json`" and Step 2 line 29 mentions `goodplan status --json` -> `.activeQuest`. However, the plan does not explicitly call out the `quest:plan --quest <name> --json` begin-phase command that corresponds to `slice:plan`. The current SKILL.md Step 7 handles both slices and quests in its state write-back, but the plan should specify the quest-scope begin command (`quest:plan`) alongside the submit command. The research file (Key CLI Commands section) documents `quest:plan` as out-of-scope for this slice since it maps to the `create-plan` orchestrator flow, but the implementer needs to know whether create-plan should invoke `quest:plan` as the begin transition or whether that is handled externally. Looking at the existing skill flow: create-plan does not invoke any begin transition — it is invoked *after* the orchestrator has already begun the phase. So `submit-plan --quest` is the only command create-plan needs. This is correct but the reasoning is implicit. A one-line clarifying note would help.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is architecturally sound. It correctly applies all 8 established migration patterns from slices 03-04. Layer boundaries are respected — skills never bypass the CLI for state mutations. The dependency direction is correct (skills depend on CLI commands, not internal implementation). The phasing (low-complexity first, high-complexity second, validation last) manages risk well. The decision:create payload matches the actual schema (`{ id, domain, title, summary }`). The graceful stop semantics are correctly simplified (no state writes on partial stops). All invariants (INV-001 through INV-007) are preserved — the migration moves skills *toward* compliance with INV-001 (all mutations through state machine). The two minor issues are clarifications, not structural problems.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
