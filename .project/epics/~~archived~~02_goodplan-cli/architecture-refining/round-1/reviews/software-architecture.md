# Software Architecture Review

## Issues

### IMPORTANT: Command naming inconsistency between architecture files and decisions
**File:** `commands-api.md`, `flows.md`
**Resolution:** Revise commands-api.md and flows.md to use consistent naming

The decision `2026-03-20-command-surface-conventions` defines the command surface as colon-namespaced (`epic:create`, `slice:plan`) with orchestrator verbs (`begin`, `status`, `context`, `complete`, `abandon`) and sub-agent verbs (`start-*`, `submit-*`). The commands-api.md partially follows this but the flows.md file uses a different convention: `goodplan begin plan --slice 01-auth`, `goodplan complete --slice 01-auth`, `goodplan epic start --epic goodplan-cli`. These don't match the colon-namespaced pattern from the decision or the entity-namespaced pattern in commands-api.md. The architecture needs to pick one style and use it consistently across all files.

Additionally, the orchestrator-subagent decision describes `start-*`/`submit-*` commands for sub-agents, but these don't appear anywhere in commands-api.md. The `context` command appears as a global command, but the decision implies sub-agents use it alongside `start-*`/`submit-*`. This gap means the sub-agent contract from the decision is unrepresented in the architecture.

### IMPORTANT: RPC Layer is doing too much — module depth concern (2x weight)
**File:** `rpc-layer-api.md`, `_overview.md`
**Resolution:** Evaluate splitting context bundling into its own internal module within the RPC layer, or make the boundary explicit

The RPC Layer owns: state hydration, state machine invocation, state writing, activity logging, context bundling (with budget-based inlining and per-phase priority tables), implicit transition detection, and completion flow ordering. The overview acknowledges "RPC Layer has the most responsibility" but doesn't address this structurally.

Context bundling is a distinct concern with its own data (priority tables per phase, budget calculation, content reading) that happens to be invoked through the RPC layer. Collapsing it into the RPC layer creates a module that's wide rather than deep — it handles orchestration AND content assembly, two concerns that change for different reasons. The per-phase priority table in rpc-layer-api.md is already a sign of a separate concern wanting its own boundary.

This doesn't necessarily need a new top-level layer, but the architecture should acknowledge this internal boundary explicitly. The `src/core/context/` directory in conventions.md suggests this was already anticipated — the architecture files should describe it.

### IMPORTANT: Unified state object has scaling concerns that affect module depth (2x weight)
**File:** `data-model.md`, `data-layer-api.md`
**Resolution:** Document the growth characteristics and consider whether the state machine needs the full state object

The `ProjectState` interface is keyed by relative file path, meaning it grows with every entity created. A project with 5 epics, 30 slices, and 10 quests would have ~50+ top-level keys. The state machine receives the entire object on every `reduce()` call, even though most transitions touch only 2-3 entities.

This is a module depth issue: the state machine's interface accepts a maximally wide input (`ProjectState`) when it only needs a narrow slice. The reducer pattern is sound, but the contract between RPC and State Machine should document which parts of state each event type actually reads. This would enable future optimizations (partial loading) and makes the dependency between events and state keys explicit rather than implicit.

### IMPORTANT: Guard mechanism uses error-as-control-flow pattern (2x weight)
**File:** `state-machine-api.md`
**Resolution:** Redesign guard return type to separate "skip to next row" from "transition rejected"

The transition table example shows guards returning `{ code: 'STATE_GUARD_SKIP', message: '' }` to indicate "this row doesn't match, try the next one." This overloads the `StateError` type for control flow, making the guard's three possible outcomes (allow, skip, reject) ambiguous. A caller reading a guard function can't immediately tell whether a `StateError` return means "transition is invalid" or "try the next row."

This creates friction at the module boundary: anyone implementing a guard must understand that `StateError` has dual semantics. A cleaner interface would use a discriminated return type: `true | 'skip' | StateError`.

### IMPORTANT: `commitState` is not atomic but architecture implies it is (2x weight)
**File:** `data-layer-api.md`, `flows.md`
**Resolution:** Clarify the partial-write recovery story more prominently

