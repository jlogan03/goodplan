# Plan: RPC API Doc Drift

## Overview

Update `rpc-layer-api.md` to match actual code signatures and type definitions. Eight specific gaps identified by the 2026-03-28 architecture audit. All changes are to a single architecture doc file — no code changes.

## Phase 1: Update rpc-layer-api.md

Rewrite diverged sections to match the actual code in `src/core/rpc/`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c 'projectDir' .project/architecture/rpc-layer-api.md` returns 0 — undocumented parameter

**After implementation** (should pass / show presence):
- [ ] `grep -c 'projectDir' .project/architecture/rpc-layer-api.md` returns at least 1 — parameter documented
- [ ] `grep -c 'BeginPayloadMap' .project/architecture/rpc-layer-api.md` returns at least 1 — generic mechanism documented
- [ ] `grep -c 'force' .project/architecture/rpc-layer-api.md` returns at least 1 — force option documented

### Tasks

- [ ] **Read actual type definitions**: Read `src/core/rpc/types.ts`, `src/core/rpc/begin.ts`, `src/core/rpc/complete.ts`, `src/core/rpc/submit.ts`, `src/core/context/types.ts`, and `src/commands/global/status.ts` to extract the real signatures and types.
- [ ] **Update function signatures** (gaps 1-2): Add `projectDir: string` as first param to `begin()`, `complete()`, `submit()`. Add `BeginPayloadMap` generic to `begin()`. Show the `BeginPayloadMap` type with per-phase payload shapes. Make `options` optional where code has it optional.
- [ ] **Fix BeginResult and SubmitResult** (gap 3): Remove `context?: ContextBundle` from `BeginResult` and `SubmitResult` — only `CompleteResult` supports inline context.
- [ ] **Update StatusResult** (gap 4): Replace the current shape with the actual one: active entities are `{ name: string; status: string } | null` (no `phase` field), artifacts use `{ count: number; files: string[] }` objects for architecture/research/brainstorm/prototypes, add `openTasks` and `totalTasks`.
- [ ] **Relocate status() and startContext()** (gaps 5-6): Move `status()` out of the RPC Interface section — note it lives in Commands layer (`src/commands/global/status.ts`), not RPC. Move `startContext()` to the Context Bundling section — it's a peer module export, not an RPC function.
- [ ] **Add WorkflowOptions.force** (gap 7): Add `force?: boolean` to `WorkflowOptions` with description.
- [ ] **Fix DecisionSummary and LearningSummary** (gap 8): Change `DecisionSummary.status` to `'active' | 'revisiting'` (superseded filtered out). Change `LearningSummary.file` to required `string` (not optional).
- [ ] **Verify consistency**: Re-read the updated doc end-to-end to check for internal inconsistencies introduced by the changes.

### Verification

- All 8 audit gaps addressed
- No internal inconsistencies in the updated doc
- Types in doc match the actual TypeScript definitions in `src/core/rpc/types.ts` and `src/core/context/types.ts`
