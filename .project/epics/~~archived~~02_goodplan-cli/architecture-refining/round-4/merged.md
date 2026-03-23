# Round 4 — Merged Feedback

## Scores

| Reviewer | Score |
|---|---|
| software-architecture | 9/10 |
| holistic | 9/10 |
| api-contract | 8/10 |
| tui-cli | 9/10 |

---

## Critical Issues (0)

None.

---

## Important Issues (5)

### IMP-1: `SubmitInput` / `SubmitResult` types referenced but never defined [DIRECTLY_ACTIONABLE]

**Raised by:** software-architecture (IMPORTANT), holistic (M1), api-contract (IMP-2), tui-cli (IMPORTANT-2)
**Authority:** software-architecture (boundary/depth), api-contract (domain-specific)
**Files:** `rpc-layer-api.md`, `commands-api.md`

`submit(phase, target, content: SubmitInput, options): SubmitResult` is in the RPC interface but neither type is defined anywhere. The six-plus `submit-*` commands carry different payload shapes per phase:

- Markdown-write phases (`submit-plan`, `submit-architecture`, `submit-explore`, `submit-slices`, `submit-refine-architecture`, `submit-refine-slices`): presumably write content to a file path — shape unspecified.
- Scoring phases (`submit-refinement`, `submit-refine-architecture`, `submit-refine-slices`): presumably carry `scores: Record<string, number>` — inferred, not stated.
- Implementation result phases (`submit-implementation`): shape unspecified.
- `SubmitResult` is likely similar to `BeginResult` (confirmation) — not stated.

A secondary question is whether LLM-written free-form markdown for architecture/explore phases is written directly to the filesystem by the sub-agent (in which case `submit-*` is a pure state-transition trigger with no stdin content), or always piped via stdin. The architecture implies both; the contradiction must be resolved explicitly before `submit` can be implemented.

**Fix:** Define `SubmitInput` as a per-phase discriminated union (or document per-phase payload shapes in a table) in `rpc-layer-api.md`. Define `SubmitResult`. For phases where LLM writes content directly to the filesystem, state explicitly that `submit-*` carries no content payload and is a pure state-transition trigger.

---

### IMP-2: `Phase` type conflation — same value serves `begin()` and `submit()` with different StateEvent targets [DIRECTLY_ACTIONABLE]

**Raised by:** software-architecture (IMPORTANT)
**Authority:** software-architecture
**Files:** `rpc-layer-api.md`

`begin('define-slices', ...)` dispatches `BEGIN_SLICING`; `submit('define-slices', ...)` dispatches `COMPLETE_SLICING`. The same `Phase` value carries different semantics depending solely on which RPC function is called. The dispatch rule is implicit and undocumented. If a caller passes the wrong function, the state machine rejects it with a confusing guard error rather than a type error.

The `Phase` type also mixes quest-specific (`'start'`) and slice-specific phases in a flat union, coupling `Phase` to entity type.

**Resolution options (any closes the gap):**
1. Split into `BeginPhase` and `SubmitPhase` union types — eliminates conflation entirely.
2. Add an explicit table mapping `(function, Phase) → StateEvent` to the `rpc-layer-api.md` contracts section.
3. Add per-operation Phase values (`'complete-slicing'`, `'complete-refine-slices'`, etc.).

---

### IMP-3: `slice:complete` and `quest:complete` stdin schemas absent from Stdin Input Examples [DIRECTLY_ACTIONABLE]

**Raised by:** tui-cli (IMPORTANT-1)
**Authority:** tui-cli (domain-specific — CLI surface)
**Files:** `commands-api.md`

`epic:complete` now has a concrete stdin example (with `verificationResults`). `slice:complete` and `quest:complete` — which carry the most complex payloads including `DeferredItem[]`, `Learning[]`, `ArchitectureDelta[]`, and `verificationPassed` — have no stdin examples in the Stdin Input Examples section. These types are referenced throughout the architecture but never given field-level definitions (see IMP-5 below). An implementer must cross-reference `flows.md` inline snippets to construct Zod schemas.

**Fix:** Add concrete stdin JSON examples for `slice:complete` and `quest:complete` to the Stdin Input Examples section in `commands-api.md`, matching the same format as the existing `epic:complete` example.

---

### IMP-4: Epic completion guard semantics for partial `verificationResults` failure unspecified [DIRECTLY_ACTIONABLE]

**Raised by:** api-contract (IMP-1)
**Authority:** api-contract (domain-specific — state machine contracts)
**Files:** `state-machine-api.md`, `flows.md`

`epic:complete` accepts `verificationResults: [{ index, passed, notes }]` via stdin and this array is carried in the `COMPLETE_EPIC` `StateEvent`. But the state machine's handling of partial failure is unspecified: if one verification result has `passed: false`, does `COMPLETE_EPIC` fail entirely, succeed with warnings, or allow partial completion?

