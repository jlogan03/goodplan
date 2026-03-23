# Phase 5: Start Commands & E2E

8 `start-*` CLI commands that call `startContext()`, end-to-end verification of both quest lifecycle and context bundling, binary regression.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `bun run src/index.ts start-plan 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [x] Full quest lifecycle walkthrough completes without errors
- [x] `goodplan start-plan --slice 01-auth --inline --json` returns ContextBundle with inlined content
- [x] Binary: `bun run build && ./goodplan quest:create --json` (with piped input) works

### Tasks

- [x] Create `parseInlineBudget(value: string | undefined): boolean | number | undefined` utility in `global-args.ts` (or a shared module alongside global args). Returns `undefined` if absent, `true` if bare `--inline` (i.e., `"true"`), parsed number if numeric string. The context module resolves `true` to the default budget internally. Extract `DEFAULT_INLINE_BUDGET = 20480` as a shared constant in the context module. All 8 `start-*` commands use `parseInlineBudget` instead of duplicating inline coercion logic.
- [x] Create `src/commands/subagent/start-plan.ts` — `--slice` or `--quest` flag, optional `--inline[=<bytes>]`. Calls `loadState()`, then `startContext(state, 'plan', target, options)`. Returns ContextBundle JSON. Read-only — no RPC mutation. Uses `parseInlineBudget` for `--inline` parsing. Start commands always output JSON regardless of the `--json` flag — enforce by calling `output(bundle, { ...args, json: true })`. This is an intentional deviation from normal flag-respecting behavior since these are sub-agent commands where human-readable output is not meaningful.
- [x] Create `src/commands/subagent/start-refinement.ts` — same pattern, phase `'refinement'`.
- [x] Create `src/commands/subagent/start-implementation.ts` — same pattern, phase `'implementation'`.
- [x] Create `src/commands/subagent/start-explore.ts` — `--epic` flag, optional `--inline[=<bytes>]`. Phase `'explore'`.
- [x] Create `src/commands/subagent/start-architecture.ts` — `--epic` flag, phase `'architecture'`.
- [x] Create `src/commands/subagent/start-slices.ts` — `--epic` flag, phase `'slices'`.
- [x] Create `src/commands/subagent/start-refine-architecture.ts` — `--epic` flag, phase `'refine-architecture'`.
- [x] Create `src/commands/subagent/start-refine-slices.ts` — `--epic` flag, phase `'refine-slices'`.
- [x] Register all 8 start commands in `src/commands/main.ts` as top-level commands (same pattern as submit-*).
- [x] Wire `--inline` through `complete()` in `src/core/rpc/complete.ts`: when `options?.inline` is set, call `startContext(state, 'complete', target, options)` after the state transition and include `context: ContextBundle` in `CompleteResult`. This activates the `'complete'` priority table defined in Phase 4's `priorities.ts` (without this wiring, that table is dead code). Update `CompleteResult` type to include optional `context` field.
- [x] Update `rpc-layer-api.md`: change `startContext(phase, target, options)` to `startContext(state, phase, target, options)` with a note that callers provide state for testability. Also add `'complete'` to the `SubmitPhase` definition and note the naming clarification (type now means "phases with content priority orderings," not just submit-command phases). Reconcile context module layering: the plan treats `src/core/context/` as a peer module alongside the RPC layer (not internal to it). Update `_overview.md` and `rpc-layer-api.md` to reflect this — context depends on tree types and Data Layer, consumed by both RPC and Commands.
- [x] Write tests for start commands: start-plan returns ContextBundle, --inline includes markdown content, --inline=500 respects custom budget, missing target → error, start-explore with epic target works.
- [x] Run full test suite: `bun test` — all tests pass
- [x] Run type check: `npx tsc --noEmit` — passes
- [x] End-to-end verification walkthrough in temp dir (steps 1-13 use `bun run src/index.ts`; step 14 uses compiled binary):
  1. `bun run src/index.ts init --name test-project`
  2. Create and activate epic (full phase chain from slice 04's walkthrough)
  3. Create slice: `echo '{"name":"01-auth","goal":"Auth"}' | bun run src/index.ts slice:create --epic my-epic`
  4. `bun run src/index.ts start-plan --slice 01-auth --inline --json` → verify ContextBundle has `inline` map with slice goal and architecture content, `references` array, `decisions` and `learnings` arrays
  5. `bun run src/index.ts start-plan --slice 01-auth --inline=500 --json` → verify content truncated by budget (fewer entries inlined)
  6. `bun run src/index.ts start-plan --slice 01-auth --json` (no --inline) → verify `inline` is `{}` (empty object), all content in `references`
  7. Create decisions.jsonl and learnings.jsonl entries manually, verify they appear in context bundle
  8. Walk 01-auth through plan → submit-plan → refine-plan → submit-refinement → implement → submit-implementation → complete
  9. `bun run src/index.ts start-explore --epic my-epic --inline --json` → verify epic-phase context
  10. Full quest lifecycle: `echo '{"name":"fix-logging","goal":"Fix"}' | bun run src/index.ts quest:create --json` → quest:plan → submit-plan → quest:refine-plan → submit-refinement → quest:implement → submit-implementation → `echo '{"verificationPassed":true,"learnings":[{"category":"worked","summary":"Test","detail":"Detail","tags":[],"rollupTo":["project"]}],"architectureDelta":[]}' | bun run src/index.ts quest:complete --quest fix-logging --json` → verify learnings rolled up to project level
  11. `bun run src/index.ts quest:list --json` and `quest:show --quest fix-logging --json` → correct output
  12. `bun run src/index.ts quest:abandon --quest <name> --reason "test"` on another quest → abandoned
  13. Verify activity-log.jsonl has entries for all transitions
- [x] Binary regression: `bun run build` → test key commands with compiled binary (quest:create, quest:list, start-plan)
- [x] Update `.project/conventions.md` repo structure: add `src/commands/quest/`, `src/commands/subagent/start-*`, `src/core/context/`, `src/core/state/transitions/quest-*`, `src/schemas/commands/quest.ts`
- [x] Clean up any "deferred to slice 05" notes in architecture docs (rpc-layer-api.md, etc.)

### Verification
1. Full e2e walkthrough in temp dir covering all success criteria from goal.md.
2. `bun test` — all tests pass. `npx tsc --noEmit` — clean.
3. Binary regression — compiled binary handles quest create + list + start-plan.
4. Context bundling verified: inline budget respected, per-phase priorities correct, decisions and learnings included.
5. Quest lifecycle verified: create through complete, learnings rollup, abandon.
