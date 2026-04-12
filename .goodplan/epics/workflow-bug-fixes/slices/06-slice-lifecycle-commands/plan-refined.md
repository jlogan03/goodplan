# Implementation Plan: 06-slice-lifecycle-commands

## Goal

Implement 21 `gp slice:*` commands (19 mutating + 2 read-only) as enumerated in `architecture/commands.md:93-117`, including chunk lifecycle, code refinement, and landing, using v2 event-sourced patterns established in slice 05. Also extract shared v2 command boilerplate into a reusable helper, delete 7 dead v1 epic command files, and integrate ContextBundle output for phase-starting commands.

**Command count source of truth:** `architecture/commands.md:93-117` lists exactly 21 commands: `create`, `list` (read-only), `show` (read-only), `plan-draft`, `plan-commit`, `plan-shape-start`, `plan-shape-revise`, `plan-shape-approve`, `plan-shape-auto`, `implement-start`, `chunk-start`, `chunk-red-written`, `chunk-red-failed`, `chunk-green`, `chunk-verify`, `chunk-unverifiable`, `chunk-decide`, `code-refine-start`, `code-refine-commit`, `land`, `abandon`.

**Scope invariant:** All slice and chunk events append to `epics/<name>/events.jsonl` with `scope: 'epic'`, `scopeRef: <epic-slug>`. Slice and chunk identity lives in payload fields (`sliceRef`, `chunkId`), NOT in separate event files. There is no `epics/<name>/slices/<slice>/events.jsonl`.

**goal.md divergence note:** `goal.md` predates the TDD chunk model in `architecture/commands.md`; this plan follows the architecture doc. Phase 5 includes a task to rewrite `goal.md` to match.

**exactOptionalPropertyTypes hazard:** Several payload schemas use optional array fields (e.g., `sliceLandedPayloadSchema`). Under `exactOptionalPropertyTypes: true`, `z.array(...).optional()` infers `T[] | undefined` which is not assignable to an optional property. Use conditional-spread at call sites (see `project_zod_optional_properties.md`) or explicit payload type annotations.

**Architecture alignment:** No architecture updates required; `commands.md` already defines the 21 slice commands and their events. This plan implements that spec.

---

## Phase 1: Helper Extraction + Management v2 Rewrite

### Objective

Extract the repeated ~15-line v2 command boilerplate (resolveProjectDir, events path resolution, git info, invariant wiring, InvariantError handling) into a shared `createEventCommandContext` helper at `src/commands/_shared/command-context.ts`. Then rewrite the 4 existing v1 slice commands being kept (`create`, `list`, `show`, `abandon`) to v2 event-sourced patterns, delete 4 superseded v1 slice commands (`plan`, `refine-plan`, `implement`, `complete`), and delete the 7 dead v1 epic command files.

### Expected Behavior

Before:
- `src/commands/slice/create.ts` uses `core/rpc/begin.js` (v1 state machine)
- `src/commands/slice/abandon.ts` uses `core/rpc/begin.js`
- `src/commands/epic/explore.ts` and 6 other dead v1 files exist
- V2 boilerplate is copy-pasted across ~20 epic commands

After:
- `bun run check` passes (no lint/type errors)
- `bun run test` passes (all existing tests still green)
- New unit tests in `tests/unit/commands/slice/` pass for kept commands
- `src/commands/_shared/command-context.ts` exports `createEventCommandContext` used by both new slice commands AND migrated epic commands
- Running `./gp slice:create --epic test --json` against a test fixture with an initialized project and activated epic emits `slice-created` event with `{ sliceRef: "...", directory: "..." }` payload to `epics/<name>/events.jsonl`
- Running `./gp slice:list --epic test --json` returns `{ items: SliceState[], total: N }` from event replay (not `overview.json`)
- Running `./gp slice:list --all --json` returns slices across all epics using `replayAllScopes`
- Running `./gp slice:show --slice foo --epic test --json` returns derived state from events
- Running `./gp slice:abandon --slice foo --epic test --reason "test" --json` emits `slice-abandoned` event
- The 7 dead v1 epic files no longer exist: `explore.ts`, `define-architecture.ts`, `define-slices.ts`, `refine-architecture.ts`, `refine-slices.ts`, `add-verification.ts`, `update-verification.ts`
- No references to deleted files remain in `main.ts` (commented-out imports already exist, remove them)
- `rg -l "epic/(explore|define-architecture|define-slices|refine-architecture|refine-slices|add-verification|update-verification)" src/ tests/` returns nothing after deletion
- **v1 fallback:** `slice:list` and `slice:show` fall back to reading `overview.json`/`slice.json` (v1 state files) when no `slice-created` events exist in the replayed event log, mapping them to the `SliceState[]` output shape. TODO: fallback shim is removable after slice 12 (migration-dogfood) completes v1-to-v2 migration for all existing data.

### Tasks

1. **Create `src/commands/_shared/command-context.ts`** -- shared helper that encapsulates the v2 boilerplate pattern visible in every epic command (reference: `src/commands/epic/goal-commit.ts` lines 58-88, `src/commands/epic/create.ts` lines ~60-90):
   - `resolveProjectDir()` + epic events path resolution
   - `getGitBranch()` + `getGitCommitHint()`
   - `createCoreRegistry()` + `createReplayGetContext(replayEvents)` + `createBeforeAppendHook()`
   - `fs.existsSync()` check on the epic events path
   - Export a named `EventCommandContext` interface with two overloads via generic: `createEventCommandContext<{ requireSlice: true }>()` returns `{ ..., sliceName: string }` and `createEventCommandContext<{ requireSlice: false }>()` returns `{ ..., sliceName?: undefined }`. This prevents `!` or `as string` casts under `noUncheckedIndexedAccess`.
   - Return type: `{ goodplanDir, epicName, sliceName, epicEventsPath, branch, commitHint, beforeAppend }`
   - Also export a `handleInvariantError(error, args)` helper for the catch block pattern
   - NOT to be confused with `src/commands/epic/context-helper.ts` which is a ContextBundle builder (`buildEpicContextBundle`), not command boilerplate

