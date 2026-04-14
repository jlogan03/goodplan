# Implementation Plan: 07b-08-gap-closure

## Goal

Close implementation gaps between what slices 07b and 08 built vs what the architecture requires. Specifically: add `decision:supersede`, `learning:capture`, `learning:promote` commands; add v2 phase commands to the `quest:*` namespace (goal-commit, plan-shape-approve, plan-commit, chunk-start, chunk-verify); and cover all of these with integration tests and an Agent SDK harness test.

---

## Phase 1: decision:supersede + learning:capture + learning:promote

### Objective

Add three new mutation commands that the architecture specifies but do not exist in the built binary.

### Expected Behavior

**RED (before):**
- `gp decision:supersede --help` exits non-zero (command does not exist)
- `gp learning:capture --help` exits non-zero (command does not exist)
- `gp learning:promote --help` exits non-zero (command does not exist)

**GREEN (after):**
- `gp decision:supersede --id old-dec --json` with stdin `{"newId":"new-dec","domain":"arch","title":"New title","summary":"New summary"}` exits 0, emits `decision-superseded` event, creates the new decision, and marks the old one as superseded
- `gp learning:capture --json` with stdin `{"id":"learn-1","scope":"project","content":"We learned X","tags":["architecture"]}` exits 0, emits `learning-captured` event
- `gp learning:promote --json` with stdin `{"id":"learn-1","targetScope":"epic"}` exits 0, emits `learning-promoted` event

### Tasks

1. **Add `decision:supersede` input schema** in `src/schemas/commands/decision.ts`:
   - `supersedeDecisionInputSchema` — requires `newId`, `domain`, `title`, `summary`; optional `entityPath`, `reconsiderWhen`
   - The `--id` flag identifies the old decision being superseded

2. **Add `decision:supersede` command** at `src/commands/decision/supersede.ts`:
   - Follow the same pattern as `decision:create.ts` and `decision:update.ts`
   - Call `begin(projectDir, "supersede-decision", { type: "decision", id: args.id }, { newId, domain, title, summary, ... })`
   - Register in `src/commands/main.ts` subCommands map as `"decision:supersede"`
   - RPC dispatch goes through `src/core/rpc/begin.ts` (`buildBeginEvent` switch → new `"supersede-decision"` case). Add `"supersede-decision"` to the `BeginPhase` union and `BeginPayloadMap` in `src/core/rpc/types.ts`. Path routing for the result lives in `src/core/rpc/paths.ts`.

3. **Add RPC handler for `supersede-decision`** in the engine layer:
   - Should create the new decision AND update the old decision's status to `superseded` with `supersededBy` pointing to the new ID
   - Emit `decision-superseded` event with payload including both old and new IDs

4. **Add `learning:capture` input schema** in `src/schemas/commands/learning.ts` (new file or extend existing):
   - `captureLearningInputSchema` — requires `id`, `scope`, `content`; optional `tags`

5. **Add `learning:capture` command** at `src/commands/learning/capture.ts`:
   - **Note on dispatch mechanism**: `"learning"` is NOT a valid `Target` type in `src/core/rpc/types.ts` (valid types are `project`, `epic`, `slice`, `quest`, `task`, `decision`, `rollup`). The existing `learning:rollup` command uses `{ type: "rollup", from: ..., to: ... }` with the `"rollup"` phase — it does not use a `"learning"` target. For `learning:capture`, two options: (a) add `{ type: "learning"; id: string }` to the `Target` union in `src/core/rpc/types.ts`, or (b) write the event directly without going through `begin()`, following whatever lower-level pattern the reducer uses. Option (a) is preferred for consistency — add `"learning"` to `Target`, add `"capture-learning"` to `BeginPhase` and `BeginPayloadMap`, then call `begin(projectDir, "capture-learning", { type: "learning", id: input.id }, { scope, content, tags })`
   - Register in `main.ts`

6. **Add `learning:promote` input schema**:
   - `promoteLearningInputSchema` — requires `id`, `targetScope`

