# API Contract Review

Reviewer: API Contract
Scope: Entire architecture -- inter-subsystem contract coherence after recursive tree state model change
Goal: Ensure data layer, state machine, RPC layer, and commands layer contracts all reference the tree model consistently.

## Issues

**[CRITICAL] `_derived` references persist across multiple documents despite tree model replacing them**

The recursive `DirectoryEntry` tree replaced the old `_derived` concept -- guards now use `hasChild()` and `resolve()` on the tree. The `state-machine-api.md` "Directory-Based Guards" section (lines 252-260) correctly describes this replacement. However, several documents still reference `_derived` as if it exists:

- `flows.md` step 2 (generic flow): "recompute `_derived` fields"
- `flows.md` step 3 (init flow): "all `_derived` false"
- `flows.md` step 4 (slice:plan flow): "Checks `_derived`: slice goal exists"
- `flows.md` step 5 (status flow): "uses `_derived` fields to report sub-phase progress"
- `flows.md` step 5 (sub-agent flow): "checks `_derived.planContentProvided`"
- `rpc-layer-api.md` StatusResult description: "Derives status from the unified state object and `_derived` fields"
- `transition-tables.md` guards: `_derived.planContentProvided` and `_derived.refinedPlanExists` (slice rows 68-69, 75-76; quest rows 102-103, 108-109; cross-cutting guards table rows 146-147)

The transition tables are designated "source of truth for the state machine implementation and tests" but use `_derived` while the state machine API specifies tree-based guards. This is a direct contract conflict between two authoritative documents.

Resolution: DIRECTLY_ACTIONABLE

Fix: Replace all `_derived.planContentProvided` with `hasChild(state, "slices/<name>", "plan.md")` (and quest equivalents). Replace `_derived.refinedPlanExists` with `hasChild(state, "slices/<name>", "plan-refined.md")`. Remove "recompute `_derived` fields" from flows.md -- `loadState()` already captures directory contents via tree assembly. Update status flow to reference tree navigation.

---

**[CRITICAL] `dirHasFile()` function name conflicts with `hasChild()` -- same concept, two names**

Two different function names are used for the same operation across documents:

- `state-machine-api.md` lines 257-260: uses `dirHasFile(state, "slices/<name>", "plan.md")`
- `data-model.md` line 389: uses `dirHasFile(state, "epics/my-epic/research", "topic.md")`
- `data-model.md` lines 228: defines `hasChild(state: ProjectState, dirPath: string, childName: string): boolean`
- `data-layer-api.md` line 74: defines `hasChild(state: ProjectState, dirPath: string, childName: string): boolean`

The formally defined API in both the data-model and data-layer is `hasChild()`. The state-machine-api and a section of data-model use `dirHasFile()` informally. Since the state machine consumes this function for guards (a critical path), having two names for the same thing will cause implementation confusion.

Resolution: DIRECTLY_ACTIONABLE

Fix: Replace all `dirHasFile()` with `hasChild()` to match the formal API definition.

---

**[IMPORTANT] `getJson<T>()` return type disagrees between data-model.md and data-layer-api.md**

`data-model.md` line 224:
```typescript
function getJson<T>(state: ProjectState, path: string): JsonEntry<T> | undefined;
```

`data-layer-api.md` line 67:
```typescript
function getJson<T>(state: ProjectState, path: string): T | undefined;
```

The data-model returns the wrapper `JsonEntry<T>` (caller writes `result?.content.status`). The data-layer returns the unwrapped `T` (caller writes `result?.status`). Same function, different signatures in two documents that both claim to define it. The state machine guard examples in `data-model.md` lines 308-310 use the wrapped version:

```typescript
const epic = getJson<Epic>(state, "epics/goodplan-cli/epic.json");
epic?.content.status === "executing"
```

This contract disagreement will cause type errors at implementation time.

Similarly, `getJsonl<T>()` returns `JsonlEntry<T> | undefined` in data-model but `T[] | undefined` in data-layer.

