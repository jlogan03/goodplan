# Tests and Migration

## What We're Building

Update all test fixtures and assertions for nested slice paths. Extend the `goodplan migrate` flow to restructure flat `.project/slices/` into nested `epics/<epic>/slices/`. Run migration on this repo to validate end-to-end.

## Behavior

1. Test fixtures: remove `sliceSequence` from 4 `epic.json` fixtures, update flat slice paths to nested
2. Test assertions: update `slices/overview.json` references to `epics/overview.json`, update schema registry assertions, update overview type assertions
3. Migration code (`src/core/rpc/migrate.ts`):
   - `buildMigrationState()` writes slices inside each epic's tree (not top-level `slices/`); removes `sliceSequence` from epic JSON construction
   - `copyMigrationArtifacts()` destination path changes from `path.join(projectDir, "slices", slice.name)` to `path.join(projectDir, "epics", epic.name, "slices", slice.name)` — if missed, markdown artifacts land in old flat path while JSON state uses nested paths
   - Backfill `targetEpic` on existing `DeferredItem` entries in persisted `slice.json` files, defaulting to the slice's own epic
   - No `slices/overview.json` creation — slices embedded in `epics/overview.json`
   - Round 2 answers include epic name per slice (already present)
4. `epicDetailResponseSchema` in `schemas.ts`: remove `sliceSequence` field (companion to slice 01's `epicSchema` removal)
5. `/migrate` skill: update path references in SKILL.md
6. Self-migration: run `goodplan migrate` on this repo's `.project/` to restructure flat slices under their parent epics

### Rollback procedure for self-migration
- Before migration: `.project/` is backed up as `.project-old/`
- After migration: run `diff -r .project-old/slices/ .project/epics/*/slices/` to confirm only expected restructuring occurred
- Verify all entities intact via `goodplan status --json` before deleting `.project-old/`
- If verification fails: restore from `.project-old/` backup

## Verification

- [ ] `bun test` — full test suite passes (unit + fitness + integration)
- [ ] `bun run build` — binary compiles
- [ ] `bun test tests/integration/workflow-slice.test.ts` — full slice lifecycle with nested paths passes
- [ ] `goodplan migrate` (on test fixture) — produces nested slice layout
- [ ] Self-migration: run on this repo, then `goodplan status --json` returns valid state with all entities intact
- [ ] `diff -r .project-old/slices/ .project/epics/*/slices/` — only expected restructuring
- [ ] `goodplan slice:list --json` after self-migration — shows slices under their epics
- [ ] `grep -r '\.project/slices/' .project/architecture/` — no flat references in arch docs

Full end-to-end: self-migrate this repo, run `goodplan status --json`, verify all epics, quests, tasks, and learnings are intact. Run `slice:list --json` to confirm slices appear under their epic. Keep `.project-old/` until verification passes, then delete.

Update any remaining architecture docs: `data-model.md`, `invariants.md` (if affected by new path patterns).

## Scope Boundaries

**In scope**: Test fixtures, test assertions, `src/core/rpc/migrate.ts`, `skills/migrate/SKILL.md`, remaining architecture doc updates, self-migration of this repo
**Out of scope**: New features — this is pure restructuring validation
