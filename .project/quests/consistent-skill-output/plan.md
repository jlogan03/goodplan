# Plan: Consistent Skill Output

## Overview

Consolidate duplicated output templates across skills into shared references in `_shared/references/output-templates.md`. Three template groups are currently defined inline in multiple skills with near-identical structure. Extracting them reduces maintenance burden and ensures formatting stays consistent when templates are updated.

No code changes — skills-only (markdown files under `skills/`).

## Phase 1: Consolidate Output Templates

Extract 3 duplicated template groups into `output-templates.md` and update consuming skills to reference the shared templates.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c 'Context Load Summary' skills/_shared/references/output-templates.md` returns 0 — template not yet shared
- [ ] `grep -c 'Done Summary' skills/_shared/references/output-templates.md` returns 0 — template not yet shared
- [ ] `grep -c 'Completion Summary Template' skills/_shared/references/output-templates.md` returns 1 — only the existing Iteration Summary section header, no Completion Summary

**After implementation** (should pass / show presence):
- [ ] `grep -c 'Context Load Summary' skills/_shared/references/output-templates.md` returns at least 1 — shared template exists
- [ ] `grep -c 'Done Summary' skills/_shared/references/output-templates.md` returns at least 1 — shared template exists
- [ ] `grep -c 'Completion Summary' skills/_shared/references/output-templates.md` returns at least 2 — Refine Completion Summary base template added alongside existing section
- [ ] Inline Context Load Summary templates removed from create-slices, create-plan, and complete SKILL.md files — each references output-templates.md instead
- [ ] Inline Refine Completion Summary templates removed from refine-plan, refine-architecture, and refine-slices SKILL.md files — each references output-templates.md with skill-specific extensions noted
- [ ] Inline Done Summary templates removed from create-slices, create-plan, and complete SKILL.md files — each references output-templates.md with skill-specific fields

### Tasks

- [ ] **Extract Context Load Summary template**: Read the 3 inline copies (create-slices, create-plan, complete), identify the common structure (`**Loaded** / **Context** / **Missing**`), write the shared template to output-templates.md with substitution rules. Add display rules noting that the `**Context**` line has skill-specific content guidance (e.g., complete lists artifact counts, create-plan lists slice goal summary).

- [ ] **Extract Refine Completion Summary base template**: Read the 3 inline copies (refine-plan, refine-architecture, refine-slices), identify the shared skeleton (final score, path, iterations, Score Progression table, Issues Resolved section, Remaining Issues). Define extension points for skill-specific sections: refine-architecture adds "Changes Summary", refine-slices adds "Slices Modified". Write to output-templates.md with substitution rules.

- [ ] **Extract Done Summary skeleton**: Read the 3 inline copies (create-slices Done Summary, create-plan Done Summary, complete Completion Summary), identify the common pattern (scope identifier, artifacts written, recommended next step). Write a shared skeleton to output-templates.md with skill-specific field lists. Each skill's SKILL.md will reference the skeleton and list its specific fields.

- [ ] **Update consuming skills — Context Load Summary**: Replace inline templates in create-slices/SKILL.md, create-plan/SKILL.md, and complete/SKILL.md with references to the shared template. Each skill should say: "Display using the Context Load Summary Template from `../_shared/references/output-templates.md`" followed by skill-specific `**Context**` line guidance.

- [ ] **Update consuming skills — Refine Completion Summary**: Replace inline templates in refine-plan/SKILL.md, refine-architecture/SKILL.md, and refine-slices/SKILL.md with references to the shared base template. Each skill specifies its extension sections.

- [ ] **Update consuming skills — Done Summary**: Replace inline templates in create-slices/SKILL.md, create-plan/SKILL.md, and complete/SKILL.md with references to the shared skeleton. Each skill specifies its unique fields.

- [ ] **Verify no broken references**: Grep all SKILL.md files for references to output-templates.md and verify each referenced section heading exists in the file.

### Verification

- output-templates.md contains 4 template sections (existing Iteration Summary + 3 new)
- Each consuming skill references the shared template instead of defining it inline
- No orphaned template references (all referenced section headings exist)
- Template substitution rules are documented for each shared template
- Skill-specific extensions are clearly noted in each consuming SKILL.md
