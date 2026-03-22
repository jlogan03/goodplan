# Holistic Architecture Review — Round 2

Confirmed goal: Ensure the recursive tree state model is well integrated and internally consistent across all 10 architecture files.

Context: Round 1 scored 4/10 with 2 critical, 6 important, 5 minor issues. All 15 reportedly fixed. This review verifies the fixes and checks for remaining or newly introduced issues.

## Round 1 Fix Verification

All 15 round-1 issues have been addressed:

- **C1 (status enums):** FIXED. All three enums in state-machine-api.md now match transition-tables.md exactly.
- **C2 (stale `_derived`):** FIXED. No `_derived` references remain except in the historical section heading "Directory-Based Guards (replaces _derived)" which is acceptable context.
- **I1 (`dirHasFile` vs `hasChild`):** FIXED. No `dirHasFile` references remain. All usage standardized on `hasChild()` and `contents` keys.
- **I2 (`getJson` return types):** FIXED. Both data-model.md and data-layer-api.md now use unwrapped returns (`T | undefined`, `T[] | undefined`).
- **I3 (wrong type for plan-refined.md):** FIXED. Now uses `{ type: "markdown", content: "..." }`.
- **I4 (stale `files` array in Free-Form Markdown):** FIXED. Now says "Existence tracked via directory `contents` keys."
- **I5 (invariants reference removed functions):** FIXED. Invariants now reference `commitState()`, `assembleState()`, `loadState()`.
- **I6 (`complete()` phase parameter):** FIXED. `complete(target, input, options)` no longer takes a phase.
- **I7 (context bundling tree traversal):** FIXED. Explicit "Tree traversal for directory references" paragraph added to rpc-layer-api.md.
- **I8 (data layer internals in state machine doc):** FIXED. Section now focuses on how the state machine uses the tree.
- **I9 (skip path):** RESOLVED. `plan-created` + `COMPLETE_REFINEMENT_ROUND` with passing scores as skip path is documented in transition-tables.md line 74.
- **M1 (removal policy wording):** FIXED. Both files now say "no-op (abandoned entities kept for audit trail; optional deletion flag available)."
- **M2 (`getMarkdown` missing):** FIXED. Added to data-model.md tree navigation helpers.
- **M3 (schema registry path format):** FIXED. Path format documented in data-model.md.
- **M4 (State Key Dependencies paths):** FIXED. Note added that these are `resolve()` paths.

## Issues

**[IMPORTANT]** state-machine-api.md lists guards for COMPLETE_EXPLORE and COMPLETE_ARCHITECTURE that do not exist in transition-tables.md

The "Directory-Based Guards" section in state-machine-api.md (lines 258-262) lists four "key guards." Two match the transition tables:
- `hasChild(state, "slices/<name>", "plan.md")` guards `COMPLETE_PLAN` -- confirmed in transition-tables.md line 68
- `hasChild(state, "slices/<name>", "plan-refined.md")` guards `BEGIN_IMPLEMENTATION` -- confirmed in transition-tables.md line 75

Two do NOT exist in transition-tables.md (source of truth):
- `hasChild(state, "epics/<name>/architecture", "_overview.md")` guards `COMPLETE_ARCHITECTURE` -- transition-tables.md lines 22-23 show no guard (dash) for both skip and normal COMPLETE_ARCHITECTURE paths
- `Object.keys(getDir(state, "epics/<name>/research")?.contents ?? {}).length > 0` guards `COMPLETE_EXPLORE` -- transition-tables.md lines 19-20 show no guard for COMPLETE_EXPLORE

The Cross-Cutting Guards summary table (transition-tables.md lines 138-147) also does not include these guards.

Either: (a) these guards should be added to the transition tables if they are intended, or (b) the state-machine-api.md section should remove them. Given that the transition tables are declared source of truth, the state-machine-api.md section is currently incorrect.

Files: `state-machine-api.md` (lines 258-262), `transition-tables.md` (lines 19-23, 138-147)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** SubmitInput accepts learnings on intermediate phases but StateEvent types do not carry them

`SubmitInput` in rpc-layer-api.md offers optional `learnings?: Learning[]` on every phase (plan, refinement, implementation, explore, architecture, slices, refine-architecture, refine-slices). But the corresponding `StateEvent` types in state-machine-api.md do NOT include learnings for most of these:

