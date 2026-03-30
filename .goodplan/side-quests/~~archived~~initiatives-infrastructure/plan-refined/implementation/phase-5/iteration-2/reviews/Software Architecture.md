# Software Architecture Review — Phase 5, Iteration 2 (Explore + Define/Refine/Audit Architecture)

## Issues

**[IMPORTANT]** Prototype Mode implementation in explore-logic.md hardcodes project-level path despite initiative scope support
The scope path mapping table in `explore-logic.md` (line 9) correctly shows initiative scope has its own `prototypes/` directory at `.project/initiatives/__active__<name>/prototypes/<name>/`. The note on line 14 explicitly confirms "Initiative scope supports Prototype mode (like Project scope)." However, the Prototype Mode implementation section (line 75-81) still uses the old project-level hardcoded path: `mkdir -p .project/prototypes/<name>/`. When a user runs `/explore` at initiative scope and selects Prototype, the sub-agent will read the implementation section and write the prototype to `.project/prototypes/<name>/` instead of `.project/initiatives/__active__<name>/prototypes/<name>/`. This is a behavior bug introduced by the partial update: the mode-selection logic (SKILL.md lines 140-141) was correctly updated to offer Prototype at initiative scope, but the implementation section was not updated to use the scope-resolved path.
File: ~/.claude/skills/explore/references/explore-logic.md:79
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Prototype Mode section heading in explore-logic.md still says "Project-Level Only"
The section heading on line 75 reads "## Prototype Mode (Project-Level Only)" but initiative scope now also supports Prototype mode (scope path mapping table line 9, note line 14, SKILL.md line 140-141). The heading is now factually incorrect and will mislead any agent or human reading it.
File: ~/.claude/skills/explore/references/explore-logic.md:75
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** SKILL.md 4b run-mode section still says "Prototype (project-level only)"
SKILL.md line 157 reads `**Prototype** (project-level only)` in the run-mode dispatch section. Lines 140-141 correctly offer Prototype at initiative scope, but line 157 contradicts this. An executing agent reading Step 4b would encounter a conflict between the mode-selection logic (initiative OK) and the run-mode label (project-level only), which could cause it to silently redirect to project scope even when at initiative scope.
File: ~/.claude/skills/explore/SKILL.md:157
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** refine-architecture and audit-architecture still do not handle architecture-proposal/ for subsequent initiatives (carry-forward from iteration 1)
This was flagged in iteration 1 and is not addressed. Both skills only resolve `$ARCH_DIR` to `architecture/` when an active initiative exists — no path for `architecture-proposal/` when a subsequent initiative is active. The `initiative-conventions.md` consumer guide documents that `/refine-architecture` can operate on `architecture-proposal/`, creating an undocumented gap. This is likely intentional Phase 5 scope deferral.
File: ~/.claude/skills/refine-architecture/SKILL.md:72
Resolution: USER_INPUT

## Score: 8.5/10

The two IMPORTANT issues from iteration 1 are correctly fixed: scaffold detection is now present in audit-architecture Step 1b with the right guard logic and user-facing message, and the explore-complete.md template now includes `initiatives/<name>` in its scope options. The two MINOR $FLOW_SCOPE issues in define-architecture are also fixed — Step 0 now sets the variable explicitly and Step 10 references it cleanly. The remaining gap is in the prototype escalation work: the mode-selection logic was updated but the implementation section in explore-logic.md was not updated to use the scope-resolved path, producing a behavioral bug for initiative-scope prototype runs. To reach 9+: fix the explore-logic.md Prototype Mode section to use the scope-resolved path and update the heading.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
