# Software Architecture Review

Reviewer: Software Architecture
Scope: Entire architecture directory
Goal: Ensure the recursive tree state model (StateEntry/ProjectState) is well integrated across all architecture files.

## Issues

**[CRITICAL]** Epic status enum in state-machine-api.md does not match transition table statuses
The `EpicStatus` type in state-machine-api.md uses: `'exploring' | 'explored' | 'architecting' | 'architected' | 'refining-architecture' | 'slicing' | 'sliced' | 'refining-slices' | 'ready' | 'executing'`. But the transition tables in transition-tables.md use entirely different status names: `'defining-architecture' | 'architecture-defined' | 'refining-architecture' | 'architecture-refined' | 'defining-slices' | 'slices-defined' | 'refining-slices' | 'slices-refined' | 'activated'`. There are multiple mismatches: `architecting` vs `defining-architecture`, `architected` vs `architecture-defined`, `sliced` vs `slices-defined`, `ready` vs `slices-refined`, `executing` vs `activated`. This breaks the core contract: the fitness function "every (status, event) pair is handled" cannot pass if the enum and the transition table disagree. One of the two must be canonical.
File: state-machine-api.md (lines 125-127), transition-tables.md (Epic Lifecycle table)
Resolution: DIRECTLY_ACTIONABLE — update the `EpicStatus` enum to match the transition table values (the transition tables are more detailed and internally consistent). The corrected enum: `'created' | 'exploring' | 'explored' | 'defining-architecture' | 'architecture-defined' | 'refining-architecture' | 'architecture-refined' | 'defining-slices' | 'slices-defined' | 'refining-slices' | 'slices-refined' | 'activated' | 'completed' | 'abandoned'`.

**[CRITICAL]** `_derived` references remain across multiple files despite tree model replacement
The data-model.md explicitly states that directory `contents` keys replace the old `_derived` map, and state-machine-api.md has a "Directory-Based Guards (replaces _derived)" section. Yet `_derived` references persist in:
- state-machine-api.md State Key Dependencies table (6 rows referencing `_derived` in the Reads column)
- rpc-layer-api.md StatusResult doc: "Derives status from the unified state object and `_derived` fields"
- flows.md: 5 references to `_derived` (steps 2, 3, 4, 5 of various flows, and the sub-agent flow step 5)
- transition-tables.md: 8 guard conditions using `_derived.planContentProvided` and `_derived.refinedPlanExists`
- transition-tables.md Cross-Cutting Guards table: 2 rows referencing `_derived`
These should all use the tree-based `hasChild()` guard pattern.
Files: state-machine-api.md, rpc-layer-api.md, flows.md, transition-tables.md
Resolution: DIRECTLY_ACTIONABLE — replace all `_derived` references:
- State Key Dependencies: replace `_derived` reads with the specific directory paths being checked (e.g., `slices/<name>/` for plan existence)
- transition-tables.md guards: replace `_derived.planContentProvided == true` with `hasChild(state, "slices/<name>", "plan.md")` and `_derived.refinedPlanExists == true` with `hasChild(state, "slices/<name>", "plan-refined.md")`
- flows.md: replace `_derived` steps with tree navigation descriptions
- rpc-layer-api.md: remove `_derived` mention from StatusResult

**[IMPORTANT]** `dirHasFile()` function referenced in state-machine-api.md and data-model.md but not defined anywhere
The "Directory-Based Guards" section in state-machine-api.md uses `dirHasFile(state, dirPath, filename)`. data-model.md line 389 also references it. But the data-model.md tree navigation API defines `hasChild(state, dirPath, childName)` which serves the exact same purpose. The data-layer-api.md tree navigation helpers section also uses `hasChild`. This is a naming inconsistency — two names for the same function.
Files: state-machine-api.md (lines 254-260), data-model.md (line 389)
Resolution: DIRECTLY_ACTIONABLE — replace all `dirHasFile` references with `hasChild` to match the canonical definition in data-model.md and data-layer-api.md.

**[IMPORTANT]** data-model.md "Free-Form Markdown" section references stale `files` array concept
data-model.md line 389: "Existence tracked in directory `files` arrays (e.g., `dirHasFile(state, "epics/my-epic/research", "topic.md")`)" — this references a `files` array concept from the old flat model. In the new tree model, existence is tracked via `contents` keys on `DirectoryEntry`. The data-model.md line 173 comment explicitly says "no separate `files` array needed." This section contradicts the tree model definition that appears earlier in the same file.
File: data-model.md (line 389)
Resolution: DIRECTLY_ACTIONABLE — rewrite to: "Existence tracked via directory `contents` keys (e.g., `hasChild(state, "epics/my-epic/research", "topic.md")`)"

**[IMPORTANT]** state-machine-api.md "Directory-Based Guards" section references stale `files` arrays
state-machine-api.md line 254: "File existence checks use directory `files` arrays via `dirHasFile(state, dirPath, filename)`" and line 260: "checking `files.length > 0`". The tree model uses `contents` (a Record), not `files` (an array). Should be `Object.keys(dir.contents).length > 0`.
File: state-machine-api.md (lines 254, 260)
Resolution: DIRECTLY_ACTIONABLE — replace "directory `files` arrays" with "directory `contents` keys" and `files.length > 0` with `Object.keys(dir.contents).length > 0`. Replace `dirHasFile` with `hasChild`.

