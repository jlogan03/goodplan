# Commands API

## Purpose

Thin CLI layer built on citty. Parses input (flags + stdin JSON), validates with Zod schemas, routes to the RPC Layer or Data Layer, formats output. One file per command. No business logic.

## Interface

### Command Structure

```
goodplan <namespace>:<command> [flags]
goodplan <global-command> [flags]
```

### Entity Namespaces

Each entity namespace contains both read-only commands (`list`, `show`) and workflow mutations. Read-only commands go directly to the Data Layer, bypassing the RPC Layer and State Machine. Mutations go through the RPC Layer, which calls the State Machine.

The RPC layer maps each mutation command to a `StateEvent`. Mapping:

| Command | StateEvent |
|---|---|
| `epic:create` | `CREATE_EPIC` |
| `epic:explore` | `BEGIN_EXPLORE` |
| `epic:define-architecture` | `BEGIN_ARCHITECTURE` |
| `epic:refine-architecture` | `BEGIN_REFINE_ARCHITECTURE` |
| `epic:define-slices` | `BEGIN_SLICING` |
| `epic:refine-slices` | `BEGIN_REFINE_SLICES` |
| `epic:activate` | `ACTIVATE_EPIC` |
| `epic:complete` | `COMPLETE_EPIC` |
| `epic:abandon` | `ABANDON_EPIC` |
| `epic:add-verification` | `ADD_VERIFICATION` |
| `epic:update-verification` | `UPDATE_VERIFICATION` |
| `slice:create` | `CREATE_SLICE` |
| `slice:plan` | `BEGIN_PLAN` |
| `slice:refine-plan` | `BEGIN_REFINEMENT` |
| `slice:implement` | `BEGIN_IMPLEMENTATION` |
| `slice:complete` | `COMPLETE_SLICE` |
| `slice:abandon` | `ABANDON_SLICE` |
| `quest:create` | `CREATE_QUEST` |
| `quest:plan` | `BEGIN_QUEST_PLAN` |
| `quest:refine-plan` | `BEGIN_QUEST_REFINEMENT` |
| `quest:implement` | `BEGIN_QUEST_IMPLEMENTATION` |
| `quest:complete` | `COMPLETE_QUEST` |
| `quest:abandon` | `ABANDON_QUEST` |
| `learning:rollup` | `ROLLUP_LEARNINGS` |
| `decision:create` | `CREATE_DECISION` |
| `decision:update` | `UPDATE_DECISION` |
| `submit-plan` | `COMPLETE_PLAN` (or `COMPLETE_QUEST_PLAN`) |
| `submit-refinement` | `COMPLETE_REFINEMENT_ROUND` (or `COMPLETE_QUEST_REFINEMENT_ROUND`) — uses `--slice` or `--quest` to disambiguate |
| `submit-implementation` | `COMPLETE_IMPLEMENTATION` (or `COMPLETE_QUEST_IMPLEMENTATION`) |
| `submit-explore` | `COMPLETE_EXPLORE` |
| `submit-architecture` | `COMPLETE_ARCHITECTURE` |
| `submit-slices` | `COMPLETE_SLICING` |
| `submit-refine-architecture` | `COMPLETE_REFINE_ARCHITECTURE` |
| `submit-refine-slices` | `COMPLETE_REFINE_SLICES` |

Each epic phase has an explicit event type. This enables TypeScript exhaustiveness checking and per-phase guard/payload typing in the discriminated union. Quest lifecycle mirrors slice lifecycle with quest-prefixed events.

**Epic namespace:**

```
goodplan epic:list
goodplan epic:show --epic <name>
goodplan epic:create
goodplan epic:explore --epic <name>
goodplan epic:define-architecture --epic <name>
goodplan epic:refine-architecture --epic <name> [--override]
goodplan epic:define-slices --epic <name>
goodplan epic:refine-slices --epic <name> [--override]
goodplan epic:activate --epic <name>
goodplan epic:complete --epic <name>
goodplan epic:abandon --epic <name> --reason <text>
goodplan epic:add-verification --epic <name>
goodplan epic:update-verification --epic <name> --index <n>
```

