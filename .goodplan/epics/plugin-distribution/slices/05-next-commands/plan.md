# Plan: Next Commands

## Overview

Implement the `nextCommands` feature: a `commandMetadata` registry at the RPC layer that maps `(entityType, status)` pairs to available CLI commands, a `computeNextCommands()` function that derives available commands after each mutation, and Commands layer integration that includes `nextCommands` in every mutation response's `--json` output.

The registry is a static data structure derived from the Commands API's command-to-event mapping. The state machine stays pure (INV-003). `computeNextCommands()` is a pure function (INV-004) — takes explicit params, no ambient state. `init` and `migrate` are excluded (they use `rpcInit`/`rpcMigrate`, not the standard begin/complete/submit trio). `rollup` is excluded (returns `RollupResult` with no status fields).

37 mutation command files need integration. Types (`NextCommands`, `CommandEntry`, `CommandMetadataEntry`) and the registry live in `src/core/rpc/next-commands.ts`.

## Phase 1: Registry & Core Function

Create the `commandMetadata` registry, `computeNextCommands()` function, types, unit tests, and the required bidirectional fitness function.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r "commandMetadata" src/` — no matches (registry doesn't exist)
- [ ] `grep -r "computeNextCommands" src/` — no matches (function doesn't exist)
- [ ] `grep -r "command-metadata-coverage" tests/` — no matches (fitness test doesn't exist)

**After implementation** (should pass / show presence):
- [ ] `bun run test -- tests/unit/rpc/next-commands.test.ts` — all unit tests pass
- [ ] `bun run test -- tests/fitness/command-metadata-coverage.test.ts` — fitness test passes (bidirectional coverage)
- [ ] `node -e "const m = require('./src/core/rpc/next-commands.ts'); console.log(typeof m.computeNextCommands)"` — or equivalent import check confirms the function is exported

### Tasks

- [ ] Create `src/core/rpc/next-commands.ts`:
  1. Export types: `CommandMetadataEntry { template: string; description: string; userFacing: boolean }`, `CommandEntry { command: string; description: string }`, `NextCommands { entity: CommandEntry[]; other: CommandEntry[] }`
  2. Build the `commandMetadata` registry as `Record<string, Record<string, CommandMetadataEntry[]>>` mapping `entityType → status → entries[]`. Cover all entity types: epic (14 statuses), slice (9 statuses), quest (9 statuses), task (3 statuses), decision (3 statuses). Terminal statuses (`completed`, `abandoned`, `dropped`, `converted`, `superseded`) have empty arrays. Each entry's `template` uses `{name}` for entity name and `{epic}` for parent epic. Non-interpolated flags use angle-bracket placeholders: `--reason "<reason>"`.
  3. Export `computeNextCommands(entityType: string, entityName: string, newStatus: string, parentEpic?: string): NextCommands`:
     - **Entity section**: Look up `commandMetadata[entityType]?.[newStatus]` (guard for undefined — `noUncheckedIndexedAccess`). Filter `userFacing: true`. Interpolate `{name}` → `entityName`, `{epic}` → `parentEpic` in templates. Include the entity's read command (e.g., `gp epic:show --epic {name}`).
     - **Other section**: Curated creation commands from other entity types (`gp epic:create`, `gp quest:create`, `gp task:create`). Exclude the creation command for the current `entityType`. Omit other-section for terminal statuses.
     - Return `{ entity, other }`.
- [ ] Create `tests/unit/rpc/next-commands.test.ts`:
  1. Test `computeNextCommands("epic", "test-epic", "created")` — returns entity commands including `gp epic:explore --epic test-epic`, other includes `gp quest:create` but not `gp epic:create`
  2. Test `computeNextCommands("slice", "my-slice", "plan-created", "my-epic")` — returns entity commands with interpolated `--epic my-epic`, other includes `gp epic:create` but not `gp slice:create`
  3. Test terminal status (`"completed"`) — entity section is empty (or show-only), other section is empty
  4. Test unknown entityType / unknown status — returns empty `{ entity: [], other: [] }` (graceful degradation)
  5. Test `SubmitResult.advanced === false` scenario — same status returned, verify nextCommands suggests the same submit command
- [ ] Create `tests/fitness/command-metadata-coverage.test.ts`:
  1. Follow the pattern in `tests/fitness/mutation-through-state-machine.test.ts` — static analysis, no binary spawning
  2. **Forward check**: For every user-facing command in `src/commands/` that calls `begin()`, `complete()`, or `submit()`, verify there exists a `commandMetadata` entry with a matching template
  3. **Reverse check**: For every `commandMetadata` entry with `userFacing: true`, verify a corresponding command file exists in `src/commands/`
  4. Report mismatches with specific file paths and template strings

### Verification

Run `bun run test` — all existing tests still pass, new tests pass. Run `bun run check` (biome) — no lint errors in new files. Verify the registry covers every status in the transition tables by inspecting `commandMetadata` keys against `src/core/state/transitions/`.

## Phase 2: Commands Integration

Wire `computeNextCommands()` into every mutation command handler's `--json` output path. 37 files to modify.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `echo '{"name":"test-nc","goal":"testing nextCommands"}' | ./gp epic:create --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'nextCommands' not in d; print('No nextCommands')"` — passes (nextCommands not yet in output)