Resolution: DIRECTLY_ACTIONABLE

Fix: The unwrapped versions (`T` and `T[]`) from data-layer-api.md are more ergonomic. Update data-model.md to match, and update the guard examples accordingly (e.g., `epic?.status` instead of `epic?.content.status`).

---

**[IMPORTANT] State Key Dependencies table references `_derived` in Reads column**

`state-machine-api.md` lines 226-248: Several event types in the State Key Dependencies table list `_derived` in their Reads column. With the tree model, these guards read specific `DirectoryEntry.contents` paths. The table should reference the actual tree paths.

Affected events and their actual reads:
- `COMPLETE_EXPLORE`: reads `epics/<name>/research/` directory contents (not `_derived`)
- `COMPLETE_ARCHITECTURE`: reads `epics/<name>/architecture/` directory contents
- `BEGIN_PLAN`: reads sibling slice statuses from `slices/` directory
- `COMPLETE_PLAN`: reads `slices/<name>/` contents for `plan.md` existence
- `BEGIN_QUEST_PLAN`, `COMPLETE_QUEST_PLAN`: reads `quests/<name>/` contents

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] data-model.md "Free-Form Markdown" section references nonexistent `files` array**

`data-model.md` line 389:
> Existence tracked in directory `files` arrays (e.g., `dirHasFile(state, "epics/my-epic/research", "topic.md")`)

The recursive tree model uses `DirectoryEntry.contents` -- a `Record<string, StateEntry>`. There is no `files` array anywhere in the tree model. This sentence describes a flat-map model that was replaced.

Resolution: DIRECTLY_ACTIONABLE

Fix: Replace with: "Existence tracked via `DirectoryEntry.contents` keys (e.g., `hasChild(state, "epics/my-epic/research", "topic.md")`)"

---

**[IMPORTANT] `complete()` RPC function uses `BeginPhase` type for its phase parameter**

`rpc-layer-api.md` line 14:
```typescript
function complete(phase: BeginPhase, target: Target, input: CompleteInput, options: WorkflowOptions): CompleteResult;
```

`BeginPhase` includes values like `'explore'`, `'define-architecture'`, `'plan'`, `'implement'` -- phases that represent the start of work. `complete()` maps to `COMPLETE_EPIC`, `COMPLETE_SLICE`, `COMPLETE_QUEST`, and `ABANDON_*` events. The command-to-RPC routing table (line 91) confirms: `epic:complete`, `slice:complete`, `quest:complete` and `*:abandon` use `complete()`. None of the `BeginPhase` values make sense here.

Resolution: DIRECTLY_ACTIONABLE

Fix: The `complete()` function should use a narrower type or infer the event from `target.type`. Options: (a) `type CompletePhase = 'complete' | 'abandon'`, or (b) remove the phase parameter since the event is determined by target type + the `CompleteInput` shape (which already distinguishes completion from abandonment via presence of `reason` field vs `verificationPassed`).

---

**[IMPORTANT] data-model.md example state tree has type error for `plan-refined.md`**

`data-model.md` line 278-279:
```typescript
"plan-refined.md": { type: "json", content: "..." },
```

This should be `type: "markdown"` since `plan-refined.md` is an LLM-written markdown file. The entry directly above it (`plan.md` on line 277) correctly uses `type: "markdown"`. This is both a documentation error and a contract violation -- the `assembleState()` function will produce a `MarkdownEntry` for `.md` files per the data-layer-api spec (line 23: "`.md` files are read as text and stored as `MarkdownEntry`").

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] Context bundling reads from MarkdownEntry nodes, but per-phase priority tables reference paths, not tree locations**

The RPC layer's context bundling (rpc-layer-api.md lines 231-244) describes priority lists like "current architecture overview, target architecture overview, conventions." The Dependencies section (line 295) confirms: "Context bundling reads markdown content directly from `MarkdownEntry` nodes in the state tree."

