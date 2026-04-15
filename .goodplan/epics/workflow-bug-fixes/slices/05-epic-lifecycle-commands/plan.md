# Implementation Plan — 05-epic-lifecycle-commands

## Goal

Implement ~20 `gp epic:*` commands covering the full epic lifecycle with context bundle integration. This is the first command-layer slice for the v2 engine, establishing the dispatch pattern and Context Bundler module that slices 06-07 will follow.

## Scope

- Context Bundler module (`src/context/`) — pure computation from `DeepReadonly<DerivedStateData>` to `ContextBundle`
- ~20 v2 epic commands replacing v1 equivalents in `src/commands/epic/`
- V2 command dispatch pattern wired through `src/commands/main.ts`
- Event payload schemas for all epic events in `src/schemas/events/epic.ts`
- Discriminated union type over all epic event payloads for type-safe command handlers
- Unit tests for Context Bundler, unit tests for command handlers, CLI binary integration tests

## Key Constraints

- **`exactOptionalPropertyTypes: true`** — All optional Zod fields must use conditional spread pattern (see `project_zod_optional_properties.md`). For example: `{ name, ...(goal !== undefined ? { goal } : {}) }` instead of `{ name, goal }` when `goal` may be `undefined`.
- **`DeepReadonly<DerivedStateData>`** — `computeDerivedState()` and `replayAllScopes()` return `DeepReadonly<DerivedStateData>`. Read-only commands work directly with this readonly projection. Context Bundler accepts `DeepReadonly<DerivedStateData>`.
- **Event payload field names must match existing reducers** — The reducer at `src/engine/derived-state/reducers.ts` uses `payload.dir`, `payload.goal`, `payload.architectureTarget`, `payload.pressureTest`, `payload.sliceSet` etc. New payload schemas must use these same field names. **Exception**: `epic-created` payload field is standardized to `directory` (not `dir`) — no backward compat needed since v2 event logs are fresh. The reducer must be updated to read `payload.directory` (see Phase 2 Task 2).
- **`ScopeRef` already exists** — The envelope schema (`src/schemas/envelope.ts`) defines `scopeRef: z.string().nullable()` on `AnyEventEnvelopeSchema`. Do not redefine `ScopeRef` in `src/context/types.ts`; import and use the existing type from the envelope.
- **Barrel file exception** — The v2 subsystem convention allows barrel files in `src/context/index.ts` for the public API surface. Internal modules are not re-exported.
- **ContentRef schema exists** — `ContentRefSchema` and `ContentRef` type are already defined in `src/schemas/envelope.ts`. Import from there.

## Existing Code Audit

### Reducers already implemented (in `src/engine/derived-state/reducers.ts`)

The following event types already have working reducer cases in `reduceEntityLifecycle()`. The plan specifies **updating** these to use typed payload schemas (instead of `as Record<string, unknown>` casts) — not adding new reducers:

| Event Type | Reducer Action | Field Names Used |
|---|---|---|
| `epic-created` | Creates `EpicState` via `payload.dir` | `dir` |
| `epic-goal-drafted` | Sets `epic.goal` via `payload.goal` | `goal` |
| `epic-goal-committed` | Sets `epic.goal`, advances to P1 | `goal` |
| `exploration-concluded` | Advances to P2 | (none) |
| `architecture-target-committed` | Sets `epic.architectureTarget`, advances to P3 | `architectureTarget` |
| `pressure-test-committed` | Sets `epic.pressureTest`, advances to P4 | `pressureTest` |
| `pressure-test-finding-accepted` | Updates finding disposition | `findingId` |
| `slice-set-committed` | Sets `epic.sliceSet`, advances to P5 | `sliceSet` |
| `epic-activated` | Sets active=true, paused=false, P6 | (none) |
| `epic-paused` | Sets paused=true | (none) |
| `epic-resumed` | Sets paused=false | (none) |
| `epic-completed` | Sets completed=true, active=false | (none) |
| `epic-abandoned` | Sets abandoned=true, active=false | (none) |

Existing stub reducers: `reduceExploration()`, `reducePressureTest()`, `reducePauseSteering()` (has `steering-preference-set` and `epic-steering-preference-set` cases).

### Event types that are NEW (no existing reducer case)

| Event Type | Target Reducer | Domain |
|---|---|---|
| `exploration-cycle-started` | `reduceExploration` | `exploration` |
| `research-captured` | `reduceExploration` | `exploration` |
| `brainstorm-captured` | `reduceExploration` | `exploration` |
| `epic-goal-drafted` (contentRef storage) | existing `reduceEntityLifecycle` | `entity-lifecycle` |
| `architecture-shape-checkpoint-reached` | `reduceEntityLifecycle` | `entity-lifecycle` |
| `architecture-shape-approved` | `reduceEntityLifecycle` | `entity-lifecycle` |
| `architecture-shape-checkpoint-auto-shaped` | `reduceEntityLifecycle` | `entity-lifecycle` |
| `pressure-test-drafted` | `reduceEntityLifecycle` | `entity-lifecycle` |
| `slice-set-drafted` | `reduceEntityLifecycle` | `entity-lifecycle` |
| `slice-set-shape-checkpoint-reached` | `reduceEntityLifecycle` | `entity-lifecycle` |
| `slice-set-shape-approved` | `reduceEntityLifecycle` | `entity-lifecycle` |
| `slice-set-shape-checkpoint-auto-shaped` | `reduceEntityLifecycle` | `entity-lifecycle` |
| `epic-steering-preference-set` | existing `reducePauseSteering` | `pause-steering` |

