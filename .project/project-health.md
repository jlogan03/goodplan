# Project Health

## Health

### Well-tested areas
- Skill file structure (SKILL.md frontmatter, step numbering, reference paths): verified across 4 skill files during slice-quality-and-health implementation with 28-point checklist

### Undertested areas
- Runtime behavior of new skills (refine-slices, updated define-slices three-lens evaluation): not yet exercised on a real project
- Signal tracking algorithm (Step 6d in complete): requires 3+ completed slices to produce data
- Refactor Intelligence Protocol (Step 9 in complete): new detection algorithm, batch table presentation, inline fix application, side quest proposal — all untested on a real codebase
- Maturity/invariants/fitness workflow: Steps 8f/8g/8h in define-architecture, Steps 3b/3c/3d in audit-architecture, maturity evaluation in refine-architecture, reviewer criteria 12/13 — all untested on a real project
- Epic workflow end-to-end: all epic-aware skills updated but never exercised on a real epic. First-epic flow (auto-active `__active__initial/`) and subsequent-epic flow (proposal → approval → activation) both untested
- /start-epic skill: brand new, never executed. Architecture-proposal copying, approved.md writing, directory rename all need live testing
- Epic completion mode in /complete: new epic scope type, architecture reconciliation, artifact promotion, archive numbering — all untested on a real epic

### Known fragile areas
- Cross-skill reference paths (e.g., refine-slices references refine-plan's shared-preamble.md): if refine-plan files move, refine-slices breaks silently
- refine-plan's shared-preamble.md borrowed by refine-architecture and refine-slices: plan-specific framing ("Plan Location") doesn't match non-plan consumers
- `~~archived~~` prefix sort order: sorts correctly in terminal but may sort above active items in file explorers (VS Code, Finder) due to locale-aware collation
- epic-conventions.md is consumed by 12+ skills: changes require updating all consumers. Stale Assumption Detection Algorithm section added here is a single point of change (good) but also a single point of failure if the file moves

<!-- Last updated by: complete for side-quests/refactor-intelligence, 2026-03-19 -->

## Performance Characteristics

- No performance observations yet — skill files are markdown documents parsed by the agent at invocation time

<!-- Last updated by: complete for side-quests/slice-quality-and-health, 2026-03-17 -->

## Extensibility

### Easy to extend
- Reviewer infrastructure: adding a new reviewer to any skill requires only a prompt section in the reviewers file + a registry entry
- Iteration loop: new skills plug in via Loop Parameters table — architecture-quality proved this, slice-quality-and-health confirmed it, refine-plan-shared-loop completed the consolidation (all 3 consumers now use the shared pattern)
- Epic scope resolution: the Step 0 preamble pattern ($SCOPE_TYPE, $SLICES_DIR, $EPIC_DIR) provides a consistent template for adding epic awareness to any new skill
- Scope-type branching in /complete: the "For epic scope" / "For slices/quests" pattern cleanly separates epic completion from per-slice completion within the same skill

### Hard to extend
- Multi-file review pattern: the iteration loop assumes single-file or single-directory plans. Scattered working copies (as in refine-slices) require custom editor prompts and file-matching protocols

<!-- Last updated by: complete for side-quests/complete-rename, 2026-03-19 -->

## Technical Debt

### Localized items
- shared-preamble.md asymmetry: lives in refine-plan/references/ while iteration-loop.md lives in _shared/references/ — candidate for future consolidation

### Systemic items
- shared-preamble.md divergence risk: refine-plan's copy is plan-framed but borrowed by refine-architecture and refine-slices. As those skills mature, their needs may diverge. Noted as tech debt — revisit when it causes a real problem.

<!-- Last updated by: complete for side-quests/maturity-invariants-fitness, 2026-03-18 -->

## Recent Changes

- **refactor-intelligence** (2026-03-19): Upgraded /complete Step 9 from generic cleanup question to proactive refactor detection with scope/risk classification, batch table presentation, inline fix application (capped at 5), and side quest proposals.
- **complete-rename** (2026-03-19): Renamed /complete-slice to /complete, updated all cross-references across 10 skill files and 3 side quest goals. Added epic completion mode: architecture reconciliation, artifact promotion, archive numbering, graceful stop cases (e)/(f).
- **initiatives-infrastructure** (2026-03-18): Added epic support across 25 skill files. Created epic-conventions.md, /create-epic (renamed from /start-project), /start-epic. Updated 10 existing skills with epic scope resolution, two-layer architecture, stale assumption detection.

<!-- Last updated by: complete for side-quests/refactor-intelligence, 2026-03-19 -->