- `COMPLETE_PLAN` has only `{ type; slice }` -- no learnings
- `COMPLETE_IMPLEMENTATION` has only `{ type; slice }` -- no learnings
- `COMPLETE_EXPLORE` has only `{ type; epic }` -- no learnings
- `COMPLETE_ARCHITECTURE` has only `{ type; epic }` -- no learnings
- `COMPLETE_SLICING` has only `{ type; epic }` -- no learnings
- `COMPLETE_REFINE_ARCHITECTURE` has `{ type; epic; scores; override }` -- no learnings
- `COMPLETE_REFINE_SLICES` has `{ type; epic; scores; override }` -- no learnings

Only `COMPLETE_SLICE` and `COMPLETE_QUEST` carry `learnings: Learning[]`.

This means either: (a) the RPC layer must persist learnings outside the state machine for these events, violating INV-001 ("every state mutation goes through the state machine"), or (b) the `StateEvent` types need `learnings?: Learning[]` added, or (c) `SubmitInput` should not accept learnings on phases where the state machine cannot handle them.

The cleanest fix: add `learnings?: Learning[]` to all `COMPLETE_*` state events and have the reducer append them to the entity's `learnings.jsonl` in the state tree. Alternatively, remove `learnings` from intermediate `SubmitInput` phases and only accept them at entity completion.

Files: `rpc-layer-api.md` (lines 127-148), `state-machine-api.md` (lines 37-45, 52-56), `invariants.md` (INV-001)
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Five types used but never defined in rpc-layer-api.md

The following types appear in function signatures and interface definitions but are never specified:

1. `ContextResult` -- return type of `startContext()` (line 15). Likely equivalent to `ContextBundle` but not stated.
2. `PathReferences` -- used in `SubmitResult`, `BeginResult`, `CompleteResult` (lines 157, 172, 212). No shape defined.
3. `StatusOptions` -- parameter of `status()` (line 16). Shape unknown.
4. `LearningSummary` -- used in `ContextBundle.learnings` (line 225). Distinct from `Learning` but no definition.
5. `DecisionSummary` -- used in `ContextBundle.decisions` (line 224). Distinct from `DecisionEntry` but no definition.

An implementer would have to guess the shapes of these types. For an architecture document serving as the implementation spec, all types in public API signatures should be defined.

File: `rpc-layer-api.md`
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Example state tree omits project-level directories shown in the directory structure

The example state tree in data-model.md (lines 237-292) shows root-level contents: `project.json`, `activity-log.jsonl`, `decisions.jsonl`, `learnings.jsonl`, `idea.md`, `conventions.md`, `epics`, `slices`, `quests`. But the directory structure (lines 396-433) also shows `architecture/`, `research/`, `brainstorm/`, `prototypes/` at the project root. These are absent from the example.

Since project-level `architecture/` is referenced by `CompleteResult.architecturePaths.currentArchitecture` and by context bundling ("current architecture"), its absence from the canonical example could confuse implementers deciding what `assembleState()` should produce and what `INIT_PROJECT` should create.

Consider adding at least `"architecture": { type: "directory", contents: {} }` to the example, and clarifying whether `INIT_PROJECT` creates these project-level directories or if they are created later.

File: `data-model.md` (lines 237-292)
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The round-1 fixes were thorough. All 15 issues have been properly resolved. The status enums match, `_derived` is gone, function names are standardized, return types agree, invariants reference the correct API, and the tree model is consistently used across all 10 files. The architecture reads as a unified, internally consistent design.

Two remaining IMPORTANT issues prevent a 9+:
1. The state-machine-api.md "key guards" section lists two guards that don't exist in the transition tables (source of truth). This is a source-of-truth contradiction that would confuse implementers.
2. The `SubmitInput`/`StateEvent` learnings mismatch creates an architectural tension with INV-001. This needs a design decision about where intermediate-phase learnings are persisted.

To reach 9+: (1) Reconcile the COMPLETE_EXPLORE and COMPLETE_ARCHITECTURE guard claims with the transition tables. (2) Decide whether intermediate learnings flow through StateEvent or are removed from SubmitInput, and update both files accordingly. (3) Define the 5 missing types in rpc-layer-api.md.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