### Invariant rules already implemented (in `src/engine/invariants/rules/epic.ts`)

| Rule ID | Enforces |
|---|---|
| `epic.single-active-per-branch` | At most one active epic per branch |
| `epic.dir.unique` | Epic directory must be unique (uses `directory` field in payload) |
| `epic.goal.committed-before-explore` | Goal committed before exploration starts |
| `epic.architecture-target-required-before-slice-set` | Architecture target before slice set |
| `epic.pressure-test-required-before-slice-set` | Pressure test before slice set |
| `epic.architecture-shape-approval-required` | Shape approved before pressure test drafting (currently only checks `architecture-shape-approved` — must be updated to also accept `architecture-shape-checkpoint-auto-shaped`) |
| `epic.slice-shape-approval-required` | Slice set shape approved before slice refinement (currently only checks `slice-set-shape-approved` — must be updated to also accept `slice-set-shape-checkpoint-auto-shaped`) |
| `epic.all-slices-landed-before-complete` | All slices landed/abandoned before epic completes |

### V1-to-V2 File Mapping

| V1 File (`src/commands/epic/`) | V2 Replacement | Notes |
|---|---|---|
| `create.ts` | `create.ts` (rewrite in-place) | v2 event engine |
| `show.ts` | `show.ts` (rewrite in-place) | v2 derived state |
| `list.ts` | `list.ts` (rewrite in-place) | v2 `replayAllScopes()` |
| `abandon.ts` | `abandon.ts` (rewrite in-place) | v2 event engine |
| `activate.ts` | `activate.ts` (rewrite in-place) | v2 event engine |
| `complete.ts` | `complete.ts` (rewrite in-place) | v2 event engine |
| `explore.ts` | Split: `explore-start.ts`, `explore-conclude.ts`, `research-capture.ts`, `brainstorm-capture.ts` | v1 was single entry point |
| `define-architecture.ts` | Split: `architecture-draft.ts`, `architecture-commit.ts`, `architecture-shape-start.ts`, `architecture-shape-approve.ts`, `architecture-shape-auto.ts` | v1 was single entry point |
| `define-slices.ts` | Split: `slices-draft.ts`, `slices-commit.ts`, `slice-set-shape-start.ts`, `slice-set-shape-approve.ts`, `slice-set-shape-auto.ts` | v1 was single entry point |
| `refine-architecture.ts` | **Deferred to slice 07** (generic `refine:*` namespace) | |
| `refine-slices.ts` | **Deferred to slice 07** (generic `refine:*` namespace) | |
| `add-verification.ts` | Retained as-is (non-epic-lifecycle) | |
| `update-verification.ts` | Retained as-is (non-epic-lifecycle) | |

### Event Scoping Model

Epic events live in `.goodplan/epics/<name>/events.jsonl` (not project-level). `scopeRef` identifies the epic slug; null for project scope. `replayAllScopes()` scans `epics/` and `side-quests/` directories, replays each scope separately via `computeDerivedState()`, then merges into a single `DerivedStateData`. Commands that create an epic also create the epic directory and its `events.jsonl`.

## Error Handling Contract

All v2 commands follow a consistent error handling pattern:

- **Success output**: `{ ok: true, event: "<event-id>", entity: "<entity-ref>" }` for mutating commands; `{ ok: true, ...data }` for read commands
- **Error output**: `{ ok: false, error: "<user-facing message>", code: "<error-code>" }` where `code` is a machine-readable identifier (e.g., `"INVARIANT_VIOLATION"`, `"ENTITY_NOT_FOUND"`, `"INVALID_PHASE"`)
- **CLI exit codes**: 0 for success, 1 for errors
- **Invariant violations**: Caught from `appendEvent()`, mapped to user-facing messages with the invariant rule ID as the error code
- **Pattern**: try/catch around `appendEvent()`, catch invariant violations and format as error output. This pattern is established in Phase 2 and copied by all subsequent phases.

## ContentRef Storage

`ContentRefSchema` and `ContentRef` type are defined in `src/schemas/envelope.ts` (sha, size, path, mediaType). Commands that store artifact content (goal drafts, architecture drafts, etc.) use `git hash-object -w` to store the content as a git blob, then construct a `ContentRef` with the returned SHA. A `storeContentRef(content: string, path: string, mediaType: string): Promise<ContentRef>` utility will be created in `src/engine/content/store.ts` (Phase 2, Task 1a) to encapsulate this. It shells out to `git hash-object -w --stdin`, captures the SHA, computes `size` from `Buffer.byteLength(content)`, and returns the full `ContentRef`.

## Architecture References

- `src/engine/` — event engine (append, replay, derived state, invariants) from slices 01-04
- `src/schemas/envelope.ts` — event envelope schema, `ContentRefSchema`, `ScopeRef` type
- `src/schemas/entities/derived-state.ts` — `DerivedStateData`, `EpicState`, `Phase`
- `src/commands/main.ts` — citty dispatch registry (flat colon-namespaced subCommands)
- `src/commands/global/init.ts` — reference v2 command pattern (appendEvent + invariant wiring)
- `.goodplan/epics/workflow-bug-fixes/architecture/commands.md` — command tree spec
- `.goodplan/epics/workflow-bug-fixes/architecture/context.md` — Context Bundler spec

