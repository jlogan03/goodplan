# Plan: Show/Status Enrichment & Spec Alignment

## Overview

Implements ergonomic CLI enrichments that make skill migration cleaner, plus result type spec alignment and semver compatibility. Phase 1 adds `artifacts` boolean fields to all `show --json` commands. Phase 2 upgrades `status --json` artifact counts to include file arrays. Phase 3 adds `paths?` fields to RPC result types. Phase 4 implements semver compatibility checking and bumps to version 1.0.0.

**Slug:** `show-status-enrich`

**Key decisions:**
- Artifact detection uses the assembled state tree (no extra filesystem I/O)
- Status artifact schema change is breaking (numbers → objects for 4 fields)
- Version bump to 1.0.0 happens in this slice alongside semver infrastructure

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
- [ ] A slice without a plan (if any) shows `plan: false`
- [ ] `bun test` — all pass (existing + new)

### Tasks

- [ ] **Create `src/core/data/artifacts.ts`** — shared `detectArtifacts(tree: DirectoryEntry, entityType: 'epic' | 'slice' | 'quest'): ArtifactFlags` function. Walks the state tree directory entry for the entity and returns boolean flags. Entity-type-specific artifact mappings:
  - **Slice/Quest**: `goal` (check entity JSON goal field), `exploreComplete` (`explore-complete.md` or `explore-skipped.md` exists in tree), `plan` (`plan.md` exists), `planRefined` (`plan-refined.md` or `plan-refined` directory exists), `implementation` (`implementation` directory exists with content), `abandoned` (`abandoned.md` exists)
  - **Epic**: same fields, mapped to epic-level files. `goal` from entity JSON, `exploreComplete` from explore markers, `plan`/`planRefined`/`implementation` → false for epics (these are slice-level artifacts). Add epic-specific: `architectureDefined` (`architecture/_overview.md` exists), `slicesDefined` (`slices/sequencing.md` exists)
  - Use `import type` for tree types per `verbatimModuleSyntax`
- [ ] **Define `ArtifactFlags` Zod schema** in `src/schemas/commands/` — separate schemas for slice/quest and epic artifact shapes. Export types via `z.infer`
- [ ] **Modify `src/commands/slice/show.ts`** — after loading entity JSON, call `assembleState()`, resolve the slice's directory in the tree, call `detectArtifacts()`, spread into the output: `output({ ...sliceJson, artifacts }, args)`
- [ ] **Modify `src/commands/epic/show.ts`** — same pattern with epic directory
- [ ] **Modify `src/commands/quest/show.ts`** — same pattern with quest directory
- [ ] **Unit tests** — test `detectArtifacts()` with fixtures: slice with all artifacts, slice with none, epic with architecture, epic without
- [ ] **Integration tests** — `slice:show --json` includes `artifacts` field, verify boolean values match fixture state

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
- [ ] **Update `src/core/data/files.ts`** or create a new helper — extend `countFiles()` to also return filenames (or create `listFiles()` that returns `{ count, files }`). Alternatively, use the assembled state tree to walk directory entries and collect filenames
- [ ] **Update `src/commands/global/status.ts`** — use the new helper to populate the enriched artifact fields
- [ ] **Update existing tests** — any tests checking `artifacts.architectureFiles` (number) must be updated to check `artifacts.architecture.count` and `artifacts.architecture.files`
- [ ] **Add unit tests** for the enriched artifact shape — verify count matches files array length, filenames are correct
- [ ] **Update convention doc** (`skills/_shared/references/cli-interaction.md`) — document the new `status --json` artifact shape in the State Orientation section

### Verification

1. Run `./goodplan status --json | jq '.artifacts'` — verify enriched shape
2. Verify `count` matches `files | length` for each enriched field
3. `bun test` — all pass

## Phase 3: Result Type Paths

Add `paths?: Record<string, string>` to `BeginResult`, `SubmitResult`, and `CompleteResult` per the RPC layer architecture spec. Skills use these to know where to write/read artifacts.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `./goodplan slice:plan --slice <test-slice> --json | jq '.paths'` — returns `null`
- [ ] `./goodplan epic:explore --epic <test-epic> --json | jq '.paths'` — returns `null`

**After implementation** (should pass / show presence):
- [ ] `./goodplan slice:plan --slice <test-slice> --json | jq '.paths'` — returns `{ "plan": "/abs/path/.project/.../plan.md" }`
- [ ] `./goodplan epic:explore --epic <test-epic> --json | jq '.paths'` — returns `{ "research": "/abs/path/.project/.../research/" }`
- [ ] `./goodplan slice:implement --slice <test-slice> --json | jq '.paths'` — returns `{ "implementation": "/abs/path/.../implementation/" }`
- [ ] `submit-plan --slice <test-slice> --json | jq '.paths'` — returns `{ "plan": "/abs/path/..." }`
- [ ] `bun test` — all pass

