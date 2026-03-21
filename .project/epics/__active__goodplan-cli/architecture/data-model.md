# Data Model

## Entities

### project.json

Project-level metadata and state. Single file at `.project/project.json`.

```json
{
  "version": "1.0.0",
  "name": "my-project",
  "activeEpic": "goodplan-cli",
  "activeSlice": "01-data-layer",
  "activeQuest": null,
  "created": "2026-03-20T00:00:00Z",
  "updated": "2026-03-20T12:00:00Z"
}
```

### epic.json

Per-epic metadata. Located at `.project/epics/<name>/epic.json`.

```json
{
  "name": "goodplan-cli",
  "status": "executing",
  "goal": "Build a compiled TypeScript CLI...",
  "verifications": [
    {
      "description": "CLI can create, list, and show epics, slices, and quests",
      "status": "pending",
      "addedDuring": "slicing",
      "modifiedDuring": null
    }
  ],
  "sliceSequence": ["01-data-layer", "02-state-machine", "03-rpc", "04-commands"],
  "created": "2026-03-20T00:00:00Z",
  "activated": "2026-03-20T12:00:00Z",
  "updated": "2026-03-20T12:00:00Z"
}
```

### slice.json

Per-slice metadata. Located at `.project/slices/<name>/slice.json`.

```json
{
  "name": "01-data-layer",
  "epic": "goodplan-cli",
  "status": "implementing",
  "goal": "Implement filesystem I/O layer with Zod validation and deterministic JSON",
  "deferred": [],
  "refinement": {
    "round": 2,
    "maxRounds": 10,
    "scoreHistory": [
      { "round": 1, "scores": { "correctness": 7, "completeness": 8 } },
      { "round": 2, "scores": { "correctness": 9, "completeness": 9 } }
    ]
  },
  "created": "2026-03-20T00:00:00Z",
  "updated": "2026-03-20T12:00:00Z"
}
```

The `refinement` field is populated when the slice enters a refining state. `maxRounds` is the circuit breaker limit — the state machine rejects `COMPLETE_REFINEMENT_ROUND` if `round >= maxRounds` (the orchestrator must use `--override` or abandon). `scoreHistory` records each round's scores for trend detection. The field is `null` or absent when refinement has not started.

### quest.json

Per-quest metadata. Located at `.project/quests/<name>/quest.json`. Quests are project-scoped, not epic-scoped — they have no parent epic and therefore carry no `epic` field (unlike `slice.json`).

```json
{
  "name": "fix-logging",
  "status": "planning",
  "goal": "Fix structured logging to include correlation IDs",
  "refinement": {
    "round": 1,
    "maxRounds": 10,
    "scoreHistory": [
      { "round": 1, "scores": { "correctness": 7, "completeness": 8 } }
    ]
  },
  "created": "2026-03-20T00:00:00Z",
  "updated": "2026-03-20T12:00:00Z"
}
```

The `refinement` field in `quest.json` has the same structure and semantics as in `slice.json`. It is populated when the quest enters a refining state, tracks round counts and score history for the circuit breaker, and is `null` or absent when refinement has not started.

### overview.json

Index file per collection. Located at `.project/epics/overview.json`, `.project/slices/overview.json`, `.project/quests/overview.json`.

```json
{
  "items": [
    {
      "name": "01-data-layer",
      "status": "complete",
      "created": "2026-03-20T00:00:00Z",
      "completed": "2026-03-21T00:00:00Z"
    },
    {
      "name": "02-state-machine",
      "status": "implementing",
      "created": "2026-03-20T00:00:00Z",
      "completed": null
    }
  ]
}
```

**Goal storage**: Goals are stored as string fields within entity JSON files (`epic.json`, `slice.json`, `quest.json`), not as separate `goal.md` markdown files. This keeps goals co-located with entity metadata and avoids a separate file for what is typically a single sentence or short paragraph.

## JSONL Records

### decisions.jsonl

Project-level decisions. One JSON object per line.

