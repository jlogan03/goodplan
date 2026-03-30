# Codebase Context for Slice 06: Decisions, Learnings & Full Status

## Documentation Freshness

| Document | Last Updated | Verdict |
|---|---|---|
| `architecture/_overview.md` | 2026-03-22 (sub-agent-commands phase 5) | Fresh |
| `architecture/state-machine-api.md` | 2026-03-22 (slice-lifecycle phase 1) | Fresh — already includes CREATE_DECISION, UPDATE_DECISION, ROLLUP_LEARNINGS event specs |
| `architecture/transition-tables.md` | 2026-03-22 (sub-agent-commands phase 2) | Fresh — includes full Decision transition table |
| `architecture/rpc-layer-api.md` | 2026-03-22 (sub-agent-commands complete) | Fresh |
| `architecture/commands-api.md` | 2026-03-21 (refine architecture) | Fresh — already maps `decision:create`, `decision:update`, `learning:rollup` to events |
| `architecture/conventions.md` | 2026-03-21 (refine architecture) | Fresh |
| `architecture/data-model.md` | 2026-03-21 (refine architecture) | Fresh |
| `architecture/flows.md` | 2026-03-21 (refine architecture) | Fresh |
| `architecture/data-layer-api.md` | 2026-03-21 | Fresh |
| `architecture/invariants.md` | 2026-03-21 (refine architecture) | Fresh |
| `.project/conventions.md` | 2026-03-22 (sub-agent-commands phase 5) | Fresh |
| `.project/learnings.md` | 2026-03-22 (sub-agent-commands complete) | Fresh |
| `slices/06/goal.md` | 2026-03-22 | Fresh (most recent commit) |

All architecture docs are fresh (last 2 days). No staleness concerns.

## Recent Development Activity

Slices 01-05 are complete. The most recent work (sub-agent-commands, slice 05) established:
- Quest lifecycle (CREATE_QUEST through COMPLETE_QUEST) — mirrors slice lifecycle
- Context bundling for sub-agents (start-*/submit-* commands)
- 8 start-* and 8 submit-* commands using factory-like patterns

The full commit history shows a consistent bottom-up pattern: schemas/types first, state machine second, RPC third, CLI commands last.

## Key Code State for Plan-Affected Areas

### StateEvent union (`src/schemas/state-events.ts`)
- Currently 33 event variants (project: 1, epic: 16, slice: 9, quest: 9)
- NO decision or rollup events yet — plan will add 3 new variants
- `StateErrorCode` union has 9 codes; may need additions for decision-specific errors (e.g., duplicate decision id, superseded-is-terminal)

### Reducer (`src/core/state/reduce.ts`)
- `handlerRecord` object with `satisfies { [K in StateEvent['type']]: Handler<K> }` for compile-time exhaustiveness
- Adding 3 events requires 3 new handler entries — TypeScript will enforce completeness
- Pattern: one import per transition file, each exports named handler functions

### O(n^2) Learnings Rollup
- **`slice-complete.ts` lines 89-106**: Inner loop iterates `learningEntries`, and for EACH entry with `rollupTo: ["project"]`, does `getJsonl("learnings.jsonl")` + spread + `setEntry`. N entries = N reads of the growing array.
- **`quest-complete.ts` lines 65-77**: Same pattern. For each entry with `rollupTo: ["project"]`, re-reads and re-writes `learnings.jsonl`.
- Both also have the same issue for `rollupTo: ["epic"]` in slice-complete (each epic-rollup entry re-reads epic learnings).
- Fix: collect all epic-rollup and project-rollup entries into arrays, then do one `getJsonl` + concat + `setEntry` per target.

### RPC Layer (`src/core/rpc/begin.ts`, `src/core/rpc/types.ts`)
- `BeginPhase` already includes `"update-decision"` and `"rollup"` — added as stubs
- `BeginPayloadMap` has `"update-decision": Record<string, never>` and `"rollup": Record<string, never>` — need real payload types
- `buildBeginEvent` has `case "update-decision"` and `case "rollup"` throwing "not yet implemented"
- `Target` already includes `{ type: "decision"; id: string }` variant
- `buildCreateEvent` has `case "decision"` throwing "not yet implemented"
- `buildBeginResult` does NOT handle `target.type === "decision"` — needs a branch