The data-layer-api.md acknowledges non-transactional multi-file writes in the "Atomic Writes" contract section, and describes the recovery mechanism (state cache written last, full reassembly reconciles). However, the flows.md file describes state transitions as if they're atomic ("If the State Machine returns an error at step 4, nothing is written. No partial state updates.") and "diff old state vs new state, write only changed files" — which implies atomicity for the success path too.

The recovery story (cache miss triggers reassembly) is reasonable but deserves more prominence since it's a critical correctness property. What happens if `commitState` crashes after writing `slice.json` but before writing `activity-log.jsonl`? The state machine would see a completed slice with no activity record. Document whether this is acceptable or whether ordering constraints on writes matter.

### MINOR: Resource commands naming doesn't match decision
**File:** `commands-api.md`
**Resolution:** Align resource namespace with decision

The decision says `resource:epic list`, `resource:slice show`, etc. The commands-api.md uses `resource:epic list` which matches. But the decision also specifies colon namespacing as the primary pattern. Verify `resource:` is the intended prefix or if it should be `resource:epic:list` (double colon). The current single-colon-then-space pattern (`resource:epic list`) treats "epic" as a subcommand, not a namespace component. This is fine but should be explicitly called out as an exception to the colon-namespace pattern.

### MINOR: Missing `explore` and `architecture` phase commands in commands-api.md
**File:** `commands-api.md`
**Resolution:** Add missing phase commands or document why they're excluded

The RPC layer's context priority table lists `explore`, `architecture`, and `slices` phases, but commands-api.md has no corresponding commands for these phases. `epic:explore` and `epic:define-architecture` exist, but the generic `begin`/`complete` orchestrator verbs from the decision aren't mapped to these phases. If the orchestrator uses `begin explore --epic X`, that command isn't listed. If `epic:explore` IS the begin command for that phase, the relationship should be explicit.

### MINOR: No `write-<field>` commands documented
**File:** `commands-api.md`, `_overview.md`
**Resolution:** Document write-field commands or clarify how lifecycle-bound markdown is written

The overview states "Lifecycle-bound markdown (goals, plans) is written through CLI `write-<field>` commands with state validation." But no `write-*` commands appear in commands-api.md. This could be the `submit-*` pattern from the orchestrator-subagent decision, but the mapping isn't documented. The architecture should show how a sub-agent writes a plan or goal back to the CLI.

### MINOR: `--inline-context` flag name inconsistency
**File:** `commands-api.md`, `rpc-layer-api.md`
**Resolution:** Pick one name and use it everywhere

The decision calls it `--inline`. The commands-api.md calls it `--inline-context`. The rpc-layer-api.md uses `--inline-context` in code but `inlineContext` in the TypeScript interface. The flag name should be consistent across all architecture files and aligned with the decision.

### MINOR: Fitness functions are all "candidate — not yet written"
**File:** All architecture files
**Resolution:** No action needed at architecture stage, but note this as a gap to fill during slicing

Every fitness function across all subsystems is marked as candidate. This is appropriate for the experimental maturity level, but worth noting that none will provide guardrails during initial implementation.

## Score: 7/10

The architecture demonstrates strong fundamentals: clean four-layer separation, a pure state machine, well-thought-out data ownership boundaries (CLI vs LLM), and good alignment with the 13 active decisions. The reducer pattern, unified state object, and concurrent modification detection are well-designed for the problem space.

The score is held back primarily by module depth issues (2x weighted): the RPC layer is too wide for a single module, the state machine accepts an unnecessarily broad interface, and the guard mechanism uses an ambiguous return type. Additionally, the command naming inconsistency between architecture files (and between architecture and decisions) creates confusion about the actual API surface — the sub-agent contract from the orchestrator-subagent decision is effectively missing from the commands-api.md.

To reach 9+:
1. Resolve the command naming inconsistency and document the full sub-agent contract (`start-*`/`submit-*` or equivalent)
2. Acknowledge the context bundling boundary within the RPC layer (even as an internal module)
3. Clean up the guard return type to separate control flow from errors
4. Document which state keys each event type reads in the state machine, making the wide interface intentional rather than accidental

## Summary
- Critical: 0
- Important: 5
- Minor: 5
