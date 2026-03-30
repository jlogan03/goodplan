# Phase 4: Context Bundling Module

Create `src/core/context/` — the `startContext()` function with per-phase priority tables, tree traversal for MarkdownEntry collection, and `--inline` budget logic. This is the novel piece — no prior codebase precedent.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/context/` — directory not found
- [ ] `grep "startContext" src/core/rpc/` — no match (function doesn't exist)

**After implementation** (should pass / show presence):
- [ ] `npx tsc --noEmit` — passes
- [ ] `bun test tests/unit/context/` — all context bundling tests pass

### Tasks

- [ ] Create `src/core/context/index.ts` — exports `startContext(state, phase, target, options)` → `ContextBundle`. Read-only — no state mutations. Loads state tree via passed-in `ProjectState`, does NOT call `loadState()` (caller provides state). Returns `{ inline: Record<string, string>, references: string[], decisions: DecisionSummary[], learnings: LearningSummary[] }`.
- [ ] Create `src/core/context/priorities.ts` — per-phase content priority tables matching rpc-layer-api.md. Each phase maps to an ordered list of content sources: `{ key: string; path: string | ((state, target) => string); type: 'markdown' | 'directory' }`. Directory sources expand to all MarkdownEntry children via tree traversal. Priority order (per rpc-layer-api.md):
  - `plan`: entity goal, current architecture, target architecture, conventions, active decisions, recent learnings
  - `refinement`: plan, entity goal, current architecture, target architecture, conventions, decisions
  - `implementation`: refined plan, entity goal, current architecture, target architecture, conventions, relevant learnings
  - `explore`: epic goal, existing research/brainstorm, conventions, completed epics, completed quests, pending quests
  - `architecture`: epic goal, exploration output, conventions, existing architecture
  - `slices`: epic goal, full architecture, conventions, learnings
  - `refine-architecture`: epic goal, current architecture, exploration output, conventions, decisions, learnings
  - `refine-slices`: epic goal, full architecture, current slice definitions, conventions, learnings
- [ ] Create `src/core/context/collect.ts` — tree traversal functions:
  - `collectMarkdownEntries(state, path)`: resolve path to `DirectoryEntry`, walk `contents` recursively, collect all `MarkdownEntry` nodes with their relative paths. Only markdown — skip JSON/JSONL/directory-only entries.
  - `resolveContentSource(state, source, target)`: given a priority source definition, resolve it to `{ key: string; content: string }[]` (one or more entries depending on whether it's a single file or directory).
- [ ] Create `src/core/context/budget.ts` — budget management:
  - `applyBudget(entries, budget)`: takes ordered `{ key: string; content: string }[]`, returns `{ inline: Record<string, string>; references: string[] }`. Iterates in priority order, adding entries to `inline` map until total byte size exceeds budget. Remaining entries go to `references[]` as file paths. Budget is total markdown content size in bytes (UTF-8 encoded). Default budget: 20480 (20KB).
- [ ] Create `src/core/context/decisions.ts` — `collectDecisions(state)`: reads `decisions.jsonl` from state, filters to active/revisiting, projects to `DecisionSummary[]`. If `decisions.jsonl` doesn't exist in state, returns empty array.
- [ ] Create `src/core/context/learnings.ts` — `collectLearnings(state, scope?)`: reads `learnings.jsonl` from state (project level and optionally scope level), projects to `LearningSummary[]`. If files don't exist, returns empty array.
- [ ] Add `ContextBundle`, `DecisionSummary`, `LearningSummary` types to `src/core/rpc/types.ts` (or create `src/core/context/types.ts` and re-export from rpc types). These types are already specified in rpc-layer-api.md but not yet in code.
- [ ] Write unit tests in `tests/unit/context/`:
  - `collect.test.ts`: tree traversal collects only MarkdownEntry nodes, handles nested directories, handles empty directories, handles missing paths
  - `budget.test.ts`: entries fit within budget → all inlined; entries exceed budget → overflow goes to references; zero budget → all references; single large entry exceeds budget → still inlined (first entry always included)
  - `priorities.test.ts`: each phase has a valid priority table, priority order matches spec
  - `startContext.test.ts`: integration test — build a realistic state tree, call startContext for each phase, verify correct content is returned in priority order with budget applied
  - `decisions.test.ts`: active decisions included, superseded excluded, empty state handled
  - `learnings.test.ts`: learnings projected correctly, scope filtering works, empty state handled

### Verification
`npx tsc --noEmit` passes. `bun test tests/unit/context/` passes. Context module is pure (depends only on state tree types).
