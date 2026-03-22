# Plan: Project Init — Full Stack

## Overview

Prove the recursive tree state model works end-to-end by refactoring `goodplan init` to go through the complete load→reduce→commit cycle. Builds the core infrastructure every subsequent slice depends on: `ProjectState` recursive tree types, `assembleState()` with zero-state support, `commitState()` with recursive tree diff and filesystem materialization, all Zod entity schemas, a state machine scaffold with `INIT_PROJECT`, and the RPC wiring that connects them.

Approach: bottom-up within the slice — pure types first (no I/O), then schemas, then the I/O layer (assembleState/commitState), then the state machine scaffold, then wire everything together and refactor the tracer bullet's init command. Each phase is independently testable.

Key decisions: no cache (deferred to slice 03), no concurrent modification detection (deferred to slice 03), `commitState()` skips markdown entries (LLM writes those directly). The tracer bullet's `readEntity`/`writeEntity` functions in `src/core/data/json.ts` are replaced by the tree model — existing callers (`readProject`/`writeProject`) are updated to use assembleState/commitState internally until init is fully refactored in Phase 5.

## Phase 1: State Tree Types & Navigation

Pure types and helper functions for the recursive `ProjectState` tree. No I/O, no schemas — just the data structure and navigation.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/data/tree.ts` — file not found
- [ ] `bun run -e "import { resolve } from './src/core/data/tree'"` — module not found

**After implementation** (should pass / show presence):
- [x] `bun test tests/unit/data/tree.test.ts` — all tree navigation tests pass
- [x] Types compile: `npx tsc --noEmit` passes with new tree types

### Tasks

- [x] Create `src/core/data/tree.ts` — `StateEntry` discriminated union (`DirectoryEntry`, `JsonEntry<T>`, `JsonlEntry<T>`, `MarkdownEntry`), `ProjectState` type alias for `DirectoryEntry`. Use `import type` / `export type` throughout per `verbatimModuleSyntax: true`.
- [x] Implement tree navigation helpers in `src/core/data/tree.ts`: `resolve(state, path)`, `getJson<T>(state, path)`, `getJsonl<T>(state, path)`, `getDir(state, path)`, `getMarkdown(state, path)`, `hasChild(state, dirPath, childName)`
- [x] Implement `setEntry(state, path, entry)` — immutable setter that returns a new tree with the entry at the given path (used by the state machine's apply functions to build new state). Auto-creates intermediate `DirectoryEntry` nodes for missing path segments (matching `mkdirSync({ recursive: true })` semantics).
- [x] Implement `ZERO_STATE` constant — `{ type: "directory", contents: {} } as const satisfies ProjectState` representing an uninitialized project (type-level immutability prevents accidental mutation)
- [x] Write unit tests: resolve paths, get typed entries, hasChild on nested directories, setEntry produces new tree without mutating original, setEntry auto-creates intermediate directories, edge cases (empty path, missing intermediate directories, path to wrong type)

Note: `getJson<T>(state, path)` performs an unchecked cast — it is unsafe for unvalidated trees. The validation boundary is `commitState`, which runs Zod schemas on all entities. Callers must pass the correct type parameter and only use `getJson<T>` on trees that have passed through assembly (schema-validated) or commit (schema-validated). This is an intentional tradeoff documented here for awareness.

### Verification
`bun test tests/unit/data/tree.test.ts` passes. `npx tsc --noEmit` passes.

## Phase 2: Entity Schemas

All Zod schemas for entity types (epic, slice, quest, overview) and JSONL records (activity-log, decisions, learnings, architecture-deltas). Schema registry mapping path patterns to schemas.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/schemas/entities/epic.ts` — file not found
- [ ] `ls src/schemas/records/` — directory not found

**After implementation** (should pass / show presence):
- [x] `bun test tests/unit/schemas/` — all schema tests pass (valid and invalid fixtures for every entity and record type)
- [x] `npx tsc --noEmit` passes

### Tasks

