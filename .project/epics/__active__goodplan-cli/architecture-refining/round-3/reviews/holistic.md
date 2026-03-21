# Holistic Architecture Review — Round 3

**Reviewer**: Holistic
**Scope**: All architecture files, decisions, conventions, idea.md, spec
**Focus**: Cross-file consistency, completeness, goal alignment, simplicity

---

## Overall Assessment

The architecture has matured significantly across rounds. The four-layer stack (Commands → RPC → State Machine + Data Layer) is cleanly specified with strict unidirectional dependencies. The pure state machine with a reducer pattern is well-defined, the data ownership split (CLI-owned JSON/JSONL vs LLM-owned markdown) is consistently applied, and the sub-agent / orchestrator split is coherent. The story is largely coherent.

A small number of issues remain — one critical semantic gap, two important consistency issues, and several minor items.

---

## Critical Issues (1)

### C1: `COMPLETE_SLICING` and `COMPLETE_REFINE_SLICES` events have no commands mapped to them

The `state-machine-api.md` defines `COMPLETE_SLICING` and `COMPLETE_REFINE_SLICES` events. The `commands-api.md` command-to-event table includes `BEGIN_SLICING` and `BEGIN_REFINE_SLICES` (via `epic:define-slices` and `epic:refine-slices`) but has **no commands mapped to the `COMPLETE_*` counterparts for slicing phases**. The spec shows architecture rounds ending with `submit-architecture`, but there is no `submit-slices` and no command that triggers `COMPLETE_SLICING` or `COMPLETE_REFINE_SLICES`.

This is a workflow dead-end: a user can enter the slicing phase but cannot exit it through any defined command. Either a `submit-slices` command is needed (analogous to `submit-architecture`), or the `COMPLETE_SLICING` event needs to be triggered by an existing command (e.g., `epic:define-slices` completing inline). The architecture must be explicit about which path.

Contrast: `COMPLETE_ARCHITECTURE` is triggered by `submit-architecture`. `COMPLETE_PLAN` is triggered by `submit-plan`. The slicing phase has no equivalent — this is a gap, not an intentional design.

---

## Important Issues (2)

### I1: `COMPLETE_IMPLEMENTATION` event has no corresponding `submit-implementation` in sub-agent commands, but `submit-implementation` appears in commands-api.md

`commands-api.md` lists `goodplan submit-implementation --slice <name>` in the Sub-Agent Commands section, but the command-to-event mapping table at the top does not list `submit-implementation` → `COMPLETE_IMPLEMENTATION`. The event `COMPLETE_IMPLEMENTATION` exists in `state-machine-api.md`. This creates a gap in the mapping table that would cause confusion during implementation — a developer reading the table would miss the submit-implementation → COMPLETE_IMPLEMENTATION mapping.

Additionally, `flows.md` documents `slice:complete` as a separate step from `submit-implementation`, but does not show the full flow from `submit-implementation` through `COMPLETE_IMPLEMENTATION` to the implementing state transition. The flows.md coverage is slightly asymmetric: it covers `slice:plan` and `slice:complete` but skips the `start-implementation` / `submit-implementation` flow entirely.

### I2: `quest.json` model is underspecified relative to `slice.json`

`data-model.md` shows `quest.json` with only `name`, `status`, `goal`, `created`, `updated`. But the `state-machine-api.md` event union includes `COMPLETE_QUEST_REFINEMENT_ROUND` (which requires `scoreHistory` in analogy with slices) and `BEGIN_QUEST_REFINEMENT` (which implies a `refinement` tracking block). The quest model doesn't show the refinement tracking field that must exist for the same circuit-breaker and score-history logic to work on quests as it does on slices. Either quests don't support refinement (and those events should be removed or guarded differently) or the model needs the same `refinement` field as `slice.json`.

---

## Minor Issues (5)

### M1: `_overview.md` subsystem maturity table says Commands priority is 3, but commands-api.md fitness functions also say priority 3. This is correct and consistent, but the table text "candidate" under Fitness Functions column could be clarified — "candidate (priority 3)" would match the other entries' format.

### M2: `flows.md` documents the `COMPLETE_SLICE` flow receiving `architectureDelta` in stdin, and the State Machine processes it and appends to `architecture-deltas.jsonl`. However, the `COMPLETE_SLICE` state key dependency table in `state-machine-api.md` does not list `slices/<name>/architecture-deltas.jsonl` as a write target. The table is noted as partial ("covers the most common events"), but this specific omission could mislead implementers, since `architecture-deltas.jsonl` is a first-class artifact.

