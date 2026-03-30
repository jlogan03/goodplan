## Issues

**[IMPORTANT]** Plan misses 2 skills that have Done Summary templates: explore and create-architecture

The plan says "Done Summary" exists in create-slices, create-plan, and complete. But codebase exploration reveals 5 skills use "Done Summary":
- `create-slices/SKILL.md` (line 239)
- `create-plan/SKILL.md` (line 190)
- `complete/SKILL.md` (line 410)
- `create-architecture/SKILL.md` (line 340)
- `explore/SKILL.md` (line 221, referenced but has a different structure — more of a prose summary than a template)

`create-architecture` has a clear Done Summary step (Step 11) with specific bullet points (files written, decisions, CLAUDE.md update, next step). It follows the same Done Summary pattern and should be included in the consolidation scope or explicitly excluded with justification.

`explore` has a Done Summary reference (line 221) and a structured "After completion" section (lines 235-239) that follows the same pattern (artifacts, decisions, next step). It should also be evaluated for inclusion.

If these are intentionally excluded (e.g., their structure is too different to share a skeleton), the plan should say so. Otherwise, consolidating 3 of 5 consumers leaves the same template drift problem for the remaining 2.

Resolution: CODEBASE_EXPLORATION

---

**[IMPORTANT]** Expected Behavior checks are not the most direct verification method

The Expected Behavior section uses `grep -c` to check for the presence of section headings in output-templates.md. This verifies the file was written but does not verify the actual goal: that consuming skills reference the shared template instead of defining inline copies. A more direct verification would be:

1. Grep each consuming SKILL.md for the inline template markers (e.g., `**Loaded**:` pattern for Context Load Summary, `## Refinement Complete` for Completion Summary, `## Slices Defined` / `## Plan Created` / `## Completion Summary` for Done Summary) and confirm they are absent (replaced by references).
2. Grep each consuming SKILL.md for the reference instruction (e.g., "output-templates.md") and confirm it is present.

The current "After implementation" checks partially do this (items 4-6 say "Inline ... templates removed ... each references output-templates.md instead") but those are prose descriptions, not executable checks. Convert them to concrete grep commands like the "Before implementation" items.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Refine Completion Summary templates are not identical across the 3 skills

The plan says "identify the shared skeleton" for Refine Completion Summary, but the 3 copies have meaningful structural differences:

- **refine-plan**: Has `**Path**` field, full "Issues Resolved Per Iteration" with per-iteration tables, "Remaining Issues" section
- **refine-architecture**: Has `**Architecture files**` instead of Path, adds "Changes Summary" section, abbreviated issues section
- **refine-slices**: Has no Path or Architecture files field, adds "Slices Modified" table, compressed "Issues Resolved" (total only, no per-iteration breakdown)

The plan correctly notes extension points for "Changes Summary" and "Slices Modified", but the base skeleton differs more than the plan acknowledges. The issues table format differs (per-iteration with full table vs. total-only). The shared skeleton definition needs to specify how to handle these structural differences — is the base skeleton the intersection (Score Progression + Issues + Remaining) with everything else as extensions? Or is it the union with optional sections? This should be decided explicitly in the plan tasks.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Context Load Summary `**Context**` line guidance varies more than the plan acknowledges

The plan notes "skill-specific content guidance" for the Context line. Looking at the actual inline copies:

- `create-slices`: `{brief summary — epic/project scope, architecture state}`
- `create-plan`: `{brief summary — slice goal, architecture, conventions}`
- `complete`: `{brief summary of what was found}` followed by a separate paragraph with specific format strings for epic vs. slice/quest scope

The `complete` skill has a significantly more detailed Context line specification (lines 143-144) with scope-specific format strings. The plan's task description ("the `**Context**` line has skill-specific content guidance") is correct but should acknowledge that `complete` has a richer specification that goes beyond simple guidance text.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** README.md for shared references needs updating

The plan does not include a task to update `skills/_shared/references/README.md` (line 19), which currently describes output-templates.md as "Rigid templates for structured user-facing output (Iteration Summary) shared across review/implementation skills". After adding 3 new template groups, this description needs updating to reflect the broader scope.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan correctly identifies the core consolidation opportunity and has a reasonable task breakdown. The main gaps are: (1) missing 2 of 5 Done Summary consumers (explore, create-architecture), which undermines the "each template exists once" completion criterion; and (2) Expected Behavior checks that verify file existence rather than the actual behavioral change (inline removal + reference addition). Fixing the IMPORTANT issues and clarifying the base skeleton design for Refine Completion Summary would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
