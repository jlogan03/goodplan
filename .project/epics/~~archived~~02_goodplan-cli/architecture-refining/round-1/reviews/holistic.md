# Holistic Architecture Review — Round 1

Confirmed goal: Ensure the recursive tree state model is well integrated across all architecture files. Internal consistency, coherent contracts, opportunities to leverage the tree model.

## Issues

**[CRITICAL]** EpicStatus enum in state-machine-api.md does not match transition-tables.md statuses

The `EpicStatus` type in state-machine-api.md defines:
```
'created' | 'exploring' | 'explored' | 'architecting' | 'architected'
  | 'refining-architecture' | 'slicing' | 'sliced' | 'refining-slices' | 'ready'
  | 'executing' | 'complete' | 'abandoned'
```

But transition-tables.md (the declared source of truth) uses different status names:
- `defining-architecture` (tables) vs `architecting` (enum)
- `architecture-defined` (tables) vs `architected` (enum)
- `architecture-refined` (tables) -- not in enum at all
- `defining-slices` (tables) vs `slicing` (enum)
- `slices-defined` (tables) vs `sliced` (enum)
- `slices-refined` (tables) -- not in enum at all
- `activated` (tables) vs `ready` then `executing` (enum) -- enum has both `ready` and `executing`, tables only have `activated`
- `completed` (tables) vs `complete` (enum)

The transition tables are the declared source of truth. The enum must be updated to match.

Files: `state-machine-api.md` (lines 125-127), `transition-tables.md` (all epic rows)
Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** SliceStatus and QuestStatus enums do not match transition-tables.md statuses

`SliceStatus` enum values vs transition table values:
- `defined` (enum) vs `created` (tables) -- initial status mismatch
- `planned` (enum) vs `plan-created` (tables)
- `implemented` (enum) vs `implementation-complete` (tables)
- `complete` (enum) vs `completed` (tables)

Same mismatches apply to `QuestStatus`.

An implementer cannot write correct TypeScript from these contradictions. The transition tables should be authoritative; the enums must be updated.

Files: `state-machine-api.md` (lines 129-133), `transition-tables.md` (slice and quest rows)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Stale `_derived` references in flows.md, rpc-layer-api.md, transition-tables.md, state-machine-api.md

The data-model.md correctly defines the recursive tree model where `DirectoryEntry.contents` replaces `_derived`. The state-machine-api.md has a "Directory-Based Guards (replaces _derived)" section explaining the new approach with `hasChild()`. However, 4 other files still use the old model:

- **flows.md** (lines 8, 26, 44, 91, 125): "recompute `_derived` fields", "`_derived.planContentProvided`", "all `_derived` false"
- **rpc-layer-api.md** (line 268): "Derives status from the unified state object and `_derived` fields"
- **state-machine-api.md** State Key Dependencies table (lines 226-232): multiple `_derived` entries in Reads column
- **transition-tables.md** (lines 68-69, 75-76, 102-103, 108-109, 146-147): guards reference `_derived.planContentProvided` and `_derived.refinedPlanExists`

All should be rewritten to use `hasChild(state, path, filename)` per the tree model. For example, `_derived.planContentProvided` becomes `hasChild(state, "slices/<name>", "plan.md")`.

Files: `flows.md`, `rpc-layer-api.md`, `state-machine-api.md`, `transition-tables.md`
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `dirHasFile` function name used in state-machine-api.md and data-model.md but actual API defines `hasChild`

The state-machine-api.md "Directory-Based Guards" section (lines 254-260) uses `dirHasFile()`. The data-model.md Storage section (line 389) also uses `dirHasFile()`. But the tree navigation helpers defined in both data-model.md (line 228) and data-layer-api.md (line 74) define `hasChild()` -- not `dirHasFile`. Additionally, the state-machine-api.md section references "directory `files` arrays" but data-model.md line 173 explicitly says "contents keys ARE the file/directory listing (no separate `files` array needed)."

Standardize on `hasChild()` and "directory `contents` keys" throughout.

Files: `data-model.md` (line 389), `state-machine-api.md` (lines 254-260)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** data-model.md example state tree has wrong type for `plan-refined.md`

In the example state tree (line 278), `plan-refined.md` is typed as:
```typescript
"plan-refined.md": { type: "json", content: "..." },
```
It should be `{ type: "markdown", content: "..." }`. A refined plan is markdown, not JSON. This would confuse implementers writing `commitState()` logic since JSON entries get schema validation but markdown entries do not.

File: `data-model.md` (line 278)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `writeEntity`/`appendRecord`/`readEntity`/`readRecords` referenced in invariants.md but not in data-layer-api.md

INV-001 references `writeEntity()` calls. INV-002 references `writeEntity()` and `appendRecord()`. INV-005 references `readEntity()`, `writeEntity()`, `readRecords()`, `appendRecord()`. These are all vestigial from a pre-tree-model API. The data-layer-api.md defines only three public functions: `assembleState`, `loadState`, `commitState` (plus tree navigation helpers). Invariant descriptions should reference `commitState()` for writes and `assembleState()`/`loadState()` for reads.

File: `invariants.md` (INV-001, INV-002, INV-005)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** flows.md generic flow and init flow describe pre-tree-model data loading