```json
{"id": "2026-03-20-layered-architecture", "status": "active", "domain": "architecture", "title": "Four-Layer Unidirectional Architecture", "summary": "Commands → RPC → State Machine + Data Layer", "date": "2026-03-20", "supersededBy": null}
```

### learnings.jsonl

Exists at project level (`.project/learnings.jsonl`) and per-slice (`.project/slices/<name>/learnings.jsonl`).

```json
{"category": "domain", "summary": "Brief actionable statement", "detail": "Longer explanation", "tags": ["auth", "testing"], "source": "slices/01-auth", "rollup": true, "rollupTo": ["epic", "project"]}
```

Stored fields: `source` is populated by the RPC layer from the current entity scope when persisting. `rollup: true` is set when `rollupTo` is non-empty (backward-compatible boolean for simple filtering). `rollupTo` preserves the specific targets. The canonical input type (see rpc-layer-api.md `Learning`) omits `source` — it's added during persistence.

### architecture-deltas.jsonl

Per-slice record of architecture changes, at `.project/slices/<name>/architecture-deltas.jsonl`. Populated during `COMPLETE_SLICE` from the `architectureDelta` input. Used for audit trail and epic-level architecture reconciliation.

```json
{"subsystem": "auth", "type": "modify", "description": "Added OAuth2 token refresh flow", "ts": "2026-03-20T12:00:00Z"}
```

**Simplification note:** The design spec included `status` (proposed/approved/applied) and `rationale` fields for an approval workflow on architecture deltas. This was simplified to a flat audit trail record because the approval step is not needed — architecture deltas are recorded at slice completion time when the change has already been implemented. If an approval workflow is needed later, these fields can be added without breaking existing records.

### activity-log.jsonl

Append-only audit trail at `.project/activity-log.jsonl`.

```json
{"ts": "2026-03-20T12:00:00Z", "phase": "begin-plan", "scope": "slices/01-data-layer", "status": "complete", "summary": "Plan created for data layer slice"}
```

## Unified State Object

All filesystem entries within `.project/` are assembled into a single in-memory state object. The state machine operates on this unified object and returns a new version. The data layer diffs old vs new and materializes changes back to the filesystem — creating directories, writing new files, updating changed files.

### StateEntry — Discriminated Union

Every entry in the state object is a `StateEntry`, discriminated by `type`:

```typescript
type StateEntry =
  | DirectoryEntry
  | JsonEntry<unknown>
  | JsonlEntry<unknown>;

// Directory that should exist on the filesystem.
// `files` lists the directory's known contents (filenames, not full paths).
// Used by state machine guards for existence checks (replaces _derived booleans).
// `assembleState()` populates `files` by scanning the directory.
// `commitState()` creates the directory if it doesn't exist.
interface DirectoryEntry {
  type: "directory";
  files: string[];  // e.g., ["plan.md", "plan-refined.md", "slice.json"]
}

// JSON entity file. Content is a concrete Zod-inferred type.
// `commitState()` validates with the schema (looked up by path pattern),
// serializes with deterministic key ordering, writes atomically.
interface JsonEntry<T> {
  type: "json";
  content: T;
}

// JSONL append-only record file. Content is an array of concrete typed records.
// `commitState()` detects new entries (appended by the reducer) and appends
// only those lines — does not rewrite the file.
interface JsonlEntry<T> {
  type: "jsonl";
  content: T[];
}
```

### ProjectState

The state object is a `Record<string, StateEntry>` keyed by relative path within `.project/`. The state machine and data layer use typed accessors for known paths.

```typescript
// The runtime type — a dynamic map of path → StateEntry.
// assembleState() discovers all entries; the state machine adds new ones.
type ProjectState = Record<string, StateEntry>;

// Typed accessors for known paths (compile-time safety for state machine code).
// These are helper functions, not part of the ProjectState type itself.
function getJson<T>(state: ProjectState, path: string, schema: ZodSchema<T>): T;
function getJsonl<T>(state: ProjectState, path: string, schema: ZodSchema<T>): T[];
function getDir(state: ProjectState, path: string): DirectoryEntry;
function dirHasFile(state: ProjectState, dirPath: string, filename: string): boolean;
```

