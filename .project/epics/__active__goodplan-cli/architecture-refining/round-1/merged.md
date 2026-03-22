# Merged Architecture Review — Round 1

Reviewers: Software Architecture (5/10), Holistic (4/10), API Contract (5/10)
Goal: Ensure the recursive tree state model (StateEntry/ProjectState) is well integrated across all architecture files.

---

## CRITICAL Issues

### C1. Status enums in state-machine-api.md do not match transition-tables.md (source of truth)

**Flagged by:** All 3 reviewers
**Resolution:** DIRECTLY_ACTIONABLE

**EpicStatus** mismatches (enum value vs transition table value):
- `architecting` vs `defining-architecture`
- `architected` vs `architecture-defined`
- missing `architecture-refined` in enum
- `slicing` vs `defining-slices`
- `sliced` vs `slices-defined`
- missing `slices-refined` in enum
- `ready` / `executing` vs `activated`
- `complete` vs `completed`

**SliceStatus** mismatches:
- `defined` vs `created`
- `planned` vs `plan-created`
- `implemented` vs `implementation-complete`
- `complete` vs `completed`

**QuestStatus** has the same mismatches as SliceStatus.

**Files:** `state-machine-api.md` (lines 125-133), `transition-tables.md`

**Fix:** Update all three enums to match the transition table values. Corrected EpicStatus: `'created' | 'exploring' | 'explored' | 'defining-architecture' | 'architecture-defined' | 'refining-architecture' | 'architecture-refined' | 'defining-slices' | 'slices-defined' | 'refining-slices' | 'slices-refined' | 'activated' | 'completed' | 'abandoned'`. Corrected SliceStatus and QuestStatus: `'created' | 'planning' | 'plan-created' | 'refining' | 'plan-refined' | 'implementing' | 'implementation-complete' | 'completed' | 'abandoned'`.

### C2. Pervasive stale `_derived` references across 4 files

**Flagged by:** All 3 reviewers
**Resolution:** DIRECTLY_ACTIONABLE

The tree model's `DirectoryEntry.contents` replaced `_derived`, and `state-machine-api.md` has a section explaining this. Yet `_derived` persists in:

- **state-machine-api.md** State Key Dependencies table: 6 rows with `_derived` in Reads column
- **flows.md**: 5 references ("recompute `_derived` fields", "`_derived.planContentProvided`", "all `_derived` false", etc.)
- **rpc-layer-api.md** StatusResult: "Derives status from the unified state object and `_derived` fields"
- **transition-tables.md**: 8 guard conditions using `_derived.planContentProvided` and `_derived.refinedPlanExists`, plus 2 rows in Cross-Cutting Guards table

**Files:** `state-machine-api.md`, `flows.md`, `rpc-layer-api.md`, `transition-tables.md`

**Fix:** Replace all `_derived` references with tree-based equivalents:
- `_derived.planContentProvided` -> `hasChild(state, "slices/<name>", "plan.md")`
- `_derived.refinedPlanExists` -> `hasChild(state, "slices/<name>", "plan-refined.md")`
- State Key Dependencies: replace `_derived` reads with specific directory paths being checked
- flows.md step 2: change "load state, recompute `_derived` fields" to "load state"
- flows.md init flow: change "all `_derived` false" to `{ type: "directory", contents: {} }`
- rpc-layer-api.md: remove `_derived` mention from StatusResult

---

## IMPORTANT Issues

### I1. `dirHasFile()` vs `hasChild()` — two names for the same function

**Flagged by:** All 3 reviewers
**Resolution:** DIRECTLY_ACTIONABLE

`state-machine-api.md` and `data-model.md` (line 389) use `dirHasFile()`. The formal API definitions in `data-model.md` (line 228) and `data-layer-api.md` (line 74) define `hasChild()`. Same function, two names.

Additionally, `state-machine-api.md` references "directory `files` arrays" but the tree model uses `DirectoryEntry.contents` (a `Record<string, StateEntry>`). `data-model.md` line 173 says "no separate `files` array needed."

**Files:** `state-machine-api.md` (lines 254-260), `data-model.md` (line 389)

**Fix:** Replace all `dirHasFile` with `hasChild`. Replace "directory `files` arrays" with "directory `contents` keys". Replace `files.length > 0` with `Object.keys(dir.contents).length > 0`.

### I2. `getJson<T>()` and `getJsonl<T>()` return types disagree between data-model.md and data-layer-api.md

