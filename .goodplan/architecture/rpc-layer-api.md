# RPC Layer API

## Purpose

Workflow orchestration layer. Coordinates the State Machine and Data Layer to execute complete workflow operations. Coordinates with the context bundling peer module, handles implicit transition detection, and bridges CLI commands to the pure state machine. Consumed by the Commands Layer.

## Interface

### Workflow Operations

```typescript
function begin<P extends BeginPhase>(projectDir: string, phase: P, target: Target, payload: BeginPayloadMap[P], options?: WorkflowOptions): P extends "rollup" ? RollupResult : BeginResult;
function complete(projectDir: string, target: Target, input: CompleteInput, options?: WorkflowOptions): CompleteResult;
function submit(projectDir: string, phase: SubmitPhase, target: Target, content: SubmitInput, options?: WorkflowOptions): SubmitResult;
```

See Context Bundling section for `startContext()`. See Commands Layer for `status()`.

- `submit` handles `submit-*` commands: writes content via Data Layer, triggers the appropriate state event (e.g., `COMPLETE_PLAN`), and commits both in one `commitState` call.

```typescript
// Separate phase types eliminate ambiguity: a BeginPhase always maps to a
// BEGIN_* event, a SubmitPhase always maps to a COMPLETE_* event.
type BeginPhase =
  | 'create'
  | 'create-decision'
  | 'create-task'
  | 'drop-task'
  | 'convert-task'
  | 'explore'
  | 'define-architecture'
  | 'refine-architecture'
  | 'define-slices'
  | 'refine-slices'
  | 'activate'
  | 'plan'
  | 'refine-plan'
  | 'implement'
  | 'abandon'
  | 'add-verification'
  | 'update-verification'
  | 'update-decision'
  | 'rollup';

/** Phases that have content priority orderings for context bundling.
 *  Encompasses both `submit-*` command phases and the `complete` phase
 *  (which assembles context inline during entity completion). */
type SubmitPhase =
  | 'plan'
  | 'refinement'
  | 'implementation'
  | 'explore'
  | 'architecture'
  | 'slices'
  | 'refine-architecture'
  | 'refine-slices'
  | 'complete';

type Target =
  | { type: 'project' }
  | { type: 'epic'; name: string }
  | { type: 'slice'; name: string; epic: string }
  | { type: 'quest'; name: string }
  | { type: 'task'; name: string }
  | { type: 'decision'; id: string }
  | { type: 'rollup'; from: string; to: string };

// Explicit mapping: (function, phase, target.type) → StateEvent
// BeginPhase mappings:
//   begin(projectDir, 'create', {type:'epic'}, ...)        → CREATE_EPIC
//   begin(projectDir, 'explore', {type:'epic'}, ...)       → BEGIN_EXPLORE
//   begin(projectDir, 'define-architecture', ...)           → BEGIN_ARCHITECTURE
//   begin(projectDir, 'refine-architecture', ...)           → BEGIN_REFINE_ARCHITECTURE
//   begin(projectDir, 'define-slices', ...)                 → BEGIN_SLICING
//   begin(projectDir, 'refine-slices', ...)                 → BEGIN_REFINE_SLICES
//   begin(projectDir, 'activate', {type:'epic'}, ...)       → ACTIVATE_EPIC
//   begin(projectDir, 'plan', {type:'slice'}, ...)          → BEGIN_PLAN
//   begin(projectDir, 'plan', {type:'quest'}, ...)          → BEGIN_QUEST_PLAN
//   begin(projectDir, 'implement', {type:'slice'}, ...)     → BEGIN_IMPLEMENTATION
//   begin(projectDir, 'implement', {type:'quest'}, ...)     → BEGIN_QUEST_IMPLEMENTATION
//   begin(projectDir, 'refine-plan', {type:'slice'}, ...)   → BEGIN_REFINEMENT
//   begin(projectDir, 'refine-plan', {type:'quest'}, ...)   → BEGIN_QUEST_REFINEMENT
//   begin(projectDir, 'create', {type:'slice'}, ...)        → CREATE_SLICE
//   begin(projectDir, 'create', {type:'quest'}, ...)        → CREATE_QUEST
//   begin(projectDir, 'abandon', {type:'epic'}, ...)        → ABANDON_EPIC
//   begin(projectDir, 'abandon', {type:'slice'}, ...)       → ABANDON_SLICE
//   begin(projectDir, 'abandon', {type:'quest'}, ...)       → ABANDON_QUEST
//   begin(projectDir, 'add-verification', {type:'epic'}, ...) → ADD_VERIFICATION
//   begin(projectDir, 'update-verification', {type:'epic'}, ...) → UPDATE_VERIFICATION
//   begin(projectDir, 'create-task', {type:'task'}, ...)    → CREATE_TASK
//   begin(projectDir, 'drop-task', {type:'task'}, ...)      → DROP_TASK
//   begin(projectDir, 'convert-task', {type:'task'}, ...)   → CONVERT_TASK
//   begin(projectDir, 'create-decision', {type:'decision'}, ...) → CREATE_DECISION
//   begin(projectDir, 'update-decision', {type:'decision'}, ...) → UPDATE_DECISION
//   begin(projectDir, 'rollup', {type:'rollup'}, ...)       → ROLLUP_LEARNINGS
// SubmitPhase mappings:
//   submit(projectDir, 'plan', {type:'slice'}, ...)        → COMPLETE_PLAN
//   submit(projectDir, 'plan', {type:'quest'}, ...)        → COMPLETE_QUEST_PLAN
//   submit(projectDir, 'refinement', {type:'slice'}, ...)  → COMPLETE_REFINEMENT_ROUND
//   submit(projectDir, 'refinement', {type:'quest'}, ...)  → COMPLETE_QUEST_REFINEMENT_ROUND
//   submit(projectDir, 'implementation', {type:'slice'}, ...) → COMPLETE_IMPLEMENTATION
//   submit(projectDir, 'implementation', {type:'quest'}, ...) → COMPLETE_QUEST_IMPLEMENTATION
//   submit(projectDir, 'explore', {type:'epic'}, ...)      → COMPLETE_EXPLORE
//   submit(projectDir, 'architecture', {type:'epic'}, ...) → COMPLETE_ARCHITECTURE
//   submit(projectDir, 'slices', {type:'epic'}, ...)       → COMPLETE_SLICING
//   submit(projectDir, 'refine-architecture', ...)          → COMPLETE_REFINE_ARCHITECTURE
//   submit(projectDir, 'refine-slices', ...)                → COMPLETE_REFINE_SLICES
```

