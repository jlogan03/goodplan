# CLI Changes API

## Purpose
Documents modifications to the existing CLI for this epic: the binary rename from `goodplan` to `gp`, the `nextCommands` feature in mutation responses, and the HMAC signature system. Consumed by the Commands, RPC, State Machine, and Data layers.

## Binary Rename

### Change
- `--outfile` in build script changes from `goodplan` to `gp`
- All skill bodies, shared references, and CLAUDE.md files update `goodplan` → `gp` for CLI invocation references
- `__GOODPLAN_VERSION__` build define renamed to `__GP_VERSION__` across all affected files (`src/version.ts`, `vitest.config.ts`, `tests/global-setup.ts`, `package.json`)
- "goodplan" remains as the product name in prose

### Affected Files
- `package.json` — build script `--outfile`, `__GP_VERSION__` define
- `src/version.ts` — `__GP_VERSION__` reference
- `vitest.config.ts` — `__GP_VERSION__` define
- `tests/global-setup.ts` — `__GP_VERSION__` define
- `skills/**/*.md` — all CLI invocation references
- `skills/_shared/references/*.md` — CLI interaction conventions
- `CLAUDE.md` — project instructions
- `.goodplan/architecture/*.md` — architecture docs referencing the CLI

## `nextCommands` Feature

### Command Metadata Registry

A `commandMetadata` registry at the RPC layer maps `(entityType, status)` pairs to available CLI commands. This registry inverts the existing command-to-event mapping from the Commands API — the state machine remains pure with no CLI knowledge.

```typescript
interface CommandMetadataEntry {
  template: string;      // e.g., 'gp epic:explore --epic {name}'
  description: string;   // e.g., 'Begin exploration phase'
  userFacing: boolean;   // false suppresses from nextCommands output
}

// Registry structure: entityType → status → available commands
type CommandMetadataRegistry = Record<EntityType, Record<string, CommandMetadataEntry[]>>;
```

Template variables:
- `{name}` — entity name (epic, slice, quest, task name)
- `{epic}` — parent epic name (for slice commands); sourced from the RPC result's context or the command's `--epic` flag

Non-interpolated flags requiring user input use angle-bracket placeholders: `--reason "<reason>"`. Entries with angle-bracket placeholders require user input and are guidance, not executable strings.

### RPC Layer: `computeNextCommands()`

**Layer ownership:** `computeNextCommands()` lives in the RPC layer and is exported from it. The Commands layer calls it after receiving the mutation response from RPC, then merges the result into the JSON output. The RPC layer computes; the Commands layer formats and surfaces. This function is deliberately NOT part of the RPC result types (`BeginResult`, `SubmitResult`, `CompleteResult`) — the Commands layer calls it separately, passing entity context from the RPC result and/or the `--epic` flag.

New function in the RPC layer, called after every successful mutation:

```typescript
interface NextCommands {
  entity: CommandEntry[];
  other: CommandEntry[];
}

interface CommandEntry {
  command: string;      // Interpolated command string
  description: string;
}

function computeNextCommands(
  entityType: EntityType,
  entityName: string,
  newStatus: string,
  parentEpic?: string
): NextCommands;
```

**Algorithm:**
1. **Entity mutations**: look up `commandMetadata[entityType][newStatus]`, filter to `userFacing: true`, interpolate `{name}` and `{epic}` into templates.
2. **Entity reads**: append static read commands for the entity type:
   - Epic: `gp epic:show --epic {name}`
   - Slice: `gp slice:show --slice {name}`
   - Quest: `gp quest:show --quest {name}`
   - Task: `gp task:show --task {name}`
3. **Other mutations**: collect creation commands from all other entity types. The curated list includes: `gp epic:create`, `gp quest:create`, `gp task:create`. This is implementation-defined and may be extended.

**Completed entities:** For completed entities, `computeNextCommands()` does NOT include sibling suggestions (e.g., "start the next slice"). Sibling-aware suggestions require workflow context that belongs in the skill/LLM layer, not the CLI.

**`parentEpic` resolution:** For slice commands, `parentEpic` is sourced from the RPC mutation result (which includes the parent epic context) or from the `--epic` flag passed to the CLI command. The Commands layer passes the `--epic` flag value directly to `computeNextCommands()`. For non-slice entities (epics, quests, tasks), `parentEpic` is `undefined`.

### Commands Layer: Response Integration

The Commands layer calls `computeNextCommands()` (imported from the RPC layer) after receiving the RPC mutation result, passing the entity type, name, new status, and `parentEpic` (sourced from the RPC result context or the `--epic` flag). It then merges the returned `NextCommands` into the JSON output. Mutation command handlers include `nextCommands` in their JSON output:

```json
{
  "entity": "plugin-distribution",
  "phase": "explore",
  "previousStatus": "created",
  "newStatus": "exploring",
  "paths": { ... },
  "nextCommands": {
    "entity": [
      { "command": "gp submit-explore --epic plugin-distribution", "description": "Complete exploration phase" },
      { "command": "gp epic:show --epic plugin-distribution", "description": "View epic details" },
      { "command": "gp epic:abandon --epic plugin-distribution --reason \"<reason>\"", "description": "Abandon this epic" }
    ],
    "other": [
      { "command": "gp quest:create", "description": "Create a side quest" },
      { "command": "gp task:create", "description": "Capture a quick task" }
    ]
  }
}
```

**Included in**: all mutation responses (including `complete()` operations) when `--json` is used.
**Not included in**: read-only commands (`show`, `list`, `status`, `state`, `schema`).

