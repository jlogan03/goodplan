# Software Architecture Review — Round 2

## Round 1 Resolution Assessment

### CRIT-1 (Command surface inconsistency): RESOLVED
The architecture now consistently uses entity-namespaced commands (`epic:create`, `slice:plan`, `quest:complete`) across all files. A new decision (`entity-namespaced-commands.md`) formally supersedes the old command-surface-conventions pattern. `flows.md` has been updated to match. The command-to-StateEvent mapping table in `commands-api.md` is clear and comprehensive. Sub-agent commands (`start-*`/`submit-*`) are now documented.

### CRIT-2 (`--inline` flag naming): RESOLVED
All files consistently use `--inline`. The parsing strategy is clarified: boolean `true` for default budget, numeric value for override. `WorkflowOptions` interface matches.

### IMP-1 (Sub-agent commands missing): RESOLVED
`start-*` and `submit-*` commands are documented in commands-api.md with clear signatures and the split responsibility (state transitions remain with orchestrator entity commands).

### IMP-2 (`write-<field>` missing): RESOLVED
Mapped to `submit-*` commands. Overview now correctly says "Lifecycle-bound markdown (goals, plans) is written through CLI `submit-*` commands with state validation."

### IMP-3 (RPC layer too wide): RESOLVED
Context bundling is explicitly described as an internal module within the RPC layer (`src/core/context/`), with its own concern boundary and change reasons documented.

### IMP-4 (`Phase` and `Target` undefined): RESOLVED
Both types are now defined as TypeScript types in `rpc-layer-api.md`.

### IMP-5 (Learning schema inconsistency): RESOLVED
Canonical `Learning` type defined in `rpc-layer-api.md`. Data model documents the stored form with `source` and `rollup` fields and explains the transformation.

### IMP-6 (`CompleteInput` missing `architectureDelta`): RESOLVED
`architectureDelta` is now in `CompleteInput`.

### IMP-7 (Commands don't map to state events): RESOLVED
Mapping table added to commands-api.md. Epic phase commands dispatch to generic `BEGIN`-style events with a phase parameter — documented explicitly.

### IMP-8 (State key dependencies undocumented): RESOLVED
State key dependency table added to state-machine-api.md showing reads/writes per event type.

### IMP-9 (Guard return type): RESOLVED
Guard signature changed to `true | 'skip' | StateError`. Example code updated to match.

### IMP-10 (Refinement tracking): RESOLVED
`refinement` field added to `slice.json` with `round`, `maxRounds`, `scoreHistory`. Circuit breaker documented.

### IMP-11 (Architecture delta storage): RESOLVED
`architecture-deltas.jsonl` documented per-slice in data model with schema example.

### IMP-12 (Goal storage inconsistency): RESOLVED
Goals stored as string fields in entity JSON. Documented explicitly with rationale.

### IMP-13 (Atomicity story): RESOLVED
`flows.md` now documents non-atomic multi-file writes, write ordering (entity JSON first, JSONL second, cache last), and recovery via reassembly. No longer implies full atomicity.

### IMP-14 (stdin behavior): RESOLVED
TTY detection, empty-stdin behavior, max size (1 MB) documented in commands-api.md.

### IMP-15 (Color behavior): RESOLVED
Documented in conventions.md under "Color Behavior" — `NO_COLOR`, TTY detection, `--json` interaction.

### IMP-16 (`--query` error behavior): RESOLVED
Exit codes defined: exit 2 for invalid expression, exit 0 with `null` for empty result, array for multiple results.

### IMP-19 (`--verbose` missing): RESOLVED
Added to global flags table.

---

## New Issues

### IMPORTANT: `reduce()` signature inconsistency between state-machine-api.md and other files (2x weight)
**File:** `state-machine-api.md`, `flows.md`, `rpc-layer-api.md`

The state machine defines `reduce(state, event)` as a two-argument function where the event is a discriminated union carrying its own payload. This is clean. However, `flows.md` line "pass `(state, event, input)` to State Machine" shows a three-argument call. The roll-your-own-state-machine decision also says `(state, event, context) -> (new state, new context | error)` with a "context" parameter. The state-machine-api.md correctly has just `(state, event) -> state | error` with no separate context argument.

The flows.md reference to `(state, event, input)` should be `(state, event)` since the event union already carries the input payload. The decision's "context" parameter appears to be a leftover from early design. These are minor documentation drift, but they create confusion about the actual reducer contract at the most critical module boundary.

### IMPORTANT: `submit-*` commands write scope is ambiguous (2x weight)
**File:** `commands-api.md`

