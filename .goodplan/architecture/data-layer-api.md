# Data Layer API

## Purpose

All filesystem I/O for the CLI. Reads the `.project/` filesystem into a recursive state tree, caches it, and writes state changes back to the filesystem. The data layer is a thin serialization/deserialization boundary — it transforms between the filesystem and the in-memory `ProjectState` tree that the state machine operates on.

The project root is resolved from the `GOODPLAN_DIR` environment variable if set, otherwise by walking up from `cwd` looking for a `.project/` directory. All file paths within the Data Layer are relative to this root.

## Interface

Three core functions. Everything else is tree navigation on the in-memory `ProjectState`.

### assembleState

```typescript
function assembleState(projectDir?: string): ProjectState;
```

Recursively walks `.project/` and builds the `ProjectState` tree:
- Directories become `DirectoryEntry` nodes with nested `contents`
- `.json` files are parsed, validated against the schema registry, and stored as `JsonEntry<T>` with concrete typed content
- `.jsonl` files are parsed line-by-line, each line validated, and stored as `JsonlEntry<T>` arrays
- `.md` files are read as text and stored as `MarkdownEntry` with raw string content
- Other files (binary, config, etc.) are ignored — not part of the state tree

**Zero state**: If `.project/` doesn't exist or is empty, returns an empty tree: `{ type: "directory", contents: {} }`. This is not an error. The state machine's `INIT_PROJECT` event operates on this zero state to produce the initial project structure, which `commitState()` then materializes.

### loadState

```typescript
function loadState(projectDir?: string): ProjectState;
```

Reads the state cache (`.project/.state-cache.json`). If valid, recomputes directory `contents` keys (cheap `readdirSync` to detect LLM-written files that appeared since last cache) and returns. On cache miss or version mismatch, falls back to `assembleState()`.

### commitState

```typescript
function commitState(
  projectDir: string,
  oldState: ProjectState,
  newState: ProjectState
): void;
```

Performs a recursive tree diff between `oldState` and `newState`. For each difference:

1. **New directory in new tree** → `mkdirSync` (recursive)
2. **New json/jsonl file in new tree** → validate with schema registry, write atomically (temp + rename)
3. **Changed json file** → verify old matches on-disk (concurrent modification detection), validate new, write atomically
4. **Changed jsonl file** → detect appended entries (compare array lengths), append only new lines
5. **Unchanged entries** → skip
6. **Markdown entries** → never written by `commitState`. The LLM writes markdown directly to the filesystem. Markdown entries in the state tree are read-only.
7. **Removed entries** → generally no-op (abandoned entities kept for audit trail). Implementation can optionally support deletion with a flag.

Updates the state cache after all writes succeed. Write ordering: entity JSON files first, JSONL appends second, state cache last. If the process crashes mid-write, the state cache (written last) is stale, triggering a full `assembleState()` on next invocation which reconciles from the source-of-truth individual files.

### Markdown File I/O Helpers

```typescript
// Write markdown files to disk. Used by the RPC layer to write per-learning .md files
// after reduce() succeeds but before commitState(). Creates directories on-demand.
function writeMarkdownFiles(projectDir: string, files: Array<{path: string, content: string}>): void;

// Copy markdown files from one scope to another. Used by the RPC layer during
// learnings rollup to copy .md files from source to target scope.
function copyMarkdownFiles(projectDir: string, copies: Array<{from: string, to: string}>): void;
```

These helpers preserve the architectural boundary where all filesystem I/O flows through the Data Layer, even for CLI-managed markdown files like `learnings/*.md`.

### Tree Navigation Helpers

These operate on the in-memory `ProjectState` tree — no filesystem access.

```typescript
// Walk the tree by splitting path on "/"
function resolve(state: ProjectState, path: string): StateEntry | undefined;

// Typed narrowing
function getJson<T>(state: ProjectState, path: string): T | undefined;
function getJsonl<T>(state: ProjectState, path: string): T[] | undefined;
function getDir(state: ProjectState, path: string): DirectoryEntry | undefined;
function getMarkdown(state: ProjectState, path: string): string | undefined;

// Existence check — does a child exist in a directory?
function hasChild(state: ProjectState, dirPath: string, childName: string): boolean;
```

jqjs (already a project dependency) can also query the state tree directly for complex navigation, since it operates on parsed JavaScript objects. This is available for state machine guards and the `--query` CLI flag.

## Contracts

### Deterministic Key Ordering

All JSON output uses alphabetical key ordering. Enforced by `commitState()` — every JSON write sorts keys before serializing.

### Concurrent Modification Detection