The generic state transition flow step 2 says "load state (from cache or full assembly), recompute `_derived` fields." With the tree model, `loadState()` returns the full `ProjectState` tree with directory contents already populated -- there is no separate `_derived` recomputation step.

The init flow step 3 says `assembleState()` returns "empty `ProjectState`, no files, all `_derived` false." With the tree model, this is simply `{ type: "directory", contents: {} }`.

The sub-agent flow step 5 says "RPC checks `_derived.planContentProvided`" -- should be `hasChild(state, "slices/01-auth", "plan.md")`.

File: `flows.md` (lines 8, 26, 44, 91, 125)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Transition tables missing skip path from `plan-created` directly to `implementing`

The epic lifecycle has explicit skip paths for every phase (e.g., `created` -> `COMPLETE_EXPLORE` -> `explored` skips exploration; `architecture-defined` -> `COMPLETE_REFINE_ARCHITECTURE` -> `architecture-refined` skips refinement). But slice/quest lifecycle has no skip path from `plan-created` to `implementing` that bypasses refinement entirely.

The current workaround is `plan-created` -> `COMPLETE_REFINEMENT_ROUND` (with passing scores on first round) -> `plan-refined` -> `BEGIN_IMPLEMENTATION`. This works but is asymmetric with the epic pattern where skip = calling the COMPLETE event directly from the pre-phase state. Should there be a `plan-created` + `BEGIN_IMPLEMENTATION` row? Or is mandatory refinement (even if 1 round) intentional?

File: `transition-tables.md` (slice and quest sections)
Resolution: USER_INPUT

---

**[MINOR]** data-layer-api.md `getJson`/`getJsonl` return types differ from data-model.md

data-model.md defines `getJson<T>()` returning `JsonEntry<T> | undefined` (wrapped). data-layer-api.md defines `getJson<T>()` returning `T | undefined` (unwrapped). Same for `getJsonl<T>()`. The unwrapped version is more ergonomic but loses the discriminated union type tag. Pick one and standardize.

Files: `data-model.md` (lines 225-226), `data-layer-api.md` (lines 67-68)
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** data-layer-api.md defines `getMarkdown` helper not present in data-model.md

data-layer-api.md line 70 defines `getMarkdown(state, path): string | undefined`. data-model.md's tree navigation helpers section (lines 220-228) does not include this function. Either add it to data-model.md or establish that data-layer-api.md is the canonical location for the complete helper set and data-model.md only shows representative examples.

Files: `data-layer-api.md` (line 70), `data-model.md` (lines 220-228)
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Opportunity: tree model enables simpler context bundling -- not yet leveraged in rpc-layer-api.md

The RPC layer description says context bundling reads "content via the Data Layer" and "from `MarkdownEntry` nodes in the state tree." But the per-phase content priority tables in rpc-layer-api.md still describe content by reference to filesystem paths (e.g., "architecture/*.md"). With the tree model, the context module can walk `getDir(state, "epics/<name>/architecture")?.contents` and iterate over `MarkdownEntry` nodes directly. This is already implied but could be made explicit -- it eliminates the need for any filesystem glob during context assembly.

File: `rpc-layer-api.md` (per-phase content priority table)
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** State Key Dependencies table in state-machine-api.md uses path strings that don't match tree navigation

The table uses paths like `epics/<name>/epic.json` and `slices/<name>/slice.json`. These are correct as tree paths for `resolve()`, but the table also uses `_derived` which doesn't exist in the tree. Beyond removing `_derived`, the table is a useful reference for future partial-loading optimization and should be kept accurate. Consider noting that these are `resolve()` paths into the `ProjectState` tree.

File: `state-machine-api.md` (State Key Dependencies section)
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Cross-Cutting Guards table in transition-tables.md uses `_derived` notation

The "Content exists" and "Refined plan exists" rows use `_derived.planContentProvided` and `_derived.refinedPlanExists`. These should use `hasChild()` notation consistent with the tree model.

File: `transition-tables.md` (Cross-Cutting Guards table, lines 146-147)
Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The recursive tree model itself (StateEntry union, ProjectState, zero state, recursive diff, schema registry) is well-designed in data-model.md. The core idea of mirroring `.project/` as an in-memory tree and diffing to commit changes is clean and powerful.

However, the integration of this model across the 10 architecture files is incomplete. Two critical enum mismatches between state-machine-api.md and transition-tables.md would block any correct implementation. Pervasive stale `_derived` references across 4 files show the tree model update was applied to data-model.md (and partially to state-machine-api.md's guard section) but not propagated to flows, RPC, transition tables, or invariants. There is also a naming split between `dirHasFile` and `hasChild` and between `files` arrays and `contents` keys.

To reach 9+: (1) Align all three status enums with the transition tables. (2) Replace every `_derived` reference with tree-model equivalents using `hasChild()`. (3) Fix `dirHasFile` -> `hasChild` and "files arrays" -> "contents keys". (4) Update invariants to reference the actual 3-function data layer API. (5) Fix the type error in the example state tree. (6) Reconcile `getJson`/`getJsonl` return types between data-model.md and data-layer-api.md.

## Summary
- Critical: 2
- Important: 6
- Minor: 5
