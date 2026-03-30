# Plan: RPC API Doc Drift

## Goal

Update `.project/architecture/rpc-layer-api.md` to match actual code signatures and type definitions. Ten specific gaps identified by the 2026-03-28 architecture audit and subsequent divergence investigation. All changes are to a single architecture doc file — no code changes.

**All divergences investigated via git history — every one is an intentional code change where the doc lagged behind.** No code bugs found.

## Phase 1: Update rpc-layer-api.md

Rewrite diverged sections to match the actual code in `src/core/rpc/`, `src/core/context/`, and `src/commands/global/status.ts`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `grep -c 'projectDir' .project/architecture/rpc-layer-api.md` returns 0 — undocumented parameter
- [x] `grep -c 'RollupResult' .project/architecture/rpc-layer-api.md` returns 0 — undocumented return type
- [x] `grep -c 'superseded' .project/architecture/rpc-layer-api.md` returns at least 1 — stale status value present
- [x] `grep -c 'StatusOptions' .project/architecture/rpc-layer-api.md` returns at least 1 — phantom interface present

**After implementation** (should pass / show presence):
- [x] `grep -c 'projectDir' .project/architecture/rpc-layer-api.md` returns at least 1 — parameter documented
- [x] `grep -c 'BeginPayloadMap' .project/architecture/rpc-layer-api.md` returns at least 1 — generic mechanism documented
- [x] `grep -c 'force' .project/architecture/rpc-layer-api.md` returns at least 1 — force option documented
- [x] `grep -c 'RollupResult' .project/architecture/rpc-layer-api.md` returns at least 1 — return type documented
- [x] `grep -c 'openTasks' .project/architecture/rpc-layer-api.md` returns at least 1 — task counts documented
- [x] `grep -c 'LearningInput' .project/architecture/rpc-layer-api.md` returns at least 1 — correct input type name documented
- [x] `grep -c 'superseded' .project/architecture/rpc-layer-api.md` returns 0 — stale status value removed from DecisionSummary
- [x] `grep -c 'StatusOptions' .project/architecture/rpc-layer-api.md` returns 0 — phantom interface removed

**Structural verification** (doc-code alignment):
- [x] Extract documented `begin()` signature from the updated doc (grep the TypeScript code block for the `begin` function line) and diff against the exported signature in `src/core/rpc/begin.ts` — parameter names, types, and return type must match
- [x] Extract documented `StatusResult` shape (grep the TypeScript code block for `StatusResult` fields) and diff field names/types against `src/schemas/commands/status.ts` — no omitted or extra fields
- [x] Extract documented `complete()` signature from the updated doc and compare against `src/core/rpc/complete.ts` export — verify `projectDir` is present and `options` is optional
- [x] Extract documented `submit()` signature from the updated doc and compare against `src/core/rpc/submit.ts` export — verify `projectDir` is present and `options` is optional

### Tasks

- [x] **Read actual type definitions**: Read `src/core/rpc/types.ts`, `src/core/rpc/begin.ts`, `src/core/rpc/complete.ts`, `src/core/rpc/submit.ts`, `src/core/context/types.ts`, `src/core/context/index.ts`, `src/commands/global/status.ts`, and `src/schemas/commands/status.ts` to extract the real signatures and types.

- [x] **Update function signatures** (gaps 1-2): Add `projectDir: string` as first param to `begin()`, `complete()`, `submit()`. Make `begin()` generic: `begin<P extends BeginPhase>(projectDir, phase: P, target, payload: BeginPayloadMap[P], options?)`. Document the `BeginPayloadMap` interface with all per-phase payload shapes. Document the conditional return type: `P extends "rollup" ? RollupResult : BeginResult`. Add the `RollupResult` type definition. Make `options` optional (`options?: WorkflowOptions`) on all three functions.

- [x] **Fix BeginResult and SubmitResult** (gap 3): Remove `context?: ContextBundle` from `BeginResult` and `SubmitResult` — only `CompleteResult` supports inline context. Add a note explaining why: begin operations don't have a meaningful context phase, and submit is a pure state-transition trigger where the sub-agent already has context from `start-*`.