### Begin Payload Map

`begin()` is generic over `BeginPhase`. Each phase carries a specific payload shape via `BeginPayloadMap`. Phases that carry no event-specific data use `Record<string, never>` (callers pass `{}`). This is required by `exactOptionalPropertyTypes` — `undefined` is not a valid positional arg.

```typescript
interface BeginPayloadMap {
  create: { name: string; goal?: string; epic?: string };
  'create-decision': { id: string; domain: string; title: string; summary: string };
  'create-task': { name: string; title: string; description?: string; context?: TaskContext };
  'drop-task': { reason: string };
  'convert-task': { to: 'quest' | 'epic'; name?: string; goal?: string };
  explore: Record<string, never>;
  'define-architecture': Record<string, never>;
  'refine-architecture': Record<string, never>;
  'define-slices': Record<string, never>;
  'refine-slices': Record<string, never>;
  activate: Record<string, never>;
  plan: Record<string, never>;
  'refine-plan': Record<string, never>;
  implement: Record<string, never>;
  abandon: { reason: string };
  'add-verification': { verification: Verification };
  'update-verification': { index: number; verification: Verification };
  'update-decision': { changes: UpdateDecisionChanges };
  rollup: { from: string; to: string };
}
```

### Command-to-RPC Routing

| Command pattern | RPC function | Description |
|---|---|---|
| `epic:create`, `slice:create`, `quest:create` | `begin(projectDir, 'create', ...)` | Entity creation |
| `task:create` | `begin(projectDir, 'create-task', {type:'task', name}, ...)` | Task creation |
| `task:drop` | `begin(projectDir, 'drop-task', {type:'task', name}, ...)` | Task drop |
| `task:convert` | `begin(projectDir, 'convert-task', {type:'task', name}, ...)` | Task conversion to quest/epic |
| `decision:create` | `begin(projectDir, 'create-decision', {type:'decision', id}, ...)` | Decision creation |
| `epic:explore`, `epic:define-architecture`, `epic:refine-architecture`, `epic:define-slices`, `epic:refine-slices`, `epic:activate`, `slice:plan`, `slice:refine-plan`, `slice:implement`, `quest:plan`, `quest:refine-plan`, `quest:implement` | `begin(projectDir, phase, ...)` | Phase initiation — transitions entity into a new phase |
| `epic:complete`, `slice:complete`, `quest:complete` | `complete(projectDir, target, ...)` | Entity completion — requires verification input |
| `epic:abandon`, `slice:abandon`, `quest:abandon` | `begin(projectDir, 'abandon', ...)` | Entity abandonment |
| `submit-plan`, `submit-refinement`, `submit-implementation`, `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-architecture`, `submit-refine-slices` | `submit(projectDir, phase, ...)` | Sub-agent content submission — writes content + triggers state event |
| `start-plan`, `start-refinement`, `start-implementation`, `start-explore`, `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices` | `startContext(state, phase, ...)` | Read-only context bundling for sub-agents |
| `status` | `buildStatusResult(projectDir?)` | Read-only status query (Commands layer, not RPC) |
| `decision:update` | `begin(projectDir, 'update-decision', {type:'decision', id}, ...)` | Decision update |
| `epic:add-verification`, `epic:update-verification`, `learning:rollup` | `begin(projectDir, phase, ...)` | Cross-cutting mutations |

