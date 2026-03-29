# Agent Skill Review — Phase 03 (refine-architecture + audit-architecture Updates)

## Issues

**[IMPORTANT]** Audit report template does not include sections for new finding types
The audit report format in `audit-architecture/SKILL.md` Step 5 still uses the original template with only `## Gap Analysis` and `## Architecture Reassessment` sections. The new Steps 3b/3c/3d produce findings (fitness function audit, invariant compliance, maturity promotion) that have no corresponding sections in the report template. An executing agent would have to improvise where to put these findings, leading to inconsistent reports.

Add three sections to the report template after `## Architecture Reassessment`:
```markdown
## Fitness Function Audit
<fitness function status by subsystem: documented-and-present, documented-but-missing, stale>

## Invariant Compliance
<invariant compliance spot-check results with evidence>

## Maturity Changes
<promotions/demotions applied with rationale, or "No maturity changes">
```

Also update the `Type` column values in the Findings Summary table to include the four new finding categories: `stale-fitness-function`, `missing-fitness-function`, `invariant-violation`, `invariant-amendment-needed` (in addition to existing `gap/improvement`).

File: ~/.claude/skills/audit-architecture/SKILL.md:162
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Step 3b fitness function source location slightly ambiguous
Step 3b says to check fitness functions "from the maturity table in `_overview.md` and the `## Fitness Functions` sections in `<subsystem>-api.md` files." The `maturity-conventions.md` establishes that full entries live in `<subsystem>-api.md` and the maturity table contains summary pointers. Step 3b should clarify that the primary source of truth for what to audit is the `<subsystem>-api.md` entries, with the maturity table used only as an index to identify which subsystems have fitness functions. Currently an agent could read only the maturity table (which has minimal info) and try to audit from that.

Consider rewording: "Identify subsystems with fitness functions from the maturity table in `_overview.md`, then read the full entries from the `## Fitness Functions` sections in their `<subsystem>-api.md` files."

File: ~/.claude/skills/audit-architecture/SKILL.md:87
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Refine-architecture SKILL.md sub-step numbering inconsistency
Step 0 now has 7 sub-steps (1-7). Sub-step 3 is "Load maturity conventions" (new) and sub-step 4 is "Prerequisite check" (was sub-step 3). The References section at the bottom still lists items in the original conceptual order. This is not a functional issue since references are looked up by name, not number, but the sub-step renumbering is clean and well-done.

No action needed — noting for completeness.

File: ~/.claude/skills/refine-architecture/SKILL.md:67
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is well-structured and follows established patterns closely. All four plan tasks for refine-architecture are correctly implemented: maturity context loading is properly inserted, guidance.md has thorough maturity evaluation criteria with per-level questions, the reviewer registry correctly assigns maturity evaluation to the Software Architecture reviewer, and editor guardrails cover all three required maturity rules. The conflict resolution table addition is appropriate.

For audit-architecture, Steps 3b/3c/3d are clear, well-sequenced, and the guidance.md additions (fitness audit strategy, invariant compliance approach, maturity criteria, four new finding categories with templates) are thorough and well-integrated with existing patterns. Graceful stop cases correctly follow the established marker pattern.

The one IMPORTANT issue preventing a 9 is the audit report template gap — the report format doesn't include sections for the three new analysis steps' output. This is a structural omission that would cause inconsistent behavior at runtime. Fixing the report template would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
