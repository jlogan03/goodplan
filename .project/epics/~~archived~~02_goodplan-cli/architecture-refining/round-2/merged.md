# Merged Architecture Review Feedback -- Round 2

Sources: Software Architecture (7/10), Holistic (8/10), API Contract (8/10), TUI & CLI (8/10)

All round-1 issues verified resolved across all reviewers.

---

## CRITICAL

### CRIT-1: DecisionEntry status enum does not match transition-tables.md
**Source:** Software Architecture
**Files:** `state-machine-api.md` (line 111), `transition-tables.md` (lines 129-134)

`DecisionEntry.status` defines `'active' | 'superseded' | 'rejected'`. Transition table uses `'active'`, `'superseded'`, `'revisiting'` -- no `'rejected'`, and `'revisiting'` is absent from the enum. Same class of bug as round 1 C1.

**Fix:** Change to `'active' | 'superseded' | 'revisiting'`. If `'rejected'` is intentionally reachable, add a transition row. If not, remove from type.

**Resolution:** DIRECTLY_ACTIONABLE

---

## IMPORTANT

### IMP-1: `CompleteInput` cannot represent epic completion payload
**Source:** Software Architecture, API Contract (converged independently)
**Files:** `rpc-layer-api.md`, `state-machine-api.md` (line 48), `commands-api.md` (lines 157-166)

`CompleteInput` has `verificationPassed: boolean` (slice/quest shape) but `COMPLETE_EPIC` requires `verificationResults: VerificationResult[]`. No way to pass epic completion data through the current type.

**Fix:** Either add `verificationResults?: VerificationResult[]` to `CompleteInput` (documenting that epic uses `verificationResults` while slice/quest uses `verificationPassed`), or make `CompleteInput` a discriminated union by target type.

**Resolution:** DIRECTLY_ACTIONABLE

---

### IMP-2: Five types referenced in RPC public API but never defined
**Source:** Software Architecture, API Contract, Holistic (all three flagged subsets)
**Files:** `rpc-layer-api.md`

Undefined types:
1. `PathReferences` -- used in `SubmitResult`, `BeginResult`, `CompleteResult`
2. `DecisionSummary` -- used in `ContextBundle.decisions`
3. `LearningSummary` -- used in `ContextBundle.learnings`
4. `StatusOptions` -- parameter of `status()`
5. `ContextResult` -- return type of `startContext()`

**Fix:** Define all five. `PathReferences` likely `Record<string, string>` or structured path map. `DecisionSummary`/`LearningSummary` are projections of full record types. `StatusOptions` likely subset of `WorkflowOptions` or empty. `ContextResult` may be identical to `ContextBundle` -- if so, alias or rename.

**Resolution:** DIRECTLY_ACTIONABLE

---

### IMP-3: `BeginPhase` mapping comments incomplete and `'complete'` value is dead
**Source:** Software Architecture, API Contract (converged)
**Files:** `rpc-layer-api.md` (lines 25-40, 57-69, 86-95)

Mapping comments cover 11 of ~19 `BeginPhase` -> `StateEvent` mappings. Missing: `refine-plan`, `create` for slice/quest/decision, `abandon` for all entity types, `add-verification`, `update-verification`, `rollup`. Additionally, `'complete'` in `BeginPhase` is unreachable -- entity completion routes to the separate `complete()` function.

**Fix:** Add all missing mapping lines. Remove `'complete'` from `BeginPhase`.

**Resolution:** DIRECTLY_ACTIONABLE

---

### IMP-4: Quest lifecycle missing first-round skip path that slices have
**Source:** Software Architecture, API Contract (converged)
**Files:** `transition-tables.md`

Slice has `plan-created | COMPLETE_REFINEMENT_ROUND -> plan-refined` (first round scores meet threshold). No equivalent quest row exists despite "Quest lifecycle mirrors slice" statement.

