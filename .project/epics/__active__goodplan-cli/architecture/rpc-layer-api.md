# RPC Layer API

## Purpose

Workflow orchestration layer. Coordinates the State Machine and Data Layer to execute complete workflow operations. Owns context bundling, implicit transition detection, and the bridge between CLI commands and the pure state machine. Consumed by the Commands Layer.

## Interface

### Workflow Operations

```typescript
function begin(phase: BeginPhase, target: Target, options: WorkflowOptions): BeginResult;
function complete(phase: BeginPhase, target: Target, input: CompleteInput, options: WorkflowOptions): CompleteResult;
function submit(phase: SubmitPhase, target: Target, content: SubmitInput, options: WorkflowOptions): SubmitResult;
function startContext(phase: SubmitPhase, target: Target, options: WorkflowOptions): ContextResult;
function status(options: StatusOptions): StatusResult;
```

- `submit` handles `submit-*` commands: writes content via Data Layer, triggers the appropriate state event (e.g., `COMPLETE_PLAN`), and commits both in one `commitState` call.
- `startContext` handles `start-*` commands: read-only context assembly for sub-agents (equivalent to the removed `context` command).

```typescript
// Separate phase types eliminate ambiguity: a BeginPhase always maps to a
// BEGIN_* event, a SubmitPhase always maps to a COMPLETE_* event.
type BeginPhase =
  | 'create'
  | 'explore'
  | 'define-architecture'
  | 'refine-architecture'
  | 'define-slices'
  | 'refine-slices'
  | 'activate'
  | 'plan'
  | 'refine-plan'
  | 'implement'
  | 'complete'
  | 'abandon'
  | 'add-verification'
  | 'update-verification'
  | 'rollup';

type SubmitPhase =
  | 'plan'
  | 'refinement'
  | 'implementation'
  | 'explore'
  | 'architecture'
  | 'slices'
  | 'refine-architecture'
  | 'refine-slices';

type Target =
  | { type: 'epic'; name: string }
  | { type: 'slice'; name: string }
  | { type: 'quest'; name: string };

// Explicit mapping: (function, phase, target.type) → StateEvent
// BeginPhase mappings:
//   begin('create', {type:'epic'})        → CREATE_EPIC
//   begin('explore', {type:'epic'})       → BEGIN_EXPLORE
//   begin('define-architecture', ...)     → BEGIN_ARCHITECTURE
//   begin('refine-architecture', ...)     → BEGIN_REFINE_ARCHITECTURE
//   begin('define-slices', ...)           → BEGIN_SLICING
//   begin('refine-slices', ...)           → BEGIN_REFINE_SLICES
//   begin('activate', {type:'epic'})      → ACTIVATE_EPIC
//   begin('plan', {type:'slice'})         → BEGIN_PLAN
//   begin('plan', {type:'quest'})         → BEGIN_QUEST_PLAN
//   begin('implement', {type:'slice'})    → BEGIN_IMPLEMENTATION
//   begin('implement', {type:'quest'})    → BEGIN_QUEST_IMPLEMENTATION
// SubmitPhase mappings:
//   submit('plan', {type:'slice'})        → COMPLETE_PLAN
//   submit('plan', {type:'quest'})        → COMPLETE_QUEST_PLAN
//   submit('refinement', {type:'slice'})  → COMPLETE_REFINEMENT_ROUND
//   submit('refinement', {type:'quest'})  → COMPLETE_QUEST_REFINEMENT_ROUND
//   submit('implementation', {type:'slice'}) → COMPLETE_IMPLEMENTATION
//   submit('implementation', {type:'quest'}) → COMPLETE_QUEST_IMPLEMENTATION
//   submit('explore', {type:'epic'})      → COMPLETE_EXPLORE
//   submit('architecture', {type:'epic'}) → COMPLETE_ARCHITECTURE
//   submit('slices', {type:'epic'})       → COMPLETE_SLICING
//   submit('refine-architecture', ...)    → COMPLETE_REFINE_ARCHITECTURE
//   submit('refine-slices', ...)          → COMPLETE_REFINE_SLICES
```

