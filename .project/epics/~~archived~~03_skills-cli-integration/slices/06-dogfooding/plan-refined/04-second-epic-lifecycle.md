# Phase 4: Second Epic (Non-Empty State)

Create a second epic on the now-populated project to exercise the "subsequent epic" flow: architecture proposal (not direct write), approval gate, and full lifecycle. This tests paths that are fundamentally different from the first epic.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan status --json` — no `activeEpic` (first epic completed)
- [ ] `goodplan epic:show --epic core-provider --json` → `status === "completed"`
- [ ] `ls .project/epics/llm-judge/architecture-proposal/` — does not exist

**After implementation** (should pass / show presence):
- [ ] `goodplan epic:show --epic llm-judge --json` → `status === "completed"`
- [ ] `goodplan status --json` — no `activeEpic` (both epics completed)
- [ ] `ls .project/architecture/_overview.md` — top-level architecture updated with epic 2's contributions
- [ ] Activity log shows both epic completion entries
- [ ] Filesystem: both epic directories may be renamed with `~~archived~~` prefix by `/complete` skill (skill-managed convention, not CLI behavior)

### Tasks

#### Epic Creation (Non-Empty State)
- [ ] **Run `/create-epic`**: Create second epic "LLM-as-Judge Scoring" — named "llm-judge". This creates `epics/llm-judge/` with `goal.md`
- [ ] **Verify non-empty state behavior**: `goodplan epic:show --epic llm-judge --json` returns epic details. Check that `/create-epic` correctly detects existing project state, architecture, and learnings. The epic should acknowledge the existing codebase.

#### Exploration & Architecture Proposal
- [ ] **Run `/explore`**: Research LLM-as-judge patterns, scoring rubrics, Promptfoo grader integration. After `/explore`, check that the exploration output references or builds on first-epic learnings and existing architecture.
- [ ] **Run `/create-architecture`**: This should create an `architecture-proposal/` (not direct `architecture/`) since this is a subsequent epic. Verify the proposal format. Note: `architecture-proposal/` is invisible to the CLI — it only sees `COMPLETE_ARCHITECTURE` transitions.
- [ ] **Approve architecture manually**: Copy `architecture-proposal/` to `architecture/` and write `approved.md` in the epic's architecture directory as a human-readable marker (not CLI-significant — the `COMPLETE_ARCHITECTURE` transition is handled by the skill via `submit-architecture`). Do NOT exercise `/start-epic` — it is un-migrated and will corrupt CLI state (creates `__active__`-prefixed directories, writes `state.md` directly). Log as friction: approval workflow needs CLI migration.
- [ ] **Run `/refine-architecture`**: Iterate on architecture quality for the second epic. This exercises the refinement flow on a non-empty-state project and must complete before slicing (the `BEGIN_SLICING` guard requires `architecture-refined` status).

#### Slicing
- [ ] **Run `/create-slices`**: Define 1-2 slices for the scoring epic
- [ ] **Run `/refine-slices`**: Iterate on slice quality

#### Epic Activation
- [ ] **Add epic verification**: `echo '{"verification":{"description":"LLM judge scoring produces valid rubric scores","status":"pending","addedDuring":"slices","modifiedDuring":null}}' | goodplan epic:add-verification --epic llm-judge --json`
- [ ] **Activate epic**: `goodplan epic:activate --epic llm-judge --json`
- [ ] **Verify activation**: `goodplan status --json` shows `activeEpic.name === "llm-judge"`

#### Planning & Implementation
- [ ] **Run full slice cycle** (per slice, in sequencing order):
  - [ ] Transition to planning: `stdin: "" | goodplan slice:plan --slice <name> --json`
  - [ ] `/create-plan` → `/refine-plan` → `/implement-plan` → `/complete`
- [ ] **Verify TypeScript**: Run `bun tsc --noEmit` after `/implement-plan`

#### Epic Completion
- [ ] **Run `/complete` (epic)**: Complete the second epic — reconcile architecture, promote artifacts
- [ ] **Verify epic completed**: `goodplan epic:show --epic llm-judge --json` → `status === "completed"` and `goodplan status --json` → no `activeEpic`

#### Friction Tracking
- [ ] **Log friction**: Focus especially on non-empty-state issues — architecture proposal vs direct write, manual approval workflow, existing state detection, `/start-epic` migration gap (logged, not exercised)
- [ ] **Compare first vs second epic experience**: Note friction differences

### Verification

1. `goodplan epic:show --epic llm-judge --json` → `status === "completed"`
2. Architecture proposal created (not direct architecture write) for subsequent epic
3. `epic:activate` CLI command exercised successfully (after slicing + verification)
4. Approval workflow gap documented in friction log (`/start-epic` not exercised)
5. Top-level architecture reflects contributions from both epics
6. Activity log has complete history for both epics
7. Cold-start verification: run `goodplan status --json` and `goodplan epic:list --json` in a fresh terminal session to verify INV-004 (stateless commands)
