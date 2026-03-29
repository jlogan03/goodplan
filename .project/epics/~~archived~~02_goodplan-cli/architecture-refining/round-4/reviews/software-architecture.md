# Software Architecture Review — Round 4

## Round 3 Resolution Assessment

### IMPORTANT: COMPLETE_SLICING / COMPLETE_REFINE_SLICES had no command surface trigger: RESOLVED

`commands-api.md` now lists `submit-slices` (→ `COMPLETE_SLICING`), `submit-refine-slices` (→ `COMPLETE_REFINE_SLICES`), `submit-refine-architecture` (→ `COMPLETE_REFINE_ARCHITECTURE`), and the corresponding `start-slices`, `start-refine-architecture` context commands. The mapping table is complete. Every phase that puts a sub-agent to work now has a `start-*`/`submit-*` pair.

### IMPORTANT: `quest.json` missing `refinement` field: RESOLVED

`data-model.md` now shows the `refinement` object in `quest.json` with `round`, `maxRounds`, and `scoreHistory`, and explicitly states the semantics are identical to slice refinement. The state machine's `COMPLETE_QUEST_REFINEMENT_ROUND` circuit-breaker guard has the data it needs.

### IMPORTANT: Quest `architecture-deltas.jsonl` absent from data model: RESOLVED

The directory structure in `data-model.md` now includes `architecture-deltas.jsonl` under `quests/<name>/`. `COMPLETE_QUEST` has a concrete storage target for architecture delta records.

### MINOR: `start-slices` / `start-refine-architecture` absent: RESOLVED

Both commands appear in the sub-agent command surface in `commands-api.md` (lines 140, 142).

### MINOR: `Phase` type missing completion phases: PARTIALLY RESOLVED

The `Phase` type in `rpc-layer-api.md` does not add explicit completion-phase values for slicing/refine-architecture/refine-slices. However the Command-to-RPC routing table maps `submit-slices → submit(phase, ...)`, `submit-refine-architecture → submit(phase, ...)`, `submit-refine-slices → submit(phase, ...)`, and the `submit` RPC function dispatches based on `(phase, target)`. The `Phase` type values `'define-slices'`, `'refine-slices'`, `'refine-architecture'` serve double duty for both begin and submit calls. This is workable if the dispatch rule "use current entity status to resolve the correct StateEvent for submit calls" is documented or if `Phase` gains disambiguation values. The architecture does not document this dispatch rule, so the gap is closed in practice but not by documentation. See new issues below.

---

## New Issues

### IMPORTANT: `Phase` type conflation — same value serves begin and submit with different StateEvent targets (2x weight)

**File:** `rpc-layer-api.md`

The `submit()` RPC function accepts `Phase` as its first argument. The routing table shows:

- `submit-slices → submit('define-slices', ...)` dispatches `COMPLETE_SLICING`
- `submit-refine-slices → submit('refine-slices', ...)` dispatches `COMPLETE_REFINE_SLICES`
- `submit-refine-architecture → submit('refine-architecture', ...)` dispatches `COMPLETE_REFINE_ARCHITECTURE`

But `begin('define-slices', ...)` dispatches `BEGIN_SLICING` and `submit('define-slices', ...)` dispatches `COMPLETE_SLICING`. The same `Phase` value means "begin" when passed to `begin()` and "complete" when passed to `submit()`. This is implicit and fragile: the dispatch rule relies entirely on which function is called, not on what `Phase` encodes. If a caller confuses `begin` vs `submit` for any of these shared Phase values, the wrong StateEvent fires silently (the state machine will reject it via status guard, but the error message will be confusing).

The `Phase` type also currently includes `'start'` (quest-specific begin) alongside `'implement'`, `'plan'`, etc., which already conflates quest-specific and slice-specific phases in a single flat union. This creates implicit coupling between the Phase type and which entity type is in the `target`.

**Resolution options:**
1. Split Phase into `BeginPhase` and `SubmitPhase` — eliminates the conflation entirely.
2. Document explicitly which `Phase` values are valid for `begin()`, `complete()`, and `submit()` respectively. A table mapping `(function, Phase)` → `StateEvent` would close this.
3. Add a Phase value per operation (`'complete-slicing'`, `'complete-refine-slices'`) — more values but removes ambiguity.

Any of these would close the gap. Current architecture is silent on the dispatch rule.

### IMPORTANT: `submit()` write semantics unspecified — content path and write contract undefined (2x weight)

**File:** `rpc-layer-api.md`