- [x] Create `src/schemas/entities/epic.ts` — `epicSchema` + `Epic` type. Fields: name, status (EpicStatus enum), goal, verifications array (define `verificationSchema` for the `Verification` object shape — inline or standalone export), sliceSequence array, created, activated (nullable), updated
- [x] Create `src/schemas/entities/slice.ts` — `sliceSchema` + `Slice` type. Fields: name, epic, status (SliceStatus enum), goal, deferred array, refinement (nullable object with round, maxRounds, scoreHistory), created, updated
- [x] Create `src/schemas/entities/quest.ts` — `questSchema` + `Quest` type. Fields: name, status (QuestStatus enum), goal, refinement (nullable, same structure as slice), created, updated
- [x] Create `src/schemas/entities/overview.ts` — `overviewSchema` + `Overview` type. Items array with name, status (`z.string()` — not a specific enum, since overview items aggregate heterogeneous entity statuses), created, completed (nullable)
- [x] Create `src/schemas/records/activity-log.ts` — `activityEntrySchema` + `ActivityEntry` type. Fields: ts, phase (`z.string().min(1)` — full enum deferred), scope, status, summary, detail (optional)
- [x] Create `src/schemas/records/decision.ts` — `decisionEntrySchema` + `DecisionEntry` type. Fields: id, status, domain, title, summary, date, supersededBy (nullable)
- [x] Create `src/schemas/records/learning.ts` — `learningEntrySchema` + `LearningEntry` type. Fields: category, summary, detail, tags, source, rollup (`z.boolean()`, required), rollupTo (`z.array(z.string())`, required). Note: this is the stored type; input variant (omitting `source`) deferred to the slice implementing COMPLETE_SLICE.
- [x] Create `src/schemas/records/architecture-delta.ts` — `architectureDeltaSchema` + `ArchitectureDelta` type. Fields: subsystem, type, description, ts
- [x] Create `src/schemas/state-events.ts` — `StateEvent` as a plain TypeScript discriminated union (not Zod — it's internal-only, constructed by RPC and consumed by the state machine, never parsed from external input; Zod adds runtime overhead with no validation benefit here). INIT_PROJECT only for this slice, but define the union structure so future slices extend it. `StateError` plain object type: `{ code: string, message: string, detail?: Record<string, unknown> }` (per `state-machine-api.md`). Export an `isStateError(result): result is StateError` type guard (checking `"code" in result`) for clean narrowing at call sites.
- [x] Create `src/core/data/schema-registry.ts` — array of `{ pattern: RegExp, schema: z.ZodType }` entries (use `z.ZodType` per Zod 4 conventions — `ZodTypeAny` and `ZodSchema` are removed/deprecated) mapping path patterns to schemas. Export `findSchema(path)` function. Include the existing `projectSchema` (from `src/schemas/entities/project.ts`) for `project.json`, plus all JSONL patterns (`activity-log.jsonl`, `slices/*/learnings.jsonl`, `slices/*/architecture-deltas.jsonl`, `decisions.jsonl`, `learnings.jsonl`). Note: `^learnings\.jsonl$` (project-level) and `.*\/learnings\.jsonl$` (per-slice/quest) overlap — not blocking since both use the same schema, but registry ordering matters; place the more specific project-level pattern first.
- [x] Create entity status enum schemas: `epicStatusSchema`, `sliceStatusSchema`, `questStatusSchema` — values matching transition-tables.md
- [x] Write unit tests: valid/invalid fixtures for every schema, schema registry resolves correct schema for each entity path pattern (including `project.json` and all JSONL patterns: `activity-log.jsonl`, `slices/*/learnings.jsonl`, `slices/*/architecture-deltas.jsonl`, `decisions.jsonl`), unknown paths return undefined

### Verification
`bun test tests/unit/schemas/` passes. Schema registry correctly maps `epics/*/epic.json` → epicSchema, `slices/*/slice.json` → sliceSchema, etc.

## Phase 3: assembleState & commitState

The I/O layer: reading the filesystem into a tree and writing a tree back to the filesystem.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run -e "import { assembleState } from './src/core/data/assemble'"` — module not found

**After implementation** (should pass / show presence):
- [x] `bun test tests/unit/data/assemble.test.ts` — all assembly tests pass
- [x] `bun test tests/unit/data/commit.test.ts` — all commit tests pass

### Tasks

- [x] Create `src/core/data/assemble.ts` — `assembleState(projectDir?)` where `projectDir` is the `.project/` directory path (i.e. `resolveProjectDir()`'s return value): recursively walk `.project/`, build tree. For `.json` files: look up schema via registry — if no matching schema, **silently skip** the file (do not include in tree, do not error — per `data-layer-api.md`). If schema found: parse, validate with `safeParse()`, collect errors. For `.jsonl` files: parse lines, validate each with `safeParse()`, collect errors. For `.md` files: read text, create `MarkdownEntry`. Other file types are **silently skipped** (not added to the tree). For directories: create `DirectoryEntry` with nested contents. Skip `.state-cache.json` (future-proofing for slice 03 cache) and `node_modules`. Return `ZERO_STATE` if `.project/` doesn't exist. Error strategy: collect all validation errors across all files, then throw a single `GoodplanError` with code `DATA_VALIDATION_ERROR` listing all failing file paths and Zod error details.
- [x] Create `src/core/data/commit.ts` — `commitState(projectDir, oldState, newState)`: recursive tree diff. New directory → `mkdirSync(recursive)`. New json → validate + deterministicStringify + atomic write (temp + rename). New jsonl → validate + deterministicStringify each entry + atomic write. Changed json → validate + write atomically. Changed jsonl → detect appended entries by comparing array lengths only (existing entries are trusted unchanged per INV-003 reducer purity), append only new lines (use `slice` + `map` on the array rather than indexed access, to avoid unnecessary `T | undefined` checks from `noUncheckedIndexedAccess`). Note: new JSONL files (not present in oldState) are written in full; append-only semantics apply only to changed JSONL files. Markdown entries → skip (read-only). Write ordering: JSON first, JSONL second (collect writes into two arrays, flush JSON array then JSONL array — this ensures entity state survives even if the process crashes before audit/log entries are written). Add `// TODO: concurrent modification detection deferred to slice 03` comment at the top of the function.
- [x] Add debug logging to assembleState and commitState — wire to the existing `--verbose` global flag (log to stderr per conventions.md): files read, files written, directories created, validation results. Additionally, support `GOODPLAN_DEBUG=1` as a dev/test-only mechanism (for contexts where no CLI flag is available, e.g. unit tests). Document `GOODPLAN_DEBUG` in conventions.md as a dev-time-only env var.
- [x] Update `resolveProjectDir()` in `src/core/data/project.ts` to work with the new tree model (it currently returns a path; assembleState uses it to find the root)
- [x] Write unit tests for assembleState: fixture `.project/` with known files → tree matches expected structure, empty/missing `.project/` → ZERO_STATE, `.json` validation failure → `GoodplanError` with `DATA_VALIDATION_ERROR` code listing failing paths, `.jsonl` with invalid line → error includes line number, markdown files read as text, unregistered `.json` files silently skipped (not in tree), non-JSON/JSONL/MD file types silently skipped, multiple validation errors across files collected into single error
- [x] Write unit tests for commitState: new tree written to filesystem matches expected files, JSON has deterministic keys, JSONL append-only (add entries, verify file has additional lines not full rewrite), directories created for new entries, markdown entries skipped

### Verification
`bun test tests/unit/data/` passes. Create a fixture `.project/` directory, run assembleState, verify tree structure. Modify tree, run commitState, verify filesystem changes. Debug logging: `GOODPLAN_DEBUG=1 bun test` shows trace output on stderr (env var used here since no CLI flag available in unit tests).

## Phase 4: State Machine Scaffold + INIT_PROJECT

The `reduce()` function with just the INIT_PROJECT event. Pure functions, no I/O.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/state/` — directory not found

**After implementation** (should pass / show presence):
- [x] `bun test tests/unit/state/` — all state machine tests pass
- [x] `grep -r "from.*fs" src/core/state/` — returns nothing (purity check)

### Tasks

- [x] Create `src/core/state/reduce.ts` — `reduce(state: ProjectState, event: StateEvent): ProjectState | StateError`. Dispatch by `event.type`. For unknown event types, return `StateError` with `STATE_INVALID_TRANSITION`. `StateError` is a plain `{ code: string, message: string, detail?: Record<string, unknown> }` object (not a thrown error).
- [x] Create `src/core/state/transitions/init.ts` — INIT_PROJECT handler. Guard: `project.json` must not exist in state tree (check via `hasChild`); return `StateError` with code `STATE_ALREADY_INITIALIZED` on failure. Apply: produce new tree with `project.json` (name, version "1.0.0", null active pointers, timestamps), `epics/overview.json`, `slices/overview.json`, `quests/overview.json` (empty items arrays), `epics/`, `slices/`, `quests/` directory entries, `activity-log.jsonl` with init entry, `decisions.jsonl` (empty), `learnings.jsonl` (empty). Use `setEntry` to build the tree immutably.
- [x] Export `StateEvent`, `StateError`, and `isStateError` from `src/core/state/types.ts` (thin re-export layer from schemas). Use `export type` for `StateEvent` and `StateError` per `verbatimModuleSyntax: true`; use regular `export` for `isStateError` (it's a runtime function, not a type).
- [x] Write unit tests: INIT_PROJECT on ZERO_STATE → valid tree with all expected entries (including structural assertions on the activity log entry shape — verify ts, phase, scope, status, summary fields via plain object shape checks, not Zod imports), INIT_PROJECT on existing project → StateError with STATE_ALREADY_INITIALIZED, reduce with unknown event type → STATE_INVALID_TRANSITION, purity check (same inputs → same output)

### Verification
`bun test tests/unit/state/` passes. `grep -r "from.*fs" src/core/state/` returns nothing. Calling `reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test" })` returns a complete initial project tree.

## Phase 5: Refactor Init & Wire Full Stack

Wire init command through RPC → reduce → commitState. Update status to read from tree. Binary regression.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Current `init` writes `project.json` directly — does not create overview.json files or collection directories

**After implementation** (should pass / show presence):
- [ ] `goodplan init --name test-project` in empty dir — creates .project/ with project.json, epics/overview.json, slices/overview.json, quests/overview.json, activity-log.jsonl, decisions.jsonl, learnings.jsonl, plus collection directories
- [ ] `goodplan init` in same dir — exit 3, STATE_ALREADY_INITIALIZED
- [ ] `goodplan status --json` — returns valid StatusResult
- [ ] `goodplan status` — human-readable output displays project name and status
- [ ] `goodplan status --json --query '.project.name'` — returns `"test-project"`
- [ ] `goodplan init --quiet` — suppresses output (no stdout)
- [ ] `goodplan init --json` (in fresh dir) — returns structured JSON result; verify with `goodplan init --json | jq .name` returning `"test-project"` (or cwd basename)
- [ ] `cd /tmp/my-project && goodplan init` — name defaults to `"my-project"`
- [ ] `mkdir -p /tmp/alt-project && cd /tmp/alt-project && goodplan init --name alt && goodplan status --json` — works in a different directory (GOODPLAN_DIR points to `.project/` not project root; init always uses cwd)
- [ ] `bun run build && cd $(mktemp -d) && /abs/path/to/goodplan init --name binary-test && /abs/path/to/goodplan status --json` — compiled binary works (run in temp dir to avoid creating `.project/` in repo root)

### Tasks

- [ ] Create `src/core/rpc/init.ts` — RPC function for init: call `assembleState()` (which returns ZERO_STATE naturally if `.project/` doesn't exist), build INIT_PROJECT event, call `reduce()`, check result with `isStateError()` — if true, map to `GoodplanError` (using `StateError.code` as the error code and `StateError.message` as the message), call `commitState()` with old and new state
- [ ] Refactor `src/commands/global/init.ts` — remove direct file writes, call RPC init function instead. Keep `--name` default (basename of cwd) and STATE_ALREADY_INITIALIZED check (check cwd/.project/ directly before assembleState, per tracer bullet learning). Preserve existing human-readable success message format. All output must route through `output()` to preserve `--quiet` behavior.
- [ ] Update `src/commands/global/status.ts` — refactor `buildStatusResult()` to call `assembleState()` directly to read the state tree, then extract project info from the tree. This replaces the direct `readProject()` call. Note: this direct `assembleState()` call is a temporary arrangement — it will be replaced when RPC `status()` is implemented in a later slice (architecturally valid for read-only commands).
- [ ] Remove `src/core/data/project.ts` functions that are now superseded (`readProject`/`writeProject`) — keep `resolveProjectDir()`. Update any remaining callers.
- [ ] Remove or update `src/core/data/json.ts` and its test file `tests/unit/data/json.test.ts` — `readEntity`/`writeEntity` are replaced by assembleState/commitState for the init flow. Keep `deterministicStringify` in `src/util/json.ts` (already moved there in tracer bullet). Remove the old functions and tests if no callers remain; otherwise mark deprecated.
- [ ] Update all existing tests that used `readEntity`/`writeEntity`/`readProject`/`writeProject`
- [ ] Update `.project/conventions.md` repo structure section to match actual `src/` directory layout after this slice — document new directories: `src/schemas/records/`, `src/core/state/`, `src/core/state/transitions/`, `src/core/rpc/`
- [ ] Run full test suite: `bun test` — all tests pass (including updated tests from tracer bullet)
- [ ] Run type check: `npx tsc --noEmit` — passes
- [ ] Run binary regression: `bun run build && cd $(mktemp -d) && /abs/path/to/goodplan init --name binary-test && /abs/path/to/goodplan status --json` (in temp dir). Also test error paths: running init twice in the same dir should exit 3; `goodplan status --query '.project.name'` (without `--json`) should exit with VALIDATION_INVALID_INPUT error.

### Verification
1. `goodplan init --name my-project` in fresh temp dir — creates full `.project/` structure per architecture.
2. `goodplan status --json` — valid StatusResult from tree-based data layer.
3. `cat .project/activity-log.jsonl | head -1 | jq .phase` — returns `"init"`.
4. `goodplan init` again — exit 3 with STATE_ALREADY_INITIALIZED (verify both human-mode stderr message and JSON-mode `{ "error": { "code": ... } }` output per INV-007).
5. `bun run build && cd $(mktemp -d) && /abs/path/to/goodplan init --name binary-test && /abs/path/to/goodplan status --json` — binary works (in temp dir). Running init again in the same dir exits 3.
6. `bun test` — all tests pass. `npx tsc --noEmit` — clean.
7. `goodplan status --query '.project.name'` (without `--json`) — exits with VALIDATION_INVALID_INPUT error.
8. `NO_COLOR=1 goodplan status` — produces uncolored output.
9. `goodplan init --name debug-test --verbose 2>&1 1>/dev/null | grep -q 'project.json'` — verbose stderr includes specific file paths (e.g., `project.json`).
