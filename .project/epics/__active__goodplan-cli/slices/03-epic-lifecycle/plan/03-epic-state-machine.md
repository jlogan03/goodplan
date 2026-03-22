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

- [ ] Refactor `src/core/state/reduce.ts` — replace switch with handler `Map<string, Handler>` pattern. Each transition file registers its handlers. `reduce()` looks up event.type in the map, calls the handler, returns result. Unknown types → StateError with STATE_INVALID_TRANSITION (existing behavior preserved). Export the handler registration function so transition files can register themselves.
- [ ] Create `src/core/state/transitions/epic-create.ts` — CREATE_EPIC handler. Creates `epics/<name>/epic.json` (with goal, status: created, empty verifications, empty sliceSequence, timestamps), creates directory tree (`architecture/`, `research/`, `brainstorm/`, `prototypes/`), updates `epics/overview.json` (adds item), appends activity-log entry. Guard: epic name must not already exist in tree.
- [ ] Create `src/core/state/transitions/epic-phase.ts` — BEGIN/COMPLETE handlers for the explore→architecture→slicing phase chain. BEGIN_EXPLORE: guard status == created, set exploring. COMPLETE_EXPLORE: guard status == created OR exploring, set explored (skip path from created). BEGIN_ARCHITECTURE through COMPLETE_SLICING: follow transition-tables.md exactly for from-status guards and to-status transitions. Each handler updates epic.json status + appends activity-log entry.
- [ ] Create `src/core/state/transitions/epic-refine.ts` — COMPLETE_REFINE_ARCHITECTURE and COMPLETE_REFINE_SLICES handlers with circuit breaker logic. Shared refinement helper: check scores against threshold (all >= 9), check override flag, check round vs maxRounds. If scores pass OR override → advance to refined status. If scores below AND round < maxRounds → stay in refining, increment round, record scores. If round >= maxRounds AND !override → StateError STATE_MAX_ROUNDS_REACHED. Update epic.json refinement field (round, scoreHistory).
- [ ] Create `src/core/state/transitions/epic-lifecycle.ts` — ACTIVATE_EPIC: guard status == slices-refined, guard project.activeEpic == null (STATE_EPIC_ALREADY_ACTIVE), guard verifications.length > 0 (STATE_MISSING_VERIFICATIONS). Sets epic.json status to activated, sets project.json activeEpic. COMPLETE_EPIC: guard status == activated, guard all verificationResults passed (STATE_VERIFICATION_FAILED). Sets epic.json status to completed, clears project.json activeEpic. ABANDON_EPIC: guard status is non-terminal. Sets abandoned, clears activeEpic if this was active.
- [ ] Create `src/core/state/transitions/epic-verify.ts` — ADD_VERIFICATION: guard status is pre-activated (not activated/completed/abandoned). Appends to epic.json verifications array. UPDATE_VERIFICATION: same guard, updates verification at specified index (guard index exists).
- [ ] Create `src/core/state/transitions/slice-submit.ts` — COMPLETE_PLAN: guard hasChild for plan.md in entity path. Sets slice status to plan-created. COMPLETE_REFINEMENT_ROUND: shared refinement logic (same circuit breaker as epic-refine). COMPLETE_IMPLEMENTATION: sets slice status to implementation-complete. Also handle quest variants (COMPLETE_QUEST_PLAN, COMPLETE_QUEST_REFINEMENT_ROUND, COMPLETE_QUEST_IMPLEMENTATION) with same logic but quest paths.
- [ ] Export transition tables from handler files as `export const epicTransitions: { from: string; event: string; to: string }[]` arrays to enable fitness function enumeration in slice 08.
- [ ] Write unit tests — organized by transition file:
  - epic-create: CREATE_EPIC produces complete directory tree + overview update + activity log
  - epic-phase: full phase chain via COMPLETE_* skip paths (created→explored→arch-defined→arch-refined→slices-defined→slices-refined). BEGIN_* transitions for each phase.
  - epic-refine: circuit breaker (scores below → stay, scores pass → advance, max rounds → error, override → force advance). Score history recorded.
  - epic-lifecycle: ACTIVATE guards (no other active, verifications exist), COMPLETE_EPIC (all passed → completed, any failed → error), ABANDON from various states
  - epic-verify: ADD appends, UPDATE modifies at index, invalid index → error
  - slice-submit: COMPLETE_PLAN with/without plan.md, COMPLETE_REFINEMENT_ROUND circuit breaker, COMPLETE_IMPLEMENTATION
  - Purity check: no fs imports in src/core/state/

### Verification
`bun test tests/unit/state/` passes with comprehensive coverage of all ~20 transition rows. `grep -r "from.*fs" src/core/state/` returns nothing. Transition table exports match transition-tables.md row count.
