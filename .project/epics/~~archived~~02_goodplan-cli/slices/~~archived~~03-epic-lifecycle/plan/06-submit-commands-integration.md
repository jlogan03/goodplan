# Phase 6: Submit Commands + End-to-End Integration

Submit CLI commands (thin wrappers triggering state events) plus full end-to-end verification of all success criteria from goal.md. Binary regression.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts submit-plan --slice test 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [ ] `bun run src/index.ts submit-plan --slice 01-auth --json` after writing plan.md — triggers COMPLETE_PLAN, transitions to plan-created
- [ ] `bun run src/index.ts submit-implementation --slice 01-auth --json` — triggers COMPLETE_IMPLEMENTATION
- [ ] `echo '{}' | bun run src/index.ts submit-refine-slices --epic my-epic --json` — triggers COMPLETE_REFINE_SLICES
- [ ] Binary: `bun run build && echo '{"name":"bin-test","goal":"test"}' | ./goodplan epic:create --json` — works in compiled binary

### Tasks

- [ ] Create `src/commands/subagent/submit-plan.ts` — thin wrapper. Requires `--slice <name>` or `--quest <name>`. Calls `submit('plan', target, {phase:'plan'})`. No stdin content (plan already written to filesystem).
- [ ] Create `src/commands/subagent/submit-refinement.ts` — requires `--slice` or `--quest`. Reads stdin JSON `{scores}`. Calls `submit('refinement', target, {phase:'refinement', scores}, {override: args.override})`.
- [ ] Create `src/commands/subagent/submit-implementation.ts` — requires `--slice` or `--quest`. Calls `submit('implementation', target, {phase:'implementation'})`. No stdin content.
- [ ] Create `src/commands/subagent/submit-refine-slices.ts` — requires `--epic`. Reads stdin JSON (may include scores). Calls `submit('refine-slices', target, {phase:'refine-slices', ...input})`.
- [ ] Register all submit commands in `src/index.ts`.
- [ ] Create `src/schemas/commands/submit.ts` — Zod schemas for submit command inputs.
- [ ] Write tests for each submit command: submit-plan verifies plan.md exists, submit-refinement passes scores through, submit-implementation transitions, submit-refine-slices advances epic.
- [ ] Update `.project/conventions.md` repo structure to reflect new directories: `src/commands/epic/`, `src/commands/subagent/`, additional `src/core/rpc/` files, additional `src/core/state/transitions/` files, `src/schemas/commands/`.
- [ ] Run full test suite: `bun test` — all tests pass
- [ ] Run type check: `npx tsc --noEmit` — passes
- [ ] End-to-end verification walkthrough in temp dir (matches goal.md Verification section):
  1. `goodplan init --name test-project`
  2. `echo '{"name":"my-epic","goal":"Build a thing"}' | goodplan epic:create`
  3. CLI phase chain: explore → define-architecture → refine-architecture → define-slices → refine-slices (each command verifies status advance)
  4. `echo '{}' | goodplan submit-refine-slices --epic my-epic` → slices-refined
  5. `goodplan epic:add-verification --epic my-epic` (with stdin) → verification added
  6. `goodplan epic:activate --epic my-epic` → activated
  7. Second epic activate → STATE_EPIC_ALREADY_ACTIVE (exit 3)
  8. `goodplan epic:list --json` and `epic:show --epic my-epic --json` → correct output
  9. `goodplan epic:abandon --epic my-epic --reason "test"` → abandoned
  10. Verify `cat .project/activity-log.jsonl | wc -l` shows entries for all transitions
  11. loadState cache: `.state-cache.json` exists after commands, delete it → status still works
  12. epic:complete walkthrough (separate epic): verify passing/failing verificationResults
- [ ] Binary regression: `bun run build && cd $(mktemp -d) && /abs/path/to/goodplan init --name bin-test && echo '{"name":"bin-epic","goal":"test"}' | /abs/path/to/goodplan epic:create --json && /abs/path/to/goodplan epic:list --json`

### Verification
1. Full end-to-end walkthrough in temp dir covering all success criteria from goal.md.
2. `bun test` — all tests pass. `npx tsc --noEmit` — clean.
3. Binary regression — compiled binary handles epic create + list.
4. `.state-cache.json` written after commands, delete → fallback to assembleState works.
5. Concurrent modification: (unit test) externally modify file → DATA_CONCURRENT_MODIFICATION error.