2. **Create `src/schemas/events/slice.ts`** -- Zod payload schemas for Phase 1 slice events:
   - `sliceCreatedPayloadSchema` -- `{ sliceRef: z.string().min(1), directory: z.string().min(1), goal: z.string().optional() }` (note: `sliceRef` required per scope invariant above)
   - `sliceAbandonedPayloadSchema` -- `{ sliceRef: z.string().min(1), reason: z.string().min(1) }`
   - All event schemas use `domain: 'entity-lifecycle'` (per `conventions.md:45` two-level discriminant)
   - Placeholder exports for events added in later phases (plan-drafted, plan-committed, chunk events, etc.)
   - Export a `SliceEventMap` type mapping event type strings to payload schemas (matching `EpicEventMap` pattern from `src/schemas/events/epic.ts:157-190`)
   - Register in `src/schemas/events/index.ts`
   - **Barrel re-export note:** Schema constants go in `export { }` blocks; `*Payload` types go in `export type { }` blocks to satisfy `verbatimModuleSyntax`

3. **Inventory `src/commands/slice/utils.ts`** -- decide per-function: migrate `requireActiveEpic()` and other functions to `src/commands/_shared/command-context.ts` if reusable across subsystems, keep in `slice/utils.ts` if slice-specific, or delete if dead. Document decisions in code comments.

4. **Introduce `MutatingCommandOutput` interface** in `src/commands/types.ts`:
   - `export interface MutatingCommandOutput<E extends string = string> { ok: true; event: E; entity: string }`
   - All mutating commands in this slice (and future slices) return this shape

5. **Rewrite `src/commands/slice/create.ts`** to v2 pattern:
   - Accept `--epic` (required) + `--name` via flag or stdin JSON `{ name, goal }`
   - Use `createEventCommandContext` helper
   - Append `slice-created` event with `{ sliceRef, directory, goal? }` payload to epic scope events.jsonl
   - Output per `MutatingCommandOutput` contract: `{ ok: true, event: "slice-created", entity: "slice:<name>" }`
   - Remove dependency on `core/rpc/begin.js` and `schemas/commands/slice.js` v1 schema

6. **Rewrite `src/commands/slice/list.ts`** to v2 pattern:
   - Read-only: replay epic events, compute derived state, list slices
   - Keep `--epic` flag (defaults to active epic) and `--all` flag
   - For `--all`: use `replayAllScopes` from `src/engine/derived-state/replay-all-scopes.ts` (note: this is the most expensive read path per `engine.md:358`; acceptable latency for CLI use)
   - Return `{ items: SliceState[], total: number }` from derived state
   - **v1 fallback shim:** If no `slice-created` events exist in the replayed event log for the target epic, fall back to reading `overview.json`/`slice.json` (v1 state files) and mapping to `SliceState[]`. TODO: removable after slice 12 completes v1-to-v2 migration.
   - Preserve pagination support

7. **Rewrite `src/commands/slice/show.ts`** to v2 pattern:
   - Read-only: replay epic events, compute derived state for one slice
   - Keep `--slice` (required) and `--epic` (optional, defaults to active epic) args
   - Return `SliceState` from derived state
   - **v1 fallback shim:** Same as `list` -- fall back to `slice.json` when no events exist

8. **Rewrite `src/commands/slice/abandon.ts`** to v2 pattern:
   - Use `createEventCommandContext` helper
   - Append `slice-abandoned` event with `{ sliceRef, reason }` payload
   - Remove dependency on `core/rpc/begin.js`

9. **Rewrite v1 `plan.ts` -> delete** (superseded by `plan-draft` and `plan-commit` in Phase 2)

10. **Rewrite v1 `refine-plan.ts` -> delete** (superseded by `plan-shape-*` in Phase 2)

11. **Rewrite v1 `implement.ts` -> delete** (superseded by `implement-start` in Phase 3)

12. **Rewrite v1 `complete.ts` -> delete** (superseded by `land` in Phase 4)

13. **Delete 7 dead v1 epic command files:**
    - `src/commands/epic/explore.ts`
    - `src/commands/epic/define-architecture.ts`
    - `src/commands/epic/define-slices.ts`
    - `src/commands/epic/refine-architecture.ts`
    - `src/commands/epic/refine-slices.ts`
    - `src/commands/epic/add-verification.ts`
    - `src/commands/epic/update-verification.ts`
    - Remove commented-out import lines from `src/commands/main.ts`
    - **Cross-slice verification:** Before deleting `refine-architecture.ts` and `refine-slices.ts`, confirm slice 07 has no dependency on these files as reference implementations (add "slice 07 confirmed no dependency" note if true, otherwise keep until slice 07 ports).
    - **Orphan reference audit:** After deletion, run `rg -l "epic/(explore|define-architecture|define-slices|refine-architecture|refine-slices|add-verification|update-verification)" src/ tests/` and confirm zero results. Also check subagent files (`src/commands/subagent/start-refine-architecture.ts`, `submit-refine-architecture.ts`, `start-refine-slices.ts`, `submit-refine-slices.ts`) and `src/core/rpc/next-commands.ts:88-155` for orphan string references to deleted command names.
    - **Orphan event check:** Grep for events emitted by deleted files and confirm they are either v2-renamed or not consumed by `DerivedState` reducers.

