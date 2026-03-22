# Plan: Project Init — Full Stack

## Overview

Prove the recursive tree state model works end-to-end by refactoring `goodplan init` to go through the complete load→reduce→commit cycle. Builds the core infrastructure every subsequent slice depends on: `ProjectState` recursive tree types, `assembleState()` with zero-state support, `commitState()` with recursive tree diff and filesystem materialization, all Zod entity schemas, a state machine scaffold with `INIT_PROJECT`, and the RPC wiring that connects them.

Approach: bottom-up within the slice — pure types first (no I/O), then schemas, then the I/O layer (assembleState/commitState), then the state machine scaffold, then wire everything together and refactor the tracer bullet's init command. Each phase is independently testable.

Key decisions: no cache (deferred to slice 03), no concurrent modification detection (deferred to slice 03), `commitState()` skips markdown entries (LLM writes those directly). The tracer bullet's `readEntity`/`writeEntity` functions in `src/core/data/json.ts` are replaced by the tree model — existing callers (`readProject`/`writeProject`) are updated to use assembleState/commitState internally until init is fully refactored in Phase 5.

## Phase 1: State Tree Types & Navigation

Pure types and helper functions for the recursive `ProjectState` tree. No I/O, no schemas — just the data structure and navigation.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/state/` — directory not found (state machine directory doesn't exist yet)
- [ ] `bun run -e "import { resolve } from './src/core/data/tree'"` — module not found

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/data/tree.test.ts` — all tree navigation tests pass
- [ ] Types compile: `npx tsc --noEmit` passes with new tree types

### Tasks