- [x] **Update StatusResult** (gap 4): Replace the current shape with the actual one from `src/schemas/commands/status.ts`:
  - Active entities use `{ name: string; status: string } | null` (no `phase` field — entity status already encodes phase; uses `null` not `undefined` for `exactOptionalPropertyTypes`)
  - Artifacts restructured: `architecture`, `research`, `brainstorm`, `prototypes` are `{ count: number; files: string[] }` objects; `decisions`, `learnings`, `completedSlices`, `totalSlices` remain numbers
  - Add `openTasks: number` and `totalTasks: number`
  - All artifact fields are required with defaults (not optional)

- [x] **Relocate status() and startContext()** (gaps 5-6):
  - Move `status()` out of the RPC Interface section — note it lives in Commands layer (`src/commands/global/status.ts`), not RPC. Read-only commands bypass RPC and access the Data Layer directly. Remove the phantom `StatusOptions` interface (actual function takes optional `projectDir?: string`).
  - Move `startContext()` to the Context Bundling section — it's a peer module export from `src/core/context/`, not an RPC function. The doc's own Contracts section already correctly describes this relationship; fix the interface listing to be consistent.
  - After relocation, the RPC Interface section's prominent function listing (lines 11-17) should list only the three true RPC functions: `begin`, `complete`, `submit`. Add a brief cross-reference note: "See Commands Layer for `status()` and Context Bundling for `startContext()`."

- [x] **Add WorkflowOptions.force** (gap 7): Add `force?: boolean` to `WorkflowOptions` with description: bypasses `DATA_CONCURRENT_MODIFICATION` check in `commitState()`, emitting a stderr warning. Added for recovery when sub-agents modify state files directly.

- [x] **Fix DecisionSummary and LearningSummary** (gap 8):
  - Change `DecisionSummary.status` to `'active' | 'revisiting'` — `superseded` decisions are filtered out by `collectDecisions()` before reaching the summary type.
  - Change `LearningSummary.file` to required `string` (not optional) — after the learnings-dir migration, all entries have a file field.

- [x] **Fix CompleteInput type names and inline definition** (gap 9): Change `Learning[]` to `LearningInput[]` and `ArchitectureDelta[]` to `ArchitectureDeltaInput[]` in the `CompleteInput` definition. Update the inline `Learning` interface definition block (lines 246-259) to match `LearningInput`: rename to `LearningInput`, update `category` to use the `z.enum(...)` values from `learningInputSchema` (not the broader `string` from `learningEntrySchema`), and ensure all fields match the input schema. Document `rollupTo` as `'epic' | 'project'` (strict enum — documented as strict enum per design intent; schema uses open `string[]` for forward-compatibility but only `'epic'` and `'project'` are supported; `'project'` implies epic rollup; for quests, either `'project'` or omit).

- [x] **Update Command-to-RPC routing table**: The routing table (line 113) and examples (lines 96, 251) reference `begin('rollup', ...)` with the old signature. Update all routing table entries and inline examples to use the new `begin(projectDir, phase, target, payload, options?)` signature.

- [x] **Remove stale deferral note** (gap 10): Remove the "deferred to slice 04" note about optional fields and coercion logic in CompleteInput — the deferred work was completed at `d9b1afc`.

- [x] **Verify consistency**: Re-read the updated doc end-to-end to check for internal inconsistencies introduced by the changes. Cross-reference all type definitions against the actual TypeScript source files.

### Verification

- All 10 divergences addressed (original 8 audit gaps + 2 additional found during investigation)
- No internal inconsistencies in the updated doc
- Types in doc match the actual TypeScript definitions in `src/core/rpc/types.ts`, `src/core/context/types.ts`, and `src/schemas/commands/status.ts`
- `status()` and `startContext()` correctly placed in their respective sections
- Stale deferral notes removed
- `RollupResult` documented
- Input type names (`LearningInput`, `ArchitectureDeltaInput`) correct
