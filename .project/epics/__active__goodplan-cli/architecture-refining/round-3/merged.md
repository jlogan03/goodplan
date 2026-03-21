# Merged Architecture Review — Round 3

All Round 2 IMPORTANT issues: **RESOLVED**.

---

## CRITICAL Issues

### CRIT-1: Slicing and refine-architecture phases have no completion commands — workflow dead-ends
**Flagged by:** software-architecture (IMPORTANT), holistic (CRITICAL)
**Files:** `commands-api.md`, `state-machine-api.md`

`COMPLETE_SLICING`, `COMPLETE_REFINE_SLICES`, and `COMPLETE_REFINE_ARCHITECTURE` events exist in the state machine but no commands trigger them. The command-to-event mapping table has `BEGIN_SLICING` (via `epic:define-slices`) and `BEGIN_REFINE_SLICES` (via `epic:refine-slices`) but no `submit-slices`, `submit-refine-architecture`, or equivalent. A user can enter these phases but cannot exit them.

Contrast: architecture phase has `submit-architecture` → `COMPLETE_ARCHITECTURE`. Plan phase has `submit-plan` → `COMPLETE_PLAN`. Slicing and refine-architecture have no equivalent.

The architecture must decide: (a) add `submit-slices` and `submit-refine-architecture` sub-agent commands (with corresponding `start-slices` / `start-refine-architecture`), or (b) make these single synchronous commands where the orchestrator command itself triggers the COMPLETE event on exit.

*Elevated to CRITICAL per holistic reviewer; software-architecture also flagged at IMPORTANT with 2x weight.*

---

## IMPORTANT Issues

### IMP-1: `quest.json` missing `refinement` field — state machine has nowhere to store quest refinement state
**Flagged by:** software-architecture, holistic
**Files:** `data-model.md`, `state-machine-api.md`

`slice.json` has `refinement: { round, maxRounds, scoreHistory }` supporting `COMPLETE_REFINEMENT_ROUND`. The state machine defines `BEGIN_QUEST_REFINEMENT` and `COMPLETE_QUEST_REFINEMENT_ROUND` (with `scores` and `override`), but `quest.json` has no `refinement` field. The circuit breaker and score history have nowhere to live for quests.

### IMP-2: Quest `architecture-deltas.jsonl` absent from data model
**Flagged by:** software-architecture
**Files:** `data-model.md`, `state-machine-api.md`

`COMPLETE_QUEST` carries `architectureDelta: ArchitectureDelta[]`, matching slice completion. But `data-model.md` shows no `architecture-deltas.jsonl` under `quests/<name>/`. The RPC layer would have no target path to write quest architecture deltas.

### IMP-3: Abandon commands missing `--reason` flag
**Flagged by:** tui-cli
**Files:** `commands-api.md`, `state-machine-api.md`

`ABANDON_EPIC`, `ABANDON_SLICE`, `ABANDON_QUEST` all require `reason: string`. The CLI signatures show no `--reason` flag and no stdin JSON example. Implementers will hit validation failure.

### IMP-4: `epic:complete` missing input documentation for `verificationResults`
**Flagged by:** tui-cli
**Files:** `commands-api.md`, `state-machine-api.md`

`COMPLETE_EPIC` requires `verificationResults: VerificationResult[]`. The CLI shows only `goodplan epic:complete --epic <name>` with no input documentation. Compare to `slice:complete` which has detailed stdin JSON examples.

### IMP-5: `submit-implementation` / `COMPLETE_IMPLEMENTATION` missing from command-to-event mapping table
**Flagged by:** tui-cli, holistic
**Files:** `commands-api.md`

`submit-implementation` exists in the sub-agent commands section and `COMPLETE_IMPLEMENTATION` / `COMPLETE_QUEST_IMPLEMENTATION` exist in the state machine, but neither appears in the command-to-event mapping table. An implementer following the table to wire event dispatch will miss this.

### IMP-6: RPC `Phase` type incomplete — missing `'start'` and completion phase values
**Flagged by:** api-contract, software-architecture
**Files:** `rpc-layer-api.md`

The `Phase` union is missing `'start'` (needed for `quest:start` → `begin('start', ...)`). Also missing completion counterparts for slicing and refine phases. The Commands layer cannot route `quest:start` through `begin()` without it.

### IMP-7: `submit` vs `complete` RPC routing underdocumented
**Flagged by:** api-contract
**Files:** `rpc-layer-api.md`, `commands-api.md`