`flows.md` explicitly documents the slice guard rule: "if `verificationPassed === false`, returns error — slice stays in `implementing`." No equivalent rule exists for `COMPLETE_EPIC`. The state key table in `state-machine-api.md` does not include a `COMPLETE_EPIC` row.

**Fix:** Add the epic-completion guard semantics to `state-machine-api.md` (Contracts → Cross-Entity Consistency) or `flows.md`. State explicitly: does any `passed: false` entry block `COMPLETE_EPIC`, or does the event always succeed and record failures for visibility?

---

### IMP-5: `--override` placed in "Available on every command" global flags table but scoped to four commands [DIRECTLY_ACTIONABLE]

**Raised by:** tui-cli (IMPORTANT-3)
**Authority:** tui-cli (domain-specific — CLI surface)
**Files:** `commands-api.md`

The Global Flags table is headed "Available on every command" but contains `--override`, which is only valid on `epic:refine-architecture`, `epic:refine-slices`, `slice:refine-plan`, `quest:refine-plan`, and implicitly `submit-refinement`. Round 3 correctly added `--override` to the table with a scoping note, but the table heading invalidates that scoping — it implies implementers should wire `--override` to resource reads, `status`, `init`, etc.

**Fix:** Move `--override` out of the global flags table into a "Command-Specific Flags" section, or rename the table to "Common Flags" with an explicit note that not all flags in this table apply to all commands.

---

## Minor Issues (8)

### MIN-1: Activity log write responsibility conflicts between `conventions.md` and `state-machine-api.md` [DIRECTLY_ACTIONABLE]

**Raised by:** software-architecture (MINOR)
**Authority:** software-architecture
**Files:** `_overview.md`, `conventions.md`, `state-machine-api.md`

`conventions.md` states "Every state transition appends to `activity-log.jsonl` via the RPC layer." `state-machine-api.md` shows the State Machine's `apply` function appending activity entries to the unified `ProjectState`, and `COMPLETE_EXPLORE`'s State Key Dependencies table shows the state machine writing `activity-log.jsonl`. These conflict.

The correct interpretation (consistent with the unified state model) is: the State Machine produces new activity log entries as part of `ProjectState`, and the RPC layer physically persists them via `commitState`. The statement in `conventions.md` is misleading.

**Fix:** Update `conventions.md` to state that activity log entries are produced by the State Machine (as part of `ProjectState`) and physically persisted by the RPC layer's `commitState` call. Remove the ambiguity about which layer "appends."

---

### MIN-2: `schema` command has no corresponding invariant despite being called architecturally significant [DIRECTLY_ACTIONABLE]

**Raised by:** holistic (M2)
**Authority:** holistic
**Files:** `invariants.md`, `conventions.md`

`conventions.md` describes `schema` as "a cross-cutting capability that supports all command namespaces" and the mechanism by which skills stay in sync with the CLI without hardcoding. `invariants.md` has no corresponding invariant (e.g., "the `schema` command output must always match the actual command signatures").

**Fix:** Add an invariant to `invariants.md` asserting that `schema` output reflects actual command signatures, or add a note explaining why this is not enforced as an invariant.

---

### MIN-3: No sub-agent flow example in `flows.md` [DIRECTLY_ACTIONABLE]

**Raised by:** holistic (M3)
**Authority:** holistic
**Files:** `flows.md`

The orchestrator/sub-agent split is the most architecturally distinctive feature of this design, but `flows.md` has no worked example showing the full two-actor sequence: orchestrator calls `slice:plan` → orchestrator spawns sub-agent → sub-agent calls `start-plan --inline` → sub-agent calls `submit-plan` with stdin content. The `slice:plan` flow mentions `--inline` in a postscript but doesn't show the complete sequence. `commands-api.md` sub-agent section is clear, but a flow example would reduce implementer risk.

**Fix:** Add a flow to `flows.md` showing the full orchestrator/sub-agent sequence for at least one phase (e.g., `slice:plan`).

---

### MIN-4: `quest.json` has no explicit note that quests are project-scoped, not epic-scoped [DIRECTLY_ACTIONABLE]

**Raised by:** api-contract (MIN-1)
**Authority:** api-contract
**Files:** `data-model.md`

`slice.json` has an `"epic"` field; `quest.json` does not. This is intentional, but neither `data-model.md` nor `quest:create` stdin schema states explicitly that quests have no parent epic. A reader of `quest.json` in isolation may assume `epic` was accidentally omitted.

**Fix:** Add one sentence to the `quest.json` section in `data-model.md` stating that quests are project-scoped, not epic-scoped, and therefore carry no `epic` field.

---

### MIN-5: Quest lifecycle events absent from state key dependency table [DIRECTLY_ACTIONABLE]