**Fix:** Add row: `plan-created | COMPLETE_QUEST_REFINEMENT_ROUND | plan-refined | scores meet threshold (first round) | -- | quest, status, round, scores, thresholdMet | Skip path: first round passes`

**Resolution:** DIRECTLY_ACTIONABLE

---

### IMP-5: `submit-*` command routing, validation, and completion flow unclear
**Source:** Software Architecture, TUI & CLI (converged)
**Files:** `commands-api.md`

Two related gaps:
1. **Routing ambiguity:** `submit-*` commands "write through the Data Layer with state validation" but what layer they route to and what "state validation" means concretely (status check? schema only?) is unspecified. They write data but don't transition state, so they don't fit cleanly into the "read-only -> Data Layer, mutations -> RPC Layer" routing rule.
2. **Completion flow gap:** After a sub-agent calls `submit-plan`, what entity command does the orchestrator call to advance state? `slice:plan` maps to `BEGIN_PLAN` (a start, not completion). No command maps to `COMPLETE_PLAN` or `COMPLETE_REFINEMENT_ROUND`. Either `submit-*` should trigger completion events internally, or explicit completion commands are needed.

**Fix:** Specify: (a) routing layer for `submit-*`, (b) concrete meaning of "state validation", (c) whether `submit-*` can fail due to wrong entity state, (d) which command triggers `COMPLETE_PLAN` / `COMPLETE_REFINEMENT_ROUND` after submit.

**Resolution:** USER_INPUT (design decision on submit-* scope)

---

### IMP-6: `reduce()` signature inconsistency across files
**Source:** Software Architecture
**Files:** `state-machine-api.md`, `flows.md`, roll-your-own-state-machine decision

State machine defines `reduce(state, event)` (two args). `flows.md` shows `(state, event, input)` (three args). The decision document says `(state, event, context) -> (new state, new context | error)`. Since the event union carries its own payload, the two-argument form is correct.

**Fix:** Update `flows.md` to `(state, event)`. Clarify in the decision that `context` was superseded by the event-carries-payload design.

**Resolution:** DIRECTLY_ACTIONABLE

---

### IMP-7: State-machine-api.md lists guards that don't exist in transition tables
**Source:** Holistic
**Files:** `state-machine-api.md` (lines 258-262), `transition-tables.md` (lines 19-23, 138-147)

"Key guards" section claims:
- `hasChild(state, "epics/<name>/architecture", "_overview.md")` guards `COMPLETE_ARCHITECTURE`
- `Object.keys(getDir(...))` guards `COMPLETE_EXPLORE`

Neither exists in transition-tables.md (source of truth). Transition tables show no guard (dash) for both events.

**Fix:** Remove from state-machine-api.md. Transition-tables.md is the declared source of truth for guards.

**Resolution:** DIRECTLY_ACTIONABLE

---

### IMP-8: SubmitInput accepts learnings on intermediate phases but StateEvent types don't carry them
**Source:** Holistic
**Files:** `rpc-layer-api.md` (lines 127-148), `state-machine-api.md` (lines 37-45, 52-56), `invariants.md` (INV-001)

`SubmitInput` offers `learnings?: Learning[]` on every phase. But most `COMPLETE_*` state events don't carry learnings -- only `COMPLETE_SLICE` and `COMPLETE_QUEST` do. This violates INV-001 ("every state mutation goes through the state machine") since the RPC layer would need to persist learnings outside the reducer.

**Fix:** Either add `learnings?: Learning[]` to all `COMPLETE_*` state events, or remove `learnings` from intermediate `SubmitInput` phases and only accept them at entity completion.

**Resolution:** USER_INPUT (design decision on learning capture granularity)

---

### IMP-9: Epic phase commands map to unspecified generic BEGIN events
**Source:** Software Architecture
**Files:** `commands-api.md`, `state-machine-api.md`

Command mapping shows `epic:explore` -> "BEGIN with phase=explore (generic)" but the `StateEvent` union has no generic `BEGIN_PHASE` variant. It has specific events like `ACTIVATE_EPIC`. The command surface promises capabilities the state machine can't handle.