- [ ] Create `src/core/data/tree.ts` — `StateEntry` discriminated union (`DirectoryEntry`, `JsonEntry<T>`, `JsonlEntry<T>`, `MarkdownEntry`), `ProjectState` type alias for `DirectoryEntry`
- [ ] Implement tree navigation helpers in `src/core/data/tree.ts`: `resolve(state, path)`, `getJson<T>(state, path)`, `getJsonl<T>(state, path)`, `getDir(state, path)`, `getMarkdown(state, path)`, `hasChild(state, dirPath, childName)`
- [ ] Implement `setEntry(state, path, entry)` — immutable setter that returns a new tree with the entry at the given path (used by the state machine's apply functions to build new state)
- [ ] Implement `ZERO_STATE` constant — `{ type: "directory", contents: {} }` representing an uninitialized project
- [ ] Write unit tests: resolve paths, get typed entries, hasChild on nested directories, setEntry produces new tree without mutating original, edge cases (empty path, missing intermediate directories, path to wrong type)

### Verification
`bun test tests/unit/data/tree.test.ts` passes. `npx tsc --noEmit` passes.

## Phase 2: Entity Schemas

All Zod schemas for entity types (epic, slice, quest, overview) and JSONL records (activity-log, decisions, learnings, architecture-deltas). Schema registry mapping path patterns to schemas.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/schemas/entities/epic.ts` — file not found
- [ ] `ls src/schemas/records/` — directory not found

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/schemas/` — all schema tests pass (valid and invalid fixtures for every entity and record type)
- [ ] `npx tsc --noEmit` passes

### Tasks

- [ ] Create `src/schemas/entities/epic.ts` — `epicSchema` + `Epic` type. Fields: name, status (EpicStatus enum), goal, verifications array, sliceSequence array, created, activated (nullable), updated
- [ ] Create `src/schemas/entities/slice.ts` — `sliceSchema` + `Slice` type. Fields: name, epic, status (SliceStatus enum), goal, deferred array, refinement (nullable object with round, maxRounds, scoreHistory), created, updated
- [ ] Create `src/schemas/entities/quest.ts` — `questSchema` + `Quest` type. Fields: name, status (QuestStatus enum), goal, refinement (nullable, same structure as slice), created, updated
- [ ] Create `src/schemas/entities/overview.ts` — `overviewSchema` + `Overview` type. Items array with name, status, created, completed (nullable)
- [ ] Create `src/schemas/records/activity-log.ts` — `activityEntrySchema` + `ActivityEntry` type. Fields: ts, phase, scope, status, summary, detail (optional)
- [ ] Create `src/schemas/records/decision.ts` — `decisionEntrySchema` + `DecisionEntry` type. Fields: id, status, domain, title, summary, date, supersededBy (nullable)
- [ ] Create `src/schemas/records/learning.ts` — `learningEntrySchema` + `LearningEntry` type. Fields: category, summary, detail, tags, source, rollup, rollupTo
- [ ] Create `src/schemas/records/architecture-delta.ts` — `architectureDeltaSchema` + `ArchitectureDelta` type. Fields: subsystem, type, description, ts
- [ ] Create `src/schemas/state-events.ts` — `StateEvent` discriminated union type (INIT_PROJECT only for this slice, but define the union structure so future slices extend it), `StateError` interface
- [ ] Create `src/core/data/schema-registry.ts` — array of `{ pattern: RegExp, schema: ZodSchema }` entries mapping path patterns to schemas. Export `findSchema(path)` function
- [ ] Create entity status enum schemas: `epicStatusSchema`, `sliceStatusSchema`, `questStatusSchema` — values matching transition-tables.md
- [ ] Write unit tests: valid/invalid fixtures for every schema, schema registry resolves correct schema for each entity path pattern, unknown paths return undefined

### Verification
`bun test tests/unit/schemas/` passes. Schema registry correctly maps `epics/*/epic.json` → epicSchema, `slices/*/slice.json` → sliceSchema, etc.

## Phase 3: assembleState & commitState

The I/O layer: reading the filesystem into a tree and writing a tree back to the filesystem.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run -e "import { assembleState } from './src/core/data/assemble'"` — module not found

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/data/assemble.test.ts` — all assembly tests pass
- [ ] `bun test tests/unit/data/commit.test.ts` — all commit tests pass

### Tasks

- [ ] Create `src/core/data/assemble.ts` — `assembleState(projectDir?)`: recursively walk `.project/`, build tree. For `.json` files: parse, look up schema via registry, validate, create `JsonEntry`. For `.jsonl` files: parse lines, validate each, create `JsonlEntry`. For `.md` files: read text, create `MarkdownEntry`. For directories: create `DirectoryEntry` with nested contents. Skip `.state-cache.json`, `node_modules`, and dotfiles other than `.project/`. Return `ZERO_STATE` if `.project/` doesn't exist.
- [ ] Create `src/core/data/commit.ts` — `commitState(projectDir, oldState, newState)`: recursive tree diff. New directory → `mkdirSync(recursive)`. New json → validate + deterministicStringify + atomic write (temp + rename). New jsonl → validate + deterministicStringify each entry + atomic write. Changed json → validate + write atomically. Changed jsonl → detect appended entries (compare lengths), append only new lines. Markdown entries → skip (read-only). Write ordering: JSON first, JSONL second.
- [ ] Add debug logging to assembleState and commitState — when `GOODPLAN_DEBUG=1`, log to stderr: files read, files written, directories created, validation results
- [ ] Update `resolveProjectDir()` in `src/core/data/project.ts` to work with the new tree model (it currently returns a path; assembleState uses it to find the root)
- [ ] Write unit tests for assembleState: fixture `.project/` with known files → tree matches expected structure, empty/missing `.project/` → ZERO_STATE, `.json` validation failure → error with path, `.jsonl` with invalid line → error with line number, markdown files read as text
- [ ] Write unit tests for commitState: new tree written to filesystem matches expected files, JSON has deterministic keys, JSONL append-only (add entries, verify file has additional lines not full rewrite), directories created for new entries, markdown entries skipped

### Verification
`bun test tests/unit/data/` passes. Create a fixture `.project/` directory, run assembleState, verify tree structure. Modify tree, run commitState, verify filesystem changes. Debug logging: `GOODPLAN_DEBUG=1 bun test` shows trace output on stderr.

## Phase 4: State Machine Scaffold + INIT_PROJECT

The `reduce()` function with just the INIT_PROJECT event. Pure functions, no I/O.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/state/` — directory not found

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/state/` — all state machine tests pass
- [ ] `grep -r "from.*fs" src/core/state/` — returns nothing (purity check)

### Tasks

- [ ] Create `src/core/state/reduce.ts` — `reduce(state: ProjectState, event: StateEvent): ProjectState | StateError`. Dispatch by `event.type`. For unknown event types, return `StateError` with `STATE_INVALID_TRANSITION`.
- [ ] Create `src/core/state/transitions/init.ts` — INIT_PROJECT handler. Guard: `project.json` must not exist in state tree (check via `hasChild`). Apply: produce new tree with `project.json` (name, version "1.0.0", null active pointers, timestamps), `epics/overview.json`, `slices/overview.json`, `quests/overview.json` (empty items arrays), `epics/`, `slices/`, `quests/` directory entries, `activity-log.jsonl` with init entry, `decisions.jsonl` (empty), `learnings.jsonl` (empty). Use `setEntry` to build the tree immutably.
- [ ] Export `StateEvent` and `StateError` types from `src/core/state/types.ts` (re-export from schemas)
- [ ] Write unit tests: INIT_PROJECT on ZERO_STATE → valid tree with all expected entries, INIT_PROJECT on existing project → StateError with STATE_ALREADY_INITIALIZED, reduce with unknown event type → STATE_INVALID_TRANSITION, purity check (same inputs → same output)

### Verification
`bun test tests/unit/state/` passes. `grep -r "from.*fs" src/core/state/` returns nothing. Calling `reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test" })` returns a complete initial project tree.

## Phase 5: Refactor Init & Wire Full Stack

Wire init command through RPC → reduce → commitState. Update status to read from tree. Binary regression.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Current `init` writes `project.json` directly — does not create overview.json files or collection directories

**After implementation** (should pass / show presence):
- [ ] `goodplan init --name test-project` in empty dir — creates .project/ with project.json, epics/overview.json, slices/overview.json, quests/overview.json, activity-log.jsonl, plus collection directories
- [ ] `goodplan init` in same dir — exit 3, STATE_ALREADY_INITIALIZED
- [ ] `goodplan status --json` — returns valid StatusResult
- [ ] `goodplan status --json --query '.project.name'` — returns `"test-project"`
- [ ] `cd /tmp/my-project && goodplan init` — name defaults to `"my-project"`
- [ ] `GOODPLAN_DIR=/tmp/alt goodplan init --name alt && GOODPLAN_DIR=/tmp/alt goodplan status --json` — works
- [ ] `bun run build && ./goodplan init --name binary-test && ./goodplan status --json` — compiled binary works

### Tasks

- [ ] Create `src/core/rpc/init.ts` — RPC function for init: call `assembleState()` (or construct ZERO_STATE if `.project/` doesn't exist), build INIT_PROJECT event, call `reduce()`, check for StateError, call `commitState()` with old and new state
- [ ] Refactor `src/commands/global/init.ts` — remove direct file writes, call RPC init function instead. Keep `--name` default (basename of cwd) and STATE_ALREADY_INITIALIZED check (check cwd/.project/ directly before assembleState, per tracer bullet learning)
- [ ] Update `src/commands/global/status.ts` — refactor `buildStatusResult()` to use `assembleState()` to read the state tree, then extract project info from the tree. This replaces the direct `readProject()` call.
- [ ] Remove `src/core/data/project.ts` functions that are now superseded (`readProject`/`writeProject`) — keep `resolveProjectDir()`. Update any remaining callers.
- [ ] Remove or update `src/core/data/json.ts` — `readEntity`/`writeEntity` are replaced by assembleState/commitState for the init flow. Keep `deterministicStringify` in `src/util/json.ts` (already moved there in tracer bullet). Remove the old functions if no callers remain; otherwise mark deprecated.
- [ ] Update all existing tests that used `readEntity`/`writeEntity`/`readProject`/`writeProject`
- [ ] Update `.project/conventions.md` repo structure section to match actual `src/` directory layout after this slice
- [ ] Run full test suite: `bun test` — all tests pass (including updated tests from tracer bullet)
- [ ] Run type check: `npx tsc --noEmit` — passes
- [ ] Run binary regression: `bun run build && ./goodplan init --name binary-test && ./goodplan status --json`

### Verification
1. `goodplan init --name my-project` in fresh temp dir — creates full `.project/` structure per architecture.
2. `goodplan status --json` — valid StatusResult from tree-based data layer.
3. `goodplan init` again — exit 3 with STATE_ALREADY_INITIALIZED.
4. `bun run build && ./goodplan init --name binary-test && ./goodplan status --json` — binary works.
5. `bun test` — all tests pass. `npx tsc --noEmit` — clean.
6. `GOODPLAN_DEBUG=1 goodplan init --name debug-test 2>/tmp/debug.txt && cat /tmp/debug.txt` — debug logging shows files created.
