# Plan: Show/Status Enrichment & Spec Alignment

## Overview

Implements ergonomic CLI enrichments that make skill migration cleaner, plus result type spec alignment and semver compatibility. Phase 1 adds `artifacts` boolean fields to all `show --json` commands. Phase 2 upgrades `status --json` artifact counts to include file arrays. Phase 3 adds `paths?` fields to RPC result types. Phase 4 implements semver compatibility checking and bumps to version 1.0.0.

**Slug:** `show-status-enrich`

**Key decisions:**
- Artifact detection uses the state tree from `loadState()` (no extra filesystem I/O)
- Status artifact schema change is breaking (numbers → objects for 4 fields) — annotated "Changed in 1.0.0"
- Version bump to 1.0.0 happens in this slice alongside semver infrastructure
- `context?` fields on `BeginResult`/`SubmitResult` are deferred to a later slice

**Phase ordering rationale:** Phase 1 (show) and Phase 2 (status) are independent and could be done in either order. Phase 3 (paths) depends on existing RPC types and is independent of the others. **Phase 4 (semver/1.0.0 bump) must be implemented before Phase 2**, since Phase 2 introduces a breaking schema change that should be covered by the 1.0.0 version boundary. Implementation order: Phase 1, Phase 3, Phase 4, Phase 2.

## Phase 1: Show Artifact Enrichment