---

## Phase 1: Context Bundler Module

### Objective

Build the v2 Context Bundler as a computational module at `src/context/`. It takes `DeepReadonly<DerivedStateData>` plus a phase/scope and a `ContentResolver` function, and produces a `ContextBundle` with token budgeting and inline/reference selection. The `ContentResolver` parameter `(ref: ContentRef) => string` is injected by the caller, keeping the bundler pure and testable with mock resolvers while acknowledging it needs I/O to read content. This replaces the v1 context system at `src/core/context/`.

### Expected Behavior

**Before:** `src/context/` does not exist. The v1 context system at `src/core/context/` uses the mutable `ProjectState` tree.

**After:**
- `src/context/bundler.ts` exports `buildContextBundle(state: DeepReadonly<DerivedStateData>, phase: Phase, scopeRef: string | null, resolveContent: ContentResolver, agentType?: AgentType): ContextBundle` where `ContentResolver = (ref: ContentRef) => string`
- `src/context/types.ts` exports `ContextBundle`, `InlineSection`, `ReferenceSection`, `TokenBudget`, `BudgetConfig`, `AgentType`, `ContentResolver` — does NOT redefine `ScopeRef` (uses `scopeRef: string | null` from envelope schema)
- `src/context/phase-specs.ts` exports per-phase inline/reference specifications as a lookup table
- `src/context/token-estimate.ts` exports `estimateTokens(content: string): number` (simple char/4 heuristic). Note: uses `string.length` (UTF-16 code units) / 4 — overestimates for ASCII, underestimates for CJK. Acceptable for budget allocation.
- `src/context/index.ts` barrel exports public API
- Default token budgets: 20K tokens for most phases, 30K for P10 (implementation — heaviest context), 10K for lightweight phases (P0, P6, P12). These are starting values; implementers should tune based on actual content sizes.
- Convergence/score accessors for the Context Bundler live in `src/engine/derived-state/` (not `src/trust/`) to avoid layer violations
- Unit tests pass: `bun run test -- tests/context/`

### Tasks

1. **Create `src/context/types.ts`** — Define `ContextBundle`, `InlineSection`, `ReferenceSection`, `TokenBudget`, `BudgetConfig`, `AgentType`, `ContentResolver` interfaces/types matching the architecture spec in `context.md`. `ContentResolver` is defined as `type ContentResolver = (ref: ContentRef) => string`. Use Zod schemas where runtime validation is needed (e.g., `AgentType` as `z.enum(["phase", "editor", "reviewer", "synthesis"])`). Use `scopeRef: string | null` parameter type (matching envelope schema) rather than defining a separate `ScopeRef` type. All optional properties must use the conditional spread pattern per `exactOptionalPropertyTypes`.

2. **Create `src/context/token-estimate.ts`** — Export `estimateTokens(content: string): number`. Simple heuristic: `Math.ceil(content.length / 4)`. This is intentionally approximate — accuracy is not critical for budget allocation. Note: `string.length` returns UTF-16 code units, so this overestimates for ASCII and underestimates for CJK/emoji. Acceptable for budget allocation purposes.

