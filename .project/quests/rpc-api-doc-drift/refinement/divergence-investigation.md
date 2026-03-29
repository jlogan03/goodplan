# Divergence Investigation: rpc-layer-api.md vs Code

**Doc last substantially rewritten:** `68d9c05` (2026-03-26, [rpc-and-commands] Phase 1)
**Doc last updated:** `bf9417e` (2026-03-28, [test-coverage] Phase 4 -- fitness function addition only)
**Most recent meaningful doc edit:** `0b7fbf3` (2026-03-27, [arch-docs-update] Fix architecture doc drift across 3 phases)

---

## 1. `projectDir` as first param on begin/complete/submit

- **Doc says:** `begin(phase, target, options)` -- no `projectDir`
- **Code says:** `begin(projectDir, phase, target, payload, options?)` -- `projectDir: string` is first param
- **When code changed:** `projectDir` has been there since the original implementation at `70a7bcb` ([epic-lifecycle] Phase 4, 2026-03-22). The doc was written at `72bb892` (2026-03-23) and rewritten at `68d9c05` (2026-03-26) -- both after the code existed.
- **Verdict:** INTENTIONAL -- update doc. The doc was written as an API design spec before implementation, and the `projectDir` param was a necessary implementation detail (needed to call `loadState(projectDir)`). Every RPC function has always taken it. The doc was never updated to reflect this.
- **Evidence:** All three files (`begin.ts`, `complete.ts`, `submit.ts`) have had `projectDir` as first param since their creation commits. The doc was written after the code.

## 2. BeginPayloadMap generic on begin()

- **Doc says:** `begin(phase: BeginPhase, target: Target, options: WorkflowOptions): BeginResult`
- **Code says:** `begin<P extends BeginPhase>(projectDir, phase: P, target, payload: BeginPayloadMap[P], options?)`
- **When code changed:** Introduced at `70a7bcb` ([epic-lifecycle] Phase 4, 2026-03-22). Commit message explicitly says "Generic RPC API with typed BeginPayloadMap replacing one-off rpcInit."
- **Verdict:** INTENTIONAL -- update doc. The generic + payload map was a deliberate design improvement for type safety with `exactOptionalPropertyTypes`. The `BeginPayloadMap` interface in `types.ts` has 18 phase-specific payload types.
- **Evidence:** Commit message describes this as an intentional architectural choice. The types file even says "This is required by exactOptionalPropertyTypes."

## 3. `context?: ContextBundle` on BeginResult and SubmitResult

- **Doc says:** All three result types (BeginResult, SubmitResult, CompleteResult) have `context?: ContextBundle`
- **Code says:** Only `CompleteResult` has it. BeginResult and SubmitResult do not.
- **When code diverged:** At `86aedf1` ([sub-agent-commands] Phase 5, 2026-03-22), `context` was added only to `CompleteResult`. The doc was rewritten at `68d9c05` (2026-03-26) with `context?` on all three -- this was aspirational/forward-looking.
- **Verdict:** INTENTIONAL -- update doc to match code. Context on begin/submit was never implemented and isn't needed: begin operations don't have a meaningful context phase, and submit is a pure state-transition trigger where the sub-agent already has context from `start-*`.
- **Evidence:** The git diff at `86aedf1` shows `context` was deliberately added to only CompleteResult. The doc was written 4 days later but included it on all three, suggesting a spec-forward approach that was never revisited.

## 4. StatusResult shape differences

- **Doc says:** `activeEpic?: { name, status, phase }`, artifacts has `architectureFiles?: number`, `researchFiles?: number`, etc.
- **Code says:** `activeEpic: { name, status } | null` (no `phase`, nullable not optional), artifacts uses `{ count, files }` objects, adds `openTasks`/`totalTasks`
- **When code changed:**
  - `| null` pattern: since `453bccc` ([tracer-bullet] Phase 2) -- the original schema used nullable, not optional
  - `{ count, files }` objects: `23df116` ([show-status-enrich] Phase 2: Status File Arrays)
  - `openTasks`/`totalTasks`: `2a5d804` ([task-capture] Phase 2)
  - `phase` field never existed in the status schema -- it was in the doc spec but never implemented
