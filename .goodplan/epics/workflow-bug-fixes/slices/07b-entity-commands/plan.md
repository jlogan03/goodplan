# Implementation Plan: 07b-entity-commands

## Goal

Implement 19 CLI commands across 6 entity types (subsystems, project, briefings, findings, invariants, events) that are blocking for slices 08-12. All commands follow the established `defineCommand`/citty pattern with `--json` output, activity-log events on mutations, and integration tests against the built binary.

**Reducer-first architecture**: All new entity state is computed via the existing single-replay-pass `computeDerivedState()` in `src/engine/derived-state/compute.ts`. New entity types extend `DerivedStateData` with new fields and flesh out the existing stub reducers (`reduceSpine`, `reduceFinding`, `reduceBriefing`) in `reducers.ts`. Commands call `computeDerivedState(events)` and read the fields they need from the result. No standalone `compute-*.ts` files are created.

## Cross-Cutting Implementation Notes

These apply to **all phases** and must be followed throughout:

1. **`exactOptionalPropertyTypes`**: All Zod schemas with `.optional()` fields must use the conditional spread pattern per project conventions (e.g., `...(value !== undefined ? { field: value } : {})`). This applies to every phase that introduces schemas, not just Phase 1.

2. **ESM `.js` import extensions**: All TypeScript imports must use `.js` extensions (e.g., `import { foo } from "./bar.js"`) as required by the project's `verbatimModuleSyntax` setting. This applies to every new file.

3. **Activity-log mechanism**: `appendEvent()` itself serves as the activity log -- every domain event written via `appendEvent` IS the activity record. No separate activity-log emission is needed for mutation commands. The goal's "activity-log events on mutations" is satisfied by the domain events themselves.

4. **`MutatingCommandOutput` contract**: Mutation commands return `{ ok: true, event: "<uuid>", entity: "<type>:<ref>" }` per the architecture contract defined in `.goodplan/epics/workflow-bug-fixes/architecture/commands.md`. This is not a formal TypeScript type export but a JSON output shape convention enforced by pattern (see `init.ts`, `epic/create.ts` for examples).

5. **Error code convention**: Use `ENTITY_NOT_FOUND` (the codebase convention, matching `command-context.ts`) rather than the architecture doc's `NOT_FOUND`.

6. **Barrel re-exports**: Schema constants go in `export { }` blocks; payload types go in `export type { }` blocks to satisfy `verbatimModuleSyntax`.

7. **`events:query` pagination**: `--offset` is a known limitation deferred to a later slice. The initial implementation supports `--limit` only.

8. **`narrowPayload` pattern**: All new reducer handlers must use the `narrowPayload` helper (Zod `safeParse` for type-safe erased envelope access) established in slice 02. Import from the shared location where it is defined (likely `src/engine/derived-state/reducers.ts` or a utility module). Every `case` branch in `reduceSpine`, `reduceBriefing`, and `reduceEntityLifecycle` (for new event types) narrows via `narrowPayload(event, schema)` before accessing payload fields.

9. **Shared command boilerplate**: The `createEventCommandContext` overload extension (Phase 1 Task 4) IS the boilerplate extraction for this slice. All 19 new commands use this shared helper — no additional extraction layer is needed. This satisfies the slice 05 learning "extract shared command boilerplate before building 25+ commands."

10. **New `DerivedStateData` fields**: Extend the interface in `src/schemas/entities/derived-state.ts` with:
   - `subsystems: Map<string, SubsystemState>` — populated by `reduceSpine`
   - `projectFindings: Finding[]` — project-level findings populated by `reduceFinding`
   - `customInvariants: Map<string, CustomInvariantState>` — populated by `reduceSpine` (invariant events use `domain: "spine"`)
   - `briefings: Briefing[]` — populated by `reduceBriefing`

   New state types (defined in `derived-state.ts`):
   ```ts
   interface SubsystemState { name: string; maturity: "experimental" | "stable" | "mature" | "deprecated"; owns: string[]; retired: boolean }
   interface CustomInvariantState { id: string; description: string; status: "proposed" | "active" | "inactive" }
   interface Briefing { scope: "project" | "epic"; scopeRef: string | null; timeContext: string; currentPosition: string; lastAction: string; whereStopped: string; nextAction: string; attentionItems: string[]; deepLinks?: Array<{ label: string; path: string }>; writtenAt: string }
   ```

   Event log population per field:
   - `subsystems` — populated from **project** events (domain `"spine"`)
   - `customInvariants` — populated from **project** events (domain `"spine"`)
   - `briefings` — populated from **both** project and epic events (domain `"briefing"`); the `scope` discriminator on each `Briefing` record identifies which log it came from
   - Epic findings — populated from **epic** events (domain `"entity-lifecycle"`) via the existing `reduceEntityLifecycle`; stored in `epic.findings`, not in a top-level `DerivedStateData` field

