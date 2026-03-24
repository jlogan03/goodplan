# Integration Review: Show/Status Enrichment (All 4 Phases)

**Score: 9/10** | Critical: 0, Important: 1, Minor: 3

## Goal Alignment

The implementation matches the plan's confirmed goal across all four phases:

1. **Phase 1 (Show Artifacts)**: `detectArtifacts()` in `src/core/artifacts.ts` with overloaded signatures returns entity-specific boolean flags. All three show commands (`epic:show`, `slice:show`, `quest:show`) correctly integrate artifact detection into `--json` output only, omitting from human-readable output as specified.

2. **Phase 2 (Status File Arrays)**: `status --json` artifact fields upgraded from plain numbers to `{ count, files }` objects. `collectMdFiles()` uses the state tree (not raw filesystem I/O). Dual-directory aggregation preserved (project-level + active epic). Convention doc updated with "Changed in 1.0.0" annotation.

3. **Phase 3 (Result Type Paths)**: `PathReferences` type defined, `resolvePathReferences()` with exhaustive switch covers all begin/submit/complete phases. `paths` field added to `BeginResult`, `SubmitResult`, and `CompleteResult`. All three RPC functions (`begin`, `submit`, `complete`) wire it in.

4. **Phase 4 (Semver)**: Version bumped to 1.0.0 in `package.json`. `parseSemver`/`checkCompatibility`/`semverGreaterThan` in `src/util/semver.ts`. Compat check in `src/index.ts` with `DATA_NO_PROJECT` try-catch for natural skip. Version stamping via `bumpDataVersionIfNeeded` in all three RPC mutation paths. `VALIDATION_VERSION_MAJOR_MISMATCH` error code registered.

## Cross-Phase Integration

The four phases integrate cleanly:

- **Phase 4 before Phase 2**: Correct implementation order. The 1.0.0 version boundary is established before the breaking schema change in Phase 2. Convention doc documents the breaking change with "Changed in 1.0.0".
- **Version stamping + paths**: Both are applied in begin/submit/complete after `reduce()`. Version stamp runs first (on the state), then paths are resolved (pure function on projectDir/target/phase). No interference.
- **Show artifacts + status artifacts**: Separate code paths, separate schema types (`SliceArtifactFlags`/`EpicArtifactFlags` vs `fileArtifactSchema`). No shared mutation. Both use the state tree correctly.
- **`files.ts` removal**: The old `countFiles()` in `src/core/data/files.ts` was deleted after Phase 2 replaced it with tree-based `collectMdFiles()`. No dangling imports in source files.

## Regressions

No regressions detected:

- Phase 2's breaking schema change (`architectureFiles` -> `architecture.count`) is fully propagated through `formatStatusHuman()` and all tests.
- Phase 4's `parseGlobalFlags` extension (adding `quiet`) is backward compatible -- the `json` flag parsing is unchanged.
- RollupResult correctly excluded from paths (rollup has no entity directory). The conditional in `begin()` lines 60-63 returns early before paths resolution.

## Findings

### [IMPORTANT] I1: `resolveEntityDir` returns undefined for `project`/`decision`/`rollup` targets silently

In `src/core/rpc/paths.ts` line 139-152, when `resolveEntityDir` returns `undefined` for project/decision/rollup targets, `resolvePathReferences` returns `{}`. This is correct behavior per the plan, but the `project` case means `begin('create', {type:'project'})` (i.e., `init`) returns `paths: {}`. This is fine for now since `init` has no artifact paths, but if a future phase adds project-level paths, the `project` case in `resolveEntityDir` would need updating. The concern is that the `undefined` return makes this a silent no-op rather than an explicit decision per target type. A comment noting this design choice would help future maintainers.

### [MINOR] M1: Convention doc (`conventions.md`) still references deleted `files.ts`

`.project/conventions.md` line 61 still reads: `data/ # assemble/commit/load state tree, tree types, schema registry, files (countFiles helper)`. The `countFiles` helper no longer exists since `src/core/data/files.ts` was deleted. This is stale documentation.

### [MINOR] M2: `cli-interaction-conventions.md` "Coming in Future Slices" section is stale

`skills/_shared/references/cli-interaction.md` line 255 still lists `show --json` with `artifacts` field as "coming in future slices", but Phase 1 already implemented it. This should be removed or moved to a "Recently Added" note.

### [MINOR] M3: `complete` in SubmitPhase type creates ambiguity in path resolution

`SubmitPhase` includes `"complete"` as a variant (line 53 of `types.ts`), and `resolvePathReferences` accepts `BeginPhase | SubmitPhase | "complete"` with a redundant `| "complete"`. The comment explains this (complete() passes the literal directly), but the type signature could be simplified since `"complete"` is already in `SubmitPhase`. The redundant union member is harmless but slightly confusing.

## Strengths

- **Exhaustive switches everywhere**: `mapToBeginPhase`, `resolveForBeginPhase`, `resolveEntityDir` all use `never` defaults. Compile-time safety against missing cases.
- **Clean layering**: Artifacts detection is pure (no I/O), path resolution is pure (no I/O), version stamp is RPC-layer only (documented INV-001 exception). Schema definitions are in `schemas/commands/`, not mixed into implementation.
- **Consistent error handling**: `parseSemver` uses `safeParse` + `GoodplanError` (not raw ZodError). `bumpDataVersionIfNeeded` catches parse errors and skips rather than failing mutations. Compat check wraps unexpected errors gracefully.
- **Tree-based approach**: Both `collectMdFiles` (status) and `detectArtifacts` (show) work from the in-memory state tree, avoiding redundant filesystem I/O.
- **Test coverage**: 941 tests passing, with dedicated unit tests for each new module and integration tests for the binary.
