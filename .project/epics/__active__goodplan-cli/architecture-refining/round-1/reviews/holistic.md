# Holistic Architecture Review

## Issues

### IMPORTANT-1: Command surface inconsistency between commands-api.md and decision + design spec
**File:** `architecture/commands-api.md`
**Resolution:** Reconcile command naming across files

The commands-api.md uses `goodplan epic:create`, `goodplan slice:plan`, etc. The design spec uses space-separated `goodplan epic create`, `goodplan slice list`. The command-surface-conventions decision says colon-namespaced (`epic:`, `build:`, `resource:`). The flows.md uses yet another form: `goodplan begin plan --slice` (verb-first without namespace).

The architecture needs to settle on ONE command syntax and use it consistently across all files. Currently an implementer would have to guess which form is canonical. The commands-api.md appears to be the most detailed and intentional, but flows.md contradicts it.

### IMPORTANT-2: `begin`/`complete` commands not in commands-api.md entity namespaces
**File:** `architecture/commands-api.md`, `architecture/flows.md`
**Resolution:** Add workflow verb commands or clarify routing

The flows.md describes `goodplan begin plan --slice 01-auth` and `goodplan complete --slice 01-auth` as the primary workflow commands. But commands-api.md lists `slice:plan`, `slice:complete` etc. under entity namespaces. These are different command surfaces. The RPC layer description and the orchestrator-subagent-split decision describe `begin`/`complete`/`context`/`status` as the orchestrator's vocabulary, but these don't clearly appear in the commands-api.md command listing. The `context` and `status` commands appear under Global Commands, but `begin` and `complete` do not.

Either the entity namespace commands ARE the `begin`/`complete` equivalents (in which case flows.md needs updating), or `begin`/`complete` are separate global workflow commands (in which case commands-api.md needs them listed).

### IMPORTANT-3: `start-*`/`submit-*` sub-agent commands missing from architecture
**File:** `architecture/commands-api.md`
**Resolution:** Add sub-agent commands or explicitly defer them

The command-surface-conventions decision and the orchestrator-subagent-split decision both describe `start-<action>`/`submit-<action>` commands for sub-agents. These are a core part of the context-efficient design (sub-agents write results directly to CLI, orchestrator stays compact). But commands-api.md has no mention of these commands. Neither does any other architecture file.

This is a significant gap: the sub-agent interaction pattern is a key design element from the decisions, and the architecture doesn't specify how it works.

### IMPORTANT-4: `write-<field>` commands missing from architecture
**File:** `architecture/commands-api.md`
**Resolution:** Add or explicitly defer

The design spec describes `goodplan <entity> write-<field>` commands (e.g., `goodplan slice write-plan 01-auth`, `goodplan slice write-goal`) as the mechanism for LLM content writes with state bookkeeping. These don't appear in commands-api.md. The data-model.md mentions `plan.md` in the directory structure but doesn't explain how it gets written.

The conventions.md says "Lifecycle-bound markdown (goals, plans) is written through CLI `write-<field>` commands with state validation" but the commands-api.md doesn't list these commands.

### IMPORTANT-5: Refinement loop tracking absent from state machine
**File:** `architecture/state-machine-api.md`
**Resolution:** Add refinement tracking to state model and events

The cli-as-workflow-engine decision says the CLI owns "refinement loop tracking (round numbers, score history, trend detection), circuit breakers, implementation phase/iteration counting." The state-machine-api.md shows `COMPLETE_REFINEMENT_ROUND` with scores but there's no corresponding data in the data model for storing round counts, score history, or circuit breaker state. The `slice.json` example has no refinement fields. Where does the refinement round count live? Where is score history stored?

### IMPORTANT-6: Architecture delta / structured architecture updates dropped from data model
**File:** `architecture/data-model.md`
**Resolution:** Add architecture update proposal tracking or explain its removal

