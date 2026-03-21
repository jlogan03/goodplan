# Software Architecture Review: Slice Goals & Sequencing (Round 2)

**Reviewer perspective:** Software Architecture (module boundaries, dependency direction, coupling/cohesion, layering, data flow, testability, module depth)
**Score: 9/10**

## Round 1 Resolution Check

Round 1 identified 3 Important and 4 Minor issues. Reviewing each:

**Important #1 (tracer bullet scope):** Resolved. Slice 01 now scopes `--quiet`, general `--query`, and `schema` to slice 05. Retains `--json` plus a jqjs smoke test. Stdin infrastructure (TTY detection, size limits, empty stdin) added to slice 01's scope, which is architecturally correct — it is shared infrastructure consumed by all subsequent command slices.

**Important #2 (context bundling ownership):** Resolved. Slice 04 now explicitly requires "Context priority ordering tested for each phase configuration defined in transition-tables.md (all 9 phases)" and lists all 9 phase configurations with priority ordering tests in scope. The module is fully owned and tested in slice 04 before consumers arrive in 05-06.

**Important #3 (schema ownership chain):** Resolved. Slice 02 now explicitly states it "Owns all Zod schemas in `src/schemas/`" and scope boundaries read: "all Zod schemas in `src/schemas/` (entity types, JSONL records, `ProjectState`)." Slice 03 explicitly states it "Consumes Zod schemas from `src/schemas/` (defined in slice 02)."

**Minor #4 (enum reconciliation):** Resolved with a flag. Slice 03 scope boundaries include: "**Architecture flag:** EpicStatus/SliceStatus/QuestStatus enum values must be reconciled across `state-machine-api.md`, `transition-tables.md`, and these slice goals before implementation begins." The flag is appropriate — it defers reconciliation to an explicit pre-implementation step rather than patching it in the slice goal. The concrete mismatch (e.g., `state-machine-api.md` has `'executing'` / `'complete'` while `transition-tables.md` uses `'activated'` / `'completed'`) remains unresolved in the architecture docs themselves, but the flag correctly identifies the transition tables as source of truth.

**Minor #5 (stdin infrastructure):** Resolved. Slice 01 now explicitly includes "stdin infrastructure (TTY detection, size limits, empty-stdin handling) as shared command infrastructure" in scope. Slice 06 now states "Consumes shared stdin infrastructure from slice 01" and scopes integration tests for stdin behavior to slice 06 — correct layering.

**Minor #6 (fitness function coupling):** Resolved. Slice 03 now reads: "Fitness function for transition table completeness should derive expected counts from the `StateEvent` discriminated union type rather than parsing the markdown table."

**Minor #7 (slice 07 soft dependency):** Resolved. Sequencing table now contains: "completing after slice 06 avoids rework from command surface changes" and slice 07 scope notes: "Soft dependency: While this slice has no hard dependency on other slices, skills reference concrete CLI commands. Completing after slice 06 (when the command surface is final) avoids rework."

All 7 round 1 issues are addressed.

## Critical Issues (0)

None.

## Important Issues (1)

### 1. goal-refining.md [03-state-machine]: Enum flag defers a concrete blocking inconsistency

The architecture flag in slice 03 correctly identifies the problem but leaves it unresolved. The current state:

- `state-machine-api.md` defines `EpicStatus` with `'executing'` and `'complete'`
- `transition-tables.md` uses `'activated'` and `'completed'`
- `data-model.md` shows `epic.json` with `"status": "executing"` in the example

These are not just naming nits — `'executing'` vs `'activated'` and `'complete'` vs `'completed'` are distinct string values that the state machine, data layer, Zod schemas, and test fixtures must agree on. If an implementer begins slice 03 and picks the state-machine-api.md values, they will implement `'executing'` and `'complete'`. If they pick the transition-tables.md values, they will implement `'activated'` and `'completed'`. Either choice will then require migration work in the other docs and all generated fixtures.

The flag defers resolution, but that resolution is architecturally blocking — it must happen before any code is written for slice 03 or the downstream slices. The slice goal should either resolve it inline or make it an explicit gate criterion (e.g., a success criterion: "Enum values reconciled — architecture docs and transition tables agree on all status strings before any state machine code is written").

**Recommendation:** Add a prerequisite success criterion to slice 03: "EpicStatus, SliceStatus, QuestStatus enum values reconciled between `state-machine-api.md` and `transition-tables.md` — the transition tables are the source of truth. Discrepancies resolved before implementation begins." This converts the flag from a passive note into an enforced gate.

## Minor Issues (2)

### 2. goal-refining.md [05-commands-read]: `status` routing creates a dual-path dependency not reflected in sequencing

Slice 05 contains commands with two different architectural routing paths: list/show commands go directly to the Data Layer (require only slice 02), while `status` routes through RPC (requires slice 04). The sequencing table correctly captures "02 (list/show), 04 (status only)" as dependencies. The slice goal itself also correctly documents this: "most of this slice can be built after slice 02; only `status` requires slice 04."

However, the success criteria and verification steps do not distinguish which criteria require slice 04 to be complete. A developer starting slice 05 after slice 02 (but before 04 is done) would not know they can implement 12 of the 13 success criteria immediately. This is a usability issue rather than an architectural defect, but it creates unnecessary sequencing friction if 04 and 05 are built in parallel.

**Recommendation:** Add a simple callout in the success criteria: tag `status`-specific criteria with "(requires 04)" to make parallelism explicit. Minor change, high clarity value.

### 3. goal-refining.md [06-commands-mutate]: `slice:create` in verification uses inline goal syntax not reflected in commands-api.md

The slice 06 verification script includes:

> `goodplan epic:create` with stdin goal — assert: exit 0, epic.json created

But `commands-api.md` shows `epic:create` reads goal from stdin as a JSON object (`{"name": "my-epic", "goal": "..."}`), and `slice:create` takes `--epic <name>` as a flag. The verification step says "with stdin goal" but does not show the exact stdin shape. For a boundary-testing verification script, ambiguous stdin content for a mutation command is a minor gap — it could mask a validation bug if the verification uses a non-conforming payload.

**Recommendation:** Make the verification script's stdin payloads concrete with the exact JSON shapes from `commands-api.md` stdin examples. This is purely a verification quality issue — the architecture is fine.

## Summary

All round 1 issues are cleanly addressed. The one remaining Important issue (enum reconciliation staying as a passive flag rather than a blocking gate) is an inherited deferral that could cause implementer confusion if not resolved before slice 03 begins. The two Minor issues are low-severity usability and verification quality nits that do not affect architectural correctness.

The slice decomposition is architecturally sound: clean subsystem boundaries, correct dependency direction, tracer-bullet-first ordering, no unexercised code, shared infrastructure placed at the correct layer (stdin in 01, schemas in 02, state machine in 03, RPC+context in 04). The schema ownership chain is now explicit and unambiguous.
