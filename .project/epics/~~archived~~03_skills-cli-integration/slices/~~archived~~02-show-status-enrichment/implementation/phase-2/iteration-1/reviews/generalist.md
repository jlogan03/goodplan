# Generalist Review -- Phase 2: Status File Arrays

**Score: 9/10** | Critical: 0, Important: 1, Minor: 2

## Summary

Clean, well-executed phase. All seven plan tasks are completed. The schema change from plain numbers to `{ count, files }` objects is correctly propagated through schema, command, human formatter, tests, and convention docs. The implementation correctly uses the state tree (via `getDir`) instead of raw `fs.readdirSync`, matching the plan's architectural intent. Build passes, all 941 tests pass.

## Plan Adherence

All tasks checked off and verified in code:

1. **Schema update** -- `fileArtifactSchema` with `count` + `files` replaces the four `*Files` number fields. JSDoc includes "Changed in 1.0.0" annotation. Field names match plan exactly (`architecture`, `research`, `brainstorm`, `prototypes`).
2. **State tree for file listing** -- `collectMdFiles()` walks `DirectoryEntry.contents` keys via `getDir()`. No `fs.readdirSync`. `noUncheckedIndexedAccess` guard present (`dir: DirectoryEntry | undefined`).
3. **Dual-directory aggregation** -- Both project-level and `epics/<name>/` directories are aggregated, matching prior `countFiles()` behavior. State-tree-relative paths used (`architecture/_overview.md`, `epics/my-epic/architecture/data-model.md`).
4. **`formatStatusHuman()` updated** -- All four fields correctly reference `.count` instead of the old number fields.
5. **Existing tests updated** -- Old `architectureFiles`/`researchFiles`/etc. assertions replaced with `.count` and `.files` checks.
6. **New unit tests added** -- count-matches-length, state-tree-relative paths, dual-directory aggregation, fresh project empty arrays, plain-number fields remain numbers. Good coverage.
7. **Convention doc updated** -- `cli-interaction.md` documents the new artifact shape with JSON example, "Changed in 1.0.0" annotation, removes "Available after slice 02" guards, removes `completion` from `show --json` artifact example.

## Cross-File Integration

- Schema (`status.ts`) drives type `Artifacts` used in command (`status.ts`) and tests -- single source of truth.
- `formatStatusHuman()` correctly reads the new shape.
- Convention doc example matches the actual schema output.
- `countFiles` import from `data/files.ts` properly removed from `status.ts`.

## Findings

### Important

1. **Dead module: `src/core/data/files.ts`** -- The `countFiles` function is no longer imported anywhere in `src/`. The module is now orphaned dead code. It should be removed or flagged for removal to avoid confusion. This is not a correctness issue but is architectural debt introduced by this phase.

### Minor

1. **`_projectDir` parameter retained** -- `countArtifacts()` still accepts `_projectDir: string` (underscore-prefixed, unused). The call site in `buildStatusResult` still passes `dir`. This is harmless but slightly misleading -- the parameter could be removed since the function now uses only the state tree. However, removing it would be a broader refactor touching the function signature and call site, so deferring is reasonable.

2. **`collectMdFiles` type annotation verbosity** -- The `state` parameter uses inline `import("../../core/tree.js").ProjectState` rather than a top-level `import type`. This follows the existing pattern in the file (see `resolveActiveEpic`, `resolveActiveSlice`, etc.) so it is consistent, but a top-level import type would be cleaner. Not worth changing now given consistency with the rest of the file.
