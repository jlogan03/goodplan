# Codebase Context: RPC API Doc Drift

## Gap-by-Gap Analysis

### Gap 1-2: Function signatures missing `projectDir` and `BeginPayloadMap` generic

**Doc (rpc-layer-api.md lines 12-14):**
```typescript
function begin(phase: BeginPhase, target: Target, options: WorkflowOptions): BeginResult;
function complete(target: Target, input: CompleteInput, options: WorkflowOptions): CompleteResult;
function submit(phase: SubmitPhase, target: Target, content: SubmitInput, options: WorkflowOptions): SubmitResult;
```

**Actual code:**
- `begin.ts:40-46`: `function begin<P extends BeginPhase>(projectDir: string, phase: P, target: Target, payload: BeginPayloadMap[P], options?: WorkflowOptions): P extends "rollup" ? RollupResult : BeginResult`
- `complete.ts:47-52`: `function complete(projectDir: string, target: Target, input: CompleteInput, options?: WorkflowOptions): CompleteResult`
- `submit.ts:34-40`: `function submit(projectDir: string, phase: SubmitPhase, target: Target, content: SubmitInput, options?: WorkflowOptions): SubmitResult`

**Discrepancies:**
1. All three functions take `projectDir: string` as first parameter -- missing from doc.
2. `begin()` is generic over `P extends BeginPhase` with a `payload: BeginPayloadMap[P]` parameter -- doc shows no generic, no payload parameter.
3. `begin()` returns `P extends "rollup" ? RollupResult : BeginResult` -- doc shows only `BeginResult`. The `RollupResult` type (`{ phase: "rollup"; from: string; to: string; rolledUp: number }`) is undocumented.
4. `options` is optional (`options?: WorkflowOptions`) in all three -- doc shows it as required.

**BeginPayloadMap** (types.ts:88-108) is a fully-defined interface mapping each `BeginPhase` to its payload shape. This is a significant type that drives the API's type safety and is completely absent from the doc.

### Gap 3: BeginResult and SubmitResult have `context?: ContextBundle` in doc but not in code

**Doc (lines 203-211, 187-195):**
Both `BeginResult` and `SubmitResult` show `context?: ContextBundle` fields.

**Actual code (types.ts):**
- `BeginResult` (lines 125-132): Has `entity`, `phase`, `previousStatus`, `newStatus`, `paths?` -- NO `context` field.
- `SubmitResult` (lines 161-169): Has `entity`, `phase`, `previousStatus`, `newStatus`, `advanced`, `paths?` -- NO `context` field.
- `CompleteResult` (lines 142-159): DOES have `context?: ContextBundle` -- this is the only result type with inline context support.

The `begin()` function in begin.ts never assembles a context bundle. The `submit()` function in submit.ts also never assembles one. Only `complete()` in complete.ts (lines 84-94) conditionally assembles a context bundle when `options.inlineContext` is set.

### Gap 4: StatusResult shape diverged

