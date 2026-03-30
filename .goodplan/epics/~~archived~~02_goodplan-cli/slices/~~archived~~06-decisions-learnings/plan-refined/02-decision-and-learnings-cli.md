# Phase 2: Decision & Learnings CLI

Wire decision and rollup targets through the RPC layer and create 6 CLI commands: 4 decision commands and 2 learning commands.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `bun run src/index.ts decision:create 2>&1` — unknown command error
- [x] `bun run src/index.ts learning:rollup 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [x] `echo '{"id":"use-postgres","domain":"data","title":"Use PostgreSQL","summary":"Chosen for reliability"}' | bun run src/index.ts decision:create --json` — creates decision
- [x] `bun run src/index.ts decision:list --json` — returns decisions array
- [x] `bun run src/index.ts decision:show --id use-postgres --json` — returns full entry
- [x] `bun run src/index.ts decision:update --json` with `{"id":"use-postgres","changes":{"status":"revisiting"}}` — transitions status

### Tasks

- [x] Wire `begin()` in `src/core/rpc/begin.ts` for: `create-decision` → CREATE_DECISION, `update-decision` → UPDATE_DECISION, `rollup` → ROLLUP_LEARNINGS. Replace "not yet implemented" throws. Add `"create-decision"` to `BeginPhase` union. Add real payload types to `BeginPayloadMap` for `create-decision` (id, domain, title, summary), `update-decision`, and `rollup`. Do NOT route through `begin('create', {type:'decision'})` — the `create` phase payload shape is incompatible; use a dedicated `"create-decision"` phase.
- [x] Add `target.type === "decision"` branch to `buildBeginResult` in `src/core/rpc/begin.ts`: read decision entry from `decisions.jsonl` by id to extract `previousStatus` and `newStatus`. Without this, decision commands return incorrect status values.
- [x] Create `src/schemas/commands/decision.ts` — `createDecisionInputSchema` (id, domain, title, summary), `updateDecisionInputSchema` (id, changes: { status?, domain?, title?, summary?, supersededBy? }).
- [x] Create `src/commands/decision/create.ts` — reads stdin JSON `{id, domain, title, summary}`, calls `begin('create-decision', ..., payload)`. Human-readable: `{id}: none -> active`.
- [x] Create `src/commands/decision/update.ts` — reads stdin JSON `{id, changes}`, calls `begin('update-decision', ..., payload)`. Human-readable: `{id}: {previousStatus} -> {newStatus}`.
- [x] Create `src/commands/decision/list.ts` — read-only, bypasses RPC. Uses `loadState` + `getJsonl` to read `decisions.jsonl` from state tree (follows existing `epic:list` pattern). Note: `getJsonl` is imported from `src/core/tree.ts` (state machine tree helpers), not from the Data Layer tree module. Returns `{ items: [...] }`. Human-readable: `bold(id) status domain title` (matching existing list command formatting — no column alignment).
- [x] Create `src/commands/decision/show.ts` — read-only, `--id` flag (per `commands-api.md`). Uses `loadState` + `getJsonl` to read `decisions.jsonl`, find entry by id (matching `epic:show` pattern). Returns full `DecisionEntry`. Human-readable: formatted key-value display. Note: list/show commands use `loadState` (requires initialized project), while Phase 3 status uses `assembleState` (handles fresh projects) — this asymmetry is intentional.
- [x] Create `src/commands/learning/rollup.ts` — `--from` and `--to` flags, calls `begin('rollup', ..., {from, to})`. Human-readable: `Rolled up N learnings from {from} to {to} (removed from source)`.
- [x] Create `src/commands/learning/list.ts` — read-only, optional `--source` flag (e.g., `--source slices/01-auth`, per `commands-api.md`). Without source: reads project-level `learnings.jsonl`. With source: reads `<source>/learnings.jsonl`. Returns `{ items: [...] }`. Human-readable: formatted list with category, summary, source. Note: rolled-up entries only appear at the target scope (they are removed from source by `ROLLUP_LEARNINGS`).
- [x] Register all 6 commands in `src/commands/main.ts` under `decision:` and `learning:` namespaces.
- [x] Update `commands-api.md` to show the correct `decision:create` stdin shape (`{ id, domain, title, summary }`) — the current doc groups it with `{ name, goal }` entities which is wrong. The state-machine payload is the source of truth.
- [x] Write tests: decision create/update/list/show, learning rollup/list. Decision lifecycle walkthrough (create → update to revisiting → update back to active → create another → update to superseded). `--json` and `--quiet` modes (all new commands follow the existing `output()` pattern — `--quiet` returns early with no output). Full manual CLI verification in temp dir.

### Verification
`bun test tests/unit/commands/decision/` passes. `bun test tests/unit/commands/learning/` passes. `bun test tests/unit/rpc/` passes. Full decision lifecycle exercisable through CLI in a temp directory.
