# State Machine

## What We're Building
The pure state machine subsystem: a reducer function operating on declarative transition tables. Takes `(ProjectState, StateEvent) → ProjectState | StateError`. Handles lifecycle for all entity types (project, epic, slice, quest, decision), guards (activation gate, sequential slices, circuit breakers, verification criteria), and tracking state (refinement rounds, scores). Zero I/O — pure functions only.

The complete transition specification is in `architecture/transition-tables.md`. Every transition row becomes a transition rule in code and a unit test. Context return rows specify what each phase returns to orchestrators and sub-agents.

## Behavior
1. `reduce(state, event)` is the single entry point. Matches event type to transition table, finds the first row where `(from, on)` matches and guard returns `true`, runs `apply`, returns new state.
2. If no guard passes for a matching `(from, on)` pair, returns `StateError` with `STATE_INVALID_TRANSITION`.
3. Guards return `true` (pass), `'skip'` (try next row), or `StateError` (reject with specific code).
4. Apply functions produce new `ProjectState` including activity log entries — no side effects.
5. `_derived` fields are read-only in guards (e.g., `planContentProvided`, `refinedPlanExists`).
6. `override: true` on refinement completion events bypasses score threshold guards.
7. Cross-entity guards enforce: one active epic, sequential slice execution, verification criteria at activation, verification passed at completion.
8. Implicit transition detection: after COMPLETE_SLICE, check if all sibling slices are complete and flag in response.

## Success Criteria
- [ ] One passing test per valid transition row in `architecture/transition-tables.md` (happy path)
- [ ] One passing test per guard in the Cross-Cutting Guards table (rejection case with correct error code)
- [ ] Full epic lifecycle test: chain reduce calls from CREATE_EPIC through COMPLETE_EPIC — each returns valid new state with correct status
- [ ] Full slice lifecycle test: same, including refinement loop with improving scores across rounds
- [ ] Full quest lifecycle test: same as slice, confirming no sequential enforcement
- [ ] Skip path tests: explore-skip, architecture-skip, refinement-skip (first round passes)
- [ ] Circuit breaker: COMPLETE_REFINEMENT_ROUND at maxRounds without override returns STATE_MAX_ROUNDS_REACHED
- [ ] Override: `override: true` bypasses score threshold and circuit breaker
- [ ] ACTIVATE_EPIC with active epic returns STATE_EPIC_ALREADY_ACTIVE
- [ ] ACTIVATE_EPIC with empty verifications returns STATE_MISSING_VERIFICATIONS
- [ ] COMPLETE_SLICE with verificationPassed: false returns STATE_VERIFICATION_FAILED
- [ ] Sequential enforcement: BEGIN_PLAN on slice 02 while slice 01 is not done returns STATE_SLICE_NOT_READY
- [ ] Abandon from any non-terminal state succeeds; abandon from terminal state returns error
- [ ] Decision lifecycle: create → update → supersede; revisiting → resolve
- [ ] Implicit transition: COMPLETE_SLICE for last slice flags epicComplete: true in returned state
- [ ] Reducer purity: property-based test — same (state, event) always produces same output
- [ ] Lifecycle smoke test: chain reduce() calls through a full entity lifecycle on a fixture ProjectState — each returns valid new state
- [ ] EpicStatus/SliceStatus/QuestStatus enum values reconciled between `state-machine-api.md` and `transition-tables.md` — transition tables are source of truth; document reconciliation in `architecture/state-machine-api.md` before implementation begins
- [ ] No I/O imports: `grep -r "from.*fs" src/core/state/` returns nothing

## Verification
1. Run `bun test tests/unit/state/` — all tests pass.
2. Count test cases vs transition table rows — every row has at least one test.
3. Run property-based purity test: 100+ random valid (state, event) pairs produce identical results on repeated calls.
4. Run import analysis: verify zero I/O module imports in `src/core/state/`.
5. Smoke test: a test that wires `reduce()` to a fixture `ProjectState` and validates a full entity lifecycle (create → activate → plan → complete) without any I/O, confirming the reducer chain works end-to-end.

**Note:** This slice is a unit-test-only exception to the end-to-end verifiability rule. The reducer has no I/O and is not wired to the CLI until slice 04. The smoke test (step 5) provides the closest approximation to end-to-end validation.

**Blocking gate:** EpicStatus/SliceStatus/QuestStatus enum values MUST be reconciled between `state-machine-api.md` and `transition-tables.md` before any state machine code is written — transition tables are the source of truth; document reconciliation in `architecture/state-machine-api.md` before implementation begins. This is a success criterion, not an informational note.

## Scope Boundaries
**In scope:** Reducer function, all transition tables per `architecture/transition-tables.md`, all guards per Cross-Cutting Guards table, entity status enums (EpicStatus, SliceStatus, QuestStatus), `StateEvent` discriminated union type, `StateError` types, activity log entry generation in apply functions, supporting types (DeferredItem, Verification, VerificationResult, ArchitectureDelta, DecisionEntry), comprehensive unit tests, lifecycle smoke test. Consumes Zod schemas from `src/schemas/` (defined in slice 02). Fitness function for transition table completeness should derive expected counts from the `StateEvent` discriminated union type rather than parsing the markdown table. The fitness function must also cross-validate the discriminated union member count against the transition table row count to detect missing events in the union.
**Out of scope:** File I/O, RPC orchestration, CLI commands, defining entity/JSONL schemas (slice 02 owns those).
