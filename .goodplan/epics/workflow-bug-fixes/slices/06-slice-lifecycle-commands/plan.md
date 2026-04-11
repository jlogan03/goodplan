# Implementation Plan: 06-slice-lifecycle-commands

## Goal

Implement ~24 `gp slice:*` commands (21 mutating + 3 read-only) including chunk lifecycle, code refinement, and landing, using v2 event-sourced patterns established in slice 05. Also extract shared v2 command boilerplate into a helper and delete 7 dead v1 epic command files.

---

## Phase 1: Helper Extraction + Management v2 Rewrite

### Objective

Extract the repeated ~15-line v2 command boilerplate (resolveProjectDir, events path resolution, git info, invariant wiring, InvariantError handling) into a shared `createSliceCommandContext` helper. Then rewrite the 8 existing v1 slice commands (`create`, `list`, `show`, `abandon`, `plan`, `refine-plan`, `implement`, `complete`) to v2 event-sourced patterns. Also delete the 7 dead v1 epic command files.

### Expected Behavior

Before:
- `src/commands/slice/create.ts` uses `core/rpc/begin.js` (v1 state machine)
- `src/commands/slice/abandon.ts` uses `core/rpc/begin.js`
- `src/commands/epic/explore.ts` and 6 other dead v1 files exist

After:
- `bun run check` passes (no lint/type errors)
- `bun run test` passes (all existing tests still green)
- New unit tests in `tests/unit/commands/slice/` pass for all 8 commands
- Running `./gp slice:create --epic test --json` against a test fixture with an initialized project and activated epic emits `slice-created` event with `{ directory: "..." }` payload to `epics/<name>/events.jsonl`
- Running `./gp slice:list --epic test --json` returns `{ items: [...], total: N }` from event replay (not `overview.json`)
- Running `./gp slice:show --slice foo --epic test --json` returns derived state from events
- Running `./gp slice:abandon --slice foo --epic test --reason "test" --json` emits `slice-abandoned` event
- The 7 dead v1 epic files no longer exist: `explore.ts`, `define-architecture.ts`, `define-slices.ts`, `refine-architecture.ts`, `refine-slices.ts`, `add-verification.ts`, `update-verification.ts`
- No references to deleted files remain in `main.ts` (commented-out imports already exist, remove them)

### Tasks

1. **Create `src/commands/slice/command-context.ts`** -- shared helper that encapsulates the v2 boilerplate pattern visible in every epic command:
   - `resolveProjectDir()` + epic events path resolution
   - `getGitBranch()` + `getGitCommitHint()`
   - `createCoreRegistry()` + `createReplayGetContext(replayEvents)` + `createBeforeAppendHook()`
   - `fs.existsSync()` check on the epic events path
   - Returns a typed context object: `{ goodplanDir, epicName, sliceName, epicEventsPath, branch, commitHint, beforeAppend }`
   - Also export a `handleInvariantError(error, args)` helper for the catch block pattern
   - Model after `src/commands/epic/context-helper.ts` but for command setup, not context bundling

2. **Create `src/schemas/events/slice.ts`** -- Zod payload schemas for all slice events:
   - `sliceCreatedPayloadSchema` -- `{ directory: string, goal?: string }`
   - `sliceAbandonedPayloadSchema` -- `{ reason: string }`
   - Placeholder exports for events added in later phases (plan-drafted, plan-committed, chunk events, etc.)
   - Export a `SliceEventMap` type mapping event type strings to payload schemas (matching `EpicEventMap` pattern)
   - Register in `src/schemas/events/index.ts`

3. **Rewrite `src/commands/slice/create.ts`** to v2 pattern:
   - Accept `--epic` (required) + `--name` via flag or stdin JSON `{ name, goal }`
   - Use `createSliceCommandContext` helper
   - Append `slice-created` event to epic scope events.jsonl
   - Output per `MutatingCommandOutput` contract: `{ ok: true, event, entity: "slice:<name>" }`
   - Remove dependency on `core/rpc/begin.js` and `schemas/commands/slice.js` v1 schema

