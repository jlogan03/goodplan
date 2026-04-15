# Implementation Plan: Slice Gap Closure (04, 07b, 08)

## Goal

Close implementation gaps between what slices 04, 07b, and 08 specified vs what was actually built. The largest gap is the `refine:*` command surface (8 commands + 7 event types) that gives the trust layer's convergence evaluator a CLI interface. Secondary gaps include `decision:record`, `decision:supersede`, `learning:capture`, `learning:promote`, `side-quest:*` commands (12), integration tests, and an Agent SDK harness test.

## Scope Boundaries

**In scope:** `refine:*` commands (8), `decision:record` + `decision:supersede` + `learning:capture` + `learning:promote` (4), `side-quest:*` commands (12), integration tests, Agent SDK harness test.

**Not in scope:** Side-quest SKILLS (slice 11), plan-slice skill updates to USE `refine:*` (slice 10), migration (slice 12). The `finding:show`, `briefing:list`, `briefing:generate`, `invariant:show` commands are aliases/variants that can be addressed as follow-ups.

---

## Phase 1: Refinement Event Schemas + Reducer

### Objective

Create the 7 missing refinement event payload schemas in `src/schemas/events/refinement.ts` and implement the `reduceRefinement` reducer (currently a stub in `src/engine/derived-state/reducers.ts` at line 578) to update `DerivedStateData.convergenceSnapshots` and `latestDimensionScores`.

### Expected Behavior

**RED (before):**
- No file exists at `src/schemas/events/refinement.ts`
- `reduceRefinement` in `src/engine/derived-state/reducers.ts` is a no-op stub (line 578-581)
- `src/schemas/events/index.ts` does not export any refinement event types

**GREEN (after):**
- `src/schemas/events/refinement.ts` defines Zod schemas for all 7 event types
- `src/schemas/events/index.ts` barrel-exports all refinement schemas and types
- `reduceRefinement` processes all 7 event types, updating `convergenceSnapshots` and `latestDimensionScores` on `DerivedStateData`
- `bun run check` passes (typecheck + lint)
- Unit test for reducer covers each event type

### Tasks

1. **Create `src/schemas/events/refinement.ts`** with payload schemas for all 7 event types:
   - `refinementRoundStartedPayloadSchema` -- `{ artifactType: string, scopeRef: string, round: number }`
   - `reviewerScoredPayloadSchema` -- `{ artifactType: string, scopeRef: string, round: number, reviewerId: string, dimensions: DimensionResult[], findings: ReviewerFinding[] }` (reuse `dimensionResultSchema`, `reviewerFindingSchema` from `src/schemas/trust/reviewer-payload.ts`)
   - `refinementSynthesizedPayloadSchema` -- `{ artifactType: string, scopeRef: string, round: number, synthesis: ContentRef }`
   - `artifactRevisedPayloadSchema` -- `{ artifactType: string, scopeRef: string, round: number, artifact: ContentRef }`
   - `refinementConvergedPayloadSchema` -- `{ artifactType: string, scopeRef: string, round: number, convergenceResult: ConvergenceResult }` (reuse `convergenceResultSchema` from `src/schemas/trust/convergence.ts`)
   - `refinementCircuitBreakerTrippedPayloadSchema` -- `{ artifactType: string, scopeRef: string, round: number, reason: CircuitBreakerReason }` (reuse `circuitBreakerReasonSchema`)
   - `convergenceOverriddenPayloadSchema` -- `{ artifactType: string, scopeRef: string, round: number, reason: string }`
   - Export `RefinementEventMap` mapping event type strings to payload schemas (follow pattern from `epic.ts`, `slice.ts`)

2. **Update `src/schemas/events/index.ts`** -- add barrel exports for all refinement schemas and types.

3. **Implement `reduceRefinement` in `src/engine/derived-state/reducers.ts`** (replace the stub at line 578):
   - `refinement-round-started` -- initialize or reset convergence snapshot for `${scopeRef}:${artifactType}` key in `state.convergenceSnapshots`
   - `reviewer-scored` -- update `state.latestDimensionScores` map, push dimension scores into snapshot
   - `refinement-synthesized` -- record synthesis ref on snapshot
   - `artifact-revised` -- record revised artifact ref on snapshot
   - `refinement-converged` -- set convergence state to `CONVERGED` on snapshot
   - `refinement-circuit-breaker-tripped` -- set convergence state to `CIRCUIT-BROKEN` with reason
   - `convergence-overridden` -- set convergence state to `CONVERGED` with override flag. **Note:** The reducer must add an `overridden: boolean` field to `ConvergenceSnapshot` in `src/schemas/entities/derived-state.ts` so downstream consumers can distinguish organic convergence from user overrides.