`commitState()` verifies that on-disk content matches `oldState` before writing. For each changed JSON file, it reads the current on-disk file and compares against the corresponding entry in `oldState`. If they differ, another process or the user modified the file — throw `DATA_CONCURRENT_MODIFICATION` identifying the conflicting file. Recovery: `loadState()` to get fresh state and retry the operation.

For new files (present in `newState` but not `oldState`), skip verification — the file doesn't exist yet.

### Atomic Writes

Individual file writes are atomic (write to temp file, rename). The set of writes within a single `commitState` call is not transactional — if the process crashes mid-write, some files may be updated and others not. The state cache is written last; on cache miss, `assembleState()` rebuilds from individual files and reconciles.

### Schema Validation

- **Every read** (`assembleState`) validates against the schema registry. If validation fails, the error includes the file path and Zod error details.
- **Every write** (`commitState`) validates before writing — invalid data never reaches the filesystem.

### Schema Registry

Maps path patterns to Zod schemas for validation during assembly and commit:

```typescript
const schemaRegistry: Array<{ pattern: RegExp; schema: ZodSchema }> = [
  { pattern: /^project\.json$/, schema: projectSchema },
  { pattern: /^epics\/overview\.json$/, schema: epicOverviewSchema },
  { pattern: /^epics\/[^/]+\/epic\.json$/, schema: epicSchema },
  { pattern: /^epics\/[^/]+\/slices\/[^/]+\/slice\.json$/, schema: sliceSchema },
  { pattern: /^quests\/overview\.json$/, schema: overviewSchema },
  { pattern: /^quests\/[^/]+\/quest\.json$/, schema: questSchema },
  { pattern: /^tasks\/overview\.json$/, schema: overviewSchema },
  { pattern: /^tasks\/[^/]+\/task\.json$/, schema: taskSchema },
  { pattern: /^activity-log\.jsonl$/, schema: activityEntrySchema },
  { pattern: /^decisions\.jsonl$/, schema: decisionEntrySchema },
  { pattern: /^learnings\.jsonl$/, schema: learningEntrySchema },
  { pattern: /.*\/learnings\.jsonl$/, schema: learningEntrySchema },
  { pattern: /.*\/architecture-deltas\.jsonl$/, schema: architectureDeltaSchema },
];
```

Files not matching any pattern are either markdown (`.md` → `MarkdownEntry`) or ignored.

### No Business Logic

The Data Layer does not make decisions about state transitions, workflow rules, or content semantics. It reads, validates, serializes, diffs, and writes. All business logic lives in the State Machine (for transitions) or the RPC Layer (for orchestration).

### Filesystem as Materialized State

The state machine is the authority on what files and directories should exist in `.project/`. `commitState()` is the mechanism that makes the filesystem match the state machine's output. When the state machine adds a new directory entry (e.g., creating an epic adds `epics/<name>/` with subdirectories for architecture, research, brainstorm), `commitState()` creates all those directories. This eliminates ad-hoc `mkdir` calls in command handlers.

## Dependencies

- Zod schemas from `src/schemas/`
- Node.js `fs` module (via Bun runtime)
- jqjs is NOT a dependency of the Data Layer — query filtering happens at the Commands layer (though the state tree is jq-navigable)

## Fitness Functions

Priority: 2 (implement after State Machine — per _overview.md subsystem maturity)

### JSON round-trip produces deterministic output

- **Test file:** `tests/fitness/data-determinism.test.ts`
- **Verifies:** `assembleState()` → `commitState()` on an unchanged tree produces byte-identical files (deterministic key ordering preserved through read/write cycle)

### Schema validation rejects malformed data on read and write

- **Test file:** `tests/fitness/schema-validation.test.ts`
- **Verifies:** Manually corrupted JSON files cause `assembleState()` to throw with file path and Zod error details. State machine producing invalid content causes `commitState()` to throw before writing.

### Concurrent modification detection works

- **Test file:** `tests/fitness/concurrent-modification.test.ts`
- **Verifies:** Modify a file on disk between `loadState()` and `commitState()` — `commitState` throws `DATA_CONCURRENT_MODIFICATION` instead of overwriting

### Atomic writes survive interruption

- **Test file:** `tests/fitness/atomic-writes.test.ts`
- **Verifies:** A write that is interrupted leaves either the old file intact or the new file complete — never a partial write

### State assembly produces accurate tree from filesystem

- **Test file:** `tests/fitness/tree-accuracy.test.ts`
- **Verifies:** Create a `.project/` fixture with known files/directories. `assembleState()` produces a tree whose structure matches the filesystem. Add/remove a file and reassemble — tree updates correctly. Empty `.project/` produces zero state.
