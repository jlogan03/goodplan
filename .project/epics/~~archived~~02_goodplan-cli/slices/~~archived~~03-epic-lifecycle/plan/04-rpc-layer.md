# Phase 4: RPC Layer — begin/complete/submit

Wire the generic RPC API from rpc-layer-api.md, replacing the one-off rpcInit() pattern with reusable orchestration functions. Connects the state machine (Phase 3) to the CLI commands (Phase 5).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep "function begin" src/core/rpc/` — no match (only rpcInit exists)
- [ ] `ls src/core/rpc/begin.ts` — file not found

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/rpc/` — all RPC tests pass
- [ ] `npx tsc --noEmit` — passes
- [ ] Existing init command still works (rpcInit refactored to use begin internally)

### Tasks

- [ ] Create `src/core/rpc/begin.ts` — `begin(phase: BeginPhase, target: Target, options?: WorkflowOptions): BeginResult`. Pattern: loadState → build StateEvent from (phase, target) mapping → reduce → check isStateError → commitState → return BeginResult. Event mapping follows rpc-layer-api.md explicitly (e.g., begin('create', {type:'epic'}) → CREATE_EPIC, begin('explore', {type:'epic'}) → BEGIN_EXPLORE). Inject `ts: new Date().toISOString()` on every event.
- [ ] Create `src/core/rpc/complete.ts` — `complete(target: Target, input: CompleteInput, options?: WorkflowOptions): CompleteResult`. Same pattern. Maps to COMPLETE_EPIC/COMPLETE_SLICE/COMPLETE_QUEST based on input.type. Constructs the appropriate event with verificationResults or verificationPassed + deferred + learnings + architectureDelta.
- [ ] Create `src/core/rpc/submit.ts` — `submit(phase: SubmitPhase, target: Target, content: SubmitInput, options?: WorkflowOptions): SubmitResult`. Maps to COMPLETE_PLAN, COMPLETE_REFINEMENT_ROUND, etc. For refinement phases: passes scores and override from SubmitInput/WorkflowOptions.
- [ ] Create `src/core/rpc/types.ts` — centralized RPC types: BeginPhase, SubmitPhase, Target, WorkflowOptions, BeginResult, CompleteResult, SubmitResult, CompleteInput, SubmitInput. Define these per rpc-layer-api.md.
- [ ] Refactor `src/core/rpc/init.ts` — make rpcInit route through `begin('create', {type:'project'}, ...)` internally, or replace it entirely. Update init command to call `begin` directly.
- [ ] Write unit tests for begin: CREATE_EPIC through begin creates epic tree, BEGIN_EXPLORE transitions status, error propagation (StateError → GoodplanError)
- [ ] Write unit tests for submit: COMPLETE_PLAN with/without plan.md, COMPLETE_REFINEMENT_ROUND with scores
- [ ] Write unit tests for complete: COMPLETE_EPIC with passing/failing verifications

### Verification
`bun test tests/unit/rpc/` passes. `bun test` full suite passes (existing init tests still work after rpcInit refactor). RPC functions correctly map all phase+target combinations to the right StateEvent types.
