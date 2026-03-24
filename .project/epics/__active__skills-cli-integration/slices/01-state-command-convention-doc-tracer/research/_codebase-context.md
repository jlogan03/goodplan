# Codebase Context for Slice 01: State Command, Convention Doc & Tracer Bullet

## 1. Documentation Freshness

All architecture docs and code files were last committed within the past 48 hours (as of 2026-03-23). No staleness concerns.

| Path | Last committed |
|---|---|
| `.project/architecture/_overview.md` | 2026-03-23 13:59 |
| `.project/architecture/commands-api.md` | 2026-03-23 13:59 |
| `.project/architecture/data-model.md` | 2026-03-23 13:59 |
| `src/commands/global/status.ts` | 2026-03-23 00:13 |
| `src/commands/global/schema.ts` | 2026-03-23 00:13 |
| `src/commands/main.ts` | 2026-03-23 00:13 |
| `src/core/data/assemble.ts` | 2026-03-22 13:34 |
| `src/core/tree.ts` | 2026-03-22 02:50 |
| `src/util/output.ts` | 2026-03-23 00:13 |
| `src/util/query.ts` | 2026-03-23 00:13 |
| `src/index.ts` | 2026-03-21 11:42 |
| `skills/project-status/SKILL.md` | 2026-03-23 09:26 |

## 2. Key Code Patterns for the State Command

### 2.1 Command registration (3-step process)

**Step 1: Define the command** (`src/commands/global/status.ts` as pattern):
```typescript
export const statusCommand = defineCommand({
    meta: { name: "status", description: "..." },
    args: { ...globalArgs },
    setup() {},
    async run({ args }) { /* ... */ },
});
```

**Step 2: Register in schema registry** (`src/commands/global/schema.ts`):
```typescript
registerCommand("status", "Show current project status", {
    ...globalArgDefs,
});
```

**Step 3: Add to subCommands map** (`src/commands/main.ts`):
```typescript
import { statusCommand } from "./global/status.js";
// ...
subCommands: {
    status: statusCommand,
    // ...
}
```

All three must stay in sync. A drift-detection test exists in `tests/fitness/schema-output-accuracy.test.ts`.

### 2.2 State tree types (`src/core/tree.ts`)

```typescript
export type StateEntry = DirectoryEntry | JsonEntry<unknown> | JsonlEntry<unknown> | MarkdownEntry;
export type ProjectState = DirectoryEntry;

// DirectoryEntry: { type: "directory", contents: Record<string, StateEntry> }
// JsonEntry<T>:   { type: "json", content: T }
// JsonlEntry<T>:  { type: "jsonl", content: T[] }
// MarkdownEntry:  { type: "markdown", content: string }
```

The plan's `serializeStateTree()` function must strip `type` wrappers:
- `DirectoryEntry` -> plain object (keys = child names, values = serialized children)
- `JsonEntry<T>` -> `T` directly
- `JsonlEntry<T>` -> `T[]` directly
- `MarkdownEntry` -> `true` (default) or raw string (`--inline`)

### 2.3 assembleState (`src/core/data/assemble.ts`)

```typescript
export function assembleState(projectDir?: string): ProjectState
```

- Returns `ZERO_STATE` if `projectDir` is undefined or doesn't exist
- Walks `.project/` directory recursively
- Validates JSON/JSONL against schema registry; skips unregistered files
- Throws `DATA_VALIDATION_ERROR` if any validation fails
- Skips `.state-cache.json` and `node_modules`
- Markdown files are always read (no schema validation)

### 2.4 output function (`src/util/output.ts`)

```typescript
export function output(data: unknown, args: OutputArgs): void
```

Where `OutputArgs = { json?: boolean; quiet?: boolean; query?: string }`.

Precedence: `--query` > `--quiet` > `--json` > plain text.

When `--query` is present, `output()` calls `applyQuery(data, args.query)` internally, then writes the result as deterministic JSON. This means the state command cannot apply `--offset`/`--limit` between query and output using `output()` as-is.

**Key implication for the plan:** The plan says to apply pagination "BETWEEN query and final output." Since `output()` couples query application and JSON serialization, the state command must either:
1. Call `applyQuery()` manually, apply pagination, then write directly to stdout
2. Extend `output()` with pagination support

Option 1 is simpler and avoids changing the shared utility.

### 2.5 applyQuery (`src/util/query.ts`)

```typescript
export function applyQuery(data: unknown, expr: string): unknown
```

- Uses `@michaelhomer/jqjs` (compiled jq)
- 0 results -> `null`, 1 result -> value, multiple results -> array
- Throws `VALIDATION_INVALID_QUERY` on invalid expressions or execution errors

### 2.6 globalArgs (`src/commands/global-args.ts`)

```typescript
export const globalArgs = {
    json:    { type: "boolean", default: false },
    quiet:   { type: "boolean", default: false },
    query:   { type: "string", required: false },
    verbose: { type: "boolean", default: false },
}
```

`parseInlineBudget(value)` is already defined here for `--inline` flag parsing:
- `undefined` -> `undefined` (absent)
- `"true"` or `""` -> `true` (bare --inline)
- numeric string -> `number` (explicit budget)

The state command only needs the boolean toggle in this slice.

### 2.7 --version handler (`src/index.ts`, lines 60-63)

