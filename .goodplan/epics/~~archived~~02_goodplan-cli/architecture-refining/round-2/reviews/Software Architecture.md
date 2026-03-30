# Software Architecture Review — Round 2

Reviewer: Software Architecture
Scope: Entire architecture directory
Goal: Ensure the recursive tree state model is well integrated across all architecture files. Focus on consistency after round 1 fixes.

## Round 1 Fix Verification

All round 1 CRITICAL and IMPORTANT issues have been addressed:
- C1 (status enum mismatches): FIXED. All three entity status enums in state-machine-api.md now match transition-tables.md exactly.
- C2 (_derived references): FIXED. No stale `_derived` references remain (only the explanatory section title "Directory-Based Guards (replaces _derived)").
- I1 (dirHasFile vs hasChild): FIXED. All references now use `hasChild()` and `contents` keys.
- I2 (getJson return types): FIXED. data-model.md now uses unwrapped signatures (`T | undefined`).
- I3 (plan-refined.md type): FIXED. Now `{ type: "markdown", content: "..." }`.
- I4 (stale files array): FIXED. Now references `contents` keys with `hasChild` example.
- I5 (invariants stale function names): FIXED. References updated to `commitState()`, `assembleState()`.
- I6 (complete() phase type): FIXED. `complete()` is now a separate function with `(target, input, options)` signature.
- I7 (context tree traversal): FIXED. Tree traversal explanation added to rpc-layer-api.md context section.
- I8 (data layer internals in state machine doc): FIXED. Section now focuses on guard usage via `hasChild`.
- M1-M4: All FIXED.

## Issues

**[CRITICAL]** DecisionEntry status enum does not match transition-tables.md
`DecisionEntry.status` in state-machine-api.md (line 111) defines `'active' | 'superseded' | 'rejected'`. The transition table (Decision section, lines 129-134) uses `'active'`, `'superseded'`, and `'revisiting'` — but not `'rejected'`. And `'revisiting'` is absent from the enum. This is the same class of bug as round 1's C1 (status enum vs transition table mismatch) and was missed because C1 only covered epic/slice/quest.
Resolution: DIRECTLY_ACTIONABLE

Fix: Change `DecisionEntry.status` to `'active' | 'superseded' | 'revisiting'`. If `'rejected'` is intentionally reachable, add a transition row for it. If not, remove it from the type.

---

**[IMPORTANT]** CompleteInput cannot represent epic completion
The `complete()` RPC function (rpc-layer-api.md line 13) takes `CompleteInput` for all entity types. `CompleteInput` (line 181) has `verificationPassed: boolean` — the slice/quest shape. But `epic:complete` requires `verificationResults: VerificationResult[]` per the `COMPLETE_EPIC` event (state-machine-api.md line 48) and the stdin example in commands-api.md (lines 160-166). The RPC layer's single `CompleteInput` type cannot express both shapes. An implementer would need to diverge from the documented type to handle epics.
Resolution: DIRECTLY_ACTIONABLE

Fix: Make `CompleteInput` a discriminated union by target type, or add `verificationResults?: VerificationResult[]` as an alternative to `verificationPassed`. The comment on line 185 ("maps to COMPLETE_SLICE.architectureDelta") already hints this type is slice-specific. A clean fix: define separate `SliceCompleteInput`, `QuestCompleteInput`, and `EpicCompleteInput` types, or use a discriminated union.

---

**[IMPORTANT]** `'complete'` is dead in BeginPhase type
`BeginPhase` (rpc-layer-api.md line 36) includes `'complete'`, but the routing table (line 90) shows entity completion routes to the separate `complete()` function, not `begin('complete', ...)`. The `'complete'` variant is unreachable — no command maps to `begin('complete', ...)`.
Resolution: DIRECTLY_ACTIONABLE

Fix: Remove `'complete'` from `BeginPhase`. Entity completion already has its own `complete()` function and routing path.

---

**[IMPORTANT]** Quest lifecycle missing `plan-created` skip path that slice has
The slice transition table (line 74) has `plan-created | COMPLETE_REFINEMENT_ROUND → plan-refined` with guard "scores meet threshold (first round)" — enabling a one-round refinement shortcut. The quest table has no equivalent `plan-created | COMPLETE_QUEST_REFINEMENT_ROUND → plan-refined` row. Line 94 of transition-tables.md says "Quest lifecycle mirrors slice" but this path is asymmetric. The slice skip path was likely an intentional answer to round 1's I9 (should refinement be skippable?), but the quest equivalent was not added.
Resolution: DIRECTLY_ACTIONABLE

