# Phase 4: Second Epic (Non-Empty State)

Create a second epic on the now-populated project to exercise the "subsequent epic" flow: architecture proposal (not direct write), `/start-epic` approval gate, and full lifecycle. This tests paths that are fundamentally different from the first epic.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls .project/epics/` — contains only `~~archived~~01_initial/` (no active epic)
- [ ] No `architecture-proposal/` exists anywhere

**After implementation** (should pass / show presence):
- [ ] `ls .project/epics/~~archived~~02_*/` — second archived epic exists with correct numbering
- [ ] `ls .project/architecture/_overview.md` — top-level architecture updated with epic 2's contributions
- [ ] Activity log shows both epic completion entries

### Tasks

#### Epic Creation (Non-Empty State)
- [ ] **Run `/create-epic`**: Create second epic "LLM-as-Judge Scoring" — this creates `epics/llm-judge/` (NOT `__active__`-prefixed, since there's no active epic)
- [ ] **Verify non-empty state behavior**: Check that `/create-epic` correctly detects existing project state, architecture, and learnings. The epic should acknowledge the existing codebase.

#### Exploration & Architecture Proposal
- [ ] **Run `/explore`**: Research LLM-as-judge patterns, scoring rubrics, Promptfoo grader integration
- [ ] **Run `/create-architecture`**: This should create an `architecture-proposal/` (not direct `architecture/`) since this is a subsequent epic. Verify the proposal format.
- [ ] **Run `/start-epic`**: Review the architecture proposal and approve it. This should:
  - Rename `epics/llm-judge/` to `epics/__active__llm-judge/`
  - Create `architecture/` from the proposal
  - Write `approved.md`
- [ ] **Verify activation**: `goodplan status --json` shows `activeEpic.name === "llm-judge"`

#### Slicing, Planning, Implementation
- [ ] **Run `/create-slices`**: Define 1-2 slices for the scoring epic
- [ ] **Run full slice cycle** (per slice): `/create-plan` → `/refine-plan` → `/implement-plan` → `/complete`

#### Epic Completion
- [ ] **Run `/complete` (epic)**: Complete the second epic — reconcile architecture, promote artifacts, archive as `~~archived~~02_llm-judge`
- [ ] **Verify archive numbering**: `ls .project/epics/` shows `~~archived~~01_initial/` and `~~archived~~02_llm-judge/`

#### Friction Tracking
- [ ] **Log friction**: Focus especially on non-empty-state issues — architecture proposal vs direct write, start-epic approval, existing state detection
- [ ] **Compare first vs second epic experience**: Note friction differences

### Verification

1. Second epic archived with correct `~~archived~~02_` numbering
2. `/start-epic` approval gate exercised (proposal → approved → activated)
3. Architecture proposal created (not direct architecture write)
4. Top-level architecture reflects contributions from both epics
5. Activity log has complete history for both epics
