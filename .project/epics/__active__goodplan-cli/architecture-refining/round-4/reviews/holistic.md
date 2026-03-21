# Holistic Architecture Review — Round 4

**Reviewer**: Holistic
**Scope**: All architecture files, decisions, conventions, idea.md, invariants.md, spec
**Focus**: Cross-file consistency, completeness, goal alignment, simplicity — iteration 4 close-out check

---

## Overall Assessment

The architecture has matured to a highly coherent state. All CRITICAL and IMPORTANT issues from round 3 have been resolved:

- **CRIT-1 resolved**: `submit-slices`, `submit-refine-architecture`, `submit-refine-slices` (and their `start-*` counterparts) are now in `commands-api.md` and the command-to-event mapping table. The workflow dead-ends are closed.
- **IMP-1 resolved**: `quest.json` now includes the `refinement` field with the same structure and semantics as `slice.json`.
- **IMP-2 resolved**: `architecture-deltas.jsonl` is now in the quest directory structure.
- **IMP-3 resolved**: Abandon commands show `--reason <text>` in their CLI signatures.
- **IMP-4 resolved**: `epic:complete` has a stdin JSON example with `verificationResults`.
- **IMP-5 resolved**: `submit-implementation → COMPLETE_IMPLEMENTATION / COMPLETE_QUEST_IMPLEMENTATION` is in the mapping table.
- **IMP-6 resolved**: `Phase` type now includes `'start'`, `'define-architecture'`, `'refine-architecture'`, `'define-slices'`, `'refine-slices'`.
- **IMP-7 resolved**: `rpc-layer-api.md` has a command-to-RPC routing table.
- **IMP-8 resolved**: `verificationPassed` semantics documented explicitly as an orchestrator/human assertion.
- **IMP-9 resolved**: fitness function description in `commands-api.md` now references exit code 3.
- **MIN-3 resolved**: `src/commands/build/` is no longer in `conventions.md`.
- **MIN-4 resolved**: `schema` command documented in `conventions.md` as a cross-cutting capability.
- **MIN-6/MIN-7 resolved**: `--override` documented in global flags table; `WorkflowOptions.override` present in `rpc-layer-api.md`.
- **MIN-8 resolved**: `epic:create`, `quest:create`, `decision:create` have stdin examples.
- **MIN-9 resolved**: `submit-refinement` disambiguation documented.
- **MIN-10 resolved**: `start-implementation --slice <name>|--quest <name>` covers both variants.
- **MIN-11 resolved**: `--scope` format specified with path-style examples.
- **MIN-12 resolved**: `quest:start → BEGIN_QUEST` in the mapping table.

The story is now fully coherent. A small number of minor residual issues remain.

---

## Critical Issues (0)

None.

---

## Important Issues (0)

None.

---

## Minor Issues (3)

### M1: `SubmitInput` and `SubmitResult` types are defined in the RPC function signature but never specified

`rpc-layer-api.md` defines `function submit(phase, target, content: SubmitInput, options): SubmitResult` but neither `SubmitInput` nor `SubmitResult` are defined anywhere in the document. By contrast, `CompleteInput`, `CompleteResult`, `BeginResult`, `ContextBundle`, and `StatusResult` all have explicit interface definitions. Implementers will need to guess what `SubmitInput` carries (plan content? scores? both? depends on phase?). The submit function is used for six distinct phases (`submit-plan`, `submit-refinement`, `submit-implementation`, `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-architecture`, `submit-refine-slices`) with different payloads per phase.

**Suggested fix**: Add at minimum a note explaining that `SubmitInput` is a discriminated union per phase, or document the per-phase input shapes. The `SubmitResult` shape is likely similar to `BeginResult` — just a confirmation — but this should be stated.

### M2: `invariants.md` does not mention INV for `schema` command or self-discovery, despite `conventions.md` calling it architecturally significant

`conventions.md` describes the `schema` command under "Self-Discovery via `schema` Command" and calls it "a cross-cutting capability that supports all command namespaces." But `invariants.md` has no corresponding invariant (e.g., "the `schema` command output must always match the actual command signatures"). For a capability explicitly described as the mechanism by which skills stay in sync with the CLI without hardcoding, the absence of an enforceability statement is a minor gap. This is not blocking — it would become more important if a fitness function were written against it.

### M3: `flows.md` has no example covering the `submit-*` / `start-*` sub-agent flow end-to-end

`flows.md` covers five flows: generic state transition, `slice:plan`, `slice:complete`, `status`, and `epic:activate`, plus `learning:rollup`. The orchestrator/sub-agent split — the most architecturally distinctive feature of this design — is described in `commands-api.md` but has no worked example in `flows.md`. The `slice:plan` flow mentions `--inline` in a postscript but doesn't show the full two-actor sequence: orchestrator calls `slice:plan`, orchestrator spawns sub-agent, sub-agent calls `start-plan --inline`, sub-agent calls `submit-plan` with stdin content. This flow is load-bearing for the design's correctness and worth documenting.