**Slice namespace:**

```
goodplan slice:list [--epic <name>]
goodplan slice:show --slice <name>
goodplan slice:create --epic <name>
goodplan slice:plan --slice <name>
goodplan slice:refine-plan --slice <name> [--override]
goodplan slice:implement --slice <name>
goodplan slice:complete --slice <name>
goodplan slice:abandon --slice <name> --reason <text>
```

**Quest namespace:**

```
goodplan quest:list
goodplan quest:show --quest <name>
goodplan quest:create
goodplan quest:plan --quest <name>
goodplan quest:refine-plan --quest <name> [--override]
goodplan quest:implement --quest <name>
goodplan quest:complete --quest <name>
goodplan quest:abandon --quest <name> --reason <text>
```

**Decision namespace:**

```
goodplan decision:list
goodplan decision:show --id <id>
goodplan decision:create
goodplan decision:update --id <id>
```

**Learning namespace:**

```
goodplan learning:list [--source <scope>]
goodplan learning:show --id <id>
goodplan learning:rollup --from <source> --to <target>
```

**Activity namespace:**

```
goodplan activity:list [--scope <scope>]
```

### Sub-Agent Commands

Sub-agents use `start-<action>` to get deep working context and `submit-<action>` to write results directly to the CLI. This keeps large content (plans, architecture, implementation results) out of the orchestrator's context. The orchestrator never sees full content — it manages state transitions via entity namespace commands above.

```
goodplan start-plan --slice <name>|--quest <name> [--inline[=<bytes>]]
goodplan submit-plan --slice <name>|--quest <name>
goodplan start-refinement --slice <name>|--quest <name> [--inline[=<bytes>]]
goodplan submit-refinement --slice <name>|--quest <name>
goodplan start-implementation --slice <name>|--quest <name> [--inline[=<bytes>]]
goodplan submit-implementation --slice <name>|--quest <name>
goodplan start-explore --epic <name> [--inline[=<bytes>]]
goodplan submit-explore --epic <name>
goodplan start-architecture --epic <name> [--inline[=<bytes>]]
goodplan submit-architecture --epic <name>
goodplan start-slices --epic <name> [--inline[=<bytes>]]
goodplan submit-slices --epic <name>
goodplan start-refine-architecture --epic <name> [--inline[=<bytes>]]
goodplan submit-refine-architecture --epic <name>
goodplan start-refine-slices --epic <name> [--inline[=<bytes>]]
goodplan submit-refine-slices --epic <name>
```

- `start-*` commands are read-only: they return context bundles for the sub-agent's phase.
- `submit-*` commands accept stdin JSON with the sub-agent's output (plan content, refinement scores, implementation results). They route through the RPC Layer and trigger state events — `submit-plan` triggers `COMPLETE_PLAN`, `submit-refinement` triggers `COMPLETE_REFINEMENT_ROUND`, etc. The RPC layer handles both content write (via Data Layer) and state transition (via State Machine) in a single `commitState` call. No two-step dance — the orchestrator does not need to separately advance state after a submit.
- The command-to-event mapping table above lists the specific event each `submit-*` triggers.

### Stdin Input Examples

**`epic:complete`** — requires verification results for all epic-level verifications:

```json
{
  "verificationResults": [
    { "index": 0, "passed": true, "notes": "CLI can create, list, and show all entities" },
    { "index": 1, "passed": false, "notes": "Performance target not met under load" }
  ]
}
```

**`slice:complete`** — requires verification assertion, deferred items, learnings, and architecture deltas:

```json
{
  "verificationPassed": true,
  "deferred": [
    { "description": "Add retry logic to auth token refresh", "targetSlice": "03-rpc" }
  ],
  "learnings": [
    { "category": "worked", "summary": "Zod schema-first approach caught 3 bugs early", "detail": "Defining Zod schemas before implementation forced explicit handling of optional fields...", "tags": ["zod", "validation"], "rollupTo": ["epic"] }
  ],
  "architectureDelta": [
    { "subsystem": "data-layer", "type": "modify", "description": "Added atomic write with temp-file rename for JSON files" }
  ]
}
```