11. **`main.ts` scaling**: Adding 19 new command imports to `main.ts` is acknowledged tech debt. Namespace-based lazy loading (e.g., `subsystem:*` loads the subsystem module on demand) is deferred to a later slice.

## Architecture Context

The codebase has two mutation patterns coexisting during the v1-to-v2 migration:

- **v1 pattern**: `begin()` RPC through the state machine (used by decision, learning, task, quest commands). Stores data in `.goodplan/*.jsonl` files. The v1 `begin()` function in `src/core/rpc/begin.ts` maps phases to `StateEvent` types, reduces state, and commits.
- **v2 pattern**: `appendEvent()` through the event engine (used by epic, slice commands). Stores events in scoped `events.jsonl` files with envelope schema, invariant checking via `beforeAppend`.

The new entity commands in this slice use a **hybrid approach**: some entities (subsystems, briefings, findings) are best modeled as v2 events appended to scoped event logs (project or epic scope), while project and invariant commands may read/write to existing data structures. The events commands are purely read-only (tail/query over existing JSONL event logs).

**Key shared infrastructure:**
- `src/commands/_shared/command-context.ts` -- `createEventCommandContext()` for epic-scoped v2 commands
- `src/commands/global-args.ts` -- `globalArgs` and `listArgs`
- `src/engine/events/append.ts` -- `appendEvent()` for v2 mutations
- `src/engine/invariants/` -- invariant registry, checker, YAML loader
- `src/util/output.ts` -- `output()` for JSON/human formatting
- `src/util/stdin.ts` -- `readStdin()` for stdin JSON parsing

---

## Phase 1: Subsystem Commands

### Objective

Implement 5 commands (`subsystem:register`, `subsystem:list`, `subsystem:show`, `subsystem:update-maturity`, `subsystem:retire`). These are blocking for slice 08 (init, context bundling) which needs to register subsystems and query their maturity levels.

### Expected Behavior

**RED (before)**:
- `gp subsystem:list --json` exits with "unknown command" error
- `gp subsystem:register --json` exits with "unknown command" error
- No `src/commands/subsystem/` directory exists

**GREEN (after)**:
- `gp subsystem:register --json` with stdin `{ "name": "auth", "maturity": "experimental", "owns": ["src/auth/**"] }` returns `{ ok: true, event: "<uuid>", entity: "subsystem:auth" }`
- `gp subsystem:list --json` returns `{ ok: true, total: N, items: [...] }` with registered subsystems
- `gp subsystem:show --name auth --json` returns full subsystem details
- `gp subsystem:update-maturity --name auth --json` with stdin `{ "maturity": "stable" }` returns mutating output
- `gp subsystem:retire --name auth --json` returns mutating output
- Build succeeds with zero TS errors

### Tasks

1. **Extend `EventDomainSchema`** in `src/schemas/envelope.ts`:
   - Verify which domains already exist. Currently: `"entity-lifecycle"`, `"spine"`, `"refinement"`, `"exploration"`, `"pressure-test"`, `"finding"`, `"briefing"`, `"decision-learning"`, `"pause-steering"`, `"reshape"`, `"milestone"`.
   - `"spine"` already covers subsystem events and will also cover custom invariant events (Phase 5). `"briefing"` and `"finding"` already exist. No new domains needed.
   - No changes needed for subsystem commands since `"spine"` is already present.

2. **Create event payload schemas** in `src/schemas/events/subsystem.ts` (new file, following entity-per-file convention matching `epic.ts`, `slice.ts`):
   - `subsystemRegisteredPayloadSchema`: `{ name: z.string(), maturity: z.enum(["experimental", "stable", "mature", "deprecated"]), owns: z.array(z.string()) }` — the `owns` field (file glob patterns the subsystem covers) is critical for reviewer routing in 07a's `routeReviewers(artifactType, affectedSubsystems, maxMaturity)` which maps changed files to subsystem ownership
   - `subsystemMaturityUpdatedPayloadSchema`: `{ name: z.string(), maturity: z.enum([...]), previousMaturity: z.string() }`
   - `subsystemRetiredPayloadSchema`: `{ name: z.string() }`
   - Define `SubsystemEventMap` type mapping event type strings to payload schemas (following `EpicEventMap`/`SliceEventMap` pattern from `src/schemas/events/epic.ts`). Named `SubsystemEventMap` (not `SpineEventMap`) to match the entity-per-file convention where the file is `subsystem.ts`.
   - Export types and schemas from `src/schemas/events/index.ts` (schema constants in `export { }`, payload types in `export type { }` per `verbatimModuleSyntax`)