The design spec describes structured architecture update proposals as JSON metadata in entity files (`{ subsystem, type, description, rationale, status }`). The `COMPLETE_SLICE` event in state-machine-api.md accepts `architectureDelta: ArchitectureDelta[]`. But the data model's `slice.json` example doesn't include architecture deltas, and there's no schema showing where they're stored. The incremental-architecture-updates decision says project-level architecture is updated on every completion, and the RPC layer returns architecture paths, but the structured tracking described in the spec appears lost.

### IMPORTANT-7: `goal.md` missing from data model directory structure
**File:** `architecture/data-model.md`
**Resolution:** Add goal.md or clarify where goals live

The design spec has `goal.md` per slice/quest/epic. The data-model.md directory structure shows `plan.md` for slices and quests but no `goal.md`. Yet the epic.json has a `goal` field (string in JSON). Are goals stored as JSON fields or as markdown files? The flows.md references "slice goal" as context content. The _overview.md says "Lifecycle-bound markdown (goals, plans) is written through CLI `write-<field>` commands." This needs to be resolved: either goals are JSON fields in entity.json (current data model implies this for epics) or markdown files (spec implies this).

### MINOR-1: `plan-refining.md` and `plan-refined.md` missing from data model
**File:** `architecture/data-model.md`
**Resolution:** Add or clarify plan lifecycle files

The design spec describes `plan-refining.md` (working copy during refinement) and `plan-refined.md` (final output). The data model directory structure only shows `plan.md`. Since the state machine has refinement events, the plan file lifecycle should be documented.

### MINOR-2: `GOODPLAN_DIR` environment variable not mentioned in architecture
**File:** `architecture/conventions.md`
**Resolution:** Add to conventions or data-layer-api.md

The project conventions.md mentions `GOODPLAN_DIR` overrides the default `.project/` location. The data-layer-api.md doesn't mention this, meaning an implementer might hardcode `.project/`.

### MINOR-3: Fitness functions are all "candidate" with no prioritization
**File:** All architecture files
**Resolution:** Prioritize which fitness functions to implement first

Every fitness function is marked "candidate -- not yet written." This is appropriate for experimental maturity, but there should be a note about which ones are highest priority for the first slices. The state machine purity check (INV-003) and the deterministic JSON round-trip (INV-002) are easy wins that would catch regressions early.

### MINOR-4: `--verbose` flag missing from global flags table
**File:** `architecture/commands-api.md`
**Resolution:** Add if planned

The conventions.md mentions `--verbose` for stderr diagnostics, but commands-api.md's global flags table doesn't list it.

### MINOR-5: `--override` flag for refinement not reflected in architecture
**File:** `architecture/commands-api.md`, `architecture/state-machine-api.md`
**Resolution:** Add override mechanism

The command-surface-conventions decision specifies an `--override` flag on refinement `complete` to accept despite scores not meeting threshold. This isn't reflected in commands-api.md or the state machine events.

## Score: 6/10

The architecture has strong structural bones: the four-layer decomposition is clean, the state machine purity invariant is well-defended, the data ownership split (JSON vs markdown) is clear, and the reducer pattern is well-specified. The fitness functions and invariants are thoughtful.

However, there are significant completeness gaps between the architecture files and the decisions/design spec they're supposed to implement. The command surface is inconsistent across files (IMPORTANT-1, IMPORTANT-2), key interaction patterns from the decisions are missing (IMPORTANT-3: sub-agent commands, IMPORTANT-4: write commands), and the data model has gaps for features the state machine references (IMPORTANT-5: refinement tracking, IMPORTANT-6: architecture deltas, IMPORTANT-7: goals).

To reach 9+: (1) Resolve the command surface to one consistent form across all files. (2) Either add the missing sub-agent and write-field commands or explicitly document they're deferred with rationale. (3) Complete the data model to cover all fields the state machine and RPC layer reference (refinement state, architecture deltas, goals). (4) Ensure flows.md uses the same command syntax as commands-api.md.

## Summary
- Critical: 0
- Important: 7
- Minor: 5