### Status Command (`src/commands/global/status.ts`)
- Current stub: loads state, reads `project.json`, returns hardcoded `activeEpic: null`, `activeSlice: null`, `activeQuest: null`, empty `artifacts: {}`, generic recommendation
- `applyQuery()` already implemented here using `@michaelhomer/jqjs` — plan Phase 4 will move it to `src/util/query.ts` or `src/util/output.ts`
- `formatStatusHuman()` is minimal — needs full rewrite for artifact counts, active entity details, sections
- `StatusResult` schema (`src/schemas/commands/status.ts`) has loose `artifacts: z.record(z.string(), z.unknown())` — plan Phase 3 will tighten to specific artifact count fields

### Global Args (`src/commands/global-args.ts`)
- Currently: `json`, `quiet`, `verbose` (reserved). No `--query`.
- Plan Phase 4 adds `--query` here.
- Also has `parseInlineBudget()` helper for start-* commands.

### Output (`src/util/output.ts`)
- `output()` handles json/quiet/human modes
- No `--query` integration yet — plan Phase 4 will add query application here
- `outputError()` and `outputUnexpectedError()` for error formatting

### Command Registration (`src/commands/main.ts`)
- Flat colon-namespaced subCommands: `epic:*` (14), `slice:*` (8), `quest:*` (8), `start-*` (8), `submit-*` (8), `init`, `status`
- No `decision:*`, `learning:*`, or `schema` commands yet
- Plan adds 7 entity commands + 1 global command = 8 new entries

### Schemas (`src/schemas/records/`)
- `DecisionEntry` schema exists: `{id, status, domain, title, summary, date, supersededBy}`
- `LearningEntry` schema exists: `{category, summary, detail, tags, source, rollup, rollupTo}`
- `LearningInput` schema exists (subset without `source`/`rollup` — injected by RPC)
- No `src/schemas/commands/decision.ts` yet — needs creation

### Existing Command Patterns
- Commands use `defineCommand` from citty, spread `globalArgs`, read stdin via `readStdin()`, validate with `validateInput(schema, args, stdin)`
- Mutation commands call `begin()` (or `complete()`/`submit()`) from RPC layer
- Read-only commands (`list`, `show`) bypass RPC, call `assembleState()` directly
- Human output: `pc.dim()` for transitions, formatted strings to `output()`

## Plan vs Code Alignment

### Confirmed Alignment
- Architecture docs already spec all 3 new events with correct payloads
- Decision transition table exists in `transition-tables.md` with all valid transitions
- `BeginPhase` and `Target` types already have decision/rollup stubs
- `DecisionEntry` schema matches architecture spec exactly
- commands-api.md already maps the 3 new commands to events

### Potential Issues
1. **`BeginPayloadMap` stubs**: `update-decision` and `rollup` currently map to `Record<string, never>`. Plan Phase 2 must replace these with real types (e.g., `{ id: string; changes: Partial<DecisionEntry> }` for update-decision, `{ from: string; to: string }` for rollup).
2. **`buildBeginResult` missing decision branch**: Currently only handles project/epic/slice/quest targets. Decision results need a different shape (no entity JSON with `status` field to diff — decisions live in JSONL).
3. **`begin()` is synchronous but commands use `await begin()`**: The `begin()` function in `src/core/rpc/begin.ts` returns synchronously (`BeginResult`), but command files call it with `await`. This works (await on non-Promise is a no-op) but plan should be aware.
4. **StatusResult schema is loose**: `artifacts: z.record(z.string(), z.unknown())` needs tightening in Phase 3. The plan correctly identifies this.
5. **`StateErrorCode` may need new codes**: The plan's decision handlers need error codes for "duplicate decision id" and "can't update superseded decision". These could use existing `STATE_INVALID_TRANSITION` or need new codes.

### Conventions to Follow
- One file per transition handler (e.g., `decision.ts`, `rollup-learnings.ts`)
- Guard helpers return `Entity | StateError` for type narrowing (per learnings)
- Activity log entries on every state change
- Overview.json sync on entity status changes (decisions don't have overview.json, so N/A)
- Input schemas with strict enums, storage schemas with flexible strings
- Factory patterns for parameterized command families
