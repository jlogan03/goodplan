# Phase 5: Epic CLI Commands

All epic:* commands registered in the CLI. Mutation commands route through RPC begin/complete. Read-only commands (list, show) go directly to data layer. Full stdin handling, output modes, help text.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `bun run src/index.ts epic:create 2>&1` — unknown command error
- [x] `bun run src/index.ts epic:list 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [x] `echo '{"name":"my-epic","goal":"Test"}' | bun run src/index.ts epic:create --json` — creates epic, returns JSON
- [x] `bun run src/index.ts epic:list --json` — returns overview items
- [x] `bun run src/index.ts epic:show --epic my-epic --json` — returns full epic entity
- [x] `bun run src/index.ts epic:explore --epic my-epic --json` — transitions to exploring
- [x] `bun run src/index.ts epic:abandon --epic my-epic --reason "test" --json` — transitions to abandoned

### Tasks

- [x] Create `src/commands/epic/create.ts` — reads stdin JSON `{name, goal}`, calls `begin('create', {type:'epic'})`. Outputs created epic. Human-readable shows name + status. When stdin is TTY, `readStdin()` returns `{}` — Zod validation of the merged input naturally rejects missing required fields (`name`, `goal`), producing a structured validation error. No separate TTY check needed.
- [x] Create `src/commands/epic/list.ts` — read-only. Calls `loadState()`, navigates to `epics/overview.json`, returns items. No RPC. In `--json` mode, returns `{ items: Array<{ name: string; status: string; created: string; completed: string | null }> }` — the shape matches the `overviewSchema` items array directly (overview items do NOT include `goal`). No per-epic JSON lookup needed.
- [x] Create `src/commands/epic/show.ts` — read-only. Calls `loadState()`, navigates to `epics/<name>/epic.json`. Requires `--epic` flag.
- [x] Create `src/commands/epic/explore.ts` — calls `begin('explore', {type:'epic', name})`. Requires `--epic` flag.
- [x] Create `src/commands/epic/define-architecture.ts` — calls `begin('define-architecture', ...)`. Note: the skip path (explored → architecture-defined via COMPLETE_ARCHITECTURE) is exercised through `submit-architecture` in Phase 6, not through this command. This command only handles the BEGIN_ARCHITECTURE transition.
- [x] Create `src/commands/epic/refine-architecture.ts` — calls `begin('refine-architecture', ...)`.
- [x] Create `src/commands/epic/define-slices.ts` — calls `begin('define-slices', ...)`.
- [x] Create `src/commands/epic/refine-slices.ts` — calls `begin('refine-slices', ...)`.
- [x] Create `src/commands/epic/activate.ts` — calls `begin('activate', {type:'epic', name})`. Human-readable shows activation success + active epic name.
- [x] Create `src/commands/epic/complete.ts` — requires `--epic` flag. Reads stdin JSON `{verificationResults}`, calls `complete({type:'epic', name}, input)`. Guard: all passed. Uses stdin because `verificationResults` is a complex structured payload (array of objects).
- [x] Create `src/commands/epic/abandon.ts` — requires `--epic` and `--reason` flags. Uses flags (not stdin) because `reason` is a simple scalar value. Calls `begin('abandon', {type:'epic', name})` with payload `{ reason }` (forwarded to ABANDON_EPIC event via the payload mechanism from Phase 4).
- [x] Create `src/commands/epic/add-verification.ts` — reads stdin JSON verification entry, calls `begin('add-verification', {type:'epic', name})` with payload `{ verification }` (forwarded to ADD_VERIFICATION event).
- [x] Create `src/commands/epic/update-verification.ts` — reads stdin JSON, requires `--index` flag. Calls `begin('update-verification', {type:'epic', name})` with payload `{ index, verification }` (forwarded to UPDATE_VERIFICATION event).
- [x] Register all epic commands in `src/index.ts` under the `epic:` namespace using citty's subCommands pattern.
- [x] Create `src/schemas/commands/epic.ts` — Zod schemas for epic command stdin inputs (createEpicInput, completeEpicInput, addVerificationInput, updateVerificationInput).
- [x] Ensure all epic command definitions include `description` for the command and each flag, plus expected stdin shape, state preconditions, and resulting transitions in help text — per commands-api.md Help Text Quality contract.
- [x] Define human-readable output pattern for all transition commands: `{epicName}: {previousStatus} → {newStatus}`. Commands with additional context append it (e.g., activate shows verification count, refine shows round number and whether threshold was met). List commands show a table of name + status. Show commands display the full entity fields in a readable format.
- [x] Write tests: epic:create creates tree, epic:list returns items, epic:show returns entity, phase commands transition status, activate guards (no verifications → error, already active → error), abandon transitions, complete with passing/failing verifications. Test human-readable, --json, and --quiet output modes.

### Verification
`bun test tests/unit/commands/epic/` passes. Full phase chain walkthrough via CLI commands in a temp directory: init → create → explore → define-architecture → refine-architecture → define-slices → refine-slices → add-verification → activate → abandon (from different epic). All commands produce correct --json output.
