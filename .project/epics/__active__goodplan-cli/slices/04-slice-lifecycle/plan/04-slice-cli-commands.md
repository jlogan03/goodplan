# Phase 4: Slice CLI Commands

All 8 slice:* commands registered in the CLI. Follows the exact same patterns established in Phase 5 of slice 03 (epic commands).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts slice:create 2>&1` — unknown command error
- [ ] `bun run src/index.ts slice:list 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [ ] `echo '{"name":"01-auth","goal":"Auth","epic":"my-epic"}' | bun run src/index.ts slice:create --json` — creates slice
- [ ] `bun run src/index.ts slice:list --json` — returns overview items
- [ ] `bun run src/index.ts slice:show --slice 01-auth --json` — returns full slice entity
- [ ] `bun run src/index.ts slice:plan --slice 01-auth --json` — transitions to planning

### Tasks

- [ ] Create `src/commands/slice/create.ts` — reads stdin JSON `{name, goal, epic}`, calls `begin('create', {type:'slice'}, {name, goal, epic})`. Requires `--epic` flag to specify which epic the slice belongs to. Human-readable shows slice name + status + epic.
- [ ] Create `src/commands/slice/list.ts` — read-only. Calls `loadState()`, navigates to `slices/overview.json`. Optional `--epic` flag to filter by epic. Returns `{ items: [...] }` matching overview schema.
- [ ] Create `src/commands/slice/show.ts` — read-only. Calls `loadState()`, navigates to `slices/<name>/slice.json`. Requires `--slice` flag.
- [ ] Create `src/commands/slice/plan.ts` — calls `begin('plan', {type:'slice', name})`. Requires `--slice` flag.
- [ ] Create `src/commands/slice/refine-plan.ts` — calls `begin('refine-plan', {type:'slice', name})`. Requires `--slice` flag.
- [ ] Create `src/commands/slice/implement.ts` — calls `begin('implement', {type:'slice', name})`. Requires `--slice` flag.
- [ ] Create `src/commands/slice/complete.ts` — reads stdin JSON `{verificationPassed, deferred?, learnings?, architectureDelta?}`, calls `complete({type:'slice', name}, input)`. Requires `--slice` flag. Uses stdin for complex structured payload.
- [ ] Create `src/commands/slice/abandon.ts` — requires `--slice` and `--reason` flags. Calls `begin('abandon', {type:'slice', name}, {reason})`.
- [ ] Register all slice commands in `src/commands/main.ts` under the `slice:` namespace.
- [ ] Create `src/schemas/commands/slice.ts` — Zod schemas for slice command stdin inputs (createSliceInput, completeSliceInput).
- [ ] Ensure help text quality per commands-api.md — descriptions for commands and flags, expected stdin shapes.
- [ ] Human-readable output pattern: `{sliceName}: {previousStatus} → {newStatus}`. Complete shows deferred count, learnings count, epicComplete flag.
- [ ] Write tests: create, list, show, plan, refine-plan, implement, complete (with deferred + learnings), abandon. Test --json, --quiet output modes.

### Verification
`bun test tests/unit/commands/slice/` passes. CLI commands work in a temp directory: init → create epic → activate → create slice → plan → complete lifecycle.
