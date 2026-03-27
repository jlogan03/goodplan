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

- `state`: the unified state object (recursive tree of all project files)
- `event`: discriminated union — the transition being requested plus its typed payload
- Returns: new `ProjectState` with all changes applied, or a `StateError`

The reducer is the single entry point. All transition logic flows through it.

### Events (Discriminated Union)

Each event type carries exactly the data it needs. TypeScript enforces correct payloads at compile time.

**Timestamp convention**: ALL events carry a `ts: string` field (ISO 8601). The RPC layer injects `ts` on every event before calling `reduce()` — reducers never call `new Date()` to preserve purity (INV-003). Handlers use `event.ts` for activity log timestamps and for setting entity `updated` fields on every status change. This externalizes non-determinism so the same inputs always produce the same output.

```typescript
// Note: ALL events carry `ts: string` (ISO 8601). The RPC layer injects it universally.
type StateEvent =
  // Project — INIT_PROJECT operates on zero state (empty ProjectState from assembleState on
  // uninitialized project). Produces initial project.json, empty overview.json collections,
  // and initial activity-log entry. commitState() materializes the directories and files.
  | { type: 'INIT_PROJECT'; name: string; ts: string }
  // Epic lifecycle
  | { type: 'CREATE_EPIC'; name: string; goal: string; ts: string }
  | { type: 'BEGIN_EXPLORE'; epic: string; ts: string }
  | { type: 'COMPLETE_EXPLORE'; epic: string; ts: string }
  | { type: 'BEGIN_ARCHITECTURE'; epic: string; ts: string }
  | { type: 'COMPLETE_ARCHITECTURE'; epic: string; ts: string }
  | { type: 'BEGIN_REFINE_ARCHITECTURE'; epic: string; ts: string }
  | { type: 'COMPLETE_REFINE_ARCHITECTURE'; epic: string; ts: string; scores: Record<string, number>; override?: boolean }
  | { type: 'BEGIN_SLICING'; epic: string; ts: string }
  | { type: 'COMPLETE_SLICING'; epic: string; ts: string }
  | { type: 'BEGIN_REFINE_SLICES'; epic: string; ts: string }
  | { type: 'COMPLETE_REFINE_SLICES'; epic: string; ts: string; scores: Record<string, number>; override?: boolean }
  | { type: 'ACTIVATE_EPIC'; epic: string; ts: string }
  | { type: 'ABANDON_EPIC'; epic: string; ts: string; reason: string }
  | { type: 'COMPLETE_EPIC'; epic: string; ts: string; verificationResults: VerificationResult[] }
  // Slice lifecycle
  | { type: 'CREATE_SLICE'; name: string; epic: string; goal: string; ts: string }
  | { type: 'BEGIN_PLAN'; slice: string; ts: string }
  | { type: 'COMPLETE_PLAN'; slice: string; ts: string }
  | { type: 'BEGIN_REFINEMENT'; slice: string; ts: string }
  | { type: 'COMPLETE_REFINEMENT_ROUND'; slice: string; ts: string; scores: Record<string, number>; override?: boolean }
  | { type: 'BEGIN_IMPLEMENTATION'; slice: string; ts: string }
  | { type: 'COMPLETE_IMPLEMENTATION'; slice: string; ts: string }
  | { type: 'COMPLETE_SLICE'; slice: string; ts: string; verificationPassed: boolean; deferred: DeferredItem[]; learnings: LearningInput[]; architectureDelta: ArchitectureDeltaInput[] }
  | { type: 'ABANDON_SLICE'; slice: string; ts: string; reason: string }
  // Quest lifecycle
  | { type: 'CREATE_QUEST'; name: string; ts: string }
  | { type: 'BEGIN_QUEST_PLAN'; quest: string; ts: string }
  | { type: 'COMPLETE_QUEST_PLAN'; quest: string; ts: string }
  | { type: 'BEGIN_QUEST_REFINEMENT'; quest: string; ts: string }
  | { type: 'COMPLETE_QUEST_REFINEMENT_ROUND'; quest: string; ts: string; scores: Record<string, number>; override?: boolean }
  | { type: 'BEGIN_QUEST_IMPLEMENTATION'; quest: string; ts: string }
  | { type: 'COMPLETE_QUEST_IMPLEMENTATION'; quest: string; ts: string }
  | { type: 'COMPLETE_QUEST'; quest: string; ts: string; verificationPassed: boolean; learnings: Learning[]; architectureDelta: ArchitectureDelta[] }
  | { type: 'ABANDON_QUEST'; quest: string; ts: string; reason: string }
  // Cross-cutting
  | { type: 'ROLLUP_LEARNINGS'; from: string; to: string; ts: string }
  | { type: 'CREATE_DECISION'; id: string; domain: string; title: string; summary: string; ts: string }
  | { type: 'UPDATE_DECISION'; id: string; changes: Partial<Omit<DecisionEntry, 'id' | 'date'>>; ts: string }
  | { type: 'ADD_VERIFICATION'; epic: string; ts: string; verification: Verification }
  | { type: 'UPDATE_VERIFICATION'; epic: string; ts: string; index: number; verification: Verification };
```

