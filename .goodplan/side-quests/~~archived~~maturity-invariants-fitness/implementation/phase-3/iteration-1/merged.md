# Merged Review — Phase 3: refine-architecture + audit-architecture Updates

**Composite Score: 8.5/10**
Generalist: 9/10 | Agent Skill: 8/10

## Summary

Both skills are thoroughly updated with maturity, invariant, and fitness function support. Changes are well-integrated, consistent with `maturity-conventions.md`, and additive (no existing behavior modified). All 10 plan tasks are implemented. The one meaningful gap is a structural omission in the audit report template — the format doesn't include sections for the three new analysis steps, which would cause inconsistent output at runtime.

---

## Issues

### IMPORTANT: Audit report template missing sections for new finding types

**Raised by**: Agent Skill (IMPORTANT), Generalist (M3 — Minor)
**Resolution**: DIRECTLY_ACTIONABLE — Agent Skill frames this as important/structural; Generalist frames it as minor/cosmetic. Adopt Agent Skill's severity: the omission is structural and causes runtime inconsistency.

The audit report format in `audit-architecture/SKILL.md` Step 5 does not include sections for the three new steps (3b Fitness Function Audit, 3c Invariant Compliance Check, 3d Maturity Promotion Suggestions). An executing agent must improvise where to place these findings, leading to inconsistent reports.

Add three sections to the report template after `## Architecture Reassessment`:

```markdown
## Fitness Function Audit
<fitness function status by subsystem: documented-and-present, documented-but-missing, stale>

## Invariant Compliance
<invariant compliance spot-check results with evidence>

## Maturity Changes
<promotions/demotions applied with rationale, or "No maturity changes">
```

Also update the `Type` column values in the Findings Summary table to include the four new finding categories: `stale-fitness-function`, `missing-fitness-function`, `invariant-violation`, `invariant-amendment-needed` (alongside existing `gap/improvement`).

File: `~/.claude/skills/audit-architecture/SKILL.md` (Step 5, line ~162)

---

### MINOR: Step 3b fitness function source location ambiguous

**Raised by**: Agent Skill (MINOR)

Step 3b says to check fitness functions "from the maturity table in `_overview.md` and the `## Fitness Functions` sections in `<subsystem>-api.md` files." An agent could read only the maturity table (which has minimal info) and attempt to audit from that, rather than reading the full entries.

Clarify: "Identify subsystems with fitness functions from the maturity table in `_overview.md`, then read the full entries from the `## Fitness Functions` sections in their `<subsystem>-api.md` files."

File: `~/.claude/skills/audit-architecture/SKILL.md` (Step 3b, line ~87)

---

### MINOR: Synthesis sub-agent prompt missing maturity conflict resolution rule

**Raised by**: Generalist (M2)

The synthesis sub-agent prompt in `refine-architecture/references/sub-agent-prompts.md` has a "Conflict Resolution for Architecture" section with four rules. The maturity assessment conflict rule was added to `guidance.md` but not mirrored in the synthesis prompt. Since the synthesis agent resolves contradictions, it should know that maturity assessment disagreements trust the Software Architecture reviewer for structural evidence and escalate business-context promotions to USER_INPUT.

Add the maturity assessment rule to the synthesis prompt's conflict resolution section.

File: `~/.claude/skills/refine-architecture/references/sub-agent-prompts.md`

---

### MINOR: `audit-architecture` Step 3c path reference ambiguity

**Raised by**: Generalist (M1)

Step 3c uses the path `architecture/invariants.md` without the `.project/` prefix, while other steps in the same file use `.project/architecture/`. The intent is clear from context, but inconsistency could confuse a reader.

Use `.project/architecture/invariants.md` in Step 3c for consistency.

File: `~/.claude/skills/audit-architecture/SKILL.md` (Step 3c)

---

## Non-Issues / Noted for Completeness

- **refine-architecture SKILL.md sub-step renumbering**: Step 0 now has 7 sub-steps after inserting the maturity context load as sub-step 3. The References section order is unchanged. This is not a functional issue — references are looked up by name. No action needed.

---

## Confirmed Correct

- Both skills reference `maturity-conventions.md` for format definitions
- Reviewer registry and guidance both assign maturity evaluation to the Software Architecture reviewer
- audit-architecture Steps 3b/3c/3d reference the same artifacts as `maturity-conventions.md`
- Editor guardrails reference `maturity-conventions.md` format for fitness function entries
- Graceful stop markers follow the existing `<!-- partial -->` pattern
- Finding categories map correctly to gap/improvement quest types with appropriate severity levels
- Maturity promotion/demotion criteria are consistent with `maturity-conventions.md`
- All 10 plan tasks verified implemented
