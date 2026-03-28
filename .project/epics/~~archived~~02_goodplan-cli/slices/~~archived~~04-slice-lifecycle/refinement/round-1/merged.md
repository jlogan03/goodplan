# Merged Feedback: Slice Lifecycle Plan (Round 1)

## CRITICAL Issues

None.

## IMPORTANT Issues

### IMP-1: Phase 1 proposes `shared-records.ts` but Learning/ArchitectureDelta schemas already exist
**Reviewers:** Holistic, SoftwareArchitecture
**Files:** `src/schemas/records/learning.ts`, `src/schemas/records/architecture-delta.ts`, `src/schemas/entities/slice.ts`

Phase 1 task 2 says "Create `src/schemas/shared-records.ts`" but `learningEntrySchema` already exists in `src/schemas/records/learning.ts` and `architectureDeltaSchema` in `src/schemas/records/architecture-delta.ts`. The `deferredItemSchema` exists in `src/schemas/entities/slice.ts`.

The plan must distinguish **input schemas** (what callers provide) from **storage schemas** (what gets persisted). `LearningEntry` includes `source` and `rollup` fields injected by the RPC layer -- callers should not provide these. `ArchitectureDelta` includes `ts` injected by RPC.

**Fix:** Rewrite Phase 1 task 2 to: (a) reuse existing `architectureDeltaSchema` and `deferredItemSchema`, (b) create a `learningInputSchema` (category, summary, detail, tags, rollupTo -- no `source`, no `rollup`) in `src/schemas/records/learning.ts` alongside existing `learningEntrySchema`, (c) create an `architectureDeltaInputSchema` (without `ts`) in `src/schemas/records/architecture-delta.ts`, (d) drop the `shared-records.ts` file creation.

Resolution: DIRECTLY_ACTIONABLE

---

### IMP-2: `slice-submit.ts` guard helpers not migrated to shared `helpers.ts`
**Reviewers:** Holistic, SoftwareArchitecture, TypeScript, TUICLI
**Files:** `src/core/state/slice-submit.ts`, `src/core/state/helpers.ts`

All four reviewers flag this. Phase 2 creates `guardSliceStatus` in `helpers.ts` returning `Slice | StateError`, but does not address the existing `getSlice`, `guardSliceStatus`, `setSliceJson` in `slice-submit.ts` (lines 22-55) which use the old `StateError | null` pattern. After Phase 2, two competing helper sets would exist.

**Fix:** Add a Phase 2 task to refactor `slice-submit.ts` to import shared helpers from `helpers.ts`, removing local `getSlice`, `guardSliceStatus`, and `setSliceJson`. Update callers (`handleCompletePlan`, `handleCompleteRefinementRound`, `handleCompleteImplementation`) to use `isStateError()` narrowing instead of `!== null`.

Resolution: DIRECTLY_ACTIONABLE

---

### IMP-3: `BeginPayloadMap["create"]` expansion is underspecified
**Reviewers:** Holistic, SoftwareArchitecture, TypeScript, TUICLI
**Files:** `src/core/rpc/types.ts`

Phase 3 leaves the `create` payload shape as an open "Option:" rather than committing to a decision. With `exactOptionalPropertyTypes: true`, making `epic` optional at the type level but required at runtime for slices is a type-safety gap. Additionally, SoftwareArchitecture notes that `goal` should be required (not optional) for both epic and slice targets per the architecture spec.

**Fix:** Commit to the specific shape: `{ name: string; goal: string; epic?: string }` (make `goal` required, add optional `epic`). Document that compile-time allows omission of `epic`, but `buildCreateEvent` throws `VALIDATION_INVALID_INPUT` with message "epic is required when creating a slice" at runtime. Note this tradeoff explicitly in the task rather than leaving it open.

Resolution: DIRECTLY_ACTIONABLE

---

### IMP-4: `slice:create` has conflicting input patterns (stdin vs `--epic` flag)
**Reviewers:** Holistic, SoftwareArchitecture, TUICLI
**Files:** Phase 4 task 1, Phase 4 Expected Behavior, Phase 5 walkthrough

Phase 4 task 1 says `epic` comes from both stdin JSON `{name, goal, epic}` and `--epic` flag. Phase 5 walkthrough uses `--epic` flag with `{name, goal}` in stdin. Phase 4 Expected Behavior shows `epic` in stdin with no `--epic` flag. These are mutually contradictory.

**Fix:** Standardize on `--epic` flag for epic name, stdin carries `{name, goal}` only. This matches `commands-api.md` spec (`goodplan slice:create --epic <name>`) and INV-004 (explicit target flags). Update Phase 4 task description and Expected Behavior to be consistent with Phase 5 walkthrough.