However, the priority tables use vague references like "current architecture" and "target architecture" without specifying the tree paths. The context module needs to resolve these to specific tree locations:
- "current architecture" = `resolve(state, "architecture/")` (project-level, a DirectoryEntry)
- "target architecture" = `resolve(state, "epics/<activeEpic>/architecture/")` (epic-level)
- "conventions" = `resolve(state, "conventions.md")` (a MarkdownEntry)

For directory entries like `architecture/`, the context module needs to iterate `contents` and collect all `MarkdownEntry` children. This traversal pattern is not documented in the context bundling contract.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a brief note to the context bundling section explaining that directory references (e.g., "current architecture") resolve to `DirectoryEntry` nodes, and all `MarkdownEntry` children within are eligible for inlining. Optionally add the concrete tree paths for each priority item.

---

**[MINOR] Status enum values in state-machine-api.md disagree with transition table status names**

`state-machine-api.md` defines:
```typescript
type EpicStatus = 'created' | 'exploring' | 'explored' | 'architecting' | 'architected'
  | 'refining-architecture' | 'slicing' | 'sliced' | 'refining-slices' | 'ready'
  | 'executing' | 'complete' | 'abandoned';
```

`transition-tables.md` uses different names for many statuses:
- `defining-architecture` (tables) vs `architecting` (enum)
- `architecture-defined` (tables) vs `architected` (enum)
- `architecture-refined` (tables) vs not in enum
- `defining-slices` (tables) vs `slicing` (enum)
- `slices-defined` (tables) vs `sliced` (enum)
- `slices-refined` (tables) vs not in enum
- `activated` (tables) vs `executing` / `ready` (enum)
- `completed` (tables) vs `complete` (enum)

For slices: `plan-created` (tables) vs `planned` (enum), `implementation-complete` (tables) vs `implemented` (enum).

The transition tables are "the source of truth for the state machine implementation and tests." The enums should match.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Schema registry pattern coherent but path construction during tree walk is not specified**

The schema registry matches paths like `epics/[^/]+/epic.json` against patterns. During `commitState()`'s recursive tree diff, the implementation must build a path string by concatenating directory names as it walks. This path construction algorithm (root = empty string, each level appends `childName + "/"`) is implicit. If the root starts with a leading slash or the path uses OS-specific separators, patterns won't match.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a one-liner to the schema registry section specifying that paths are always forward-slash-separated, rooted at the `.project/` directory with no leading slash (e.g., `"epics/goodplan-cli/epic.json"`).

---

**[MINOR] `getMarkdown()` helper defined in data-layer-api.md but absent from data-model.md**

`data-layer-api.md` line 70 defines:
```typescript
function getMarkdown(state: ProjectState, path: string): string | undefined;
```

`data-model.md` lines 220-229 defines `resolve()`, `getJson()`, `getJsonl()`, `getDir()`, and `hasChild()` but omits `getMarkdown()`. Since context bundling reads markdown nodes from the tree, this helper is important and should be consistent across both documents.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The recursive tree model itself is well-designed -- `StateEntry` as a discriminated union, `DirectoryEntry` with recursive `contents`, path-based navigation helpers, and the schema registry are all coherent in data-model.md. The data-layer-api.md is largely aligned.

However, the migration to this model is incomplete across the document set. The `_derived` concept that the tree replaced still appears in flows.md, transition-tables.md, and parts of rpc-layer-api.md. Two different function names (`dirHasFile` vs `hasChild`) refer to the same operation. The tree navigation helpers have conflicting return types between data-model.md and data-layer-api.md. The transition table status names disagree with the state machine enums.

To reach 9+: (1) Eliminate all `_derived` references and replace with tree-based equivalents. (2) Standardize on `hasChild()` everywhere. (3) Align `getJson/getJsonl` return types between data-model and data-layer. (4) Fix the `complete()` RPC function phase type. (5) Reconcile enum values with transition table statuses. (6) Specify context bundling tree traversal for directory entries.

## Summary
- Critical: 2
- Important: 6
- Minor: 3
