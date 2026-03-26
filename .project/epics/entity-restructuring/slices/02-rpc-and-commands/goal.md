# RPC and Commands

## What We're Building

Wire the RPC layer and CLI commands to use nested slice paths. Update `resolveEntityDir`, `resolveEntityJsonPath`, all exhaustive switches in `begin.ts`/`complete.ts`/`paths.ts`. Update all slice commands to require epic context. Schema registry already updated in slice 01 — this slice consumes those patterns. Update `status` command to read slices from embedded overview.

## Behavior

1. `resolveEntityDir` for slices returns `epics/<epic>/slices/<name>` (note: cascades to all `resolvePathReferences` calls)
2. `begin()`, `complete()`, `submit()` construct slice events with `epic` from Target
3. `buildCompleteEvent` for slices includes `epic` field
4. `buildSliceCompleteResult` accepts epic parameter; 5 path-only changes + 1 structural change (reads `epics/overview.json` navigating `items[].slices[]` instead of `slices/overview.json`)
5. `slice:list` defaults to active epic's slices, `--epic` and `--all` flags work
6. `slice:show`, `slice:create`, all mutation commands pass `epic` in Target
7. `status --json` reads slices from `epics/overview.json` embedded arrays

## Verification

- [ ] `tsc --noEmit` — passes
- [ ] `bun test tests/unit/` — all unit tests pass
- [ ] `bun test tests/integration/` — integration tests pass
- [ ] `bun run build` — binary compiles
- [ ] `goodplan schema --json` — shows all slice commands
- [ ] Full CLI test: `epic:create` → `slice:create` → `slice:list --json` → confirm slice appears under that epic with nested paths
- [ ] `goodplan slice:show --slice <name> --json` — output paths contain `epics/<epic>/slices/<name>/` not `slices/<name>/`
- [ ] `goodplan status --json` — `completedSlices`/`totalSlices` aggregate correctly

Build the binary and run a manual end-to-end test: `epic:create` → `slice:create` → `slice:list` → `slice:show` → verify all paths are nested.

Update architecture docs affected by this slice: `rpc-layer-api.md` (path resolution, complete flow), `commands-api.md` (slice command signatures).

## Scope Boundaries

**In scope**: `src/core/rpc/` (begin.ts, complete.ts, paths.ts), `src/commands/slice/`, `src/commands/global/status.ts`, `src/commands/global/schema.ts`, RPC unit tests, command unit tests
**Out of scope**: Schema registry (already in slice 01), context layer, skills, migration
