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
  "status": "activated",
  "goal": "Build a compiled TypeScript CLI...",
  "verifications": [
    {
      "description": "CLI can create, list, and show epics, slices, and quests",
      "status": "pending",
      "addedDuring": "defining-slices",
      "modifiedDuring": null
    }
  ],
  "created": "2026-03-20T00:00:00Z",
  "activated": "2026-03-20T12:00:00Z",
  "updated": "2026-03-20T12:00:00Z"
}
```

### slice.json

Per-slice metadata. Located at `.project/epics/<epic>/slices/<name>/slice.json`.

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

### task.json

Per-task metadata. Located at `.project/tasks/<name>/task.json`. Tasks are lightweight capture items — a "junk drawer" for thoughts, bugs, and ideas noticed during work. They can be converted to quests or epics via `task:convert`.

```json
{
  "name": "fix-error-handling",
  "title": "Fix error handling in migrate.ts",
  "status": "open",
  "created": "2026-03-26T00:00:00Z",
  "context": {
    "activeSlice": "01-data-layer",
    "activeQuest": null,
    "activeEpic": "goodplan-cli",
    "gitBranch": "feat/migrate",
    "capturedDuring": "implementing slice 01-data-layer"
  },
  "description": "migrate.ts has wrong error codes for validation failures"
}
```

Fields: `name` (kebab-case identifier), `title` (human-readable), `status` (open/converted/dropped), `context` (structured snapshot of what the user was doing when captured), `description` (optional detail), `convertedTo` (set when converted: `{ type: "quest"|"epic", name: string }`), `droppedReason` (set when dropped). Terminal states: `converted` and `dropped`.

### overview.json

Index file per collection. Located at `.project/epics/overview.json`, `.project/quests/overview.json`, `.project/tasks/overview.json`. Slice overviews are embedded within `epics/overview.json` (no separate `slices/overview.json` file) — each epic's entry in `epics/overview.json` contains its `slices` array. Array order defines slice sequencing.

```json
{
  "items": [
    {
      "name": "01-data-layer",
      "status": "completed",
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

Exists at project level (`.project/learnings.jsonl`) and per-slice (`.project/epics/<epic>/slices/<name>/learnings.jsonl`).

```json
{"category": "domain", "summary": "Brief actionable statement", "file": "learnings/brief-actionable-statement.md", "tags": ["auth", "testing"], "source": "epics/goodplan-cli/slices/01-auth", "rollup": true, "rollupTo": ["epic", "project"]}
```

Stored fields: `file` is a scope-relative path to the `.md` file containing the learning detail (e.g., `learnings/<slug>.md`). The slug is derived from `summary` by the RPC layer (kebab-case, truncated at 60 chars on word boundaries, with collision detection via `Set<string>` from the state tree). `source` is populated by the RPC layer from the current entity scope when persisting. `rollup: true` is set when `rollupTo` is non-empty (backward-compatible boolean for simple filtering). `rollupTo` preserves the specific targets. The canonical input type (see rpc-layer-api.md `Learning`) uses `detail` (full text) — the RPC layer maps this to `file` by deriving a slug, writing the `.md` file, and storing the path.

### learnings/ directory

Per-learning `.md` files at every scope that has learnings. The CLI writes these — skills never write to `learnings/` directly. During rollup, the CLI copies `.md` files from the source scope to the target scope (e.g., `<slice>/learnings/<slug>.md` → `<project>/learnings/<slug>.md`).

```
.project/learnings/
├── schema-first-caught-3-bugs.md
└── api-rate-limits-at-100-rps.md
```

### architecture-deltas.jsonl

Per-slice record of architecture changes, at `.project/epics/<epic>/slices/<name>/architecture-deltas.jsonl`. Populated during `COMPLETE_SLICE` from the `architectureDelta` input. Used for audit trail and epic-level architecture reconciliation.

```json
{"subsystem": "auth", "type": "modify", "description": "Added OAuth2 token refresh flow", "ts": "2026-03-20T12:00:00Z"}
```

**Simplification note:** The design spec included `status` (proposed/approved/applied) and `rationale` fields for an approval workflow on architecture deltas. This was simplified to a flat audit trail record because the approval step is not needed — architecture deltas are recorded at slice completion time when the change has already been implemented. If an approval workflow is needed later, these fields can be added without breaking existing records.

### activity-log.jsonl

Append-only audit trail at `.project/activity-log.jsonl`.

```json
{"ts": "2026-03-20T12:00:00Z", "phase": "begin-plan", "scope": "epics/goodplan-cli/slices/01-data-layer", "status": "complete", "summary": "Plan created for data layer slice"}
```

## Unified State Object

The entire `.project/` filesystem is assembled into a single recursive in-memory tree. The state machine operates on this tree and returns a new version. The data layer diffs old vs new and materializes changes back to the filesystem — creating directories, writing new files, updating changed files.

### StateEntry — Discriminated Union

Every node in the state tree is a `StateEntry`, discriminated by `type`:

```typescript
type StateEntry =
  | DirectoryEntry
  | JsonEntry<unknown>
  | JsonlEntry<unknown>
  | MarkdownEntry;

// Directory node. `contents` maps child names to their entries — the keys
// ARE the file/directory listing (no separate `files` array needed).
// `assembleState()` populates by recursively scanning the filesystem.
// `commitState()` creates the directory if it doesn't exist.
interface DirectoryEntry {
  type: "directory";
  contents: Record<string, StateEntry>;
}

// JSON entity file. Content is a concrete Zod-inferred type.
// `commitState()` validates with the schema (looked up via schema registry),
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

// Markdown/text file. Content is the raw file text.
// Used for LLM-managed content (goals, plans, architecture docs, research).
// `assembleState()` reads the file contents into the state tree.
// The state machine treats these as read-only (never modifies markdown content).
// Context bundling in the RPC layer uses these directly — no separate
// filesystem read pass needed since the content is already in state.
// `commitState()` does NOT write markdown entries — the LLM writes these
// files directly to the filesystem. They appear in state for read access only.
interface MarkdownEntry {
  type: "markdown";
  content: string;
}
```

### ProjectState — Recursive Tree

The state object mirrors the `.project/` filesystem as a recursive tree rooted at a single `DirectoryEntry`. Navigation uses filesystem-style paths resolved by walking the tree.

```typescript
// The state is a single root directory entry representing .project/
type ProjectState = DirectoryEntry;

// Path resolution — walks the tree by splitting on "/"
function resolve(state: ProjectState, path: string): StateEntry | undefined;

// Typed accessors for common operations (unwrapped — return content directly)
function getJson<T>(state: ProjectState, path: string): T | undefined;
function getJsonl<T>(state: ProjectState, path: string): T[] | undefined;
function getDir(state: ProjectState, path: string): DirectoryEntry | undefined;
function getMarkdown(state: ProjectState, path: string): string | undefined;

// Guard helper — checks if a child exists in a directory's contents
function hasChild(state: ProjectState, dirPath: string, childName: string): boolean;
```

**jq-style navigation**: Since the state tree is a plain JavaScript object, the jqjs library (already a project dependency) can be used to query it. This is useful for complex guards and for the `--query` flag on `status`. Example: `.contents.epics.contents["goodplan-cli"].contents.slices.contents["01-data-layer"].contents["plan.md"]` would check if a plan exists. Path-based helpers are preferred for simple lookups; jq is available for complex queries.

Example state for a project with one epic and one slice:

```typescript
const state: ProjectState = {
  type: "directory",
  contents: {
    "project.json": {
      type: "json",
      content: { name: "my-project", version: "1.0.0", activeEpic: "goodplan-cli", activeSlice: "01-data-layer", activeQuest: null, created: "2026-03-20T00:00:00Z", updated: "2026-03-20T12:00:00Z" }
    },
    "activity-log.jsonl": { type: "jsonl", content: [{ ts: "...", phase: "init", scope: "project", status: "complete", summary: "..." }] },
    "decisions.jsonl": { type: "jsonl", content: [] },
    "learnings.jsonl": { type: "jsonl", content: [] },
    "idea.md": { type: "markdown", content: "# Project Idea\n\n..." },
    "conventions.md": { type: "markdown", content: "# Project Conventions\n\n..." },

    "architecture": {
      type: "directory",
      contents: {
        // Project-level current-reality architecture (LLM-managed)
      }
    },

    "epics": {
      type: "directory",
      contents: {
        "overview.json": { type: "json", content: { items: [{ name: "goodplan-cli", status: "activated", created: "...", completed: null }] } },
        "goodplan-cli": {
          type: "directory",
          contents: {
            "epic.json": { type: "json", content: { name: "goodplan-cli", status: "activated", goal: "...", verifications: [...], created: "...", activated: "...", updated: "..." } },
            "architecture": { type: "directory", contents: { "_overview.md": ..., "data-model.md": ... } },
            "research": { type: "directory", contents: {} },
            "brainstorm": { type: "directory", contents: {} },
            "prototypes": { type: "directory", contents: {} },
            "slices": {
              type: "directory",
              contents: {
                "01-data-layer": {
                  type: "directory",
                  contents: {
                    "slice.json": { type: "json", content: { name: "01-data-layer", status: "implementing", epic: "goodplan-cli", ... } },
                    "learnings.jsonl": { type: "jsonl", content: [] },
                    "architecture-deltas.jsonl": { type: "jsonl", content: [] },
                    // LLM-written files appear as entries when they exist on disk:
                    "plan.md": { type: "markdown", content: "# Plan: Data Layer\n\n..." },
                    "plan-refined.md": { type: "markdown", content: "..." },
                  }
                }
              }
            },
          }
        }
      }
    },

    "quests": {
      type: "directory",
      contents: {
        "overview.json": { type: "json", content: { items: [] } },
      }
    },
  }
};
```

**Markdown files in state**: Markdown files (idea.md, plan.md, architecture docs, research) use `{ type: "markdown", content: "..." }` with the full file text. `assembleState()` reads them into the tree, making their content available for state machine existence checks and for context bundling in the RPC layer (no separate filesystem read needed). The state machine treats markdown entries as read-only. `commitState()` does NOT write markdown entries — the LLM writes these files directly.

### State Machine Guards

Guards navigate the tree using `resolve()` and `hasChild()`:

```typescript
// Does plan.md exist in epics/goodplan-cli/slices/01-data-layer/?
hasChild(state, "epics/goodplan-cli/slices/01-data-layer", "plan.md")

// Does the epic have architecture content?
const archDir = getDir(state, "epics/goodplan-cli/architecture");
archDir !== undefined && Object.keys(archDir.contents).length > 0

// Get a specific entity (unwrapped — returns T directly)
const epic = getJson<Epic>(state, "epics/goodplan-cli/epic.json");
epic?.status === "activated"
```

### Schema Registry

`commitState()` needs to validate JSON entries before writing. A schema registry maps path patterns to Zod schemas. The path is derived by walking the tree and concatenating directory names — forward-slash-separated, no leading slash, rooted at `.project/` (e.g., `"epics/goodplan-cli/epic.json"`):

```typescript
const schemaRegistry: Array<{ pattern: RegExp; schema: ZodSchema }> = [
  { pattern: /^project\.json$/, schema: projectSchema },
  { pattern: /^epics\/overview\.json$/, schema: overviewSchema },
  { pattern: /^epics\/[^/]+\/epic\.json$/, schema: epicSchema },
  { pattern: /^epics\/[^/]+\/slices\/[^/]+\/slice\.json$/, schema: sliceSchema },
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

When `.project/` doesn't exist or contains no files, `assembleState()` returns an empty tree:

```typescript
const zeroState: ProjectState = { type: "directory", contents: {} };
```

This is a valid state — it represents "no project initialized." The state machine's `INIT_PROJECT` event operates on this zero state to produce the initial project structure (project.json, overview files for epics/quests/tasks, collection directories), which `commitState()` then materializes on the filesystem.

### Recursive Diff in commitState

`commitState()` performs a recursive tree diff between old and new state:

1. **New key in new tree** → create (directory: `mkdirSync`, file: validate + write)
2. **Key in both, content changed** → verify old matches on-disk (concurrent modification detection), then update
3. **Key in both, unchanged** → skip
4. **Key in old but not new** → no-op (abandoned entities kept for audit trail; optional deletion flag available)
5. **Recurse into directories** — diff `contents` recursively, building the filesystem path as we go

### State Cache

The assembled state is cached to `.project/.state-cache.json` (gitignored). On subsequent calls, the cache is read and directory `contents` keys are recomputed by scanning the filesystem (cheap `readdirSync` calls). This captures LLM-written files that appeared since the last cache write. The cache is purely an optimization — deleting it triggers a full reassembly from the source-of-truth individual files.

```
First call:    assemble from files → cache → reduce → commitState + update cache
Subsequent:    read cache → recompute dir contents → reduce → commitState + update cache
Cache miss:    fall back to full assembly
```

The cache is valid because the CLI is the only writer of JSON/JSONL state. The only external changes are LLM-written files within CLI-owned directories, which are captured by directory contents recomputation on every call.

**Cache versioning:** The cache includes a `cacheVersion` field set from the CLI's schema version. On read, if the cached version doesn't match the running CLI's version, the cache is discarded and a full reassembly is performed. This ensures schema changes after a CLI upgrade don't produce stale or incompatible cached state.

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
- Existence tracked via directory `contents` keys (e.g., `hasChild(state, "epics/my-epic/research", "topic.md")`)
- Not validated by schemas — content is free-form

### Directory Structure

```
.project/
├── .state-cache.json          # gitignored — assembled state cache
├── project.json
├── decisions.jsonl
├── learnings.jsonl
├── learnings/                 # per-learning .md files (CLI-managed)
│   └── <slug>.md
├── activity-log.jsonl
├── idea.md
├── conventions.md
├── architecture/              # current-reality (LLM-managed, CLI-owned root path)
├── epics/
│   ├── overview.json
│   └── <epic>/
│       ├── epic.json
│       ├── architecture/      # target architecture (LLM-managed, CLI-owned root path)
│       ├── research/          # LLM-managed, CLI-owned root path
│       ├── brainstorm/        # LLM-managed, CLI-owned root path
│       ├── prototypes/        # LLM-managed, CLI-owned root path
│       ├── learnings.jsonl
│       ├── learnings/         # per-learning .md files (CLI-managed)
│       │   └── <slug>.md
│       └── slices/
│           └── <name>/
│               ├── slice.json
│               ├── learnings.jsonl
│               ├── learnings/         # per-learning .md files (CLI-managed)
│               │   └── <slug>.md
│               ├── architecture-deltas.jsonl
│               ├── plan.md            # LLM-managed, CLI-owned path — written by sub-agent during planning
│               ├── plan-refining.md   # LLM-managed — working draft updated during each refinement round. The sub-agent creates plan-refining.md during refinement rounds. When scores pass threshold, the sub-agent writes plan-refined.md directly; the CLI does not rename files.
│               └── plan-refined.md    # LLM-managed — final refined plan written by sub-agent when scores pass
├── quests/
│   ├── overview.json
│   └── <name>/
│       ├── quest.json
│       ├── learnings.jsonl
│       ├── learnings/         # per-learning .md files (CLI-managed)
│       │   └── <slug>.md
│       ├── architecture-deltas.jsonl
│       ├── plan.md
│       ├── plan-refining.md
│       └── plan-refined.md
├── research/                  # project-level (curated from epics)
├── brainstorm/
└── prototypes/
```
