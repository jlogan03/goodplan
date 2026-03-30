# Phase 1 Review: Update rpc-layer-api.md

## Summary

All 10 documented divergences have been addressed. The updated doc accurately reflects the actual code signatures and types. The restructuring (relocating `status()` and `startContext()`, adding `BeginPayloadMap`, adding `RollupResult`) is well-organized and internally consistent.

## Verification Against Source Code

### Function Signatures (verified match)

| Function | Doc signature | Code signature | Match? |
|---|---|---|---|
| `begin()` | `begin<P extends BeginPhase>(projectDir: string, phase: P, target: Target, payload: BeginPayloadMap[P], options?: WorkflowOptions): P extends "rollup" ? RollupResult : BeginResult` | Same (`src/core/rpc/begin.ts:40-46`) | Yes |
| `complete()` | `complete(projectDir: string, target: Target, input: CompleteInput, options?: WorkflowOptions): CompleteResult` | Same (`src/core/rpc/complete.ts:47-52`) | Yes |
| `submit()` | `submit(projectDir: string, phase: SubmitPhase, target: Target, content: SubmitInput, options?: WorkflowOptions): SubmitResult` | Same (`src/core/rpc/submit.ts:34-40`) | Yes |
| `startContext()` | `startContext(state: ProjectState, phase: SubmitPhase, target: Target, options?: StartContextOptions): ContextBundle` | Same (`src/core/context/index.ts:37-42`) | Yes |
| `buildStatusResult()` | `buildStatusResult(projectDir?: string): StatusResult` | Same (`src/commands/global/status.ts:27`) | Yes |

### Type Definitions (verified match)

| Type | Doc | Code | Match? |
|---|---|---|---|
| `BeginPhase` | 18 members | `src/core/rpc/types.ts:24-43` — 18 members | Yes |
| `SubmitPhase` | 9 members (incl. `complete`) | `src/core/rpc/types.ts:48-57` — 9 members | Yes |
| `Target` | 7 variants (project, epic, slice, quest, task, decision, rollup) | `src/core/rpc/types.ts:64-71` — 7 variants | Yes |
| `WorkflowOptions` | `inlineContext?`, `override?`, `force?` | `src/core/rpc/types.ts:75-79` — same 3 fields | Yes |
| `BeginPayloadMap` | 19 phase entries | `src/core/rpc/types.ts:88-108` — 19 entries | Yes |
| `BeginResult` | `entity`, `phase`, `previousStatus`, `newStatus`, `paths?` | `src/core/rpc/types.ts:125-132` — same fields | Yes |
| `RollupResult` | `phase: 'rollup'`, `from`, `to`, `rolledUp` | `src/core/rpc/types.ts:135-140` — same fields | Yes |
| `CompleteResult` | All fields including `context?` on CompleteResult only | `src/core/rpc/types.ts:142-159` — matches | Yes |
| `SubmitResult` | No `context?` field | `src/core/rpc/types.ts:161-169` — no `context` field | Yes |
| `CompleteInput` | Uses `LearningInput[]`, `ArchitectureDeltaInput[]` | `src/core/rpc/types.ts:173-189` — same type names | Yes |
| `LearningInput` | `category`, `summary`, `detail`, `tags`, `rollupTo: string[]` | `src/schemas/records/learning.ts:27-33` — matches | Yes |
| `DecisionSummary` | `status: 'active' \| 'revisiting'` (no `superseded`) | `src/core/context/types.ts:23-29` — matches | Yes |
| `LearningSummary` | `file: string` (required, not optional) | `src/core/context/types.ts:32-38` — matches | Yes |
| `StatusResult` | Active entities as `{name, status} \| null`, no `phase` | `src/schemas/commands/status.ts:8-13, 45-56` — matches | Yes |
| `Artifacts` | 4 file-artifact objects + 6 numbers (incl. `openTasks`, `totalTasks`) | `src/schemas/commands/status.ts:32-43` — matches | Yes |
| `StartContextOptions` | `inlineBudget?: number` | `src/core/context/types.ts:62-66` — matches | Yes |
| `ContextBundle` | `inline`, `references`, `decisions`, `learnings` | `src/core/context/types.ts:11-16` — matches | Yes |

### Gap Coverage

| Gap # | Description | Addressed? |
|---|---|---|
| 1 | `projectDir` parameter missing | Yes — added to all three RPC functions |
| 2 | `begin()` generic mechanism undocumented | Yes — `BeginPayloadMap` section added, conditional return type documented |
| 3 | `BeginResult`/`SubmitResult` had stale `context?` field | Yes — removed from both, retained on `CompleteResult` only |
| 4 | `StatusResult` shape outdated | Yes — fully rewritten with correct types |
| 5 | `status()` misplaced in RPC section | Yes — moved to Status section with Commands layer note |
| 6 | `startContext()` misplaced in RPC section | Yes — moved to Context Bundling section |
| 7 | `WorkflowOptions.force` missing | Yes — added with description |
| 8 | `DecisionSummary.status` included `superseded`; `LearningSummary.file` was optional | Yes — both fixed |
| 9 | `Learning[]`/`ArchitectureDelta[]` type names wrong | Yes — changed to `LearningInput[]`/`ArchitectureDeltaInput[]` |
| 10 | Stale deferral note | Yes — removed |

### Routing table and examples

All routing table entries and inline examples updated to use `projectDir` as first arg. The `startContext` row correctly shows `startContext(state, phase, ...)` (not `projectDir`). The `status` row correctly references `buildStatusResult(projectDir?)` with the Commands layer note.

## Issues Found

### Minor

1. **Arrow style inconsistency in comments**: The diff changed Unicode arrows (`->`) to ASCII arrows (`->`) in the routing table comments. This is consistent within the updated doc but differs from other architecture docs that may use Unicode arrows. Not a correctness issue -- just a style note.

2. **`ArchitectureDeltaInput` not defined inline**: The doc references `ArchitectureDeltaInput[]` in `CompleteInput` but does not provide its definition inline, unlike `LearningInput` which is defined. The old doc also omitted this (`ArchitectureDelta[]` was referenced without definition), so this is pre-existing, not a regression. Still, for completeness it could be added.

3. **`SubmitResult` comment says "included if inlineContext is set" was removed**: Correct removal since code has no `context` field on `SubmitResult`. But `SubmitResult.paths?` comment in the doc says nothing about when it's populated. The `BeginResult` doc says "always included" for `paths?` but `SubmitResult` is silent. Minor inconsistency (the `?` typing handles it, but a note would be helpful).

## Verdict

The documentation update is thorough and accurate. Every type definition and function signature in the doc matches the actual code. The structural reorganization (separating `status()` and `startContext()` from the RPC interface) improves clarity. No critical or important issues found.

**Score: 9/10** — All gaps addressed accurately. Minor items are cosmetic or pre-existing.