4. **Rewrite `src/commands/slice/list.ts`** to v2 pattern:
   - Read-only: replay epic events, compute derived state, list slices
   - Keep `--epic` flag (defaults to active epic) and `--all` flag
   - Return `{ items: SliceState[], total: number }` from derived state (not `overview.json`)
   - Preserve pagination support

5. **Rewrite `src/commands/slice/show.ts`** to v2 pattern:
   - Read-only: replay epic events, compute derived state for one slice
   - Keep `--slice` (required) and `--epic` (optional, defaults to active epic) args
   - Return `SliceState` from derived state (not `slice.json`)

6. **Rewrite `src/commands/slice/abandon.ts`** to v2 pattern:
   - Use `createSliceCommandContext` helper
   - Append `slice-abandoned` event
   - Remove dependency on `core/rpc/begin.js`

7. **Rewrite v1 `plan.ts` -> delete** (superseded by `plan-draft` and `plan-commit` in Phase 2)

8. **Rewrite v1 `refine-plan.ts` -> delete** (superseded by `plan-shape-*` in Phase 2)

9. **Rewrite v1 `implement.ts` -> delete** (superseded by `implement-start` in Phase 3)

10. **Rewrite v1 `complete.ts` -> delete** (superseded by `land` in Phase 4)

11. **Delete 7 dead v1 epic command files:**
    - `src/commands/epic/explore.ts`
    - `src/commands/epic/define-architecture.ts`
    - `src/commands/epic/define-slices.ts`
    - `src/commands/epic/refine-architecture.ts`
    - `src/commands/epic/refine-slices.ts`
    - `src/commands/epic/add-verification.ts`
    - `src/commands/epic/update-verification.ts`
    - Remove commented-out import lines from `src/commands/main.ts`

12. **Update `src/commands/main.ts`**:
    - Remove v1 slice command registrations: `slice:plan`, `slice:refine-plan`, `slice:implement`, `slice:complete`
    - Keep: `slice:create`, `slice:list`, `slice:show`, `slice:abandon` (now v2)
    - Remove commented-out v1 epic imports

13. **Write unit tests** in `tests/unit/commands/slice/`:
    - `create.test.ts` -- tests event append with correct payload
    - `list.test.ts` -- tests derived state list output
    - `show.test.ts` -- tests derived state show output
    - `abandon.test.ts` -- tests event append for abandon

14. **Write integration test** `tests/integration/workflow-slice-management.test.ts`:
    - `slice:create` from initialized + activated epic creates slice events
    - `slice:list` returns created slices
    - `slice:show` returns slice state
    - `slice:abandon` emits abandon event
    - Pattern: use `withTempDir`, `runCommand`, `runChain` from `helpers.ts`

### Verification

```bash
bun run check   # lint + type check passes
bun run test     # all tests pass (existing + new)
# Confirm dead files are gone:
ls src/commands/epic/explore.ts 2>&1 | grep "No such file"
ls src/commands/epic/define-architecture.ts 2>&1 | grep "No such file"
```

---

## Phase 2: Planning & Shape Commands (6 new commands)

### Objective

Implement the 6 planning and shape-checkpoint commands that replace the v1 `slice:plan` and `slice:refine-plan` with granular v2 events: `plan-draft`, `plan-commit`, `plan-shape-start`, `plan-shape-revise`, `plan-shape-approve`, `plan-shape-auto`.

### Expected Behavior

Before:
- No `gp slice:plan-draft` command exists
- Planning was a single `slice:plan` v1 command

After:
- `bun run check` passes
- `bun run test` passes
- Running `gp slice:plan-draft --epic test --slice foo --json` with stdin `{ content: "..." }` emits `slice-plan-drafted` event and stores content as ContentRef
- Running `gp slice:plan-commit --epic test --slice foo --json` with stdin `{ content: "..." }` emits `slice-plan-committed` event (runs extractor on plan content)
- Running `gp slice:plan-shape-start --epic test --slice foo --json` emits `plan-shape-checkpoint-reached` event
- Running `gp slice:plan-shape-revise --epic test --slice foo --json` with stdin `{ content: "..." }` emits `plan-shape-revision-proposed` event
- Running `gp slice:plan-shape-approve --epic test --slice foo --json` emits `plan-shape-approved` event
- Running `gp slice:plan-shape-auto --epic test --slice foo --json` emits `plan-shape-checkpoint-auto-shaped` event (checks steering preference)
- Each command has invariant guards (e.g., plan-commit requires plan-drafted to exist)
- Integration test demonstrates: create -> plan-draft -> plan-shape-start -> plan-shape-approve -> plan-commit flow