**After implementation** (should pass / show presence):
- [ ] `echo '{"name":"test-nc","goal":"testing nextCommands"}' | ./gp epic:create --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); nc=d['nextCommands']; assert isinstance(nc['entity'], list); assert isinstance(nc['other'], list); print(f'entity: {len(nc[\"entity\"])}, other: {len(nc[\"other\"])}')"` — passes with entity and other arrays populated
- [ ] `./gp epic:show --epic test-nc --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'nextCommands' not in d; print('Read-only: no nextCommands')"` — passes (read-only command)
- [ ] `./gp status --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'nextCommands' not in d; print('Status: no nextCommands')"` — passes (read-only command)

Note: These tests run against a temp project created during the test (set up with `./gp init` first). The `./gp` references the local build, not the installed CLI.

### Tasks

- [ ] For each of the 37 mutation command files, add `computeNextCommands()` call inside the `args.json || args.query` branch:
  - Import: `import { computeNextCommands } from "../../core/rpc/next-commands.js"` (adjust relative path per file location)
  - After `const result = await begin(...)` / `complete(...)` / `submit(...)`:
    ```typescript
    const nextCommands = computeNextCommands(entityType, entityName, result.newStatus, parentEpic);
    output({ ...result, nextCommands }, args);
    ```
  - `entityType` is the target type string (e.g., `"epic"`, `"slice"`)
  - `entityName` is derived from args/input (see mutation file table in research)
  - `parentEpic` is passed for slice commands (from `requireActiveEpic()` or `args.epic`), `undefined` for others
  - **Exception**: `learning/rollup.ts` — returns `RollupResult` with no status. Skip `nextCommands` integration.
  - **Exception**: `decision/create.ts` and `decision/update.ts` — entityType is `"decision"`, entityName is the decision `id`
  - **Exception**: `submit-*.ts` files that handle both slice and quest — determine entityType from which input field is present
  - Human-readable output path (`!args.quiet`) stays unchanged — `nextCommands` is `--json` only

### Verification

Run `bun run test` — all tests pass (existing integration tests exercise `--json` paths). Run `bun run check` — no lint errors. Verify at least 3 command files from different entity types to confirm the `nextCommands` field appears in `--json` output.

## Phase 3: End-to-End Validation

Run a full lifecycle in a temp project verifying `nextCommands` at each step.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] N/A — this is a validation-only phase, no new code

**After implementation** (should pass / show presence):
- [ ] Full lifecycle test in temp project: `./gp init` → `echo '{"name":"e2e","goal":"test"}' | ./gp epic:create --json` (verify `nextCommands.entity` includes `gp epic:explore --epic e2e`) → `./gp epic:explore --epic e2e --json` (verify) → `echo '' | ./gp submit-explore --epic e2e --json` (verify) → continue through several more transitions
- [ ] Read-only exclusion: `./gp epic:show --epic e2e --json`, `./gp status --json`, `./gp slice:list --json` — none include `nextCommands`
- [ ] Completed entity: complete an entity and verify terminal status returns empty/show-only `nextCommands.entity` and empty `nextCommands.other`
- [ ] Slice with parentEpic: create a slice under the epic and verify `--epic e2e` appears in interpolated commands

### Tasks

- [ ] Create temp project: `mkdir -p /tmp/gp-e2e-test && cd /tmp/gp-e2e-test && ./gp init`
- [ ] Run epic lifecycle: `epic:create` → `epic:explore` → `submit-explore` → `epic:define-architecture` → `submit-architecture`. At each step, capture `--json` output and verify `nextCommands` structure, interpolated names, and entity/other section contents
- [ ] Run slice lifecycle: `slice:create` → `slice:plan` → `submit-plan` → `slice:refine-plan` → `submit-refinement`. Verify `parentEpic` interpolation in slice commands
- [ ] Verify read-only exclusion for `show`, `list`, `status` commands
- [ ] Verify task commands: `task:create` → verify `nextCommands` includes `task:drop` and `task:convert`
- [ ] Verify quest creation: `quest:create` → verify `nextCommands`
- [ ] Verify decision commands: `decision:create` → verify `nextCommands` includes `decision:update`
- [ ] Clean up temp project: `rm -rf /tmp/gp-e2e-test`

### Verification

All lifecycle checks pass. Every mutation response includes well-formed `nextCommands` with correctly interpolated entity names and appropriate entity/other sections. Read-only commands are clean. Clean up temp project after validation.
