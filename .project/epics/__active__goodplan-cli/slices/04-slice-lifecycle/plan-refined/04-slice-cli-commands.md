# Phase 4: Slice CLI Commands

All 8 slice:* commands registered in the CLI. Follows the exact same patterns established in Phase 5 of slice 03 (epic commands).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts slice:create 2>&1` — unknown command error
- [ ] `bun run src/index.ts slice:list 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [ ] `echo '{"name":"01-auth","goal":"Auth"}' | bun run src/index.ts slice:create --epic my-epic --json` — creates slice
- [ ] `bun run src/index.ts slice:list --json` — returns overview items
- [ ] `bun run src/index.ts slice:show --slice 01-auth --json` — returns full slice entity
- [ ] `bun run src/index.ts slice:plan --slice 01-auth --json` — transitions to planning

### Tasks

- [ ] Create `src/commands/slice/create.ts` — reads stdin JSON `{name, goal}` and `--epic` flag (epic comes from the flag, NOT from stdin, per commands-api.md and INV-004). Calls `begin(projectDir, 'create', {type:'slice', name: input.name}, {name: input.name, goal: input.goal, epic: input.epic})` where `epic` is merged from the flag (matching existing `epicCreateCommand` 4-arg form). Human-readable output: `{sliceName} (epic: {epicName}): none -> created`.
- [ ] Create `src/commands/slice/list.ts` — read-only, bypasses RPC layer (goes directly to Data Layer per commands-api.md). Calls `loadState()`, navigates to `slices/overview.json`. Optional `--epic` flag to filter by epic. Filter mechanism: uses the `epic` field added to `overviewItemSchema` in Phase 1 (task 4). Returns `{ items: [...] }` matching overview schema.
- [ ] Create `src/commands/slice/show.ts` — read-only, bypasses RPC layer (goes directly to Data Layer per commands-api.md). Calls `loadState()`, navigates to `slices/<name>/slice.json`. Requires `--slice` flag.
- [ ] Create `src/commands/slice/plan.ts` — calls `begin('plan', {type:'slice', name})`. Requires `--slice` flag.
- [ ] Create `src/commands/slice/refine-plan.ts` — calls `begin('refine-plan', {type:'slice', name})`. Requires `--slice` flag.
- [ ] Create `src/commands/slice/implement.ts` — calls `begin('implement', {type:'slice', name})`. Requires `--slice` flag.
- [ ] Create `src/commands/slice/complete.ts` — reads stdin JSON `{verificationPassed, deferred?, learnings?, architectureDelta?}`, calls `complete({type:'slice', name}, input)`. Requires `--slice` flag. Uses stdin for complex structured payload.
- [ ] Create `src/commands/slice/abandon.ts` — requires `--slice` and `--reason` flags. Calls `begin('abandon', {type:'slice', name}, {reason})`.
- [ ] Register all slice commands in `src/commands/main.ts` under the `slice:` namespace.
- [ ] Create `src/schemas/commands/slice.ts` — Zod schemas for slice command stdin inputs (createSliceInput, completeSliceInput). `createSliceInput` should have `epic` as `z.string().min(1)` (required) in the schema — since `--epic` is a required flag (INV-004) and `validateInput` merges the flag value into the validated object, the merged result must always have `epic` present. Making it optional would silently allow a missing flag to produce `undefined`.
- [ ] Ensure help text quality per commands-api.md — descriptions for commands and flags, expected stdin shapes. Note: `--query` flag is defined in commands-api.md as a global flag but no existing commands implement it — this slice perpetuates that gap (not a regression, to be addressed separately).
- [ ] Human-readable output pattern: `{sliceName} (epic: {epicName}): {previousStatus} -> {newStatus}` for create. Other transitions: `{sliceName}: {previousStatus} -> {newStatus}`. For `slice:complete`, use a multi-line format:
  ```
  01-auth: implementation-complete -> completed
    Deferred: 2 routed, 1 skipped
    Learnings: 1 rolled up (epic: 1, project: 0)
    Epic complete: yes
  ```
- [ ] Write tests: create, list, show, plan, refine-plan, implement, complete (with deferred + learnings), abandon. Test --json, --quiet output modes.

### Verification
`bun test tests/unit/commands/slice/` passes. CLI commands work in a temp directory: init → create epic → activate → create slice → plan → complete lifecycle.
