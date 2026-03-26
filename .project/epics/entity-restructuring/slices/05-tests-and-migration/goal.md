# Tests and Migration

## What We're Building

Update all test fixtures and assertions for nested slice paths. Extend the `goodplan migrate` flow to restructure flat `.project/slices/` into nested `epics/<epic>/slices/`. Run migration on this repo to validate end-to-end.

## Behavior

1. Test fixtures: remove `sliceSequence` from 4 `epic.json` fixtures, update flat slice paths to nested
2. Test assertions: update `slices/overview.json` references to `epics/overview.json`, update schema registry assertions, update overview type assertions
3. Migration code (`src/core/rpc/migrate.ts`):
   - `buildMigrationState()` writes slices inside each epic's tree (not top-level `slices/`)
   - `copyMigrationArtifacts()` copies to `epics/<epic>/slices/<name>/` instead of `slices/<name>/`
   - No `slices/overview.json` creation — slices embedded in `epics/overview.json`
   - Round 2 answers include epic name per slice (already present)
4. `/migrate` skill: update path references in SKILL.md
5. Self-migration: run `goodplan migrate` on this repo's `.project/` to restructure flat slices under their parent epics. Old `.project/` becomes `.project-old/`.
6. Architecture docs: update `data-model.md`, `state-machine-api.md`, `rpc-layer-api.md`, `flows.md`, `commands-api.md` with nested path references

## Verification

- [ ] `bun test` — full test suite passes (unit + fitness)
- [ ] `bun run build` — binary compiles
- [ ] `goodplan migrate` (on test fixture) — produces nested slice layout
- [ ] Self-migration: run on this repo, then `goodplan status --json` returns valid state with all entities intact
- [ ] `goodplan slice:list --json` after self-migration — shows slices under their epics
- [ ] `grep -r '\.project/slices/' .project/architecture/` — no flat references in arch docs

Full end-to-end: self-migrate this repo, run `goodplan status --json`, verify all epics, quests, tasks, and learnings are intact. Run `slice:list --json` to confirm slices appear under their epic.

## Scope Boundaries

**In scope**: Test fixtures, test assertions, `src/core/rpc/migrate.ts`, `skills/migrate/SKILL.md`, architecture docs update, self-migration of this repo
**Out of scope**: New features — this is pure restructuring validation
