# Phase 4: Context Bundling Module

Create `src/core/context/` — the `startContext()` function with per-phase priority tables, tree traversal for MarkdownEntry collection, and `--inline` budget logic. This is the novel piece — no prior codebase precedent.

**Layering note:** `src/core/context/` is a peer module to the RPC layer (not within it). It depends on tree types and Data Layer reads. Consumed by both RPC (for `--inline` on mutations) and Commands (for `start-*` commands that bypass RPC entirely).

**Signature deviation:** `startContext(state, phase, target, options)` takes caller-provided state rather than loading it internally. This intentionally deviates from `rpc-layer-api.md`'s `startContext(phase, target, options)` for testability and to avoid coupling read-only operations to RPC's `loadState` pattern. Phase 5 includes a task to update the architecture doc.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `ls src/core/context/` — directory not found
- [x] `grep "startContext" src/core/rpc/` — no match (function doesn't exist)

**After implementation** (should pass / show presence):
- [x] `npx tsc --noEmit` — passes
- [x] `bun test tests/unit/context/` — all context bundling tests pass

### Tasks

- [x] Add `'complete'` to `SubmitPhase` in `src/core/rpc/types.ts` — the `complete` phase has its own content priority ordering per rpc-layer-api.md. No `start-complete` command needed; context is assembled inline during `quest:complete`/`slice:complete`. Add a code comment on the `SubmitPhase` type clarifying its meaning now encompasses all phases with content priority orderings, not just `submit-*` command phases (e.g., `/** Phases that have content priority orderings for context bundling */`).
- [x] Create `src/core/context/index.ts` — exports `startContext(state, phase, target, options)` → `ContextBundle`. Read-only — no state mutations. Loads state tree via passed-in `ProjectState`, does NOT call `loadState()` (caller provides state). Returns `{ inline: Record<string, string>, references: string[], decisions: DecisionSummary[], learnings: LearningSummary[] }`. When `--inline` is not passed (no budget), `inline` is `{}` (empty object) and all content goes to `references`.
- [x] Create `src/core/context/priorities.ts` — per-phase content priority tables matching rpc-layer-api.md. Each phase maps to an ordered list of content sources: `{ key: string; path: string | ((target) => string); type: 'markdown' | 'directory' }`. All dynamic paths are simple template interpolation from `target` — no `state` dependency needed. Directory sources expand to all MarkdownEntry children via tree traversal. Priority order (per rpc-layer-api.md):
  - `plan`: entity goal, current architecture, target architecture, conventions, active decisions, recent learnings
  - `refinement`: plan, entity goal, current architecture, target architecture, conventions, decisions
  - `implementation`: refined plan, entity goal, current architecture, target architecture, conventions, relevant learnings
  - `explore`: epic goal, existing research/brainstorm, conventions, completed epics, completed quests, pending quests
  - `architecture`: epic goal, exploration output, conventions, existing architecture
  - `slices`: epic goal, full architecture, conventions, learnings
  - `refine-architecture`: epic goal, current architecture, exploration output, conventions, decisions, learnings
  - `refine-slices`: epic goal, full architecture, current slice definitions, conventions, learnings
  - `complete`: entity goal, remaining slice overview, implementation results, current architecture, target architecture, learnings at all levels (matches rpc-layer-api.md)
- [x] Create `src/core/context/collect.ts` — tree traversal functions:
  - `collectMarkdownEntries(state, path)`: resolve path to `DirectoryEntry`, walk `contents` recursively, collect all `MarkdownEntry` nodes with their state-tree-relative paths (e.g., `epics/my-epic/architecture/_overview.md` — matching the convention in `resolveEntityJsonPath()`). Commands layer resolves these via `projectDir + "/.project/" + key`. Only markdown — skip JSON/JSONL/directory-only entries.
  - `resolveContentSource(state, source, target)`: given a priority source definition, resolve it to `{ key: string; content: string }[]` (one or more entries depending on whether it's a single file or directory).
- [x] Create `src/core/context/budget.ts` — budget management:
  - `applyBudget(entries, budget)`: takes ordered `{ key: string; content: string }[]`, returns `{ inline: Record<string, string>; references: string[] }`. Iterates in priority order, adding entries to `inline` map until total byte size exceeds budget. Remaining entries go to `references[]` as file paths. Budget is total markdown content size in bytes — measure with `Buffer.byteLength(content, 'utf8')` (not `string.length` which returns UTF-16 code units). Default budget: 20480 (20KB, deliberate choice within the architecture's ~20-30KB range). JSDoc on `applyBudget`: document that the first priority entry is always inlined regardless of budget (design contract), and that `applyBudget([], anyBudget)` returns `{ inline: {}, references: [] }` (empty-entries case).
- [x] Create `src/core/context/decisions.ts` — `collectDecisions(state)`: reads `decisions.jsonl` from state, filters to active/revisiting, projects to `DecisionSummary[]`. If `decisions.jsonl` doesn't exist in state, returns empty array.
- [x] Create `src/core/context/learnings.ts` — `collectLearnings(state, scope?)`: reads `learnings.jsonl` from state (project level and optionally scope level), projects to `LearningSummary[]`. If files don't exist, returns empty array.
- [x] Create `src/core/context/types.ts` with `ContextBundle`, `DecisionSummary`, `LearningSummary` types (specified in rpc-layer-api.md but not yet in code). RPC layer imports from `src/core/context/types.ts` if needed — not the reverse. This keeps the dependency direction correct: context module is a peer, not a child of RPC.
- [x] Write unit tests in `tests/unit/context/`:
  - `collect.test.ts`: tree traversal collects only MarkdownEntry nodes, handles nested directories, handles empty directories, handles missing paths
  - `budget.test.ts`: entries fit within budget → all inlined; entries exceed budget → overflow goes to references; zero budget → all references; single large entry exceeds budget → still inlined (first entry always included); empty entries → `{ inline: {}, references: [] }`
  - `priorities.test.ts`: each phase has a valid priority table, priority order matches spec
  - `startContext.test.ts`: integration test — build a realistic state tree, call startContext for each phase, verify correct content is returned in priority order with budget applied
  - `decisions.test.ts`: active decisions included, superseded excluded, empty state handled
  - `learnings.test.ts`: learnings projected correctly, scope filtering works, empty state handled

### Verification
`npx tsc --noEmit` passes. `bun test tests/unit/context/` passes. Context module is pure (depends only on state tree types).