3. **Create command input schemas** in `src/schemas/commands/subsystem.ts` (new file):
   - `registerSubsystemInputSchema`: validates stdin for register
   - `updateMaturityInputSchema`: validates stdin for update-maturity

4. **Extend `createEventCommandContext` for project scope** in `src/commands/_shared/command-context.ts`:
   - Do NOT create a parallel `project-command-context.ts`. Instead, extend the existing `createEventCommandContext` to support both scopes via a discriminated union on a `scope` parameter.
   - Backward compatibility is achieved via function overloads: the existing signature `(args, opts: { requireSlice: boolean })` remains as an overload that defaults `scope` to `"epic"` internally — existing callers do not change. New callers use the explicit `{ scope: "project" }` or `{ scope: "epic"; requireSlice: boolean }` overload signatures.
   - Options type for new overloads: `{ scope: "project" } | { scope: "epic"; requireSlice: false } | { scope: "epic"; requireSlice: true }`.
   - Return type discriminated union:
     ```ts
     // Project scope
     { scope: "project"; goodplanDir: string; projectEventsPath: string; branch: string; commitHint: string | null; beforeAppend: BeforeAppendFn }
     // Epic scope without slice
     | { scope: "epic"; goodplanDir: string; epicName: string; epicEventsPath: string; branch: string; commitHint: string | null; beforeAppend: BeforeAppendFn; sliceName?: undefined }
     // Epic scope with slice
     | { scope: "epic"; goodplanDir: string; epicName: string; epicEventsPath: string; branch: string; commitHint: string | null; beforeAppend: BeforeAppendFn; sliceName: string }
     ```
   - For project scope: resolve `goodplanDir`, `projectEventsPath` (`.goodplan/events.jsonl`), git info, invariant `beforeAppend` hook wired to the project events path.
   - This extended helper will be reused by subsystem, project, briefing (project-scope), finding (project-scope), and invariant commands.

5. **Create `src/commands/subsystem/` directory** with 5 command files:
   - `register.ts`: Read stdin, validate, call `appendEvent` with `domain: "spine"`, `type: "subsystem-registered"`, `scope: "project"`. Output per `MutatingCommandOutput` contract.
   - `list.ts`: Replay project events via `computeDerivedState()`, read `state.subsystems`. Return `{ ok: true, total, items }`.
   - `show.ts`: Like list but filter to `--name` arg. Return full subsystem detail. Error with `ENTITY_NOT_FOUND` if missing.
   - `update-maturity.ts`: Read stdin `{ maturity }`, validate subsystem exists (via `computeDerivedState().subsystems`), append `subsystem-maturity-updated` event.
   - `retire.ts`: Validate subsystem exists and is not already retired, append `subsystem-retired` event.

6. **Flesh out `reduceSpine` stub** in `src/engine/derived-state/reducers.ts`:
   - Handle `subsystem-registered`: create entry in `state.subsystems` Map with `{ name, maturity, owns, retired: false }`.
   - Handle `subsystem-maturity-updated`: update the `maturity` field on the existing entry.
   - Handle `subsystem-retired`: set `retired: true` on the existing entry.
   - Handle `invariant-proposed`, `invariant-activated`, `invariant-deactivated`: manage `state.customInvariants` Map (shared with Phase 5, but the reducer handles both subsystem and invariant spine events).
   - Commands read subsystem state via `computeDerivedState(events).subsystems`. No standalone `compute-subsystems.ts` file.
   - Extend `DerivedStateData` interface in `src/schemas/entities/derived-state.ts` AND update `createEmptyState()` in `compute.ts` as a single atomic step: add `subsystems: Map<string, SubsystemState>` and `customInvariants: Map<string, CustomInvariantState>` to the interface, and `subsystems: new Map()` and `customInvariants: new Map()` to the empty state factory.

