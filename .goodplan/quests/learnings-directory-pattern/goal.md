# Goal: Unify Learnings Storage — Directory Pattern

## What

Make learnings follow the same storage pattern as decisions: JSONL index (`learnings.jsonl`) + optional per-learning `.md` files in a `learnings/` directory, retiring the monolithic `learnings.md`.

## Why

As learnings accumulate, `learnings.md` grows unbounded and becomes merge-conflict prone. The decisions pattern (JSONL index + per-item files in a directory) scales better — it's merge-friendly, browsable, and linkable. Individual learning files can be referenced by path from other docs and skills.

## Current State

- **Decisions pattern**: `decisions.jsonl` (index, currently empty) + `decisions/` directory with standalone `.md` files per decision
- **Learnings pattern**: `learnings.jsonl` (structured entries with `detail` inline) + `learnings.md` (curated monolithic rollup rendered from the same data)
- **Per-scope learnings**: Each entity (slice/quest/epic) has its own `learnings.jsonl`

## Proposed Change

1. `learnings.jsonl` remains the index — add an optional `file` field pointing to `learnings/<slug>.md`
2. Learnings that warrant extended context get a detail file in `learnings/`; short learnings keep `detail` inline in the JSONL
3. `learnings.md` is retired — the directory of per-learning files replaces it
4. Per-scope learnings (epic/slice/quest) follow the same pattern with their own `learnings/` directories

## Scope

- **CLI**: Update learning schema (add optional `file` field), update learning commands, update state machine rollup logic, update `assembleState` to handle `learnings/` directory
- **Skills**: Update the `/complete` skill's learnings synthesis to write detail files instead of appending to monolithic `.md`. Update any skills that read `learnings.md` to read from `learnings/` directory instead
- **Migration**: Update `/migrate` to convert existing `learnings.md` entries to the new directory format. Handle both fresh migrations and re-migrations of projects with the old format

## Success Criteria

1. `goodplan learning:list` returns entries, some with `file` field pointing to detail `.md` files
2. `/complete` writes per-learning detail files to `learnings/` instead of appending to `learnings.md`
3. Skills that previously read `learnings.md` now read from `learnings/` directory
4. `/migrate` converts existing `learnings.md` to per-learning files in `learnings/`
5. `learnings.md` is no longer written or read by any skill or CLI command

## Dependencies

None — standalone quest.

## Out of Scope

- Changing the decisions pattern (already works as intended)
- Changing the per-scope `learnings.jsonl` format beyond adding the optional `file` field