Each mutating operation follows the same pattern:
1. Load state via Data Layer (`loadState(projectDir)`)
2. Build the appropriate `StateEvent` from the command parameters
3. Call `reduce(state, event)`
4. Write supplementary files if needed (e.g., `complete()` calls `writeMarkdownFiles()` to write per-learning `.md` files after reduce succeeds — see Complete section)
5. Commit new state via Data Layer (`commitState()`)
6. Assemble and return the response

`startContext` and `status` are read-only — they load/assemble state but don't call the reducer or commit.

### Shared Options

```typescript
interface WorkflowOptions {
  inlineContext?: boolean | number;  // --inline flag; true = default budget, number = custom budget in bytes
  override?: boolean;                // --override flag; bypasses score threshold circuit breaker on refinement events
  force?: boolean;                   // --force flag; bypasses DATA_CONCURRENT_MODIFICATION check in commitState(), emitting a stderr warning. Added for recovery when sub-agents modify state files directly.
}
```

`--inline` uses the default budget (~20-30KB). `--inline=50000` overrides it. This allows the LLM to size the context to its available window.

### Submit

```typescript
// Discriminated union — each phase carries its specific payload shape.
// Phases where the sub-agent writes content directly to the filesystem
// (via Data Layer paths returned by start-*) carry no content payload —
// submit-* is a pure state-transition trigger for those phases.
type SubmitInput =
  // Plan phases: sub-agent writes plan markdown directly to filesystem.
  // Submit carries no content — triggers COMPLETE_PLAN / COMPLETE_QUEST_PLAN.
  | { phase: 'plan' }
  // Refinement phases: sub-agent writes revised plan to filesystem.
  // Submit carries scores — triggers COMPLETE_REFINEMENT_ROUND / COMPLETE_QUEST_REFINEMENT_ROUND.
  | { phase: 'refinement'; scores: Record<string, number> }
  // Implementation phases: sub-agent writes code directly.
  // Submit carries no content — triggers COMPLETE_IMPLEMENTATION / COMPLETE_QUEST_IMPLEMENTATION.
  | { phase: 'implementation' }
  // Explore phase: sub-agent writes research/brainstorm markdown to filesystem.
  // Submit carries no content — triggers COMPLETE_EXPLORE.
  | { phase: 'explore' }
  // Architecture phase: sub-agent writes architecture markdown to filesystem.
  // Submit carries no content — triggers COMPLETE_ARCHITECTURE.
  | { phase: 'architecture' }
  // Slices phase: sub-agent writes slice definitions to filesystem.
  // Submit carries no content — triggers COMPLETE_SLICING.
  | { phase: 'slices' }
  // Refine-architecture phase: sub-agent writes revised architecture to filesystem.
  // Submit carries scores — triggers COMPLETE_REFINE_ARCHITECTURE.
  | { phase: 'refine-architecture'; scores: Record<string, number> }
  // Refine-slices phase: sub-agent writes revised slices to filesystem.
  // Submit carries scores — triggers COMPLETE_REFINE_SLICES.
  | { phase: 'refine-slices'; scores: Record<string, number> };

// Learnings are captured only at entity completion (via CompleteInput),
// not during intermediate submit phases. This keeps all learning persistence
// within the state machine per INV-001.

interface SubmitResult {
  entity: string;           // what was submitted
  phase: string;            // the phase that completed
  previousStatus: string;
  newStatus: string;
  advanced: boolean;        // true if scores met threshold and phase advanced
  paths?: PathReferences;   // included when paths are available for the submitted phase
}
```

