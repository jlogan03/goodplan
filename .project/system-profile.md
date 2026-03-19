# System Profile

## Health

### Well-tested areas
- Skill file structure (SKILL.md frontmatter, step numbering, reference paths): verified across 4 skill files during slice-quality-and-health implementation with 28-point checklist

### Undertested areas
- Runtime behavior of new skills (refine-slices, updated define-slices three-lens evaluation): not yet exercised on a real project
- Signal tracking algorithm (Step 6d in complete): requires 3+ completed slices to produce data
- Maturity/invariants/fitness workflow: Steps 8f/8g/8h in define-architecture, Steps 3b/3c/3d in audit-architecture, maturity evaluation in refine-architecture, reviewer criteria 12/13 — all untested on a real project
- Initiative workflow end-to-end: all initiative-aware skills updated but never exercised on a real initiative. First-initiative flow (auto-active __active__initial/) and subsequent-initiative flow (proposal → approval → activation) both untested
- /start-initiative skill: brand new, never executed. Architecture-proposal copying, approved.md writing, directory rename all need live testing
- Initiative completion mode in /complete: new initiative scope type, architecture reconciliation, artifact promotion, archive numbering — all untested on a real initiative

### Known fragile areas
- Cross-skill reference paths (e.g., refine-slices references refine-plan's shared-preamble.md): if refine-plan files move, refine-slices breaks silently
- refine-plan's shared-preamble.md borrowed by refine-architecture and refine-slices: plan-specific framing ("Plan Location") doesn't match non-plan consumers
- `~~archived~~` prefix sort order: sorts correctly in terminal but may sort above active items in file explorers (VS Code, Finder) due to locale-aware collation
- initiative-conventions.md is consumed by 12+ skills: changes require updating all consumers. Stale Assumption Detection Algorithm section added here is a single point of change (good) but also a single point of failure if the file moves

<!-- Last updated by: complete for side-quests/complete-rename, 2026-03-19 -->

## Performance Characteristics

- No performance observations yet — skill files are markdown documents parsed by the agent at invocation time

<!-- Last updated by: complete-slice for side-quests/slice-quality-and-health, 2026-03-17 -->

## Extensibility

### Easy to extend
- Reviewer infrastructure: adding a new reviewer to any skill requires only a prompt section in the reviewers file + a registry entry
- Iteration loop: new skills plug in via Loop Parameters table — architecture-quality proved this, slice-quality-and-health confirmed it, refine-plan-shared-loop completed the consolidation (all 3 consumers now use the shared pattern)
- Initiative scope resolution: the Step 0 preamble pattern ($SCOPE_TYPE, $SLICES_DIR, $INITIATIVE_DIR) provides a consistent template for adding initiative awareness to any new skill
- Scope-type branching in /complete: the "For initiative scope" / "For slices/quests" pattern cleanly separates initiative completion from per-slice completion within the same skill

### Hard to extend
- Multi-file review pattern: the iteration loop assumes single-file or single-directory plans. Scattered working copies (as in refine-slices) require custom editor prompts and file-matching protocols

<!-- Last updated by: complete for side-quests/complete-rename, 2026-03-19 -->

## Technical Debt

### Localized items
- shared-preamble.md asymmetry: lives in refine-plan/references/ while iteration-loop.md lives in _shared/references/ — candidate for future consolidation

### Systemic items
- shared-preamble.md divergence risk: refine-plan's copy is plan-framed but borrowed by refine-architecture and refine-slices. As those skills mature, their needs may diverge. Noted as tech debt — revisit when it causes a real problem.

<!-- Last updated by: complete-slice for side-quests/maturity-invariants-fitness, 2026-03-18 -->

## Recent Changes

- **complete-rename** (2026-03-19): Renamed /complete-slice to /complete, updated all cross-references across 10 skill files and 3 side quest goals. Added initiative completion mode: architecture reconciliation, artifact promotion, archive numbering, graceful stop cases (e)/(f).
- **initiatives-infrastructure** (2026-03-18): Added initiative support across 25 skill files. Created initiative-conventions.md, /create-initiative (renamed from /start-project), /start-initiative. Updated 10 existing skills with initiative scope resolution, two-layer architecture, stale assumption detection.
- **archived-prefix-migration** (2026-03-18): Renamed 13 `__done__` directories to `~~archived~~` and updated 3 skill files (complete-slice, project-status). Convention rename only — no architectural changes.

<!-- Last updated by: complete for side-quests/complete-rename, 2026-03-19 -->
