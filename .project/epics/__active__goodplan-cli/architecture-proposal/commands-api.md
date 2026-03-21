# Commands API

## Purpose

Thin CLI layer built on citty. Parses input (flags + stdin JSON), validates with Zod schemas, routes to the RPC Layer or Data Layer, formats output. One file per command. No business logic.

## Interface

### Command Structure

```
goodplan <namespace>:<command> [flags]
goodplan <global-command> [flags]
```

### Resource Namespace (Read-Only → Data Layer)

All resource commands are read-only. They go directly to the Data Layer, bypassing the RPC Layer and State Machine.

```
goodplan resource:epic list
goodplan resource:epic show --epic <name>
goodplan resource:slice list [--epic <name>]
goodplan resource:slice show --slice <name>
goodplan resource:quest list
goodplan resource:quest show --quest <name>
goodplan resource:decision list
goodplan resource:decision show --id <id>
goodplan resource:learning list [--source <scope>]
goodplan resource:learning show --id <id>
goodplan resource:activity list [--scope <scope>]
```

### Entity Namespaces (Mutations → RPC → State Machine)

All mutations go through the RPC Layer, which calls the State Machine. Every command below maps to a specific `StateEvent`. This list is a starting point — gaps will be identified and filled during slice planning and implementation.

**Epic lifecycle:**

```
goodplan epic:create
goodplan epic:explore --epic <name>
goodplan epic:define-architecture --epic <name>
goodplan epic:refine-architecture --epic <name>
goodplan epic:define-slices --epic <name>
goodplan epic:refine-slices --epic <name>
goodplan epic:activate --epic <name>
goodplan epic:complete --epic <name>
goodplan epic:abandon --epic <name>
goodplan epic:add-verification --epic <name>
goodplan epic:update-verification --epic <name> --index <n>
```

**Slice lifecycle:**

```
goodplan slice:create --epic <name>
goodplan slice:plan --slice <name>
goodplan slice:refine-plan --slice <name>
goodplan slice:implement --slice <name>
goodplan slice:complete --slice <name>
goodplan slice:abandon --slice <name>
```

**Quest lifecycle:**

```
goodplan quest:create
goodplan quest:start --quest <name>
goodplan quest:plan --quest <name>
goodplan quest:refine-plan --quest <name>
goodplan quest:implement --quest <name>
goodplan quest:complete --quest <name>
goodplan quest:abandon --quest <name>
```

**Cross-cutting:**

```
goodplan learning:rollup --from <source> --to <target>
goodplan decision:create
goodplan decision:update --id <id>
```

### Global Commands

```
goodplan status [--json] [--query <jq>]
goodplan init [--name <name>]
goodplan schema [--json] [--query <jq>]
goodplan context <phase> --slice <name>|--quest <name>|--epic <name> [--inline-context[=<bytes>]]
```

`context` is read-only but lives at the global level since it serves any entity type and phase.

### Input Handling

Every command:
1. Defines its flags via citty's command definition API
2. Reads stdin if the command accepts input (mutations with complex payloads)
3. Merges flags and stdin into a single input object
4. Validates the merged input against a Zod schema from `src/schemas/commands/`
5. Routes to the appropriate layer: read-only → Data Layer, mutations → RPC Layer

```typescript
// Example: slice:complete command
defineCommand({
  meta: { name: 'slice:complete' },
  args: {
    slice: { type: 'string', required: true },
    json: { type: 'boolean', default: false },
    'inline-context': { type: 'string' },
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
- **`--query`**: applies jqjs filter to the JSON output, then prints the result. Implies `--json` for the intermediate representation.

### Global Flags

Available on every command:

| Flag | Type | Description |
|---|---|---|
| `--json` | boolean | Structured JSON output |
| `--quiet` | boolean | Minimal output |
| `--query` | string | jq filter on JSON output |
| `--inline-context` | boolean or number | Include inlined content; optional byte budget override |

## Contracts

### No Business Logic

Commands do not contain workflow logic, state management, or data transformation beyond input parsing and output formatting. They are a thin bridge between the terminal and the RPC/Data layers.

### Read/Write Routing

- `resource:*` commands → Data Layer (read-only, no state machine involvement)
- Entity namespace commands (`epic:*`, `slice:*`, `quest:*`, `decision:*`, `learning:*`) → RPC Layer → State Machine (all mutations)
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

In human-readable mode, only `message` is printed to stderr. In `--json` mode, the full error object is printed to stdout. Exit code is 2 for validation errors, 1 for all others.

### Target Flags Required

Every command that operates on an entity requires explicit target flags (`--slice`, `--epic`, `--quest`). No implicit state from prior commands. This enables safe concurrent sessions.

## Dependencies

- citty: command definition and routing
- Zod schemas from `src/schemas/commands/`
- RPC Layer: workflow operations
- Data Layer: entity CRUD (read-only resource commands)
- picocolors: human-readable output formatting
- jqjs: `--query` filter implementation

## Fitness Functions

### Resource commands are read-only

- **Test file:** candidate — not yet written
- **Verifies:** All `resource:*` commands only call Data Layer read functions — no `writeEntity`, `commitState`, or RPC mutations

### Every error produces structured JSON and correct exit code

- **Test file:** candidate — not yet written
- **Verifies:** For each error code path (validation, state, data, internal), the output matches `{ error: { code, message } }` shape and exit code is 2 (validation) or 1 (other)
