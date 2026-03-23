# API Contract Review — Round 4

**Focus:** Consistency, completeness, well-specified contracts
**Goal alignment:** Deep modules, boundary quality, pure state machine, simplicity
**Context:** Iteration 4. Round-3 raised 4 important and 5 minor issues. Evaluate what was resolved, what persists, and whether new issues exist.

---

## Round-3 Issue Resolution

### IMP-1: `'start'` missing from `Phase` union — RESOLVED

`rpc-layer-api.md` now includes `'start'` in the `Phase` union. `quest:start` maps to `begin('start', { type: 'quest', ... })` and `BEGIN_QUEST`. The routing table in `rpc-layer-api.md` confirms this. Fully resolved.

### IMP-2: RPC routing table for entity commands — RESOLVED

`rpc-layer-api.md` now contains a complete "Command-to-RPC Routing" table mapping every entity command category to `begin`, `complete`, `submit`, `startContext`, or `status`. The `slice:complete` / `epic:complete` → `rpc.complete()` vs. `submit-*` → `rpc.submit()` distinction is explicit. Fully resolved.

### IMP-3: `verificationPassed` semantics — RESOLVED

`commands-api.md` now includes an explicit callout: "`verificationPassed` is a human/orchestrator assertion. The orchestrator (or user) reviews implementation results, decides whether verification criteria are met, and asserts the result via the stdin JSON payload. The CLI does not automatically determine verification — it trusts the caller's assertion and enforces it as a state machine guard." The same explanation appears in `flows.md`. Fully resolved.

### IMP-4: Fitness function exit code inconsistency — RESOLVED

The fitness function in `commands-api.md` ("Every error produces structured JSON and correct exit code") now reads "exit code is 1 (internal), 2 (validation), or 3 (state machine)" — matching the contract. Fully resolved.

### MIN-1: Quest-has-no-epic-parent unexplained — RESOLVED

`quest:create` is now described with a note that quests are not epic-scoped. The asymmetry with slices is explained. Resolved.

### MIN-2: `start-implementation` missing `--quest` variant — RESOLVED

`start-implementation --slice <name>|--quest <name>` is now listed in sub-agent commands, matching the existing `start-plan`, `start-refinement` patterns. Resolved.

### MIN-3: `--scope` format unspecified for `resource:activity` — RESOLVED

`commands-api.md` now specifies: "`--scope` is a path-style entity reference matching the `scope` field in `activity-log.jsonl` entries (e.g., `slices/01-auth`, `epics/goodplan-cli`, `quests/fix-logging`)." Resolved.

### MIN-4: `submit-refinement` disambiguation — RESOLVED

The command-to-event table now notes "uses `--slice` or `--quest` to disambiguate" for `submit-refinement`. Resolved.

### MIN-5: `override` missing from `WorkflowOptions` — RESOLVED

`WorkflowOptions` now includes `override?: boolean`. The `--override` flag description in global flags also states it "Reaches the state machine via `StateEvent.override`." Fully resolved.

---

## Summary

All 9 round-3 issues (4 important, 5 minor) are resolved. The architecture has reached a high level of internal consistency. The remaining issues below are genuine gaps rather than prior-round residue.

---

## Critical Issues (0)

None.

---

## Important Issues (2)

### IMP-1: `COMPLETE_EPIC` event payload carries `verificationResults` but the epic-level verification flow is underspecified at the state machine level

`commands-api.md` shows `epic:complete` accepting `verificationResults: [{ index, passed, notes }]` via stdin. The `StateEvent` for `COMPLETE_EPIC` carries this array. However, the state machine's handling of partial failure is not specified: if one verification passes and one fails, does `COMPLETE_EPIC` succeed with warnings, fail entirely, or allow partial completion?

The `flows.md` completion flow for `slice:complete` explicitly states: "Verification guard: if `verificationPassed === false`, returns error — slice stays in `implementing`." The equivalent rule for `COMPLETE_EPIC` (what happens when some `verificationResults[i].passed === false`) is absent from `state-machine-api.md`, `flows.md`, and `invariants.md`.

The state key table in `state-machine-api.md` doesn't include `COMPLETE_EPIC`, `COMPLETE_SLICE` (full row), `ACTIVATE_EPIC`, or any quest lifecycle events — the table explicitly says "covers the most common events" and trails off. For state machine completeness, the epic completion guard semantics need to be specified somewhere.

**Fix:** Add the epic-completion guard semantics to either `state-machine-api.md` (Contracts → Cross-Entity Consistency) or `flows.md`. Specify: does any failing verification block `COMPLETE_EPIC`? Or does the event always succeed, recording failures for visibility?

### IMP-2: `SubmitInput` type is referenced but never defined