All `submit-*` phases where the sub-agent writes free-form content (plans, architecture, research, implementation code) expect that content to already be on the filesystem — the sub-agent writes it directly using paths from the `start-*` response. The `submit-*` command is then a pure state-transition trigger. For refinement phases, the `scores` field is required and drives the circuit breaker guard.

### Begin

```typescript
interface BeginResult {
  entity: string;           // what was started
  phase: string;            // the phase that began
  previousStatus: string;
  newStatus: string;
  paths?: PathReferences;   // always included
}

/** Specialized result for rollup operations — no meaningful entity status. */
interface RollupResult {
  phase: 'rollup';
  from: string;
  to: string;
  rolledUp: number;
}
```

`begin()` returns `RollupResult` when `P extends "rollup"`, otherwise `BeginResult`. Validates the transition, updates state, optionally resolves path references. Used by orchestrator skills to advance workflow phases.

Begin operations do not support inline context (`context` field) — there is no meaningful context phase at begin time.

### Complete

```typescript
// Discriminated union — epic completion requires VerificationResult[] while
// slice/quest completion uses a boolean assertion. The `type` field matches
// the Target.type used in the complete() call.
// Undefined array fields (deferred, learnings, architectureDelta) are coerced
// to [] by the RPC layer before building the state event.
type CompleteInput =
  | {
      type: 'epic';
      verificationResults: VerificationResult[];  // maps to COMPLETE_EPIC.verificationResults
    }
  | {
      type: 'slice';
      verificationPassed: boolean;
      deferred?: DeferredItem[];
      learnings?: LearningInput[];
      architectureDelta?: ArchitectureDeltaInput[];  // maps to COMPLETE_SLICE.architectureDelta
    }
  | {
      type: 'quest';
      verificationPassed: boolean;
      learnings?: LearningInput[];
      architectureDelta?: ArchitectureDeltaInput[];  // maps to COMPLETE_QUEST.architectureDelta
    };

// ArchitectureDeltaInput — describes a proposed change to project architecture.
// Skills pass this in CompleteInput.architectureDelta[]; the RPC layer includes
// it in the state event for the state machine to persist.
interface ArchitectureDeltaInput {
  summary: string;        // short description of the architectural change
  detail: string;         // full explanation / rationale
  tags: string[];
}

// Canonical LearningInput type — used in CompleteInput payloads from skills.
// Skills pass `detail` (full learning text). The RPC layer maps this to a
// `LearningEventEntry` (with `file` instead of `detail`) before building the
// state event: it derives a slug from `summary`, sets `file` to `learnings/<slug>.md`,
// and after reduce() succeeds, writes the `.md` file via Data Layer's writeMarkdownFiles().
// During rollup, `begin(projectDir, 'rollup', ...)` copies `.md` files from source to target
// scope via Data Layer's copyMarkdownFiles() after reduce succeeds.
interface LearningInput {
  category: 'domain' | 'worked' | 'didnt-work' | 'do-differently';
  summary: string;
  detail: string;
  tags: string[];
  rollupTo: ('epic' | 'project')[];  // input schema enforces z.enum(["epic", "project"]); 'project' implies epic rollup; for quests, either 'project' or omit; empty array = don't roll up
}

interface CompleteResult {
  entity: string;
  previousStatus: string;
  newStatus: string;
  deferredRouted?: DeferredItem[];   // items routed to existing target slices (DeferredItem already contains targetSlice)
  deferredSkipped?: number;          // count of deferred items whose targetSlice was not found
  architecturePaths?: {
    currentArchitecture: string;   // state-tree-relative path (e.g., "epics/my-epic/architecture/"); Commands layer resolves to filesystem path
    targetArchitecture?: string;   // epic-level directory (for reference)
  };
  epicComplete?: boolean;          // true if all slices in epic are now done
  learningsRolledUp?: { epic: number; project: number };
  context?: ContextBundle;         // included if inlineContext is set
  paths?: PathReferences;
}
```

