# Phase 2: First Epic Full Lifecycle

Run every workflow skill on the first epic at full fidelity: explore → create-architecture → refine-architecture → create-slices → refine-slices → create-plan → refine-plan → implement-plan → complete (slice) → complete (epic). This is the main friction discovery phase.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan epic:show --epic core-provider --json` → `artifacts.architectureDefined === false`, `artifacts.slicesDefined === false`
- [ ] `goodplan slice:list --json` — returns `{"items":[]}` (slices use flat paths `.project/slices/<name>/`, not nested under epics)

**After implementation** (should pass / show presence):
- [ ] `goodplan epic:show --epic core-provider --json` → `status === "completed"`
- [ ] `ls .project/architecture/_overview.md` — top-level architecture exists (promoted from epic)
- [ ] `ls .project/learnings.md` — contains learnings from completed slices
- [ ] Filesystem: `epics/core-provider/` may be renamed to `~~archived~~01_core-provider/` by the `/complete` skill (this is a skill-managed convention, not CLI behavior)
- [ ] Friction log has entries for any issues discovered

**Note:** Run `goodplan status --json` after every major skill invocation to track state transitions and catch issues early.

### Tasks

#### Exploration
- [ ] **Run `/explore`**: Execute exploration skill on the initial epic. Research Promptfoo custom providers, Anthropic SDK patterns, eval framework approaches. Let the skill drive — observe CLI interactions. The `/explore` skill internally calls `goodplan epic:explore` and `goodplan submit-explore`. Verify via `goodplan epic:show --epic core-provider --json` that status progresses through `exploring` -> `explored`.
- [ ] **Check status**: `goodplan status --json` — verify state is consistent after explore
- [ ] **Log friction**: Note any issues with explore's CLI integration

#### Architecture
- [ ] **Run `/create-architecture`**: Define architecture for core provider + basic execution. Expect: conventions.md, _overview.md, subsystem APIs
- [ ] **Run `/refine-architecture`**: Iterate on architecture quality. Observe reviewer infrastructure CLI interactions
- [ ] **Check status**: `goodplan epic:show --epic core-provider --json` — verify `artifacts.architectureDefined` transitions (this field is on `epic:show`, not `status`)
- [ ] **Log friction**: Note architecture skill CLI issues

#### Slicing
- [ ] **Run `/create-slices`**: Define 2-3 small slices for the first epic (e.g., "Promptfoo provider scaffold", "skill execution pipeline", "basic eval runner")
- [ ] **Run `/refine-slices`**: Iterate on slice quality
- [ ] **Check status**: `goodplan slice:list --json` — verify slices created with correct states
- [ ] **Log friction**: Note slicing skill CLI issues

#### Epic Activation
- [ ] **Add epic verification**: `echo '{"verification":{"description":"All slices pass bun tsc --noEmit and tests","status":"pending","addedDuring":"slices","modifiedDuring":null}}' | goodplan epic:add-verification --epic core-provider --json`
- [ ] **Activate epic**: `goodplan epic:activate --epic core-provider --json`
- [ ] **Verify activation**: `goodplan status --json` — confirm `activeEpic.name === "core-provider"`

#### Planning & Implementation (per slice)
Execute slices in the order defined by `/create-slices` (sequencing order matters). For each slice:
- [ ] **Transition to planning**: `stdin: "" | goodplan slice:plan --slice <name> --json` — moves slice from `created` to `planning`
- [ ] **Run `/create-plan`**: Create implementation plan for the slice
- [ ] **Run `/refine-plan`**: Refine the plan through reviewer iterations. If a skill session is interrupted during refinement, re-enter and observe recovery behavior. Log any issues — skill re-entry is a key friction discovery vector.
- [ ] **Run `/implement-plan`**: Implement the plan — this is where real code gets written
- [ ] **Verify TypeScript**: Run `bun tsc --noEmit` after `/implement-plan` — record any compilation failures in friction log. Distinguish third-party type errors (e.g., Promptfoo types) from generated code errors — only the latter count as skill friction.
- [ ] **Run `/complete`**: Complete the slice — synthesize learnings, review architecture, archive
- [ ] **Check status**: `goodplan status --json` — verify slice status transitions

#### Epic Completion
- [ ] **Run `/complete` (epic)**: After all slices done — synthesize epic learnings, reconcile architecture layers, promote artifacts, archive with numbering
- [ ] **Verify epic completed**: `goodplan epic:show --epic core-provider --json` → `status === "completed"` and `goodplan status --json` → no `activeEpic`
- [ ] **Capture dogfooding learnings**: Manually append Phase 2 friction and learnings to the goodplan repo's `.project/epics/__active__skills-cli-integration/slices/06-dogfooding/friction-log.md` (distinct from nondet-eval's learnings — the `/complete` skill writes to nondet-eval's learnings, not here)

### Verification

1. Each skill invocation produces expected CLI state transitions (check `goodplan status --json` after each)
2. Exit codes: 0 on success, 3 with structured error JSON on invalid transitions (per INV-007)
3. Activity log shows complete lifecycle entries
4. Friction log captures all issues found
5. At least one full slice cycle (plan → implement → complete) succeeds end-to-end
6. `bun tsc --noEmit` passes after implementation