7. **Add `learning:promote` command** at `src/commands/learning/promote.ts`:
   - Replaces/supplements existing `learning:rollup` semantics
   - Follow the same dispatch note from task 5 — requires `{ type: "learning" }` added to `Target` union
   - Call `begin(projectDir, "promote-learning", { type: "learning", id: input.id }, { targetScope })`
   - Register in `main.ts`; keep `learning:rollup` for backward compat

8. **Add event schemas** if not already present:
   - `decision-superseded` payload schema in `src/schemas/events/` (add to appropriate file or create new)
   - `learning-captured` payload schema
   - `learning-promoted` payload schema
   - Export from `src/schemas/events/index.ts`

9. **Add reducers** for new events in `src/engine/derived-state/reducers.ts` if needed for derived state computation.
   - `DerivedStateData` (in `src/schemas/entities/derived-state.ts`) tracks `epics`, `sideQuests`, `convergenceSnapshots`, `subsystems`, and `customInvariants` — it does NOT have a `decisions` or `learnings` field. Decisions and learnings are event-log-only entities: `decision:list` and `learning:list` replay `decisions.jsonl` / `learnings.jsonl` directly. No derived state reducer changes are needed for the new decision/learning events.

### Verification

```bash
bun run build && bun test -- --run tests/integration/
# Then manual binary smoke test:
echo '{"newId":"dec-2","domain":"arch","title":"New","summary":"Replaces dec-1"}' | dist/gp-plugin/binaries/macos-arm64/gp decision:supersede --id dec-1 --json
```

---

## Phase 2: Quest v2 Phase Commands

### Objective

Add the missing v2 lifecycle commands to the `quest:*` namespace: `goal-commit`, `plan-shape-approve`, `plan-commit`, `chunk-start`, `chunk-verify`. Keep existing v1-style commands (quest:plan, quest:implement, quest:complete) for backward compatibility.

### Expected Behavior

**RED (before):**
- `gp quest:goal-commit --help` exits non-zero
- `gp quest:plan-commit --help` exits non-zero
- `gp quest:plan-shape-approve --help` exits non-zero
- `gp quest:chunk-start --help` exits non-zero
- `gp quest:chunk-verify --help` exits non-zero

**GREEN (after):**
- `gp quest:goal-commit --quest test-quest --json` with appropriate stdin exits 0, emits `side-quest-goal-committed` event
- `gp quest:plan-commit --quest test-quest --json` exits 0, emits `side-quest-plan-committed` event
- `gp quest:plan-shape-approve --quest test-quest --json` exits 0, emits `side-quest-plan-shape-approved` event
- `gp quest:chunk-start --quest test-quest --json` exits 0, emits `side-quest-chunk-started` event
- `gp quest:chunk-verify --quest test-quest --json` exits 0, emits `side-quest-chunk-verified` event
- Existing v1 commands (`quest:plan`, `quest:implement`, `quest:complete`) continue to work unchanged

### Tasks

   > **Namespace and dispatch note**: All five commands use `{ type: "quest", name: args.quest }` as the `Target` (already a valid `Target` variant in `src/core/rpc/types.ts`). The `begin()` function lives in `src/core/rpc/begin.ts`; each new phase string must be added to the `BeginPhase` union and `BeginPayloadMap` in `src/core/rpc/types.ts`, and a new `case` added to `buildBeginEvent()` in `begin.ts`. Path routing (if needed) goes in `src/core/rpc/paths.ts`. The emitted _event_ types follow the `side-quest-*` prefix convention (e.g., `side-quest-goal-committed`) even though the CLI _commands_ are in the `quest:*` namespace.

1. **Add `quest:goal-commit` command** at `src/commands/quest/goal-commit.ts`:
   - Takes `--quest` flag and stdin with goal content
   - Calls `begin(projectDir, "goal-commit", { type: "quest", name: args.quest }, { content })`
   - Emits `side-quest-goal-committed` event