14. **Update `src/commands/main.ts`**:
    - Remove v1 slice command registrations: `slice:plan`, `slice:refine-plan`, `slice:implement`, `slice:complete`
    - Keep: `slice:create`, `slice:list`, `slice:show`, `slice:abandon` (now v2)
    - Remove commented-out v1 epic imports

15. **Migrate ~20 existing v2 epic commands** to use `createEventCommandContext` from `src/commands/_shared/command-context.ts`, replacing their inline boilerplate. This prevents the refactor from being half-done with dead boilerplate accumulating.

16. **Write unit tests** in `tests/unit/commands/slice/`:
    - `create.test.ts` -- tests event append with correct payload shape (validates through `sliceCreatedPayloadSchema`, output matches `MutatingCommandOutput`)
    - `abandon.test.ts` -- tests event append for abandon (validates through schema, output matches `MutatingCommandOutput`)
    - `list.test.ts` and `show.test.ts` folded into integration test (Task 18) since these are simple read-only commands with no non-trivial logic
    - **v1 fallback shim unit test:** Test that `list`/`show` correctly reads v1 `overview.json`/`slice.json` when no `slice-created` events exist and returns correct `SliceState[]` shape

17. **Write unit test for helper** `tests/unit/commands/_shared/command-context.test.ts`:
    - Tests `createEventCommandContext` with `requireSlice: true` and `requireSlice: false`
    - Tests `handleInvariantError` formatting
    - Tests git info resolution and events path construction

