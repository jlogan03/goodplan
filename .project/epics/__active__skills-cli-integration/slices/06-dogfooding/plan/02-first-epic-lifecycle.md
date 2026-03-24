# Phase 2: First Epic Full Lifecycle

Run every workflow skill on the first epic at full fidelity: explore → create-architecture → refine-architecture → create-slices → refine-slices → create-plan → refine-plan → implement-plan → complete (slice) → complete (epic). This is the main friction discovery phase.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan epic:show --epic initial --json` → `architectureDefined === false`, `slicesDefined === false`
- [ ] `ls .project/epics/__active__initial/architecture/` — does not exist
- [ ] `ls .project/slices/` — does not exist or is empty

**After implementation** (should pass / show presence):
- [ ] `goodplan epic:show --epic initial --json` → epic status is `completed`
- [ ] `ls .project/epics/~~archived~~01_initial/` — archived epic directory exists
- [ ] `ls .project/architecture/_overview.md` — top-level architecture exists (promoted from epic)
- [ ] `ls .project/learnings.md` — contains learnings from completed slices
- [ ] Friction log has entries for any issues discovered

### Tasks

#### Exploration
- [ ] **Run `/explore`**: Execute exploration skill on the initial epic. Research Promptfoo custom providers, Anthropic SDK patterns, eval framework approaches. Let the skill drive — observe CLI interactions
- [ ] **Log friction**: Note any issues with explore's CLI integration

#### Architecture
- [ ] **Run `/create-architecture`**: Define architecture for core provider + basic execution. Expect: conventions.md, _overview.md, subsystem APIs
- [ ] **Run `/refine-architecture`**: Iterate on architecture quality. Observe reviewer infrastructure CLI interactions
- [ ] **Log friction**: Note architecture skill CLI issues

#### Slicing
- [ ] **Run `/create-slices`**: Define 2-3 small slices for the first epic (e.g., "Promptfoo provider scaffold", "skill execution pipeline", "basic eval runner")
- [ ] **Run `/refine-slices`**: Iterate on slice quality
- [ ] **Log friction**: Note slicing skill CLI issues

#### Planning & Implementation (per slice)
For each slice defined above:
- [ ] **Run `/create-plan`**: Create implementation plan for the slice
- [ ] **Run `/refine-plan`**: Refine the plan through reviewer iterations
- [ ] **Run `/implement-plan`**: Implement the plan — this is where real code gets written
- [ ] **Run `/complete`**: Complete the slice — synthesize learnings, review architecture, archive

#### Epic Completion
- [ ] **Run `/complete` (epic)**: After all slices done — synthesize epic learnings, reconcile architecture layers, promote artifacts, archive with numbering
- [ ] **Verify epic archived**: `ls .project/epics/~~archived~~01_initial/` exists

### Verification

1. Each skill invocation produces expected CLI state transitions (check `goodplan status --json` after each)
2. Activity log shows complete lifecycle entries
3. Friction log captures all issues found
4. At least one full slice cycle (plan → implement → complete) succeeds end-to-end
