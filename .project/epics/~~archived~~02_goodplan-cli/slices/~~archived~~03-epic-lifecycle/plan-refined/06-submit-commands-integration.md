# Phase 6: Submit Commands + End-to-End Integration

Submit CLI commands (thin wrappers triggering state events) plus full end-to-end verification of all success criteria from goal.md. Binary regression.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts submit-plan --slice test 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [ ] `bun run src/index.ts submit-plan --slice 01-auth --json` after writing plan.md — triggers COMPLETE_PLAN, transitions to plan-created
- [ ] `bun run src/index.ts submit-implementation --slice 01-auth --json` — triggers COMPLETE_IMPLEMENTATION
- [ ] `bun run src/index.ts submit-explore --epic my-epic --json` — triggers COMPLETE_EXPLORE
- [ ] `echo '{"scores":{"completeness":9,"clarity":9}}' | bun run src/index.ts submit-refine-slices --epic my-epic --json` — triggers COMPLETE_REFINE_SLICES
- [ ] Binary: `bun run build && echo '{"name":"bin-test","goal":"test"}' | ./goodplan epic:create --json` — works in compiled binary

### Tasks

- [ ] Create `src/commands/subagent/submit-plan.ts` — thin wrapper. Requires `--slice <name>` or `--quest <name>`. Calls `submit('plan', target, {phase:'plan'})`. No stdin content required (plan already written to filesystem) — when stdin is TTY, `readStdin()` returns `{}` which is valid for this command.
- [ ] Create `src/commands/subagent/submit-refinement.ts` — requires `--slice` or `--quest`. Reads stdin JSON `{scores}`. Accepts `--override` flag. Calls `submit('refinement', target, {phase:'refinement', scores}, {override: args.override})`.
- [ ] Create `src/commands/subagent/submit-implementation.ts` — requires `--slice` or `--quest`. Calls `submit('implementation', target, {phase:'implementation'})`. No stdin content required — TTY fast-path returns `{}`.
- [ ] Create `src/commands/subagent/submit-refine-slices.ts` — requires `--epic`. Reads stdin JSON `{scores}`. Accepts `--override` flag. Calls `submit('refine-slices', target, {phase:'refine-slices', scores}, {override: args.override})`.
- [ ] Create `src/commands/subagent/submit-explore.ts` — requires `--epic`. No stdin content required — TTY fast-path returns `{}`. Calls `submit('explore', target, {phase:'explore'})`.
- [ ] Create `src/commands/subagent/submit-architecture.ts` — requires `--epic`. No stdin content required — TTY fast-path returns `{}`. Calls `submit('architecture', target, {phase:'architecture'})`.
- [ ] Create `src/commands/subagent/submit-slices.ts` — requires `--epic`. No stdin content required — TTY fast-path returns `{}`. Calls `submit('slices', target, {phase:'slices'})`.
- [ ] Create `src/commands/subagent/submit-refine-architecture.ts` — requires `--epic`. Reads stdin JSON `{scores}`. Accepts `--override` flag. Calls `submit('refine-architecture', target, {phase:'refine-architecture', scores}, {override: args.override})`.
- [ ] Register all submit commands in `src/index.ts` as flat top-level subcommands: `"submit-plan": submitPlanCommand`, `"submit-refinement": submitRefinementCommand`, `"submit-implementation": submitImplementationCommand`, `"submit-explore": submitExploreCommand`, `"submit-architecture": submitArchitectureCommand`, `"submit-slices": submitSlicesCommand`, `"submit-refine-architecture": submitRefineArchitectureCommand`, `"submit-refine-slices": submitRefineSlicesCommand`. These are NOT nested under a `subagent:` namespace — the `subagent/` directory is organizational only.
- [ ] Create `src/schemas/commands/submit.ts` — Zod schemas for submit command inputs. For commands with no stdin content (submit-plan, submit-implementation, submit-explore, submit-architecture, submit-slices), the schema validates the empty-object fast path (`{}`) and flag-derived fields (target name). For commands with stdin content (submit-refinement, submit-refine-architecture, submit-refine-slices), the schema validates `{ scores: Record<string, number> }`.
- [ ] Write tests for each submit command: submit-plan triggers COMPLETE_PLAN whose state machine guard checks plan.md existence (test that the guard error surfaces correctly through the CLI), submit-refinement passes scores through, submit-implementation transitions, submit-explore/architecture/slices/refine-architecture/refine-slices advance epic phases.
- [ ] Update `.project/conventions.md` repo structure to reflect new directories and files: `src/commands/epic/` (create, list, show, explore, define-architecture, refine-architecture, define-slices, refine-slices, activate, complete, abandon, add-verification, update-verification), `src/commands/subagent/` (submit-plan, submit-refinement, submit-implementation, submit-explore, submit-architecture, submit-slices, submit-refine-architecture, submit-refine-slices), `src/core/rpc/begin.ts`, `src/core/rpc/complete.ts`, `src/core/rpc/submit.ts`, `src/core/rpc/types.ts`, `src/core/state/transitions/` (epic-create, epic-phase, epic-refine, epic-lifecycle, epic-verify, slice-submit), `src/core/data/load.ts`, `src/schemas/commands/` (epic.ts, submit.ts).
- [ ] Run full test suite: `bun test` — all tests pass
- [ ] Run type check: `npx tsc --noEmit` — passes
- [ ] End-to-end verification walkthrough in temp dir (matches goal.md Verification section):
  1. `goodplan init --name test-project`
  2. `echo '{"name":"my-epic","goal":"Build a thing"}' | goodplan epic:create`
  3. CLI phase chain with submit completions: `epic:explore` → `submit-explore` → `epic:define-architecture` → `submit-architecture` → `epic:refine-architecture` → `submit-refine-architecture` (with scores) → `epic:define-slices` → `submit-slices` → `epic:refine-slices` → `submit-refine-slices` (with scores). Each begin command verifies status advance to the `-ing` state; each submit command verifies advance to the completed state.
  4. `echo '{"scores":{"completeness":9,"clarity":9,"testability":9}}' | goodplan submit-refine-slices --epic my-epic` → slices-refined
  5. `goodplan epic:add-verification --epic my-epic` (with stdin) → verification added
  6. `goodplan epic:activate --epic my-epic` → activated
  7. Second epic activate → STATE_EPIC_ALREADY_ACTIVE (exit 3)
  8. `goodplan epic:list --json` and `epic:show --epic my-epic --json` → correct output
  9. `goodplan epic:abandon --epic my-epic --reason "test"` → abandoned
  10. Verify `cat .project/activity-log.jsonl | wc -l` shows entries for all transitions
  11. loadState cache: `.state-cache.json` exists after commands, delete it → status still works
  12. epic:complete walkthrough (separate epic): verify passing/failing verificationResults
- [ ] Binary regression: `bun run build && cd $(mktemp -d) && /abs/path/to/goodplan init --name bin-test && echo '{"name":"bin-epic","goal":"test"}' | /abs/path/to/goodplan epic:create --json && /abs/path/to/goodplan epic:list --json` (build script outputs `./goodplan` in project root per `bun build --compile src/index.ts --outfile goodplan`)

### Verification
1. Full end-to-end walkthrough in temp dir covering all success criteria from goal.md.
2. `bun test` — all tests pass. `npx tsc --noEmit` — clean.
3. Binary regression — compiled binary handles epic create + list.
4. `.state-cache.json` written after commands, delete → fallback to assembleState works.
5. Concurrent modification: (unit test) externally modify file → DATA_CONCURRENT_MODIFICATION error.