Resolution: DIRECTLY_ACTIONABLE

---

### IMP-5: `buildBeginResult` and `buildCompleteResult` don't handle slice targets
**Reviewers:** TypeScript, SoftwareArchitecture
**Files:** `src/core/rpc/begin.ts` (lines 173-197), `src/core/rpc/complete.ts` (lines 81-107), `src/core/rpc/types.ts`

`buildBeginResult` only handles `project` and `epic` targets -- slice targets fall through to defaults (`previousStatus: "none"`, `newStatus: "unknown"`). `buildCompleteResult` throws for non-epic targets. Every slice CLI command would return incorrect status values.

Additionally, `CompleteResult` in `types.ts` (lines 90-94) lacks the `deferredRouted`, `architecturePaths`, `epicComplete`, and `learningsRolledUp` fields the plan says it will return.

**Fix:** Add Phase 3 sub-tasks to: (a) extend `buildBeginResult` to handle `target.type === 'slice'`, (b) extend `buildCompleteResult` to handle `target.type === 'slice'`, (c) extend `CompleteResult` type in `types.ts` with optional fields: `deferredRouted?`, `architecturePaths?`, `epicComplete?`, `learningsRolledUp?`.

Resolution: DIRECTLY_ACTIONABLE

---

### IMP-6: `CREATE_SLICE` event includes `goal` but `state-machine-api.md` omits it
**Reviewer:** TypeScript
**Files:** `state-machine-api.md`, Phase 1

Phase 1 defines `CREATE_SLICE` as `(name, epic, goal, ts)`. The architecture's `state-machine-api.md` defines it as `{ type: 'CREATE_SLICE'; name: string; epic: string; ts: string }` -- no `goal` field. Since `slice.json` has a required `goal` field, the plan's approach is correct but the spec is incomplete.

**Fix:** Add a Phase 1 task/note to update `state-machine-api.md` to add `goal: string` to `CREATE_SLICE` event payload.

Resolution: DIRECTLY_ACTIONABLE

---

### IMP-7: `CompleteInput` slice variant modification is imprecise
**Reviewer:** SoftwareArchitecture
**Files:** `src/core/rpc/types.ts`

Phase 1 task 3 says "Extend `CompleteInput`" but the slice variant `{ type: "slice"; verificationPassed: boolean }` already exists in the union. The plan should clarify this is a modification (adding `deferred?`, `learnings?`, `architectureDelta?` fields), not a new variant. Import paths for the field types should be specified explicitly.

**Fix:** Clarify Phase 1 task 3 to: modify the existing slice variant by adding optional fields, importing `DeferredItem` from `src/schemas/entities/slice.ts`, `ArchitectureDelta` from `src/schemas/records/architecture-delta.ts`, and `LearningInput` from the new input schema.

Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

### MIN-1: Phase 2 `COMPLETE_SLICE` epicComplete detection mechanism is vague
**Reviewers:** Holistic, SoftwareArchitecture, TypeScript
**Files:** Phase 2 task 4 step 7

The plan says "flag it via a marker in the state tree or a property the RPC layer can detect" but the state machine is pure and returns `ProjectState | StateError` -- it cannot add arbitrary properties.

**Fix:** Specify: the RPC layer's `buildCompleteResult` checks all sibling slices in the epic (via `slices/overview.json` in the new state) to derive `epicComplete`. The state machine does NOT need to flag this. This aligns with transition-tables.md "Implicit Transitions" which says detection happens in the RPC layer.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-2: Phase 2 "skip silently" for nonexistent deferred target may violate INV-007
**Reviewer:** Holistic
**Files:** Phase 2 task 4 step 2

INV-007 says "No silent errors." Silently dropping a deferred item targeting a nonexistent slice could mask user errors.

**Fix:** Log a warning in the activity log or return a `deferredSkipped` count in the result rather than silently dropping.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-3: Phase 5 walkthrough step 11 sequential enforcement test is self-contradictory
**Reviewers:** Holistic, TypeScript, TUICLI
**Files:** Phase 5 walkthrough

Step 11 tests sequential enforcement against 01-auth "in planning" but 01-auth was already completed in step 10. The scenario cannot be reproduced as written.

**Fix:** Move the sequential enforcement test between steps 6 and 7 (before 01-auth completes), or use a different pair of slices.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-4: `slice-submit.ts` quest helpers should also be consolidated
**Reviewer:** SoftwareArchitecture
**Files:** `src/core/state/slice-submit.ts`

`slice-submit.ts` also has local quest helpers (`getQuest`, `setQuestJson`, `guardQuestStatus`) using the old `StateError | null` pattern. These should be consolidated alongside slice helpers.