Example state for a project with one epic and one slice:

```typescript
const state: ProjectState = {
  // Root directory
  ".":                           { type: "directory", files: ["project.json", "activity-log.jsonl", "decisions.jsonl", "learnings.jsonl", "idea.md", "conventions.md"] },

  // Fixed JSON entities
  "project.json":                { type: "json", content: { name: "my-project", version: "1.0.0", activeEpic: "goodplan-cli", ... } },

  // JSONL records
  "activity-log.jsonl":          { type: "jsonl", content: [{ ts: "...", phase: "init", ... }] },
  "decisions.jsonl":             { type: "jsonl", content: [] },
  "learnings.jsonl":             { type: "jsonl", content: [] },

  // Epic collection
  "epics":                       { type: "directory", files: ["overview.json", "goodplan-cli"] },
  "epics/overview.json":         { type: "json", content: { items: [{ name: "goodplan-cli", status: "executing", ... }] } },
  "epics/goodplan-cli":          { type: "directory", files: ["epic.json", "architecture", "research", "brainstorm"] },
  "epics/goodplan-cli/epic.json": { type: "json", content: { name: "goodplan-cli", status: "executing", ... } },
  "epics/goodplan-cli/architecture": { type: "directory", files: ["_overview.md", "data-model.md", ...] },
  "epics/goodplan-cli/research": { type: "directory", files: [] },
  "epics/goodplan-cli/brainstorm": { type: "directory", files: [] },

  // Slice collection
  "slices":                      { type: "directory", files: ["overview.json", "01-data-layer"] },
  "slices/overview.json":        { type: "json", content: { items: [...] } },
  "slices/01-data-layer":        { type: "directory", files: ["slice.json", "plan.md", "plan-refined.md", "learnings.jsonl"] },
  "slices/01-data-layer/slice.json": { type: "json", content: { name: "01-data-layer", status: "implementing", ... } },
  "slices/01-data-layer/learnings.jsonl": { type: "jsonl", content: [] },

  // Quest collection (empty)
  "quests":                      { type: "directory", files: ["overview.json"] },
  "quests/overview.json":        { type: "json", content: { items: [] } },
};
```

### State Machine Guards (replaces _derived)

The old `_derived` map of booleans is replaced by directory `files` arrays. Guards use `dirHasFile()`:

```typescript
// Old: state._derived["slices/01-data-layer/planExists"]
// New: dirHasFile(state, "slices/01-data-layer", "plan.md")

// Old: state._derived["epics/goodplan-cli/architectureExists"]
// New: dirHasFile(state, "epics/goodplan-cli/architecture", "_overview.md")

// Old: state._derived["slices/01-data-layer/planContentProvided"]
// New: dirHasFile(state, "slices/01-data-layer", "plan.md")
```

This is cleaner: no separate `_derived` namespace, no boolean fields to maintain. Directory entries are populated by `assembleState()` scanning the filesystem, and recomputed on cache load (cheap `readdirSync` calls).

### Schema Registry

`commitState()` needs to validate JSON entries before writing. A schema registry maps path patterns to Zod schemas:

```typescript
const schemaRegistry: Array<{ pattern: RegExp; schema: ZodSchema }> = [
  { pattern: /^project\.json$/, schema: projectSchema },
  { pattern: /^epics\/overview\.json$/, schema: overviewSchema },
  { pattern: /^epics\/[^/]+\/epic\.json$/, schema: epicSchema },
  { pattern: /^slices\/overview\.json$/, schema: overviewSchema },
  { pattern: /^slices\/[^/]+\/slice\.json$/, schema: sliceSchema },
  { pattern: /^quests\/overview\.json$/, schema: overviewSchema },
  { pattern: /^quests\/[^/]+\/quest\.json$/, schema: questSchema },
  { pattern: /^activity-log\.jsonl$/, schema: activityEntrySchema },
  { pattern: /^decisions\.jsonl$/, schema: decisionEntrySchema },
  { pattern: /^learnings\.jsonl$/, schema: learningEntrySchema },
  { pattern: /.*\/learnings\.jsonl$/, schema: learningEntrySchema },
  { pattern: /.*\/architecture-deltas\.jsonl$/, schema: architectureDeltaSchema },
];
```