Add an `artifacts` object with boolean flags to `epic:show`, `slice:show`, and `quest:show` `--json` output, enabling quick workflow phase detection without parsing the full state tree.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `./goodplan slice:show --slice 01-tracer-bullet --json | jq '.artifacts'` — returns `null` (field doesn't exist)
- [ ] `./goodplan epic:show --epic skills-cli-integration --json | jq '.artifacts'` — returns `null`
- [ ] `./goodplan quest:show --quest fix-logging --json | jq '.artifacts'` — returns `null` (or no quests exist — command returns error)

**After implementation** (should pass / show presence):
- [ ] `./goodplan slice:show --slice 01-tracer-bullet --json | jq '.artifacts'` — returns `{ "goal": true, "exploreComplete": ..., "plan": true, "planRefined": true, "implementation": true, "abandoned": false }`
- [ ] `./goodplan epic:show --epic skills-cli-integration --json | jq '.artifacts'` — returns `{ "goal": true, "exploreComplete": true, ... }` with booleans matching actual file existence
- [ ] `./goodplan quest:show --quest <test-quest> --json | jq '.artifacts'` — returns artifact booleans matching quest file existence (conditional on an active quest existing at verification time; if none exists, create a temporary quest first or skip this check)
- [ ] A slice without a plan (if any) shows `plan: false`
- [ ] Human-readable `show` output (no `--json`) intentionally omits artifact info — artifacts are for programmatic consumption only
- [ ] `bun test` — all pass (existing + new)

### Tasks

- [x] **Create `src/core/artifacts.ts`** — peer to `src/core/tree.ts` (not in `src/core/data/` — `detectArtifacts()` is a pure function interpreting the tree, not I/O). Add a JSDoc module comment clarifying this is consumed by the Commands layer only and must not be imported by the state machine. Use overloaded signatures for automatic type narrowing at call sites: `detectArtifacts(tree: DirectoryEntry, entityType: 'epic'): EpicArtifactFlags` / `detectArtifacts(tree: DirectoryEntry, entityType: 'slice' | 'quest'): SliceArtifactFlags`. Walks the state tree directory entry for the entity and returns boolean flags. Entity-type-specific artifact mappings:
  - **Slice/Quest**: `goal` (check entity JSON goal field), `exploreComplete` (`explore-complete.md` or `explore-skipped.md` exists in tree), `plan` (`plan.md` exists), `planRefined` (`plan-refined.md` exists OR `plan-refined` directory exists — handle both file and directory), `implementation` (`implementation` directory exists with content), `abandoned` (`abandoned.md` exists)
  - **Epic**: same fields, mapped to epic-level files. `goal` from entity JSON, `exploreComplete` from explore markers, `plan`/`planRefined`/`implementation` → false for epics (these are slice-level artifacts). Add epic-specific: `architectureDefined` (`architecture/_overview.md` exists), `slicesDefined` (`slices/sequencing.md` exists)
  - Use `import type` for tree types per `verbatimModuleSyntax`. Import from `./tree.js` (canonical source)
  - Note: with `noUncheckedIndexedAccess`, all tree `contents` key lookups return `T | undefined` — guard accordingly
- [x] **Define `ArtifactFlags` Zod schema** in `src/schemas/commands/` (e.g., `show.ts` or `artifacts.ts`) — `ArtifactFlags` is a computed projection that only appears in command output, never persisted. Follows precedent of `statusResultSchema` in `src/schemas/commands/status.ts`. Separate schemas for slice/quest and epic artifact shapes. Export types via `z.infer`. These schemas are reused by `show --json` output schemas. Note: the `schema` command currently only exposes `args` and `stdinSchema` (no `outputSchema` field exists) — output schema exposure via `schema --command` is deferred to a later slice. INV-006 currently guarantees only args and stdin schemas
- [x] **Modify `src/commands/slice/show.ts`** — use the state tree from `loadState()` (already available in the command), resolve the slice's directory in the tree via `getDir()` from `tree.ts`, call `detectArtifacts()`, spread into the output: `output({ ...sliceJson, artifacts }, args)`. Define the output schema incorporating `ArtifactFlags` (output schema exposure via the `schema` command is deferred — see note above)
- [x] **Modify `src/commands/epic/show.ts`** — same pattern with epic directory, using `loadState()`
- [x] **Modify `src/commands/quest/show.ts`** — same pattern with quest directory, using `loadState()`
- [x] **Unit tests** — test `detectArtifacts()` with fixtures: slice with all artifacts, slice with none, epic with architecture, epic without. Test `planRefined` detection for both file and directory variants
- [x] **Integration tests** — `slice:show --json` includes `artifacts` field, verify boolean values match fixture state. Validate `show --json` output against the response schema (INV-005/INV-006)

### Verification

1. Run `./goodplan slice:show --slice 01-tracer-bullet --json | jq '.artifacts'` against the repo — verify booleans match reality
2. Run `./goodplan epic:show --epic skills-cli-integration --json | jq '.artifacts'` — verify epic artifacts
3. `bun test` — all pass

## Phase 2: Status File Arrays

Upgrade `status --json` artifact fields for architecture, research, brainstorm, and prototypes from plain number counts to `{ count: number, files: string[] }` objects.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `./goodplan status --json | jq '.artifacts.architecture'` — returns a number (e.g., `10`)
- [ ] `./goodplan status --json | jq '.artifacts.architecture.files'` — returns `null`

**After implementation** (should pass / show presence):
- [ ] `./goodplan status --json | jq '.artifacts.architecture'` — returns `{ "count": 10, "files": ["_overview.md", "commands-api.md", ...] }`
- [ ] `./goodplan status --json | jq '.artifacts.architecture.count'` — returns a number
- [ ] `./goodplan status --json | jq '.artifacts.architecture.files | length'` — equals the count
- [ ] `./goodplan status --json | jq '.artifacts.research.files'` — returns array of research filenames
- [ ] `decisions`, `learnings`, `completedSlices`, `totalSlices` remain plain numbers
- [ ] `bun test` — all pass (update existing tests that check artifact shape)

### Tasks

- [ ] **Update `src/schemas/commands/status.ts`** — change `Artifacts` schema: `architectureFiles` → `architecture: z.object({ count: z.number(), files: z.array(z.string()) })`, same for `researchFiles` → `research`, `brainstormFiles` → `brainstorm`, `prototypeFiles` → `prototypes`. Keep `decisions`, `learnings`, `completedSlices`, `totalSlices` as `z.number()`
- [ ] **Use state tree for file listing** — walk `DirectoryEntry.contents` keys from the assembled state tree to collect filenames (do not extend `countFiles()` with raw `fs.readdirSync`). The status command already calls `assembleState()` and has the full tree in memory — use it directly. With `noUncheckedIndexedAccess`, guard all `contents` key lookups
- [ ] **Update `src/commands/global/status.ts`** — use tree-based file listing to populate the enriched artifact fields. File listing must replicate the current dual-directory aggregation: collect files from both project-level directories (`architecture/`, `research/`, etc.) and the active epic's directories (`epics/<name>/architecture/`, etc.), matching `countArtifacts()` behavior. `files` arrays use state-tree-relative paths (relative to `.project/`, e.g., `"architecture/_overview.md"`, `"epics/skills-cli-integration/architecture/cli-changes.md"`) so consumers can distinguish origin directory — consistent with `architecturePaths` on `CompleteResult`
- [ ] **Update `formatStatusHuman()`** in `src/commands/global/status.ts` (lines 301-324) — update all four renamed artifact fields: `artifacts.architectureFiles` → `artifacts.architecture.count`, `artifacts.researchFiles` → `artifacts.research.count`, `artifacts.brainstormFiles` → `artifacts.brainstorm.count`, `artifacts.prototypeFiles` → `artifacts.prototypes.count`
- [ ] **Update existing tests** — any tests checking `artifacts.architectureFiles` (number) must be updated to check `artifacts.architecture.count` and `artifacts.architecture.files`
- [ ] **Add unit tests** for the enriched artifact shape — verify count matches files array length, filenames are correct
- [ ] **Update convention doc** (`skills/_shared/references/cli-interaction.md`) — document the new `status --json` artifact shape in the State Orientation section. Include "Changed in 1.0.0" annotation for the breaking field renames. Also update the `show --json` artifact shape example in `cli-interaction-conventions.md` to remove the `completion` field and show only the 6 current fields: `goal`, `exploreComplete`, `plan`, `planRefined`, `implementation`, `abandoned`

### Verification

1. Run `./goodplan status --json | jq '.artifacts'` — verify enriched shape
2. Verify `count` matches `files | length` for each enriched field
3. `bun test` — all pass

## Phase 3: Result Type Paths

Add `paths?: Record<string, string>` to `BeginResult`, `SubmitResult`, and `CompleteResult` per the RPC layer architecture spec. Skills use these to know where to write/read artifacts. Note: `context?` fields on these result types are deferred to a later slice.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `./goodplan slice:plan --slice <test-slice> --json | jq '.paths'` — returns `null`
- [ ] `./goodplan epic:explore --epic <test-epic> --json | jq '.paths'` — returns `null`

**After implementation** (should pass / show presence):
- [ ] `./goodplan slice:plan --slice <test-slice> --json | jq '.paths'` — returns `{ "plan": "/abs/path/.project/.../plan.md" }`
- [ ] `./goodplan epic:explore --epic <test-epic> --json | jq '.paths'` — returns `{ "research": "/abs/path/.project/.../research/" }`
- [ ] `./goodplan slice:implement --slice <test-slice> --json | jq '.paths'` — returns `{ "implementation": "/abs/path/.../implementation/" }`
- [ ] `submit-plan --slice <test-slice> --json | jq '.paths'` — returns `{ "plan": "/abs/path/..." }`
- [ ] `./goodplan slice:complete --slice <test-slice> --json | jq '.paths'` — returns `{}` (complete has no specific artifact paths)
- [ ] `bun test` — all pass

### Tasks

- [x] **Define `PathReferences` type** in `src/core/rpc/types.ts` — `type PathReferences = Record<string, string>`. Add `paths?: PathReferences` to `BeginResult`, `SubmitResult`, `CompleteResult` with JSDoc: "Always populated by the RPC layer; typed optional for backward compatibility with consumers that don't expect it." Since `resolvePathReferences` always returns an object (never `undefined`), always include `paths` in results — no conditional spread needed. This applies to all three result types (`BeginResult`, `SubmitResult`, `CompleteResult`). Note: `CompleteResult` already has `architecturePaths?: { currentArchitecture: string; targetArchitecture?: string }` with relative (state-tree-relative) paths — `paths` uses absolute paths. Coexistence strategy: (1) `paths` is the canonical forward-looking mechanism for all new consumers; (2) `architecturePaths` is retained for backward compatibility; (3) new consumers should use `paths`; (4) `architecturePaths` removal is deferred to a future slice
- [x] **Create path resolution logic** in `src/core/rpc/paths.ts` — function `resolvePathReferences(projectDir: string, target: Target, phase: BeginPhase | SubmitPhase | 'complete'): PathReferences` (use a narrow union type, not `string`, to catch typos at compile time and make the exhaustive default case explicit). Always returns an object (empty `{}` for phases with no specific paths, never `undefined`). Add JSDoc on `resolvePathReferences` documenting guaranteed keys per phase (e.g., `slice:plan` always returns `{ plan: string }`, `epic:explore` always returns `{ research: string, brainstorm: string }`). Explicitly list `submit-*` → begin-phase mappings (e.g., `submit-plan` resolves same paths as `plan`, `submit-refine-plan` resolves same as `refine-plan`) so consumers can look up any phase name without knowing the mapping rule. Maps phase + entity to absolute logical paths:
  - `slice:plan` / `quest:plan` → `{ plan: "<dir>/plan.md" }`
  - `slice:refine-plan` / `quest:refine-plan` → `{ plan: "<dir>/plan.md", planRefined: "<dir>/plan-refined.md" }` (note: `plan-refined` can be a file or directory — the path reference points to the file; if the skill creates a directory instead, it uses this as the base path)
  - `slice:implement` / `quest:implement` → `{ implementation: "<dir>/implementation/" }`
  - `epic:explore` → `{ research: "<dir>/research/", brainstorm: "<dir>/brainstorm/" }`
  - `epic:define-architecture` / `epic:refine-architecture` → `{ architecture: "<dir>/architecture/" }`
  - `epic:define-slices` / `epic:refine-slices` → `{ slices: "<dir>/slices/" }` (within the epic's `.project/epics/<name>/slices/`)
  - `slice:complete` / `quest:complete` → `{}` (the complete flow writes to `learnings.jsonl` and `architecture-deltas.jsonl` via the RPC layer — no single artifact directory to reference)
  - `create`, `abandon`, `activate` and other lifecycle phases → `{}` (intentionally empty — these phases don't write to specific artifact paths)
  - `submit-*` phases return the same paths as their corresponding `begin` phase (the subagent writes during `begin`, `submit` advances state). Explicit submit-to-begin mapping:

    | Submit phase | Resolves as | Notes |
    |---|---|---|
    | `submit-plan` | `plan` | |
    | `submit-refine-plan` | `refine-plan` | Returns both `plan` and `planRefined` paths |
    | `submit-implement` | `implement` | Returns `implementation` path |
    | `submit-explore` | `explore` | Returns `research` and `brainstorm` paths |
    | `submit-define-architecture` | `define-architecture` | Returns `architecture` path |
    | `submit-refine-architecture` | `refine-architecture` | Returns `architecture` path |
    | `submit-define-slices` | `define-slices` | Returns `slices` path |
- [x] **Modify RPC `begin()`** — call `resolvePathReferences()`, add `paths` to result
- [x] **Modify RPC `submit()`** — call `resolvePathReferences()` using the begin-phase equivalent to get the correct path mapping (e.g., `submit-plan` resolves paths for `plan`), add `paths` to result
- [x] **Modify RPC `complete()`** — call `resolvePathReferences()`, add `paths` to result
- [x] **Unit tests** — verify `paths` field appears in begin/submit/complete results with correct absolute paths. Test that phases with no mapping return `{}`
- [x] **Integration tests** — spawn binary, verify `paths` in `slice:plan --json` output

### Verification

1. Run `./goodplan slice:plan --slice <test-slice> --json | jq '.paths.plan'` — verify it's a valid absolute path
2. Run `./goodplan epic:explore --epic <test-epic> --json | jq '.paths.research'` — verify path exists
3. Test multiple command types to confirm the mapping is general
4. `bun test` — all pass

## Phase 4: Semver Compatibility

Implement version compatibility checking and bump CLI version to 1.0.0. The CLI checks `project.json.version` against its own version on every command that reads `.project/`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `./goodplan --version` — prints `goodplan 0.0.1`
- [ ] `./goodplan --version --json` — returns `{ "version": "0.0.1" }` (format already exists, but version value is wrong)
- [ ] No semver checking exists — any version mismatch is silently ignored

**After implementation** (should pass / show presence):
- [ ] `./goodplan --version` — prints `goodplan 1.0.0`
- [ ] `./goodplan --version --json` — returns `{ "version": "1.0.0" }`
- [ ] With a test project at version `1.0.0` and CLI at `1.0.0` — no warnings, normal operation (`compatible`)
- [ ] With CLI minor version ahead of data minor version (same major) — `compatible`, no warnings, normal operation
- [ ] With CLI minor version behind data minor version (`cli-minor-behind`) — stderr warning, command still executes
- [ ] With CLI major > data major (`major-ahead`) — stderr warning about possible incompatibility, command still executes
- [ ] With CLI major < data major (`major-behind`) — exit with `VALIDATION_VERSION_MAJOR_MISMATCH` error (exit code 2 via `VALIDATION_*` prefix routing)
- [ ] Warnings suppressed in `--json` mode (only stdout matters to parsers) and `--quiet` mode
- [ ] `bun test` — all pass

### Tasks

- [ ] **Bump version to 1.0.0** — update `package.json` version field. The `src/version.ts` `VERSION` const reads from package.json, so it will pick up the change automatically
- [ ] **Create `src/util/semver.ts`** — lightweight semver comparison functions:
  - `parseSemver(version: string): { major: number, minor: number, patch: number }` — validate input with `z.string().regex(/^\d+\.\d+\.\d+$/)` using `.safeParse()`, and throw `GoodplanError('VALIDATION_INVALID_INPUT', ...)` on failure (not raw `ZodError`) — consistent with the `assembleState` validation pattern. Version strings come from `project.json`, an external data boundary
  - `checkCompatibility(cliVersion: string, dataVersion: string): 'compatible' | 'cli-minor-behind' | 'major-ahead' | 'major-behind'` — four variants matching the spec's compatibility table in `cli-changes.md` lines 188-194: `compatible` (same major, CLI >= data — includes CLI minor ahead of data), `cli-minor-behind` (same major, data minor > CLI minor — warn, data may have features CLI doesn't know about), `major-ahead` (CLI major > data major — warn), `major-behind` (CLI major < data major — error)
  - No need for a full semver library — the version strings are always `X.Y.Z`
- [ ] **Extend `parseGlobalFlags()`** to also extract `quiet: boolean` — at the planned check location in `src/index.ts`, only `globalFlags.json` is currently available. `--quiet` is needed to suppress version warnings. Note: this means `--quiet` is parsed twice — once here in `parseGlobalFlags()` (for the compat check, before citty) and once by citty via `globalArgs`. This is intentional duplication; add an inline comment noting the two parsers must stay in sync if `--quiet` is renamed
- [ ] **Add compatibility check to command dispatch** — in the main dispatch path (after resolving project dir, before executing command), read `project.json` version via `loadState()`, compare against CLI version. Add a new `resolveProjectDir()` call in the dispatch path (accepting minor redundancy with per-command calls). Wrap the entire compat-check block in a try-catch that silently skips the check on `DATA_NO_PROJECT` (thrown by `resolveProjectDir()` when no `.project/` exists) — this ensures `init` and other project-creating commands work without a confusing error. This naturally covers `--version`, `--help`, `init`, `schema` without maintaining a fragile skip-list. For `cli-minor-behind`: `process.stderr.write()` warning. For `major-ahead`: `process.stderr.write()` warning. For `major-behind`: throw `GoodplanError('VALIDATION_VERSION_MAJOR_MISMATCH')`. Warning format: `"warning: Version mismatch: CLI v{cli} / data v{data}. ..."` (use `pc.yellow("warning:")` prefix — no emoji, consistent with existing `formatStatusHuman` warning style) — use `process.stderr.write()` (not `outputError()`, which writes structured `{ error: {...} }` JSON to stdout — wrong for non-error warnings). Suppress in `--json` mode (only stdout matters to parsers) and `--quiet` mode
- [ ] **Register `VALIDATION_VERSION_MAJOR_MISMATCH` error code** in `src/util/errors.ts` — using the `VALIDATION_*` prefix so `exitCodeForError()` automatically maps to exit code 2
- [ ] **Update `project.json.version` on every RPC mutation** — RPC-layer concern (not Data Layer, per INV-001): extract a shared `bumpDataVersionIfNeeded(state: ProjectState, cliVersion: string): ProjectState` helper to avoid triple-implementing the same logic. Call it in `begin()`, `submit()`, `complete()` after `reduce()` produces new state — check if CLI version > `project.json.version` (using `parseSemver` output, comparing `(major, minor, patch)` tuples numerically — consistent with `checkCompatibility`) and update it before calling `commitState()`. Use `setEntry()` from `tree.ts` to write the updated `project.json` back into the state tree (preserving the immutable tree pattern). Guard against `project.json` absence (`getJson<Project>(newState, 'project.json')` returns `Project | undefined`) — skip stamping if absent (e.g., corrupted project or race condition). Do not modify `commitState()` itself — version stamping is a policy/workflow decision, not I/O. **INV-001 exception:** Version stamping is intentionally applied post-`reduce()` in the RPC layer rather than flowing through a `STAMP_VERSION` state machine event. Rationale: `version` is infrastructure metadata (tracking which CLI version last wrote the data), not workflow state — the state machine need not validate or be aware of it. This is a documented, intentional exception to INV-001, not a silent violation
- [ ] **Unit tests** — `parseSemver` edge cases (valid, invalid, malformed), `checkCompatibility` for all four variants (`compatible`, `cli-minor-behind`, `major-ahead`, `major-behind`). Version stamp contract test: after any RPC mutation, `project.json.version` >= previous version
- [ ] **Integration tests** — create a temp `.project/` with mismatched versions, verify warning on stderr for minor mismatch, verify error exit for major mismatch (exit code 2)
- [ ] **Update convention doc** — document version checking behavior in the Binary Detection section. Document breaking changes from Phase 2 field renames

### Verification

1. Run `./goodplan --version` — confirms `1.0.0`
2. Create a temp project with version `1.1.0`, run a read command — verify stderr warning (cli-minor-behind)
3. Create a temp project with version `2.0.0`, run a read command — verify `VALIDATION_VERSION_MAJOR_MISMATCH` error (exit code 2)
4. Run `./goodplan status --json` on the goodplan repo — no warnings (versions match)
5. `bun test` — all pass
