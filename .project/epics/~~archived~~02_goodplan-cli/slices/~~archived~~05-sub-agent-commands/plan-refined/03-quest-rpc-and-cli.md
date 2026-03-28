# Phase 3: Quest RPC & CLI

Wire quest targets through begin()/complete(), fix submit resolveStatuses, and add 8 quest:* CLI commands.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `bun run src/index.ts quest:create 2>&1` — unknown command error
- [x] `bun run src/index.ts quest:list 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [x] `echo '{"name":"fix-logging","goal":"Fix"}' | bun run src/index.ts quest:create --json` — creates quest
- [x] `bun run src/index.ts quest:list --json` — returns overview items
- [x] `bun run src/index.ts quest:show --quest fix-logging --json` — returns full quest entity
- [x] `bun run src/index.ts quest:plan --quest fix-logging --json` — transitions to planning

### Tasks

- [x] Extend `begin()` in `src/core/rpc/begin.ts` to handle quest-specific targets that currently throw "not yet implemented": `create` for `{type:'quest'}` → CREATE_QUEST, `plan` for `{type:'quest'}` → BEGIN_QUEST_PLAN, `refine-plan` for `{type:'quest'}` → BEGIN_QUEST_REFINEMENT, `implement` for `{type:'quest'}` → BEGIN_QUEST_IMPLEMENTATION, `abandon` for `{type:'quest'}` → ABANDON_QUEST. Runtime validation for quest creation: `goal` required (matching epic/slice pattern).
- [x] Extend `complete()` in `src/core/rpc/complete.ts` to handle `{type:'quest'}` targets. Build COMPLETE_QUEST event from CompleteInput: coerce undefined arrays to `[]` for learnings and architectureDelta (typed as `ArchitectureDeltaInput[]` — the state machine handler injects `ts` from `event.ts`, not the RPC layer). No deferred handling (quests don't route deferred work).
- [x] Extend `buildBeginResult` in `begin.ts` for quest targets — read old/new Quest from state tree to derive correct status values (currently falls through to defaults with `previousStatus: "none"`, `newStatus: "unknown"`). Requires `Quest` type import from `schemas/entities/quest.js`.
- [x] Extend `buildCompleteResult` in `complete.ts` for quest targets — derive `learningsRolledUp` (count entries added to project learnings.jsonl), `architecturePaths` (when deltas exist). No `epicComplete` or `deferredRouted` for quests.
- [x] Fix `resolveStatuses` in `submit.ts` — currently returns hardcoded `"pre-submit"/"post-submit"` for quest targets. Read quest status from state tree for proper resolution.
- [x] Create `src/commands/quest/create.ts` — reads stdin JSON `{name, goal}`, calls `begin('create', {type:'quest'}, {name, goal})`. No `--epic` flag (quests are project-scoped). Human-readable: `{questName}: none -> created`. Help text: `"Create a new quest. Stdin: {name, goal}. No target flag needed. Transitions to 'created' status."` (matching `slice:create` description pattern).
- [x] Create `src/commands/quest/list.ts` — read-only, bypasses RPC. Navigates to `quests/overview.json`. Returns `{ items: [...] }`. Human-readable: follow `slice:list` format minus the epic column.
- [x] Create `src/commands/quest/show.ts` — read-only, bypasses RPC. Requires `--quest` flag. Returns full `quest.json`. Human-readable: follow `slice:show` format minus epic/deferred lines.
- [x] Create `src/commands/quest/plan.ts` — calls `begin('plan', {type:'quest', name})`. Requires `--quest` flag. Human-readable: `{questName}: {previousStatus} -> {newStatus}` (matching slice command format).
- [x] Create `src/commands/quest/refine-plan.ts` — calls `begin('refine-plan', {type:'quest', name})`. Requires `--quest` flag. Human-readable: same status transition format.
- [x] Create `src/commands/quest/implement.ts` — calls `begin('implement', {type:'quest', name})`. Requires `--quest` flag. Human-readable: same status transition format.
- [x] Create `src/commands/quest/complete.ts` — reads stdin JSON `{verificationPassed, learnings?, architectureDelta?}`, calls `complete({type:'quest', name}, input)`. Requires `--quest` flag. Uses conditional spread for optional fields at the CLI handler boundary when building `CompleteInput` from CLI args (exactOptionalPropertyTypes — the field may be absent). Inside `buildCompleteEvent` (RPC layer), use `?? []` coercion instead (matching `slice-complete.ts` lines 83–85 — event fields are required, not optional). Use proper narrowing for quest name (not `input.quest!` non-null assertion — avoid the pattern in existing `submit-plan.ts:42`). Human-readable: status transition + learnings/architecture summary.
- [x] Create `src/commands/quest/abandon.ts` — `--quest` + `--reason` flags, calls `begin('abandon', {type:'quest', name}, {reason})`. Human-readable: `{questName}: {previousStatus} -> abandoned`.
- [x] Register all quest commands in `src/commands/main.ts` under `quest:` namespace.
- [x] Create `src/schemas/commands/quest.ts` — Zod schemas for quest command stdin inputs (createQuestInput, completeQuestInput). `createQuestInput`: `{ name: z.string().min(1), goal: z.string().min(1) }`. `completeQuestInput`: `{ verificationPassed: z.boolean(), learnings: z.array(...).optional(), architectureDelta: z.array(...).optional() }` — no `quest` field (quest name comes from `--quest` flag, matching `slice:complete` pattern).
- [x] Write tests: create, list, show, plan, refine-plan, implement, complete (with learnings), abandon. Test --json, --quiet output modes. Full quest lifecycle walkthrough in test.

### Verification
`bun test tests/unit/commands/quest/` passes. `bun test tests/unit/rpc/` passes. Full quest lifecycle exercisable through CLI commands in a temp directory.