- **Verdict:** INTENTIONAL -- update doc. The code evolved deliberately through multiple slices. The `phase` field was dropped because entity status already encodes the phase (e.g., `planning`, `implementing`). The `| null` vs `?` is a strictness choice for `exactOptionalPropertyTypes`. The enriched artifacts and task counts are feature additions.
- **Evidence:** Each change has a clear commit with rationale. The status schema (`src/schemas/commands/status.ts`) uses `activeEntityProjection.nullable()` -- this is deliberate TypeScript strictness.

## 5. status() location -- doc says RPC, code says Commands layer

- **Doc says:** `function status(options: StatusOptions): StatusResult` listed under RPC interface
- **Code says:** `buildStatusResult()` lives in `src/commands/global/status.ts`, reads from `assembleState()` directly
- **When:** Status has been in the Commands layer since `7b5a7eb` ([project-init] Phase 5, 2026-03-22). It was **never** in `src/core/rpc/`. The RPC directory has never contained a `status.ts` file.
- **Verdict:** INTENTIONAL -- update doc. The code comment in `status.ts` line 25 explicitly says: "Architecture: read-only commands bypass RPC and access the Data Layer directly." This is a deliberate architectural decision -- read-only operations don't need the reduce/commit cycle.
- **Evidence:** No `status.ts` has ever existed in `src/core/rpc/`. The `StatusOptions` interface in the doc is empty, reinforcing that this is a simple read-only query that doesn't need RPC orchestration.

## 6. startContext() location -- doc says RPC, code says context/ module

- **Doc says:** `function startContext(state, phase, target, options?)` listed under RPC interface
- **Code says:** `startContext()` lives in `src/core/context/index.ts`, not in `src/core/rpc/`
- **When:** Context module was created at `847df3b` ([sub-agent-commands] Phase 4, 2026-03-22). It has always been in `src/core/context/`.
- **Verdict:** INTENTIONAL -- update doc. The doc's own "Contracts" section (line 376-379) correctly describes context bundling as a "peer module alongside the RPC layer, located at `src/core/context/`." The function signature listing at the top is misleading by grouping it with begin/complete/submit.
- **Evidence:** The doc is internally inconsistent -- the interface section lists it as RPC, but the Contracts section correctly says it's a peer module. The Contracts section should be treated as authoritative.

## 7. WorkflowOptions.force missing from doc

- **Doc says:** `interface WorkflowOptions { inlineContext?: boolean | number; override?: boolean; }`
- **Code says:** Also has `force?: boolean`
- **When code changed:** `aa1320b` ([dogfood] Add --force flag for concurrent modification recovery, 2026-03-25). This was after the doc was first written (`72bb892`, 2026-03-23) and not caught during the doc update at `0b7fbf3` (2026-03-27).
- **Verdict:** INTENTIONAL -- update doc. The `force` flag was a deliberate addition during dogfooding to recover from concurrent modification errors when sub-agents modify state files directly.
- **Evidence:** Commit message: "Added global --force flag that bypasses DATA_CONCURRENT_MODIFICATION check with a stderr warning."

## 8a. DecisionSummary.status -- 'superseded' in doc but filtered in code

- **Doc says:** `status: 'active' | 'superseded' | 'revisiting'`
- **Code says:** `status: 'active' | 'revisiting'` -- and `collectDecisions()` explicitly filters out superseded decisions
- **When code changed:** `collectDecisions()` in `src/core/context/decisions.ts` has filtered superseded since its creation at `847df3b` ([sub-agent-commands] Phase 4). The type comment in `types.ts` says: "Only active and revisiting decisions are collected; superseded decisions are filtered out by collectDecisions()."
- **Verdict:** INTENTIONAL -- update doc. Superseded decisions are intentionally excluded from context bundles because they're no longer relevant for decision-making. The narrower type is correct.
- **Evidence:** The JSDoc comment on `DecisionSummary` explicitly documents this filtering as intentional behavior.