2. **Add `quest:plan-commit` command** at `src/commands/quest/plan-commit.ts`:
   - Takes `--quest` flag
   - Calls appropriate RPC to commit the plan artifact
   - Emits `side-quest-plan-committed` event

3. **Add `quest:plan-shape-approve` command** at `src/commands/quest/plan-shape-approve.ts`:
   - Takes `--quest` flag
   - Emits `side-quest-plan-shape-approved` event

4. **Add `quest:chunk-start` command** at `src/commands/quest/chunk-start.ts`:
   - Takes `--quest` flag and stdin with chunk description/name
   - Simplified chunk model (no red/green TDD cycle per architecture)
   - Emits `side-quest-chunk-started` event

5. **Add `quest:chunk-verify` command** at `src/commands/quest/chunk-verify.ts`:
   - Takes `--quest` flag and stdin with verification evidence
   - Emits `side-quest-chunk-verified` event

6. **Add input schemas** for each new command in `src/schemas/commands/quest.ts`:
   - `goalCommitQuestInputSchema`
   - `planCommitQuestInputSchema`
   - `planShapeApproveQuestInputSchema`
   - `chunkStartQuestInputSchema`
   - `chunkVerifyQuestInputSchema`

7. **Register all 5 commands** in `src/commands/main.ts` subCommands map

8. **Add event schemas** for quest-specific events if not already defined:
   - Check if side-quest events already exist in `src/schemas/events/`; if not, add them
   - **Reducer cases required**: The `DerivedStateData` type has a `sideQuests: Map<string, SideQuestState>` field (in `src/schemas/entities/derived-state.ts`). `SideQuestState` has a `phase: Phase` field using the `S0`–`S3` phase enum. The following new event types need cases in `src/engine/derived-state/reducers.ts`:
     - `side-quest-goal-committed` — transitions quest from `S0` to `S1`
     - `side-quest-plan-shape-approved` — intermediate sub-phase within `S1` (set a flag analogous to `architectureShapeApproved` on `EpicState`, or advance to `S1` if already committed)
     - `side-quest-plan-committed` — finalizes `S1` (goal + plan both committed)
     - `side-quest-chunk-started` — transitions quest from `S1` to `S2`; creates/updates a `ChunkState` entry in `sideQuests[name].chunks`
     - `side-quest-chunk-verified` — updates the matching `ChunkState.status` to `"verified"`; does not change the quest `phase` (remains `S2` until all chunks done and `quest:complete` is called)

9. **Verify backward compat** — ensure existing `quest:plan`, `quest:implement`, `quest:complete` commands still work as before (no breaking changes to their behavior or status transitions)

### Verification

```bash
bun run build && bun test -- --run tests/integration/workflow-quest.test.ts
# Manual smoke: create quest, then exercise new v2 commands
```

---

## Phase 3: Integration Tests

### Objective

Add comprehensive integration tests covering the quest lifecycle (v2 commands), decision lifecycle (including supersede), and learning lifecycle (including capture/promote).

### Expected Behavior

**RED (before):**
- No test file `tests/integration/decision-lifecycle.test.ts` exists
- No test file `tests/integration/learning-lifecycle.test.ts` exists
- Existing `workflow-quest.test.ts` does not exercise v2 phase commands

**GREEN (after):**
- `bun test -- --run tests/integration/decision-lifecycle.test.ts` passes — covers create, show, list, update, supersede
- `bun test -- --run tests/integration/learning-lifecycle.test.ts` passes — covers capture, list, promote
- `bun test -- --run tests/integration/workflow-quest-v2.test.ts` passes — covers goal-commit, plan-commit, plan-shape-approve, chunk-start, chunk-verify, land

### Tasks

1. **Create `tests/integration/decision-lifecycle.test.ts`**:
   - Use `withFixture("epic-activated", ...)` pattern from `helpers.ts`
   - Test flow: `decision:create` -> `decision:show` -> `decision:list` -> `decision:update` -> `decision:supersede`
   - Assert event emission, status transitions, and the old decision gets `supersededBy` field
   - Assert new decision is created with correct data
   - Assert `decision:list --json` shows both decisions with correct statuses

