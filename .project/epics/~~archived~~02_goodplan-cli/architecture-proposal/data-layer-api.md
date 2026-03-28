# Data Layer API

## Purpose

All filesystem I/O for the CLI. Reads and writes JSON/JSONL files, assembles the unified state object, diffs and writes state changes, and handles content file reads for bundling. Consumed by the RPC Layer and the Commands Layer (for resource CRUD).

## Interface

### State Assembly

```typescript
function assembleState(): ProjectState;
```

Reads all JSON/JSONL files from `.project/`, computes `_derived` fields (file/directory existence checks), and returns the unified state object. Used on cache miss or first invocation.

```typescript
function loadState(): ProjectState;
```

Reads the state cache (`.project/.state-cache.json`). If valid, recomputes only `_derived` fields and returns. On cache miss or version mismatch, falls back to `assembleState()`.

```typescript
function commitState(oldState: ProjectState, newState: ProjectState): void;
```

Diffs `oldState` vs `newState` by key. For each changed key:
1. **Verify**: read the current on-disk file and compare against `oldState[key]`. If they differ, another process or the user modified the file — throw a `DATA_CONCURRENT_MODIFICATION` error identifying the conflicting file rather than silently overwriting.
2. **Write**: JSON files are written in full with deterministic key ordering. JSONL files detect new entries (appended by the reducer) and append only those lines.
3. `_derived` fields are ignored (never written).

Updates the state cache after all writes succeed.

### Entity CRUD

For resource commands that bypass the RPC layer:

```typescript
function readEntity<T>(path: string, schema: ZodSchema<T>): T;
function writeEntity<T>(path: string, data: T, schema: ZodSchema<T>, expected?: T): void;
function listEntities(collectionPath: string): OverviewEntity;
```

- `readEntity`: reads a JSON file, validates with Zod, returns typed data
- `writeEntity`: validates with Zod, writes with deterministic key ordering. If `expected` is provided, reads current on-disk content first and verifies it matches `expected` before writing — throws `DATA_CONCURRENT_MODIFICATION` if not.
- `listEntities`: reads the `overview.json` for a collection

### JSONL Operations

```typescript
function readRecords<T>(path: string, schema: ZodSchema<T>): T[];
function appendRecord<T>(path: string, record: T, schema: ZodSchema<T>): void;
```

- `readRecords`: reads all lines, parses and validates each
- `appendRecord`: validates, serializes with deterministic key ordering, appends one line

### Content File Operations

For context bundling (reading LLM-owned markdown) and derived field computation:

```typescript
function readContent(path: string): string;
function fileExists(path: string): boolean;
function listDirectory(path: string): string[];
function directoryExists(path: string): boolean;
function createDirectory(path: string): void;
```

- `readContent`: reads a file as a string (no schema validation). Throws if file does not exist — callers should use `fileExists` first if existence is uncertain.
- `fileExists`: cheap existence check. Used for `_derived` field computation and anywhere existence is a precondition.
- `listDirectory`: returns file paths within a directory
- `directoryExists` / `createDirectory`: for CLI-owned root path management

## Contracts

### Deterministic Key Ordering

All JSON output uses alphabetical key ordering. Enforced at the write level — every call to `writeEntity`, `appendRecord`, and `commitState` sorts keys before serializing.

### Concurrent Modification Detection

`commitState` and `writeEntity` (when `expected` is provided) verify that on-disk state matches the expected previous state before writing. If another process, the user, or the LLM modified a CLI-owned JSON file outside the normal flow, the write fails with a `DATA_CONCURRENT_MODIFICATION` error rather than silently overwriting. Recovery: reload state and retry the operation.

### Atomic Writes

Individual file writes are atomic (write to temp file, rename). The `commitState` function writes all changed files sequentially. The set of writes is not transactional — if the process crashes mid-write, some files may be updated and others not. The state cache is written last; on cache miss, full reassembly from individual files reconciles any partial writes.

### Schema Validation

- **Every read** validates against the expected Zod schema. If validation fails, the error includes the file path and the Zod error details.
- **Every write** validates before writing — invalid data never reaches the filesystem.

### No Business Logic

The Data Layer does not make decisions about state transitions, workflow rules, or content semantics. It reads, validates, writes, and diffs. All business logic lives in the State Machine (for transitions) or the RPC Layer (for orchestration).

## Dependencies

- Zod schemas from `src/schemas/`
- Node.js `fs` module (via Bun runtime)
- jqjs is NOT a dependency of the Data Layer — query filtering happens at the Commands layer

## Fitness Functions

### JSON round-trip produces deterministic output

- **Test file:** candidate — not yet written
- **Verifies:** Write a JSON entity, read it back, write again — the two written files are byte-identical (deterministic key ordering)

### Schema validation rejects malformed data on read and write

- **Test file:** candidate — not yet written
- **Verifies:** Feeding invalid data to `readEntity()` and `writeEntity()` both throw Zod validation errors with file path context

### Concurrent modification detection works

- **Test file:** candidate — not yet written
- **Verifies:** Modify a file on disk between `loadState()` and `commitState()` — `commitState` throws `DATA_CONCURRENT_MODIFICATION` instead of overwriting

### Atomic writes survive interruption

- **Test file:** candidate — not yet written
- **Verifies:** A write that is interrupted (e.g., process kill during `commitState()`) leaves either the old file intact or the new file complete — never a partial write

### State assembly includes accurate derived fields

- **Test file:** candidate — not yet written
- **Verifies:** Create a `.project/` fixture with known markdown files present/absent. `assembleState()` produces `_derived` fields that accurately reflect file existence. Add/remove a file and reassemble — derived fields update correctly