`rpc-layer-api.md` defines `begin`, `complete`, and `submit` functions but doesn't specify which entity commands call which RPC function. Only one example exists (`slice:complete` → `rpc.complete()`). A routing table mapping command categories to RPC functions would close this.

### IMP-8: `verificationPassed` on `COMPLETE_SLICE` — source unclear
**Flagged by:** api-contract
**Files:** `commands-api.md`, `flows.md`, `state-machine-api.md`

`COMPLETE_SLICE` carries `verificationPassed: boolean` and `slice:complete` is the triggering command. But who determines verification — the orchestrator/human after reviewing `submit-implementation` output, or derived automatically from implementation results? The current design implies human/orchestrator assertion but never states it explicitly.

### IMP-9: Error exit code inconsistency within `commands-api.md`
**Flagged by:** api-contract
**Files:** `commands-api.md`

The error contract defines exit codes 1/2/3. The fitness function description in the same file says "exit code is 2 (validation) or 1 (other)" — silently dropping exit code 3 (state machine errors). Internal contradiction.

---

## MINOR Issues

### MIN-1: `start-slices` / `start-refine-architecture` missing from sub-agent command surface
**Flagged by:** software-architecture
**Files:** `commands-api.md`

If `submit-slices` / `submit-refine-architecture` are added (per CRIT-1), corresponding `start-*` commands for context bundling should accompany them.

### MIN-2: `COMPLETE_SLICE` state key dependency table missing `architecture-deltas.jsonl` write target
**Flagged by:** holistic
**Files:** `state-machine-api.md`

The table is noted as partial, but `architecture-deltas.jsonl` is a first-class artifact and its omission could mislead implementers.

### MIN-3: `src/commands/build/` still in conventions.md
**Flagged by:** holistic
**Files:** `conventions.md`

*Note: software-architecture says this was resolved in round 3. Holistic still flags it. Verify actual file state before acting.*

### MIN-4: `schema` command not mentioned in conventions or invariants
**Flagged by:** holistic
**Files:** `conventions.md`, `invariants.md`

The `schema` command enables LLM self-discovery — architecturally significant enough to mention in conventions as a cross-cutting capability.

### MIN-5: Entity status enum not centralized
**Flagged by:** holistic
**Files:** `state-machine-api.md`, `data-model.md`

The fitness function "every (status, event) pair is handled" would be easier to implement with a documented complete set of entity statuses in one place.

### MIN-6: `--override` not documented as cross-cutting refinement convention
**Flagged by:** tui-cli (carried from round 2), api-contract
**Files:** `commands-api.md`

Appears on four commands but absent from global flags table. Semantics ("bypass score threshold circuit breaker") should be documented in one place.

### MIN-7: `override` not in `WorkflowOptions` or `CompleteInput` type
**Flagged by:** api-contract
**Files:** `rpc-layer-api.md`

The `--override` flag must reach the RPC layer to be included in `StateEvent` payloads, but neither `WorkflowOptions` nor `CompleteInput` includes it.

### MIN-8: Create commands (`epic:create`, `quest:create`, `decision:create`) show no input documentation
**Flagged by:** tui-cli, api-contract
**Files:** `commands-api.md`

Events require fields (`name`, `goal`, etc.) but CLI signatures show no flags or stdin examples.

### MIN-9: `submit-refinement` slice/quest disambiguation undocumented
**Flagged by:** api-contract
**Files:** `commands-api.md`

`submit-refinement` maps to either `COMPLETE_REFINEMENT_ROUND` or `COMPLETE_QUEST_REFINEMENT_ROUND`. The `--slice` vs `--quest` flag determines which, but this isn't stated.

### MIN-10: `start-implementation` missing `--quest` variant
**Flagged by:** api-contract
**Files:** `commands-api.md`

`quest:implement` exists but `start-implementation --quest` is not listed. Either add the variant or note that quest implementation doesn't use sub-agents.

### MIN-11: `resource:activity list --scope` format unspecified
**Flagged by:** api-contract
**Files:** `commands-api.md`

All other resource commands use typed entity flags. `--scope` is the only untyped value with no format specification.

### MIN-12: `quest:start` missing from command-to-event mapping table
**Flagged by:** tui-cli
**Files:** `commands-api.md`

Should map `quest:start` → `BEGIN_QUEST`, analogous to `epic:explore` → `BEGIN_EXPLORE`.

### MIN-13: No help text quality guidance
**Flagged by:** tui-cli (carried from round 2)
**Files:** `commands-api.md`