**Raised by:** api-contract (MIN-2)
**Authority:** api-contract
**Files:** `state-machine-api.md`

The state key dependency table covers slice events but not quest equivalents. The note says quest events "mirror slice events but operate on `quests/<name>/quest.json`" — but `COMPLETE_QUEST` write targets (including `quests/<name>/architecture-deltas.jsonl`) are inferred, not stated. The analogous `COMPLETE_SLICE` row lists explicit write targets.

**Fix:** Either add representative quest rows to the state key table (at minimum `COMPLETE_QUEST`), or add an explicit note stating all paths substitute `slices/ → quests/` and enumerate the quest-specific write targets.

---

### MIN-6: `init` command contract undefined [DIRECTLY_ACTIONABLE]

**Raised by:** tui-cli (MINOR-1)
**Authority:** tui-cli
**Files:** `commands-api.md`, `state-machine-api.md`

`goodplan init [--name <name>]` appears in Global Commands but has no description, behavior spec, or routing note. The state machine defines `INIT_PROJECT` with a required `name: string`, but `--name` is optional in the CLI signature. If `--name` is omitted: interactive prompt? directory name fallback? validation error? The contract is absent.

**Fix:** Add a behavior description for `init` in `commands-api.md`, including what happens when `--name` is omitted and how it maps to `INIT_PROJECT`.

---

### MIN-7: `DeferredItem`, `Verification`, `ArchitectureDelta`, `DecisionEntry` types used but never field-defined [DIRECTLY_ACTIONABLE]

**Raised by:** tui-cli (MINOR-2)
**Authority:** tui-cli
**Files:** `state-machine-api.md`, `rpc-layer-api.md`, `data-model.md`

These types appear in state machine events and RPC layer interfaces but are never given field-level type definitions:
- `Verification` — fields inferrable from `epic.json` example (`description`, `status`, `addedDuring`, `modifiedDuring`) but not as a typed interface.
- `DeferredItem` — fields never specified anywhere.
- `ArchitectureDelta` — fields inferrable from `architecture-deltas.jsonl` example (`subsystem`, `type`, `description`, `ts`) but only in prose.
- `DecisionEntry` — used as `Partial<DecisionEntry>` in `UPDATE_DECISION`; fields never defined.

Zod schema writers must infer field names and optionality from scattered examples, risking divergence from spec.

**Fix:** Add interface definitions for these four types in `state-machine-api.md` or a new `types.md` section in the architecture.

---

### MIN-8: `--inline` and `--override` global flag table scoping unclear; `--inline` typing mismatch in code example [DIRECTLY_ACTIONABLE]

**Raised by:** tui-cli (MINOR-3, MINOR-4)
**Authority:** tui-cli
**Files:** `commands-api.md`

Two related `--inline` issues:
1. `--inline` is in the "Available on every command" table but context bundling only applies to workflow begin/complete and `start-*` commands. When passed to `resource:*`, `status`, `schema`, or `init`, it is silently ignored. The spec should state which commands meaningfully consume `--inline`, or note that it is silently ignored elsewhere.
2. The citty command example shows `inline: { type: 'string' }` but the Global Flags table types it as `boolean or number`. A `type: 'string'` citty flag would not coerce `--inline` (no value) to a boolean or number. The wire type vs. semantic type discrepancy will cause confusion during flag parsing implementation.

Note: the `--override` scoping issue (placed in global flags but command-specific) is addressed separately in IMP-5.

**Fix:** (1) Clarify in the global flags table or a note which command categories meaningfully support `--inline`. (2) Correct the citty example to match the declared type, or add a coerce step and explain why `type: 'string'` is used.

---

## USER_INPUT Items

None. All conflicts were resolvable by authority rules:
- Boundary/depth conflicts → software-architecture authority applied.
- Domain-specific issues (CLI surface, state machine contracts) → specialist authority applied.
- No cross-domain conflicts requiring user input were identified.

---

## Summary

| Category | Count |
|---|---|
| Critical | 0 |
| Important | 5 |
| Minor | 8 |
| USER_INPUT | 0 |
| DIRECTLY_ACTIONABLE | 13 |

**Domains needing re-review after fixes:** None required. All issues are documentation/contract gaps rather than design problems. The core architecture (pure state machine, unidirectional layers, unified state, data ownership split, orchestrator/sub-agent pattern) is sound and consistent across all reviewers. A targeted re-review of `rpc-layer-api.md` and `commands-api.md` after IMP-1 through IMP-5 are addressed would confirm closure, but a full round-5 review is not needed unless fixes introduce new interfaces.

**Highest priority:** IMP-1 (`SubmitInput` type definition) and IMP-2 (`Phase` conflation) — raised by 4 and 1 reviewers respectively; both block correct implementation of the RPC `submit()` function.
