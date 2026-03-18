# System Profile

## Health

### Well-tested areas
- Skill file structure (SKILL.md frontmatter, step numbering, reference paths): verified across 4 skill files during slice-quality-and-health implementation with 28-point checklist

### Undertested areas
- Runtime behavior of new skills (refine-slices, updated define-slices three-lens evaluation): not yet exercised on a real project
- Signal tracking algorithm (Step 6d in complete-slice): requires 3+ completed slices to produce data
- Maturity/invariants/fitness workflow: Steps 8f/8g/8h in define-architecture, Steps 3b/3c/3d in audit-architecture, maturity evaluation in refine-architecture, reviewer criteria 12/13 — all untested on a real project

### Known fragile areas
- Cross-skill reference paths (e.g., refine-slices references refine-plan's shared-preamble.md): if refine-plan files move, refine-slices breaks silently
- refine-plan's shared-preamble.md borrowed by refine-architecture and refine-slices: plan-specific framing ("Plan Location") doesn't match non-plan consumers

<!-- Last updated by: complete-slice for side-quests/maturity-invariants-fitness, 2026-03-18 -->

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
- shared-preamble.md divergence risk: refine-plan's copy is plan-framed but borrowed by refine-architecture and refine-slices. As those skills mature, their needs may diverge. Noted as tech debt — revisit when it causes a real problem.

<!-- Last updated by: complete-slice for side-quests/maturity-invariants-fitness, 2026-03-18 -->

## Recent Changes

- **maturity-invariants-fitness** (2026-03-18): Added maturity tracking, system invariants, and fitness functions to define-architecture (Steps 8f/8g/8h), refine-architecture (maturity evaluation), audit-architecture (Steps 3b/3c/3d), and plan refinement reviewers (criteria 12/13). Created shared maturity-conventions.md.
- **refine-plan-shared-loop** (2026-03-18): Refactored refine-plan SKILL.md to reference shared iteration-loop.md with Loop Parameters table. All 3 iteration-loop consumers now use the same pattern.

<!-- Last updated by: complete-slice for side-quests/maturity-invariants-fitness, 2026-03-18 -->
