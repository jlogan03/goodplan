# Generalist Review — Phase 3: refine-architecture + audit-architecture Updates

**Score: 9/10**

## Summary

Both skills have been thoroughly updated with maturity, invariant, and fitness function support. The changes are well-integrated, consistent with `maturity-conventions.md`, and additive (no existing behavior modified). Cross-file references are consistent between the two skills.

## Critical Issues

None.

## Important Issues

None.

## Minor Issues

### M1: audit-architecture guidance `invariants.md` path inconsistency

In `audit-architecture/SKILL.md` Step 3c, the path is `architecture/invariants.md` (relative, no `.project/` prefix), while `maturity-conventions.md` specifies the canonical location as `architecture/invariants.md` (also relative). This is consistent, but both are ambiguous — the skill's Step 1 loads from `.project/architecture/` while Step 3c just says `architecture/invariants.md`. A reader could wonder whether this means `.project/architecture/invariants.md` or something else. The intent is clear from context, but other steps in the same file use the full `.project/architecture/` path.

**Recommendation**: Use `.project/architecture/invariants.md` in Step 3c for consistency with other path references in the same file.

### M2: Synthesis sub-agent prompt lacks maturity conflict resolution

The synthesis sub-agent prompt in `refine-architecture/references/sub-agent-prompts.md` has a "Conflict Resolution for Architecture" section that lists four resolution rules. The new maturity assessment conflict rule was added to `guidance.md` but not mirrored in the synthesis prompt's conflict resolution list. Since the synthesis agent resolves contradictions, it should know that maturity assessment disagreements trust the Software Architecture reviewer for structural evidence and escalate business-context promotions to USER_INPUT.

**Recommendation**: Add the maturity assessment rule to the synthesis prompt's conflict resolution section.

### M3: Audit report template not updated for new steps

The audit report format in `audit-architecture/SKILL.md` Step 5 shows sections for Gap Analysis, Architecture Reassessment, Side Quests Created, Architecture Files Updated, and Deferred Findings. It does not include sections for the three new steps: Fitness Function Audit (3b), Invariant Compliance Check (3c), or Maturity Promotion Suggestions (3d). These findings would presumably be folded into the existing sections or the Findings Summary table, but explicit sections would make the report more navigable and ensure nothing is lost.

**Recommendation**: Add `## Fitness Function Audit`, `## Invariant Compliance Check`, and `## Maturity Promotions` sections to the report template.

## Cross-File Consistency

**Verified consistent:**

- Both skills reference `maturity-conventions.md` for format definitions
- refine-architecture reviewer registry and guidance both point to the Software Architecture reviewer for maturity evaluation
- audit-architecture's Steps 3b/3c/3d reference the same artifacts (maturity table in `_overview.md`, fitness functions in `<subsystem>-api.md`, `invariants.md`) as documented in `maturity-conventions.md`
- Editor guardrails in `sub-agent-prompts.md` reference `maturity-conventions.md` format for fitness function entries, consistent with the conventions file's definition
- Graceful stop markers in audit-architecture follow the existing `<!-- partial -->` pattern
- Finding categories in audit-architecture guidance (stale-fitness-function, missing-fitness-function, invariant-violation, invariant-amendment-needed) correctly map to gap/improvement quest types with appropriate severity levels
- Maturity promotion/demotion criteria in audit-architecture guidance are consistent with `maturity-conventions.md` promotion criteria

## Plan Adherence

All 10 tasks checked off in the plan phase document are implemented:

- [x] refine-architecture: maturity context loading inserted as sub-step 3 (between decisions and prerequisite check)
- [x] refine-architecture guidance: Maturity Evaluation section with per-level questions
- [x] Reviewer registry: Software Architecture reviewer note about maturity evaluation
- [x] Editor guardrails: maturity change annotation, fitness format, invariant confirmation rules
- [x] Conflict resolution table: maturity assessment row added
- [x] audit-architecture: Step 3b (Fitness Function Audit) with classification scheme
- [x] audit-architecture: Step 3c (Invariant Compliance Check) with heuristic approach
- [x] audit-architecture: Step 3d (Maturity Promotion Suggestions) with evidence-based recommendations
- [x] audit-architecture guidance: fitness audit strategy, invariant compliance approach, maturity criteria, four finding categories with templates
- [x] Graceful stop cases: all three new steps covered with appropriate markers

## Quality Assessment

The implementation is high quality. The maturity evaluation criteria are well-thought-out with specific questions per level. The fitness function audit's three-way classification (present/missing/stale) is pragmatic. The invariant compliance checking is appropriately scoped as heuristic spot-checking rather than exhaustive verification. The editor guardrails are specific and actionable (MATURITY CHANGE annotation format, FLAGGED markers for invariant changes).

The only gap is cosmetic: the three minor issues above are about consistency within files rather than functional problems.
