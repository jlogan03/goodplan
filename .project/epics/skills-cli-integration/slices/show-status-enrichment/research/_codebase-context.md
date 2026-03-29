# Codebase Context: Show/Status Enrichment & Spec Alignment

## Fresh Documentation

All documentation is very recent (same day, 2026-03-23). No stale docs detected.

| Document | Last Commit | Assessment |
|---|---|---|
| `.project/architecture/_overview.md` | 2026-03-23 21:01 | Fresh — updated in slice 01 |
| `.project/architecture/commands-api.md` | 2026-03-23 21:31 | Fresh — most recently updated arch doc |
| `.project/architecture/rpc-layer-api.md` | 2026-03-23 13:59 | Fresh |
| `.project/conventions.md` | 2026-03-23 (within project) | Fresh |
| `.project/learnings.md` | 2026-03-23 (within project) | Fresh |
| Epic architecture (all 13 files) | 2026-03-23 21:01 | Fresh — all updated together in slice 01 |

## Stale Documentation

None detected. All architecture docs were updated on the same day as the goal.md (2026-03-23 21:01).

## Recent Development Activity

All plan-affected source files were last touched within a 24-hour window (2026-03-22 to 2026-03-23). The codebase is actively evolving through the `skills-cli-integration` epic. Key commits affecting this slice's scope:

- `d7a6aaa` [state-cmd-tracer] Phase 1: State Command & Version — added `src/version.ts` with `__GOODPLAN_VERSION__` build-time injection
- `88dda1d` [decisions-learnings] Phase 3: Full Status Command — established the current `status --json` shape with `countFiles()` helper
- `4ce3ef5` [decisions-learnings] Phase 4: Universal --query & Schema Command — added `--query` to all commands

The entire commit history for affected paths spans 20 commits across 8 completed slices. No conflicting branches or concurrent work.

## Key Decisions and Constraints

### Current State of Files This Plan Modifies

**`src/commands/slice/show.ts`** (line 35): Uses `loadState()` and `getJson<Slice>()` to load entity JSON. Returns the raw `slice.json` content — no enrichment. The plan needs to add `assembleState()` call (or keep `loadState()`) and resolve the slice's directory to detect artifacts.

**`src/commands/epic/show.ts`** (line 35): Same pattern — `loadState()` + `getJson<Epic>()`. Returns raw `epic.json`.

**`src/commands/quest/show.ts`** (line 33): Same pattern — `loadState()` + `getJson<Quest>()`. Returns raw `quest.json`.

**`src/commands/global/status.ts`** (line 102-149): `countArtifacts()` uses `countFiles()` from `src/core/data/files.ts` which does raw `fs.readdirSync()`. Currently returns plain numbers (`architectureFiles`, `researchFiles`, `brainstormFiles`, `prototypeFiles`). The plan changes these to `{ count, files }` objects.

**`src/schemas/commands/status.ts`** (line 19-28): `artifactsSchema` defines all artifact fields as `z.number().int().nonnegative().default(0)`. Field names use `architectureFiles`, `researchFiles`, etc. — the plan renames these to `architecture`, `research`, etc.

**`src/core/rpc/types.ts`** (lines 103-141): `BeginResult`, `SubmitResult`, `CompleteResult` are defined here. Currently:
- `BeginResult`: no `paths` field, no `context` field
- `SubmitResult`: no `paths` field, no `context` field
- `CompleteResult`: has `context?: ContextBundle` and `architecturePaths?` but no general `paths?`

**`src/core/rpc/begin.ts`**: Returns `BeginResult` from `buildBeginResult()` (line 279-321). Will need to add `paths` field.

**`src/core/rpc/submit.ts`**: Returns `SubmitResult` from `buildSubmitResult()` (line 182-198). Will need to add `paths` field.

**`src/core/rpc/complete.ts`**: Returns `CompleteResult` from `buildCompleteResult()` (line 125-155). Already has `architecturePaths` — the plan adds a general `paths?` alongside this.

**`src/version.ts`**: Uses build-time `__GOODPLAN_VERSION__` injection from `package.json`. Currently `package.json` version is `"0.0.1"`. Bumping to `1.0.0` only requires changing `package.json`.