```typescript
if (rawArgs.includes("--version")) {
    process.stdout.write("goodplan 0.0.1\n");
    return;
}
```

Currently outputs plain text only; ignores `--json`. The plan adds a `rawArgs.includes("--json")` check to output `{ "version": "0.0.1" }`.

### 2.8 deterministicStringify (`src/util/json.ts`)

```typescript
export function deterministicStringify(data: unknown): string
// JSON.stringify with alphabetically sorted keys, tab indentation
```

Also `deterministicStringifyCompact` for JSONL (no indentation).

## 3. Discrepancies Between Plan Assumptions and Actual Code

### 3.1 Pagination vs output() coupling

The plan says: "After `output()` applies `--query`, apply `--offset`/`--limit` if the result is an array." But `output()` writes directly to stdout after applying query -- there is no intermediate result to paginate.

**Resolution:** The plan's own task description acknowledges this: "this requires applying pagination BETWEEN query and final output. Either extend `output()` or apply pagination manually before calling `output()`." Manual approach is recommended.

### 3.2 `resolveProjectDir()` usage

The plan says the state command calls `resolveProjectDir()`. The `status.ts` pattern does this:
```typescript
const dir = projectDir ?? resolveProjectDir();
const state = assembleState(dir);
```

`resolveProjectDir()` (in `src/core/data/project.ts`) checks `GOODPLAN_DIR` env var, then looks for `.project/` in cwd. This is the correct approach for the state command.

### 3.3 No `src/core/data/serialize.ts` exists yet

The plan creates this file. No existing serialization logic for state trees exists -- this is net new code.

### 3.4 Epic architecture vs top-level architecture alignment

The epic architecture (`cli-changes.md`) describes markdown serialization as "raw JSON string" -- which is the `--inline` behavior. The default (no `--inline`) serializes as `true`. Both behaviors are clearly specified in the plan. The decision document at `.project/decisions/2026-03-23-state-command-markdown-exclusion.md` covers this.

## 4. Existing Test Patterns

### Unit tests (`tests/unit/commands/status.test.ts`)

- Uses temp directories with `fs.mkdtempSync`
- Creates minimal `.project/` fixtures with `project.json`
- Imports and calls `buildStatusResult()` directly (no binary spawn)
- Uses `deterministicStringify` for writing fixture JSON
- Tests both the data function and human formatting

### Integration tests (`tests/integration/`)

- Uses `withFixture(fixtureName, callback)` helper that copies fixture dirs to temp
- Spawns compiled binary via `runCommand(binPath, args, { env })`
- Sets `GOODPLAN_DIR` env var to isolate from repo's own `.project/`
- Parses stdout as JSON when `--json` flag is present
- Binary path: `tests/../../goodplan` (project root)
- Fixtures live in `tests/fixtures/`

### Fitness tests (`tests/fitness/`)

- Verify architectural invariants (INV-001 through INV-007)
- `schema-output-accuracy.test.ts` checks registry-to-command drift

## 5. Shared Skill References

Existing references in `skills/_shared/references/`:

| File | Purpose |
|---|---|
| `codebase-context-discovery.md` | Context discovery patterns |
| `decisions-format.md` | Decisions format |
| `epic-conventions.md` | Epic state machine, directory conventions |
| `iteration-loop.md` | Implementation iteration loop |
| `maturity-conventions.md` | Architecture maturity levels |
| `reviewers-cross-cutting.md` | Cross-cutting review concerns |
| `state-and-activity-formats.md` | state.md and activity-log format |
| `project-health-format.md` | Project health reporting |
| `expertise-tracking.md` | Expertise tracking |
| `dependency-research.md` | Dependency research format |
| `team-defaults.md` | Team defaults |

The plan creates `cli-interaction.md` here. Note that `state-and-activity-formats.md` will become partially obsolete (state.md is eliminated by the convention doc).

## 6. Project-Status Skill: Current Direct File Access

The current `skills/project-status/SKILL.md` makes these direct file accesses that Phase 3 must replace:

1. `ls .project/` -- check for project existence
2. `Read .project/state.md` -- current phase, active slice, work stack, next step
3. `tail -5 .project/activity-log.jsonl` -- recent activity
4. `ls -d .project/epics/__active__*/` -- active epic detection
5. `ls <scope-path>/implementation/` -- implementation progress
6. `grep -il "READY FOR IMPLEMENTATION"` -- review status
7. `ls .project/slices/*/interrupted.md` -- interrupted work detection
8. Write `state.md` -- state writeback
9. `echo >> .project/activity-log.jsonl` -- activity logging

After Phase 3, these become CLI commands (`status --json`, `state --json --query`, etc.) or are eliminated entirely (state.md writes, activity-log appends).

## 7. Files to Create or Modify

### New files
- `src/core/data/serialize.ts` -- serializeStateTree function
- `src/commands/global/state.ts` -- state command
- `skills/_shared/references/cli-interaction.md` -- convention doc
- `tests/unit/commands/state.test.ts` -- unit tests
- `tests/integration/state.test.ts` -- integration tests

### Modified files
- `src/commands/main.ts` -- add state to subCommands
- `src/commands/global/schema.ts` -- register state command metadata
- `src/index.ts` -- add --version --json handling
- `skills/project-status/SKILL.md` -- rewrite for CLI usage
- `skills/project-status/references/status-logic.md` -- simplify (CLI handles state derivation)