`rpc-layer-api.md` defines the `submit` function as accepting `content: SubmitInput`, but `SubmitInput` is never defined in the architecture files. `CompleteInput` is defined with `verificationPassed`, `deferred`, `learnings`, `architectureDelta`. But `submit-plan`, `submit-architecture`, `submit-slices`, `submit-refinement`, `submit-implementation`, `submit-explore` each write different content types (plan markdown, architecture paths, slice definitions, refinement scores, implementation results, exploration results).

The question: what does `SubmitInput` contain? Is it a discriminated union by phase? A generic `{ content: string }` for markdown phases and `{ scores: Record<string, number> }` for scoring phases? The current architecture is silent. The `commands-api.md` notes "submit-* commands accept stdin JSON with the sub-agent's output" but never specifies the shape per command.

**Fix:** Define `SubmitInput` (or a per-phase set of types) in `rpc-layer-api.md`. At minimum, distinguish: (a) markdown-write phases (`submit-plan`, `submit-architecture`, `submit-slices`, `submit-explore`, `submit-refine-architecture`, `submit-refine-slices`) which write content to a file path, (b) scoring phases (`submit-refinement`, `submit-refine-architecture`, `submit-refine-slices`) which carry `scores: Record<string, number>`, (c) implementation result phases (`submit-implementation`) which might carry a summary or verification assertion. This is a direct implementor blocker.

---

## Minor Issues (2)

### MIN-1: `quest.json` lacks `epic` field — but quest-to-epic scoping is never explicitly excluded

`slice.json` has an `"epic": "goodplan-cli"` field linking it to its parent epic. `quest.json` has no such field. This is consistent with the design that quests are not epic-scoped. But the data model and `quest:create` stdin schema never explicitly state that quests have no parent. Someone reading `quest.json` in isolation might wonder if `epic` was omitted accidentally.

Additionally, `resource:quest list` takes no `--epic` filter (unlike `resource:slice list [--epic <name>]`). This implies quests are project-level — correct per the design — but the asymmetry is worth a one-line note in `data-model.md`.

**Fix:** Add a sentence to the `quest.json` section in `data-model.md` noting that quests are project-scoped, not epic-scoped, and therefore carry no `epic` field.

### MIN-2: `BEGIN_REFINEMENT` vs `BEGIN_QUEST_REFINEMENT` — quest refinement event is not in the state key dependency table

The state key dependency table in `state-machine-api.md` explicitly omits quest events, saying they "mirror slice events but operate on `quests/<name>/quest.json`." This is reasonable for brevity, but `BEGIN_REFINEMENT` is listed in the table for slices while the quest equivalent (`BEGIN_QUEST_REFINEMENT`) is not. If the table is intended to enable future partial loading, the absence of quest events is a gap.

More concretely: `quest.json` includes `architecture-deltas.jsonl` in the directory structure (`data-model.md`) but `COMPLETE_QUEST` carries `architectureDelta: ArchitectureDelta[]` (state-machine-api.md) — the write target is `quests/<name>/architecture-deltas.jsonl`, but this is inferred, not stated. The analogous `COMPLETE_SLICE` row in the table lists `slices/<name>/architecture-deltas.jsonl` as a write target. Quest completion behavior is underspecified in the table.

**Fix:** Either extend the state key table with representative quest rows (at minimum `COMPLETE_QUEST`), or add a note explicitly stating quest events are structurally identical to slice events with all paths substituted `slices/ → quests/`.

---

## Positive Observations

- All round-3 issues resolved cleanly. The routing table in `rpc-layer-api.md` is the most significant addition — it eliminates an entire class of "which function do I call?" questions for implementors.
- `WorkflowOptions` with both `inlineContext` and `override` is now a properly cohesive type. It's the right shape for the RPC public API.
- The `_derived` field contract is well-specified: computed on every call, read by guards, never written back. The specific guard fields (`planContentProvided`, `refinedPlanExists`, `architectureExists`, `explorationExists`) are listed with their semantics. This is exactly the right level of documentation for a pure state machine.
- `verificationPassed` semantics (orchestrator assertion, not automatic derivation) are now explicit in two places. This is an important LLM-facing contract that needed clarity.
- The `--scope` format for `resource:activity list` now mirrors the `scope` field in `activity-log.jsonl` records — a natural, self-consistent choice.
- Context bundling as an internal module (`src/core/context/`) with no direct State Machine dependency is the right boundary. The per-phase priority tables are well-specified and easy to update independently.
- The `COMPLETE_EPIC` state-key row note ("This table covers the most common events") is honest about incompleteness rather than implying coverage that doesn't exist.

---

## Verdict

The architecture has converged to a high-quality state. All prior issues are resolved. Two important issues remain: the epic-completion guard semantics and the undefined `SubmitInput` type. The `SubmitInput` gap is an implementor blocker — someone writing the `submit` function will immediately need to know what the stdin payload looks like for each phase. The two minor issues are documentation completeness gaps, not design problems.

The state machine discriminated union is complete, the layered error contract is consistent, the routing is fully specified, and the boundary rules are enforced by the type system. The architecture is ready for implementation once the `SubmitInput` type is defined.