**Flagged by:** API Contract, Holistic
**Resolution:** DIRECTLY_ACTIONABLE

- data-model.md: `getJson<T>()` returns `JsonEntry<T> | undefined` (wrapped)
- data-layer-api.md: `getJson<T>()` returns `T | undefined` (unwrapped)
- Same disagreement for `getJsonl<T>()` (`JsonlEntry<T> | undefined` vs `T[] | undefined`)

State machine guard examples in data-model.md use the wrapped version (`epic?.content.status`).

**Files:** `data-model.md` (lines 224-226), `data-layer-api.md` (lines 67-68)

**Fix:** Standardize on the unwrapped versions (`T` and `T[]`) from data-layer-api.md as they are more ergonomic. Update data-model.md definitions and guard examples accordingly (e.g., `epic?.status` instead of `epic?.content.status`).

### I3. data-model.md example state tree has wrong type for `plan-refined.md`

**Flagged by:** All 3 reviewers
**Resolution:** DIRECTLY_ACTIONABLE

`"plan-refined.md": { type: "json", content: "..." }` should be `{ type: "markdown", content: "..." }`. Copy-paste error; `.md` files produce `MarkdownEntry` per `assembleState()` spec.

**File:** `data-model.md` (line 278)

**Fix:** Change to `{ type: "markdown", content: "..." }`.

### I4. data-model.md "Free-Form Markdown" section references stale `files` array concept

**Flagged by:** All 3 reviewers
**Resolution:** DIRECTLY_ACTIONABLE

Line 389: "Existence tracked in directory `files` arrays (e.g., `dirHasFile(state, ...)`)" references a flat-model concept. The tree model uses `contents` keys.

**File:** `data-model.md` (line 389)

**Fix:** Rewrite to: "Existence tracked via directory `contents` keys (e.g., `hasChild(state, "epics/my-epic/research", "topic.md")`)"

### I5. Invariants reference removed data-layer functions

**Flagged by:** Software Architecture, Holistic
**Resolution:** DIRECTLY_ACTIONABLE

INV-001, INV-002, INV-005 reference `writeEntity()`, `appendRecord()`, `readEntity()`, `readRecords()` — individual functions from the old flat API. The new 3-function API is `assembleState`, `loadState`, `commitState`.

**File:** `invariants.md` (INV-001, INV-002, INV-005)

**Fix:** Update to reference `commitState()` for writes and `assembleState()`/`loadState()` for reads.

### I6. `complete()` RPC function uses `BeginPhase` type for its phase parameter

**Flagged by:** API Contract
**Resolution:** DIRECTLY_ACTIONABLE

`complete(phase: BeginPhase, ...)` but `BeginPhase` values (`'explore'`, `'define-architecture'`, `'plan'`, `'implement'`) represent phase starts, not completions. The `complete()` function maps to `COMPLETE_*` and `ABANDON_*` events.

**File:** `rpc-layer-api.md` (line 14)

**Fix:** Either use a narrower `CompletePhase = 'complete' | 'abandon'` type, or remove the phase parameter since the event can be determined from target type + `CompleteInput` shape.

### I7. Context bundling does not specify tree traversal for directory references

**Flagged by:** API Contract, Holistic
**Resolution:** DIRECTLY_ACTIONABLE

Per-phase content priority tables reference items like "current architecture" without specifying how directory references resolve to individual `MarkdownEntry` nodes in the tree. The context module needs to walk `DirectoryEntry.contents` and collect all `MarkdownEntry` children.

**File:** `rpc-layer-api.md` (context bundling section)

**Fix:** Add a note explaining that directory references resolve to `DirectoryEntry` nodes, and all `MarkdownEntry` children within are eligible for inlining. Optionally add concrete tree paths for each priority item.

### I8. `loadState()` description in state-machine-api.md leaks data layer internals

**Flagged by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

state-machine-api.md line 254: "The data layer recomputes directory `files` arrays from the filesystem on each `loadState()` call" describes data layer internals using wrong terminology.

**File:** `state-machine-api.md` (line 254)

**Fix:** Simplify the "Directory-Based Guards" section to focus on how the state machine uses the tree (via `hasChild`), removing the sentence about data layer recomputation mechanics.

### I9. Slice/quest lifecycle missing skip path from `plan-created` to `implementing`

**Flagged by:** Holistic
**Resolution:** USER_INPUT

Epic lifecycle has explicit skip paths for every phase, but slice/quest has no direct path from `plan-created` to `implementing` (bypassing refinement). Current workaround requires `COMPLETE_REFINEMENT_ROUND` with passing scores on first round. Asymmetric with the epic pattern.