2. **Create `tests/integration/learning-lifecycle.test.ts`**:
   - Test flow: `learning:capture` -> `learning:list` -> `learning:promote`
   - Assert `learning:capture` creates the learning entry
   - Assert `learning:list` includes captured learning
   - Assert `learning:promote` moves/copies learning to target scope
   - Test edge cases: capture with tags, promote non-existent learning (expect error)

3. **Create `tests/integration/workflow-quest-v2.test.ts`**:
   - Full v2 lifecycle: `quest:create` -> `quest:goal-commit` -> `quest:plan-commit` -> `quest:plan-shape-approve` -> `quest:chunk-start` -> `quest:chunk-verify` -> `quest:complete` (or a `quest:land` if that exists)
   - Assert correct status transitions at each step
   - Assert events are emitted with correct types
   - Test that v1 commands still work (backward compat assertion in same test file)

### Verification

```bash
bun test -- --run tests/integration/decision-lifecycle.test.ts tests/integration/learning-lifecycle.test.ts tests/integration/workflow-quest-v2.test.ts
```

---

## Phase 4: Agent SDK Harness Test

### Objective

Create `tools/dogfood/test-core-skills-v2.ts` that exercises the init, status, and workflow-guide skills via the Agent SDK, verifying they work correctly with the newly added commands.

### Expected Behavior

**RED (before):**
- File `tools/dogfood/test-core-skills-v2.ts` does not exist

**GREEN (after):**
- `bun tools/dogfood/test-core-skills-v2.ts --model claude-opus-4-20250514` completes successfully
- Test exercises: init a project, run status, invoke workflow-guide skill
- Assertions: project initialized, status output contains expected fields, workflow-guide provides valid next steps

### Tasks

1. **Create `tools/dogfood/test-core-skills-v2.ts`**:
   - Follow the pattern from `test-init.ts` and `test-plugin-skills.ts`
   - Use `query()` from `@anthropic-ai/claude-agent-sdk` with `permissionMode: "bypassPermissions"`, local plugin path, `settingSources: []`, and `createTestEnv(PLUGIN_DIR)`
   - Create a temp directory for the test project

2. **Test scenario 1 — Init**:
   - Send a message invoking `/gp:init` skill
   - Assert the `.goodplan/` directory is created with expected structure
   - Assert `events.jsonl` contains `project-initialized` event

3. **Test scenario 2 — Status**:
   - Send a message invoking `/gp:status` skill
   - Assert output includes project state, suggested next steps
   - Assert no errors in stderr

4. **Test scenario 3 — Workflow Guide**:
   - Send a message invoking `/gp:workflow-guide` skill
   - Assert output provides orientation/guidance
   - Assert it references available commands

5. **Add CLI flags** for `--model` and `--max-iterations` (follow pattern from `test-plan-slice.ts`)

6. **Add logging** — write transcript to `tools/dogfood/core-skills-v2-transcript.jsonl` and summary to `tools/dogfood/core-skills-v2-test.log`

### Verification

```bash
bun tools/dogfood/test-core-skills-v2.ts --model claude-opus-4-20250514 --max-iterations 30
```

---

## Dependencies

- Phase 1 must complete before Phase 3 (tests depend on commands existing)
- Phase 2 must complete before Phase 3 (v2 quest tests depend on v2 commands)
- Phase 4 is independent of Phases 1-3 (tests skills, not raw commands) but should run last to benefit from a fully built binary
- All phases require `bun run build` to produce the binary before verification

## Notes

- The architecture specifies `side-quest:*` as the namespace, but the implementation uses `quest:*`. Option C from Q&A: keep `quest:*` and add v2 phase commands there. Events still use the `side-quest-*` prefix per the event schema convention.
- `learning:rollup` is kept for backward compat even after `learning:promote` is added.
- The existing `decision:update` command already supports setting `supersededBy`, but `decision:supersede` is a distinct semantic operation that creates the new decision AND marks the old one in a single atomic operation.
