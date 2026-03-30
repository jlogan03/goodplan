## Issues

**[IMPORTANT]** Phase 1 `completion` boolean in `ArtifactFlags` references a directory concept that does not exist in the data model or state machine

The plan lists `completion` as a slice/quest artifact flag: "completion (`completion/` directory exists with content)." However, codebase exploration confirms no `completion/` directory concept exists anywhere — not in the state machine transitions, not in the data model, not in `commitState()` directory materialization, and not in any existing slice on disk. The `completion/` mapping was flagged in Phase 3 paths (round 2, I3) and correctly resolved to `{}` there, but the same phantom concept persists in Phase 1's `ArtifactFlags` definition.

The epic architecture convention doc (`cli-interaction-conventions.md` line 238) does show `"completion": false` in the target artifact shape, but this appears aspirational — no backing infrastructure exists. Including a boolean that will always be `false` (because the directory never exists) provides no signal to consumers and sets a precedent of defining artifact flags for non-existent concepts.

Fix: Either (a) remove `completion` from the Phase 1 artifact flags (the `status` field on the entity JSON already distinguishes completed entities — `status === "completed"`), or (b) if `completion/` directories are planned as part of this epic's target architecture, add a task to Phase 1 that documents what creates them and when. Option (a) is simpler and consistent with the round-2 resolution for Phase 3. Note: this would also require updating the convention doc's example to match.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 `stampVersionIfNeeded` guard for `project.json` absence could miss edge cases beyond `create`

The plan says: "Guard against `project.json` absence — skip stamping if absent (e.g., during `create` phase)." The `create` phase for projects is handled via `rpcInit` (not `begin()`), so the guard is more broadly relevant than just `create`. Any `begin()` call that somehow runs before `project.json` exists (e.g., a corrupted `.project/` directory) would also need this guard. The plan's wording is correct ("skip stamping if absent") but the parenthetical "(e.g., during `create` phase)" is misleading since `begin('create', ...)` creates entities (epic, slice, quest) after `project.json` already exists. The guard is really for robustness, not for a specific phase.

Fix: Change the parenthetical from "(e.g., during `create` phase)" to "(e.g., corrupted project or race condition)" to accurately describe when absence would occur.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `resolvePathReferences` function signature takes `phase: string` — should use union type for type safety

The plan defines `resolvePathReferences(projectDir: string, target: Target, phase: string): PathReferences`. The `phase` parameter is typed as `string`, but the function's implementation is a phase-to-paths mapping with known, finite cases. Using `BeginPhase | SubmitPhase` (or a dedicated union of the phases that have path mappings) would catch typos at compile time and make the exhaustive default case (`{}`) explicit. This is consistent with the codebase pattern where `BeginPhase` and `SubmitPhase` are already narrow union types.

Fix: Type `phase` as `BeginPhase | SubmitPhase | 'complete'` (or define a `PathPhase` union) rather than `string`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan has addressed all round-2 IMPORTANT issues correctly: ArtifactFlags moved to `src/schemas/commands/`, `completion/` directory removed from Phase 3 path mappings, `paths` vs `architecturePaths` coexistence strategy documented, `PathReferences` JSDoc specified, `cli-minor-behind` replaces ambiguous `minor-ahead`, `process.stderr.write()` for warnings, `parseGlobalFlags` extended for `--quiet`, version stamp helper extracted, implementation order (1, 3, 4, 2) documented. The phase ordering rationale is clear and sound. Module boundaries are clean — `detectArtifacts()` is correctly placed as a pure function in `src/core/artifacts.ts`, `resolvePathReferences()` lives in the RPC layer, and version stamping uses a shared helper. The one remaining IMPORTANT issue is the `completion` boolean artifact flag referencing a nonexistent directory concept — the same phantom concept that was caught in Phase 3 paths but not in Phase 1 artifacts. Fixing it brings this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