7. **Register all 5 commands** in `src/commands/main.ts`:
   - Add imports for each command
   - Add entries to `subCommands`: `"subsystem:register"`, `"subsystem:list"`, `"subsystem:show"`, `"subsystem:update-maturity"`, `"subsystem:retire"`

8. **Write integration test** in `tests/integration/subsystem-commands.test.ts`:
   - Use `withTempDir` + `runCommand` pattern from `tests/integration/helpers.ts`
   - Test: init project, register subsystem, list (verify in output), show (verify fields), update-maturity, retire, list again (verify retired not shown or marked)
   - Test error cases: show nonexistent, register duplicate name, retire already retired

### Verification

```bash
bun run build && bun run check
bun test tests/integration/subsystem-commands.test.ts
```

---

## Phase 2: Project Commands

### Objective

Implement 2 commands (`project:show`, `project:set-steering`). These are blocking for slice 08 (status) and slice 09 (create-epic) which need to query project metadata and steering preferences.

### Expected Behavior

**RED (before)**:
- `gp project:show --json` exits with "unknown command" error
- `gp project:set-steering --json` exits with "unknown command" error

**GREEN (after)**:
- `gp project:show --json` returns project metadata: `{ ok: true, name: "...", steeringPreference: "always-consult", subsystems: [...] }`
- `gp project:set-steering --json` with stdin `{ "preference": "best-guess-and-flag" }` returns `{ ok: true, event: "<uuid>", entity: "project" }`
- Subsequent `project:show` reflects the new steering preference
- Build succeeds with zero TS errors

### Tasks

1. **Confirm `steering-preference-set` alignment** -- no new event payload schema needed:
   - The existing `reducePauseSteering` in `reducers.ts` already handles the `steering-preference-set` event type, reading `payload.preference` and writing to `state.project.steeringPreference` (when `scopeRef === null` for project scope).
   - The `set-steering` command reuses this same event type string (`"steering-preference-set"`) and payload shape `{ preference: SteeringPreference }`. It appends to the project-scope event log with `scopeRef: null`.
   - If a formal payload schema file is desired for documentation, create `src/schemas/events/project.ts` with `steeringPreferenceSetPayloadSchema` reusing `SteeringPreferenceSchema` from `derived-state.js`. But this is optional since the reducer already handles it.
   - Define `ProjectEventMap` type mapping event type strings to payload schemas (following `EpicEventMap` pattern)
   - Export from `src/schemas/events/index.ts`

2. **Create command input schema** in `src/schemas/commands/project.ts` (new file):
   - `setSteeringInputSchema`: validates the steering preference input, reusing `SteeringPreferenceSchema`

3. **Create `src/commands/project/` directory** with 2 command files:
   - `show.ts`: Use project-scope `createEventCommandContext`, replay events via `computeDerivedState()`. Read `state.project` (name, steeringPreference, initialized) and `state.subsystems` to compose the output. No standalone `computeProjectState()` needed.
   - `set-steering.ts`: Read stdin, validate, append `steering-preference-set` event with `domain: "pause-steering"` to project scope (with `scopeRef: null`). The existing `reducePauseSteering` already handles this event type. Output per `MutatingCommandOutput` contract.

4. **Register commands** in `src/commands/main.ts`:
   - Add `"project:show"` and `"project:set-steering"` to `subCommands`

5. **Write integration test** in `tests/integration/project-commands.test.ts`:
   - Init project, show (verify defaults), set-steering, show again (verify updated)
   - Test: set-steering with invalid preference returns validation error

### Verification

```bash
bun run build && bun run check
bun test tests/integration/project-commands.test.ts
```

---

## Phase 3: Briefing Commands

### Objective

Implement 2 commands (`briefing:write`, `briefing:latest`). These are blocking for slice 08 (status output shows latest briefing) and slices 09-11 (pause discipline requires writing briefings at pause points).

### Expected Behavior

**RED (before)**:
- `gp briefing:write --json` exits with "unknown command" error
- `gp briefing:latest --json` exits with "unknown command" error

**GREEN (after)**:
- `gp briefing:write --json --scope epic --epic my-epic` with stdin `{ "timeContext": "2h into Phase 3", "currentPosition": "Phase 3 Task 2", "lastAction": "Completed reducer tests", "whereStopped": "Starting integration test", "nextAction": "Write briefing-commands.test.ts", "attentionItems": ["Blocker: need to resolve scope helper"] }` returns `{ ok: true, event: "<uuid>", entity: "briefing:..." }`
- `gp briefing:latest --json` returns the most recently written briefing for the given scope, or `{ ok: true, briefing: null }` if none exists
- Build succeeds with zero TS errors