### Command-to-RPC Routing

| Command pattern | RPC function | Description |
|---|---|---|
| `epic:create`, `slice:create`, `quest:create`, `decision:create` | `begin('create', ...)` | Entity creation |
| `epic:explore`, `epic:define-architecture`, `epic:refine-architecture`, `epic:define-slices`, `epic:refine-slices`, `epic:activate`, `slice:plan`, `slice:refine-plan`, `slice:implement`, `quest:plan`, `quest:refine-plan`, `quest:implement` | `begin(phase, ...)` | Phase initiation — transitions entity into a new phase |
| `epic:complete`, `slice:complete`, `quest:complete` | `complete(phase, ...)` | Entity completion — requires verification input |
| `epic:abandon`, `slice:abandon`, `quest:abandon` | `complete('abandon', ...)` | Entity abandonment |
| `submit-plan`, `submit-refinement`, `submit-implementation`, `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-architecture`, `submit-refine-slices` | `submit(phase, ...)` | Sub-agent content submission — writes content + triggers state event |
| `start-plan`, `start-refinement`, `start-implementation`, `start-explore`, `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices` | `startContext(phase, ...)` | Read-only context bundling for sub-agents |
| `status` | `status(...)` | Read-only status query |
| `decision:update`, `epic:add-verification`, `epic:update-verification`, `learning:rollup` | `begin(phase, ...)` | Cross-cutting mutations |

Each mutating operation follows the same pattern:
1. Load state via Data Layer (`loadState()`)
2. Build the appropriate `StateEvent` from the command parameters
3. Call `reduce(state, event)`
4. Commit new state via Data Layer (`commitState()`)
5. Assemble and return the response

`context` and `status` are read-only — they load state but don't call the reducer or commit.

### Shared Options

```typescript
interface WorkflowOptions {
  inlineContext?: boolean | number;  // --inline flag; true = default budget, number = custom budget in bytes
  override?: boolean;                // --override flag; bypasses score threshold circuit breaker on refinement events
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
  | { phase: 'plan'; learnings?: Learning[] }
  // Refinement phases: sub-agent writes revised plan to filesystem.
  // Submit carries scores — triggers COMPLETE_REFINEMENT_ROUND / COMPLETE_QUEST_REFINEMENT_ROUND.
  | { phase: 'refinement'; scores: Record<string, number>; learnings?: Learning[] }
  // Implementation phases: sub-agent writes code directly.
  // Submit carries no content — triggers COMPLETE_IMPLEMENTATION / COMPLETE_QUEST_IMPLEMENTATION.
  | { phase: 'implementation'; learnings?: Learning[] }
  // Explore phase: sub-agent writes research/brainstorm markdown to filesystem.
  // Submit carries no content — triggers COMPLETE_EXPLORE.
  | { phase: 'explore'; learnings?: Learning[] }
  // Architecture phase: sub-agent writes architecture markdown to filesystem.
  // Submit carries no content — triggers COMPLETE_ARCHITECTURE.
  | { phase: 'architecture'; learnings?: Learning[] }
  // Slices phase: sub-agent writes slice definitions to filesystem.
  // Submit carries no content — triggers COMPLETE_SLICING.
  | { phase: 'slices'; learnings?: Learning[] }
  // Refine-architecture phase: sub-agent writes revised architecture to filesystem.
  // Submit carries scores — triggers COMPLETE_REFINE_ARCHITECTURE.
  | { phase: 'refine-architecture'; scores: Record<string, number>; learnings?: Learning[] }
  // Refine-slices phase: sub-agent writes revised slices to filesystem.
  // Submit carries scores — triggers COMPLETE_REFINE_SLICES.
  | { phase: 'refine-slices'; scores: Record<string, number>; learnings?: Learning[] };

interface SubmitResult {
  entity: string;           // what was submitted
  phase: string;            // the phase that completed
  previousStatus: string;
  newStatus: string;
  advanced: boolean;        // true if scores met threshold and phase advanced
  context?: ContextBundle;  // included if inlineContext is set
  paths?: PathReferences;
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
  context?: ContextBundle;  // included if inlineContext is set
  paths?: PathReferences;   // always included
}
```