18. **Write integration test** `tests/integration/workflow-slice-management.test.ts`:
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
# Confirm no orphan references:
rg -l "epic/(explore|define-architecture|define-slices|refine-architecture|refine-slices|add-verification|update-verification)" src/ tests/
```

---

## Phase 2: Planning & Shape Commands (6 new commands)

### Objective

Implement the 6 planning and shape-checkpoint commands that replace the v1 `slice:plan` and `slice:refine-plan` with granular v2 events: `plan-draft`, `plan-commit`, `plan-shape-start`, `plan-shape-revise`, `plan-shape-approve`, `plan-shape-auto`. Also integrate ContextBundle output for `plan-draft` (a phase-starting command).

### Expected Behavior

Before:
- No `gp slice:plan-draft` command exists
- Planning was a single `slice:plan` v1 command

After:
- `bun run check` passes
- `bun run test` passes
- Running `gp slice:plan-draft --epic test --slice foo --json` with stdin `{ content: "..." }` emits `slice-plan-drafted` event (domain: `entity-lifecycle`) and stores content as ContentRef. Returns JSON with `contextBundle` field containing inline/references/decisions/learnings for the current phase.
- Running `gp slice:plan-commit --epic test --slice foo --json` with stdin `{ content: "..." }` emits `slice-plan-committed` event (runs extractor on plan content)
- Running `gp slice:plan-shape-start --epic test --slice foo --json` emits `plan-shape-checkpoint-reached` event
- Running `gp slice:plan-shape-revise --epic test --slice foo --json` with stdin `{ plan: ContentRef, revision: string }` emits `plan-shape-revision-proposed` event. `plan` is the full post-revision content (not a diff) stored as ContentRef for replay correctness. `revision` is prose describing what changed.
- Running `gp slice:plan-shape-approve --epic test --slice foo --json` emits `plan-shape-approved` event
- Running `gp slice:plan-shape-auto --epic test --slice foo --json` emits `plan-shape-checkpoint-auto-shaped` event (reads steering preference)
- Each command has invariant guards with explicit rule IDs:
  - `plan-draft`: invariant `slice.created-before-plan` (new rule -- slice must exist)
  - `plan-commit`: invariant `slice.plan-drafted-before-commit` (new rule -- plan-drafted or plan-shape-approved must exist)
  - `plan-shape-start`: invariant `slice.plan-drafted-before-shape` (new rule -- plan must be drafted)
  - `plan-shape-revise`: invariant `slice.plan-shape-checkpoint-active` (new rule -- checkpoint started but not yet approved/auto-shaped)
  - `plan-shape-approve`: invariant `slice.plan-shape-checkpoint-active` (same rule)
  - `plan-shape-auto`: invariant `slice.plan-shape-checkpoint-active` (same rule) + steering must allow auto
- **Dead rule cleanup:** Delete or retarget the existing `slice.plan-shape-approval-required` rule in `src/engine/invariants/rules/slice.ts:63` which guards `slice-plan-refinement-started` (an event this plan never introduces). Decision: retarget it to guard `slice-plan-committed`, requiring prior `plan-shape-approved` or `plan-shape-checkpoint-auto-shaped`.
- Integration test demonstrates: create -> plan-draft -> plan-shape-start -> plan-shape-approve -> plan-commit flow

### Tasks

1. **Add plan event payload schemas to `src/schemas/events/slice.ts`:**
   - All schemas include `sliceRef: z.string().min(1)` per scope invariant
   - All schemas use `domain: 'entity-lifecycle'`
   - `slicePlanDraftedPayloadSchema` -- `{ sliceRef, plan: ContentRefSchema }`
   - `slicePlanCommittedPayloadSchema` -- `{ sliceRef, plan: ContentRefSchema, extract: PlanExtractSchema }`
   - `planShapeCheckpointReachedPayloadSchema` -- `{ sliceRef, plan: ContentRefSchema }`
   - `planShapeRevisionProposedPayloadSchema` -- `{ sliceRef, plan: ContentRefSchema, revision: z.string().min(1) }` (plan is full post-revision content as ContentRef for replay correctness; revision is prose describing what changed)
   - `planShapeApprovedPayloadSchema` -- `{ sliceRef }`
   - `planShapeCheckpointAutoShapedPayloadSchema` -- `{ sliceRef, preference: SteeringPreferenceSchema }` (field name `preference` matches `epic.ts:82-87` pattern, import from `src/schemas/entities/derived-state.js`)
   - Update `SliceEventMap` and re-export from `index.ts`
   - **Barrel re-export:** Schema constants in `export { }`, `*Payload` types in `export type { }` per `verbatimModuleSyntax`

2. **Add new invariant rules to `src/engine/invariants/rules/slice.ts`:**
   - `slice.plan-shape-checkpoint-active` (new rule): guards `plan-shape-revise`, `plan-shape-approve`, `plan-shape-auto` -- checkpoint must be started (reads `derivedState.epics.get(scopeRef)?.slices.get(sliceRef)?.shapeCheckpointActive`) but not yet approved/auto-shaped
   - Register all new rules in `core-rules.ts`
   - **Retarget** existing `slice.plan-shape-approval-required` to guard `slice-plan-committed`, requiring prior `plan-shape-approved` or `plan-shape-checkpoint-auto-shaped` for the same `sliceRef`

3. **Create `src/commands/slice/plan-draft.ts`:**
   - Accepts `--epic` + `--slice` + stdin `{ content }`
   - **Blob write precedes append:** Store content via `storeContentRef` first, then emit `slice-plan-drafted`. On append failure, loose blob is harmless (gc-able at next milestone).
   - Uses `createEventCommandContext<{ requireSlice: true }>` helper
   - **ContextBundle integration:** After successful append, call `buildSliceContextBundle(events, phase, epicName, sliceRef)` (adapt pattern from `src/commands/epic/context-helper.ts` `buildEpicContextBundle`). Include `contextBundle` field in JSON output.
   - Pattern: mirrors `epic:goal-draft`

4. **Create `src/commands/slice/plan-commit.ts`:**
   - Accepts `--epic` + `--slice` + stdin `{ content }`
   - Runs plan extractor on content, stores ContentRef, emits `slice-plan-committed`
   - Invariant: `slice.plan-drafted-before-commit` -- plan must be drafted (or shaped) first, for this `sliceRef`
   - Pattern: mirrors `epic:goal-commit`

5. **Create `src/commands/slice/plan-shape-start.ts`:**
   - Accepts `--epic` + `--slice`
   - Emits `plan-shape-checkpoint-reached`
   - Invariant: `slice.plan-drafted-before-shape` -- plan must be drafted, for this `sliceRef`
   - Pattern: mirrors `epic:architecture-shape-start`

6. **Create `src/commands/slice/plan-shape-revise.ts`:**
   - Accepts `--epic` + `--slice` + stdin `{ content, revision }`
   - Stores full post-revision content as ContentRef, emits `plan-shape-revision-proposed`
   - Invariant: `slice.plan-shape-checkpoint-active` -- shape checkpoint started but not yet approved, for this `sliceRef`

7. **Create `src/commands/slice/plan-shape-approve.ts`:**
   - Accepts `--epic` + `--slice`
   - Emits `plan-shape-approved`
   - Invariant: `slice.plan-shape-checkpoint-active`, for this `sliceRef`
   - Pattern: mirrors `epic:architecture-shape-approve`

8. **Create `src/commands/slice/plan-shape-auto.ts`:**
   - Accepts `--epic` + `--slice`
   - Reads steering preference from epic or project level
   - Emits `plan-shape-checkpoint-auto-shaped` with payload `{ sliceRef, preference }` (using `preference` field name matching epic pattern)
   - Invariant: `slice.plan-shape-checkpoint-active` + steering must allow auto, for this `sliceRef`
   - Pattern: mirrors `epic:architecture-shape-auto`

9. **Register all 6 commands in `src/commands/main.ts`:**
   - `"slice:plan-draft"`, `"slice:plan-commit"`, `"slice:plan-shape-start"`, `"slice:plan-shape-revise"`, `"slice:plan-shape-approve"`, `"slice:plan-shape-auto"`

10. **Write unit tests** in `tests/unit/commands/slice/`:
    - `plan-commit.test.ts` -- tests extractor logic, validates payload through `slicePlanCommittedPayloadSchema`, output matches `MutatingCommandOutput`
    - `plan-shape-auto.test.ts` -- tests steering preference read logic
    - Simple append commands (`plan-draft`, `plan-shape-start`, `plan-shape-revise`, `plan-shape-approve`) folded into integration test since they have no non-trivial logic beyond the append

11. **Write integration test** `tests/integration/workflow-slice-planning.test.ts`:
    - Full flow: init -> epic:create -> epic:activate -> slice:create -> slice:plan-draft -> slice:plan-shape-start -> slice:plan-shape-approve -> slice:plan-commit
    - Verify events in events.jsonl at each step
    - Verify invariant failures: e.g., plan-commit before plan-draft should fail with `INVARIANT_FAILED`
    - Verify `plan-draft` JSON output includes `contextBundle` field

### Verification

```bash
bun run check
bun run test
```

---

## Phase 3: Implementation & Chunk Commands (8 new commands)

### Objective

Implement the 8 implementation and chunk lifecycle commands: `implement-start`, `chunk-start`, `chunk-red-written`, `chunk-red-failed`, `chunk-green`, `chunk-verify`, `chunk-unverifiable`, `chunk-decide`. These represent the TDD-driven implementation cycle within a slice. Also rewrite existing invariant rules (`chunk.ts`, `slice.ts`) to match the new event names and add proper scoping.

### Expected Behavior

Before:
- No chunk lifecycle commands exist
- Implementation was a single v1 `slice:implement` command
- `src/engine/invariants/rules/chunk.ts:54` guards `chunk-green-test-passed` (wrong name)
- `src/engine/invariants/rules/slice.ts:148` references `chunk-started`, `chunk-verified`, `chunk-skipped` (dead names)

After:
- `bun run check` passes
- `bun run test` passes
- Running `gp slice:implement-start --epic test --slice foo --json` emits `slice-implementation-started` event. Returns JSON with `contextBundle` field.
  - Invariant: `slice.plan-converged-before-implement` -- reads `derivedState.epics.get(scopeRef)?.slices.get(sliceRef)?.plan` is non-null (plan-committed event exists for this `sliceRef`)
- Running `gp slice:chunk-start --epic test --slice foo --chunk chunk-1 --json` emits `slice-implementation-chunk-started`
  - Invariant: `slice.implementation-started-before-chunk` -- reads `derivedState.epics.get(scopeRef)?.slices.get(sliceRef)?.phase` is at or past implementation, for this `sliceRef`
- Running `gp slice:chunk-red-written --epic test --slice foo --chunk chunk-1 --json` with stdin `{ testRef }` emits `chunk-red-test-written`
  - Invariant: chunk must be started -- reads `derivedState.epics.get(scopeRef)?.slices.get(sliceRef)?.chunks.get(chunkId)?.started === true` for this `sliceRef` and `chunkId`, not already verified/decided
- Running `gp slice:chunk-red-failed --epic test --slice foo --chunk chunk-1 --json` with stdin `{ evidence }` emits `chunk-red-test-failed`
  - Invariant: red test must be written -- reads `derivedState...chunks.get(chunkId)?.redWritten === true` for this `sliceRef` and `chunkId`
- Running `gp slice:chunk-green --epic test --slice foo --chunk chunk-1 --json` with stdin `{ evidence }` emits `chunk-green-achieved`
  - Invariant: `chunk.red-test-failed-before-green` -- reads `derivedState...chunks.get(chunkId)?.redFailed === true` for this `sliceRef` and `chunkId`. Must filter event history by matching `sliceRef` AND `chunkId` -- a red-fail on chunk-A must NOT satisfy the invariant for chunk-B.
- Running `gp slice:chunk-verify --epic test --slice foo --chunk chunk-1 --json` with stdin `{ evidence }` emits `chunk-verified`
  - Invariant: `chunk.evidence-non-empty` -- evidence must be non-empty, green must be achieved for this `sliceRef` and `chunkId`
- Running `gp slice:chunk-unverifiable --epic test --slice foo --chunk chunk-1 --json` with stdin `{ reason }` emits `chunk-unverifiable`
  - Alternative to chunk-verify when verification is not possible
- Running `gp slice:chunk-decide --epic test --slice foo --chunk chunk-1 --json` with stdin `{ decision, reason }` emits `chunk-unverifiable-decided`
  - Invariant: chunk must be in unverifiable state for this `sliceRef` and `chunkId`
- `chunk.ts:54` rewritten to match on `chunk-green-achieved` (not `chunk-green-test-passed`)
- `slice.ts:148` rewritten with new event names (`slice-implementation-chunk-started`, `chunk-verified`, `chunk-unverifiable-decided`)
- Integration test demonstrates full chunk TDD cycle: start -> red-written -> red-failed -> green -> verify

### Tasks

1. **Add chunk event payload schemas to `src/schemas/events/slice.ts`:**
   - Define shared `SliceChunkRefSchema = z.object({ sliceRef: z.string().min(1), chunkId: z.string().min(1) })` used by all chunk payloads to prevent drift across 8 schemas
   - All schemas use `domain: 'entity-lifecycle'`
   - `sliceImplementationStartedPayloadSchema` -- `{ sliceRef: z.string().min(1) }`
   - `chunkStartedPayloadSchema` -- `{ ...SliceChunkRefSchema.shape, description: z.string().min(1) }` (description is required, matching command stdin `{ description }`)
   - `chunkRedTestWrittenPayloadSchema` -- `{ ...SliceChunkRefSchema.shape, testRef: ContentRefSchema }`
   - `chunkRedTestFailedPayloadSchema` -- `{ ...SliceChunkRefSchema.shape, evidence: z.string().min(1) }`
   - `chunkGreenAchievedPayloadSchema` -- `{ ...SliceChunkRefSchema.shape, evidence: z.string().min(1) }`
   - `chunkVerifiedPayloadSchema` -- `{ ...SliceChunkRefSchema.shape, evidence: z.string().min(1) }`
   - `chunkUnverifiablePayloadSchema` -- `{ ...SliceChunkRefSchema.shape, reason: z.string().min(1) }`
   - `chunkUnverifiableDecidedPayloadSchema` -- `{ ...SliceChunkRefSchema.shape, decision: z.enum(["accept", "revert", "defer"]), reason: z.string().min(1) }`
   - Update `SliceEventMap`
   - **Barrel re-export:** Schema constants in `export { }`, `*Payload` types in `export type { }`

2. **Rewrite `src/engine/invariants/rules/chunk.ts:54`** to match `chunk-green-achieved` instead of `chunk-green-test-passed`:
   - **Write the negative test first** (test-as-spec per `conventions.md:86`): test that emitting `chunk-green-achieved` WITHOUT a prior `chunk-red-test-failed` for the same `sliceRef` and `chunkId` triggers `INVARIANT_FAILED`
   - Rule must filter event history by both `sliceRef` AND `chunkId` from the envelope payload -- a red-fail on chunk-A must not satisfy the invariant for chunk-B green
   - Add positive test: red-fail on same (sliceRef, chunkId) then green succeeds
   - Add cross-boundary test: red-fail on (slice-a, chunk-1) does NOT satisfy green on (slice-b, chunk-1) or (slice-a, chunk-2)

3. **Rewrite `src/engine/invariants/rules/slice.ts:148`** (`chunks-all-decided-before-code-refine`):
   - Update from dead event names (`chunk-started`, `chunk-verified`, `chunk-skipped`) to new names: `slice-implementation-chunk-started`, `chunk-verified`, `chunk-unverifiable-decided`
   - **Semantic decision:** A chunk counts as "decided" if it has EITHER a `chunk-verified` OR a `chunk-unverifiable-decided` event for that (sliceRef, chunkId). `chunk-unverifiable` alone does NOT count -- the follow-up `chunk-unverifiable-decided` is required. Document this in the rule comment.
   - Must filter by `sliceRef` to avoid cross-slice contamination
   - Write negative test: chunk in `unverifiable` state (no `decided` follow-up) blocks `code-refine-start`

4. **Create `src/commands/slice/implement-start.ts`:**
   - Accepts `--epic` + `--slice`
   - Emits `slice-implementation-started`
   - Invariant: `slice.plan-converged-before-implement` -- plan must be committed, reads derived state for this `sliceRef`
   - **ContextBundle integration:** After successful append, include `contextBundle` in JSON output (adapt `buildEpicContextBundle` pattern for slice scope)

5. **Create `src/commands/slice/chunk-start.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ description }`
   - Emits `slice-implementation-chunk-started` with payload `{ sliceRef, chunkId, description }`
   - Invariant: implementation must be started for this `sliceRef`

6. **Create `src/commands/slice/chunk-red-written.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ testRef }`
   - Emits `chunk-red-test-written`
   - Invariant: chunk must be started for this (sliceRef, chunkId), not already verified/decided

7. **Create `src/commands/slice/chunk-red-failed.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ evidence }`
   - Emits `chunk-red-test-failed`
   - Invariant: red test must be written -- reads `derivedState...chunks.get(chunkId)?.redWritten === true` for this (sliceRef, chunkId)

8. **Create `src/commands/slice/chunk-green.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ evidence }`
   - Emits `chunk-green-achieved`
   - Invariant: `chunk.red-test-failed-before-green` -- reads `derivedState...chunks.get(chunkId)?.redFailed === true` for this (sliceRef, chunkId)

9. **Create `src/commands/slice/chunk-verify.ts`:**
   - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ evidence }`
   - Emits `chunk-verified`
   - Invariant: `chunk.evidence-non-empty` -- evidence must be non-empty, green must be achieved for this (sliceRef, chunkId)

