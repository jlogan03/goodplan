## Issues

**[IMPORTANT]** Phase 1 missing `completion` boolean in artifact shape

The epic architecture convention doc (`cli-interaction-conventions.md` line 238) defines the slice artifact shape with a `completion` boolean. The plan's Phase 1 lists six fields (`goal`, `exploreComplete`, `plan`, `planRefined`, `implementation`, `abandoned`) but omits `completion`. The research file flagged this same discrepancy. The `completion` field maps to a `completion/` directory existing for the entity. Without it, the `show --json` output diverges from the target architecture spec.

Fix: Add `completion: boolean` to the slice/quest `ArtifactFlags` schema (check for `completion/` directory with content, mirroring the `implementation/` check). Update the `detectArtifacts()` task description to include it.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 artifact detection placed in wrong architectural layer

The plan creates `src/core/data/artifacts.ts` for the `detectArtifacts()` function. However, `src/core/data/` is the Data Layer, which per the architecture is responsible for "Entity CRUD and all filesystem I/O" and "does not make decisions about content semantics." Artifact detection is a read-only semantic interpretation of the state tree (deciding what `plan.md` existing means for workflow phase) -- this is closer to a query/projection concern used by the Commands layer, not a Data Layer responsibility.

The tree navigation helpers (`resolve()`, `hasChild()`, `getDir()`) already live in `src/core/tree.ts` as shared pure helpers. Since `detectArtifacts()` operates purely on the in-memory tree (no I/O), it should either live alongside the tree helpers in `src/core/tree.ts`, or in a new `src/core/artifacts.ts` peer file, or directly in a shared command utility. Putting it in the Data Layer blurs the boundary between serialization/I/O and semantic interpretation.

Fix: Move `detectArtifacts()` to `src/core/artifacts.ts` (peer to `tree.ts`) or inline it in a command-layer utility. It depends only on tree types and `hasChild()`/`getDir()` -- no I/O, so it belongs outside the Data Layer.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 uses raw filesystem I/O when state tree is available

The plan's Phase 2 tasks say to "Update `src/core/data/files.ts` or create a new helper -- extend `countFiles()` to also return filenames." The current `countFiles()` does raw `fs.readdirSync()`. However, `status` already calls `assembleState()`, which builds the full in-memory tree. The plan's own alternative note says "Alternatively, use the assembled state tree to walk directory entries and collect filenames" -- this is the architecturally correct approach.

Using raw filesystem I/O duplicates what `assembleState()` already does and introduces a subtle inconsistency: the file list could differ from what the tree reports if the tree was assembled at a slightly different time or if schema validation filtered entries. The Data Layer architecture states "All state reads come from the in-memory `ProjectState` tree returned by `loadState()`."

Fix: Remove the `countFiles()` extension option. Walk `DirectoryEntry.contents` keys from the assembled state tree to collect filenames. This is consistent with how `countArtifacts()` already gets decisions and learnings (from the state tree, not from filesystem). The `countFiles()` function in `files.ts` can be deprecated or removed as part of this phase.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 version compatibility error code doesn't fit existing error taxonomy

The plan says to register `VERSION_MAJOR_MISMATCH` in `src/util/errors.ts` and use exit code 2. The existing error taxonomy uses namespaced codes (`DATA_*`, `STATE_*`, `VALIDATION_*`, `INTERNAL_*`). The `exitCodeForError()` function maps exit codes by prefix: `VALIDATION_` -> 2, `STATE_` -> 3, else -> 1. Adding a bare `VERSION_MAJOR_MISMATCH` code would fall through to exit code 1, not exit code 2 as the plan requires.

Fix: Either (a) create a new `VersionErrorCode` type with `VERSION_MAJOR_MISMATCH` and add a prefix check in `exitCodeForError()` (`error.code.startsWith("VERSION_") return 2`), or (b) use `VALIDATION_VERSION_MISMATCH` which naturally maps to exit code 2 via the existing prefix logic. Option (b) is simpler and consistent with the pattern that compatibility mismatches are input validation failures (the project data is the "input" that doesn't match the CLI version).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 version stamping on `commitState()` crosses layer boundaries

The plan says: "Update `project.json.version` on writes -- when the CLI writes data using new features, update `project.json.version` to the CLI's current version. This is an RPC-layer concern -- stamp on `commitState()`." But `commitState()` is a Data Layer function. Having `commitState()` import `VERSION` from `src/version.ts` and conditionally modify `project.json` content creates a coupling between the Data Layer and application-level version semantics.

Per INV-001, every state mutation goes through the state machine. Modifying `project.json.version` in `commitState()` bypasses the state machine -- it's a silent mutation to entity data. The Data Layer should not make semantic decisions about content.

Fix: Version stamping should happen in the RPC Layer, not in `commitState()`. After `reduce()` produces the new state, the RPC layer can check if the CLI version is newer than `project.json.version` in the new state and update it before calling `commitState()`. Alternatively, introduce a `STAMP_VERSION` event in the state machine (simpler: just do it in the RPC layer since it's a cross-cutting concern that applies to every mutation).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `resolvePathReferences` should handle `complete` phase

The plan's path mapping lists `slice:complete` / `quest:complete` -> `{ completion: "<dir>/completion/" }` but the `complete()` RPC function already returns `architecturePaths`. The plan adds `paths?` alongside `architecturePaths` on `CompleteResult`. This creates two overlapping path-reference mechanisms on the same result type.

Fix: Clarify the relationship: `paths` is the general-purpose replacement; `architecturePaths` is a legacy field. Either (a) populate `paths` with `{ currentArchitecture, targetArchitecture, completion }` and deprecate `architecturePaths`, or (b) document that `architecturePaths` is kept for backward compatibility and `paths` provides additional references. The plan should state the intended coexistence strategy.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `show` commands call `assembleState()` unnecessarily

The plan says to "call `assembleState()`" in the show commands for artifact detection. But the show commands currently use `loadState()` (cached, faster), and the research confirms this is sufficient since the entity must exist to be shown. The plan task description for `slice:show` says "call `assembleState()`, resolve the slice's directory in the tree" -- but the existing code uses `loadState()`, and the state tree from `loadState()` contains the same directory information.

Fix: Keep `loadState()` in the show commands. The task descriptions should say "use the state tree from `loadState()`" rather than introducing `assembleState()`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 compatibility check placement needs the skip-list to be exhaustive

The plan says to skip version checking for `--version`, `--help`, `init`, `schema`. But the current dispatch in `src/index.ts` handles `--version` and `--help` pre-dispatch (before `firstNonFlag` detection). This means only `init` and `schema` need explicit skipping in the compatibility check. Additionally, the `state` command may work without `.project/` existing (since `assembleState()` handles zero state). If version checking is added after project dir resolution, it needs to handle the case where `resolveProjectDir()` fails (no `.project/` exists).

Fix: The plan should specify that version checking wraps in a try/catch on `resolveProjectDir()` -- if it fails, skip the check (the command will handle the missing project itself). This is cleaner than maintaining a skip-list that must be updated whenever new commands are added.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan correctly identifies the four features and their architectural locations. The phasing is logical. However, there are multiple layer boundary violations (artifact detection in Data Layer, version stamping in `commitState()`), an INV-001 concern with silent version mutations, a missing artifact field from the target spec, and an inconsistent approach to filesystem I/O vs state tree reads. Fixing the five IMPORTANT issues would bring this to 9+. The plan's instincts are right in most cases (it even notes the tree-based alternative for Phase 2) but doesn't commit to the architecturally correct approach consistently.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
