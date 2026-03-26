# TypeScript Review — Round 4

## Issues

**[MINOR] Phase 4 `stampVersionIfNeeded` return type should preserve state generics**
The plan specifies `stampVersionIfNeeded(state: State, cliVersion: string): State` but the codebase uses `ProjectState` (which is `DirectoryEntry`) as the state type throughout the RPC layer. The function signature should use `ProjectState` to match existing RPC function signatures (`begin()`, `submit()`, `complete()` all operate on `ProjectState`). Using a vague `State` alias could cause confusion or require an unnecessary type alias. Additionally, the function reads `project.json` via `getJson<Project>(newState, 'project.json')` which returns `Project | undefined` under `noUncheckedIndexedAccess` — the plan correctly notes the `undefined` guard, but should also note that writing back requires `setEntry()` (from `tree.ts`) which returns `ProjectState`, keeping the immutable tree pattern consistent.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 `parseGlobalFlags` extension duplicates `--quiet` parsing**
The plan adds `quiet: boolean` to `parseGlobalFlags()` in `src/index.ts`. However, `--quiet` is already defined in `globalArgs` (`src/commands/global-args.ts`) and parsed by citty for every command. The pre-dispatch `parseGlobalFlags` is a lightweight pre-parser that runs before citty's `runCommand()` — this duplication is architecturally justified (the compat check runs before citty parses args), but the plan should note this is intentional duplication and that the two parsers must stay in sync. If `--quiet` is ever renamed or removed from `globalArgs`, the pre-parser must be updated too. A brief inline comment in the implementation would suffice.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-3 TypeScript issues have been addressed: `parseSemver` now uses `.safeParse()` with `GoodplanError` wrapping (M1 resolved), `detectArtifacts` uses overloaded signatures for automatic type narrowing (M2 resolved), `resolvePathReferences` uses `BeginPhase | SubmitPhase | 'complete'` narrow union (M3 resolved), and the plan correctly specifies `import type` usage with `verbatimModuleSyntax` throughout. The `noUncheckedIndexedAccess` guards are consistently called out for tree `contents` lookups. The two remaining issues are minor implementation notes — neither blocks implementation or risks type safety.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
