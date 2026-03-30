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
  "deferred": [],
  "created": "2026-03-20T00:00:00Z",
  "updated": "2026-03-20T12:00:00Z"
}
```

### quest.json

Per-quest metadata. Located at `.project/quests/<name>/quest.json`.

```json
{
  "name": "fix-logging",
  "status": "planning",
  "created": "2026-03-20T00:00:00Z",
  "updated": "2026-03-20T12:00:00Z"
}
```

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

## JSONL Records

### decisions.jsonl

Project-level decisions. One JSON object per line.

```json
{"id": "2026-03-20-layered-architecture", "status": "active", "domain": "architecture", "title": "Four-Layer Unidirectional Architecture", "summary": "Commands → RPC → State Machine + Data Layer", "date": "2026-03-20", "supersededBy": null}
```

### learnings.jsonl

Exists at project level (`.project/learnings.jsonl`) and per-slice (`.project/slices/<name>/learnings.jsonl`).

```json
{"category": "domain", "summary": "Brief actionable statement", "detail": "Longer explanation", "tags": ["auth", "testing"], "source": "slices/01-auth", "rollup": true}
```

### activity-log.jsonl

Append-only audit trail at `.project/activity-log.jsonl`.

```json
{"ts": "2026-03-20T12:00:00Z", "phase": "begin-plan", "scope": "slices/01-data-layer", "status": "complete", "summary": "Plan created for data layer slice"}
```

## Unified State Object

All JSON entity files are assembled into a single in-memory state object for the state machine. The state machine operates on this unified object and returns a new version. The data layer diffs old vs new and writes only changed files back to disk.

### Structure

```typescript
interface ProjectState {
  // Keyed by relative file path within .project/
  "project.json": ProjectEntity;
  "epics/overview.json": OverviewEntity;
  "epics/goodplan-cli/epic.json": EpicEntity;
  "slices/overview.json": OverviewEntity;
  "slices/01-data-layer/slice.json": SliceEntity;
  "quests/overview.json": OverviewEntity;
  // ... all entity JSON files

  // JSONL records (append-only — reducer can add entries, never remove)
  "activity-log.jsonl": ActivityEntry[];
  "decisions.jsonl": DecisionEntry[];
  "learnings.jsonl": LearningEntry[];
  "slices/01-data-layer/learnings.jsonl": LearningEntry[];

  // Derived from filesystem (read-only, not written back)
  _derived: {
    "slices/01-data-layer/planExists": boolean;
    "epics/goodplan-cli/architectureExists": boolean;
    // ... file/directory existence checks
  };
}
```

### State Cache

The assembled state is cached to `.project/.state-cache.json` (gitignored). On subsequent calls, the cache is read and only `_derived` fields are recomputed (cheap `fs.existsSync` checks). The cache is purely an optimization — deleting it triggers a full reassembly from the source-of-truth individual files.

```
First call:    assemble from files → compute derived → cache → reduce → write changes + update cache
Subsequent:    read cache → recompute derived → reduce → write changes + update cache
Cache miss:    fall back to full assembly
```

The cache is valid because the CLI is the only writer of JSON state. The only external changes are LLM-written files, which only affect `_derived` fields that are recomputed on every call.

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

- Root directories created by the CLI, internal structure owned by the LLM
- Read by the CLI for context bundling
- Existence tracked in `_derived` fields of the unified state object
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
│       └── plan.md            # LLM-managed, CLI-owned path
├── quests/
│   ├── overview.json
│   └── <name>/
│       ├── quest.json
│       ├── learnings.jsonl
│       └── plan.md
├── research/                  # project-level (curated from epics)
├── brainstorm/
└── prototypes/
```