## 8b. LearningSummary.file -- optional in doc, required in code

- **Doc says:** `file?: string` (optional)
- **Code says:** `file: string` (required)
- **When code changed:** At `dd4e8cb` ([learnings-dir] Phase 4: Migration and Testing, 2026-03-27), the learning schema was updated to require `file` on all entries. The migration converts legacy `detail`-based entries to `file`-based entries. The doc was updated at `d406e17` ([learnings-dir] Complete quest) on the same day but kept `file?` as optional.
- **Verdict:** INTENTIONAL -- update doc. After migration, all learning entries have a `file` field. The old `detail`-only format no longer exists in practice.
- **Evidence:** The `learningEntrySchema` in `src/schemas/records/learning.ts` uses `file: z.string().min(1)` (required). The `LearningSummary` type in `context/types.ts` uses `file: string` (required). The `projectLearning()` function in `learnings.ts` unconditionally maps `entry.file`.

## 9. Learning.rollupTo type -- doc says enum array, code says open string array

- **Doc says:** `rollupTo: ('epic' | 'project')[]`
- **Code says:** `rollupTo: z.array(z.string())` in `learningEntrySchema`; `z.array(z.string())` in `learningInputSchema`
- **When code changed:** The schema has used `z.array(z.string())` since `0a977b6` ([slice-lifecycle] Phase 1). The `learningInputSchema` also uses `z.array(z.string())`.
- **Verdict:** UNCLEAR -- needs user input. The open `string[]` may be intentional for forward-compatibility (the schema comment on `category` says "intentionally open string for forward-compatibility"). But the doc's enum is more descriptive and the RPC layer only routes to `epic` and `project` scopes. Recommend: update doc to note the open type but document that only `'epic'` and `'project'` are currently supported values.
- **Evidence:** Schema comment pattern suggests intentional openness, but the doc's constrained type better communicates the actual contract.

## 10. Stale slice-03/04 deferral note

- **Doc says (line 243-244):** "Note: Slice 03 implements only the epic variant... optional fields (deferred, learnings, architectureDelta) and their coercion logic are deferred to slice 04"
- **Code says:** All optional fields and coercion logic are fully implemented in `complete.ts`
- **When code changed:** Implemented at `d9b1afc` ([slice-lifecycle] Phase 3: RPC layer wiring, 2026-03-22). This IS the "slice 04" work the note referenced.
- **Verdict:** INTENTIONAL -- update doc (remove stale note). The deferred work was completed. The note is now misleading because it implies the feature is not yet implemented.
- **Evidence:** `complete.ts` handles all CompleteInput variants with full coercion logic (`deferred ?? []`, `learnings ?? []`, `architectureDelta ?? []`).

---

## Summary

| # | Divergence | Verdict | Action |
|---|---|---|---|
| 1 | `projectDir` first param | INTENTIONAL | Update doc signatures |
| 2 | `BeginPayloadMap` generic | INTENTIONAL | Update doc signatures |
| 3 | `context?` on BeginResult/SubmitResult | INTENTIONAL | Remove from doc (only CompleteResult has it) |
| 4 | StatusResult shape | INTENTIONAL | Update doc to match schema |
| 5 | status() in Commands layer | INTENTIONAL | Move to Commands doc or note read-only bypass |
| 6 | startContext() in context/ module | INTENTIONAL | Clarify as peer module (doc already says this in Contracts) |
| 7 | WorkflowOptions.force | INTENTIONAL | Add to doc |
| 8a | DecisionSummary.status narrower | INTENTIONAL | Remove 'superseded' from doc type |
| 8b | LearningSummary.file required | INTENTIONAL | Make required in doc |
| 9 | rollupTo open string[] | UNCLEAR | User decision: strict enum or open string |
| 10 | Stale slice-03/04 note | INTENTIONAL | Remove stale deferral note |

**All 10 divergences are code-is-correct / doc-should-update cases** (with one UNCLEAR on rollupTo type openness). No code bugs found.