### Tasks

1. **Create event payload schema** in `src/schemas/events/briefing.ts` (new file, entity-per-file convention):
   - `briefingWrittenPayloadSchema`: Structured to align with `BriefingExtract` from the architecture (trust.md extractor spec):
     ```ts
     {
       timeContext: z.string(),          // e.g., "2h into Phase 3"
       currentPosition: z.string(),      // what phase/chunk/step
       lastAction: z.string(),           // what was just completed
       whereStopped: z.string(),         // exact stopping point
       nextAction: z.string(),           // immediate next step
       attentionItems: z.array(z.string()), // blockers, risks, decisions needed
       deepLinks: z.array(z.object({ label: z.string(), path: z.string() })).optional(), // file refs for quick resume
     }
     ```
     (scope and scopeRef are envelope-level fields, not payload fields)
   - Events use `domain: "briefing"` (already exists in `EventDomainSchema`)
   - Define `BriefingEventMap` type mapping event type strings to payload schemas (following `EpicEventMap` pattern)
   - Export from `src/schemas/events/index.ts`

2. **Create command input schema** in `src/schemas/commands/briefing.ts` (new file):
   - `writeBriefingInputSchema`: validates stdin for briefing:write

3. **Create `src/commands/briefing/` directory** with 2 command files:
   - `write.ts`: Accept `--scope` (project|epic, default project) and `--epic` as CLI flags (known before context creation, avoids sequencing issues with stdin). Read stdin for structured briefing data (`{ timeContext, currentPosition, lastAction, whereStopped, nextAction, attentionItems, deepLinks? }`). Create `createEventCommandContext` with the appropriate scope based on `--scope` flag. Append `briefing-written` event. Output `MutatingCommandOutput`.
   - `latest.ts`: Accept `--scope` and `--scope-ref` flags (optional, default to project scope). Replay events via `computeDerivedState()`, read `state.briefings` filtered by scope. Return latest or `null`.

4. **Flesh out `reduceBriefing` stub** in `src/engine/derived-state/reducers.ts`:
   - Handle `briefing-written`: use `narrowPayload(event, briefingWrittenPayloadSchema)`, then push to `state.briefings` array with `{ scope: event.scopeRef === null ? "project" : "epic", scopeRef: event.scopeRef, timeContext, currentPosition, lastAction, whereStopped, nextAction, attentionItems, deepLinks, writtenAt: event.timestamp }`.
   - Extend `DerivedStateData` interface in `src/schemas/entities/derived-state.ts` AND update `createEmptyState()` in `compute.ts` as a single atomic step: add `briefings: Briefing[]` to the interface, and `briefings: []` to the empty state factory.

5. **Register commands** in `src/commands/main.ts`:
   - Add `"briefing:write"` and `"briefing:latest"` to `subCommands`

6. **Write integration test** in `tests/integration/briefing-commands.test.ts`:
   - Init project, create epic, write briefing (epic scope), latest (verify content), write another, latest (verify most recent returned)
   - Test: latest with no briefings returns `{ ok: true, briefing: null }`
   - Test: project-scope briefing (no epic needed)

### Verification

```bash
bun run build && bun run check
bun test tests/integration/briefing-commands.test.ts
```

---

## Phase 4: Finding Commands

### Objective

Implement 3 commands (`finding:capture`, `finding:list`, `finding:triage`). These are blocking for slice 10 (land-slice P12) which uses findings for deferred-item tracking during implementation.

### Expected Behavior

**RED (before)**:
- `gp finding:capture --json` exits with "unknown command" error
- `gp finding:list --json` exits with "unknown command" error
- `gp finding:triage --json` exits with "unknown command" error

**GREEN (after)**:
- `gp finding:capture --json --epic my-epic` with stdin `{ "summary": "Auth module needs refactor", "severity": "important", "context": "Discovered during chunk 3" }` returns `{ ok: true, event: "<uuid>", entity: "finding:..." }`
- `gp finding:list --json --epic my-epic` returns `{ ok: true, total: N, items: [...] }` with captured findings
- `gp finding:triage --json --epic my-epic` with stdin `{ "findingId": "<id>", "disposition": "accepted", "reason": "Will address in next slice" }` returns mutating output
- Build succeeds with zero TS errors

### Tasks

