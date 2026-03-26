# RPC and Commands

## What We're Building

Wire the RPC layer and CLI commands to use nested slice paths. Update `resolveEntityDir`, `resolveEntityJsonPath`, all exhaustive switches in `begin.ts`/`complete.ts`/`paths.ts`. Update all slice commands to require epic context. Update schema registry patterns. Update `status` command to read slices from embedded overview.

## Behavior

1. `resolveEntityDir` for slices returns `epics/<epic>/slices/<name>`
2. `begin()`, `complete()`, `submit()` construct slice events with `epic` from Target
3. `buildSliceCompleteResult` uses nested paths for all 6 references
4. Schema registry: `epics/overview.json` → `epicOverviewSchema`, `epics/[^/]+/slices/[^/]+/slice.json` → `sliceSchema`
5. `slice:list` defaults to active epic's slices, `--epic` and `--all` flags work
6. `slice:show`, `slice:create`, all mutation commands pass `epic` in Target
7. `status --json` reads slices from `epics/overview.json` embedded arrays

## Verification

- [ ] `tsc --noEmit` — passes
- [ ] `bun test tests/unit/` — all unit tests pass
- [ ] `bun run build` — binary compiles
- [ ] `goodplan schema --json` — shows all slice commands
- [ ] Full CLI test: create epic, create slice, verify `slice:list --json` returns slice under that epic
- [ ] `goodplan status --json` — `completedSlices`/`totalSlices` aggregate correctly

Build the binary and run a manual end-to-end test: `epic:create` → `slice:create` → `slice:list` → `slice:show` → verify all paths are nested.

## Scope Boundaries

**In scope**: `src/core/rpc/`, `src/commands/slice/`, `src/commands/global/status.ts`, `src/commands/global/schema.ts`, schema registry, RPC unit tests, command unit tests
**Out of scope**: Context layer, skills, migration, integration tests (slice 5)
