# Merged Architecture Review — Round 2

All Round 1 CRITICAL and IMPORTANT issues: **RESOLVED**.

---

## CRITICAL Issues

None.

---

## IMPORTANT Issues

### IMP-1: Epic phase commands have no matching StateEvent in the union
**Flagged by:** software-architecture, holistic
**Files:** `commands-api.md`, `state-machine-api.md`

`epic:explore`, `epic:define-architecture`, etc. map to "BEGIN with phase=explore (generic)" in the command-to-event table, but the `StateEvent` discriminated union has no generic `BEGIN` event type. Either add `{ type: 'BEGIN_PHASE'; entity: string; phase: Phase }` to the union, or add explicit events for each epic phase. The state machine contract cannot handle epic pre-activation workflow as specified.

### IMP-2: `submit-*` command routing and validation are under-specified
**Flagged by:** software-architecture, holistic, api-contract, tui-cli
**Files:** `commands-api.md`, `data-layer-api.md`, `_overview.md`

Four related gaps:
1. **Routing path unclear.** The overview says resource commands go to Data Layer, workflow commands to RPC. `submit-*` commands write data with state validation but don't trigger transitions — which layer handles them?
2. **"State validation" undefined.** Does `submit-plan` check the slice is in `planning` status? Via which layer?
3. **No `writeContent()` in Data Layer API.** `submit-*` writes markdown, but `data-layer-api.md` has no function for writing content files (only `writeEntity` for JSON, `appendRecord` for JSONL).
4. **Completion event gap.** `submit-plan` writes the plan, then the orchestrator needs to advance state. But no command maps to `COMPLETE_PLAN` or `COMPLETE_REFINEMENT_ROUND` events. The two-step dance (submit then advance) has a missing second step.

### IMP-3: Quest lifecycle events missing from state machine
**Flagged by:** software-architecture, holistic, api-contract
**Files:** `state-machine-api.md`, `commands-api.md`

`quest:plan`, `quest:refine-plan`, `quest:implement` appear in the command surface but the `StateEvent` union only has `CREATE_QUEST`, `BEGIN_QUEST`, `COMPLETE_QUEST`, `ABANDON_QUEST`. No quest variants of `BEGIN_PLAN`, `BEGIN_REFINEMENT`, or implementation events exist. Either quests intentionally skip these phases (document it) or the events need quest variants.

### IMP-4: `--override` flag has no state machine mechanism
**Flagged by:** software-architecture, holistic, api-contract
**Files:** `commands-api.md`, `state-machine-api.md`

`--override` appears on `epic:refine-architecture`, `epic:refine-slices`, `slice:refine-plan`. The state machine has a `maxRounds` circuit breaker guard but no `override` field on any event. Either add `override: boolean` to refinement events, or document that the RPC layer handles this pre-reduce (which puts business logic in RPC, potentially violating "orchestration only").

### IMP-5: `reduce()` signature inconsistency
**Flagged by:** software-architecture
**Files:** `state-machine-api.md`, `flows.md`

`state-machine-api.md` defines `reduce(state, event) -> state | error`. `flows.md` shows `(state, event, input)` — three arguments. The decision doc says `(state, event, context) -> (new state, new context | error)`. Since the event union carries its payload, the two-argument form is correct. Fix `flows.md` and the decision doc to match.

### IMP-6: Cross-cutting commands missing from command-to-event mapping table
**Flagged by:** api-contract
**Files:** `commands-api.md`, `state-machine-api.md`

- `learning:rollup` has no mapping (but `ROLLUP_LEARNINGS` event exists).
- `decision:create`/`decision:update` have no mappings. Are decisions state machine mutations (need events) or data-only writes (belong in `resource:` namespace)?
- `epic:add-verification`/`epic:update-verification` have `ADD_VERIFICATION`/`UPDATE_VERIFICATION` events but are omitted from the mapping table.

### IMP-7: `context` command uses positional `<phase>` argument, breaking "no positional data" convention
**Flagged by:** tui-cli
**Files:** `commands-api.md`

`goodplan context <phase> --slice <name>` uses positional data for phase, contradicting the convention that positional arguments are always commands/subcommands, never data. Should be `--phase plan` or removed in favor of `start-*` commands (which are described as equivalent).

### IMP-8: Windows target platform listed without caveats
**Flagged by:** tui-cli
**Files:** `_overview.md`

`windows-x64` is listed as a target platform with no acknowledgment of known gaps: Bun Windows support maturity, `fs.rename` atomicity differences, path separator handling in state keys. Either add a "Known Platform Gaps" note or mark Windows as aspirational.

---

## MINOR Issues

### MIN-1: `src/commands/build/` directory in conventions.md has no matching commands
**Flagged by:** software-architecture, holistic
**Files:** `conventions.md`

No `build:*` commands exist in commands-api.md. Either remove the directory from the structure or rename to match entity namespaces.

### MIN-2: flows.md Learning example uses stored shape instead of input shape
**Flagged by:** api-contract
**Files:** `flows.md`

The completion flow example shows `"rollup": true` but the canonical input `Learning` type uses `rollupTo: ('epic' | 'project')[]`. The example should show the input shape.

### MIN-3: `--override` not documented as a cross-cutting refinement pattern
**Flagged by:** tui-cli, api-contract
**Files:** `commands-api.md`