The sub-agent commands section says `submit-*` commands "write lifecycle-bound markdown (goals, plans) through the Data Layer with state validation." But what "state validation" means is unclear. Does `submit-plan` check that the slice is in `planning` status before accepting the plan? If so, it reads state (via the Data Layer or RPC Layer?), which means `submit-*` commands have a dependency on the State Machine for validation even though they don't trigger transitions. The routing rule (resource commands -> Data Layer, mutations -> RPC Layer) doesn't clearly categorize `submit-*` commands since they write data but don't transition state.

The architecture should specify: (a) what layer `submit-*` commands route to, (b) what "state validation" means concretely (status check? schema validation only?), and (c) whether `submit-*` commands can fail due to entity being in the wrong state.

### IMPORTANT: Epic phase commands map to unspecified generic BEGIN events
**File:** `commands-api.md`, `state-machine-api.md`

The command mapping table shows `epic:explore` mapping to "BEGIN with phase=explore (generic)" and similar for other epic phases. But the `StateEvent` discriminated union in state-machine-api.md has no generic `BEGIN` event type. It has specific events like `ACTIVATE_EPIC`, `CREATE_EPIC`, etc. Either the event union needs a generic `{ type: 'BEGIN_PHASE'; entity: string; phase: Phase }` variant, or the mapping table should reference the specific events that actually exist.

The note "This list is a starting point -- gaps will be identified and filled during slice planning" is honest but means the state machine's event union is incomplete as specified. The command surface promises capabilities the state machine can't yet handle.

### IMPORTANT: `--override` flag mechanism not connected to state machine
**File:** `commands-api.md`, `state-machine-api.md`

`--override` appears on `epic:refine-architecture`, `epic:refine-slices`, and `slice:refine-plan` commands. The data model documents `maxRounds` as a circuit breaker. But the state machine API doesn't show how `--override` flows through — there's no override field on `COMPLETE_REFINEMENT_ROUND` or any other event. The guard that checks `round >= maxRounds` has no mechanism to be bypassed. Either the event needs an `override: boolean` field, or the RPC layer needs to handle this before calling reduce (but that would put business logic in the RPC layer, violating the "orchestration only" contract).

### MINOR: `src/commands/build/` directory in conventions.md has no corresponding commands
**File:** `conventions.md`, `commands-api.md`

The repo structure shows `src/commands/build/` but no `build:*` commands appear in commands-api.md. This may be a leftover from a previous design iteration. If no build commands exist, remove the directory from the structure. If they're planned, note them.

### MINOR: Quest lifecycle missing `implement` event in state machine
**File:** `state-machine-api.md`, `commands-api.md`

`quest:implement` appears in the quest lifecycle commands, but the StateEvent union has no implementation-related event for quests. Quests go `CREATE_QUEST -> BEGIN_QUEST -> COMPLETE_QUEST`. The quest lifecycle in commands-api.md shows `quest:plan`, `quest:refine-plan`, `quest:implement` but the state machine only has create/begin/complete/abandon. Either quests don't have plan/refine/implement phases (simplify the command surface), or the state machine events are incomplete.

### MINOR: `context` command routing unclear
**File:** `commands-api.md`

`context` is a global read-only command. The routing rules say resource/read-only commands go to the Data Layer, but `context` assembles a ContextBundle which is defined as an RPC Layer responsibility. The command likely routes to the RPC Layer (which delegates to its context module), but this contradicts the simple "read-only -> Data Layer" routing principle. Worth a clarifying note.

### MINOR: State cache invalidation on schema version changes
**File:** `data-model.md`

The state cache mentions "version mismatch" as a cache invalidation trigger in `loadState()`, but the cache format and versioning strategy aren't specified. After a CLI upgrade that changes entity schemas, what invalidates the cache? If the cache contains the old schema version's data, Zod validation on cache read should catch it, but this pathway should be documented.

---

## Score: 8/10

Round 1 identified 2 critical and 19 important issues. All critical issues are fully resolved. All 17 important issues that were directly actionable are resolved. The architecture is now internally consistent on command naming, flag conventions, type definitions, data model completeness, and module boundaries.

The remaining issues are lower severity than round 1. The most significant are: (1) the generic `BEGIN` event type referenced by commands but missing from the state machine event union -- this is a real gap between the command surface and the state machine contract; (2) `submit-*` command routing and validation semantics are underspecified at a boundary that matters for module depth; (3) `--override` has no mechanism to flow through the state machine; and (4) documentation drift in flows.md on the reducer signature.

The architecture's core strengths remain solid: clean four-layer separation, pure state machine, well-defined data ownership, unified state object with explicit key dependencies, and the context bundling internal boundary. The entity-namespaced command pattern is a clear improvement over the original design.

To reach 9+: resolve the BEGIN event gap (either add the generic event to the union or add specific events for each epic phase), specify `submit-*` routing and validation, and connect `--override` to the state machine contract.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
