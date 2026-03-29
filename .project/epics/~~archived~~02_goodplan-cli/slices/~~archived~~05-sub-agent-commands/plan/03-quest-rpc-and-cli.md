# Phase 3: Quest RPC & CLI

Wire quest targets through begin()/complete(), fix submit resolveStatuses, and add 8 quest:* CLI commands.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts quest:create 2>&1` — unknown command error
- [ ] `bun run src/index.ts quest:list 2>&1` — unknown command error

**After implementation** (should pass / show presence):
- [ ] `echo '{"name":"fix-logging","goal":"Fix"}' | bun run src/index.ts quest:create --json` — creates quest
- [ ] `bun run src/index.ts quest:list --json` — returns overview items
- [ ] `bun run src/index.ts quest:show --quest fix-logging --json` — returns full quest entity
- [ ] `bun run src/index.ts quest:plan --quest fix-logging --json` — transitions to planning

### Tasks

- [ ] Extend `begin()` in `src/core/rpc/begin.ts` to handle quest-specific targets that currently throw "not yet implemented": `create` for `{type:'quest'}` → CREATE_QUEST, `plan` for `{type:'quest'}` → BEGIN_QUEST_PLAN, `refine-plan` for `{type:'quest'}` → BEGIN_QUEST_REFINEMENT, `implement` for `{type:'quest'}` → BEGIN_QUEST_IMPLEMENTATION, `abandon` for `{type:'quest'}` → ABANDON_QUEST. Runtime validation for quest creation: `goal` required (matching epic/slice pattern).
- [ ] Extend `complete()` in `src/core/rpc/complete.ts` to handle `{type:'quest'}` targets. Build COMPLETE_QUEST event from CompleteInput: coerce undefined arrays to `[]` for learnings and architectureDelta. Inject `ts` on each ArchitectureDelta entry. No deferred handling (quests don't route deferred work).
- [ ] Extend `buildBeginResult` in `begin.ts` for quest targets — read old/new Quest from state tree to derive correct status values (currently falls through to defaults).
- [ ] Extend `buildCompleteResult` in `complete.ts` for quest targets — derive `learningsRolledUp` (count entries added to project learnings.jsonl), `architecturePaths` (when deltas exist). No `epicComplete` or `deferredRouted` for quests.
- [ ] Fix `resolveStatuses` in `submit.ts` — currently returns hardcoded `"pre-submit"/"post-submit"` for quest targets. Read quest status from state tree for proper resolution.
- [ ] Create `src/commands/quest/create.ts` — reads stdin JSON `{name, goal}`, calls `begin('create', {type:'quest'}, {name, goal})`. No `--epic` flag (quests are project-scoped). Human-readable: `{questName}: none -> created`.
- [ ] Create `src/commands/quest/list.ts` — read-only, bypasses RPC. Navigates to `quests/overview.json`. Returns `{ items: [...] }`.
- [ ] Create `src/commands/quest/show.ts` — read-only, bypasses RPC. Requires `--quest` flag. Returns full `quest.json`.
- [ ] Create `src/commands/quest/plan.ts` — calls `begin('plan', {type:'quest', name})`. Requires `--quest` flag.
- [ ] Create `src/commands/quest/refine-plan.ts` — calls `begin('refine-plan', {type:'quest', name})`. Requires `--quest` flag.
- [ ] Create `src/commands/quest/implement.ts` — calls `begin('implement', {type:'quest', name})`. Requires `--quest` flag.
- [ ] Create `src/commands/quest/complete.ts` — reads stdin JSON `{verificationPassed, learnings?, architectureDelta?}`, calls `complete({type:'quest', name}, input)`. Requires `--quest` flag. Uses conditional spread for optional fields (exactOptionalPropertyTypes).
- [ ] Create `src/commands/quest/abandon.ts` — `--quest` + `--reason` flags, calls `begin('abandon', {type:'quest', name}, {reason})`.
- [ ] Register all quest commands in `src/commands/main.ts` under `quest:` namespace.
- [ ] Create `src/schemas/commands/quest.ts` — Zod schemas for quest command stdin inputs (createQuestInput, completeQuestInput). `createQuestInput`: `{ name: z.string().min(1), goal: z.string().min(1) }`. `completeQuestInput`: `{ quest: z.string().min(1), verificationPassed: z.boolean(), learnings: z.array(...).optional(), architectureDelta: z.array(...).optional() }`.
- [ ] Write tests: create, list, show, plan, refine-plan, implement, complete (with learnings), abandon. Test --json, --quiet output modes. Full quest lifecycle walkthrough in test.

### Verification
`bun test tests/unit/commands/quest/` passes. `bun test tests/unit/rpc/` passes. Full quest lifecycle exercisable through CLI commands in a temp directory.