Fix: Add a row to the quest transition table: `| plan-created | COMPLETE_QUEST_REFINEMENT_ROUND | plan-refined | scores meet threshold (first round) | — | quest, status, round, scores, thresholdMet | Skip path: first round passes |`

---

**[IMPORTANT]** Three types referenced but never defined: PathReferences, DecisionSummary, LearningSummary
`PathReferences` is used in `SubmitResult` (line 157), `BeginResult` (line 172), and `CompleteResult` (line 212). `DecisionSummary` and `LearningSummary` are used in `ContextBundle` (lines 224-225). None have definitions anywhere in the architecture files. An implementer cannot build these types from the architecture spec alone.
Resolution: DIRECTLY_ACTIONABLE

Fix: Add interface definitions for all three. `PathReferences` likely maps entity paths (e.g., `{ plan: string; refinedPlan: string; sliceDir: string }`). `DecisionSummary` and `LearningSummary` are likely projections of `DecisionEntry` and the stored learning record. Define them in rpc-layer-api.md near the types that reference them.

---

**[IMPORTANT]** ContextResult and StatusOptions types used but not defined
`startContext()` returns `ContextResult` (line 15) but only `ContextBundle` is defined (lines 221-226). `status()` takes `StatusOptions` (line 16) but the type is never specified. These are public API surface types that need definitions.
Resolution: DIRECTLY_ACTIONABLE

Fix: Either define `ContextResult` (possibly as `ContextBundle` plus metadata) or rename to `ContextBundle` if they are the same. Define `StatusOptions` — it likely contains `{ json?: boolean; query?: string; verbose?: boolean }` based on the global flags.

---

**[IMPORTANT]** BeginPhase mapping comments incomplete — 8+ mappings missing
The explicit mapping comments (rpc-layer-api.md lines 58-69) document 11 of ~19 BeginPhase→StateEvent mappings. Missing: `refine-plan` (→ BEGIN_REFINEMENT / BEGIN_QUEST_REFINEMENT), `create` for slice/quest/decision, `abandon` for all three entity types, `add-verification`, `update-verification`, `rollup`. These comments serve as the implementer's lookup table — gaps force the implementer to reverse-engineer mappings from the routing table.
Resolution: DIRECTLY_ACTIONABLE

Fix: Add all missing mappings to the comment block. Group by entity type where ambiguous (e.g., `begin('create', {type:'slice'})` → `CREATE_SLICE`).

---

**[MINOR]** INIT_PROJECT transition table "To" column says `initialized` but project.json has no status field
The project transition table (line 9) shows `To: initialized`, but `project.json` (data-model.md lines 9-18) has no `status` field. Every other transition table row's "To" column maps to an entity's `status` field value. This row is conceptually correct but structurally inconsistent with the table format.
Resolution: DIRECTLY_ACTIONABLE

Fix: Either add a `status` field to `project.json` (and a `ProjectStatus` type), or change the "To" column to "—" with a note explaining that project initialization is a one-time event with no status field, or add a clarifying note to the Project section header.

---

**[MINOR]** `plan-refining.md` in directory structure but never referenced in guards or flows
data-model.md directory structure (lines 420, 428) shows `plan-refining.md` for slices and quests, but no guard, transition, or flow references this file. `plan.md` and `plan-refined.md` have explicit guards (`hasChild` checks). `plan-refining.md` appears to be a working file during refinement rounds but its lifecycle is unspecified — when is it created, by whom, and is its existence ever checked?
Resolution: DIRECTLY_ACTIONABLE

Fix: Add a brief note in data-model.md explaining that `plan-refining.md` is written by the sub-agent during refinement rounds (work-in-progress) and renamed or replaced by `plan-refined.md` when refinement completes. Or, if it's not needed, remove it from the directory structure.

## Score: 7/10

Round 1 fixes were thorough — both CRITICALs and all 9 IMPORTANTs resolved. The architecture is substantially more consistent. Remaining issues are a new CRITICAL (DecisionEntry status enum mismatch — same class as round 1 C1), six IMPORTANTs (type definition gaps that would block implementation), and two MINORs. The recursive tree model is now well-integrated across files. The primary gap is incomplete type definitions in the RPC layer's public API surface.

To reach 9+: fix the DecisionEntry enum, define the 5 missing types (PathReferences, DecisionSummary, LearningSummary, ContextResult, StatusOptions), make CompleteInput handle epic completion, remove dead `'complete'` from BeginPhase, add quest skip path, and complete the mapping comments.

## Summary
- Critical: 1
- Important: 6
- Minor: 2