**Fix:** Note in Phase 2 that quest helpers should also be moved to `helpers.ts`, or flag as deferred work for slice 05.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-5: No task for `src/schemas/commands/slice.ts` to handle `--epic` as flag (not stdin)
**Reviewer:** Holistic
**Files:** Phase 4 task 9

`createSliceInput` schema validation needs to account for `--epic` being a flag merged via `validateInput()`, with `epic` potentially coming from args rather than stdin.

**Fix:** Ensure the `createSliceInput` schema has `epic` as optional (since the flag provides it and `validateInput` merges), matching the pattern in existing epic command schemas.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-6: `--query` flag missing from slice commands (perpetuating existing gap)
**Reviewer:** TUICLI
**Files:** Phase 4, `commands-api.md`

`commands-api.md` lists `--query` as a global flag but no commands implement it. The plan perpetuates this gap. Not a regression.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-7: Phase 1 "6 remaining" event types wording is ambiguous
**Reviewer:** TypeScript
**Files:** Phase 1 intro

"6 remaining" is correct (3 submit events already exist, 6 new ones) but the wording could be clearer.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-8: `slice:list` and `slice:show` should explicitly note they bypass RPC layer
**Reviewer:** TUICLI
**Files:** Phase 4

Read-only commands go directly to Data Layer per `commands-api.md`. The plan describes calling `loadState()` directly but should explicitly note the RPC bypass to help implementers.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-9: Phase 5 walkthrough submit commands missing explicit flag/stdin documentation
**Reviewer:** Holistic
**Files:** Phase 5 walkthrough

Steps 7-8 reference `submit-plan --slice 01-auth` and `submit-refinement --slice 01-auth` without specifying all required flags and stdin payloads.

Resolution: CODEBASE_EXPLORATION

## DIRECTLY_ACTIONABLE

1. **IMP-1:** Rewrite Phase 1 task 2 to reuse existing schemas and create input variants (`learningInputSchema`, `architectureDeltaInputSchema`). Drop `shared-records.ts`.
2. **IMP-2:** Add Phase 2 task to migrate `slice-submit.ts` to shared helpers from `helpers.ts`, remove local duplicates, update to `isStateError()` narrowing.
3. **IMP-3:** Commit to `{ name: string; goal: string; epic?: string }` for `BeginPayloadMap["create"]`. Document the type-safety tradeoff and runtime validation error.
4. **IMP-4:** Standardize `slice:create` on `--epic` flag + `{name, goal}` stdin. Update Phase 4 task and Expected Behavior.
5. **IMP-5:** Add Phase 3 sub-tasks for `buildBeginResult` (slice branch), `buildCompleteResult` (slice branch), and `CompleteResult` type extension.
6. **IMP-6:** Add Phase 1 note to update `state-machine-api.md` with `goal` in `CREATE_SLICE`.
7. **IMP-7:** Clarify Phase 1 task 3 as modification of existing slice variant with explicit import paths.
8. **MIN-1:** Specify epicComplete detection in `buildCompleteResult` (RPC layer checks sibling slices).
9. **MIN-2:** Replace "skip silently" with warning log or `deferredSkipped` count.
10. **MIN-3:** Move walkthrough step 11 sequential test before step 10 (between steps 6-7).
11. **MIN-4:** Note quest helper consolidation in Phase 2 or defer to slice 05.
12. **MIN-5:** Ensure `createSliceInput` schema handles `epic` from flag via `validateInput`.
13. **MIN-6:** Note `--query` gap perpetuation (no action needed this slice).
14. **MIN-7:** Clarify Phase 1 intro wording on "6 remaining" events.
15. **MIN-8:** Add explicit note that `slice:list`/`slice:show` bypass RPC layer.
16. **MIN-9:** Add explicit flags/stdin docs to Phase 5 walkthrough submit commands.

## RESEARCH_NEEDED

None. All issues are directly actionable from existing codebase knowledge.

## Contradictions Resolved

1. **TUICLI suggests `BeginPayloadMap` use separate phase keys (`create-slice` vs `create`) while SoftwareArchitecture/Holistic accept the optional `epic` approach with runtime validation.** Resolved in favor of SoftwareArchitecture (domain specialist): the optional `epic` with runtime validation is consistent with the existing `begin()` architecture where phase keys are shared across entity types. Introducing entity-specific phase keys would be a larger refactor outside this slice's scope.

2. **TUICLI says `goal` is already optional on `create` payload; SoftwareArchitecture says `goal` should be required.** Resolved in favor of SoftwareArchitecture: the architecture spec requires `goal` for both epics and slices, and `slice.json` schema has `z.string().min(1)`. Making `goal` required is the safer choice.

## Unresolved (USER_INPUT required)

None. All contradictions were resolvable via domain specialist precedence.
