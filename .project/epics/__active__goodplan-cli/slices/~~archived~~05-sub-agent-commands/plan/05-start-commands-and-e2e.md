# Phase 5: Start Commands & E2E

8 `start-*` CLI commands that call `startContext()`, end-to-end verification of both quest lifecycle and context bundling, binary regression.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts start-plan 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [ ] Full quest lifecycle walkthrough completes without errors
- [ ] `goodplan start-plan --slice 01-auth --inline --json` returns ContextBundle with inlined content
- [ ] Binary: `bun run build && ./goodplan quest:create --json` (with piped input) works

### Tasks

- [ ] Create `src/commands/subagent/start-plan.ts` — `--slice` or `--quest` flag, optional `--inline[=<bytes>]`. Calls `loadState()`, then `startContext(state, 'plan', target, options)`. Returns ContextBundle JSON. Read-only — no RPC mutation. Parse `--inline`: citty parses as string; `"true"` → default budget (20480), numeric string → custom budget, absent → no inlining (references only).
- [ ] Create `src/commands/subagent/start-refinement.ts` — same pattern, phase `'refinement'`.
- [ ] Create `src/commands/subagent/start-implementation.ts` — same pattern, phase `'implementation'`.
- [ ] Create `src/commands/subagent/start-explore.ts` — `--epic` flag, optional `--inline[=<bytes>]`. Phase `'explore'`.
- [ ] Create `src/commands/subagent/start-architecture.ts` — `--epic` flag, phase `'architecture'`.
- [ ] Create `src/commands/subagent/start-slices.ts` — `--epic` flag, phase `'slices'`.
- [ ] Create `src/commands/subagent/start-refine-architecture.ts` — `--epic` flag, phase `'refine-architecture'`.
- [ ] Create `src/commands/subagent/start-refine-slices.ts` — `--epic` flag, phase `'refine-slices'`.
- [ ] Register all 8 start commands in `src/commands/main.ts` as top-level commands (same pattern as submit-*).
- [ ] Write tests for start commands: start-plan returns ContextBundle, --inline includes markdown content, --inline=500 respects custom budget, missing target → error, start-explore with epic target works.
- [ ] Run full test suite: `bun test` — all tests pass
- [ ] Run type check: `npx tsc --noEmit` — passes
- [ ] End-to-end verification walkthrough in temp dir:
  1. `goodplan init --name test-project`
  2. Create and activate epic (full phase chain from slice 04's walkthrough)
  3. Create slice: `echo '{"name":"01-auth","goal":"Auth"}' | goodplan slice:create --epic my-epic`
  4. `goodplan start-plan --slice 01-auth --inline --json` → verify ContextBundle has `inline` map with slice goal and architecture content, `references` array, `decisions` and `learnings` arrays
  5. `goodplan start-plan --slice 01-auth --inline=500 --json` → verify content truncated by budget (fewer entries inlined)
  6. `goodplan start-plan --slice 01-auth --json` (no --inline) → verify `inline` is empty, all content in `references`
  7. Create decisions.jsonl and learnings.jsonl entries manually, verify they appear in context bundle
  8. Walk 01-auth through plan → submit-plan → refine-plan → submit-refinement → implement → submit-implementation → complete
  9. `goodplan start-explore --epic my-epic --inline --json` → verify epic-phase context
  10. Full quest lifecycle: `echo '{"name":"fix-logging","goal":"Fix"}' | goodplan quest:create --json` → quest:plan → submit-plan → quest:refine-plan → submit-refinement → quest:implement → submit-implementation → `echo '{"verificationPassed":true,"learnings":[{"category":"worked","summary":"Test","detail":"Detail","tags":[],"rollupTo":["project"]}],"architectureDelta":[]}' | goodplan quest:complete --quest fix-logging --json` → verify learnings rolled up to project level
  11. `goodplan quest:list --json` and `quest:show --quest fix-logging --json` → correct output
  12. `goodplan quest:abandon --quest <name> --reason "test"` on another quest → abandoned
  13. Verify activity-log.jsonl has entries for all transitions
- [ ] Binary regression: `bun run build` → test key commands with compiled binary (quest:create, quest:list, start-plan)
- [ ] Update `.project/conventions.md` repo structure: add `src/commands/quest/`, `src/commands/subagent/start-*`, `src/core/context/`, `src/core/state/transitions/quest-*`, `src/schemas/commands/quest.ts`

### Verification
1. Full e2e walkthrough in temp dir covering all success criteria from goal.md.
2. `bun test` — all tests pass. `npx tsc --noEmit` — clean.
3. Binary regression — compiled binary handles quest create + list + start-plan.
4. Context bundling verified: inline budget respected, per-phase priorities correct, decisions and learnings included.
5. Quest lifecycle verified: create through complete, learnings rollup, abandon.