**File:** `transition-tables.md` (slice and quest sections)

**Question:** Is mandatory refinement (even if 1 round) intentional, or should there be a `plan-created` + `BEGIN_IMPLEMENTATION` row?

---

## MINOR Issues

### M1. `commitState()` removal policy wording misaligned between data-model.md and data-layer-api.md

**Flagged by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

data-model.md: "Key in old but not new -> entity removed" with audit trail note. data-layer-api.md: "generally no-op" with optional deletion flag.

**Files:** `data-model.md` (line 348), `data-layer-api.md` (line 54)

**Fix:** Align wording: "Key in old but not new -> no-op (abandoned entities kept for audit trail; optional deletion flag available)."

### M2. `getMarkdown()` helper defined in data-layer-api.md but absent from data-model.md

**Flagged by:** API Contract, Holistic
**Resolution:** DIRECTLY_ACTIONABLE

data-layer-api.md defines `getMarkdown(state, path): string | undefined` but data-model.md omits it from tree navigation helpers.

**Files:** `data-layer-api.md` (line 70), `data-model.md` (lines 220-228)

**Fix:** Add `getMarkdown` to data-model.md's tree navigation helpers section.

### M3. Schema registry path construction algorithm is implicit

**Flagged by:** API Contract
**Resolution:** DIRECTLY_ACTIONABLE

During `commitState()`'s recursive tree diff, path strings must be built by concatenating directory names. The convention (forward-slash-separated, no leading slash) is not stated.

**File:** data-model.md (schema registry section)

**Fix:** Add one-liner specifying path format: forward-slash-separated, rooted at `.project/` with no leading slash (e.g., `"epics/goodplan-cli/epic.json"`).

### M4. State Key Dependencies table should note paths are `resolve()` tree paths

**Flagged by:** Holistic
**Resolution:** DIRECTLY_ACTIONABLE

Beyond removing `_derived` (covered in C2), note that the path strings are `resolve()` paths into the `ProjectState` tree.

**File:** `state-machine-api.md` (State Key Dependencies section)

**Fix:** Add a note above the table clarifying these are `resolve()` paths.

---

## Contradictions Resolved

1. **`dirHasFile` vs `hasChild` severity**: API Contract rated CRITICAL; Software Architecture and Holistic rated IMPORTANT. **Resolution:** Kept as IMPORTANT. Per conflict resolution rules, trusted Software Architecture on boundary issues — the naming inconsistency is real but the function semantics are identical and the fix is mechanical.

2. **Status enum severity**: Software Architecture rated CRITICAL for epic only; Holistic rated CRITICAL for all three (epic + slice + quest). API Contract rated MINOR. **Resolution:** Merged into one CRITICAL covering all three enums. Trusted Software Architecture on structural evidence — the transition tables are declared source of truth, so any enum mismatch is critical.

---

## Score Summary

| Reviewer | Score |
|---|---|
| Software Architecture | 5/10 |
| API Contract | 5/10 |
| Holistic | 4/10 |
| **Consensus** | **4.7/10** |

The recursive tree model itself is well-designed. The migration from the old flat model is incomplete — two critical issue clusters (status enum mismatches, pervasive `_derived` references) would block correct implementation.

## Issue Counts

| Severity | Raw (pre-dedup) | Merged |
|---|---|---|
| Critical | 6 | 2 |
| Important | 18 | 9 |
| Minor | 12 | 4 |

## Unresolved (USER_INPUT Required)

**I9: Should slice/quest refinement be skippable?**
Epic lifecycle has skip paths for every phase. Slice/quest lifecycle requires at least one refinement round (via `COMPLETE_REFINEMENT_ROUND`). Is this asymmetry intentional?

## Path to 9+

1. Align all status enums with transition tables (C1)
2. Replace all `_derived` references with tree-based `hasChild()` equivalents (C2)
3. Standardize on `hasChild()` and `contents` keys everywhere (I1)
4. Reconcile `getJson`/`getJsonl` return types between data-model and data-layer (I2)
5. Fix example type error and stale `files` references (I3, I4)
6. Update invariants to reference actual data layer API (I5)
7. Fix `complete()` RPC phase type (I6)
8. Specify context bundling tree traversal (I7)
9. Remove data layer internals from state machine doc (I8)
10. Resolve skip-path question for slice/quest lifecycle (I9 — needs user input)