Validates the transition, updates state, optionally returns context bundle. Used by orchestrator skills to advance workflow phases.

### Complete

```typescript
interface CompleteInput {
  verificationPassed: boolean;
  deferred?: DeferredItem[];
  learnings?: Learning[];
  architectureDelta?: ArchitectureDelta[];  // maps to COMPLETE_SLICE.architectureDelta
}

// Canonical Learning type — used in CompleteInput and sub-agent submit commands.
// The `rollupTo` array specifies which scopes this learning should be rolled up to.
// The Data Layer transforms this to stored form: `source` is populated from the
// current entity scope, and `rollup: true` is set when rollupTo is non-empty.
interface Learning {
  category: 'domain' | 'worked' | 'didnt-work' | 'do-differently';
  summary: string;
  detail: string;
  tags: string[];
  rollupTo: ('epic' | 'project')[];  // empty array = don't roll up
}

interface CompleteResult {
  entity: string;
  previousStatus: string;
  newStatus: string;
  deferredRouted?: { item: DeferredItem; target: string }[];
  architecturePaths?: {
    currentArchitecture: string;   // project-level directory for LLM to update
    targetArchitecture?: string;   // epic-level directory (for reference)
  };
  epicComplete?: boolean;          // true if all slices in epic are now done
  learningsRolledUp?: { epic: number; project: number };
  context?: ContextBundle;         // included if inlineContext is set
  paths?: PathReferences;
}
```

Runs the completion flow: verification gate → state transition → deferred work routing → learnings rollup. Returns architecture root paths so the LLM can update project-level architecture directly. The LLM owns the architecture content — the CLI does not read, write, or interpret architecture files during completion.

### Context

```typescript
interface ContextBundle {
  inline: Record<string, string>;    // key → markdown content (within budget)
  references: string[];               // file paths for remaining content
  decisions: DecisionSummary[];
  learnings: LearningSummary[];
}
```

Read-only. Used by `start-*` commands. Assembles the context bundle appropriate for the given phase. Each phase has a hardcoded priority list of content to include. With `--inline`, content is inlined in priority order up to the budget. Without it, only references are returned.

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

### Status

```typescript
interface StatusResult {
  project: { name: string; version: string };
  activeEpic?: { name: string; status: string; phase: string };
  activeSlice?: { name: string; status: string; phase: string };
  activeQuest?: { name: string; status: string; phase: string };
  artifacts: {
    architectureFiles?: number;
    researchFiles?: number;
    brainstormFiles?: number;
    prototypeFiles?: number;
    decisions?: number;
    learnings?: number;
    completedSlices?: number;
    totalSlices?: number;
  };
  recommendations: string[];           // next actions
  warnings: string[];                  // e.g., "all slices complete, epic needs completion"
}
```

Read-only. Derives status from the unified state object and `_derived` fields. Generates recommendations based on current state.

## Contracts

### Orchestration Only

The RPC Layer does not contain transition logic — that's the State Machine's job. It does not contain I/O logic — that's the Data Layer's job. It wires them together and assembles responses.

### Context Bundling as Internal Module

Context bundling (budget-based inlining, per-phase priority tables, content assembly) is a distinct concern within the RPC layer, located at `src/core/context/`. It changes for different reasons than state orchestration — adding a new phase's priority list or adjusting budget heuristics should not touch orchestration code. The RPC layer's public API (`begin`, `complete`, `context`, `status`) delegates to the context module when `--inline` is set. The context module reads content via the Data Layer but has no direct dependency on the State Machine.

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

### All mutation operations call reduce() before commitState()

- **Test file:** candidate — not yet written
- **Verifies:** No RPC mutation path writes state without going through the state machine first
