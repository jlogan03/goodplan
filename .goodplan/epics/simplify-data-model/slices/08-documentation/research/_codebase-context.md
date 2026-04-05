# Codebase Context — Slice 08 Documentation

## Fresh Documentation
- `.goodplan/architecture/_overview.md` — 4-layer CLI stack, subsystem maturity (all Developing/Experimental)
- `.goodplan/epics/simplify-data-model/architecture/_overview.md` — 19→12 skill consolidation, orchestrator pattern, agent definitions
- `.goodplan/conventions.md` — tech stack, repo structure (12 skills, 34 agents), coding style

## Current State of Plan-Affected Files

### start-epic/SKILL.md
Uses direct file-existence checks (`ls -d`, `test -f`), shell `mv` for directory renaming, direct writes to `approved.md`, `state.md`, `activity-log.jsonl`. Does NOT use CLI commands. Needs full rewrite to use `gp` CLI.

### complete-epic/SKILL.md
Partial CLI integration — uses `$GP status --json`, `$GP epic:show --json`, `$GP slice:list --json`. Quest creation uses `$GP quest:create --title` syntax (to be verified). Spawns completion-epic sub-agent for heavy lifting.

### README.md
Lists 17 skills with old names (onboard-repo, migrate, project-status, capture, create-architecture, refine-architecture, create-plan, refine-plan, create-slices, refine-slices, implement-plan, complete, audit-architecture, audit-docs, audit-tests). Needs update to 12-skill model.

## Stale Reference Count
~75 stale references across skills/ directory:
- 15 in `_shared/references/output-templates.md`
- 13 in `status/references/status-logic.md`
- 13 in `start-epic/SKILL.md`
- 10 in `create-epic/SKILL.md`
- 4 in `explore/SKILL.md`
- 4 in `audit/SKILL.md`
- Scattered in upgrade, init, plan-slice, shared references

## Recent Development Activity
All recent commits are within simplify-data-model epic. Recent work: skill renaming, reviewer agents, E2E isolation, metric fixes. Documentation is lagging behind implementation — this slice closes that gap.

## Architecture Layers
- **Top-level** (`.goodplan/architecture/`): Current reality — 4-layer stack
- **Epic** (`epics/simplify-data-model/architecture/`): Target — 12-skill model with orchestrator pattern
- No conflicts between layers — epic architecture describes changes being implemented

## Subsystem Maturity
- Plugin: Experimental
- Commands: Developing
- RPC Layer: Developing
- State Machine: Developing
- Data Layer: Developing
- Context: Developing
- Skills: Experimental (epic target)
- Test Harness: Experimental (epic target)