4. **Update `DEFAULT_PLAN_CONFIG` and `DEFAULT_ARCHITECTURE_CONFIG` in `src/trust/convergence/types.ts`** to include the `disagreementThreshold` field required by the `ConvergenceConfig` schema (defined in `src/schemas/trust/convergence.ts`). Add `disagreementThreshold: 3` to both configs. Without this, `refine:evaluate` and `refine:converge` will fail to compile because the config objects don't satisfy the schema.

5. **Verify `DerivedStateData` interface** in `src/schemas/entities/derived-state.ts` already has `convergenceSnapshots` and `latestDimensionScores` Maps. If not, add them.

6. **Write unit test** `tests/unit/reducers/refinement.test.ts` -- test each event type against initial state, verify Map entries are created/updated correctly.

### Verification

- `bun run check` passes
- `bun run test -- tests/unit/reducers/refinement.test.ts` passes
- Import `RefinementEventMap` from the barrel -- no type errors

---

## Phase 2: `refine:*` Commands (8 commands)

### Objective

Implement all 8 `refine:*` CLI commands following the v2 event command pattern (appendEvent to scope's events.jsonl with invariant checking). These give the existing trust layer convergence evaluator and circuit breaker a proper CLI surface.

### Expected Behavior

**RED (before):**
- `gp refine:start --help` fails (command not registered)
- No files exist under `src/commands/refine/`

**GREEN (after):**
- All 8 commands registered in `src/commands/main.ts`
- Each mutating command appends its event type to the correct scope's `events.jsonl`
- `gp refine:start --epic <name> --artifact-type plan --json` returns `{ ok: true, event: "<uuid>", entity: "..." }`
- `gp refine:evaluate --epic <name> --artifact-type plan --json` returns `ConvergenceResult` (read-only, no event emitted)
- `gp refine:override --epic <name> --artifact-type plan --reason "user override" --json` emits `convergence-overridden` event
- `bun run check` passes

### Tasks

1. **Create shared context helper** `src/commands/refine/_shared.ts`:
   - Helper to resolve scope (epic or side-quest) from `--epic` or `--side-quest` args
   - Resolve events path: `--epic` -> `.goodplan/epics/<name>/events.jsonl`, `--side-quest` -> `.goodplan/side-quests/<name>/events.jsonl`
   - Common args definition: `--epic`, `--side-quest` (mutually exclusive), `--artifact-type` (required string)
   - Helper to auto-detect current round from latest `refinement-round-started` event in the scope's event log
   - Wire up invariant engine via `createBeforeAppendHook` (same pattern as `createEventCommandContext` in `src/commands/_shared/command-context.ts`)

2. **Create `src/commands/refine/start.ts`** -- `gp refine:start`:
   - Args: `--epic <name>` | `--side-quest <name>`, `--artifact-type <type>`
   - Auto-increments round number from latest `refinement-round-started` event in scope
   - Emits `refinement-round-started` with domain `"refinement"`, scope and scopeRef from the target
   - Returns `MutatingCommandOutput`

3. **Create `src/commands/refine/score.ts`** -- `gp refine:score`:
   - Args: `--epic <name>` | `--side-quest <name>`, `--artifact-type <type>`, `--reviewer <id>`
   - Stdin: `{ dimensions: DimensionResult[], findings: ReviewerFinding[] }`
   - Auto-detects current round from latest `refinement-round-started`
   - Emits `reviewer-scored` with domain `"refinement"`

4. **Create `src/commands/refine/synthesize.ts`** -- `gp refine:synthesize`:
   - Args: `--epic <name>` | `--side-quest <name>`, `--artifact-type <type>`
   - Stdin: `{ synthesis: ContentRef }`
   - Auto-detects current round
   - Emits `refinement-synthesized`

5. **Create `src/commands/refine/revise.ts`** -- `gp refine:revise`:
   - Args: `--epic <name>` | `--side-quest <name>`, `--artifact-type <type>`
   - Stdin: `{ artifact: ContentRef }`
   - Auto-detects current round
   - Emits `artifact-revised`

6. **Create `src/commands/refine/evaluate.ts`** -- `gp refine:evaluate`:
   - **Read-only** (no event emitted)
   - Replays scope events, collects all `reviewer-scored` for current round, calls `evaluateConvergence()` from `src/trust/convergence/evaluator.ts` and `checkCircuitBreaker()` from `src/trust/convergence/circuit-breaker.ts`
   - Returns `ConvergenceResult` (existing schema from `src/schemas/trust/convergence.ts`)
   - Also returns circuit breaker check result as a separate field

7. **Create `src/commands/refine/converge.ts`** -- `gp refine:converge`:
   - Args: `--epic <name>` | `--side-quest <name>`, `--artifact-type <type>`
   - Runs `evaluateConvergence()` internally to populate the convergence result
   - Emits `refinement-converged` with convergence result in payload

8. **Create `src/commands/refine/stuck.ts`** -- `gp refine:stuck`:
   - Args: `--epic <name>` | `--side-quest <name>`, `--artifact-type <type>`
   - Calls `checkCircuitBreaker()` to get reason
   - If circuit breaker condition found, emits `refinement-circuit-breaker-tripped` with the detected reason
   - If no automatic condition found, accepts explicit reason via `--reason <text>` or stdin

9. **Create `src/commands/refine/override.ts`** -- `gp refine:override`:
   - Args: `--epic <name>` | `--side-quest <name>`, `--artifact-type <type>`, `--reason <reason>` (required)
   - Emits `convergence-overridden` with the reason string

10. **Register all 8 commands in `src/commands/main.ts`** under keys: `refine:start`, `refine:score`, `refine:synthesize`, `refine:revise`, `refine:evaluate`, `refine:converge`, `refine:stuck`, `refine:override`.

### Verification

- `bun run check` passes
- `gp refine:start --help` shows correct args/description
- `bun run build` succeeds

---

## Phase 3: `decision:record`, `decision:supersede`, `learning:capture`, `learning:promote`, `side-quest:*`

### Objective

Implement the remaining missing commands: `decision:record` + `decision:supersede` (2), `learning:capture` + `learning:promote` (2), and the 12 `side-quest:*` commands. Add missing event schemas and update reducers where needed.

### Expected Behavior

**RED (before):**
- `gp decision:record --help` fails
- `gp decision:supersede --help` fails
- `gp learning:capture --help` fails
- `gp learning:promote --help` fails
- `gp side-quest:create --help` fails
- No side-quest event schemas exist in `src/schemas/events/`

**GREEN (after):**
- All commands registered and callable
- `gp decision:record --json` with stdin `{"id":"dec-1","domain":"arch","title":"...","summary":"..."}` emits `decision-recorded` event
- `gp decision:supersede --json` with stdin `{"id":"dec-1","reason":"new info"}` emits `decision-superseded` event
- `gp learning:capture --json` with stdin `{"summary":"...","scope":"epic"}` emits `learning-captured` event
- `gp learning:promote --json` with stdin `{"learningId":"...","from":"slice","to":"epic"}` emits `learning-promoted` event
- All 12 `side-quest:*` commands operational with correct event emission
- `bun run check` passes

### Tasks

#### 3a: Event schemas for missing types

1. **Create `src/schemas/events/decision.ts`** (or add to trust-domain):
   - `decisionRecordedPayloadSchema` -- `{ id: string, domain: string, title: string, summary: string, entityPath?: string, reconsiderWhen?: string }`
   - `decisionSupersededPayloadSchema` -- `{ decisionId: string, reason: string, supersededBy?: string }`

2. **Create `src/schemas/events/learning.ts`** (or add to trust-domain):
   - `learningCapturedPayloadSchema` -- `{ summary: string, scope: "slice" | "epic" | "project", tags?: string[] }`
   - `learningPromotedPayloadSchema` -- `{ learningId: string, from: string, to: string }`

3. **Create `src/schemas/events/side-quest.ts`** with payload schemas for all side-quest event types:
   - `side-quest-created`, `side-quest-goal-committed`, `side-quest-plan-drafted`, `side-quest-plan-shape-approved`, `side-quest-plan-committed`, `side-quest-implementation-started`, `side-quest-chunk-started`, `side-quest-chunk-verified`, `side-quest-landed`, `side-quest-abandoned`

4. **Update `src/schemas/events/index.ts`** barrel to export all new schemas.

#### 3b: `decision:record` and `decision:supersede` commands

5. **Create `src/commands/decision/record.ts`:**
   - Stdin: `{ id: string, domain: string, title: string, summary: string, entityPath?: string, reconsiderWhen?: string }`
   - Use v2 `appendEvent` pattern (NOT v1 RPC `begin`), appending `decision-recorded` event to project-scope events.jsonl with domain `"decision-learning"`
   - Use `createProjectCommandContext()` from `_shared/command-context.ts` for project-scope wiring
   - This is the v2 event-based replacement for `decision:create` (v1 RPC). Without it, `decision:supersede` has no v2 way to create the decision it supersedes.

6. **Create `src/commands/decision/supersede.ts`:**
   - Stdin: `{ id: string, reason: string, supersededBy?: string }`
   - Use v2 `appendEvent` pattern (NOT v1 RPC `begin`), appending `decision-superseded` event to project-scope events.jsonl with domain `"decision-learning"`
   - Use `createProjectCommandContext()` from `_shared/command-context.ts` for project-scope wiring

7. **Register both in `src/commands/main.ts`** as `"decision:record"` and `"decision:supersede"`.

#### 3c: `learning:capture` and `learning:promote` commands

8. **Create `src/commands/learning/capture.ts`:**
   - Stdin: `{ summary: string, scope?: string, tags?: string[] }`
   - Appends `learning-captured` event to appropriate scope's events.jsonl using v2 appendEvent
   - Domain: `"decision-learning"`

9. **Create `src/commands/learning/promote.ts`:**
   - Stdin: `{ learningId: string, from: string, to: string }`
   - This is the v2 event-based equivalent of the v1 `learning:rollup`. It emits `learning-promoted` rather than the v1 state machine `ROLLUP_LEARNINGS` event
   - Emit `learning-promoted` event with domain `"decision-learning"`
   - **Note:** `learning:rollup` (v1 RPC) stays as-is for backward compat. Both commands coexist -- `promote` emits a `learning-promoted` event, `rollup` uses the v1 RPC. Skills will migrate from `rollup` to `promote` in slices 10-11.

10. **Register both in `src/commands/main.ts`** as `"learning:capture"` and `"learning:promote"`.

#### 3d: `side-quest:*` commands (12)

11. **Create shared context helper** `src/commands/side-quest/_shared.ts`:
    - `createSideQuestCommandContext(args)` -- returns `{ goodplanDir, sideQuestName, eventsPath, branch, commitHint, beforeAppend }`
    - Events path: `.goodplan/side-quests/<name>/events.jsonl`
    - Wire up invariant engine for side-quest scope

12. **Create 12 command files under `src/commands/side-quest/`:**
    - `create.ts` -- `gp side-quest:create --name <name> --goal <goal>` emits `side-quest-created` (scope `"side-quest"`, creates directory)
    - `list.ts` -- read-only, lists all side quests from derived state
    - `show.ts` -- read-only, shows side quest details from derived state
    - `goal-commit.ts` -- emits `side-quest-goal-committed` with goal ContentRef
    - `plan-draft.ts` -- emits `side-quest-plan-drafted` with plan ContentRef
    - `plan-shape-approve.ts` -- emits `side-quest-plan-shape-approved`
    - `plan-commit.ts` -- emits `side-quest-plan-committed` with plan ContentRef
    - `implement-start.ts` -- emits `side-quest-implementation-started`
    - `chunk-start.ts` -- emits `side-quest-chunk-started` (simplified: no TDD cycle per architecture)
    - `chunk-verify.ts` -- emits `side-quest-chunk-verified` with evidence
    - `land.ts` -- emits `side-quest-landed`
    - `abandon.ts` -- emits `side-quest-abandoned` with reason

13. **Register all 12 in `src/commands/main.ts`** under `"side-quest:create"`, `"side-quest:list"`, etc.

14. **Update `reduceEntityLifecycle` in `src/engine/derived-state/reducers.ts`** to handle the new side-quest events not yet covered:
    - `side-quest-plan-drafted` -- set `sq.plan` and phase
    - `side-quest-plan-shape-approved` -- set shape approved flag
    - `side-quest-chunk-started` -- add chunk to side quest's chunks Map
    - `side-quest-chunk-verified` -- update chunk status to verified

15. **Update `reduceDecisionLearning` in `reducers.ts`** (currently a stub at line 662) to handle `decision-recorded`, `decision-superseded`, `learning-captured`, `learning-promoted` events.

### Verification

- `bun run check` passes
- `bun run build` succeeds
- `gp decision:record --help` shows usage
- `gp decision:supersede --help` shows usage
- `gp side-quest:create --help` shows usage
- `gp learning:capture --help` shows usage

---

## Phase 4: Integration Tests

### Objective

Add CLI integration tests covering the refinement loop lifecycle, decision supersede lifecycle, learning capture/promote lifecycle, and side-quest lifecycle. Follow the existing pattern from `tests/commands/smoke.test.ts` using `buildBinary()`, `runCommand()`, and `withTempDir()` from `tests/integration/helpers.ts`.

### Expected Behavior

**RED (before):**
- No test files exist at `tests/commands/refine.test.ts`, `tests/commands/side-quest.test.ts`, `tests/commands/decision-lifecycle.test.ts`, `tests/commands/learning-lifecycle.test.ts`

**GREEN (after):**
- `bun run test -- tests/commands/refine.test.ts` passes
- `bun run test -- tests/commands/side-quest.test.ts` passes
- `bun run test -- tests/commands/decision-lifecycle.test.ts` passes
- `bun run test -- tests/commands/learning-lifecycle.test.ts` passes

### Tasks

1. **Create `tests/commands/refine.test.ts`** -- Refinement loop lifecycle:
   - Setup: `gp init`, `gp epic:create`, advance epic to P7 (plan drafted state) via sequence of commands
   - Test sequence: `refine:start --epic test-epic --artifact-type plan` -> `refine:score --epic test-epic --artifact-type plan --reviewer holistic` (with ReviewerPayload via stdin) -> `refine:synthesize` -> `refine:revise` -> `refine:evaluate` (verify returns ConvergenceResult JSON) -> `refine:converge`
   - Verify event chain: read `events.jsonl`, confirm refinement events appended with correct types and domain `"refinement"`
   - Circuit breaker test: call `refine:stuck --epic test-epic --artifact-type plan --reason "manual"`
   - Override test: call `refine:override --epic test-epic --artifact-type plan --reason "user decision"`
   - Each assertion checks `exitCode === 0` and `json.ok === true`

2. **Create `tests/commands/side-quest.test.ts`** -- Side-quest lifecycle:
   - Full lifecycle: `side-quest:create --name sq-1 --goal "test goal"` -> `side-quest:goal-commit --side-quest sq-1` -> `side-quest:plan-draft --side-quest sq-1` -> `side-quest:plan-shape-approve --side-quest sq-1` -> `side-quest:plan-commit --side-quest sq-1` -> `side-quest:implement-start --side-quest sq-1` -> `side-quest:chunk-start --side-quest sq-1` (with chunkId stdin) -> `side-quest:chunk-verify --side-quest sq-1` (with evidence stdin) -> `side-quest:land --side-quest sq-1`
   - Verify `events.jsonl` exists at `.goodplan/side-quests/sq-1/events.jsonl` with correct event count
   - Abandon test: create `sq-2`, then `side-quest:abandon --side-quest sq-2 --reason "not needed"`

3. **Create `tests/commands/decision-lifecycle.test.ts`** -- Decision with supersede:
   - `decision:record` (stdin: `{id, domain, title, summary}`) -> `decision:supersede` (stdin: `{id, reason}`) -> `decision:list --json` (verify superseded status visible) -> `decision:show --json` (verify details)
   - Use `decision:record` (v2 event pattern) for setup, NOT `decision:create` (v1 RPC) -- keeps the entire test in the v2 event model
   - Verify event types in project-scope `events.jsonl`: expect `decision-recorded` and `decision-superseded` events

4. **Create `tests/commands/learning-lifecycle.test.ts`** -- Learning capture and promote:
   - `learning:capture` (stdin: `{summary, scope}`) -> `learning:list --json` (verify captured) -> `learning:promote` (stdin: `{learningId, from, to}`) -> verify `learning-promoted` event in log

### Verification

- `bun run test` passes (all tests including new ones)
- No regressions in existing tests (`smoke.test.ts`, `epic.test.ts`, `epic.e2e.test.ts`)

---

## Phase 5: Agent SDK Harness Test

### Objective

Create `tools/dogfood/test-core-skills-v2.ts` that validates `/gp:init`, `/gp:status`, and `workflow-guide` skill loading work correctly against the full v2 CLI command surface.

### Expected Behavior

**RED (before):**
- No file at `tools/dogfood/test-core-skills-v2.ts`

**GREEN (after):**
- `bun tools/dogfood/test-core-skills-v2.ts` exits 0
- Tests verify: (a) init creates valid project state, (b) status returns valid JSON with expected fields, (c) workflow-guide skill loads and responds

### Tasks

1. **Create `tools/dogfood/test-core-skills-v2.ts`:**
   - Follow pattern from `test-init.ts` (lines 1-60 for setup structure)
   - Use `query()` from Agent SDK with `permissionMode: "bypassPermissions"`, `plugins: [{ type: "local", path: PLUGIN_DIR }]`, `settingSources: []`, `env: createTestEnv(PLUGIN_DIR)`
   - Resolve `PLUGIN_DIR` to `dist/gp-plugin/`, check binary exists, fail fast if not built

2. **Test case 1: Init**
   - Create empty temp directory
   - Run Agent SDK session: "Initialize this as a goodplan project named 'v2-test'"
   - Verify `.goodplan/events.jsonl` exists with `project-initialized` event

3. **Test case 2: Status**
   - After init, run `gp status --json` directly via `spawnSync` (not Agent SDK -- this is a CLI test)
   - Verify output parses as JSON with `project`, `activeEpic`, `recommendations` keys
   - Verify `project.name === "v2-test"`

4. **Test case 3: Workflow guide**
   - Run Agent SDK session: "What should I do next with this project?"
   - Verify response contains actionable guidance (check for presence of `gp` command suggestions -- deterministic metric)

5. **Quality metrics** (deterministic only, per harness conventions):
   - File existence: `.goodplan/events.jsonl` exists after init
   - CLI output structure: `gp status --json` parses with expected top-level keys
   - No crash: all sessions complete without tool errors

### Verification

- `bun run build` succeeds (harness needs built plugin)
- `bun tools/dogfood/test-core-skills-v2.ts` exits 0
- Log output shows all test cases passed

---

## Implementation Notes

### Pattern: v2 Event Commands vs v1 RPC

The codebase has two command patterns:
- **v1 RPC pattern** (`decision:create`, quest commands): Uses `begin()` / `submit()` / `complete()` from `src/core/rpc/` which goes through the v1 state machine (`src/core/state/reduce.ts`)
- **v2 Event pattern** (all slice commands, epic commands built in slices 05-06): Uses `appendEvent()` from `src/engine/events/append.ts` which writes directly to scope event logs with invariant checking

All new commands in this quest MUST use the v2 event pattern (`appendEvent`). Do not extend the v1 RPC layer.

### Scope Resolution for `refine:*`

Refinement commands operate on a scope (epic or side-quest) and an artifact type. The scope determines which `events.jsonl` file to append to. `--epic <name>` resolves to `.goodplan/epics/<name>/events.jsonl`; `--side-quest <name>` resolves to `.goodplan/side-quests/<name>/events.jsonl`.

### Side-Quest Event Scope

Per the architecture, side-quest events go to `.goodplan/side-quests/<dir>/events.jsonl` with `scope: "side-quest"`. The existing `createEventCommandContext` helper in `_shared/command-context.ts` only handles epic scope. Create a new `createSideQuestCommandContext` helper rather than overloading the existing one.

### Existing Reducer Coverage

The `reduceEntityLifecycle` reducer (line 44-493) already handles several side-quest events: `side-quest-created`, `side-quest-goal-committed`, `side-quest-plan-committed`, `side-quest-implementation-started`, `side-quest-landed`, `side-quest-abandoned`. New events need cases added: `side-quest-plan-drafted`, `side-quest-plan-shape-approved`, `side-quest-chunk-started`, `side-quest-chunk-verified`.

### Trust Layer Integration

The `refine:evaluate` and `refine:converge` commands call existing pure functions:
- `evaluateConvergence()` from `src/trust/convergence/evaluator.ts`
- `checkCircuitBreaker()` from `src/trust/convergence/circuit-breaker.ts`

These functions take `ScoredEvent[]`, `Rubric`, `RelevanceWeight` map, and `ConvergenceConfig` -- all of which must be reconstructed from the event log during command execution.