**`src/util/errors.ts`**: Error code types are organized by namespace (`DataErrorCode`, `StateErrorCode`, `ValidationErrorCode`, `InternalErrorCode`). The plan needs to add `VERSION_MAJOR_MISMATCH`. Question: which namespace? It's neither a state machine error nor a validation error — it's a compatibility check. Could go in a new `VersionErrorCode` type or be added to `DataErrorCode` (since it relates to project.json reading).

**`src/index.ts`**: The main dispatch path (line 55-141) has `--version` handling pre-dispatch and unknown command detection pre-dispatch. Version compatibility checking would logically go after `firstNonFlag` detection but before `runCommand()`. However, it requires `resolveProjectDir()` which may fail for commands that don't need `.project/` (`--version`, `--help`, `init`, `schema`). The plan specifies skipping compat checking for those commands.

**`src/core/data/files.ts`**: Contains only `countFiles()` — returns a count of files matching an extension. The plan needs to extend this to also return filenames, or create a new `listFiles()` helper.

### Tree Navigation Helpers Available

`src/core/tree.ts` provides: `resolve()`, `getJson()`, `getJsonl()`, `getDir()`, `getMarkdown()`, `hasChild()`, `setEntry()`. The `hasChild()` and `getDir()` helpers are directly useful for artifact detection in Phase 1. `DirectoryEntry.contents` keys give filenames for Phase 2's file listing.

### Existing Test Coverage

- `tests/unit/commands/status.test.ts`: 15 tests covering `buildStatusResult()`, `formatStatusHuman()`, `applyQuery()`, and status command integration. Tests reference `artifacts.architectureFiles` (number) — these must be updated for Phase 2's schema change.
- `tests/unit/schemas/status.test.ts`: 4 tests validating `statusResultSchema`. Uses `artifacts: {}` (empty) which relies on defaults.
- No existing tests for `show` commands.

### show Commands Use `loadState()` vs `assembleState()`

The `show` commands use `loadState()` (cached, faster) while `status` uses `assembleState()` (handles uninitialized projects). For artifact detection in Phase 1, `loadState()` is sufficient since the entity must exist to be shown. The tree is already in memory — artifact detection walks the tree, no extra I/O.

## Areas of Active Churn vs Stability

**Active churn (just modified in slice 01):**
- `src/version.ts` — new file from slice 01
- `src/commands/global/status.ts` — enhanced in slice 01 (state command added nearby)
- Epic architecture docs — all refreshed in slice 01

**Stable (not changed since original implementation slices):**
- `src/commands/slice/show.ts`, `src/commands/epic/show.ts`, `src/commands/quest/show.ts` — untouched since their creation
- `src/core/rpc/types.ts` — stable since sub-agent-commands slice
- `src/core/rpc/begin.ts`, `src/core/rpc/submit.ts`, `src/core/rpc/complete.ts` — stable since sub-agent-commands slice
- `src/schemas/commands/status.ts` — stable since decisions-learnings slice
- `src/core/data/files.ts` — stable since decisions-learnings slice
- `src/util/errors.ts` — stable since project-init slice
- `src/core/tree.ts` — stable since project-init slice

The show commands and RPC layer are very stable — low risk of merge conflicts. The status command area has recent activity from slice 01 but only in adjacent code (new state command, not modifications to status itself).

## Epic Architecture Awareness (Two-Layer Model)

### Current Reality (`.project/architecture/`)

The project architecture describes the 4-layer stack (Commands -> RPC -> State Machine -> Data Layer). The current `BeginResult`, `SubmitResult`, and `CompleteResult` types do NOT include `paths?` or `context?` fields (except `CompleteResult` which has `context?`). The current `StatusResult` uses plain number artifact counts.

### Target State (`.project/epics/__active__skills-cli-integration/architecture/`)

The epic architecture spec explicitly defines:
- `BeginResult.paths?: PathReferences` — "always included" per `rpc-layer-api.md` line 209
- `SubmitResult.paths?: PathReferences` — defined in the spec
- `CompleteResult.paths?: PathReferences` — defined in the spec
- `StatusResult.artifacts` with `{ count: number, files: string[] }` shape for directory-backed artifacts
- `PathReferences = Record<string, string>` — absolute filesystem paths

### Conflicts / Gaps

1. **`paths` on `BeginResult` — "always included" vs optional**: The epic architecture spec says `paths?: PathReferences` with comment "always included" on `BeginResult`. The plan treats it as optional (`paths?`). The "always included" comment suggests it should always be populated (but remains optional at the type level for backward compat). This is consistent — populate always, type as optional.