**Fix:** Either add a generic `{ type: 'BEGIN_PHASE'; entity: string; phase: Phase }` event, or add explicit per-phase events and update the mapping table to reference them.

**Resolution:** USER_INPUT (generic vs explicit events)

---

### IMP-10: `--override` flag not connected to state machine
**Source:** Software Architecture
**Files:** `commands-api.md`, `state-machine-api.md`

`--override` appears on refinement commands. Data model has `maxRounds` circuit breaker. But no `override` field exists on refinement completion events. The guard checking `round >= maxRounds` has no bypass mechanism.

**Fix:** Add `override?: boolean` to refinement completion events and update guards to check it.

**Resolution:** DIRECTLY_ACTIONABLE

---

### IMP-11: `context` command positional `<phase>` argument breaks "no positional data" convention
**Source:** TUI & CLI
**Files:** `commands-api.md`

`goodplan context <phase> ...` uses positional data. Entity-namespaced-commands decision says "unflagged positional arguments are always commands/subcommands, never data."

**Fix:** Change to `--phase` flag, or remove `context` command if `start-*` commands make it redundant.

**Resolution:** USER_INPUT (keep with flag vs remove)

---

### IMP-12: Windows target platform listed with no architectural acknowledgment of limitations
**Source:** TUI & CLI
**Files:** `_overview.md`

`windows-x64` listed as target with no caveats about Bun Windows support, `fs.rename` atomicity, `process.stdin.isTTY` behavior, forward-slash path keys.

**Fix:** Add "Known Platform Gaps" note, or mark Windows as aspirational.

**Resolution:** USER_INPUT (real target or aspirational?)

---

## MINOR

### MIN-1: `src/commands/build/` in conventions.md has no matching commands
**Source:** Software Architecture
**Files:** `conventions.md`, `commands-api.md`

No `build:*` commands exist. Likely leftover. Remove or note as planned.

### MIN-2: Quest `implement` event missing from state machine
**Source:** Software Architecture
**Files:** `state-machine-api.md`, `commands-api.md`

`quest:implement` in commands but state machine only has create/begin/complete/abandon for quests. Either simplify command surface or add events.

### MIN-3: `context` command routing unclear (read-only but assembles RPC ContextBundle)
**Source:** Software Architecture
**Files:** `commands-api.md`

Routes as read-only (-> Data Layer) but assembles ContextBundle (RPC responsibility). Worth a clarifying note.

### MIN-4: State cache invalidation on schema version changes unspecified
**Source:** Software Architecture
**Files:** `data-model.md`

Cache versioning strategy not specified. After CLI upgrade, what invalidates stale cache?

### MIN-5: flows.md slice:complete references wrong source status
**Source:** API Contract
**Files:** `flows.md` (line 67)

Says `implementing` but `COMPLETE_SLICE` fires from `implementation-complete`. Fix to `implementation-complete`.

### MIN-6: Example state tree omits project-level directories
**Source:** Holistic
**Files:** `data-model.md` (lines 237-292)

Missing `architecture/`, `research/`, `brainstorm/`, `prototypes/` at project root. Add at least `architecture` to example.

### MIN-7: `schema` command positional `[<command-path>]` -- same convention issue
**Source:** TUI & CLI
**Files:** `commands-api.md`

Should use `--command <path>` if "no positional data" convention holds.

### MIN-8: `resource:` namespace has inconsistent entity targeting patterns
**Source:** TUI & CLI
**Files:** `commands-api.md`

Filter flags not regular across resource commands. Regularity helps LLM consumers.

### MIN-9: `--override` not documented as cross-cutting refinement convention
**Source:** TUI & CLI
**Files:** `commands-api.md`

Appears on multiple refinement commands but not called out as a pattern. Related to IMP-10.

### MIN-10: No help text strategy documented
**Source:** TUI & CLI
**Files:** `commands-api.md`

citty generates `--help` but quality expectations for LLM-first CLI not specified.