1. **Create event payload schemas** in `src/schemas/events/finding.ts` (new file, entity-per-file convention):
   - `findingCapturedPayloadSchema`: Structured to align with `FindingExtract` from the architecture (trust.md extractor spec):
     ```ts
     {
       findingId: z.string().uuid(),
       summary: z.string(),
       severity: z.enum(["blocking", "critical", "important", "minor"]),
       classification: z.object({
         blocking: z.boolean(),       // blocking vs non-blocking
         inScope: z.boolean(),        // in-scope vs out-of-scope
       }),
       relatedSubsystems: z.array(z.string()).optional(),  // subsystem IDs affected
       reshape: z.boolean().optional(),  // true if finding suggests architectural reshape
       context: z.string().optional(),
       sliceRef: z.string().optional(),
     }
     ```
     Uses `findingId` and `summary` (not `id`/`title`) to match the existing `reduceEntityLifecycle` handler for `finding-captured` which reads `payload.findingId` and `payload.summary`. The `classification`, `relatedSubsystems`, and `reshape` fields come from the architecture's `FindingExtract` spec and enable downstream reviewer routing and triage decisions.
   - `findingTriagedPayloadSchema`: `{ findingId: z.string().uuid(), disposition: z.enum(["accepted", "dismissed", "deferred"]), reason: z.string() }`
   - Events use `domain: "entity-lifecycle"` (epic-scoped findings are entity-lifecycle events, handled by `reduceEntityLifecycle`). The `"finding"` domain in `EventDomainSchema` is reserved for future project-scope findings.
   - Define `FindingEventMap` type mapping event type strings to payload schemas (following `EpicEventMap` pattern)
   - Export from `src/schemas/events/index.ts`

2. **Create command input schemas** in `src/schemas/commands/finding.ts` (new file):
   - `captureFindingInputSchema`: validates stdin for finding:capture
   - `triageFindingInputSchema`: validates stdin for finding:triage

3. **Flesh out `reduceFinding` stub** in `src/engine/derived-state/reducers.ts`:
   - `reduceFinding` handles `domain: "finding"` events from the **project** event log only. Epic-scoped findings (domain `"entity-lifecycle"`) are already handled by the existing `reduceEntityLifecycle` which pushes to `epic.findings` — do not duplicate that logic here.
   - `finding:capture` uses epic scope (domain `"entity-lifecycle"`, handled by `reduceEntityLifecycle`). `finding:list` reads from `epic.findings` in epic state, not from any `projectFindings` field.
   - The `reduceFinding` stub is reserved for a future project-scope findings feature. Do **not** add a `projectFindings` field to `DerivedStateData` in this slice — it is not needed. Leave the stub as a no-op or with a comment noting the intended future use.
   - `Finding.disposition` union (used in `epic.findings`) must include `"deferred"`: `"accepted" | "dismissed" | "deferred" | "pending"`. Add this as an explicit atomic step in `derived-state.ts`.

4. **Add `case "finding-triaged"` to `reduceEntityLifecycle`** in `src/engine/derived-state/reducers.ts`:
   - The existing `reduceEntityLifecycle` handles `finding-captured` but has no handler for `finding-triaged`. Add a `case "finding-triaged"` that:
     - Uses `narrowPayload(event, findingTriagedPayloadSchema)` to type-narrow the payload
     - Finds the matching finding in `epic.findings` by `payload.findingId`
     - Updates `finding.disposition` to `payload.disposition`
   - The `triage.ts` command appends with `domain: "entity-lifecycle"` (same domain as `finding-captured`) so the reducer sees both events in the same replay pass.

5. **Create `src/commands/finding/` directory** with 3 command files:
   - `capture.ts`: Read stdin, validate, use `createEventCommandContext` (epic scope, domain `"entity-lifecycle"`), generate UUID for finding ID, append `finding-captured` event. The existing `reduceEntityLifecycle` handles this event. Output `MutatingCommandOutput`.
   - `list.ts`: Use epic context, replay epic events via `computeDerivedState()`, read `state.epics.get(epicName)?.findings`. Accept `--status` filter (untriaged, accepted, dismissed, deferred). Return `{ ok: true, total, items }`.
   - `triage.ts`: Read stdin, validate finding exists in `epic.findings` (via `computeDerivedState()`), append `finding-triaged` event with `domain: "entity-lifecycle"`. Error with `ENTITY_NOT_FOUND` if finding ID not found.

6. **Register commands** in `src/commands/main.ts`:
   - Add `"finding:capture"`, `"finding:list"`, `"finding:triage"` to `subCommands`