2. **`context` on `BeginResult` and `SubmitResult`**: The epic architecture spec includes `context?: ContextBundle` on both `BeginResult` and `SubmitResult`. The current code has `context` only on `CompleteResult`. The plan's Phase 3 adds `paths?` but does NOT add `context?` to `BeginResult` or `SubmitResult`. This is out of scope per the plan but worth noting — the epic spec expects it.

3. **`architecturePaths` on `CompleteResult` vs `paths`**: The current code has `architecturePaths?: { currentArchitecture: string; targetArchitecture?: string }` on `CompleteResult`. The epic spec has `paths?: PathReferences` as a general replacement. The plan adds `paths?` but doesn't mention removing `architecturePaths`. Both could coexist during transition.

4. **Status artifact field renaming**: Current code uses `architectureFiles`, `researchFiles`, `brainstormFiles`, `prototypeFiles`. The epic spec uses `architecture`, `research`, `brainstorm`, `prototypes`. This is a breaking change — the plan acknowledges this. All tests referencing old field names must be updated.

5. **Version compatibility checking location**: The goal.md says it's a "Commands-layer concern in the main dispatch path." The `src/index.ts` main function handles `--version` pre-dispatch. The plan says to add compat checking "after resolving project dir, before executing command" and skip for `--version`, `--help`, `init`, `schema`. This means it goes in `src/index.ts` main() between the unknown-command check and `runCommand()`, but needs to resolve the project dir first — which may throw if no `.project/` exists.

6. **`show --json` artifacts shape**: The epic architecture spec in `cli-changes.md` shows a slice artifact shape with 6 boolean fields. The plan's Phase 1 matches this. However, the convention doc (`cli-interaction-conventions.md`) also shows a `completion` boolean in the artifact shape (line 238) which the plan's Phase 1 task list doesn't include. The plan lists: `goal`, `exploreComplete`, `plan`, `planRefined`, `implementation`, `abandoned`. The convention doc shows: `goal`, `exploreComplete`, `plan`, `planRefined`, `implementation`, `completion`, `abandoned`. **This is a discrepancy the plan should resolve.**

## Stale Assumption Alerts

**No stale assumptions detected.** The goal.md was committed at 2026-03-23 21:01. All architecture files (both project-level and epic-level) were committed at or after this time. The most recent architecture update (`.project/architecture/commands-api.md`) was at 2026-03-23 21:31, which is *after* the goal — but this was from slice 01's completion and is consistent with the plan's assumptions.

**One timing note**: The plan.md itself appears to be a working copy (not yet committed — `plan.md` exists alongside `plan-refining.md` in the slice directory). This is expected during the refinement workflow.

## Implementation Risks

1. **Breaking schema change in Phase 2**: The `artifacts` field rename from `architectureFiles` -> `architecture` (etc.) is a breaking change to `status --json` output. The plan acknowledges this. All 15 status tests need updating. Any external consumers of `status --json` will break.

2. **Version compat check placement**: Adding compat checking in `src/index.ts` main() requires careful handling of commands that don't need `.project/`. The plan specifies skipping for `--version`, `--help`, `init`, `schema` — but the current dispatch logic doesn't easily identify which command is about to run before `runCommand()` is called. The `firstNonFlag` variable gives the subcommand name, which can be checked against a skip-list.

3. **`countFiles()` to `listFiles()` migration**: The current `countFiles()` does raw `fs.readdirSync()`. The plan proposes either extending it or creating a new `listFiles()`. However, the epic architecture spec (StatusResult comment, rpc-layer-api.md line 347-351) suggests using the assembled state tree to walk directories instead of raw filesystem I/O. The plan's Phase 2 task says "Alternatively, use the assembled state tree to walk directory entries and collect filenames" — this approach is more consistent with the architecture (Data Layer provides reads via the tree) and avoids dual filesystem access (status already calls `assembleState()`).

4. **`paths` resolution needs `projectDir`**: The `resolvePathReferences()` function in Phase 3 needs the absolute project directory path. The RPC functions (`begin()`, `submit()`, `complete()`) already receive `projectDir` as their first argument, so this is straightforward.

5. **Existing `formatStatusHuman()` references `architectureFiles`**: The human-readable formatter in `status.ts` (lines 301-324) references `artifacts.architectureFiles`, `artifacts.researchFiles`, etc. These must be updated alongside the schema change.