Runs the completion flow: verification gate -> state transition -> deferred work routing -> learnings rollup. Returns architecture root paths so the LLM can update project-level architecture directly. The LLM owns the architecture content — the CLI does not read, write, or interpret architecture files during completion.

### Context Bundling

```typescript
interface ContextBundle {
  inline: Record<string, string>;    // key -> markdown content (within budget)
  references: string[];               // file paths for remaining content
  decisions: DecisionSummary[];
  learnings: LearningSummary[];
}
```

`startContext()` is a peer module export from `src/core/context/`, not an RPC function. It handles `start-*` commands: read-only context assembly for sub-agents (equivalent to the removed `context` command).

```typescript
function startContext(state: ProjectState, phase: SubmitPhase, target: Target, options?: StartContextOptions): ContextBundle;

interface StartContextOptions {
  inlineBudget?: number;  // budget in bytes; when set, content is inlined in priority order up to this limit
}
```

`startContext(state, phase, target, options?)` takes a caller-provided `ProjectState` for testability — it does not call `loadState()` internally. This design allows both the RPC layer (which already has state loaded) and the Commands layer (which loads state separately) to use the same function without redundant I/O.

Read-only. Used by `start-*` commands. Assembles the context bundle appropriate for the given phase. Each phase has a hardcoded priority list of content to include. With `--inline`, content is inlined in priority order up to the budget. Without it, only references are returned.

**Tree traversal for directory references:** When a priority item references a directory (e.g., "current architecture"), the context module resolves it to a `DirectoryEntry` node via `resolve(state, path)` and then walks `DirectoryEntry.contents` recursively, collecting all `MarkdownEntry` children for inlining. JSON/JSONL entries within directories are not inlined — only markdown content is eligible.

**Per-phase content priority:**

| Phase | Priority order (highest first) |
|---|---|
| plan | Entity goal (slice or quest), current architecture, target architecture, conventions, active decisions, recent learnings |
| refinement | Plan, entity goal, current architecture, target architecture, conventions, decisions |
| implementation | Refined plan, entity goal, current architecture, target architecture, conventions, relevant learnings |
| complete | Entity goal, remaining slice overview, implementation results, current architecture, target architecture, learnings at all levels |
| explore | Epic goal, existing research/brainstorm, conventions, completed epics, completed quests, pending quests |
| architecture | Epic goal, exploration output, conventions, existing architecture |
| slices | Epic goal, full architecture, conventions, learnings |
| refine-architecture | Epic goal, current architecture, exploration output, conventions, decisions, learnings |
| refine-slices | Epic goal, full architecture, current slice definitions, conventions, learnings |

### Supporting Types

```typescript
// File/directory paths returned in operation results. Keys are logical names
// (e.g., "plan", "architecture", "research"), values are absolute filesystem paths.
type PathReferences = Record<string, string>;

// Projection of DecisionEntry for context bundles — omits detail fields.
// Only active and revisiting decisions are collected; inactive decisions
// are filtered out by collectDecisions() before reaching the summary type.
interface DecisionSummary {
  id: string;
  status: 'active' | 'revisiting';
  domain: string;
  title: string;
  summary: string;
}

// Projection of stored learning record for context bundles.
// After the learnings-dir migration, all entries have a file field.
interface LearningSummary {
  category: 'domain' | 'worked' | 'didnt-work' | 'do-differently';
  summary: string;
  tags: string[];
  source: string;
  file: string;
}
```

### Status

`status()` lives in the Commands layer (`src/commands/global/status.ts`), not the RPC layer. Read-only commands bypass RPC and access the Data Layer directly.