When `override` is `true` on refinement completion events (`COMPLETE_REFINEMENT_ROUND`, `COMPLETE_REFINE_ARCHITECTURE`, `COMPLETE_REFINE_SLICES`, `COMPLETE_QUEST_REFINEMENT_ROUND`), the state machine bypasses score threshold guards and advances to the next phase regardless of scores. This keeps override logic within the state machine per INV-001.

### Supporting Types

These types are used in `StateEvent` payloads, `CompleteInput`, and JSONL records. Defined here for Zod schema writers.

```typescript
interface DeferredItem {
  description: string;        // what was deferred
  targetSlice: string;        // name of the slice this should be routed to
}

interface Verification {
  description: string;        // what to verify
  status: 'pending' | 'passed' | 'failed';
  addedDuring: string;        // phase when added (e.g., "defining-slices", "exploring")
  modifiedDuring: string | null;  // phase when last modified, null if never
}

interface VerificationResult {
  index: number;              // index into epic.json verifications array
  passed: boolean;
  notes: string;              // human/orchestrator explanation of result
}

interface ArchitectureDelta {
  subsystem: string;          // which subsystem was changed
  type: 'add' | 'modify' | 'remove';
  description: string;        // what changed
  ts: string;                 // ISO 8601 timestamp — injected by RPC layer, not caller-supplied
}

interface DecisionEntry {
  id: string;                 // e.g., "2026-03-20-layered-architecture"
  status: 'active' | 'superseded' | 'revisiting';
  domain: string;             // e.g., "architecture", "testing", "deployment"
  title: string;
  summary: string;
  date: string;               // ISO 8601 date
  supersededBy: string | null;  // id of superseding decision, or null
}
```

### Entity Status Enums

Centralized status values for each entity type. The fitness function "every (status, event) pair is handled" enumerates from these sets.

```typescript
type EpicStatus = 'created' | 'exploring' | 'explored' | 'defining-architecture' | 'architecture-defined'
  | 'refining-architecture' | 'architecture-refined' | 'defining-slices' | 'slices-defined'
  | 'refining-slices' | 'slices-refined' | 'activated' | 'completed' | 'abandoned';

type SliceStatus = 'created' | 'planning' | 'plan-created' | 'refining' | 'plan-refined'
  | 'implementing' | 'implementation-complete' | 'completed' | 'abandoned';

type QuestStatus = 'created' | 'planning' | 'plan-created' | 'refining' | 'plan-refined'
  | 'implementing' | 'implementation-complete' | 'completed' | 'abandoned';
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
  guard?: (state: ProjectState, event: StateEvent) => true | 'skip' | StateError;
  apply: (state: ProjectState, event: StateEvent) => ProjectState;
}
```

- **`guard`**: checks preconditions — returns `true` if the transition is allowed, `'skip'` to try the next matching row, or a `StateError` to reject the transition entirely. Guards can inspect the full project state and the event payload.
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
      return 'skip';  // try next row
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
      return 'skip';
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
- **Epic completion guard**: `COMPLETE_EPIC` requires all `verificationResults` entries to have `passed: true`. If any entry has `passed: false`, the event is rejected with `STATE_VERIFICATION_FAILED` — the epic stays in `activated`. The orchestrator must re-verify failing items and resubmit. This mirrors the slice guard rule where `verificationPassed === false` blocks `COMPLETE_SLICE`.

### State Key Dependencies

Each event type reads only a subset of the unified state object. Documenting this enables future partial loading if `ProjectState` grows large.

All paths below are `resolve()` paths into the `ProjectState` tree.