### Tasks

1. **Add plan event payload schemas to `src/schemas/events/slice.ts`:**
   - `slicePlanDraftedPayloadSchema` -- `{ plan: ContentRef }`
   - `slicePlanCommittedPayloadSchema` -- `{ plan: ContentRef, extract: PlanExtract }`
   - `planShapeCheckpointReachedPayloadSchema` -- `{ plan: ContentRef }`
   - `planShapeRevisionProposedPayloadSchema` -- `{ plan: ContentRef, revision: string }`
   - `planShapeApprovedPayloadSchema` -- `{}`
   - `planShapeCheckpointAutoShapedPayloadSchema` -- `{ steeringPreference: SteeringPreference }`
   - Update `SliceEventMap` and re-export from `index.ts`

2. **Create `src/commands/slice/plan-draft.ts`:**
   - Accepts `--epic` + `--slice` + stdin `{ content }`
   - Stores content via `storeContentRef`, emits `slice-plan-drafted`
   - Uses `createSliceCommandContext` helper
   - Pattern: mirrors `epic:goal-draft`

3. **Create `src/commands/slice/plan-commit.ts`:**
   - Accepts `--epic` + `--slice` + stdin `{ content }`
   - Runs plan extractor on content, stores ContentRef, emits `slice-plan-committed`
   - Invariant: plan must be drafted (or shaped) first
   - Pattern: mirrors `epic:goal-commit`

4. **Create `src/commands/slice/plan-shape-start.ts`:**
   - Accepts `--epic` + `--slice`
   - Emits `plan-shape-checkpoint-reached`
   - Invariant: plan must be drafted
   - Pattern: mirrors `epic:architecture-shape-start`

5. **Create `src/commands/slice/plan-shape-revise.ts`:**
   - Accepts `--epic` + `--slice` + stdin `{ content, revision }`
   - Emits `plan-shape-revision-proposed`
   - Invariant: shape checkpoint must be active (started but not yet approved)

6. **Create `src/commands/slice/plan-shape-approve.ts`:**
   - Accepts `--epic` + `--slice`
   - Emits `plan-shape-approved`
   - Invariant: shape checkpoint must be active
   - Pattern: mirrors `epic:architecture-shape-approve`

7. **Create `src/commands/slice/plan-shape-auto.ts`:**
   - Accepts `--epic` + `--slice`
   - Reads steering preference from epic or project level
   - Emits `plan-shape-checkpoint-auto-shaped`
   - Invariant: shape checkpoint must be active, steering must allow auto
   - Pattern: mirrors `epic:architecture-shape-auto`

8. **Register all 6 commands in `src/commands/main.ts`:**
   - `"slice:plan-draft"`, `"slice:plan-commit"`, `"slice:plan-shape-start"`, `"slice:plan-shape-revise"`, `"slice:plan-shape-approve"`, `"slice:plan-shape-auto"`

9. **Write unit tests** in `tests/unit/commands/slice/`:
   - `plan-draft.test.ts`, `plan-commit.test.ts`
   - `plan-shape-start.test.ts`, `plan-shape-revise.test.ts`, `plan-shape-approve.test.ts`, `plan-shape-auto.test.ts`

10. **Write integration test** `tests/integration/workflow-slice-planning.test.ts`:
    - Full flow: init -> epic:create -> epic:activate -> slice:create -> slice:plan-draft -> slice:plan-shape-start -> slice:plan-shape-approve -> slice:plan-commit
    - Verify events in events.jsonl at each step
    - Verify invariant failures: e.g., plan-commit before plan-draft should fail with `INVARIANT_FAILED`

