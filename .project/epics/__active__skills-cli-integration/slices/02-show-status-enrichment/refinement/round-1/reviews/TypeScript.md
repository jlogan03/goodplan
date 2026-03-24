# TypeScript Review: Show/Status Enrichment & Spec Alignment

## Issues

**[IMPORTANT]** Missing `completion` boolean in Phase 1 artifact flags

The plan lists artifact booleans as: `goal`, `exploreComplete`, `plan`, `planRefined`, `implementation`, `abandoned`. The epic architecture spec (`cli-interaction-conventions.md` line 238) includes a `completion` boolean in the artifact shape. This is a spec-plan mismatch -- the plan omits `completion`. Add `completion` (check for `completion/` directory or entity status `completed`) to both the slice/quest and epic artifact shapes. The Zod schema in `src/schemas/commands/` must include it.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `VERSION_MAJOR_MISMATCH` error code prefix incompatible with `exitCodeForError`

The plan says `VERSION_MAJOR_MISMATCH` should exit with code 2. But `exitCodeForError()` in `src/util/output.ts` dispatches on prefix: `VALIDATION_*` -> 2, `STATE_*` -> 3, everything else -> 1. A `VERSION_*` prefix would fall through to exit code 1, not 2. Either: (a) name the error `VALIDATION_VERSION_MAJOR_MISMATCH` so the existing prefix routing gives exit 2, or (b) add `VERSION_*` prefix handling to `exitCodeForError`. Option (a) is simpler and semantically appropriate -- version mismatch is a kind of input validation against the data format version.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 plan says `detectArtifacts` takes `DirectoryEntry` but the show commands load entity JSON via `getJson()`, not the directory

The plan task says: "after loading entity JSON, call `assembleState()`, resolve the slice's directory in the tree, call `detectArtifacts()`." However, the show commands currently use `loadState()` (not `assembleState()`), and the plan's first task describes taking a `DirectoryEntry`. The plan should clarify: use `getDir(state, 'slices/<name>')` to get the slice's `DirectoryEntry` from the already-loaded state. No need to switch from `loadState()` to `assembleState()` -- `loadState()` returns the full tree. The plan's task for modifying `show.ts` mentions calling `assembleState()` but the research correctly notes `loadState()` is sufficient. Clarify this to avoid implementer confusion.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 tree-vs-filesystem inconsistency for file listing

The plan's Phase 2 task says "extend `countFiles()` to also return filenames" or "create `listFiles()`" but also mentions using the assembled state tree. The `status` command already calls `assembleState()` and has the full tree in memory. Using `countFiles()` (raw `fs.readdirSync`) duplicates the filesystem traversal. Since the tree's `DirectoryEntry.contents` keys already provide filenames, the plan should commit to the tree-based approach and remove the `countFiles()` / `listFiles()` alternative. This also aligns with the architecture principle that Data Layer reads come from the in-memory tree.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `PathReferences` type defined as plain `Record<string, string>` -- loses type safety

Phase 3 defines `type PathReferences = Record<string, string>`. With `noUncheckedIndexedAccess: true`, every key access on `Record<string, string>` returns `string | undefined`, which is correct. But consumers (skills) won't know which keys are present without documentation. Consider a more specific approach: define per-phase path shapes as specific interfaces (e.g., `{ plan: string }` for `slice:plan`) and union them under `PathReferences`. Alternatively, keep `Record<string, string>` but add a JSDoc comment on each `resolvePathReferences` return documenting the guaranteed keys for each phase. The current plan has no type-level indication of which keys exist for which phase.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 `parseSemver` returns a plain object -- should use Zod for validation at boundary

The plan says: "lightweight semver comparison functions: `parseSemver(version: string)`: `{ major, minor, patch }`". Version strings come from `project.json` (external data) and should be validated. A Zod schema like `z.string().regex(/^\d+\.\d+\.\d+$/)` at the parse boundary would prevent malformed version strings from propagating. The `parseSemver` function should validate and throw a structured error on invalid input, not silently return NaN values from `parseInt` of garbage input.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 version stamp on `commitState()` is an RPC-layer concern placed in the Data Layer

The plan says: "stamp on `commitState()` if the CLI version is newer than the data version." But `commitState()` is a Data Layer function (pure I/O), and version stamping is a workflow decision. Per the architecture, the RPC layer should update `project.json.version` before calling `commitState()`, not embed this logic in the Data Layer. The plan's parenthetical "This is an RPC-layer concern" is correct -- make the task explicitly say to modify the RPC mutation path (e.g., in `begin()` / `submit()` / `complete()`) to update `project.version` in the state tree before commit.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `ArtifactFlags` Zod schemas in `src/schemas/commands/` -- plan doesn't specify reuse for `show` output schema

The plan creates `ArtifactFlags` Zod schemas for slice/quest and epic, but the `show` commands don't currently have output schemas (they return raw entity JSON + artifacts). The plan should specify whether the `show --json` output gets a Zod output schema (for `schema` command compatibility per INV-006) or if the artifact flags are just added as a runtime enrichment without schema enforcement on the output path. Given the project's strict validation-on-every-boundary approach, an output schema for `show` would be appropriate.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 skip-list for version checking is fragile

The plan says to skip version checking for `--version`, `--help`, `init`, `schema`. This is a hard-coded skip list that must be maintained as commands are added. A more robust approach: only check version compatibility when `resolveProjectDir()` succeeds (i.e., `.project/` exists). Commands that don't need `.project/` already throw `DATA_NO_PROJECT` when it's missing. This naturally covers `--version`, `--help`, `init` (which creates `.project/`), and `schema` (which doesn't need `.project/`). Use a try-catch around `resolveProjectDir()` for the compat check rather than maintaining a command skip-list.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 adds `paths?` to `BeginResult` but spec says "always included"

The epic architecture RPC spec (line 196) says `paths?: PathReferences; // always included` on `BeginResult`. The plan correctly types it as optional but should explicitly note in the task that `paths` must always be populated (never `undefined`) on `BeginResult`, even if the type allows it. The `resolvePathReferences` function should return `{}` (not `undefined`) for phases with no specific paths, so `paths` is always present on `BeginResult`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan covers the right scope and the phase ordering is logical. However, six IMPORTANT issues need resolution: the missing `completion` boolean from the epic spec, the exit code routing mismatch for the new error code, the tree-vs-filesystem inconsistency in Phase 2, the ambiguity around `loadState` vs `assembleState` in Phase 1, the weak typing of `PathReferences`, and the unvalidated semver parsing at a data boundary. Fixing these would bring the score to 9+.

## Summary
- Critical: 0
- Important: 6
- Minor: 4