7. **Write integration test** in `tests/integration/finding-commands.test.ts`:
   - Init project, create epic, capture finding, list (verify), triage, list (verify disposition)
   - Test error: triage nonexistent finding
   - Test filter: list --status=untriaged after triaging

### Verification

```bash
bun run build && bun run check
bun test tests/integration/finding-commands.test.ts
```

---

## Phase 5: Invariant Commands

### Objective

Implement 5 commands (`invariant:list`, `invariant:check`, `invariant:propose`, `invariant:activate`, `invariant:deactivate`). These are blocking for slice 11 (audit) which needs to check invariants and manage custom invariant rules.

### Expected Behavior

**RED (before)**:
- `gp invariant:list --json` exits with "unknown command" error
- `gp invariant:check --json` exits with "unknown command" error

**GREEN (after)**:
- `gp invariant:list --json` returns `{ ok: true, total: N, items: [...] }` listing core invariant rules plus any custom proposed/activated rules
- `gp invariant:check --json` runs all active invariants and returns `{ ok: true, passed: true, results: [...], violations: [] }` or `{ ok: true, passed: false, results: [...], violations: [...] }` with per-invariant structured results
- `gp invariant:propose --json` with stdin `{ "id": "custom.no-large-files", "description": "...", "type": "custom" }` returns mutating output
- `gp invariant:activate --json` with stdin `{ "id": "custom.no-large-files" }` returns mutating output
- `gp invariant:deactivate --json` with stdin `{ "id": "custom.no-large-files" }` returns mutating output
- Build succeeds with zero TS errors

### Tasks

1. **Create event payload schemas** in `src/schemas/events/invariant.ts` (new file, entity-per-file convention):
   - `invariantProposedPayloadSchema`: `{ invariantId: z.string(), description: z.string(), type: z.literal("custom"), rule: z.string().optional() }`
   - `invariantActivatedPayloadSchema`: `{ invariantId: z.string() }`
   - `invariantDeactivatedPayloadSchema`: `{ invariantId: z.string() }`
   - Events use `domain: "spine"`. Custom invariants are part of the project spine — no separate `"invariant"` domain needed.
   - Define `InvariantEventMap` type mapping event type strings to payload schemas (following `EpicEventMap` pattern)
   - Export from `src/schemas/events/index.ts`

2. **Create command input schemas** in `src/schemas/commands/invariant.ts` (new file):
   - `proposeInvariantInputSchema`, `activateInvariantInputSchema`, `deactivateInvariantInputSchema`

3. **Create `src/commands/invariant/` directory** with 5 command files:
   - `list.ts`: Read-only. Combine core invariant rules from `createCoreRegistry()` (from `src/engine/invariants/index.ts`) with custom invariants from `computeDerivedState(events).customInvariants`. Return `{ ok: true, total, items }` where each item has `{ id, description, type, active }`.
   - `check.ts`: Read-only. Run all active invariants against current derived state. Use the existing `checkInvariants` function from the invariant engine. Accept optional `--scope` flag to check a specific scope. Return structured output consumable by `reviewer-invariant-checker` (from trust.md):
     ```ts
     {
       ok: true,
       passed: boolean,
       results: Array<{ invariantId: string; passed: boolean; message: string }>,
       violations: Array<{ invariantId: string; message: string; severity: string }>  // subset of results where passed=false
     }
     ```
     The `results` array gives per-invariant pass/fail status that `reviewer-invariant-checker` uses to score artifacts against active invariants.
   - `propose.ts`: Read stdin, validate, append `invariant-proposed` event to project scope. Output `MutatingCommandOutput`.
   - `activate.ts`: Read stdin, validate invariant exists and is proposed (not already active), append `invariant-activated` event. Output `MutatingCommandOutput`.
   - `deactivate.ts`: Read stdin, validate invariant is active, append `invariant-deactivated` event. Output `MutatingCommandOutput`.

4. **Custom invariant state via `reduceSpine`** (already wired in Phase 1, task 6):
   - The `reduceSpine` handler in `reducers.ts` already handles `invariant-proposed`, `invariant-activated`, `invariant-deactivated` events, managing `state.customInvariants` Map.
   - Commands read custom invariant state via `computeDerivedState(events).customInvariants`. No standalone `compute-custom-invariants.ts` file.

5. **Register commands** in `src/commands/main.ts`:
   - Add `"invariant:list"`, `"invariant:check"`, `"invariant:propose"`, `"invariant:activate"`, `"invariant:deactivate"` to `subCommands`