The `submit` RPC function is described as: "writes content via Data Layer, triggers the appropriate state event, and commits both in one `commitState` call." But the architecture never specifies:
- What content does `submit-slices` write? The sub-agent defines slices — does it write a JSON summary to `epic.json`? Write slice definitions to `slices/overview.json`? Write free-form markdown somewhere?
- What content does `submit-refine-architecture` write? Presumably the LLM-owned architecture markdown is written directly by the LLM agent to the architecture directory (since it's free-form), not via `submit-*`. But then what does `submit-refine-architecture` write at all?
- What does `submit-architecture` write beyond triggering `COMPLETE_ARCHITECTURE`?

The `commands-api.md` section "Sub-Agent Commands" says `submit-*` commands "accept stdin JSON with the sub-agent's output." For `submit-plan`, the output is plan content (markdown). For `submit-implementation`, the output is implementation results. These are well-specified via the `SubmitResult` RPC type and the `CompleteInput` structure.

For `submit-slices`, `submit-explore`, `submit-architecture`, `submit-refine-architecture`, `submit-refine-slices`, there are no corresponding stdin payload specifications. `data-model.md` explicitly says "free-form markdown: LLM-managed content and internal structure, CLI-owned root paths." If LLM-written content for these phases is written directly to the filesystem (not via stdin), then `submit-*` for these phases is purely a state-transition trigger — which is fine, but should be explicit. The architecture currently implies `submit-*` always carries stdin content while also implying some content is LLM-written directly. This contradiction needs resolution.

### MINOR: `submit-plan` / `submit-refinement` write paths underdocumented for the quest case

**File:** `commands-api.md`, `rpc-layer-api.md`

`submit-plan --quest <name>` triggers `COMPLETE_QUEST_PLAN`. The plan content (stdin) is written to `quests/<name>/plan.md`. This is consistent with the slice path. But the `SubmitInput` and `SubmitResult` RPC types are not shown — only `CompleteInput` (for `complete()`) is documented. The `submit()` function signature appears in the interface but has no corresponding `SubmitInput` or `SubmitResult` type definitions. For implementation clarity, these types should at minimum be referenced or sketched, especially since `submit-plan` for quests carries markdown content that must be written to a well-defined path.

### MINOR: Activity log source — RPC layer vs State Machine responsibility is inconsistent

**File:** `_overview.md`, `conventions.md`, `state-machine-api.md`

`_overview.md` and `conventions.md` state: "Every state transition appends to `activity-log.jsonl` via the RPC layer." But `state-machine-api.md` shows that the State Machine's `apply` function appends activity log entries to the unified state (`activity-log.jsonl: ActivityEntry[]`), and the `COMPLETE_EXPLORE` event's State Key Dependencies table shows the state machine writing `activity-log.jsonl`.

These two descriptions conflict. Either:
1. The State Machine appends activity entries to the in-memory state, and the RPC layer writes them back via `commitState` (the RPC layer does the physical I/O, the State Machine populates the in-memory array) — this is consistent with the unified state model.
2. The RPC layer explicitly constructs activity entries after receiving the new state from `reduce()`, before calling `commitState`.

Option 1 is implied by the unified state model but means the State Machine does produce activity log entries (they're part of `ProjectState`). Option 2 means the State Machine returns state without activity entries and the RPC layer adds them. The architecture currently says both things. Since the State Machine is pure and operates on `ProjectState`, and `activity-log.jsonl` is a field in `ProjectState`, option 1 is the correct reading — but this should be stated explicitly, and the `conventions.md` statement "via the RPC layer" is misleading.

---

## Deep Module Criteria Assessment (8–11, weighted 2x)

**Criterion 8 — Module depth (small interface, large functionality hidden):**
The State Machine is exemplary: single `reduce()` entry point, all transition logic, guards, and apply functions internal. The Data Layer hides `commitState` complexity (diff, verify, write, cache update) behind one call. The RPC Layer is acceptably deep. The Commands layer is intentionally shallow. Depth is strong overall.

**Criterion 9 — Information hiding:**
JSON entity files, JSONL record formats, state cache strategy, and `_derived` computation are all hidden inside the Data Layer. The State Machine hides transition tables from callers. The context bundling concern is isolated inside `src/core/context/` within the RPC layer, with separate rationale for change. These boundaries are well drawn.

**Criterion 10 — Interface abstraction level:**
The `begin/complete/submit/startContext/status` RPC interface is at the right abstraction level — workflow operations, not file paths or JSON structures. The Command layer commands are appropriately at the CLI surface level. The `Phase` conflation issue (above) mildly breaks abstraction purity — callers must know whether `submit('define-slices')` and `begin('define-slices')` are different operations despite the same Phase value.

**Criterion 11 — Boundary consistency (decisions align with architecture):**
All active decisions align with the architecture: four-layer unidirectional stack (decision confirmed), roll-your-own state machine (confirmed), entity-namespaced commands (confirmed), inline flag (confirmed), verification as activation gate (confirmed), incremental architecture updates (confirmed). No decisions contradict the architecture text.

---

## Strengths (unchanged and reinforced)

- Pure state machine with single `reduce(state, event) → ProjectState | StateError` entry point. No I/O imports. Enforced by fitness function candidate.
- Complete discriminated `StateEvent` union with per-event typed payloads and `override?: boolean` on all refinement completion events.
- Unified `ProjectState` object enables cross-entity guards in a single reduce call (sequential slice enforcement, one-active-epic, deferred work routing, implicit transitions).
- Context bundling isolated as an internal module within RPC with per-phase priority tables and budget-based inlining.
- Clear data ownership: CLI owns JSON/JSONL (structured state), LLM owns markdown (content), CLI owns root paths.
- Concurrent modification detection via `commitState` optimistic locking.
- State cache is a pure optimization — deleting it triggers a correct full reassembly.
- Activity log semantics: append-only JSONL, part of `ProjectState`, physically written last in the write ordering.
- Fitness functions identified with clear priority ordering (State Machine → Data Layer → Commands/RPC).
- All six system invariants are documented, scoped, and connected to fitness function candidates.

---

## Score: 9/10

All three IMPORTANT issues from round 3 are fully resolved. The architecture is now structurally sound: the command surface is complete, quest data model matches slice data model, and the two-step sub-agent model is uniformly applied across all phases.

The two new IMPORTANT issues prevent a 9.5+:
1. The `Phase` type conflation creates an implicit dispatch rule that is not documented. It is a narrow, fixable gap — a table or type split.
2. The `submit()` content-write contract is ambiguous for explore/architecture/slices/refine phases. If those phases use submit only as a state-transition trigger (no stdin content), that should be explicit. If they do carry stdin content, the payloads need specification.

Neither issue undermines the core architecture — the layer model, state machine purity, unified state, and data ownership are solid. Both are documentation/contract gaps that would surface during implementation of those specific commands.

## Summary

- Critical: 0
- Important: 2
- Minor: 2