| Event Type | Reads | Writes |
|---|---|---|
| `CREATE_EPIC` | `epics/overview.json` | `epics/<name>/epic.json`, `epics/overview.json` |
| `BEGIN_EXPLORE` | `epics/<name>/epic.json`, `epics/overview.json` | `epics/<name>/epic.json`, `epics/overview.json`, `activity-log.jsonl` |
| `COMPLETE_EXPLORE` | `epics/<name>/epic.json`, `epics/<name>/research/`, `epics/overview.json` | `epics/<name>/epic.json`, `epics/overview.json`, `activity-log.jsonl` |
| `BEGIN_ARCHITECTURE` | `epics/<name>/epic.json`, `epics/overview.json` | `epics/<name>/epic.json`, `epics/overview.json`, `activity-log.jsonl` |
| `COMPLETE_ARCHITECTURE` | `epics/<name>/epic.json`, `epics/<name>/architecture/`, `epics/overview.json` | `epics/<name>/epic.json`, `epics/overview.json`, `activity-log.jsonl` |
| `ACTIVATE_EPIC` | `project.json`, `epics/<name>/epic.json`, `epics/overview.json` | `project.json`, `epics/<name>/epic.json`, `epics/overview.json`, `activity-log.jsonl` |
| `CREATE_SLICE` | `epics/<epic>/epic.json` | `epics/<epic>/slices/<name>/slice.json`, `epics/<epic>/epic.json` |
| `BEGIN_PLAN` | `project.json`, `epics/<epic>/slices/<name>/slice.json` | `project.json`, `epics/<epic>/slices/<name>/slice.json`, `activity-log.jsonl` |
| `COMPLETE_PLAN` | `epics/<epic>/slices/<name>/slice.json`, `epics/<epic>/slices/<name>/` | `epics/<epic>/slices/<name>/slice.json`, `activity-log.jsonl` |
| `COMPLETE_REFINEMENT_ROUND` | `epics/<epic>/slices/<name>/slice.json` | `epics/<epic>/slices/<name>/slice.json`, `activity-log.jsonl` |
| `COMPLETE_SLICE` | `project.json`, `epics/<epic>/slices/<name>/slice.json`, `epics/<epic>/epic.json` | `project.json`, `epics/<epic>/slices/<name>/slice.json`, `epics/<epic>/epic.json`, `epics/<epic>/slices/<name>/learnings.jsonl`, `epics/<epic>/slices/<name>/architecture-deltas.jsonl`, `learnings.jsonl`, `activity-log.jsonl` |
| `COMPLETE_EPIC` | `epics/<name>/epic.json`, `project.json` | `epics/<name>/epic.json`, `project.json`, `activity-log.jsonl` |
| `CREATE_DECISION` | `decisions.jsonl` | `decisions.jsonl`, `activity-log.jsonl` |
| `UPDATE_DECISION` | `decisions.jsonl` | `decisions.jsonl`, `activity-log.jsonl` |
| `ROLLUP_LEARNINGS` | source `learnings.jsonl` | target `learnings.jsonl`, `activity-log.jsonl` |

Quest events mirror slice events but operate on `quests/<name>/` paths. Representative quest rows:

| Event Type | Reads | Writes |
|---|---|---|
| `CREATE_QUEST` | `quests/overview.json` | `quests/<name>/quest.json`, `quests/overview.json` |
| `BEGIN_QUEST_PLAN` | `project.json`, `quests/<name>/quest.json`, `quests/<name>/` | `project.json`, `quests/<name>/quest.json`, `activity-log.jsonl` |
| `COMPLETE_QUEST_PLAN` | `quests/<name>/quest.json`, `quests/<name>/` | `quests/<name>/quest.json`, `activity-log.jsonl` |
| `COMPLETE_QUEST_REFINEMENT_ROUND` | `quests/<name>/quest.json` | `quests/<name>/quest.json`, `activity-log.jsonl` |
| `COMPLETE_QUEST` | `project.json`, `quests/<name>/quest.json`, `quests/overview.json` | `project.json`, `quests/<name>/quest.json`, `quests/overview.json`, `quests/<name>/learnings.jsonl`, `quests/<name>/architecture-deltas.jsonl`, `learnings.jsonl`, `activity-log.jsonl` |

Other events follow the same pattern: they read the target entity's JSON plus any cross-entity dependencies (e.g., sequential slice enforcement reads sibling slice statuses).

### Directory-Based Guards (replaces _derived)

Content existence checks use `hasChild(state, dirPath, childName)` to navigate the recursive `DirectoryEntry.contents` tree. The state machine reads directory entries to validate content prerequisites — it never modifies them.

Key guards:
- `hasChild(state, "epics/<epic>/slices/<name>", "plan.md")` — guards `COMPLETE_PLAN`
- `hasChild(state, "epics/<epic>/slices/<name>", "plan-refined.md")` — guards `BEGIN_IMPLEMENTATION`

These guards are defined in transition-tables.md (source of truth). Only guards listed there are implemented.

## Dependencies

None. The state machine imports only its own types and shared schema types from `src/schemas/`.

## Fitness Functions

Priority: 1 (implement first — per _overview.md subsystem maturity)

### State machine has no I/O imports

- **Test file:** candidate — not yet written
- **Verifies:** AST or import scan of all files in `src/core/state/` confirming no `fs`, `path` (for file ops), or network imports

### Every (status, event) pair is handled

- **Test file:** candidate — not yet written
- **Verifies:** For each entity type, enumerates all status × event combinations and confirms the reducer either returns a valid new state or a `STATE_INVALID_TRANSITION` error — no unhandled cases

### Reducer is pure — same inputs produce same outputs

- **Test file:** candidate — not yet written
- **Verifies:** Property-based test: for random valid (state, event) pairs, calling reduce twice with identical inputs produces identical outputs
