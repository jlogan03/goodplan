# System Profile

## Health

### Well-tested areas
- Skill file structure (SKILL.md frontmatter, step numbering, reference paths): verified across 4 skill files during slice-quality-and-health implementation with 28-point checklist

### Undertested areas
- Runtime behavior of new skills (refine-slices, updated define-slices three-lens evaluation): not yet exercised on a real project
- Signal tracking algorithm (Step 6d in complete-slice): requires 3+ completed slices to produce data

### Known fragile areas
- Cross-skill reference paths (e.g., refine-slices references refine-plan's shared-preamble.md): if refine-plan files move, refine-slices breaks silently

<!-- Last updated by: complete-slice for side-quests/slice-quality-and-health, 2026-03-17 -->

## Performance Characteristics

- No performance observations yet — skill files are markdown documents parsed by the agent at invocation time

<!-- Last updated by: complete-slice for side-quests/slice-quality-and-health, 2026-03-17 -->

## Extensibility

### Easy to extend
- Reviewer infrastructure: adding a new reviewer to any skill requires only a prompt section in the reviewers file + a registry entry
- Iteration loop: new skills plug in via Loop Parameters table — architecture-quality proved this, slice-quality-and-health confirmed it, refine-plan-shared-loop completed the consolidation (all 3 consumers now use the shared pattern)

### Hard to extend
- Multi-file review pattern: the iteration loop assumes single-file or single-directory plans. Scattered working copies (as in refine-slices) require custom editor prompts and file-matching protocols

<!-- Last updated by: complete-slice for side-quests/slice-quality-and-health, 2026-03-17 -->

## Technical Debt

### Localized items
- shared-preamble.md asymmetry: lives in refine-plan/references/ while iteration-loop.md lives in _shared/references/ — candidate for future consolidation

### Systemic items
- None identified

<!-- Last updated by: complete-slice for side-quests/refine-plan-shared-loop, 2026-03-18 -->

## Recent Changes

- **refine-plan-shared-loop** (2026-03-18): Refactored refine-plan SKILL.md to reference shared iteration-loop.md with Loop Parameters table. All 3 iteration-loop consumers now use the same pattern.
- **slice-quality-and-health** (2026-03-17): Added tracer bullet framing and three-lens evaluation to /define-slices, created /refine-slices skill with 4 reviewers, added system-profile.md + debt evaluation + signal tracking to /complete-slice, added system-profile refresh to /audit-architecture

<!-- Last updated by: complete-slice for side-quests/refine-plan-shared-loop, 2026-03-18 -->
