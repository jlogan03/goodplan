# Plan: Next Commands

## Overview

Implement the `nextCommands` feature: a `commandMappings` registry at the RPC layer that derives available CLI commands from existing state machine data structures (transition tables + command-to-event mappings), a `computeNextCommands()` function that uses this registry to determine available commands after each mutation, and RPC-layer integration that includes `nextCommands` in `BeginResult`, `SubmitResult`, and `CompleteResult` so every mutation's `--json` output automatically includes `nextCommands`.

The registry is built at module init by importing transition table arrays from `src/core/state/transitions/*.ts` and combining them with a `commandToEvent` mapping that links commands to the events they produce. Display metadata (description, template, userFacing) is the only manually-maintained part. The state machine stays pure (INV-003). `computeNextCommands()` is a pure function (INV-004) — takes explicit params, no ambient state. `init` and `migrate` are excluded (they use `rpcInit`/`rpcMigrate`, not the standard begin/complete/submit trio). `rollup` is excluded (returns `RollupResult` with no status fields).

Integration happens at the RPC layer — `begin()`, `submit()`, and `complete()` compute and include `nextCommands` in their result types. Command files need zero changes (they already pass the result to `output()`). `nextCommands` appears in `--json` output only; human-readable formatters ignore it. `--quiet` mode suppresses all output (including `nextCommands`) per existing `output()` precedence rules — no changes needed. Types (`NextCommands`, `CommandEntry`, `CommandMetadataEntry`) and the registry live in `src/core/rpc/next-commands.ts`. The `commandToEvent` array is exported directly (not wrapped in a `_testing` namespace) — it is `ReadonlyArray` with `as const`, so consumers cannot mutate it, and direct export matches the existing pattern used by transition arrays throughout the codebase.

### Confirmed Goal

Implement nextCommands — a commandMetadata registry at the RPC layer, a pure computeNextCommands() function, and Commands layer integration so every mutation's --json output includes nextCommands with entity/other command arrays. Done = 36 mutation files wired (25 begin + 8 submit + 3 complete, rollup excluded), read-only commands excluded, bidirectional fitness test in place. KEY CONSTRAINT: Registry must derive from existing state machine data structures (transition tables, command-to-event mappings) rather than being a parallel manually-maintained definition.

### Key Constraint

**Registry must derive from existing state machine data structures** — not be a parallel, manually-maintained definition. The transition tables in `src/core/state/transitions/*.ts` export declarative `ReadonlyArray<{from, event, to}>` constants. The RPC layer has command-to-event mappings in `buildBeginEvent()`, `buildSubmitEvent()`, and `buildCompleteEventWithLearnings()`. The registry inverts these existing sources at module init to build `(entityType, toStatus) → commands[]`, preventing two definitions of state machine behavior from getting out of sync.

## Phase 1: Registry & Core Function