### Zero State

When `.project/` doesn't exist or contains no files, `assembleState()` returns an empty `ProjectState` (`{}`). This is a valid state — it represents "no project initialized." The state machine's `INIT_PROJECT` event operates on this zero state to produce the initial project structure, which `commitState()` then materializes.

### State Cache

The assembled state is cached to `.project/.state-cache.json` (gitignored). On subsequent calls, the cache is read and directory `files` arrays are recomputed (cheap `readdirSync` calls replacing the old `_derived` boolean recomputation). The cache is purely an optimization — deleting it triggers a full reassembly from the source-of-truth individual files.

```
First call:    assemble from files → cache → reduce → commitState + update cache
Subsequent:    read cache → recompute dir files → reduce → commitState + update cache
Cache miss:    fall back to full assembly
```

The cache is valid because the CLI is the only writer of JSON/JSONL state. The only external changes are LLM-written files within CLI-owned directories, which are captured by directory `files` recomputation on every call.

## Storage

### JSON Files

- Distributed across `.project/` directory structure
- Assembled into unified state object for state machine processing
- Written back atomically by the Data Layer (only changed files)
- Deterministic key ordering (alphabetical) for git merge friendliness
- Validated by Zod schemas on every read and write

### JSONL Files

- Append-only (new records added to end of file)
- Included in unified state object as arrays — reducer can append entries
- Data Layer detects new entries and appends them to the JSONL file (does not rewrite)
- Merge-friendly across git branches (each line is independent)
- Individual records validated by Zod schemas

### Free-Form Markdown

- Root directories created by `commitState()` when the state machine produces them (e.g., `CREATE_EPIC` adds `epics/<name>/research/` as a `DirectoryEntry`)
- Internal structure owned by the LLM — the CLI doesn't write markdown content
- Read by the CLI for context bundling
- Existence tracked in directory `files` arrays (e.g., `dirHasFile(state, "epics/my-epic/research", "topic.md")`)
- Not validated by schemas — content is free-form

### Directory Structure

```
.project/
├── .state-cache.json          # gitignored — assembled state cache
├── project.json
├── decisions.jsonl
├── learnings.jsonl
├── activity-log.jsonl
├── idea.md
├── conventions.md
├── architecture/              # current-reality (LLM-managed, CLI-owned root path)
├── epics/
│   ├── overview.json
│   └── <name>/
│       ├── epic.json
│       ├── architecture/      # target architecture (LLM-managed, CLI-owned root path)
│       ├── research/          # LLM-managed, CLI-owned root path
│       ├── brainstorm/        # LLM-managed, CLI-owned root path
│       └── prototypes/        # LLM-managed, CLI-owned root path
├── slices/
│   ├── overview.json
│   └── <name>/
│       ├── slice.json
│       ├── learnings.jsonl
│       ├── architecture-deltas.jsonl
│       ├── plan.md            # LLM-managed, CLI-owned path
│       ├── plan-refining.md   # LLM-managed — written during refinement rounds
│       └── plan-refined.md    # LLM-managed — final refined plan
├── quests/
│   ├── overview.json
│   └── <name>/
│       ├── quest.json
│       ├── learnings.jsonl
│       ├── architecture-deltas.jsonl
│       ├── plan.md
│       ├── plan-refining.md
│       └── plan-refined.md
├── research/                  # project-level (curated from epics)
├── brainstorm/
└── prototypes/
```