One line noting that citty-generated `--help` must include descriptions and flag metadata would prevent bare-bones help output.

---

## DIRECTLY_ACTIONABLE

These can be fixed without design decisions:

1. **IMP-3** — Add `--reason <text>` to abandon command signatures (or document stdin JSON with `reason` field).
2. **IMP-4** — Add stdin JSON example for `epic:complete` with `verificationResults` schema.
3. **IMP-5** — Add `submit-implementation` → `COMPLETE_IMPLEMENTATION` / `COMPLETE_QUEST_IMPLEMENTATION` to mapping table.
4. **IMP-8** — Add one sentence to `flows.md` or `commands-api.md` clarifying `verificationPassed` is an orchestrator/human assertion via `slice:complete` stdin.
5. **IMP-9** — Update fitness function description to include exit code 3.
6. **IMP-1** — Add `refinement` field to `quest.json` in `data-model.md`, mirroring `slice.json`.
7. **IMP-2** — Add `architecture-deltas.jsonl` to quest directory structure in `data-model.md`.
8. **MIN-2** — Add `architecture-deltas.jsonl` as write target in COMPLETE_SLICE dependency table.
9. **MIN-6/MIN-7** — Document `--override` as a refinement convention and add to `WorkflowOptions` or `CompleteInput`.
10. **MIN-8** — Add flag signatures or stdin examples for create commands.
11. **MIN-9** — Add disambiguation note for `submit-refinement`.
12. **MIN-10** — Add `--quest` variant to `start-implementation` or document the exception.
13. **MIN-11** — Specify `--scope` format.
14. **MIN-12** — Add `quest:start` → `BEGIN_QUEST` to mapping table.

## USER_INPUT Required

1. **CRIT-1 (slicing/refine-architecture completion):** Two-step sub-agent model (add `start-slices`/`submit-slices` and `start-refine-architecture`/`submit-refine-architecture`) or single synchronous command model (orchestrator command triggers both BEGIN and COMPLETE)?
2. **IMP-6 (Phase type):** Add missing phase values to the `Phase` union, or restructure the RPC API to not require a phase-to-function mapping?
3. **IMP-7 (submit vs complete routing):** Add a routing table in `rpc-layer-api.md`? The distinction between `rpc.submit()` and `rpc.complete()` needs explicit documentation.
4. **MIN-3 (build/ directory):** Verify whether this was actually removed — reviewers disagree.

## Contradictions Resolved

| Topic | Disagreement | Resolution |
|---|---|---|
| COMPLETE_SLICING severity | software-architecture: IMPORTANT (2x weight), holistic: CRITICAL | Elevated to CRITICAL — this is a genuine workflow dead-end where users are trapped in a phase. Holistic's assessment is correct; software-architecture's 2x weight IMPORTANT is effectively the same severity. |
| `src/commands/build/` | software-architecture says resolved, holistic still flags | Flagged as MIN-3 with note to verify actual file state. |
| `COMPLETE_IMPLEMENTATION` mapping | holistic flags `submit-implementation` inconsistency, tui-cli flags mapping table gap | Merged as IMP-5 — same root cause (mapping table incomplete). |
| `verificationPassed` ownership | api-contract flags as IMPORTANT design question, tui-cli flags `epic:complete` input as separate issue | Kept separate: IMP-8 (verification semantics) and IMP-4 (epic:complete input docs) are distinct gaps even though both involve verification. |

---

## Score Summary

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| software-architecture | 8.5/10 | 0 | 3 | 2 |
| holistic | 8/10 | 1 | 2 | 5 |
| api-contract | 8/10 | 0 | 4 | 5 |
| tui-cli | 8.5/10 | 0 | 3 | 4 |
| **Merged** | **8/10** | **1** | **9** | **13** |

### USER_INPUT Resolved

**1. Slicing/refine-architecture completion:** Two-step sub-agent model. Add start-slices/submit-slices, start-refine-architecture/submit-refine-architecture, start-refine-slices/submit-refine-slices. Consistent with all other phases.

**2. Phase type:** Add all missing phase values to the Phase union. Straightforward — just enumerate all phases.

**3. Submit vs complete routing:** Add a routing table in rpc-layer-api.md mapping command categories to RPC functions.

**4. build/ directory:** Verify and fix if still present.

**5. verificationPassed:** Human/orchestrator assertion. The LLM or user decides verification passed and asserts it in the complete command. Document this explicitly.
