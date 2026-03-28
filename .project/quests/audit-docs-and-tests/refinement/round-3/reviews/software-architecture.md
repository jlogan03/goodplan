# Software Architecture Review (Round 3) — audit-docs-and-tests Plan

## Issues

**[MINOR] Graceful stop step numbers in markers are implicit — resume detection must match by step name, not number**
The plan's graceful stop sections (Step 8 for audit-docs, Step 9 for audit-tests) define per-step partial markers like `<!-- partial — interrupted during source discovery`. The resume detection in Step 1 checks for `<!-- partial — interrupted` marker in the most recent audit file. Since the lifecycle envelope concept means teardown step numbers differ between skills (Step 8 vs Step 9 for graceful stop), the resume logic correctly keys on the marker text content (e.g., "during source discovery") rather than step numbers. This is fine. However, the markers reference step-name descriptions ("during source discovery", "during codebase reading") that must exactly match what resume logic looks for. Consider noting in the plan that resume detection should parse the marker text for "interrupted during X" and map X back to the corresponding step, rather than relying on fragile string matching. This is a minor implementation guidance gap — the current markers are well-structured and consistently patterned, so the risk is low.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Shared reference files between audit-docs and audit-tests have identical structure but no shared source**
Both skills define their own `references/guidance.md` with the same structure: severity levels (Critical/Important/Minor matching audit-architecture), reviewer output format (findings table with Severity/Description/Evidence/Suggested Action columns), and side quest proposal template. The content is described identically except for the domain-specific finding categories. This is three copies of the same severity definitions and output format (audit-architecture, audit-docs, audit-tests). The `skills/_shared/references/` directory exists for exactly this purpose. Consider whether the shared severity levels and findings table format should be extracted to a shared reference (e.g., `_shared/references/audit-conventions.md`) with each skill's `guidance.md` importing it and adding domain-specific categories. This would reduce drift risk across the audit family. However, given all subsystems are at Developing maturity and the audit skills are new, some duplication to maintain skill independence is reasonable. Flag for consideration but not blocking.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All five issues from Round 2 have been addressed effectively:
- Side quest creation divergence is now explicitly tracked with a follow-up task (line 132)
- Step numbering is explained via the lifecycle envelope concept (line 15) — setup steps 0-1 are identical, teardown steps use the same names and relative order, domain steps vary in count
- Epic scope resolution added to Step 2 of both skills (lines 42, 104)
- Coverage map type signature clarified as illustrative/mental model (line 105)
- Verification success criteria are now concrete and measurable (lines 75, 138)

The plan is architecturally sound. Module boundaries are clear (each skill is a self-contained directory with SKILL.md + references/), the dependency direction is correct (skills depend on shared references and CLI, not on each other), and the lifecycle envelope pattern provides consistency without forcing identical step counts. The sub-agent pattern (parallel reviewers with structured output, orchestrator synthesis) correctly mirrors audit-architecture. The only remaining observations are minor: resume marker fragility and reference file duplication — neither is blocking.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