### Tasks

- [ ] **Define `PathReferences` type** in `src/core/rpc/types.ts` — `type PathReferences = Record<string, string>`. Add `paths?: PathReferences` to `BeginResult`, `SubmitResult`, `CompleteResult`
- [ ] **Create path resolution logic** in `src/core/rpc/paths.ts` (or inline in the RPC functions) — function `resolvePathReferences(projectDir: string, target: Target, phase: string): PathReferences`. Maps phase + entity to logical paths:
  - `slice:plan` / `quest:plan` → `{ plan: "<dir>/plan.md" }`
  - `slice:refine-plan` / `quest:refine-plan` → `{ plan: "<dir>/plan.md", planRefined: "<dir>/plan-refined.md" }`
  - `slice:implement` / `quest:implement` → `{ implementation: "<dir>/implementation/" }`
  - `epic:explore` → `{ research: "<dir>/research/", brainstorm: "<dir>/brainstorm/" }`
  - `epic:define-architecture` → `{ architecture: "<dir>/architecture/" }`
  - `epic:define-slices` → `{ slices: "<dir>/slices/" }`
  - `slice:complete` / `quest:complete` → `{ completion: "<dir>/completion/" }`
  - Other phases → `{}` (no specific paths)
- [ ] **Modify RPC `begin()`** — call `resolvePathReferences()`, add to result
- [ ] **Modify RPC `submit()`** — call `resolvePathReferences()`, add to result
- [ ] **Modify RPC `complete()`** — call `resolvePathReferences()`, add to result
- [ ] **Unit tests** — verify `paths` field appears in begin/submit/complete results with correct absolute paths
- [ ] **Integration tests** — spawn binary, verify `paths` in `slice:plan --json` output

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
- [ ] No semver checking exists — any version mismatch is silently ignored

**After implementation** (should pass / show presence):
- [ ] `./goodplan --version` — prints `goodplan 1.0.0`
- [ ] `./goodplan --version --json` — returns `{ "version": "1.0.0" }`
- [ ] With a test project at version `1.0.0` and CLI at `1.0.0` — no warnings, normal operation
- [ ] With a test project at version `1.1.0` and CLI at `1.0.0` — stderr warning about minor version mismatch, command still executes
- [ ] With a test project at version `2.0.0` and CLI at `1.0.0` — exit with `VERSION_MAJOR_MISMATCH` error (exit code 2)
- [ ] `bun test` — all pass

### Tasks

- [ ] **Bump version to 1.0.0** — update `package.json` version field. The `src/version.ts` `VERSION` const reads from package.json, so it will pick up the change automatically
- [ ] **Create `src/util/semver.ts`** — lightweight semver comparison functions: `parseSemver(version: string): { major: number, minor: number, patch: number }`, `checkCompatibility(cliVersion: string, dataVersion: string): 'compatible' | 'minor-mismatch' | 'major-mismatch'`. No need for a full semver library — the version strings are always `X.Y.Z`
- [ ] **Add compatibility check to command dispatch** — in the main dispatch path (after resolving project dir, before executing command), read `project.json` version via `assembleState()` or `loadState()`, compare against CLI version. Skip for commands that don't read `.project/` (`--version`, `--help`, `init`, `schema`). For `minor-mismatch`: `process.stderr.write()` warning. For `major-mismatch`: throw `GoodplanError('VERSION_MAJOR_MISMATCH')` with exit code 2
- [ ] **Register `VERSION_MAJOR_MISMATCH` error code** in `src/util/errors.ts`
- [ ] **Update `project.json.version` on writes** — when the CLI writes data using new features (minor-version additions), update `project.json.version` to the CLI's current version. This is an RPC-layer concern — stamp on `commitState()` if the CLI version is newer than the data version
- [ ] **Unit tests** — `parseSemver` edge cases, `checkCompatibility` for compatible/minor/major mismatches
- [ ] **Integration tests** — create a temp `.project/` with mismatched versions, verify warning on stderr for minor mismatch, verify error exit for major mismatch
- [ ] **Update convention doc** — document version checking behavior in the Binary Detection section

### Verification

1. Run `./goodplan --version` — confirms `1.0.0`
2. Create a temp project with version `1.1.0`, run a read command — verify stderr warning
3. Create a temp project with version `2.0.0`, run a read command — verify `VERSION_MAJOR_MISMATCH` error
4. Run `./goodplan status --json` on the goodplan repo — no warnings (versions match)
5. `bun test` — all pass
