# Explore Complete

## Scope
epics/entity-restructuring

## What Was Explored
- Impact analysis of moving slices from flat `.project/slices/` to nested `.project/epics/<epic>/slices/<name>/` — identified 45+ source files and 15+ skill files affected
- Brainstormed consolidated `epics/overview.json` schema with embedded slices array, replacing `slices/overview.json` and `sequencing.md`
- Discussed migration strategy: big-bang approach (update CLI + data together), existing `slice.json` has `epic` field for migration routing

## Key Conclusions
- **Nested paths are feasible**: `assembleState` is recursive (no hardcoded top-level paths). Schema registry and `resolveEntityDir` are the critical gates.
- **Consolidated overview design**: Slices as nested array in `epics/overview.json`. Array order = sequencing. Eliminates 3 files (slices/overview.json, sequencing.md, slices/ directory).
- **Target type change**: Add `epic: string` to slice Target variant. Cascades through all RPC/command/transition code. Epic always available from `project.json.activeEpic` or command flags.
- **`slice:list` defaults to active epic**: `--epic <name>` for others, `--all` for everything.
- **Big-bang migration**: No backward compatibility window needed. CLI and data update together. `/migrate` reads `slice.json.epic` to route slices.
- **Learnings dedup**: Remove direct `learnings.md` writes from `/complete`. `learnings.jsonl` is sole source of truth.

## Artifacts
- `brainstorm/overview-consolidation.md` — consolidated schema design, decisions, state tree impact