10. **Create `src/commands/slice/chunk-unverifiable.ts`:**
    - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ reason }`
    - Emits `chunk-unverifiable`
    - Alternative path: after green, when verification is not feasible

11. **Create `src/commands/slice/chunk-decide.ts`:**
    - Accepts `--epic` + `--slice` + `--chunk` + stdin `{ decision, reason }`
    - Emits `chunk-unverifiable-decided` with `decision: z.enum(["accept", "revert", "defer"])`
    - Invariant: chunk must be in unverifiable state for this (sliceRef, chunkId)

12. **Register all 8 commands in `src/commands/main.ts`:**
    - `"slice:implement-start"`, `"slice:chunk-start"`, `"slice:chunk-red-written"`, `"slice:chunk-red-failed"`, `"slice:chunk-green"`, `"slice:chunk-verify"`, `"slice:chunk-unverifiable"`, `"slice:chunk-decide"`

13. **Chunk reducer note:** The reducer handling 8 chunk events must handle `SliceState.chunks.get(chunkId)` returning `ChunkState | undefined` under `noUncheckedIndexedAccess`. Do not use `!` or `as ChunkState` -- initialize the chunk state on first access if missing.

14. **Write unit tests** in `tests/unit/commands/slice/`:
    - `chunk-green.test.ts` -- tests TDD invariant edge cases (cross-chunk boundary, cross-slice boundary)
    - `chunk-decide.test.ts` -- tests enum validation for `decision` field
    - Simple append commands (`implement-start`, `chunk-start`, `chunk-red-written`, `chunk-red-failed`, `chunk-verify`, `chunk-unverifiable`) covered by integration test
    - Each unit test should verify: (a) stdin validates through schema, (b) output matches `MutatingCommandOutput`, (c) emitted payload re-parses through matching `*PayloadSchema`

15. **Write integration test** `tests/integration/workflow-slice-chunks.test.ts`:
    - Full TDD chunk cycle: init -> epic:create -> activate -> slice:create -> plan-draft -> plan-shape-start -> plan-shape-approve -> plan-commit -> implement-start -> chunk-start -> red-written -> red-failed -> green -> verify
    - Also test the unverifiable path: chunk-start -> red-written -> red-failed -> green -> unverifiable -> decide
    - Verify invariant ordering: red-failed before green fails without red-written, etc.
    - Verify `implement-start` JSON output includes `contextBundle` field

### Verification

```bash
bun run check
bun run test
```

---

## Phase 4: Code Refinement + Landing (3 new commands)

### Objective

Implement the 3 final slice lifecycle commands: `code-refine-start`, `code-refine-commit`, and `land`. These complete the slice lifecycle from implementation through landing. Also integrate ContextBundle output for `code-refine-start` (a phase-starting command).

**`land` scope decision (SPLIT):** `land.ts` emits only the `slice-landed` event with inline `deferred`/`learnings`/`architectureDelta` payload fields. It does NOT route deferred items or invoke learnings rollup -- that is skill-level composition (the skill calls `task:create` / `learning:capture` per deferred item after `slice:land`, and invokes `learning:rollup` via existing `src/commands/learning/rollup.ts`). Architecture delta is stored in the event payload for downstream replay by `epic:complete`.

### Expected Behavior

Before:
- No code refinement or landing commands exist
- Slice completion was via v1 `slice:complete`

After:
- `bun run check` passes
- `bun run test` passes
- Running `gp slice:code-refine-start --epic test --slice foo --json` emits `slice-code-refinement-started`. Returns JSON with `contextBundle` field.
  - Invariant: `slice.chunks-all-decided-before-code-refine` -- all chunks for this `sliceRef` must be verified or decided (reads `derivedState...slices.get(sliceRef)?.chunks` and checks each chunk has `chunk-verified` or `chunk-unverifiable-decided`)
- Running `gp slice:code-refine-commit --epic test --slice foo --json` emits `code-refinement-converged`
  - Invariant: `slice.code-refinement-started-before-converged` -- code refinement must be started for this `sliceRef`
- Running `gp slice:land --epic test --slice foo --json` with stdin `{ deferred?, learnings?, architectureDelta? }` emits `slice-landed` with the full payload
  - Invariant: `slice.code-refinement-converged-before-land` -- code refinement must be converged for this `sliceRef`
  - `land.ts` ONLY emits the event -- deferred-item routing (creating tasks/slices) and learnings rollup are skill-level composition, not this command's responsibility
  - Architecture delta is stored in the event payload for downstream `epic:complete` to replay
- Integration test covers: code-refine-start -> code-refine-commit -> land
- Integration test verifies `slice-landed` event payload shape (deferred items, learnings, architectureDelta present when provided)

### Tasks

1. **Add code refinement and landing payload schemas to `src/schemas/events/slice.ts`:**
   - `sliceCodeRefinementStartedPayloadSchema` -- `{ sliceRef: z.string().min(1) }`
   - `codeRefinementConvergedPayloadSchema` -- `{ sliceRef: z.string().min(1) }`
   - Define `DeferredItemSchema` in `src/schemas/entities/slice-artifacts.ts`:
     ```
     z.object({ type: z.enum(["task", "slice", "side-quest"]), title: z.string().min(1), description: z.string().optional(), epic: z.string().optional() })
     ```
   - Define `ArchitectureDeltaSchema` in `src/schemas/entities/slice-artifacts.ts`:
     ```
     z.object({ subsystem: z.string().min(1), change: z.string().min(1), reason: z.string().optional() })
     ```
   - Import `learningInputSchema` from `src/schemas/records/learning.ts` (type is `LearningInput`, NOT `Learning` or `LearningEntry` -- those are post-RPC-mapping types)
   - `sliceLandedPayloadSchema`:
     ```
     z.object({
       sliceRef: z.string().min(1),
       ...conditionally spread deferred/learnings/architectureDelta using conditional-spread pattern per project_zod_optional_properties.md:
       deferred: z.array(DeferredItemSchema).optional(),
       learnings: z.array(learningInputSchema).optional(),
       architectureDelta: z.array(ArchitectureDeltaSchema).optional(),
     })
     ```
     **exactOptionalPropertyTypes hazard:** At call sites, use conditional spread `...(deferred ? { deferred } : {})` rather than direct assignment to avoid `T[] | undefined` not-assignable-to-optional-property errors.
   - Final update to `SliceEventMap` with all slice event types

2. **Create `src/commands/slice/code-refine-start.ts`:**
   - Accepts `--epic` + `--slice`
   - Emits `slice-code-refinement-started`
   - Invariant: `slice.chunks-all-decided-before-code-refine` -- all chunks for this `sliceRef` verified or decided (reads derived state, filters by `sliceRef`)
   - **ContextBundle integration:** After successful append, include `contextBundle` in JSON output

3. **Create `src/commands/slice/code-refine-commit.ts`:**
   - Accepts `--epic` + `--slice`
   - Emits `code-refinement-converged`
   - Invariant: code refinement must be started for this `sliceRef`

4. **Create `src/commands/slice/land.ts`:**
   - Accepts `--epic` + `--slice` + optional stdin `{ deferred?, learnings?, architectureDelta? }`
   - Emits `slice-landed` with the full payload (deferred items, learnings, architecture delta stored inline in the event)
   - Invariant: `slice.code-refinement-converged-before-land` -- code refinement must be converged for this `sliceRef`
   - **This command does NOT route deferred items or invoke learnings rollup.** Those are skill-level composition: after `slice:land`, the orchestrating skill calls `task:create` / `learning:capture` per deferred item, and `learning:rollup` via `src/commands/learning/rollup.ts`. This keeps `land.ts` compliant with `conventions.md:57` ("mutating commands emit exactly one primary event").
   - **Note on types:** Use `LearningInput[]` (from `src/schemas/records/learning.ts`), not `Learning[]` or `LearningEntry[]`. `DeferredItem` and `ArchitectureDelta` are new types defined in Task 1. These are transitional schemas -- may be refined in slice 07 as v1 coupling is fully removed.

5. **Register all 3 commands in `src/commands/main.ts`:**
   - `"slice:code-refine-start"`, `"slice:code-refine-commit"`, `"slice:land"`

6. **Write unit tests** in `tests/unit/commands/slice/`:
   - `land.test.ts` -- tests payload schema validation (deferred items, learnings, architectureDelta), verifies conditional-spread pattern works under `exactOptionalPropertyTypes`, validates emitted payload re-parses through `sliceLandedPayloadSchema`
   - `code-refine-start.test.ts` and `code-refine-commit.test.ts` folded into integration test (simple append commands)

7. **Write integration test** `tests/integration/workflow-slice-completion.test.ts`:
   - Build on previous phases: after chunk verification, run code-refine-start -> code-refine-commit -> land
   - Verify `slice-landed` event payload contains deferred items and learnings when provided in stdin
   - Verify `slice-landed` event payload `sliceRef` matches the slice
   - Verify invariant failures: land before code-refine-commit fails
   - Verify `code-refine-start` JSON output includes `contextBundle` field

### Verification

```bash
bun run check
bun run test
```

---

## Phase 5: Full Lifecycle Integration Test + Fitness

### Objective

Write a comprehensive end-to-end integration test that exercises the entire slice lifecycle from creation through landing, proving the complete invariant chain works correctly. Verify full command registration, add fitness tests for invariant engine changes, and update `goal.md` to match the architecture doc.

### Expected Behavior

Before:
- Individual phase integration tests exist but no single test covers the full lifecycle
- `goal.md` describes old chunk model contradicting architecture doc

After:
- `bun run check` passes
- `bun run test` passes
- A single integration test exercises the complete lifecycle:
  `init -> epic:create -> epic:activate -> slice:create -> plan-draft -> plan-shape-start -> plan-shape-approve -> plan-commit -> implement-start -> chunk-start -> chunk-red-written -> chunk-red-failed -> chunk-green -> chunk-verify -> code-refine-start -> code-refine-commit -> land`
- The test verifies event log integrity at the end (events.jsonl contains all expected events in order)
- The test verifies derived state reflects "landed" status for the slice
- Negative tests verify key invariant violations (e.g., trying to land before code refinement converges)
- `goal.md` rewritten to match the TDD chunk model from `architecture/commands.md`

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

3. **Create `tests/fitness/command-registration.test.ts`** -- verify command registration completeness:
   - Assert that `gp schema --json` (or `--help`) lists all 21 slice commands by name:
     `slice:create`, `slice:list`, `slice:show`, `slice:abandon`, `slice:plan-draft`, `slice:plan-commit`, `slice:plan-shape-start`, `slice:plan-shape-revise`, `slice:plan-shape-approve`, `slice:plan-shape-auto`, `slice:implement-start`, `slice:chunk-start`, `slice:chunk-red-written`, `slice:chunk-red-failed`, `slice:chunk-green`, `slice:chunk-verify`, `slice:chunk-unverifiable`, `slice:chunk-decide`, `slice:code-refine-start`, `slice:code-refine-commit`, `slice:land`

4. **Create `tests/fitness/invariant-engine-slice.test.ts`** -- fitness tests for invariant rule changes:
   - Verify `chunk.red-test-failed-before-green` fires on `chunk-green-achieved` (not dead `chunk-green-test-passed`)
   - Verify `slice.chunks-all-decided-before-code-refine` uses new event names
   - Verify all invariant rules registered in `core-rules.ts` have corresponding test coverage

5. **Rewrite `goal.md`** to match the TDD chunk model from `architecture/commands.md`:
   - Update command count from "~14" / "~24" to "21 (19 mutating + 2 read-only)"
   - Replace old chunk model (`chunk-complete`, `chunk-fail`, `chunk-skip`, `chunk-list`, `chunk-show`) with TDD model (`chunk-start`, `chunk-red-written`, `chunk-red-failed`, `chunk-green`, `chunk-verify`, `chunk-unverifiable`, `chunk-decide`)
   - Note ContextBundle integration for phase-starting commands

6. **Accept naming asymmetry:** `code-refinement-converged` and `chunk-*` events do not use the `slice-` prefix unlike other slice events. This matches `architecture/commands.md` and is accepted as-is. Flag as a potential follow-up naming cleanup but not blocking this slice.

7. **Run full verification suite:**

### Verification

```bash
bun run build
bun run check   # lint + types
bun run test     # all tests: unit + integration + fitness
# Spot check built binary:
./dist/gp-plugin/binaries/macos-arm64/gp slice:create --help
./dist/gp-plugin/binaries/macos-arm64/gp slice:plan-draft --help
./dist/gp-plugin/binaries/macos-arm64/gp slice:chunk-start --help
./dist/gp-plugin/binaries/macos-arm64/gp slice:land --help
```