### Verification

```bash
bun run check
bun run test
```

---

## Phase 3: Implementation & Chunk Commands (8 new commands)

### Objective

Implement the 8 implementation and chunk lifecycle commands: `implement-start`, `chunk-start`, `chunk-red-written`, `chunk-red-failed`, `chunk-green`, `chunk-verify`, `chunk-unverifiable`, `chunk-decide`. These represent the TDD-driven implementation cycle within a slice.

### Expected Behavior

Before:
- No chunk lifecycle commands exist
- Implementation was a single v1 `slice:implement` command

After:
- `bun run check` passes
- `bun run test` passes
- Running `gp slice:implement-start --epic test --slice foo --json` emits `slice-implementation-started` event
  - Invariant: plan must be committed (plan-committed event exists)
- Running `gp slice:chunk-start --epic test --slice foo --chunk chunk-1 --json` emits `slice-implementation-chunk-started`
  - Invariant: implementation must be started
- Running `gp slice:chunk-red-written --epic test --slice foo --chunk chunk-1 --json` with stdin `{ testRef }` emits `chunk-red-test-written`
  - Invariant: chunk must be started
- Running `gp slice:chunk-red-failed --epic test --slice foo --chunk chunk-1 --json` with stdin `{ evidence }` emits `chunk-red-test-failed`
  - Invariant: red test must be written first
- Running `gp slice:chunk-green --epic test --slice foo --chunk chunk-1 --json` with stdin `{ evidence }` emits `chunk-green-achieved`
  - Invariant: red test must have failed first (TDD ordering)
- Running `gp slice:chunk-verify --epic test --slice foo --chunk chunk-1 --json` with stdin `{ evidence }` emits `chunk-verified`
  - Invariant: green must be achieved, evidence must be non-empty
- Running `gp slice:chunk-unverifiable --epic test --slice foo --chunk chunk-1 --json` with stdin `{ reason }` emits `chunk-unverifiable`
  - Alternative to chunk-verify when verification is not possible
- Running `gp slice:chunk-decide --epic test --slice foo --chunk chunk-1 --json` with stdin `{ decision, reason }` emits `chunk-unverifiable-decided`
  - Invariant: chunk must be in unverifiable state
- Integration test demonstrates full chunk TDD cycle: start -> red-written -> red-failed -> green -> verify

### Tasks

1. **Add chunk event payload schemas to `src/schemas/events/slice.ts`:**
   - `sliceImplementationStartedPayloadSchema` -- `{}`
   - `chunkStartedPayloadSchema` -- `{ chunkId: string, description: string }`
   - `chunkRedTestWrittenPayloadSchema` -- `{ chunkId: string, testRef: ContentRef }`
   - `chunkRedTestFailedPayloadSchema` -- `{ chunkId: string, evidence: string }`
   - `chunkGreenAchievedPayloadSchema` -- `{ chunkId: string, evidence: string }`
   - `chunkVerifiedPayloadSchema` -- `{ chunkId: string, evidence: string }`
   - `chunkUnverifiablePayloadSchema` -- `{ chunkId: string, reason: string }`
   - `chunkUnverifiableDecidedPayloadSchema` -- `{ chunkId: string, decision: string, reason: string }`
   - Update `SliceEventMap`

2. **Create `src/commands/slice/implement-start.ts`:**
   - Accepts `--epic` + `--slice`
   - Emits `slice-implementation-started`
   - Invariant: `slice.plan-converged-before-implement` -- plan must be committed

3. **Create `src/commands/slice/chunk-start.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ description }`
   - Emits `slice-implementation-chunk-started`
   - Invariant: implementation must be started

4. **Create `src/commands/slice/chunk-red-written.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ testRef }`
   - Emits `chunk-red-test-written`
   - Invariant: chunk must be started, not already verified/decided

5. **Create `src/commands/slice/chunk-red-failed.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ evidence }`
   - Emits `chunk-red-test-failed`
   - Invariant: red test must be written (`chunk-red-test-written` exists for this chunk)