**[IMPORTANT]** data-model.md example has wrong type for plan-refined.md entry
data-model.md line 278: `"plan-refined.md": { type: "json", content: "..." }` — a `.md` file should be `{ type: "markdown", content: "..." }`, not `{ type: "json" }`. This is a copy-paste error in the example state tree.
File: data-model.md (line 278)
Resolution: DIRECTLY_ACTIONABLE — change to `{ type: "markdown", content: "..." }`.

**[IMPORTANT]** Slice status enum `'plan-refined'` doesn't match transition table `'plan-created'`
The `SliceStatus` type in state-machine-api.md lists: `'defined' | 'planning' | 'planned' | 'refining' | 'plan-refined' | 'implementing' | 'implemented' | 'complete' | 'abandoned'`. The transition table has the status `plan-created` (after COMPLETE_PLAN) and `implementation-complete` (after COMPLETE_IMPLEMENTATION), neither of which appear in the enum. The enum has `planned` and `implemented` which don't appear in the transition table. Same issue for QuestStatus.
File: state-machine-api.md (lines 129-133)
Resolution: DIRECTLY_ACTIONABLE — update SliceStatus to match transition table: `'created' | 'planning' | 'plan-created' | 'refining' | 'plan-refined' | 'implementing' | 'implementation-complete' | 'completed' | 'abandoned'`. Apply same fix for QuestStatus: `'created' | 'planning' | 'plan-created' | 'refining' | 'plan-refined' | 'implementing' | 'implementation-complete' | 'completed' | 'abandoned'`. Note the transition table also uses `completed` (not `complete`) for the terminal state — verify and align.

**[IMPORTANT]** `loadState()` section in data-layer-api.md references `readdirSync` for recomputing directory contents, conflicting with state-machine-api.md's claim that the data layer recomputes `files` arrays
state-machine-api.md line 254 says "The data layer recomputes directory `files` arrays from the filesystem on each `loadState()` call" — but the actual mechanism (data-layer-api.md line 34, data-model.md line 356) is recomputing `contents` keys via `readdirSync`. The state-machine-api.md description should not describe data layer internals at all (separation of concerns), and uses the wrong terminology.
File: state-machine-api.md (line 254)
Resolution: DIRECTLY_ACTIONABLE — simplify the "Directory-Based Guards" section to focus only on how the state machine uses the tree (via `hasChild`), removing the sentence about data layer recomputation mechanics. The data layer's caching strategy is its own concern.

**[MINOR]** flows.md step 2 mentions "recompute `_derived` fields" as a distinct RPC step
In the tree model, there's no separate recomputation step — `loadState()` returns a complete tree with directory contents already populated. The step should just be "load state" without mentioning derived field computation.
File: flows.md (line 8)
Resolution: DIRECTLY_ACTIONABLE — change "load state (from cache or full assembly), recompute `_derived` fields" to "load state (from cache or full assembly)".

**[MINOR]** `commitState()` diff algorithm in data-model.md step 4 says "Key in old but not new -> entity removed" but data-layer-api.md step 7 says "generally no-op"
The two files describe the removal case slightly differently. data-model.md says "generally kept for audit trail; implementation decides policy" while data-layer-api.md says "generally no-op" and mentions optional deletion with a flag. These should be aligned.
File: data-model.md (line 348), data-layer-api.md (line 54)
Resolution: DIRECTLY_ACTIONABLE — align wording. Suggest data-model.md match data-layer-api.md: "Key in old but not new -> no-op (abandoned entities kept for audit trail; optional deletion flag available)."

**[MINOR]** `writeEntity()` and `appendRecord()` referenced in invariants.md but not in data-layer-api.md
INV-001 references `writeEntity()` and INV-002 references `writeEntity()` and `appendRecord()`. These were individual functions from the old flat API. In the new 3-function API (`assembleState`, `loadState`, `commitState`), these are internal implementation details of `commitState()`. The invariants should reference `commitState` instead.
File: invariants.md (INV-001, INV-002, INV-005)
Resolution: DIRECTLY_ACTIONABLE — update invariant verification descriptions to reference `commitState()` rather than the removed individual functions.

**[MINOR]** `readEntity()` and `readRecords()` referenced in INV-005 but no longer exist
INV-005 says "Every read parses through Zod" and references `readEntity()`, `writeEntity()`, `readRecords()`, `appendRecord()`. These are from the old API. In the new model, reads happen via `assembleState()` and writes via `commitState()`.
File: invariants.md (INV-005)
Resolution: DIRECTLY_ACTIONABLE — update to reference `assembleState()` (read path) and `commitState()` (write path).

## Score: 5/10

The recursive tree model (StateEntry/ProjectState/DirectoryEntry) is well-designed in data-model.md and data-layer-api.md. However, the migration from the old flat model is incomplete. Two critical issues (status enum mismatches between state-machine-api.md and transition-tables.md, pervasive `_derived` references in 4 files) mean the architecture is internally inconsistent in ways that would cause implementation confusion. The important-severity naming inconsistencies (`dirHasFile` vs `hasChild`, `files` arrays vs `contents` keys) compound this. With the 2x weighting on module depth criteria: the state machine's interface is deep and well-designed (small `reduce()` surface hiding complex transition logic), but the inconsistent status enums effectively break the interface contract. To reach 9+: fix the two critical issues and the important-severity inconsistencies.

## Summary
- Critical: 2
- Important: 6
- Minor: 4
