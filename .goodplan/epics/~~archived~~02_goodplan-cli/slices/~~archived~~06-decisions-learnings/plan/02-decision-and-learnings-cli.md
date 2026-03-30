# Phase 2: Decision & Learnings CLI

Wire decision and rollup targets through the RPC layer and create 7 CLI commands: 4 decision commands and 3 learning commands.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts decision:create 2>&1` — unknown command error
- [ ] `bun run src/index.ts learning:rollup 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [ ] `echo '{"id":"use-postgres","domain":"data","title":"Use PostgreSQL","summary":"Chosen for reliability"}' | bun run src/index.ts decision:create --json` — creates decision
- [ ] `bun run src/index.ts decision:list --json` — returns decisions array
- [ ] `bun run src/index.ts decision:show --decision use-postgres --json` — returns full entry
- [ ] `bun run src/index.ts decision:update --json` with `{"id":"use-postgres","changes":{"status":"revisiting"}}` — transitions status

### Tasks

- [ ] Wire `begin()` in `src/core/rpc/begin.ts` for: `create` with `{type:'decision'}` → CREATE_DECISION, `update-decision` → UPDATE_DECISION, `rollup` → ROLLUP_LEARNINGS. Replace "not yet implemented" throws. Add real payload types to `BeginPayloadMap` for `update-decision` and `rollup`.
- [ ] Create `src/schemas/commands/decision.ts` — `createDecisionInputSchema` (id, domain, title, summary), `updateDecisionInputSchema` (id, changes: { status?, domain?, title?, summary?, supersededBy? }).
- [ ] Create `src/commands/decision/create.ts` — reads stdin JSON `{id, domain, title, summary}`, calls `begin('create', {type:'decision'}, payload)`. Human-readable: `{id}: none -> active`.
- [ ] Create `src/commands/decision/update.ts` — reads stdin JSON `{id, changes}`, calls `begin('update-decision', ..., payload)`. Human-readable: `{id}: {previousStatus} -> {newStatus}`.
- [ ] Create `src/commands/decision/list.ts` — read-only, bypasses RPC. Reads `decisions.jsonl` from state tree. Returns `{ items: [...] }`. Human-readable: table with id, status, domain, title.
- [ ] Create `src/commands/decision/show.ts` — read-only, `--decision` flag. Finds entry by id in `decisions.jsonl`. Returns full `DecisionEntry`. Human-readable: formatted key-value display.
- [ ] Create `src/commands/learning/rollup.ts` — `--from` and `--to` flags, calls `begin('rollup', ..., {from, to})`. Human-readable: `Rolled up N learnings from {from} to {to}`.
- [ ] Create `src/commands/learning/list.ts` — read-only, optional `--scope` flag (e.g., `--scope slices/01-auth`). Without scope: reads project-level `learnings.jsonl`. With scope: reads `<scope>/learnings.jsonl`. Returns `{ items: [...] }`.
- [ ] Create `src/commands/learning/show.ts` — read-only, `--scope` flag (required). Returns scope-level `learnings.jsonl` entries. Human-readable: formatted list with category, summary, source.
- [ ] Register all 7 commands in `src/commands/main.ts` under `decision:` and `learning:` namespaces.
- [ ] Write tests: decision create/update/list/show, learning rollup/list/show. Decision lifecycle walkthrough (create → update to revisiting → update back to active → create another → update to superseded). `--json` and `--quiet` modes. Full manual CLI verification in temp dir.

### Verification
`bun test tests/unit/commands/decision/` passes. `bun test tests/unit/commands/learning/` passes. `bun test tests/unit/rpc/` passes. Full decision lifecycle exercisable through CLI in a temp directory.