**`quest:complete`** — same shape as `slice:complete` but without `deferred` (quests don't route deferred work to slices):

```json
{
  "verificationPassed": true,
  "learnings": [
    { "category": "domain", "summary": "Correlation IDs must be propagated through async boundaries", "detail": "...", "tags": ["logging", "async"], "rollupTo": ["project"] }
  ],
  "architectureDelta": [
    { "subsystem": "logging", "type": "modify", "description": "Added correlation ID propagation to async context" }
  ]
}
```

**`epic:create`** / **`quest:create`** / **`decision:create`** — entity creation via stdin:

```json
{ "name": "my-epic", "goal": "Build the feature..." }
```

```json
{ "name": "fix-logging", "goal": "Fix structured logging to include correlation IDs" }
```

```json
{ "id": "2026-03-20-my-decision", "domain": "architecture", "title": "...", "summary": "..." }
```

**`activity:list --scope`** — scope is a path-style entity reference matching the `scope` field in `activity-log.jsonl` entries (e.g., `slices/01-auth`, `epics/goodplan-cli`, `quests/fix-logging`).

**`verificationPassed` semantics:** The `verificationPassed` boolean on `slice:complete` and `quest:complete` is a human/orchestrator assertion. The orchestrator (or user) reviews implementation results, decides whether verification criteria are met, and asserts the result via the stdin JSON payload. The CLI does not automatically determine verification — it trusts the caller's assertion and enforces it as a state machine guard.

### Global Commands

```
goodplan status [--json] [--query <jq>]
goodplan init [--name <name>]
goodplan schema [--command <command-path>] [--json] [--query <jq>]
```

`init` initializes the `.project/` directory structure and `project.json`. Maps to `INIT_PROJECT` event. When `--name` is provided, uses it as the project name. When `--name` is omitted, falls back to the current directory name (`path.basename(cwd)`). If `.project/` already exists, returns error `STATE_ALREADY_INITIALIZED`.

`schema` outputs the CLI's command tree with input/output schemas. Without `--command`, returns the full command hierarchy. With `--command` (e.g., `schema --command slice:complete`), returns that command's input schema, output schema, and flags. Output is always JSON (human-readable formatting by default, raw with `--json`). Supports `--query` for filtering.

There is no standalone `context` command. Sub-agents get context via `start-*` commands. The orchestrator uses `status`.

### Input Handling

Every command:
1. Defines its flags via citty's command definition API
2. Reads stdin if the command accepts input (mutations with complex payloads)
3. Merges flags and stdin into a single input object
4. Validates the merged input against a Zod schema from `src/schemas/commands/`
5. Routes to the appropriate layer: read-only → Data Layer, mutations → RPC Layer

**Stdin behavior:**
- **TTY detection**: `process.stdin.isTTY` — if true and the command expects stdin, treat as empty input (no blocking). Commands that require stdin input without TTY produce a validation error.
- **Empty stdin**: treated as `{}` (empty object). Flags still apply.
- **Max stdin size**: 1 MB. Larger payloads produce a `VALIDATION_STDIN_TOO_LARGE` error.

```typescript
// Example: slice:complete command
defineCommand({
  meta: { name: 'slice:complete' },
  args: {
    slice: { type: 'string', required: true },
    json: { type: 'boolean', default: false },
    inline: { type: 'string' },  // citty parses as string; coerced to boolean (true) or number by validateInput()
    query: { type: 'string' },
  },
  async run({ args }) {
    const input = validateInput(completeSliceInputSchema, args, await readStdin());
    const result = await rpc.complete('slice', input.slice, input.payload, input.options);
    output(result, args);
  }
});
```

### Output Handling

A shared `output()` function handles all formatting:

```typescript
function output(data: unknown, args: { json?: boolean; quiet?: boolean; query?: string }): void;
```

- **Default** (no flags): human-readable colored output via picocolors. Format varies per command.
- **`--json`**: `JSON.stringify` with deterministic key ordering.
- **`--quiet`**: minimal output (e.g., just the entity name or status).
- **`--query`**: applies jqjs filter to the JSON output, then prints the result. Implies `--json` for the intermediate representation. Error behavior: invalid jq expression → exit 2 with `VALIDATION_INVALID_QUERY`; empty result (null/undefined) → exit 0, prints `null`; multiple results → prints JSON array.

### Global Flags

Available on every command:

| Flag | Type | Description |
|---|---|---|
| `--json` | boolean | Structured JSON output |
| `--quiet` | boolean | Minimal output |
| `--query` | string | jq filter on JSON output |
| `--verbose` | boolean | Enable diagnostic output on stderr |

### Common Workflow Flags

These flags are meaningful only on workflow and sub-agent commands. Passing them to read-only commands (`list`, `show`), `status`, `schema`, or `init` has no effect — they are silently ignored.

| Flag | Type | Applicable commands | Description |
|---|---|---|---|
| `--inline` | boolean or number | `start-*`, workflow `begin`/`complete` commands | Include inlined content in context bundles. `--inline` uses the default budget (~20-30KB); `--inline=<bytes>` overrides it. |
| `--override` | boolean | `submit-refinement`, `epic:refine-architecture`, `epic:refine-slices`, `slice:refine-plan`, `quest:refine-plan` | Bypass score threshold circuit breaker on refinement commands. Reaches the state machine via `StateEvent.override`. |

## Contracts

### Help Text Quality

Every citty command definition must include a `description` for the command itself and for each flag. The auto-generated `--help` output must be self-documenting — bare-bones help with unlabeled flags is not acceptable.

### No Business Logic

Commands do not contain workflow logic, state management, or data transformation beyond input parsing and output formatting. They are a thin bridge between the terminal and the RPC/Data layers.

### Read/Write Routing

- Read-only commands (`list`, `show`) in each entity namespace → Data Layer (no state machine involvement)
- Mutation commands in entity namespaces (`create`, `plan`, `complete`, `abandon`, etc.) → RPC Layer → State Machine
- This ensures every mutation goes through the state machine, preventing invalid states

### Input Validation at the Boundary

All external input is validated by Zod before reaching any other layer. Invalid input produces a structured error with exit code 2 and a `VALIDATION_*` error code. The RPC and Data layers can trust their inputs.

### Consistent Error Output

All errors — validation, state, data, internal — flow through the same output path:

```json
{
  "error": {
    "code": "STATE_INVALID_TRANSITION",
    "message": "Cannot begin plan: slice 01-auth is in 'implementing' state",
    "detail": { "slice": "01-auth", "currentStatus": "implementing", "requestedPhase": "plan" }
  }
}
```

In human-readable mode, only `message` is printed to stderr. In `--json` mode, the full error object is printed to stdout. Exit codes: 1 internal errors, 2 validation/usage errors, 3 state machine errors (invalid transitions, guard failures).

### Target Flags Required

Every command that operates on an entity requires explicit target flags (`--slice`, `--epic`, `--quest`). No implicit state from prior commands. This enables safe concurrent sessions.

## Dependencies

- citty: command definition and routing
- Zod schemas from `src/schemas/commands/`
- RPC Layer: workflow operations
- Data Layer: entity CRUD (read-only `list`/`show` commands)
- picocolors: human-readable output formatting
- jqjs: `--query` filter implementation

## Fitness Functions

Priority: 3 (implement after State Machine and Data Layer)

### Read-only commands are read-only

- **Test file:** candidate — not yet written
- **Verifies:** All `list` and `show` commands only call Data Layer read functions — no `writeEntity`, `commitState`, or RPC mutations

### Every error produces structured JSON and correct exit code

- **Test file:** candidate — not yet written
- **Verifies:** For each error code path (validation, state, data, internal), the output matches `{ error: { code, message } }` shape and exit code is 1 (internal), 2 (validation), or 3 (state machine)
