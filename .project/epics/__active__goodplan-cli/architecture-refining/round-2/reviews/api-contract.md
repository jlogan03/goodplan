# API Contract Review — Round 2

Reviewer focus: interface consistency, naming, ergonomics, error contracts across CLI commands and inter-subsystem APIs. Special attention to whether Round 1 CRITICAL issues were resolved.

## Round 1 Resolution Check

### CRIT-1 (Command surface inconsistency): RESOLVED
The editor chose entity-namespaced commands (`slice:plan`, `epic:explore`) and created a new decision (`entity-namespaced-commands.md`) superseding the old `command-surface-conventions.md`. commands-api.md now consistently uses entity-namespaced verbs throughout. flows.md has been updated to match (e.g., `goodplan slice:plan --slice 01-auth`). The RPC layer retains its generic `begin(phase, target)` internal API, with commands-api.md providing an explicit command-to-StateEvent mapping table. This is clean — the command surface is entity-oriented while the internal dispatch remains phase-generic.

### CRIT-2 (`--inline` naming): RESOLVED
All files now consistently use `--inline`. The global flags table correctly shows `--inline` as `boolean or number`. The `WorkflowOptions` interface uses `inlineContext` (camelCase for the TS property — appropriate). conventions.md, commands-api.md, and rpc-layer-api.md all agree.

## New Issues

### IMPORTANT-01: `quest:plan` and `quest:implement` missing from quest lifecycle listing but `quest:refine-plan` is present
**Severity:** IMPORTANT
**File:** `architecture/commands-api.md`

The quest lifecycle section shows `quest:plan` and `quest:refine-plan` but the command-to-StateEvent mapping table has `quest:plan` mapping to `BEGIN_PLAN (quest variant)`. However, there is no `quest:implement` command listed in the quest lifecycle section, yet slices have `slice:implement`. Quests that need implementation have no command path. If quests intentionally skip implementation (they're research/exploration), this should be stated explicitly.

### IMPORTANT-02: `learning:rollup` and `decision:create`/`decision:update` don't follow the entity-namespace pattern consistently
**Severity:** IMPORTANT
**File:** `architecture/commands-api.md`

Under "Cross-cutting" commands:
- `learning:rollup` uses entity namespace but is a workflow mutation (rolls up learnings across scopes). It has no StateEvent mapping in the table — `ROLLUP_LEARNINGS` exists in the state machine but the command-to-event table omits it.
- `decision:create` and `decision:update` also lack StateEvent mappings. Decisions are entities, but do they go through the state machine? If they bypass it (like resource commands), they should be in the `resource:` namespace. If they mutate state, they need events.

This creates ambiguity about whether cross-cutting commands follow the "all mutations go through the state machine" invariant (INV-001).

### IMPORTANT-03: Sub-agent `start-*`/`submit-*` commands are global (no namespace) while entity commands are namespaced — inconsistent routing story
**Severity:** IMPORTANT
**File:** `architecture/commands-api.md`

Sub-agent commands (`start-plan`, `submit-plan`, `start-explore`, etc.) are global commands with no namespace. But they perform entity-scoped operations (they accept `--slice`, `--epic`, `--quest`). The architecture says `submit-*` commands write lifecycle-bound markdown "through the Data Layer with state validation" but "do NOT trigger state transitions."

If `submit-*` writes go through the Data Layer with state validation but bypass the state machine, this is a controlled exception to INV-001. The text acknowledges the split (orchestrator calls entity commands to advance state) but the routing story in the overview ("Resource commands bypass RPC, workflow commands go through RPC") doesn't mention this third path. Where do `submit-*` commands route? Directly to Data Layer? Through RPC without calling `reduce()`?

### IMPORTANT-04: `epic:add-verification` and `epic:update-verification` have StateEvents but no command-to-event mapping in the table
**Severity:** IMPORTANT
**File:** `architecture/commands-api.md`, `architecture/state-machine-api.md`

The epic lifecycle listing shows `epic:add-verification` and `epic:update-verification`. The state machine has `ADD_VERIFICATION` and `UPDATE_VERIFICATION` events. But the command-to-StateEvent mapping table omits both. This table is the contract between Commands and State Machine — gaps undermine its value.

### MINOR-01: `context` global command overlaps with `start-*` sub-agent commands
**Severity:** MINOR
**File:** `architecture/commands-api.md`

`goodplan context <phase> --slice <name> [--inline]` and `goodplan start-plan --slice <name> [--inline]` appear to do the same thing — both are "read-only context bundles for a phase." The description says `start-*` returns "context bundles for the sub-agent's phase (equivalent to `context <phase>` but with the sub-agent's perspective)." What distinguishes them? If `start-*` is just `context` with a different perspective, document the difference. If they're identical, consider removing the redundancy.

### MINOR-02: `--override` flag appears in epic lifecycle but not in command-to-event table or state machine
**Severity:** MINOR
**File:** `architecture/commands-api.md`, `architecture/state-machine-api.md`

`epic:refine-architecture --epic <name> [--override]` and `epic:refine-slices --epic <name> [--override]` show `--override`. The data model mentions `maxRounds` circuit breaker for slice refinement. But the state machine events (`BEGIN` with phase parameter) have no `override` field. How does `--override` reach the state machine? Is it a guard parameter?

### MINOR-03: Flows.md `slice:complete` stdin example uses `rollup: true` instead of `rollupTo`
**Severity:** MINOR
**File:** `architecture/flows.md`

The completion flow example shows stdin JSON with `"learnings": [{ ..., "rollup": true }]`. But the canonical `Learning` type in rpc-layer-api.md uses `rollupTo: ('epic' | 'project')[]`. The transformation is now documented (rpc-layer-api.md explains how `rollupTo` maps to stored `rollup`), but the flow example should use the input shape (`rollupTo`), not the stored shape (`rollup`).

### MINOR-04: `slice:refine-plan` has `--override` but `quest:refine-plan` does not
**Severity:** MINOR
**File:** `architecture/commands-api.md`

`slice:refine-plan --slice <name> [--override]` shows the override flag. `quest:refine-plan --quest <name>` does not. If quests also have refinement loops with circuit breakers, they need `--override` too. If not, document why quests differ.

## Score: 8/10

The Round 1 CRITICALs are fully resolved. The command surface is now consistent and well-documented — the entity-namespaced pattern is clear, the decision trail is clean, and the command-to-StateEvent mapping table is a strong contract artifact. The `--inline` naming is consistent everywhere. The Learning type now has a documented canonical form with transformation documentation. Context bundling is properly described as an internal module within RPC. `Phase` and `Target` types are defined. The guard return type is cleaned up. Refinement tracking and architecture deltas are in the data model.

The remaining issues are about completeness of the mapping table (verification commands, cross-cutting commands, override mechanism) and routing clarity for sub-agent commands. These are Important because they affect implementability — a developer reading the architecture needs to know how every command routes — but they're bounded gaps, not structural disagreements.

To reach 9+: (1) Complete the command-to-StateEvent mapping table (add verification commands, cross-cutting commands). (2) Clarify the routing path for `submit-*` commands in the overview and commands-api.md. (3) Decide whether `decision:create`/`decision:update` are state machine mutations or data-only writes. (4) Fix the flows.md Learning example to use `rollupTo`.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
