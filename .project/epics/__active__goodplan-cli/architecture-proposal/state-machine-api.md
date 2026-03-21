# State Machine API

## Purpose

Pure rules engine that validates state transitions and enforces workflow invariants. Operates on a unified state object representing the entire project. No I/O — takes state in, returns new state out. Consumed exclusively by the RPC Layer.

## Interface

### Core Reducer

```typescript
function reduce(
  state: ProjectState,
  event: StateEvent
): ProjectState | StateError;
```

- `state`: the unified state object (all JSON entities + derived fields)
- `event`: discriminated union — the transition being requested plus its typed payload
- Returns: new `ProjectState` with all changes applied, or a `StateError`

The reducer is the single entry point. All transition logic flows through it.

### Events (Discriminated Union)

Each event type carries exactly the data it needs. TypeScript enforces correct payloads at compile time.

```typescript
type StateEvent =
  // Project
  | { type: 'INIT_PROJECT'; name: string }
  // Epic lifecycle
  | { type: 'CREATE_EPIC'; name: string; goal: string }
  | { type: 'ACTIVATE_EPIC'; epic: string }
  | { type: 'ABANDON_EPIC'; epic: string; reason: string }
  | { type: 'COMPLETE_EPIC'; epic: string; verificationResults: VerificationResult[] }
  // Slice lifecycle
  | { type: 'CREATE_SLICE'; name: string; epic: string }
  | { type: 'BEGIN_PLAN'; slice: string }
  | { type: 'COMPLETE_PLAN'; slice: string }
  | { type: 'BEGIN_REFINEMENT'; slice: string }
  | { type: 'COMPLETE_REFINEMENT_ROUND'; slice: string; scores: Record<string, number> }
  | { type: 'BEGIN_IMPLEMENTATION'; slice: string }
  | { type: 'COMPLETE_IMPLEMENTATION'; slice: string }
  | { type: 'COMPLETE_SLICE'; slice: string; verificationPassed: boolean; deferred: DeferredItem[]; learnings: Learning[]; architectureDelta: ArchitectureDelta[] }
  | { type: 'ABANDON_SLICE'; slice: string; reason: string }
  // Quest lifecycle
  | { type: 'CREATE_QUEST'; name: string }
  | { type: 'BEGIN_QUEST'; quest: string }
  | { type: 'COMPLETE_QUEST'; quest: string; verificationPassed: boolean; learnings: Learning[]; architectureDelta: ArchitectureDelta[] }
  | { type: 'ABANDON_QUEST'; quest: string; reason: string }
  // Cross-cutting
  | { type: 'ROLLUP_LEARNINGS'; from: string; to: string }
  | { type: 'ADD_VERIFICATION'; epic: string; verification: Verification }
  | { type: 'UPDATE_VERIFICATION'; epic: string; index: number; verification: Verification };
```

### State Error

```typescript
interface StateError {
  code: string;          // namespaced: STATE_INVALID_TRANSITION, STATE_EPIC_ALREADY_ACTIVE, etc.
  message: string;       // human-readable explanation of why the transition was rejected
  detail?: Record<string, unknown>;  // structured context for programmatic handling
}
```

## Implementation: Transition Tables

Internally, the reducer uses declarative transition tables. This is an implementation detail — the external API is just `reduce(state, event)`.

Each entity type has a table of transitions. For a given `(currentStatus, event.type)` pair, there may be multiple rows with different guards. The reducer walks matching rows in order, runs each guard until one passes, then applies that transition.

```typescript
interface Transition {
  from: EntityStatus;
  on: StateEvent['type'];
  guard?: (state: ProjectState, event: StateEvent) => true | StateError;
  apply: (state: ProjectState, event: StateEvent) => ProjectState;
}
```

- **`guard`**: checks preconditions — returns `true` if the transition is allowed, or a `StateError` explaining why not. Guards can inspect the full project state and the event payload.
- **`apply`**: produces the new `ProjectState` — updates entity status, appends activity log entries, modifies related entities (e.g., routes deferred items to target slices). Pure function.

Example: a slice in `refining` state receives `COMPLETE_REFINEMENT_ROUND`:

```typescript
const sliceTransitions: Transition[] = [
  {
    from: 'refining',
    on: 'COMPLETE_REFINEMENT_ROUND',
    guard: (state, event) => {
      // All scores below threshold — keep refining
      const allAbove = Object.values(event.scores).every(s => s >= 9);
      if (!allAbove) return true;  // this row matches: stay in refining
      return { code: 'STATE_GUARD_SKIP', message: '' };  // skip to next row
    },
    apply: (state, event) => {
      // Increment round counter, record scores, stay in 'refining'
    }
  },
  {
    from: 'refining',
    on: 'COMPLETE_REFINEMENT_ROUND',
    guard: (state, event) => {
      const allAbove = Object.values(event.scores).every(s => s >= 9);
      if (allAbove) return true;  // scores met threshold — advance
      return { code: 'STATE_GUARD_SKIP', message: '' };
    },
    apply: (state, event) => {
      // Move to 'plan-refined', record final scores
    }
  },
];
```

If no guard passes for a matching `(from, on)` pair, the reducer returns a `STATE_INVALID_TRANSITION` error.

## Contracts

### Purity

The reducer and all transition functions are pure. Given the same `(state, event)`, they always return the same result. No filesystem access, no network calls, no side effects.

### Completeness

The reducer handles every valid `(currentStatus, event.type)` combination for every entity type. Unhandled combinations return `STATE_INVALID_TRANSITION` error with a message describing the current status and what was attempted. No silent no-ops.

### Cross-Entity Consistency

The unified state object allows the state machine to enforce cross-entity rules in a single reduce call:
- **Sequential slice execution**: can't start slice N+1 until slice N is complete or abandoned
- **One active epic**: can't activate an epic if another is active
- **Implicit transitions**: after completing a slice, check if all sibling slices are complete and flag it in the returned state
- **Deferred work routing**: completing a slice can modify another slice's deferred array
- **Verification criteria gate**: can't activate an epic without verification criteria

### Derived Fields

`_derived` fields (file existence, artifact counts) are read-only. The state machine uses them in guards (e.g., "plan must exist before beginning refinement") but never modifies them. The RPC layer recomputes them from the filesystem on each call.

## Dependencies

None. The state machine imports only its own types and shared schema types from `src/schemas/`.

## Fitness Functions

### State machine has no I/O imports

- **Test file:** candidate — not yet written
- **Verifies:** AST or import scan of all files in `src/core/state/` confirming no `fs`, `path` (for file ops), or network imports

### Every (status, event) pair is handled

- **Test file:** candidate — not yet written
- **Verifies:** For each entity type, enumerates all status × event combinations and confirms the reducer either returns a valid new state or a `STATE_INVALID_TRANSITION` error — no unhandled cases

### Reducer is pure — same inputs produce same outputs

- **Test file:** candidate — not yet written
- **Verifies:** Property-based test: for random valid (state, event) pairs, calling reduce twice with identical inputs produces identical outputs