### M3: `conventions.md` repo structure shows `src/commands/build/` as a directory alongside `src/commands/epic/`, `src/commands/slice/`, `src/commands/quest/`, `src/commands/resource/`, `src/commands/global/`. The `build/` directory isn't mentioned anywhere in the architecture files — no commands are described for a "build" namespace. This appears to be a leftover from an earlier design. Should be removed or explained.

### M4: The `schema` global command in `commands-api.md` is well-specified, but `invariants.md` and `conventions.md` do not mention it. The `schema` command enables LLM self-discovery of the command surface, which is architecturally significant (it's the mechanism by which skills stay in sync with the CLI without hardcoding command syntax). It deserves a mention in conventions as a cross-cutting capability.

### M5: The state key dependency table in `state-machine-api.md` is explicitly partial ("Other events follow the same pattern"). This is fine for an architecture doc, but for the fitness function "Every (status, event) pair is handled," there's no reference test fixture or enumeration of all valid statuses per entity. The fitness function is defined (correctly) as a behavioral test, but documenting the complete set of entity statuses in one place (e.g., an enum in state-machine-api.md or data-model.md) would make the completeness fitness function easier to implement and verify.

---

## Goal Alignment Check

Goals: Deep modules, boundary quality, pure state machine, simplicity.

| Goal | Assessment |
|---|---|
| Deep modules | Strong. Each layer has a narrow public API. Context bundling is correctly internalized within the RPC layer rather than exposed. The state machine hides transition tables behind `reduce()`. Data Layer hides file I/O behind typed functions. |
| Boundary quality | Strong. No layer imports upward. State machine has no I/O. Data layer has no business logic. Commands have no workflow logic. The only seam worth watching is the `_derived` fields crossing from Data Layer into State Machine — this is explicitly documented and the contract is clear (read-only, never written). |
| Pure state machine | Strong. Purity is enforced by INV-003, validated by a fitness function, and the architecture prohibits I/O imports. The reducer pattern with transition tables is well-chosen for this domain. |
| Simplicity | Mostly strong. The command surface is large (due to comprehensive lifecycle coverage) but justified. The main simplicity risk is the `ProjectState` unified object growing to include many entity keys — the architecture acknowledges this and documents partial loading as a future path. The `_derived` field naming convention (flat keys with entity path prefixes) could become unwieldy but is acceptable for the current scope. |

---

## Cross-File Consistency Summary

| Claim | Files | Status |
|---|---|---|
| Commands route to RPC via StateEvent | commands-api.md, rpc-layer-api.md, state-machine-api.md | Consistent, with C1 gap (slicing COMPLETE events) |
| Submit-* trigger COMPLETE_* events | commands-api.md, state-machine-api.md | Mostly consistent; I1 gap in mapping table |
| Quest lifecycle mirrors slice lifecycle | commands-api.md, state-machine-api.md, data-model.md | Mostly consistent; I2 gap in quest.json model |
| Data ownership split (CLI JSON / LLM markdown) | _overview.md, conventions.md, data-layer-api.md, data-model.md | Fully consistent |
| Error codes and exit codes | commands-api.md, conventions.md, invariants.md | Fully consistent |
| Deterministic key ordering | data-layer-api.md, data-model.md, conventions.md, invariants.md | Fully consistent |
| State machine purity | _overview.md, state-machine-api.md, invariants.md, conventions.md | Fully consistent |
| Fitness function priorities | _overview.md, state-machine-api.md, data-layer-api.md, rpc-layer-api.md, commands-api.md | Fully consistent |

---

## Decisions Alignment

All active decisions are reflected in the architecture:
- `2026-03-20-roll-your-own-state-machine`: reflected correctly in state-machine-api.md transition table design
- `2026-03-20-entity-namespaced-commands`: reflected in commands-api.md
- `2026-03-20-layered-architecture`: reflected in _overview.md
- `2026-03-20-orchestrator-subagent-split`: reflected in commands-api.md Sub-Agent Commands section
- `2026-03-20-inline-flag-replaces-depth`: reflected in commands-api.md (`--inline` vs `--depth` from spec)
- `2026-03-20-simplicity-as-default`: the architecture-deltas simplification note in data-model.md is a direct application of this decision — good

The superseded decision `2026-03-20-command-surface-conventions.md` is correctly superseded; its retained conventions (stdin JSON, target flags, `--override`) are present in commands-api.md.

---

## Score

**8/10**

The architecture is coherent, goal-aligned, and largely consistent across files. The pure state machine, boundary definitions, and data ownership model are strong and well-documented. The score is held back by C1 (a genuine workflow dead-end for the slicing phase) and I1/I2 (smaller but real gaps that would cause implementer confusion). With those addressed, this would be a 9+.