6. **Create `src/commands/slice/chunk-green.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ evidence }`
   - Emits `chunk-green-achieved`
   - Invariant: `chunk.red-test-failed-before-green` -- red test must have failed

7. **Create `src/commands/slice/chunk-verify.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ evidence }`
   - Emits `chunk-verified`
   - Invariant: `chunk.evidence-non-empty` -- evidence must be non-empty, green must be achieved

8. **Create `src/commands/slice/chunk-unverifiable.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ reason }`
   - Emits `chunk-unverifiable`
   - Alternative path: after green, when verification is not feasible

9. **Create `src/commands/slice/chunk-decide.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ decision, reason }`
   - Emits `chunk-unverifiable-decided`
   - Invariant: chunk must be in unverifiable state

10. **Register all 8 commands in `src/commands/main.ts`:**
    - `"slice:implement-start"`, `"slice:chunk-start"`, `"slice:chunk-red-written"`, `"slice:chunk-red-failed"`, `"slice:chunk-green"`, `"slice:chunk-verify"`, `"slice:chunk-unverifiable"`, `"slice:chunk-decide"`

11. **Write unit tests** in `tests/unit/commands/slice/`:
    - `implement-start.test.ts`, `chunk-start.test.ts`
    - `chunk-red-written.test.ts`, `chunk-red-failed.test.ts`, `chunk-green.test.ts`
    - `chunk-verify.test.ts`, `chunk-unverifiable.test.ts`, `chunk-decide.test.ts`

12. **Write integration test** `tests/integration/workflow-slice-chunks.test.ts`:
    - Full TDD chunk cycle: init -> epic:create -> activate -> slice:create -> plan-draft -> plan-shape-start -> plan-shape-approve -> plan-commit -> implement-start -> chunk-start -> red-written -> red-failed -> green -> verify
    - Also test the unverifiable path: chunk-start -> red-written -> red-failed -> green -> unverifiable -> decide
    - Verify invariant ordering: red-failed before green fails without red-written, etc.

### Verification

```bash
bun run check
bun run test
```

---

## Phase 4: Code Refinement + Landing (3 new commands)

### Objective

Implement the 3 final slice lifecycle commands: `code-refine-start`, `code-refine-commit`, and `land`. These complete the slice lifecycle from implementation through landing.

### Expected Behavior

Before:
- No code refinement or landing commands exist
- Slice completion was via v1 `slice:complete`

After:
- `bun run check` passes
- `bun run test` passes
- Running `gp slice:code-refine-start --epic test --slice foo --json` emits `slice-code-refinement-started`
  - Invariant: `slice.chunks-all-decided-before-code-refine` -- all chunks must be verified or decided
- Running `gp slice:code-refine-commit --epic test --slice foo --json` emits `code-refinement-converged`
  - Invariant: code refinement must be started
- Running `gp slice:land --epic test --slice foo --json` with stdin `{ deferred?, learnings?, architectureDelta? }` emits `slice-landed`
  - Invariant: `slice.code-refinement-converged-before-land` -- code refinement must be converged
  - Handles deferred items, learnings rollup, architecture delta (migrated from v1 `slice:complete` behavior)
- Integration test covers: code-refine-start -> code-refine-commit -> land

### Tasks

1. **Add code refinement and landing payload schemas to `src/schemas/events/slice.ts`:**
   - `sliceCodeRefinementStartedPayloadSchema` -- `{}`
   - `codeRefinementConvergedPayloadSchema` -- `{}`
   - `sliceLandedPayloadSchema` -- `{ deferred?: DeferredItem[], learnings?: Learning[], architectureDelta?: ArchitectureDelta[] }`
   - Final update to `SliceEventMap` with all slice event types

2. **Create `src/commands/slice/code-refine-start.ts`:**
   - Accepts `--epic` + `--slice`
   - Emits `slice-code-refinement-started`
   - Invariant: all chunks must be verified or decided (checks chunk states in derived state)

3. **Create `src/commands/slice/code-refine-commit.ts`:**
   - Accepts `--epic` + `--slice`
   - Emits `code-refinement-converged`
   - Invariant: code refinement must be started