## Embedded HMAC Signature System

### Data Layer Changes

The Data Layer gains a signature module operating on the entire state tree, not individual files:

```typescript
// Serialize the full state tree (JSON/JSONL files only), excluding stateSignature.
// Markdown files are excluded — they are LLM-owned and not covered by the signature.
// This matches assembleState() without --inline (markdown entries are boolean markers, not content).
function serializeStateTree(): string;

// Compute HMAC-SHA256 of the serialized state tree using the baked-in key
function signStateTree(serialized: string): string;

// Verify the state tree against the embedded stateSignature in goodplan.json
function verifyStateTree(): boolean;
```

The HMAC key (`__GP_HMAC_KEY__`) is injected at compile time via `--define` and accessed as a module-level constant.

### Integration Points

- **Every Data Layer write**: after mutating state, serialize the state tree (JSON/JSONL only — markdown excluded), compute HMAC (excluding `stateSignature` field), embed the signature in `goodplan.json`, write atomically. The signature is part of the state write, not a separate step — no atomicity gap.
- **Every Data Layer read**: assemble the state tree (JSON/JSONL only), compute HMAC over tree (excluding `stateSignature` field), compare to embedded signature. Hard error on mismatch — never silently uses tampered data. Error message directs user to run `gp verify --fix`. Markdown file changes do not affect verification.
- **Bootstrap exception:** if `stateSignature` field is missing from `goodplan.json` (first CLI run on a pre-HMAC repo or fresh clone), the CLI computes and embeds the signature, then proceeds normally. This is a one-time bootstrap, not an ongoing bypass. Note: `gp verify` without `--fix` on a pre-HMAC repo returns fail with a message to run `--fix` — the bootstrap exception does NOT apply to `gp verify`.
- **Cache invalidation**: the `stateSignature` field comparison IS the cache validity check. If the embedded `stateSignature` matches the cached version, the cache hit path skips HMAC verification entirely (the cache was verified when it was built). Only a cache miss — where `stateSignature` differs from the cached version or no cache exists — triggers full state tree assembly + HMAC verification.

### `gp verify` Command

```bash
gp verify [--fix] [--json]
```

**Without `--fix`** (read-only): assembles the state tree, computes HMAC, compares to embedded `stateSignature`. Single pass/fail check.

**With `--fix`** (write operation): recomputes the HMAC over the state tree and re-embeds it in `goodplan.json`.

Output:
```json
{
  "status": "pass",
  "message": "State tree integrity verified"
}
```
```json
{
  "status": "fail",
  "message": "State tree has been modified outside the CLI. Run `gp verify --fix` to re-sign."
}
```

Exit codes:
- 0: signature valid (also used when `--fix` succeeds)
- 1: signature mismatch (verification failure)

### Embedded Signature in `goodplan.json`

The `stateSignature` field is embedded directly in `goodplan.json`:

```json
{
  "name": "my-project",
  "stateSignature": "hmac-sha256:a1b2c3...",
  ...
}
```

- Covers the entire state tree (all `.goodplan/` state files) in a single HMAC
- Algorithm prefix (`hmac-sha256:`) enables future migration
- Eliminates the need for a separate `.signatures.json` file
- No atomicity gap — signature is written as part of the state mutation, not as a separate step

## Contracts

- `commandMetadata` registry at the RPC layer is derived from the Commands API's command-to-event mapping — the state machine has no CLI knowledge
- `commandMetadata` registry must have bidirectional coverage with the Commands API: every user-facing command has a registry entry, every registry entry maps to a valid command. This is enforced by a required fitness function (see below).
- `nextCommands` is an approximation — guards may prevent some listed commands from succeeding
- `nextCommands` is computed, never cached — always reflects current state
- `nextCommands` is included in `complete()` mutation responses
- Every state file write recomputes and embeds the `stateSignature` in `goodplan.json` atomically — no write without signature update
- Every state file read verifies the HMAC against the embedded `stateSignature` — hard error on mismatch, never silently uses tampered data
- **Bootstrap exception**: if `stateSignature` is missing from `goodplan.json`, compute and embed it, then proceed
- `gp verify` without `--fix` is read-only. `gp verify --fix` is a write operation that recomputes and re-embeds the signature.
- Embedded `stateSignature` comparison is the cache invalidation mechanism — stale cache detected by comparing the embedded signature
- HMAC key is a stable constant injected from a CI secret — detects tampering, not an access control mechanism

## Fitness Functions

### `nextCommands` returns only valid transitions for current state

- **Test file:** candidate — not yet written
- **Verifies:** for each entity type and status, `computeNextCommands()` returns only commands whose transition rows include that status in `from`

### Bidirectional `commandMetadata` registry coverage (required before merge)

- **Test file:** required — must be written before merge
- **Verifies:** every user-facing command in the Commands API that triggers a state transition has a corresponding entry in the `commandMetadata` registry, AND every registry entry maps to a valid command in the Commands API

### Every Data Layer write embeds a valid `stateSignature`

- **Test file:** candidate — not yet written
- **Verifies:** after any state file write, the `stateSignature` in `goodplan.json` is present and matches the HMAC computed over the full state tree

### Tampered state files produce read errors

- **Test file:** candidate — not yet written
- **Verifies:** modifying a state file's contents without updating the embedded `stateSignature` causes the Data Layer read to return an error, not the tampered data

## Dependencies

- Commands API (command-to-event mapping, inverted to build `commandMetadata` registry)
- Data Layer (embedded signature computation, verification, cache invalidation)
- Node.js `crypto` module (HMAC-SHA256)