**Doc (lines 347-364):**
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
  recommendations: string[];
  warnings: string[];
}
```

**Actual code (schemas/commands/status.ts):**
- Active entities are `{ name: string; status: string } | null` -- no `phase` field, uses `null` not `undefined`.
- Artifacts completely restructured:
  - `architecture`, `research`, `brainstorm`, `prototypes` are `{ count: number; files: string[] }` objects (not plain numbers, and names changed from `*Files` to bare nouns).
  - `decisions`, `learnings` remain plain numbers.
  - `completedSlices`, `totalSlices` remain numbers.
  - `openTasks`, `totalTasks` added -- completely absent from doc.
- All artifact fields are required with defaults (not optional).

### Gap 5: status() is not an RPC function

**Doc (line 16):** Lists `status(options: StatusOptions): StatusResult` under RPC Workflow Operations.

**Actual code:** `buildStatusResult()` lives in `src/commands/global/status.ts` (Commands layer), not in `src/core/rpc/`. It uses `assembleState()` directly, bypassing the RPC layer entirely. The doc even notes "read-only commands bypass RPC" in the status.ts comment (line 25), but the RPC API doc still lists it as an RPC function.

There is no `StatusOptions` interface in the actual code -- `buildStatusResult()` takes an optional `projectDir?: string`.

### Gap 6: startContext() location

**Doc (line 15):** Lists `startContext(state: ProjectState, phase: SubmitPhase, target: Target, options?: StartContextOptions): ContextBundle` under RPC Workflow Operations.

**Actual code:** `startContext()` is exported from `src/core/context/index.ts`, which is a peer module to the RPC layer. The doc's "Context Bundling as Peer Module" section (lines 377-379) correctly describes this relationship, but the function is still listed in the main RPC interface block. The signature itself appears correct -- it takes `state: ProjectState` as first param for testability.

### Gap 7: WorkflowOptions missing `force`

**Doc (lines 142-146):**
```typescript
interface WorkflowOptions {
  inlineContext?: boolean | number;
  override?: boolean;
}
```

**Actual code (types.ts:75-79):**
```typescript
export interface WorkflowOptions {
  inlineContext?: boolean | number;
  override?: boolean;
  force?: boolean;
}
```

`force` is used in all three RPC functions to pass `{ force: true }` to `commitState()`, bypassing concurrent modification checks. Undocumented in the API doc.

### Gap 8: DecisionSummary.status and LearningSummary.file

**Doc (lines 299-305):**
```typescript
interface DecisionSummary {
  id: string;
  status: 'active' | 'superseded' | 'revisiting';
  ...
}
```

**Actual code (context/types.ts:23-29):**
```typescript
export interface DecisionSummary {
  id: string;
  status: "active" | "revisiting";
  ...
}
```
`superseded` is filtered out by `collectDecisions()` -- the doc includes it but the type doesn't.

**Doc (lines 310-316):**
```typescript
interface LearningSummary {
  ...
  file?: string;  // optional
}
```

**Actual code (context/types.ts:32-38):**
```typescript
export interface LearningSummary {
  ...
  file: string;  // required, not optional
}
```
`file` is required in the actual type. The doc shows it as optional with a `?`.

## Additional Discrepancies Found

### CompleteInput uses `LearningInput` and `ArchitectureDeltaInput`, not `Learning` and `ArchitectureDelta`

**Doc (lines 223-244):** Uses `Learning[]` and `ArchitectureDelta[]` in CompleteInput, and defines a `Learning` interface inline.

**Actual code (types.ts:173-189):** Uses `LearningInput[]` and `ArchitectureDeltaInput[]`. These are imported from schema files:
- `LearningInput` (schemas/records/learning.ts): `{ category, summary, detail, tags, rollupTo }` -- `rollupTo` is `z.array(z.string())` not `('epic' | 'project')[]`.
- `ArchitectureDeltaInput` (schemas/records/architecture-delta.ts): `{ subsystem, type, description }` -- omits `ts` which the RPC layer injects.

The doc's inline `Learning` interface has `rollupTo: ('epic' | 'project')[]` but the actual schema uses `z.array(z.string())` (open string array).

### Doc's "Note" about slice 03/04 deferral is stale

**Doc (lines 241-244):** States optional fields and coercion logic are "deferred to slice 04." The actual code in complete.ts fully implements all coercion (`input.deferred ?? []`, `input.learnings ?? []`, `input.architectureDelta ?? []`) and learning mapping. This note is now stale.

### RollupResult type is undocumented

`begin()` returns `RollupResult` for rollup operations (types.ts:134-140). This type is not mentioned in the doc at all. The Command-to-RPC routing table references `begin('rollup', ...)` but the distinct return type is not shown.

### `startContext()` function signature in the doc

The doc shows `startContext(state: ProjectState, phase: SubmitPhase, target: Target, options?: StartContextOptions)`. The actual function (in context/index.ts) needs verification of this signature, but the types file confirms the imports and types match. The `StartContextOptions` has `inlineBudget?: number` which matches the doc's description of numeric budget.

## Relevant Architectural Constraints (from invariants.md)

- **INV-001:** Every state mutation goes through the state machine. The RPC layer's `force` option bypasses concurrent modification checks in `commitState()`, but still routes through `reduce()` -- this is consistent with INV-001.
- **INV-003:** State machine is pure (no I/O). The RPC layer handles all I/O orchestration (`loadState`, `commitState`, `writeMarkdownFiles`, `copyMarkdownFiles`).
- **INV-005:** Schema validation on every read/write. The `LearningInput` and `ArchitectureDeltaInput` schemas enforce validation at the input boundary.
- **INV-007:** Structured error responses. RPC functions throw `GoodplanError` with specific codes, propagating state machine errors unchanged.
