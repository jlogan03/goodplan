# Project Init — Full Stack

## What We're Building
Refactor `goodplan init` to go through the complete load→reduce→commit cycle, proving the recursive tree state model works end-to-end. This slice implements the core infrastructure that every subsequent slice depends on: the `ProjectState` recursive tree type (`DirectoryEntry`/`JsonEntry`/`JsonlEntry`/`MarkdownEntry`), `assembleState()` with zero-state support, `commitState()` with recursive tree diff and filesystem materialization, `loadState()` with cache, the state machine `reduce()` function with `INIT_PROJECT` event, and all Zod schemas for entity types (epic, slice, quest, overview) and JSONL records (activity-log, decisions, learnings, architecture-deltas).

## Behavior
1. `goodplan init --name my-project` calls assembleState() which returns zero state (empty tree) since .project/ doesn't exist.
2. RPC builds INIT_PROJECT event and calls reduce(zeroState, event).
3. State machine validates no project exists, produces new state tree with project.json, overview.json files for each collection, empty collection directories, and initial activity-log entry.
4. commitState() performs recursive tree diff — every entry is new — creates .project/ directory structure and writes all files with deterministic key ordering.
5. Subsequent `goodplan init` in same directory returns STATE_ALREADY_INITIALIZED (assembleState finds existing project.json).
6. `goodplan status --json` works against the initialized project (tracer bullet's status command reads from the new tree-based data layer).
7. loadState() caches the assembled state; second invocation reads from cache with directory contents recomputation.

## Success Criteria
- [ ] `goodplan init --name test-project` in empty directory — creates .project/ with project.json, epics/overview.json, slices/overview.json, quests/overview.json, activity-log.jsonl
- [ ] All created JSON files have deterministic alphabetical key ordering — write then read produces byte-identical output
- [ ] `goodplan init` in same directory — exit 3, STATE_ALREADY_INITIALIZED
- [ ] `goodplan status --json` after init — returns valid StatusResult from tree-based data layer
- [ ] `goodplan status --json --query '.project.name'` — returns `"test-project"` (jqjs still works)
- [ ] `GOODPLAN_DIR=/tmp/alt goodplan init --name alt && GOODPLAN_DIR=/tmp/alt goodplan status --json` — works against alternate directory
- [ ] .state-cache.json created after first loadState(); second loadState() reads from cache (verify by checking cache file exists + timestamps)
- [ ] Delete .state-cache.json, run status again — falls back to full assembleState()
- [ ] All entity schemas validate correctly — test with valid and invalid fixtures for epic.json, slice.json, quest.json, overview.json, all JSONL record types
- [ ] Binary regression: `bun run build && ./goodplan init --name binary-test && ./goodplan status --json` — compiled binary works with the full stack

## Verification
1. In a fresh temp directory: `goodplan init --name my-project` — verify .project/ structure matches architecture's directory layout (project.json + 3 overview.json + activity-log.jsonl + collection directories).
2. `cat .project/project.json | jq .` — valid JSON with expected fields.
3. `goodplan status --json` — returns StatusResult. `goodplan status` — human-readable output.
4. `goodplan init` again — exit 3 with structured error.
5. Compile binary: `bun run build && ./goodplan init --name binary-test && ./goodplan status --json` — full stack works in compiled binary.
6. Unit tests: `bun test` — all schema, tree, assembleState, commitState, loadState, and state machine tests pass.

## Scope Boundaries
**In scope:** ProjectState recursive tree types (StateEntry union, DirectoryEntry, JsonEntry, JsonlEntry, MarkdownEntry), tree navigation helpers (resolve, getJson, getJsonl, getDir, getMarkdown, hasChild), schema registry, assembleState() with zero-state and filesystem scanning, commitState() with recursive diff and directory creation, loadState() with .state-cache.json, concurrent modification detection in commitState, atomic writes, debug logging infrastructure (GOODPLAN_DEBUG), reduce() function scaffold with INIT_PROJECT event handler, all Zod entity schemas (project, epic, slice, quest, overview, activity-log entry, decision entry, learning entry, architecture-delta entry), refactored init command routing through RPC→state machine→data layer, reconcile .project/conventions.md repo structure with actual code. Also: `--name` default behavior (basename of cwd).
**Out of scope:** Entity lifecycle transitions beyond INIT_PROJECT (slice 03+), entity CRUD commands (slice 03+), context bundling (slice 05), full status (slice 06). The tracer bullet's status command continues to work but reads from the tree-based data layer.
