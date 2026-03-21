# Software Architecture Review — Round 3

## Round 2 Resolution Assessment

### IMPORTANT: `reduce()` signature inconsistency: RESOLVED

flows.md no longer contains any three-argument reducer call. All reduce calls use the two-argument `(state, event)` form. The event carries its full payload in the discriminated union. The `flows.md` completion flow example shows `reduce(state, { type: 'COMPLETE_SLICE', slice: '01-auth', ...input })` — correct.

### IMPORTANT: `submit-*` write scope ambiguous: RESOLVED

The sub-agent commands section now precisely specifies: `submit-*` commands route through the RPC Layer and trigger state events. The mapping table lists the specific event each `submit-*` triggers. The note "The RPC layer handles both content write (via Data Layer) and state transition (via State Machine) in a single `commitState` call" removes the ambiguity about what "state validation" means — the slice must be in the correct status or the reducer returns an error that aborts the commit.

### IMPORTANT: Epic phase commands mapped to unspecified generic BEGIN events: RESOLVED

The command-to-StateEvent mapping table now lists per-phase events for all epic commands: `epic:explore → BEGIN_EXPLORE`, `epic:define-architecture → BEGIN_ARCHITECTURE`, `epic:refine-architecture → BEGIN_REFINE_ARCHITECTURE`, `epic:define-slices → BEGIN_SLICING`, `epic:refine-slices → BEGIN_REFINE_SLICES`. All events in the table exist in the `StateEvent` discriminated union. The "starting point" hedge is gone.

### IMPORTANT: `--override` not connected to state machine: RESOLVED

`COMPLETE_REFINEMENT_ROUND`, `COMPLETE_REFINE_ARCHITECTURE`, `COMPLETE_REFINE_SLICES`, and `COMPLETE_QUEST_REFINEMENT_ROUND` now carry `override?: boolean` in the discriminated union. An explicit note in state-machine-api.md states that when `override` is `true`, the score threshold guards are bypassed. INV-001 compliance maintained — the state machine is the sole enforcer of override semantics.

### MINOR: `src/commands/build/` in conventions: RESOLVED

The `build/` directory is no longer listed in the `src/commands/` repo structure in conventions.md.

### MINOR: Quest lifecycle missing implement events: RESOLVED

The `StateEvent` union now includes `BEGIN_QUEST_PLAN`, `COMPLETE_QUEST_PLAN`, `BEGIN_QUEST_REFINEMENT`, `COMPLETE_QUEST_REFINEMENT_ROUND`, `BEGIN_QUEST_IMPLEMENTATION`, `COMPLETE_QUEST_IMPLEMENTATION`. Quest lifecycle fully mirrors slice lifecycle.

### MINOR: `context` command routing unclear: RESOLVED

The standalone `context` command has been removed. The architecture states explicitly: "There is no standalone `context` command. Sub-agents get context via `start-*` commands. The orchestrator uses `status`." The routing ambiguity is gone because the command no longer exists.

### MINOR: State cache version invalidation undocumented: RESOLVED

`loadState()` documents "on cache miss or version mismatch, falls back to `assembleState()`." This is sufficient for the architecture specification level — implementation details of the version token can be decided during the slice that implements the cache.

---

## New Issues

### IMPORTANT: COMPLETE_SLICING and COMPLETE_REFINE_SLICES have no command surface trigger (2x weight)

**Files:** `commands-api.md`, `state-machine-api.md`

The state machine defines `COMPLETE_SLICING` (epic transitions out of defining-slices phase) and `COMPLETE_REFINE_SLICES` (epic transitions out of refining-slices phase). Neither appears in the command-to-event mapping table. There is no `submit-slices` sub-agent command. `epic:define-slices` maps to `BEGIN_SLICING` but there is no corresponding command to advance past slicing. The `start-*`/`submit-*` surface has `start-architecture`/`submit-architecture` for the architecture phase, `start-explore`/`submit-explore` for explore, but nothing for slicing.

This is not a documentation gap — it means the slicing phase cannot be completed via the CLI. The LLM performing slicing has no way to signal completion. Either `submit-slices` / `start-slices` commands are needed, or `COMPLETE_SLICING` should be triggered by `epic:define-slices` directly (i.e., slicing is not a two-step begin/submit but a single synchronous command). The architecture must resolve which model applies.