Create the derived `commandMappings` registry, `computeNextCommands()` function, types, unit tests, and the required bidirectional fitness function. The registry is built by combining transition table data with a `commandToEvent` mapping — not manually maintained per-status.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r "commandMappings" src/` — no matches (registry doesn't exist)
- [ ] `grep -r "computeNextCommands" src/` — no matches (function doesn't exist)
- [ ] `grep -r "command-metadata-coverage" tests/` — no matches (fitness test doesn't exist)

**After implementation** (should pass / show presence):
- [ ] `bun run test -- tests/unit/rpc/next-commands.test.ts` — all unit tests pass
- [ ] `bun run test -- tests/fitness/command-metadata-coverage.test.ts` — fitness test passes (bidirectional coverage + transition reachability)
- [ ] `bun -e "import { computeNextCommands } from './src/core/rpc/next-commands.ts'; console.log(typeof computeNextCommands)"` — confirms the function is exported

### Tasks

- [ ] **Prerequisite**: Export declarative transition arrays from `src/core/state/transitions/decision.ts` and `src/core/state/transitions/task-lifecycle.ts` to match the standard `ReadonlyArray<{from, event, to}>` shape used by other entity types:
  - `decision.ts`: Export `decisionTransitions` derived from the internal `VALID_DECISION_TRANSITIONS` record. Decisions are JSONL records — all mutations use `UPDATE_DECISION` (not status-keyed events) or `CREATE_DECISION`. The full derived entry set:
      - `{ from: "active", event: "UPDATE_DECISION", to: "active" }` (update without status change)
      - `{ from: "active", event: "UPDATE_DECISION", to: "revisiting" }`
      - `{ from: "active", event: "UPDATE_DECISION", to: "superseded" }`
      - `{ from: "revisiting", event: "UPDATE_DECISION", to: "active" }`
      - `{ from: "revisiting", event: "UPDATE_DECISION", to: "superseded" }`
      - `{ from: "(none)", event: "CREATE_DECISION", to: "active" }` (initial creation — uses the `"(none)"` sentinel consistent with all other entity creation transition tables)
  - `task-lifecycle.ts`: Export `taskLifecycleTransitions` covering `task:drop` (`DROP_TASK`: `open → dropped`) and `task:convert` (`CONVERT_TASK`: `open → converted`). Currently only `task-create.ts` exports `createTaskTransitions`. The lifecycle transitions for drop/convert are validated by handler functions but not exported as declarative arrays. **Note on `task:convert`**: `CONVERT_TASK` transitions the task to `converted` (terminal) but also creates a new quest or epic as a side effect. For `commandMappings` derivation, only the task's own transition matters — `{ from: "open", event: "CONVERT_TASK", to: "converted" }` drives `task:convert` appearing in commands for an `open` task. The resulting entity creation is an RPC-layer concern, not a `commandMappings` concern.
  - This keeps the derivation constraint intact — `commandMappings` derives from exported transition arrays rather than hardcoding decision/task transitions in `commandToEvent`.
- [ ] Create `src/core/rpc/next-commands.ts`:
  1. Export types:
     - `CommandMetadataEntry { template: `gp ${string}`; description: string; userFacing: boolean }` — template uses `` `gp ${string}` `` template literal type. **Placeholder convention**: `{name}` and `{epic}` are auto-interpolated values; `<reason>` (angle brackets) are user-supplied values. Document this convention in JSDoc on the `template` field.
     - `CommandEntry { command: string; description: string }`
     - `NextCommands { entity: CommandEntry[]; other: CommandEntry[] }`
  2. Define `type NextCommandsEntityType = Exclude<Target["type"], "project" | "rollup">` — constrains entity types to those that participate in nextCommands (epic, slice, quest, task, decision). Define a static `commandToEvent` mapping array: `Array<{ command: string; event: StateEvent["type"]; entityType: NextCommandsEntityType; template: `gp ${string}`; description: string; userFacing: boolean }>` (import `StateEvent` from `src/schemas/state-events.ts`). Use `as const satisfies ReadonlyArray<...>` on the array literal for compile-time validation — the `StateEvent["type"]` constraint gives compile-time validation that every event string is a real state event. The `command` field uses the citty command name (e.g., `epic:create`). **Subagent commands use hyphenated names matching `commandRegistry` keys** (e.g., `"submit-plan"`, not `"submit:plan"`) — use the exact key from `commandRegistry` for these entries. Each entry links a CLI command to the state event it produces. Descriptions are manually maintained in `commandToEvent` with action-oriented, concise phrasing (e.g., "Explore this epic", "Begin planning") — NOT pulled from `commandRegistry` (which lives in the Commands layer and contains schema-level help text with stdin format hints, inappropriate for user-facing suggestions). This avoids a layering violation (RPC must not depend on Commands). This is the only manually-maintained data — it captures display metadata (description, template, userFacing) and the command-to-event link that cannot be derived from transition tables alone.
  3. At module init, import all `*Transitions` arrays from `src/core/state/transitions/*.ts` and build a derived `commandMappings: Map<NextCommandsEntityType, Map<string, CommandMetadataEntry[]>>` keyed by `(entityType, toStatus)`:
     - **Filter out `(error)` rows**: Skip any transition entry where `to === "(error)"` before matching — these represent guard failure paths, not reachable target statuses. After filtering, duplicate `(from, event)` pairs with different `to` values (e.g., guard success vs guard failure) are handled naturally — only the non-error row survives.
     - For each transition `{ from, event, to }`, find matching `commandToEvent` entries by `event` + `entityType`
     - Group by `(entityType, to)` to produce the status-indexed lookup
     - Terminal statuses (`completed`, `abandoned`, `dropped`, `converted`, `superseded`) naturally get empty arrays (no transitions lead out of them)
     - Status-preserving events (e.g., `ADD_VERIFICATION`, `UPDATE_VERIFICATION`) produce entries under their `from` status (since `from === to`), making `add-verification`/`update-verification` available as commands for those statuses without needing separate status entries
     - **`(same)` expansion**: For any transition entry where `to === "(same)"`, set `to = from` before inserting into `commandMappings`. This is a generic rule — currently used by `epicVerifyTransitions`, but `epicPhaseTransitions` includes `"(same)"` in its type union and other tables may adopt it. Apply this expansion after wildcard expansion (so `from` is already concrete).
     - **Wildcard expansion**: Some transition tables use wildcard `from` values. `*(non-terminal)` expands to all non-terminal statuses for that entity type. `*(pre-activated)` expands to all statuses before `activated` (e.g., `created`, `exploring`, `explored`, `defining-architecture`, `architecture-defined`, `defining-slices`, `slices-defined`). The derivation logic must detect wildcard `from` values and expand them to the concrete status set before building `commandMappings`. Use `.options` from the entity's Zod status enum schema (e.g., `epicStatusSchema.options` from `src/schemas/entities/*.ts`) as the canonical runtime status set for wildcard expansion. Wildcard patterns may appear with or without a space (e.g., `*(non-terminal)` and `* (non-terminal)`) — normalize before matching by stripping internal spaces or matching both variants. **`* (terminal)` wildcards** are always paired with `to: "(error)"` and are eliminated by the `(error)` exclusion rule — no separate handling needed. **`*(pre-activated)` expansion**: import or inline the exact `PRE_ACTIVATED_STATUSES` set from `src/core/state/transitions/epic-verify.ts` rather than computing it heuristically — that file is the authoritative source for which statuses count as pre-activated.
  4. Export `computeNextCommands(target: Target, newStatus: string): NextCommands`:
     - **Entity section**: Look up `commandMappings.get(target.type)?.get(newStatus)` (safe with `noUncheckedIndexedAccess`). Filter `userFacing: true`. Import `resolveEntityName` from `./types.js` (already exists, handles all Target variants including `decision` → `target.id`) for `{name}` interpolation; for slices, extract `epic` from `target.epic` for `{epic}` interpolation. Include the entity's read command (e.g., `gp epic:show --epic {name}`).
     - **Abandon commands**: `epic:abandon`, `slice:abandon`, `quest:abandon` are valid transitions from most non-terminal statuses. The derivation handles them automatically (they appear in transition tables), but the `commandToEvent` mapping must include entries for them. They should appear in the entity section alongside other available commands for each non-terminal status.
     - **Other section**: Curated creation commands from other entity types (`gp epic:create`, `gp quest:create`, `gp task:create`). Exclude the creation command for the current `target.type`. Omit other-section for terminal statuses. **Note**: The "other" section is a pragmatic exception to the derivation constraint — these cross-entity creation commands cannot be derived from transition tables since they aren't status-dependent.
     - **Ordering**: `entity` commands are ordered by their position in the transition table (reflecting workflow progression). `other` commands are ordered alphabetically by command name. This provides deterministic, predictable output for consumers.
     - Return `{ entity, other }`.
- [ ] Create `tests/unit/rpc/next-commands.test.ts`:
  1. Test `computeNextCommands({ type: "epic", name: "test-epic" }, "created")` — returns entity commands including `gp epic:explore --epic test-epic`, other includes `gp quest:create` but not `gp epic:create`
  2. Test `computeNextCommands({ type: "slice", name: "my-slice", epic: "my-epic" }, "plan-created")` — returns entity commands with interpolated `--epic my-epic`, other includes `gp epic:create` but not `gp slice:create`
  3. Test terminal status (`"completed"`) — entity section is empty (or show-only), other section is empty
  4. Test unknown status with valid entity type — `computeNextCommands({ type: "epic", name: "x" }, "nonexistent-status")` returns empty `{ entity: [], other: [] }` (graceful degradation). Note: testing unknown entityType requires a `as Target` type assertion since `Target` is a discriminated union; testing unknown status is the correct runtime scenario.
  5. Test status unchanged after submit — pass a non-terminal status like `refining` and verify nextCommands includes the submit command (validates that same-status transitions produce correct suggestions)
  6. Test `epic:activate` edge case — `computeNextCommands({ type: "epic", name: "test" }, "activated")` should return commands available after activation (e.g., `epic:complete`, `slice:create`) and NOT include pre-activation commands like `epic:define-architecture`
- [ ] Create `tests/fitness/command-metadata-coverage.test.ts`:
  1. Follow the pattern in `tests/fitness/mutation-through-state-machine.test.ts` — static analysis, no binary spawning
  2. **Forward check**: For every user-facing command in `src/commands/` that calls `begin()`, `complete()`, or `submit()`, verify there exists a `commandToEvent` entry with a matching template
  3. **Reverse check**: For every `commandToEvent` entry with `userFacing: true`, verify a corresponding command file exists in `src/commands/`
  4. **Transition reachability check**: For every derived `commandMappings[entityType][status]` entry, verify it corresponds to a valid transition in the transition tables. For every transition that maps to a user-facing command, verify a corresponding registry entry exists. This is defense-in-depth — since the registry is derived, this catches bugs in the derivation logic itself. Must handle non-standard transition table shapes: wildcard `from` values (expand before checking) and the newly-exported `decisionTransitions`/`taskLifecycleTransitions` arrays. Additionally, assert that every `event` in `commandToEvent` appears in at least one transition table entry (validates event strings are real). Assert that `commandMappings` contains no `"(error)"` key for any entity type (validates the derivation correctly filters guard-failure rows).
  5. **Description drift check**: At test time, import `commandRegistry` from `src/commands/global/schema.ts` and verify that every `commandToEvent` entry has a description that is non-empty and differs from the `commandRegistry` help text (catches accidental copy-paste of schema descriptions into the action-oriented field). Assert `expect(commandRegistry.size).toBeGreaterThan(0)` before the comparison loop — `commandRegistry` is populated by side-effect `registerCommand()` calls, so verify it is non-empty to prevent a trivially-passing test. Use the same import chain as `schema-output-accuracy.test.ts` to ensure registration side effects fire.
  6. Report mismatches with specific file paths and template strings

### Verification

Run `bun run test` — all existing tests still pass, new tests pass. Run `bun run check` (biome) — no lint errors in new files. The fitness test's transition reachability check ensures the derived registry stays in sync with both transition tables and command files.

## Phase 2: RPC Layer Integration

Wire `computeNextCommands()` into the RPC layer's `begin()`, `submit()`, and `complete()` functions, and add `nextCommands` to their result types. This is 3 integration points — command files need zero changes since they already pass the RPC result to `output()`. Error responses retain the existing `{ error: { code, message, detail? } }` shape — `nextCommands` is success-only.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run test` — all existing tests pass (baseline before changes)
- [ ] `grep -r "nextCommands" src/core/rpc/types.ts` — no matches (field not yet on result types)

**After implementation** (should pass / show presence):
- [ ] `bun run test` — all tests pass including new integration coverage
- [ ] `bun run check` — no lint errors
- [ ] `grep -r "nextCommands" src/core/rpc/types.ts` — shows field on `BeginResult`, `SubmitResult`, `CompleteResult`
- [ ] After `bun run build`: `echo '{"name":"test-nc","goal":"testing nextCommands"}' | $GP_BIN epic:create --json | jq '.nextCommands'` — returns object with `entity` and `other` arrays, both with length > 0

Note: Shell-based `$GP_BIN` verification requires `bun run build` first. Primary verification is via `bun run test` (faster, catches type errors).

### Tasks

- [ ] Update `src/core/rpc/types.ts`:
  - Import `NextCommands` from `./next-commands.js`
  - Add `nextCommands: NextCommands` (required, not optional) to `BeginResult`, `SubmitResult`, and `CompleteResult`. No backward compatibility concern — this is a new field with no existing consumers. `RollupResult` is a separate type and remains unchanged. Terminal statuses return `{ entity: [showCommand], other: [] }` (always both fields, always arrays — never omitted).
- [ ] Update `src/core/rpc/begin.ts` — in the `begin()` function, after computing the result, call `computeNextCommands()` with the target and new status, and include the result in the returned `BeginResult`
- [ ] Update `src/core/rpc/submit.ts` — same pattern in the `submit()` function for `SubmitResult`
- [ ] Update `src/core/rpc/complete.ts` — same pattern in the `complete()` function for `CompleteResult`
- [ ] **Exception**: `learning/rollup.ts` — uses `rpcRollup()` which returns `RollupResult`, not the standard trio. No change needed (rollup is excluded from nextCommands).
- [ ] **Edge cases to verify** (these are handled automatically by the RPC-layer approach since the RPC functions already have the target):
  - All 8 subagent submit commands (`submit-plan.ts`, `submit-refinement.ts`, `submit-implementation.ts`, `submit-explore.ts`, `submit-architecture.ts`, `submit-slices.ts`, `submit-refine-architecture.ts`, `submit-refine-slices.ts`) are `userFacing: false` in `commandToEvent` — they are invoked by skills, not directly by users, so they should not appear in `nextCommands` output. The RPC layer's `submit()` still computes `nextCommands` for them (the result reaches the skill's JSON output), but the submit commands themselves don't appear as suggested next steps.
  - `submit-plan.ts`, `submit-refinement.ts`, `submit-implementation.ts` handle both slice and quest — the RPC layer's `submit()` already receives the correct `Target`, so `entityType` is derived correctly
  - `task/convert.ts` produces a new entity — nextCommands should reflect the _resulting_ entity's status (the target passed to the RPC function)
  - `epic/add-verification.ts` and `epic/update-verification.ts` don't change status (`from === to` in transition table) — nextCommands will show commands available at that same status, which is correct
  - `decision/create.ts` and `decision/update.ts` — entityType is `"decision"`, entity identifier is `id` not `name`. Handled by `resolveEntityName(target)` which returns `target.id` for decision targets.

### Mutation File Inventory (37 total, 36 wired)

For reference, the 37 mutation command files that call `begin()`, `submit()`, or `complete()`:
- **begin (25)**: epic/{create,explore,define-architecture,refine-architecture,define-slices,refine-slices,activate,abandon,add-verification,update-verification}.ts, slice/{create,plan,refine-plan,implement,abandon}.ts, quest/{create,plan,refine-plan,implement,abandon}.ts, task/{create,convert,drop}.ts, decision/{create,update}.ts
- **submit (8)**: subagent/{submit-explore,submit-architecture,submit-slices,submit-refine-architecture,submit-refine-slices,submit-plan,submit-refinement,submit-implementation}.ts
- **complete (3)**: epic/complete.ts, slice/complete.ts, quest/complete.ts
- **Excluded (1)**: learning/rollup.ts — returns `RollupResult`, no status

### Verification

Run `bun run test` — all tests pass. Run `bun run check` — no lint errors. Build (`bun run build`) and spot-check 2-3 commands from different entity types to confirm `nextCommands` appears in `--json` output. Read-only commands (`show`, `list`, `status`) should NOT include `nextCommands`.

## Phase 3: End-to-End Validation & Documentation

Run a full lifecycle in a temp project verifying `nextCommands` at each step, then update architecture docs.

### Expected Behavior

**Before implementation** (verify Phase 2 integration is complete):
- [ ] `bun run build` — succeeds (prerequisite for E2E tests)
- [ ] `bun run test` — all tests pass including Phase 1 and Phase 2 additions
- [ ] `grep -r "nextCommands" src/core/rpc/begin.ts src/core/rpc/submit.ts src/core/rpc/complete.ts` — confirms all 3 RPC functions include nextCommands

**After implementation** (should pass / show presence):
- [ ] Full lifecycle test in temp project: `$GP_BIN init` → `echo '{"name":"e2e","goal":"test"}' | $GP_BIN epic:create --json` (verify `nextCommands.entity` includes `gp epic:explore --epic e2e`) → `$GP_BIN epic:explore --epic e2e --json` (verify) → `echo '' | $GP_BIN submit-explore --epic e2e --json` (verify) → continue through define-architecture → submit-architecture → define-slices → submit-slices → activate
- [ ] Read-only exclusion: `$GP_BIN epic:show --epic e2e --json`, `$GP_BIN status --json`, `$GP_BIN slice:list --json` — none include `nextCommands`
- [ ] Completed entity: complete an entity and verify terminal status returns empty/show-only `nextCommands.entity` and empty `nextCommands.other`
- [ ] Slice with parentEpic: create a slice under the epic and verify `--epic e2e` appears in interpolated commands

### Tasks

- [ ] Build the binary: `bun run build` (must be re-run after Phase 2 changes to include nextCommands in the binary). The built binary is at `./gp` in the project root.
- [ ] Create temp project with cleanup trap: `GP_BIN="<repo-root>/gp"` (use the absolute path to the repo's built binary, e.g., `/Users/.../goodplan/gp`). Then: `mkdir -p /tmp/gp-e2e-test && cd /tmp/gp-e2e-test && trap 'rm -rf /tmp/gp-e2e-test' EXIT && "$GP_BIN" init`. All E2E commands use `$GP_BIN` since `./gp` won't resolve in the temp directory.
- [ ] Run epic lifecycle: `epic:create` → `epic:explore` → `submit-explore` → `epic:define-architecture` → `submit-architecture` → `epic:define-slices` → `submit-slices` → `epic:activate`. At each step, capture `--json` output and verify `nextCommands` structure, interpolated names, and entity/other section contents
- [ ] Run slice lifecycle: `slice:create` → `slice:plan` → `submit-plan` → `slice:refine-plan` → `submit-refinement`. Verify `epic` interpolation in slice commands (derived from `target.epic`)
- [ ] Verify read-only exclusion for `show`, `list`, `status` commands
- [ ] Verify task commands: `task:create` → verify `nextCommands` includes `task:drop` and `task:convert`
- [ ] Verify quest creation: `quest:create` → verify `nextCommands`
- [ ] Verify decision commands: `decision:create` → verify `nextCommands` includes `decision:update`
- [ ] Verify `--query` works with `nextCommands`: `echo '{"name":"q-test","goal":"test"}' | $GP_BIN epic:create --json --query '.nextCommands.entity | length'` — returns a positive integer (confirms nested object traversal through `applyQuery`/`deterministicStringify`)
- [ ] Update `architecture/rpc-layer-api.md` — document `computeNextCommands()`, the derived `commandMappings` registry, and the `commandToEvent` mapping
- [ ] Update `architecture/commands-api.md` — document that `--json` output for all mutation commands now includes `nextCommands` with `entity` and `other` arrays
- [ ] Clean up temp project: `rm -rf /tmp/gp-e2e-test` (also handled by trap if tasks fail mid-run)

### Verification

All lifecycle checks pass. Every mutation response includes well-formed `nextCommands` with correctly interpolated entity names and appropriate entity/other sections. Read-only commands are clean. Architecture docs updated. Clean up temp project after validation.