3. **Create `src/context/phase-specs.ts`** — Export `phaseSpecs: Record<Phase, PhaseSpec>` where `PhaseSpec` defines `inlineKeys: string[]` (ordered by priority) and `referenceKeys: string[]` for each phase P0-P12 and S0-S3. Follow the per-phase bundle table from `context.md` exactly. Each key maps to a `DerivedStateData` accessor path (e.g., `"architecture-current"` maps to the root architecture doc, `"epic-goal"` maps to the epic's goal ContentRef).

4. **Create `src/context/bundler.ts`** — Implement `buildContextBundle()`:
   - Accept `state: DeepReadonly<DerivedStateData>`, `phase`, `scopeRef`, `resolveContent: ContentResolver`, and optional `agentType`
   - Look up phase spec from `phaseSpecs`
   - Resolve inline sections by looking up ContentRef from state (via accessor functions in `src/engine/derived-state/accessors.ts`) then calling `resolveContent(ref)` to get the actual content string
   - Apply budget: mandatory inlines first, then priority-ordered inlines, track token usage
   - Build reference sections for all reference keys (always included, never budget-limited per spec)
   - Compute `TokenBudget` with `total`, `inlineUsed`, `referenceReserve`, `remaining`
   - Apply agent-type multiplier to total budget
   - If mandatory sections exceed budget, include them anyway (warn but do not truncate per spec)

5. **Create `src/context/index.ts`** — Barrel export: `buildContextBundle`, all types (including `ContentResolver`), `estimateTokens`, `phaseSpecs`.

6. **Create `tests/context/bundler.test.ts`** — Unit tests with mock `DeepReadonly<DerivedStateData>`:
   - Test that P10 (implementation) inlines `architecture-current` and references `architecture-target`
   - Test that P3 (architecture) inlines both `architecture-current` and `architecture-target`
   - Test token budget allocation respects agent-type multipliers
   - Test that mandatory sections exceeding budget are still included
   - Test that reference sections are always included regardless of budget
   - Test that unknown/missing ContentRefs produce empty inline sections (not crashes)

7. **Create `tests/context/token-estimate.test.ts`** — Simple tests for the token estimation heuristic.

8. **Create `tests/fitness/v2-layer-boundaries.test.ts`** — Scan imports in `src/engine/`, `src/context/`, `src/trust/`, `src/commands/` to enforce dependency direction rules: context imports engine, schemas, util only (never trust); engine never imports context or commands; trust never imports commands. Adding this early catches layer violations as soon as the `src/context/` module exists.

### Verification

```bash
bun run check           # lint + typecheck passes
bun run test -- tests/context/   # all context bundler unit tests pass
bun run test -- tests/fitness/   # layer boundaries respected
```

---

## Phase 2: Core Epic Commands + V2 Dispatch Pattern

### Objective

Implement `epic:create`, `epic:show`, `epic:list`, `epic:abandon` as v2 event-engine commands. Establish the v2 command handler pattern (including error handling) that all subsequent commands will follow. Replace v1 command registrations in `src/commands/main.ts`.

### Expected Behavior

**Before:** `src/commands/epic/create.ts` uses the v1 RPC layer (`begin()` from `src/core/rpc/`). All epic commands go through the v1 state machine.

**After:**
- `epic:create` appends an `epic-created` event via `appendEvent()` with invariant checking
- `epic:show` replays events, computes `DeepReadonly<DerivedStateData>`, returns `EpicState` projection
- `epic:list` replays all scopes via `replayAllScopes()`, returns epic summaries from derived state
- `epic:abandon` appends `epic-abandoned` event
- Event payload schemas exist in `src/schemas/events/epic.ts` with field names matching existing reducers
- Discriminated union `EpicEventPayload` covers all epic event types
- ContentRef storage utility exists at `src/engine/content/store.ts`
- V2 commands are registered in `main.ts`, replacing v1 equivalents
- CLI binary works: `./gp epic:create --name test --json` returns `{ ok: true, event: "...", entity: "epic:test" }`
- Error case: `./gp epic:create --name existing --json` returns `{ ok: false, error: "...", code: "INVARIANT_VIOLATION" }`

### Tasks

1. **Create `src/engine/content/store.ts`** — Implement `storeContentRef(content: string, path: string, mediaType: string): Promise<ContentRef>`:
   - Shell out to `git hash-object -w --stdin` with content piped to stdin
   - Capture the SHA from stdout
   - Compute `size` from `Buffer.byteLength(content, "utf-8")`
   - Return `{ sha, size, path, mediaType }` conforming to `ContentRefSchema`
   - This utility is used by all commands that store artifact content (goal-draft, architecture-draft, etc.)

2. **Create `src/schemas/events/epic.ts`** — Define Zod payload schemas for all epic events. Field names MUST match the existing reducer field names (see Existing Code Audit above). Start with the four needed in this phase:
   - `epicCreatedPayloadSchema` — `{ directory: z.string().min(1), ...(goalSummary !== undefined ? { goalSummary: z.string() } : {}) }` — standardize on `directory` for all entity-created payloads. No backward compat needed — v2 event logs are fresh (no production events exist yet; prior events were from unit tests and smoke scripts). Update the reducer to read `payload.directory` and set `epicState.dir = payload.directory`.
   - `epicAbandonedPayloadSchema` — `{ reason: z.string() }`
   - Create `EpicEventMap` mapped type that maps event type strings to their payload Zod schemas (e.g., `{ "epic-created": typeof epicCreatedPayloadSchema, "epic-abandoned": typeof epicAbandonedPayloadSchema, ... }`). This is purely TypeScript — no `_type` field in payloads, since the envelope `type` field already serves as the discriminant. Rationale: adding `_type` to payloads would be redundant with the envelope discriminant.
   - Export `EpicEventMap`, all payload types, and a `EpicEventType = keyof EpicEventMap` helper type.
   - Start with Phase 2 event types; Phases 3-4 extend the map incrementally.

3. **Define error handling pattern** — Establish in the first v2 command (`epic:create`) and document for reuse:
   - Wrap `appendEvent()` in try/catch
   - Catch invariant violation errors, extract rule ID and message
   - Format as `{ ok: false, error: message, code: ruleId }` for `--json` mode
   - Print user-facing message to stderr for non-JSON mode
   - Exit with code 1 on error, 0 on success
   - This pattern is the template for all subsequent v2 commands

4. **Create v2 `src/commands/epic/create.ts`** — Replace v1 implementation. Follow the `init.ts` pattern:
   - Accept `--name` arg and optional stdin JSON `{ name, goal }`
   - Resolve project dir, events path for the epic scope (`.goodplan/epics/<name>/events.jsonl`)
   - Wire invariant engine (`createCoreRegistry`, `createReplayGetContext`, `createBeforeAppendHook`)
   - Create epic directory, append `epic-created` event with domain `"entity-lifecycle"`
   - Epic events live ONLY in their own scope log (`.goodplan/epics/<name>/events.jsonl`), NOT in project-scope `events.jsonl`
   - Output per `MutatingCommandOutput` contract
   - Handle `--json`, `--quiet` flags per convention
   - Apply error handling pattern from Task 3

5. **Create v2 `src/commands/epic/show.ts`** — Replace v1 implementation:
   - Accept `--epic` arg (required)
   - Replay events for the epic scope
   - Compute derived state using `computeDerivedState()` — returns `DeepReadonly<DerivedStateData>`
   - Return `EpicState` projection (matching `commands.md` output contract)
   - Include artifacts detection (carry forward from v1 if applicable)

6. **Create v2 `src/commands/epic/list.ts`** — Replace v1 implementation:
   - Replay all scopes using `replayAllScopes()` (scans `epics/` and `side-quests/` directories)
   - Extract epic entries from `DerivedStateData.epics` Map
   - Return `{ items: EpicSummary[], total: number }` with pagination support
   - Performance note: `replayAllScopes()` replays ALL events across all scopes. This is O(total events across all epics). Accept this cost for correctness — if performance becomes an issue, add a summary cache in a later slice.

7. **Create v2 `src/commands/epic/abandon.ts`** — Replace v1 implementation:
   - Accept `--epic` and `--reason` args
   - Replay epic events, verify epic exists and is not already completed/abandoned
   - Append `epic-abandoned` event
   - Output result

8. **Update `src/commands/main.ts`** — Replace v1 epic command imports with v2 versions for `create`, `show`, `list`, `abandon`. The import paths stay the same (same file locations), only the implementations change. Keep v1 commands for entities not yet migrated (slice, quest, task, etc.).

9. **Add invariant rules for epic lifecycle** — Audit existing rules (see table above). Most rules already exist. Add only if missing:
   - `epic.not-abandoned` — cannot append events to an abandoned epic (if not already covered)
   - `epic.not-completed` — cannot append events to a completed epic (if not already covered)
   - Register any new rules in `createCoreRegistry()`

10. **Create `tests/commands/epic.test.ts`** — CLI binary integration tests:
    - `gp init --name test --json` then `gp epic:create --name my-epic --json` succeeds
    - `gp epic:list --json` returns the created epic
    - `gp epic:show --epic my-epic --json` returns epic state
    - `gp epic:abandon --epic my-epic --reason "test" --json` succeeds
    - `gp epic:create --name my-epic --json` after abandon returns appropriate error (invariant violation)
    - Test error output shape: `{ ok: false, error: "...", code: "..." }`

11. **Verify v1 command removal is safe** — Run the following searches to identify any remaining v1 dependencies:
    - `grep -r 'src/core/rpc' src/commands/epic/` — should return no results
    - `grep -r 'begin()' src/commands/epic/` — should return no results
    - `grep -r "from.*epic/(create|show|list|abandon)" src/` — verify no other modules import v1 versions
    - List results and assess each. If v1 slice/quest commands still reference epic state via v1 data layer, leave those v1 commands intact.

### Verification

```bash
bun run check                           # lint + typecheck
bun run test -- tests/commands/epic     # integration tests pass
bun run test -- tests/engine/           # engine tests still pass (no regression)
```

Manual spot-check:
```bash
bun build src/index.ts --compile --outfile /tmp/gp-test
/tmp/gp-test epic:create --name test-epic --json   # in a temp dir with .goodplan/
```

---

## Phase 3: Epic Goal + Exploration + Architecture Commands

All commands in this phase follow the v2 command pattern established in Phase 2, including the error output contract (`{ ok: false, error: string, code: string }`) and invariant violation handling.

### Objective

Implement the epic "exploration phase" commands that move an epic from creation through goal commitment, exploration, and architecture definition. These are the first "phase transition" commands.

### Expected Behavior

**Before:** Only `epic:create`, `epic:show`, `epic:list`, `epic:abandon` exist as v2 commands.

**After:**
- `epic:goal-draft`, `epic:goal-commit` handle goal artifacts
- `epic:explore-start`, `epic:explore-conclude` manage exploration cycles
- `epic:research-capture`, `epic:brainstorm-capture` capture exploration artifacts
- `epic:architecture-draft`, `epic:architecture-commit` handle architecture-target artifacts
- `epic:architecture-shape-start`, `epic:architecture-shape-approve`, `epic:architecture-shape-auto` handle the shape checkpoint
- All phase transitions emit correct events and update epic phase in derived state
- Unit tests verify state transitions; integration test verifies multi-step flow

### Tasks

1. **Add event payload schemas to `src/schemas/events/epic.ts`** — Add schemas for new event types. Field names MUST match existing reducer field names where reducers already exist (see audit table). Use `ContentRef` imported from `src/schemas/envelope.ts`:
   - `epicGoalDraftedPayloadSchema` — `{ goal: ContentRefSchema }` (matches reducer: `payload.goal`)
   - `epicGoalCommittedPayloadSchema` — `{ goal: ContentRefSchema, ...(extract !== undefined ? { extract } : {}) }` (matches reducer: `payload.goal`)
   - `explorationCycleStartedPayloadSchema` — `{ cycleNumber: z.number() }` (NEW event type)
   - `explorationConcludedPayloadSchema` — `{ summary: ContentRefSchema }` (reducer exists, no payload fields used)
   - `researchCapturedPayloadSchema` — `{ contentRef: ContentRefSchema, title: z.string() }` (NEW event type)
   - `brainstormCapturedPayloadSchema` — `{ contentRef: ContentRefSchema, title: z.string() }` (NEW event type)
   - `architectureTargetDraftedPayloadSchema` — `{ architectureTarget: ContentRefSchema }` (NEW event type — draft, not commit)
   - `architectureTargetCommittedPayloadSchema` — `{ architectureTarget: ContentRefSchema }` (matches reducer: `payload.architectureTarget`)
   - `architectureShapeCheckpointReachedPayloadSchema` — `{}`
   - `architectureShapeApprovedPayloadSchema` — `{}`
   - `architectureShapeCheckpointAutoShapedPayloadSchema` — `{ preference: SteeringPreferenceSchema }` (matches `reducePauseSteering` pattern, event name: `architecture-shape-checkpoint-auto-shaped`)
   - Update the discriminated union / `EpicEventMap` from Phase 2 to include all new types.

2. **Update existing derived state reducers** — In `src/engine/derived-state/reducers.ts`:
   - **Add intermediate fields to `EpicState`** (in `src/schemas/entities/derived-state.ts`): `explorationCycles: number`, `researchRefs: ContentRef[]`, `brainstormRefs: ContentRef[]`, `architectureShapeApproved: boolean`, `sliceSetShapeApproved: boolean`. These track sub-phase progress populated by the new reducer cases below.
   - **Existing cases to update**: Replace `as Record<string, unknown>` casts with typed payload schemas for `epic-goal-drafted`, `epic-goal-committed`, `architecture-target-committed`. The field names already match (`goal`, `architectureTarget`).
   - **New cases to add to `reduceEntityLifecycle`**: `architecture-shape-checkpoint-reached`, `architecture-shape-approved`, `architecture-shape-checkpoint-auto-shaped`, `pressure-test-drafted`, `architecture-target-drafted`. These set the intermediate state fields above (e.g., `architecture-shape-approved` sets `architectureShapeApproved = true`).
   - **New cases to add to `reduceExploration`**: `exploration-cycle-started` (increment `explorationCycles`), `research-captured` (append to `researchRefs`), `brainstorm-captured` (append to `brainstormRefs`). Populate the currently-stubbed `reduceExploration()`. Note: `exploration-concluded` is NOT handled here — it lives in `reduceEntityLifecycle` because it triggers a phase transition.
   - **Exhaustive matching**: Add a comment in the default branch noting that unknown event types are silently skipped for forward compatibility (already present — verify it stays).

3. **Implement goal commands** — `src/commands/epic/goal-draft.ts` and `src/commands/epic/goal-commit.ts`:
   - `goal-draft`: Accept artifact content via stdin, store via `storeContentRef()` from `src/engine/content/store.ts` (created in Phase 2 Task 1), emit `epic-goal-drafted` with `{ goal: contentRef }`
   - `goal-commit`: Run extractor on the goal artifact, emit `epic-goal-committed` with `{ goal: contentRef }`
   - Both follow the v2 command pattern and error handling from Phase 2

4. **Implement exploration commands** — `src/commands/epic/explore-start.ts`, `explore-conclude.ts`, `research-capture.ts`, `brainstorm-capture.ts`:
   - `explore-start`: Emit `exploration-cycle-started` with domain `"exploration"`, return context bundle for exploration phase
   - `explore-conclude`: Emit `exploration-concluded` with domain `"entity-lifecycle"` (intentionally entity-lifecycle, not exploration — this event triggers a phase transition and is handled by `reduceEntityLifecycle`, NOT `reduceExploration`)
   - `research-capture` / `brainstorm-capture`: Store artifact via `storeContentRef()`, emit capture event with domain `"exploration"`

5. **Implement architecture commands** — `src/commands/epic/architecture-draft.ts`, `architecture-commit.ts`, `architecture-shape-start.ts`, `architecture-shape-approve.ts`, `architecture-shape-auto.ts`:
   - `architecture-draft`: Store architecture-target via `storeContentRef()`, emit `architecture-target-drafted` with domain `"entity-lifecycle"`
   - `architecture-commit`: Emit `architecture-target-committed`, advance phase
   - Shape commands: Emit shape checkpoint/approval events with domain `"entity-lifecycle"`

6. **Verify invariant rules for phase transitions** — Most rules already exist (see audit table). Verify coverage:
   - `epic.goal.committed-before-explore` — already exists
   - `epic.architecture-shape-approval-required` — already exists (blocks pressure-test-drafted without shape approval). Update to accept EITHER `architecture-shape-approved` OR `architecture-shape-checkpoint-auto-shaped` (existing code only checks the former).
   - Add if missing: cannot draft architecture without concluded exploration (check if invariant exists)
   - Add if missing: cannot commit goal without a draft

7. **Update `src/commands/main.ts`** — Register all new commands with colon-namespaced keys. Remove v1 `explore.ts` and `define-architecture.ts` registrations.

8. **Create `tests/engine/derived-state/epic-phases.test.ts`** — Unit tests for the new/updated reducers:
   - Replay a sequence of events and verify phase transitions: P0 -> P1 -> P2 -> P3
   - Verify ContentRef fields are populated correctly (using correct field names: `goal`, `architectureTarget`)
   - Verify invalid transitions are rejected by invariants

9. **Extend `tests/commands/epic.test.ts`** — Add CLI integration tests:
   - Full flow: create -> goal-draft -> goal-commit -> explore-start -> explore-conclude -> architecture-draft -> architecture-commit
   - Verify phase advances correctly at each step via `epic:show --json`

### Verification

```bash
bun run check
bun run test -- tests/engine/derived-state/
bun run test -- tests/commands/epic
```

---

## Phase 4: Pressure Test + Slice Definition + Activation Commands

All commands in this phase follow the v2 command pattern established in Phase 2, including the error output contract (`{ ok: false, error: string, code: string }`) and invariant violation handling.

### Objective

Implement the remaining pre-activation commands: pressure testing, slice set definition, and epic activation. After this phase, an epic can be fully activated (reaching P6).

### Expected Behavior

**Before:** Epic can reach P3 (architecture committed). No pressure test, slice, or activation commands.

**After:**
- `epic:pressure-test-draft`, `epic:pressure-test-commit`, `epic:pressure-test-finding-disposition` handle pressure testing (P4)
- `epic:slices-draft`, `epic:slices-commit` handle slice set definition (P5)
- `epic:slice-set-shape-start`, `epic:slice-set-shape-approve`, `epic:slice-set-shape-auto` handle shape checkpoint
- `epic:activate` activates the epic (P6)
- `epic:set-steering` sets per-epic steering preference
- `epic:pause`, `epic:resume` handle epic pause/resume
- `epic:complete` handles epic completion
- Phase transitions P3 -> P4 -> P5 -> P6 work correctly
- Activation creates the approved architecture from the target proposal

### Tasks

1. **Add remaining event payload schemas to `src/schemas/events/epic.ts`** — Schemas for (field names matching existing reducer fields):
   - `pressureTestDraftedPayloadSchema` — `{ pressureTest: ContentRefSchema }`
   - `pressureTestCommittedPayloadSchema` — `{ pressureTest: ContentRefSchema }` (matches reducer: `payload.pressureTest`)
   - `pressureTestFindingAcceptedPayloadSchema` — `{ findingId: z.string(), disposition: z.enum(["accepted", "dismissed"]) }` (matches reducer: `payload.findingId`)
   - `sliceSetDraftedPayloadSchema` — `{ sliceSet: ContentRefSchema }`
   - `sliceSetCommittedPayloadSchema` — `{ sliceSet: ContentRefSchema }` (matches reducer: `payload.sliceSet`)
   - `sliceSetShapeCheckpointReachedPayloadSchema`, `sliceSetShapeApprovedPayloadSchema`, `sliceSetShapeCheckpointAutoShapedPayloadSchema`
   - `epicActivatedPayloadSchema` — `{}` (reducer uses no payload fields)
   - `epicSteeringPreferenceSetPayloadSchema` — `{ preference: SteeringPreferenceSchema }` (matches `reducePauseSteering`: `payload.preference`)
   - `epicPausedPayloadSchema` — `{}`, `epicResumedPayloadSchema` — `{}`
   - `epicCompletedPayloadSchema` — `{}` (reducer uses no payload fields; verification results added later if needed)
   - Update the discriminated union / `EpicEventMap` to include all new types.

2. **Update derived state reducers** — Handle new event types only (existing cases already work):
   - **New to `reduceEntityLifecycle`**: `pressure-test-drafted` (set draft state), `slice-set-drafted` (set draft state), `slice-set-shape-checkpoint-reached`, `slice-set-shape-approved` (sets `sliceSetShapeApproved = true`), `slice-set-shape-checkpoint-auto-shaped` (also sets `sliceSetShapeApproved = true`)
   - **Update existing cases**: Replace `as Record<string, unknown>` casts with typed payload schemas for `pressure-test-committed`, `pressure-test-finding-accepted`, `slice-set-committed`, `epic-activated`, `epic-paused`, `epic-resumed`, `epic-completed`. For `pressure-test-finding-accepted`: read `payload.disposition` from the typed schema and assign to `finding.disposition` — do not hardcode `'accepted'`.
   - **`reducePauseSteering`**: `epic-steering-preference-set` case already exists — update to use typed payload schema

3. **Implement pressure test commands** — `pressure-test-draft.ts`, `pressure-test-commit.ts`, `pressure-test-finding-disposition.ts`

4. **Implement slice set commands** — `slices-draft.ts`, `slices-commit.ts`, `slice-set-shape-start.ts`, `slice-set-shape-approve.ts`, `slice-set-shape-auto.ts`

5. **Implement activation and lifecycle commands** — `activate.ts`, `pause.ts`, `resume.ts`, `complete.ts`, `set-steering.ts`

6. **Verify invariant rules** — Most rules already exist (see audit table). Verify coverage:
   - `epic.architecture-target-required-before-slice-set` — already exists
   - `epic.pressure-test-required-before-slice-set` — already exists
   - `epic.slice-shape-approval-required` — already exists. Update to accept EITHER `slice-set-shape-approved` OR `slice-set-shape-checkpoint-auto-shaped` (existing code only checks the former).
   - `epic.all-slices-landed-before-complete` — already exists
   - Add if missing: cannot activate without committed slice set
   - Add if missing: cannot pause an already-paused epic
   - Add if missing: cannot resume a non-paused epic

7. **Update `src/commands/main.ts`** — Register new commands, remove v1 `activate.ts`, `complete.ts`, `define-slices.ts` registrations.

8. **Add unit tests** — `tests/engine/derived-state/epic-full-lifecycle.test.ts`:
   - Full lifecycle from P0 -> P6 (activation)
   - Pause/resume cycle
   - Steering preference changes
   - Finding disposition updates

9. **Extend CLI integration tests in `tests/commands/epic.test.ts`** — Continue the flow from Phase 3:
   - Architecture -> pressure-test-draft -> commit -> slices-draft -> commit -> activate
   - Verify phase reaches P6

### Verification

```bash
bun run check
bun run test -- tests/engine/
bun run test -- tests/commands/epic
```

---

## Phase 5: Context Bundler Integration + Full CLI Integration Test

### Objective

Integrate the Context Bundler into phase-starting commands, run the end-to-end CLI integration test, and clean up all v1 remnants. Refinement commands (`epic:refine-architecture`, `epic:refine-slices`) are deferred to slice 07 as part of the generic `refine:*` namespace.

### Expected Behavior

**Before:** All core epic commands work but Context Bundler is not wired into command output. No end-to-end CLI integration test.

**After:**
- Context Bundler is invoked by phase-starting commands (e.g., `epic:explore-start`, `epic:architecture-draft`) and returns `ContextBundle` as part of `--json` output
- CLI binary integration test runs the full flow: `gp init` -> `epic:create` -> `goal-draft` -> `goal-commit` -> `explore-start` -> `explore-conclude` -> `architecture-draft` -> `architecture-commit` via `Bun.spawnSync`
- All v1 epic commands removed from `main.ts` (only v2 remain)
- V1 subagent commands for epic flow evaluated for removal or retention

### Tasks

1. **Integrate Context Bundler into phase-starting commands** — Update commands that start a new phase (`epic:explore-start`, `epic:architecture-draft`, etc.) to:
   - Call `buildContextBundle(derivedState, phase, scopeRef)` from `src/context/`
   - Include `contextBundle` in the `--json` output alongside the standard `MutatingCommandOutput` fields
   - The bundle gives skills the inline content and reference paths they need

2. **Evaluate v1 subagent command removal** — The v1 `start-*` and `submit-*` commands in `src/commands/subagent/` are the RPC interface for skills. In v2, skills will call entity commands directly. Determine:
   - Which v1 subagent commands are still needed by non-migrated entities (slice, quest)
   - Remove epic-specific subagent commands: `start-explore`, `submit-explore`, `start-architecture`, `submit-architecture`, `start-slices`, `submit-slices`, `start-refine-architecture`, `submit-refine-architecture`, `start-refine-slices`, `submit-refine-slices`
   - Update `main.ts` to remove their registrations

3. **Clean up v1 epic command remnants** — Remove any v1 imports, v1 RPC calls, or v1 state machine references from epic commands. Ensure all epic commands use the v2 event engine exclusively.

4. **Create `tests/commands/epic.e2e.test.ts`** — Full end-to-end CLI binary integration test:
   ```
   init -> epic:create -> epic:goal-draft (stdin artifact) -> epic:goal-commit
        -> epic:explore-start -> epic:explore-conclude
        -> epic:architecture-draft (stdin artifact) -> epic:architecture-commit
   ```
   - Use `Bun.spawnSync` via the `runCommand` / `runChain` helpers from `tests/integration/helpers.ts`
   - Verify each step returns `{ ok: true }` and phase advances correctly
   - Verify event log has the correct sequence of events (read `.goodplan/epics/<name>/events.jsonl`)
   - Verify context bundle is present in phase-starting command output

5. **Verify no v1 regressions** — Run the full test suite to confirm:
   - v1 slice, quest, task commands still work (they use v1 data layer which is unaffected)
   - v2 engine tests pass
   - Fitness tests pass (layer boundaries respected)

6. **Final fitness test verification** — Confirm `tests/fitness/v2-layer-boundaries.test.ts` (created in Phase 1, Task 8) passes with all new modules from Phases 2-4. Verify no new layer violations from Phase 2-4 wiring.

### Verification

```bash
bun run check                           # full lint + typecheck
bun run test                            # ALL tests pass (unit + integration + fitness + commands)
bun run test -- tests/commands/epic     # epic-specific tests pass
bun run test -- tests/context/          # context bundler tests pass
```

## Cleanup Checklist

- [ ] All v1 epic command files replaced with v2 implementations (see V1-to-V2 File Mapping table)
- [ ] `src/commands/main.ts` has no v1 epic imports remaining
- [ ] No `src/core/rpc/` imports in any `src/commands/epic/*.ts` file
- [ ] `src/context/` exports only through `index.ts` barrel
- [ ] All new files are kebab-case and follow repo conventions
- [ ] No `as any` or `@ts-ignore` in any new code
- [ ] Event type names follow `kebab-case` convention: `epic-created`, `epic-abandoned`, etc.
- [ ] All event payload schemas use field names matching existing reducer expectations
- [ ] `EpicEventMap` mapped type covers all epic event types for compile-time narrowing (no `_type` in payloads — envelope `type` is the discriminant)
- [ ] All optional properties use conditional spread pattern (`exactOptionalPropertyTypes` compliance)
- [ ] Refinement commands deferred to slice 07 (`refine:*` generic namespace)
- [ ] `ContentRef` imported from `src/schemas/envelope.ts`, not redefined
- [ ] `scopeRef: string | null` used directly, no separate `ScopeRef` type created