`--override` appears on multiple refinement commands but isn't called out as a convention. Also missing from `quest:refine-plan` (inconsistency with `slice:refine-plan`).

### MIN-4: State cache invalidation on schema version changes undocumented
**Flagged by:** software-architecture
**Files:** `data-model.md`

Version mismatch is listed as a cache invalidation trigger but the versioning strategy and upgrade pathway aren't specified.

### MIN-5: `schema` command uses positional `[<command-path>]` argument
**Flagged by:** tui-cli
**Files:** `commands-api.md`

Same positional-data concern as the `context` command. Should be `--command <path>` for consistency.

### MIN-6: `resource:` namespace has inconsistent entity targeting patterns
**Flagged by:** tui-cli
**Files:** `commands-api.md`

`resource:slice show` uses `--slice`, `resource:activity list` uses `--scope`. Not fully regular for LLM consumers.

### MIN-7: No help text strategy documented
**Flagged by:** tui-cli
**Files:** `commands-api.md`

citty generates `--help` but quality/content expectations for LLM-first CLI aren't specified.

### MIN-8: Fitness function prioritization missing from individual files
**Flagged by:** holistic

`_overview.md` sets priority order but individual subsystem files all list fitness functions as "candidate — not yet written" without echoing the priority.

### MIN-9: `architecture-deltas.jsonl` simplified from design spec without documenting the decision
**Flagged by:** holistic
**Files:** `data-model.md`

Design spec had `status` (proposed/approved/applied) and `rationale` fields for approval workflow. Architecture has a simpler schema. If the approval step was dropped, document the simplification.

---

## DIRECTLY_ACTIONABLE

These can be fixed without design decisions:

1. **IMP-5** — Fix `flows.md` reducer call to `(state, event)`, fix decision doc similarly.
2. **IMP-6** — Add missing commands to the mapping table (`learning:rollup` -> `ROLLUP_LEARNINGS`, verification commands -> their events).
3. **MIN-1** — Remove or rename `src/commands/build/` in conventions.md.
4. **MIN-2** — Fix Learning example in flows.md to use `rollupTo`.
5. **MIN-8** — Add priority indicators to fitness function sections in subsystem files.
6. **MIN-9** — Add a note in data-model.md explaining the simplified architecture-deltas schema.

## RESEARCH_NEEDED

1. **IMP-8** — Windows platform support: assess Bun maturity on Windows, decide keep/drop/defer.

## Contradictions Resolved

| Topic | Disagreement | Resolution |
|---|---|---|
| `context` command routing | software-architecture flagged as MINOR ("routing unclear"), tui-cli flagged positional arg as IMPORTANT | Kept both: routing is MIN (software-arch is specialist on boundaries), positional convention violation is IMP (tui-cli is specialist on CLI ergonomics) |
| `--override` severity | software-architecture: IMPORTANT, api-contract: MINOR, tui-cli: MINOR | Elevated to IMPORTANT (IMP-4) — software-architecture is the specialist on state machine boundary concerns; demoted the CLI ergonomic aspect to MIN-3 |

## Unresolved (USER_INPUT Required)

1. **IMP-1 (epic phase events):** Generic `BEGIN_PHASE` event vs. explicit per-phase events? Both are valid — generic is simpler, explicit is safer for exhaustiveness checks.
2. **IMP-2 (submit-* routing):** Which layer handles `submit-*`? Options: (a) new Data Layer `writeContent()` with status guard, (b) RPC layer with no `reduce()` call, (c) `submit-*` triggers `COMPLETE_*` events directly (merging the two-step dance).
3. **IMP-3 (quest lifecycle):** Do quests have plan/refine/implement phases, or are they simpler (create -> begin -> complete)? This determines whether quest-specific events are needed.
4. **IMP-4 (--override mechanism):** Event field vs. RPC-layer pre-reduce check? Affects where business logic lives.
5. **IMP-6 (decision commands):** Are `decision:create`/`decision:update` state machine mutations or data-only writes?
6. **IMP-7 (positional phase arg):** Switch to `--phase` flag, or remove `context` command in favor of `start-*`?

### USER_INPUT Resolved

**1. Epic phase events:** Explicit per-phase events (BEGIN_EXPLORE, BEGIN_ARCHITECTURE, etc.). Each phase has different guards and payloads — explicit events enable TypeScript exhaustiveness checking and proper discriminated union payloads.

**2. submit-* routing:** submit-* triggers state events. submit-plan triggers COMPLETE_PLAN, merging content write and state advance into one step. State machine validates the status, RPC handles both content write and state update in one commitState. No two-step dance.

**3. Quest lifecycle:** Full lifecycle, same as slices. Quests go through plan/refine/implement/complete. Add quest variants of all slice events to the StateEvent union.

**4. --override mechanism:** Event field. Add override:boolean to refinement completion events. State machine sees and validates it — keeps all business logic in the state machine per INV-001.

**5. Decision commands:** State machine mutations. Add CREATE_DECISION and UPDATE_DECISION events. Consistent with INV-001 (all mutations through reduce()).

**6. context command:** Remove it. Sub-agents use start-* commands which return context. Orchestrator uses status. A standalone context command is redundant with this design.
