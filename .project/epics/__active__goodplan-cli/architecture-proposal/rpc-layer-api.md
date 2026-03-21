# RPC Layer API

## Purpose

Workflow orchestration layer. Coordinates the State Machine and Data Layer to execute complete workflow operations. Owns context bundling, implicit transition detection, and the bridge between CLI commands and the pure state machine. Consumed by the Commands Layer.

## Interface

### Workflow Operations

```typescript
function begin(phase: Phase, target: Target, options: WorkflowOptions): BeginResult;
function complete(phase: Phase, target: Target, input: CompleteInput, options: WorkflowOptions): CompleteResult;
function context(phase: Phase, target: Target, options: WorkflowOptions): ContextResult;
function status(options: StatusOptions): StatusResult;
```

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
  inlineContext?: boolean | number;  // --inline-context flag; true = default budget, number = custom budget in bytes
}
```

`--inline-context` uses the default budget (~20-30KB). `--inline-context=50000` overrides it. This allows the LLM to size the context to its available window.

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
}

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

Read-only. Assembles the context bundle appropriate for the given phase. Each phase has a hardcoded priority list of content to include. With `--inline-context`, content is inlined in priority order up to the budget. Without it, only references are returned.

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

### Status

```typescript
interface StatusResult {
  project: { name: string; version: string };
  activeEpic?: { name: string; status: string; phase: string };
  activeSlice?: { name: string; status: string; phase: string };
  activeQuest?: { name: string; status: string; phase: string };
  artifacts: Record<string, number>;  // artifact counts from _derived
  recommendations: string[];           // next actions
  warnings: string[];                  // e.g., "all slices complete, epic needs completion"
}
```

Read-only. Derives status from the unified state object and `_derived` fields. Generates recommendations based on current state.

## Contracts

### Orchestration Only

The RPC Layer does not contain transition logic — that's the State Machine's job. It does not contain I/O logic — that's the Data Layer's job. It wires them together and assembles responses.

### Context Budget

The `--inline-context` budget is configurable: boolean `true` uses the default (~20-30KB), a numeric value overrides it. Content is inlined in the phase's priority order until the budget is exhausted. The budget applies to the total size of inlined markdown content, not the full response.

### Error Propagation

Errors from the State Machine (`StateError`) and Data Layer (`DATA_CONCURRENT_MODIFICATION`, Zod validation errors) are propagated to the Commands layer with their original error codes. The RPC Layer does not swallow or transform errors.

### Architecture Path Returns

On completion operations, the RPC Layer returns the root directories where the LLM should update architecture. It does not read, write, or interpret architecture markdown files — the LLM owns architecture content and decides what changes to make.

## Dependencies

- State Machine: `reduce()`
- Data Layer: `loadState()`, `commitState()`, content read operations
- Zod schemas from `src/schemas/` (for response types)

## Fitness Functions

### Context budget is respected

- **Test file:** candidate — not yet written
- **Verifies:** With `--inline-context=N`, the total size of inlined content never exceeds N bytes

### All mutation operations call reduce() before commitState()

- **Test file:** candidate — not yet written
- **Verifies:** No RPC mutation path writes state without going through the state machine first