6. **Write integration test** in `tests/integration/invariant-commands.test.ts`:
   - Init project, list (shows core invariants), check (passes on fresh project), propose custom, list (shows proposed), activate, list (shows active), deactivate, list (shows inactive)
   - Test: activate nonexistent returns error, deactivate already-inactive returns error
   - Test: check with an epic that has violations

### Verification

```bash
bun run build && bun run check
bun test tests/integration/invariant-commands.test.ts
```

---

## Phase 6: Events Commands

### Objective

Implement 2 read-only commands (`events:tail`, `events:query`). These are nice-to-have for the verification harness and useful for debugging event logs during development.

### Expected Behavior

**RED (before)**:
- `gp events:tail --json` exits with "unknown command" error
- `gp events:query --json` exits with "unknown command" error

**GREEN (after)**:
- `gp events:tail --json` returns the last N events (default 10) from a scope's event log
- `gp events:tail --json -n 5 --scope epic --scope-ref my-epic` returns last 5 events from the epic's log
- `gp events:query --json --type slice-created --scope epic --scope-ref my-epic` returns events matching the type filter
- `gp events:query --json --domain entity-lifecycle` returns all events in that domain
- Build succeeds with zero TS errors

### Tasks

1. **Create `src/commands/events/` directory** with 2 command files:
   - `tail.ts`: Read-only. Accept `--scope` (project|epic|side-quest, default project), `--scope-ref`, `-n` (count, default 10). Use `replayEvents()` from `src/engine/events/replay.js` to read and parse events, then return the last N. Output `{ ok: true, total: N, items: [...] }`.
   - `query.ts`: Read-only. Accept `--scope`, `--scope-ref`, `--type` (event type filter), `--domain` (domain filter), `--after` (ISO timestamp), `--before` (ISO timestamp), `--limit` (default 50). Use `replayEvents()` with appropriate `ReplayFilter` to read and filter events. Output `{ ok: true, total: N, items: [...] }`.

2. **Create scope-to-path resolver** in `src/commands/_shared/resolve-scope-path.ts` (shared location — other command namespaces may need this helper):
   - Small helper that maps `(scope, scopeRef, goodplanDir)` to the correct `events.jsonl` path: project scope -> `.goodplan/events.jsonl`, epic scope -> `.goodplan/epics/<ref>/events.jsonl`, etc.
   - Do NOT create a full event reader -- `replayEvents()` already handles JSONL parsing, corruption recovery, and typed envelope return. Reuse it directly.

3. **Register commands** in `src/commands/main.ts`:
   - Add `"events:tail"` and `"events:query"` to `subCommands`

4. **Write integration test** in `tests/integration/events-commands.test.ts`:
   - Init project, create epic, create slice within epic
   - `events:tail --json --scope epic --scope-ref <name>` returns events with correct structure
   - `events:query --json --type epic-created --scope epic --scope-ref <name>` returns exactly 1 match
   - `events:tail --json -n 1` returns only the most recent project event
   - Test: query with no matches returns empty items array
   - Test: tail on nonexistent scope returns error

### Verification

```bash
bun run build && bun run check
bun test tests/integration/events-commands.test.ts
```

---

## Phase 7: Full Integration Test

### Objective

Run all tests together, verify no regressions across the full command set, confirm the build is clean.

### Expected Behavior

**RED (before)**:
- N/A (this is validation only)

**GREEN (after)**:
- All existing tests pass (`bun run test`)
- All new integration tests pass
- `bun run check` (lint + typecheck) passes with zero errors
- `bun run build` succeeds
- All 19 new commands appear in `gp --help` output

### Tasks

1. **Run the full test suite**: `bun run test` -- verify no regressions in existing tests
2. **Run biome check**: `bun run check` -- zero lint/type errors
3. **Run build**: `bun run build` -- clean build
4. **Verify help output**: `gp --help` shows subsystem, project, briefing, finding, invariant, and events namespaces
5. **Spot-check**: Run a quick end-to-end sequence manually:
   ```
   gp init --non-interactive
   gp subsystem:register (stdin: {"name":"core","maturity":"experimental","owns":["src/**"]})
   gp project:set-steering (stdin: {"preference":"best-guess-and-flag"})
   gp project:show --json
   gp events:tail --json -n 5
   gp invariant:list --json
   gp invariant:check --json
   ```

### Verification

```bash
bun run check
bun run test
bun run build
```
