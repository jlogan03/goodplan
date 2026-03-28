# Plan: Consistent Skill Output

## Overview

Consolidate duplicated output templates across skills into shared references in `_shared/references/output-templates.md`. Three template groups are currently defined inline in multiple skills with near-identical structure. Extracting them reduces maintenance burden and ensures formatting stays consistent when templates are updated.

No code changes — skills-only (markdown files under `skills/`).

**Consumers by template group:**
- **Context Load Summary**: create-slices, create-plan, complete (3 skills)
- **Completion Summary Template**: refine-plan, refine-architecture, refine-slices, implement-plan (4 skills)
- **Done Summary**: create-slices, create-plan, complete, create-architecture, explore (5 skills; explore/create-architecture are more prose-oriented and may need a slightly different variant)

## Phase 1: Consolidate Output Templates

Extract 3 duplicated template groups into `output-templates.md` and update consuming skills to reference the shared templates.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `grep -c 'Context Load Summary' skills/_shared/references/output-templates.md` returns 0 — template not yet shared
- [x] `grep -c 'Done Summary' skills/_shared/references/output-templates.md` returns 0 — template not yet shared
- [x] `grep -c 'Completion Summary Template' skills/_shared/references/output-templates.md` returns 0 — no Completion Summary Template yet

**After implementation** (should pass / show presence):
- [x] `grep -c 'Context Load Summary' skills/_shared/references/output-templates.md` returns at least 1 — shared template exists
- [x] `grep -c 'Done Summary' skills/_shared/references/output-templates.md` returns at least 1 — shared template exists
- [x] `grep -c 'Completion Summary Template' skills/_shared/references/output-templates.md` returns at least 1 — shared base template added
- [x] Consuming skills removed inline copies and reference the shared template:
  - `grep -c 'output-templates.md' skills/create-slices/SKILL.md` returns at least 2 (Context Load + Done)
  - `grep -c 'output-templates.md' skills/create-plan/SKILL.md` returns at least 2 (Context Load + Done)
  - `grep -c 'output-templates.md' skills/complete/SKILL.md` returns at least 2 (Context Load + Done)
  - `grep -c 'output-templates.md' skills/refine-plan/SKILL.md` returns at least 1 (Completion Summary)
  - `grep -c 'output-templates.md' skills/refine-architecture/SKILL.md` returns at least 1 (Completion Summary)
  - `grep -c 'output-templates.md' skills/refine-slices/SKILL.md` returns at least 1 (Completion Summary)
  - `grep -c 'output-templates.md' skills/implement-plan/SKILL.md` returns at least 1 (Completion Summary)
  - `grep -c 'output-templates.md' skills/create-architecture/SKILL.md` returns at least 1 (Done Summary)
  - `grep -c 'output-templates.md' skills/explore/SKILL.md` returns at least 1 (Done Summary)
- [x] Inline template markers are ABSENT from consuming skills (negative checks):
  - `grep -c '^\*\*Loaded\*\*:' skills/create-slices/SKILL.md` returns 0
  - `grep -c '^\*\*Loaded\*\*:' skills/create-plan/SKILL.md` returns 0
  - `grep -c '^\*\*Loaded\*\*:' skills/complete/SKILL.md` returns 0
  - `grep -c '### Score Progression' skills/refine-plan/SKILL.md` returns 0
  - `grep -c '### Score Progression' skills/refine-architecture/SKILL.md` returns 0
  - `grep -c '### Score Progression' skills/refine-slices/SKILL.md` returns 0
  - `grep -c '### Score Progression' skills/implement-plan/SKILL.md` returns 0
  - `grep -c '## Slices Defined' skills/create-slices/SKILL.md` returns 0
  - `grep -c '## Plan Created' skills/create-plan/SKILL.md` returns 0
  - `grep -c '## Completion Summary' skills/complete/SKILL.md` returns 0

### Tasks

- [x] **Extract Context Load Summary template**: Read the 3 inline copies (create-slices, create-plan, complete), identify the common structure (`**Loaded** / **Context** / **Missing**`), write the shared template to output-templates.md with substitution rules. Add display rules noting that the `**Context**` line has skill-specific content guidance (e.g., complete lists artifact counts, create-plan lists slice goal summary). Note: complete's Context line has scope-specific format strings (epic vs. slice/quest) that are richer than the other two — the shared template should accommodate this variance.

- [x] **Extract Completion Summary Template base**: Read the 4 inline copies (refine-plan, refine-architecture, refine-slices, implement-plan), identify the shared base as the intersection: Score Progression table + Issues Resolved + Remaining Issues. Everything else is an extension point. Skill-specific extensions: refine-plan adds `**Path**`; refine-architecture adds `**Architecture files**` and "Changes Summary"; refine-slices adds "Slices Modified" with compressed issues; implement-plan adds Phase Summary, Verification Evidence, Key Decisions, Follow-up Recommendations. Use heading "Completion Summary Template" in output-templates.md (matches existing skill headings). Write with substitution rules. Note: `complete/SKILL.md` also has a `## Completion Summary` section, but it is structurally a Done Summary (scope identifier, artifacts written, recommended next step) — it is NOT a consumer of this template group and should not be listed as one.

- [x] **Extract Done Summary skeleton**: Read the 5 inline copies (create-slices, create-plan, complete, create-architecture, explore), identify the common pattern (scope identifier, artifacts written, recommended next step). Write two variants to output-templates.md: (1) a strict fenced template for create-slices, create-plan, and complete; (2) a loose checklist (fields to include, no fenced block) for explore and create-architecture, whose output is prose-oriented. Each skill's SKILL.md will reference the appropriate variant and list its specific fields.

- [x] **Update consuming skills — Context Load Summary**: Replace inline templates in create-slices/SKILL.md, create-plan/SKILL.md, and complete/SKILL.md with references to the shared template. Each skill should say: "Display using the Context Load Summary Template from `../_shared/references/output-templates.md`" followed by skill-specific `**Context**` line guidance.

- [x] **Update consuming skills — Completion Summary Template**: Replace inline templates in refine-plan/SKILL.md, refine-architecture/SKILL.md, refine-slices/SKILL.md, and implement-plan/SKILL.md with references to the shared base template. Each skill specifies its extension sections.

- [x] **Update consuming skills — Done Summary**: Replace inline templates in create-slices/SKILL.md, create-plan/SKILL.md, complete/SKILL.md, create-architecture/SKILL.md, and explore/SKILL.md with references to the shared skeleton. create-slices, create-plan, and complete reference the strict fenced variant; create-architecture and explore reference the loose checklist variant. Each skill specifies its unique fields.

- [x] **Update _shared/references/README.md**: Update the description to reflect the 3 new template groups (Context Load Summary, Completion Summary Template, Done Summary) alongside the existing Iteration Summary.

- [x] **Verify no broken references**: Run the full set of positive and negative `grep -c` checks listed in the Expected Behavior section above. All positive checks must return ≥ 1; all negative checks must return 0.

### Verification

- output-templates.md contains 4 template sections (existing Iteration Summary + 3 new: Context Load Summary, Completion Summary Template, Done Summary)
- All 10 consuming skills reference the shared template instead of defining it inline
- No orphaned template references (all referenced section headings exist)
- Template substitution rules are documented for each shared template
- Skill-specific extensions are clearly noted in each consuming SKILL.md
- _shared/references/README.md updated to describe all 4 template groups