4. **Create `src/commands/slice/land.ts`:**
   - Accepts `--epic` + `--slice` + optional stdin `{ deferred, learnings, architectureDelta }`
   - Emits `slice-landed`
   - Invariant: code refinement must be converged
   - Handle deferred items routing (create tasks/slices for deferred work)
   - Handle learnings rollup (capture at slice, epic, project levels)
   - Handle architecture delta recording
   - This is the most complex command -- model after v1 `slice:complete` behavior but with v2 events

5. **Register all 3 commands in `src/commands/main.ts`:**
   - `"slice:code-refine-start"`, `"slice:code-refine-commit"`, `"slice:land"`

6. **Write unit tests** in `tests/unit/commands/slice/`:
   - `code-refine-start.test.ts`, `code-refine-commit.test.ts`, `land.test.ts`

7. **Write integration test** `tests/integration/workflow-slice-completion.test.ts`:
   - Build on previous phases: after chunk verification, run code-refine-start -> code-refine-commit -> land
   - Verify `slice-landed` event contains deferred items and learnings
   - Verify invariant failures: land before code-refine-commit fails

### Verification

```bash
bun run check
bun run test
```

---

## Phase 5: Full Lifecycle Integration Test

### Objective

Write a comprehensive end-to-end integration test that exercises the entire slice lifecycle from creation through landing, proving the complete invariant chain works correctly. Also verify the full command registration is correct.

### Expected Behavior

Before:
- Individual phase integration tests exist but no single test covers the full lifecycle

After:
- `bun run check` passes
- `bun run test` passes
- A single integration test exercises the complete lifecycle:
  `init -> epic:create -> epic:activate -> slice:create -> plan-draft -> plan-shape-start -> plan-shape-approve -> plan-commit -> implement-start -> chunk-start -> chunk-red-written -> chunk-red-failed -> chunk-green -> chunk-verify -> code-refine-start -> code-refine-commit -> land`
- The test verifies event log integrity at the end (events.jsonl contains all expected events in order)
- The test verifies derived state reflects "landed" status for the slice
- Negative tests verify key invariant violations (e.g., trying to land before code refinement converges)

### Tasks

1. **Create `tests/integration/workflow-slice-lifecycle.test.ts`:**
   - Full happy-path lifecycle test using `withTempDir` + `runCommand` + `runChain`
   - Start from `init` and walk through every slice command in order
   - At each step, verify: exit code 0, JSON output `{ ok: true }`, correct event type
   - After landing, verify:
     - `slice:show` returns landed state
     - Event log contains all expected event types in correct order
     - `gp verify` passes on the epic scope

2. **Add negative invariant tests:**
   - `slice:plan-commit` without `plan-draft` -> `INVARIANT_FAILED`
   - `slice:implement-start` without `plan-commit` -> `INVARIANT_FAILED`
   - `slice:chunk-green` without `chunk-red-failed` -> `INVARIANT_FAILED`
   - `slice:code-refine-start` with undecided chunks -> `INVARIANT_FAILED`
   - `slice:land` without `code-refinement-converged` -> `INVARIANT_FAILED`

3. **Verify command registration completeness:**
   - Assert that `gp --help` or `gp schema --json` lists all 21 slice commands (4 management + 6 planning + 8 chunk + 3 completion)
   - Could be a fitness test in `tests/fitness/` checking the command tree

4. **Run full verification suite:**
   - `bun run check` (lint + types)
   - `bun run test` (all tests: unit + integration + fitness)
   - Manual spot-check: build binary, run `./gp slice:create --help` to verify help output

### Verification

```bash
bun run check
bun run test
# Spot check:
bun run build
./dist/gp-plugin/binaries/macos-arm64/gp slice:create --help
./dist/gp-plugin/binaries/macos-arm64/gp slice:plan-draft --help
./dist/gp-plugin/binaries/macos-arm64/gp slice:chunk-start --help
./dist/gp-plugin/binaries/macos-arm64/gp slice:land --help
```
