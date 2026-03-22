# Phase 3: Epic State Machine Transitions

All ~20 epic transition handlers plus slice/quest submit handlers. Pure functions, no I/O. Builds on Phase 1 types and the existing reduce() from slice 02.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/state/transitions/epic-create.ts` — file not found
- [ ] `grep "CREATE_EPIC" src/core/state/reduce.ts` — no match (only INIT_PROJECT handler registered)

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/state/` — all state machine tests pass (existing + new)
- [ ] `grep -r "from.*fs" src/core/state/` — returns nothing (purity preserved)
- [ ] `npx tsc --noEmit` — passes

### Tasks

- [x] Refactor `src/core/state/reduce.ts` — replace switch with handler Map pattern. Handler signature uses `Extract<StateEvent, { type: T }>` for discriminated union narrowing (matching existing `handleInitProject` pattern). `reduce.ts` explicitly imports all handler files and builds the map at module level — no side-effect registration. Use `satisfies Record<StateEvent['type'], Handler>` on the handler object before converting to Map to provide compile-time exhaustiveness checking (with `noUncheckedIndexedAccess: true`, `Map.get()` returns `T | undefined` which forces the error path but doesn't catch missing handlers at compile time). `reduce()` looks up event.type in the map, calls the handler with narrowed event type, returns result. Unknown types → StateError with STATE_INVALID_TRANSITION (existing behavior preserved).
- [x] Create `src/core/state/transitions/epic-create.ts` — CREATE_EPIC handler. Creates `epics/<name>/epic.json` (with goal, status: created, empty verifications, empty sliceSequence, refinement: null, `created: ts`, `updated: ts`, `activated: null`), creates directory tree (`architecture/`, `research/`, `brainstorm/`, `prototypes/`) using explicit `setEntry` calls with `{ type: "directory", contents: {} }` for each empty subdirectory, updates `epics/overview.json` (adds item), appends activity-log entry. Guard: epic name must not already exist in tree.
- [x] Create `src/core/state/transitions/epic-phase.ts` — BEGIN/COMPLETE handlers for the explore→architecture→slicing phase chain. BEGIN_EXPLORE: guard status == created, set exploring. COMPLETE_EXPLORE: two from-status matches per transition-tables.md — `from: created → explored` (skip path) and `from: exploring → explored` — each unconditional (no business-logic guard). Not a single handler with an OR guard. BEGIN_ARCHITECTURE through COMPLETE_SLICING: follow transition-tables.md exactly for from-status guards and to-status transitions. Each handler updates epic.json status + appends activity-log entry.
- [x] Create `src/core/state/transitions/epic-refine.ts` — COMPLETE_REFINE_ARCHITECTURE and COMPLETE_REFINE_SLICES handlers with circuit breaker logic. Shared refinement helper: check scores against threshold (all >= 9), check override flag, check round vs maxRounds. If scores pass OR override → advance to refined status. If scores below AND round < maxRounds → stay in refining, increment round, record scores. If round >= maxRounds AND !override → StateError STATE_MAX_ROUNDS_REACHED. Update epic.json refinement field (round, scoreHistory).
- [x] Create `src/core/state/transitions/epic-lifecycle.ts` — ACTIVATE_EPIC: guard status == slices-refined, guard project.activeEpic == null (STATE_EPIC_ALREADY_ACTIVE), guard verifications.length > 0 (STATE_MISSING_VERIFICATIONS). Sets epic.json status to activated, sets project.json activeEpic. COMPLETE_EPIC: guard status == activated, guard all verificationResults passed (STATE_VERIFICATION_FAILED). Sets epic.json status to completed, clears project.json activeEpic. ABANDON_EPIC: guard status is non-terminal. Sets abandoned, clears activeEpic if this was active.
- [x] Create `src/core/state/transitions/epic-verify.ts` — ADD_VERIFICATION: guard status is pre-activated (not activated/completed/abandoned). Appends to epic.json verifications array. UPDATE_VERIFICATION: same guard, updates verification at specified index (guard index exists).
- [x] Create `src/core/state/transitions/slice-submit.ts` — **Note: these handlers are pulled forward from slices 04-05 because in-scope submit commands (submit-plan, submit-refinement, submit-implementation) require them.** COMPLETE_PLAN: resolve entity path from event field (`slices/${event.slice}/slice.json` for slice status, `slices/${event.slice}` for hasChild). Guard hasChild for plan.md in entity path (note: this guard requires `plan.md` to already exist in the loaded state tree — `loadState` reads the filesystem first, so this is correct as long as the sub-agent has already written plan.md before calling submit-plan). Sets slice status to plan-created. COMPLETE_REFINEMENT_ROUND: shared refinement logic (same circuit breaker as epic-refine). COMPLETE_IMPLEMENTATION: sets slice status to implementation-complete. Also handle quest variants (COMPLETE_QUEST_PLAN, COMPLETE_QUEST_REFINEMENT_ROUND, COMPLETE_QUEST_IMPLEMENTATION) with same logic but quest paths.
- [x] Export transition tables from handler files as `export const epicTransitions: { from: string; event: string; to: string }[]` arrays to enable fitness function enumeration in slice 08. **Decision: export approach is preferred** — it makes the transition spec explicit and testable without constructing valid state trees for every combo. The alternative (enumerate via `reduce()` on all status/event combos) is acceptable if the export creates unwanted coupling, but start with exports. **Note:** if the state machine later matures beyond experimental, evaluate whether this export leaks implementation details and consider internalizing it.
- [x] Write unit tests — organized by transition file:
  - epic-create: CREATE_EPIC produces complete directory tree + overview update + activity log
  - epic-phase: full phase chain via COMPLETE_* skip paths (created→explored→arch-defined→arch-refined→slices-defined→slices-refined). BEGIN_* transitions for each phase.
  - epic-refine: circuit breaker (scores below → stay, scores pass → advance, max rounds → error, override → force advance). Score history recorded.
  - epic-lifecycle: ACTIVATE guards (no other active, verifications exist), COMPLETE_EPIC (all passed → completed, any failed → error), ABANDON from various states
  - epic-verify: ADD appends, UPDATE modifies at index, invalid index → error
  - slice-submit: COMPLETE_PLAN with/without plan.md, COMPLETE_REFINEMENT_ROUND circuit breaker, COMPLETE_IMPLEMENTATION. **Note:** slice creation events (CREATE_SLICE, BEGIN_PLAN) are deferred to slices 04-05, so tests must manually construct state fixtures with a slice in `planning` status using `setEntry` rather than running through the slice creation workflow.
  - Purity check: no fs imports in src/core/state/

### Verification
`bun test tests/unit/state/` passes with comprehensive coverage of all ~20 transition rows. `grep -r "from.*fs" src/core/state/` returns nothing. Transition table exports match transition-tables.md row count.
