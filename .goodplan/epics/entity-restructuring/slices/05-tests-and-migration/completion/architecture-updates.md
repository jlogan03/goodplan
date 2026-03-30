# Architecture Updates: 05-tests-and-migration

## Top-level architecture docs already updated in Phase 3

All architecture doc updates were performed as part of Phase 3 implementation:

- `data-model.md` — nested slice paths, embedded overview structure, schema registry patterns
- `state-machine-api.md` — State Key Dependencies table, hasChild guard examples, Directory-Based Guards section
- `rpc-layer-api.md` — Target type with epic field, resolveEntityDir examples
- `flows.md` — slice workflow path references
- `commands-api.md` — slice command path resolution, --epic/--all flags

## Remaining stale reference

One `slices/overview.json` mention in `data-model.md` line 118 is intentional — it documents that this file has been eliminated ("no separate `slices/overview.json` file"). Not stale.

## No further architecture changes needed

The epic architecture target (`_overview.md` in `epics/entity-restructuring/architecture/`) has been fully achieved:
1. Nested slice paths: implemented and documented
2. Consolidated overview: embedded in epics/overview.json
3. Learnings source of truth: learnings.jsonl only (learnings.md writes removed in slice 04)

## Project-level maturity assessment

No maturity level changes. All subsystems remain at "Developing" — appropriate given the ongoing entity-restructuring epic. The test count increased from 941 to 1040 across the epic, covering the new nested path resolution, embedded overview, and migration re-run support.