```typescript
function buildStatusResult(projectDir?: string): StatusResult;

interface StatusResult {
  project: { name: string; version: string };
  activeEpic: { name: string; status: string } | null;
  activeSlice: { name: string; status: string } | null;
  activeQuest: { name: string; status: string } | null;
  artifacts: Artifacts;
  recommendations: string[];
  warnings: string[];
}

interface Artifacts {
  architecture: { count: number; files: string[] };
  research: { count: number; files: string[] };
  brainstorm: { count: number; files: string[] };
  prototypes: { count: number; files: string[] };
  decisions: number;
  learnings: number;
  completedSlices: number;
  totalSlices: number;
  openTasks: number;
  totalTasks: number;
}
```

Active entities use `{ name: string; status: string } | null` (no `phase` field — entity status already encodes phase; uses `null` not `undefined` for `exactOptionalPropertyTypes`). File-based artifact categories (`architecture`, `research`, `brainstorm`, `prototypes`) use `{ count: number; files: string[] }` objects; numeric categories (`decisions`, `learnings`, `completedSlices`, `totalSlices`, `openTasks`, `totalTasks`) are plain numbers. All artifact fields are required with defaults (not optional).

Derives status from the unified state tree by navigating `DirectoryEntry.contents` to count artifacts and reading entity JSON for status fields. Generates recommendations based on current state.

## Contracts

### Orchestration Only

The RPC Layer does not contain transition logic — that's the State Machine's job. It does not contain I/O logic — that's the Data Layer's job. It wires them together and assembles responses.

### Context Bundling as Peer Module

Context bundling (budget-based inlining, per-phase priority tables, content assembly) is a peer module alongside the RPC layer, located at `src/core/context/`. It depends on tree types and Data Layer reads, and is consumed by both the RPC layer (for `--inline` on mutations like `complete()`) and the Commands layer (for `start-*` commands). The context module has no direct dependency on the State Machine.

`startContext()` receives a caller-provided `ProjectState` rather than loading state itself — callers (RPC layer or Commands layer) pass their already-loaded state. This means it does not perform any Data Layer I/O internally; it reads only from the in-memory state tree.

### Context Budget

The `--inline` budget is configurable: boolean `true` uses the default (~20-30KB), a numeric value overrides it. Content is inlined in the phase's priority order until the budget is exhausted. The budget applies to the total size of inlined markdown content, not the full response.

### Error Propagation

Errors from the State Machine (`StateError`) and Data Layer (`DATA_CONCURRENT_MODIFICATION`, Zod validation errors) are propagated to the Commands layer with their original error codes. The RPC Layer does not swallow or transform errors.

### Architecture Path Returns

On completion operations, the RPC Layer returns the root directories where the LLM should update architecture. It does not read, write, or interpret architecture markdown files — the LLM owns architecture content and decides what changes to make.

## Dependencies

- State Machine: `reduce()`
- Data Layer: `loadState()`, `commitState()`. All state reads (entity data, JSONL records, markdown content) come from the in-memory `ProjectState` tree returned by `loadState()` — no individual read functions needed. Context bundling reads markdown content directly from `MarkdownEntry` nodes in the state tree.
- Tree navigation helpers: `resolve()`, `getJson()`, `getDir()`, `hasChild()`, etc.
- Zod schemas from `src/schemas/` (for response types)

## Fitness Functions

Priority: 3 (implement after State Machine and Data Layer — per _overview.md subsystem maturity)

### Context budget is respected

- **Test file:** candidate — not yet written
- **Verifies:** With `--inline=N`, the total size of inlined content never exceeds N bytes

### All .project/ JSON/JSONL mutations go through the state machine (INV-001)

- **Test file:** `tests/fitness/mutation-through-state-machine.test.ts`
- **Verifies:** `fs.writeFileSync`/`fs.writeFile` for `.json`/`.jsonl` files only appears in `src/core/data/commit.ts` (and documented exception: `migrate.ts`). Command handlers and RPC modules (except migrate) do not import fs write functions directly. `.md` writes via `markdown-files.ts` are out of scope.

### All mutation operations call reduce() before commitState()

- **Test file:** candidate — not yet written
- **Verifies:** No RPC mutation path writes state without going through the state machine first