### MIN-11: `plan-refining.md` in directory structure but never referenced
**Source:** Software Architecture
**Files:** `data-model.md`

Lifecycle unspecified -- when created, by whom, existence ever checked? Add a note or remove.

### MIN-12: INIT_PROJECT transition "To" says `initialized` but project.json has no status field
**Source:** Software Architecture
**Files:** `transition-tables.md`, `data-model.md`

Structurally inconsistent with other transition table rows. Add status field or change to "--" with note.

---

## Tally

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Important | 12 |
| Minor | 12 |
| **Total** | **25** |

## Deduplication Notes

These issues were flagged by multiple reviewers and merged:
- **CompleteInput epic gap** (Software Arch + API Contract) -> IMP-1
- **Undefined RPC types** (Software Arch + API Contract + Holistic) -> IMP-2
- **BeginPhase incomplete + dead 'complete'** (Software Arch + API Contract) -> IMP-3
- **Quest skip path missing** (Software Arch + API Contract) -> IMP-4
- **submit-* routing/completion** (Software Arch + TUI & CLI) -> IMP-5

## Conflict Resolutions

| Topic | Disagreement | Resolution |
|---|---|---|
| `--override` severity | Software Arch: IMPORTANT (state machine gap), TUI & CLI: MINOR (convention doc) | Split: state machine gap is IMP-10 (trust specialist on boundaries), convention doc is MIN-9 |
| Phantom guards severity | Holistic: IMPORTANT, Software Arch: not flagged | IMPORTANT -- source-of-truth contradiction, trust Holistic on cross-file consistency |
| Learnings intermediate capture | Holistic: IMPORTANT (INV-001 tension) | IMPORTANT -- INV-001 is a hard invariant; needs design decision |

## USER_INPUT Required

1. **IMP-5** -- submit-* scope: should submit-* trigger state events (merge write+advance), or remain write-only with separate completion commands?
2. **IMP-8** -- Learnings granularity: accept learnings on all intermediate phases (add to all COMPLETE_* events), or only at entity completion?
3. **IMP-9** -- Epic phase events: generic `BEGIN_PHASE` event, or explicit per-phase events (BEGIN_EXPLORE, BEGIN_ARCHITECTURE, etc.)?
4. **IMP-11** -- context command: keep with `--phase` flag, or remove (start-* is equivalent)?
5. **IMP-12** -- Windows: real target or aspirational?

## Priority Order (suggested)

1. **CRIT-1** -- DecisionEntry enum (trivial fix, same class as round-1 critical)
2. **IMP-1** -- CompleteInput epic payload (blocks epic:complete)
3. **IMP-5** -- submit-*/completion flow (blocks sub-agent integration) [USER_INPUT]
4. **IMP-2** -- Undefined types (blocks RPC implementation)
5. **IMP-7** -- Phantom guards (source-of-truth contradiction)
6. **IMP-8** -- Learnings/INV-001 tension [USER_INPUT]
7. **IMP-9** -- Generic BEGIN events gap [USER_INPUT]
8. **IMP-10** -- --override state machine connection
9. **IMP-3** -- BeginPhase mappings + dead 'complete'
10. **IMP-4** -- Quest skip path
11. **IMP-6** -- reduce() signature drift
12. **IMP-11** -- context positional arg [USER_INPUT]
13. **IMP-12** -- Windows platform [USER_INPUT]
14. Minor issues (batch fix)

### USER_INPUT Resolved

1. **IMP-5** (submit-* scope): Keep current design — submit-* triggers state event (write + advance in one call).
2. **IMP-8** (Learnings granularity): Only at entity completion. Remove `learnings` from intermediate SubmitInput phases. Keep only on CompleteInput.
3. **IMP-9** (Epic phase events): Fix the mapping comments — events already exist as explicit per-phase types.
4. **IMP-11** (context command): Remove standalone context command. start-* commands cover the use case.
5. **IMP-12** (Windows): Mark as aspirational with known gaps note.
