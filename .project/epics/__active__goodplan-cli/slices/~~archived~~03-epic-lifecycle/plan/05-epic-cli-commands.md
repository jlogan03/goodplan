# Phase 5: Epic CLI Commands

All epic:* commands registered in the CLI. Mutation commands route through RPC begin/complete. Read-only commands (list, show) go directly to data layer. Full stdin handling, output modes, help text.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts epic:create 2>&1` — unknown command error
- [ ] `bun run src/index.ts epic:list 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [ ] `echo '{"name":"my-epic","goal":"Test"}' | bun run src/index.ts epic:create --json` — creates epic, returns JSON
- [ ] `bun run src/index.ts epic:list --json` — returns overview items
- [ ] `bun run src/index.ts epic:show --epic my-epic --json` — returns full epic entity
- [ ] `bun run src/index.ts epic:explore --epic my-epic --json` — transitions to exploring
- [ ] `bun run src/index.ts epic:abandon --epic my-epic --reason "test" --json` — transitions to abandoned

### Tasks

- [ ] Create `src/commands/epic/create.ts` — reads stdin JSON `{name, goal}`, calls `begin('create', {type:'epic'})`. Outputs created epic. Human-readable shows name + status. TTY without stdin → validation error.
- [ ] Create `src/commands/epic/list.ts` — read-only. Calls `assembleState()`, navigates to `epics/overview.json`, returns items. No RPC.
- [ ] Create `src/commands/epic/show.ts` — read-only. Calls `assembleState()`, navigates to `epics/<name>/epic.json`. Requires `--epic` flag.
- [ ] Create `src/commands/epic/explore.ts` — calls `begin('explore', {type:'epic', name})`. Requires `--epic` flag.
- [ ] Create `src/commands/epic/define-architecture.ts` — calls `begin('define-architecture', ...)`.
- [ ] Create `src/commands/epic/refine-architecture.ts` — calls `begin('refine-architecture', ...)`.
- [ ] Create `src/commands/epic/define-slices.ts` — calls `begin('define-slices', ...)`.
- [ ] Create `src/commands/epic/refine-slices.ts` — calls `begin('refine-slices', ...)`.
- [ ] Create `src/commands/epic/activate.ts` — calls `begin('activate', {type:'epic', name})`. Human-readable shows activation success + active epic name.
- [ ] Create `src/commands/epic/complete.ts` — reads stdin JSON `{verificationResults}`, calls `complete({type:'epic', name}, input)`. Guard: all passed.
- [ ] Create `src/commands/epic/abandon.ts` — requires `--epic` and `--reason` flags. Calls `begin('abandon', {type:'epic', name})`.
- [ ] Create `src/commands/epic/add-verification.ts` — reads stdin JSON verification entry, calls `begin('add-verification', {type:'epic', name})`.
- [ ] Create `src/commands/epic/update-verification.ts` — reads stdin JSON, requires `--index` flag. Calls `begin('update-verification', {type:'epic', name})`.
- [ ] Register all epic commands in `src/index.ts` under the `epic:` namespace using citty's subCommands pattern.
- [ ] Create `src/schemas/commands/epic.ts` — Zod schemas for epic command stdin inputs (createEpicInput, completeEpicInput, addVerificationInput, updateVerificationInput).
- [ ] Write tests: epic:create creates tree, epic:list returns items, epic:show returns entity, phase commands transition status, activate guards (no verifications → error, already active → error), abandon transitions, complete with passing/failing verifications. Test human-readable, --json, and --quiet output modes.

### Verification
`bun test tests/unit/commands/epic/` passes. Full phase chain walkthrough via CLI commands in a temp directory: init → create → explore → define-architecture → refine-architecture → define-slices → refine-slices → add-verification → activate → abandon (from different epic). All commands produce correct --json output.