The same issue exists for `COMPLETE_REFINE_ARCHITECTURE`: `submit-architecture` maps to `COMPLETE_ARCHITECTURE` only. When `epic:refine-architecture` transitions to `BEGIN_REFINE_ARCHITECTURE`, there is no sub-agent command to submit the refined architecture. `submit-architecture` would conflict because the slice is in a different status than after `BEGIN_ARCHITECTURE`. A `submit-refine-architecture` command is missing, or `submit-architecture` needs to work for both states.

### IMPORTANT: `quest.json` data model missing `refinement` field (2x weight)

**Files:** `data-model.md`, `state-machine-api.md`

`slice.json` has a `refinement` field (`round`, `maxRounds`, `scoreHistory`) to support `COMPLETE_REFINEMENT_ROUND`. The `StateEvent` union includes the same events for quests: `BEGIN_QUEST_REFINEMENT`, `COMPLETE_QUEST_REFINEMENT_ROUND` (with `scores` and `override`). But `quest.json` has no `refinement` field. The circuit breaker (`maxRounds`) and score history that the state machine needs to enforce refinement rules have nowhere to live for quests.

### IMPORTANT: Quest `architecture-deltas.jsonl` absent from data model (2x weight)

**Files:** `data-model.md`, `state-machine-api.md`

`COMPLETE_QUEST` carries `architectureDelta: ArchitectureDelta[]`, matching the slice completion contract. But the directory structure in `data-model.md` shows no `architecture-deltas.jsonl` under `quests/<name>/`. Slices have it explicitly. The state machine needs a target path to write quest architecture deltas to on `COMPLETE_QUEST`, and the schema/storage section should reflect it. This is a concrete storage gap, not a documentation inconsistency — the RPC layer would have nowhere to route quest architecture deltas.

### MINOR: `start-slices` / `start-refine-architecture` absent from sub-agent command surface

**Files:** `commands-api.md`

The sub-agent command surface has `start-explore`, `start-architecture`, `start-plan`, `start-refinement`, `start-implementation`. Phases that have a sub-agent doing work (explore, architecture, plan, refinement, implementation) all have `start-*` commands for context bundling. The slicing and refine-architecture phases also have sub-agents doing work (the LLM defines and refines slices, the LLM refines architecture). These phases are missing corresponding `start-slices` and `start-refine-architecture` commands. Without them, sub-agents working these phases have no way to get a context bundle.

This is a minor issue only if the `submit-*` gap above is resolved by merging these into single synchronous commands; if `submit-slices`/`submit-refine-architecture` are added, `start-slices`/`start-refine-architecture` should accompany them.

### MINOR: `rpc-layer-api.md` `Phase` type missing completion phases

**File:** `rpc-layer-api.md`

The `Phase` type lists `'define-slices'`, `'refine-slices'`, `'refine-architecture'`, but no completion counterparts. The `complete(phase, target, input, options)` RPC function would need to know how to handle "complete-slicing" vs "complete-refine-slices" to dispatch the right event. As the `Phase` type stands, these completion calls would need to be inferred from the entity's current status — possible but fragile. Adding explicit completion phase values or documenting the dispatch rule would close this.

---

## Score: 8.5/10

All four round-2 IMPORTANT issues are fully resolved. The architecture has significantly improved from round 1 (5-7) to round 2 (8) and remains at 8.5 now with the new gaps identified.

Core strengths remain solid and have not regressed: pure state machine with clean two-argument reducer, complete discriminated union with per-event payloads and `override` fields, context bundling as an explicitly bounded internal module, unified state object with key dependency table, clear data ownership (JSON/CLI-owned vs markdown/LLM-owned), and an internally consistent four-layer dependency model.

The most significant new finding is the incomplete command surface for the slicing and refine-architecture phases — these are whole workflow phases with no way to signal completion via the CLI. This is a gap that would surface immediately during implementation. The quest data model is also incomplete for refinement and architecture delta storage.

To reach 9+: add `submit-slices` (and `submit-refine-architecture` or clarify `submit-architecture` handles both architecture states), add `refinement` field to `quest.json`, add `architecture-deltas.jsonl` to the quest directory structure, and resolve the `Phase` type completeness or document the dispatch rule.

## Summary

- Critical: 0
- Important: 3
- Minor: 2