This is minor because the `commands-api.md` sub-agent section is clear, but a flow diagram or example would reduce implementer risk.

---

## Goal Alignment Check

Goals: Deep modules, boundary quality, pure state machine, simplicity.

| Goal | Assessment |
|---|---|
| Deep modules | Strong. `reduce()` hides transition tables. `loadState()` / `commitState()` hides file assembly. Context bundling is internal to RPC at `src/core/context/`. Commands are thin with no logic. Each subsystem exposes a minimal public API. |
| Boundary quality | Strong. Unidirectional dependencies enforced. State machine has no I/O (INV-003, enforced by fitness function). Data layer has no business logic. Commands have no workflow logic. The `_derived` fields cross the Data Layer → State Machine boundary as read-only — this is explicitly documented and the contract is clean. |
| Pure state machine | Strong. INV-003 is tight. The reducer signature is clean: `(state, event) → new state | error`. Transition tables are declarative. Guards are pure functions. Activity log append happens in the `apply` function (within the reducer), which is correct — the state machine produces the new state including new log entries, and the Data Layer persists them. No I/O anywhere. |
| Simplicity | Strong. The no-work-stack decision kept state to three active pointers. `--inline` replaced three depth levels. Resource commands are read-only with no state machine involvement. The command surface is large but justified by comprehensive lifecycle coverage. The main residual complexity is the unified `ProjectState` type (M1 is adjacent to this — `SubmitInput` variations reflect phase-specific content shapes), which is acknowledged and accepted. |

---

## Cross-File Consistency Summary

| Claim | Files | Status |
|---|---|---|
| All phases have start-*/submit-* pairs | commands-api.md, rpc-layer-api.md, state-machine-api.md | Fully consistent |
| Quest lifecycle mirrors slice lifecycle | commands-api.md, data-model.md, state-machine-api.md | Fully consistent |
| Data ownership split (CLI JSON / LLM markdown) | _overview.md, conventions.md, data-layer-api.md, data-model.md | Fully consistent |
| Error codes and exit codes | commands-api.md, conventions.md, invariants.md | Fully consistent |
| Deterministic key ordering | data-layer-api.md, data-model.md, conventions.md, invariants.md | Fully consistent |
| State machine purity | _overview.md, state-machine-api.md, invariants.md, conventions.md | Fully consistent |
| `--override` flag semantics | commands-api.md (global flags table), rpc-layer-api.md (WorkflowOptions), state-machine-api.md (override in events) | Fully consistent |
| `verificationPassed` is caller assertion | commands-api.md, flows.md | Fully consistent |
| `schema` command as self-discovery | commands-api.md, conventions.md | Consistent; minor INV gap (M2) |
| Fitness function priorities | _overview.md, state-machine-api.md, data-layer-api.md, rpc-layer-api.md, commands-api.md | Fully consistent |
| `SubmitInput`/`SubmitResult` types | rpc-layer-api.md | Unresolved — types used but not defined (M1) |

---

## Decisions Alignment

All active decisions are reflected in the architecture:

- `roll-your-own-state-machine`: reducer + transition table correctly specified in `state-machine-api.md`
- `entity-namespaced-commands`: reflected in `commands-api.md` command structure
- `layered-architecture`: four-layer unidirectional stack correctly specified throughout
- `orchestrator-subagent-split`: `start-*`/`submit-*` pattern fully documented in `commands-api.md`
- `inline-flag-replaces-depth`: `--inline` is the only context budget mechanism; no `--depth` anywhere
- `no-work-stack`: three active pointers in `project.json`, sequential slice enforcement via state machine guards
- `epic-verification-at-activation`: activation gate guards documented in `state-machine-api.md` and `flows.md`
- `skill-cli-integration`: concrete CLI commands in skills, `schema` as escape hatch — reflected in `commands-api.md` and `conventions.md`
- `simplicity-as-default`: architecture-delta simplification note in `data-model.md` is a direct application

---

## Score

**9/10**

The architecture tells a fully coherent story. All critical and important gaps from three rounds of review are closed. The four-layer design is clean and consistently documented. The pure state machine, boundary contracts, data ownership model, and sub-agent/orchestrator split are all solid. The three remaining minor issues (M1: `SubmitInput`/`SubmitResult` unspecified; M2: `schema` invariant absent; M3: no sub-agent flow example in `flows.md`) are all low-risk and would not block implementation. The score would reach 10 only with M1 resolved — `SubmitInput` being unspecified is the one place where an implementer could make a wrong assumption.
