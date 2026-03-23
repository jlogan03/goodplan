# Merged Feedback: Slice Lifecycle Plan (Round 2)

Reviewers: Holistic (8/10), SoftwareArchitecture (9/10), TypeScript (8/10), TUICLI (9/10)

---

### CRITICAL Issues

None.

---

### IMPORTANT Issues

**IMP-1: Phase 2 deferred routing and learnings rollup counts have no return channel from state machine to RPC layer**
(Flagged by: Holistic, SoftwareArchitecture, TypeScript — merged)

Phase 2 task 4 describes `deferredSkipped` count (step 2) and `learningsRolledUp` count (step 8) as if they flow from the state machine. But the state machine returns `ProjectState | StateError` with no sideband channel. The `epicComplete` detection was correctly moved to the RPC layer, but these two counts were not given the same treatment. Responsibility is split ambiguously between Phase 2 and Phase 3.

**Fix:** Move all count derivation to Phase 3 `buildCompleteResult`. The RPC layer has both old and new state and can derive: (a) `deferredRouted` by counting deferred items whose `targetSlice` exists in the new state's `slices/overview.json`; (b) `deferredSkipped` = total deferred - deferredRouted; (c) `learningsRolledUp` by comparing old vs new learnings.jsonl at epic/project levels. Remove count language from Phase 2 — the state machine only writes the data; Phase 3 counts it.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-2: Phase 2 COMPLETE_SLICE `LearningInput` to `LearningEntry` transformation not specified**
(Flagged by: SoftwareArchitecture, TypeScript — merged)

The state machine handler must transform `LearningInput[]` (no `source`, no `rollup`) to `LearningEntry[]` (with `source` and `rollup`). The handler has the information needed (`source: \`slices/${event.slice}\``, `rollup: learning.rollupTo.length > 0`), but the plan doesn't specify this transformation. Without it, the implementer may put this logic in the wrong layer.

**Fix:** In Phase 2 task 4 step 3, explicitly state: "Transform each `LearningInput` to `LearningEntry` by adding `source: \`slices/${event.slice}\`` and `rollup: learning.rollupTo.length > 0`. Write the full `LearningEntry[]` to the JSONL file."

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-3: Phase 2 COMPLETE_SLICE handler must handle nonexistent JSONL files**
(Flagged by: TypeScript)

COMPLETE_SLICE writes to 5+ JSONL files (slice learnings, epic learnings, project learnings, etc.). With `noUncheckedIndexedAccess: true`, `getJsonl()` returns `T[] | undefined` for nonexistent files. Slice-level and epic-level learnings.jsonl files won't exist until first completion. Each JSONL read in the handler must use `?? []` (matching existing `appendActivityLog` pattern). Given the handler's complexity, this should be explicit.

**Fix:** Add a note in Phase 2 task 4 that all `getJsonl()` calls must handle `undefined` with `?? []`, matching the existing `appendActivityLog` pattern in helpers.ts.

Resolution: DIRECTLY_ACTIONABLE

---

**IMP-4: Phase 5 e2e walkthrough step 3 is under-specified for epic activation setup**
(Flagged by: Holistic)

Step 3 collapses ~10 commands into "etc." through the full phase chain to `slices-refined`. An implementer performing manual verification cannot reproduce this without knowing every command. Epic activation prerequisites are non-trivial.

**Fix:** Expand step 3 to list every command: `epic:explore`, `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-slices` (with passing scores or `--override`), `epic:add-verification`, `epic:activate`. Include required file-writes (e.g., stub plan.md files if needed by guards).

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR Issues

**MIN-1: Phase 3 `BeginPayloadMap` change makes `goal` required for project init**
(Flagged by: SoftwareArchitecture, TypeScript — merged)

Changing `create` payload from `{ name: string; goal?: string }` to `{ name: string; goal: string; epic?: string }` makes `goal` required for all `create` calls including `INIT_PROJECT`, which doesn't use `goal`. This either breaks `init.ts` or forces a dummy goal string.

**Fix:** Keep `goal` as `goal?: string` in the payload map and add runtime validation for epic/slice targets (matching the existing runtime check in `buildCreateEvent`). Alternatively, verify `init.ts` already passes a goal and accept the dummy value.

Resolution: CODEBASE_EXPLORATION (verify what `init.ts` currently passes)

---

**MIN-2: `slice:complete` human-readable output format not specified**
(Flagged by: TUICLI)

`slice:complete` returns the richest result in the system (deferredRouted, learningsRolledUp, epicComplete, architecturePaths) but the human-readable output format is unspecified. Example format:
```
01-auth: implementation-complete -> completed
  Deferred: 2 items routed
  Learnings: 1 rolled up
  Epic complete: yes
```

**Fix:** Add a human-readable output template to Phase 4's `slice:complete` task.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-3: `slice:create` human-readable output says "shows epic" but the output pattern doesn't include it**
(Flagged by: TUICLI)

The plan states "Human-readable shows slice name + status + epic" but the output pattern is just `{sliceName}: {previousStatus} -> {newStatus}`. Should be `{sliceName} (epic: {epicName}): none -> created` or similar.

**Fix:** Update the human-readable format to include the epic name.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-4: Phase 1 "before" check searches for `learningSchema` instead of `learningInputSchema`**
(Flagged by: Holistic)

The grep `grep "learningSchema" src/schemas/` would match the existing `learningEntrySchema`, making the falsifiability check weak. Should search for `learningInputSchema` specifically.

**Fix:** Change to `grep "learningInputSchema" src/schemas/`.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-5: Phase 4 `begin()` call uses shorthand omitting `projectDir`**
(Flagged by: TypeScript, Holistic — merged)

The plan writes `begin('create', {type:'slice', name}, {name, goal, epic})` but the actual signature is `begin(projectDir, 'create', target, payload)`. Additionally, the `target` vs `payload` field ownership is ambiguous. Should use full 4-arg form: `begin(projectDir, 'create', {type:'slice', name: input.name}, {name: input.name, goal: input.goal, epic: input.epic})`.

**Fix:** Use full 4-argument form in the plan matching existing `epicCreateCommand`.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-6: `slice:list --epic` filter mechanism not specified**
(Flagged by: TUICLI)

`slices/overview.json` is a flat list. Filtering by epic requires knowing each slice's epic association. The plan should clarify whether overview items contain an `epic` field or whether cross-referencing `slice.json` files is needed.

Resolution: CODEBASE_EXPLORATION

---

**MIN-7: Phase 5 lacks explicit task to verify `state-machine-api.md` is updated with all 6 new events**
(Flagged by: Holistic)

Phase 1 mentions updating `state-machine-api.md` for CREATE_SLICE, but Phase 5 doesn't include a task to verify the doc is fully updated with all new events and payloads after implementation.

**Fix:** Add a Phase 5 task to verify `state-machine-api.md` covers all 6 new events.

Resolution: DIRECTLY_ACTIONABLE

---

**MIN-8: Phase 2 `setSliceStatus` is sugar over `setSliceJson` — note this is deliberate**
(Flagged by: TypeScript)

The plan lists both `setSliceStatus` and `setSliceJson`. This mirrors the existing epic pattern (`setEpicStatus` + `setEpicJson`). No change needed, but a brief note that `setSliceStatus` is sugar prevents redundant implementations.

Resolution: DIRECTLY_ACTIONABLE (add one-line note)

---

### DIRECTLY_ACTIONABLE

1. **IMP-1:** Move deferred/learnings count derivation to Phase 3 `buildCompleteResult`
2. **IMP-2:** Specify `LearningInput` -> `LearningEntry` transformation in Phase 2 task 4 step 3
3. **IMP-3:** Add `?? []` note for all `getJsonl()` calls in COMPLETE_SLICE handler
4. **IMP-4:** Expand Phase 5 e2e walkthrough step 3 with full command list
5. **MIN-2:** Specify `slice:complete` human-readable output format
6. **MIN-3:** Include epic name in `slice:create` human-readable output
7. **MIN-4:** Fix Phase 1 "before" check grep target
8. **MIN-5:** Use full 4-arg `begin()` form in plan
9. **MIN-7:** Add Phase 5 doc-verification task for `state-machine-api.md`
10. **MIN-8:** Add note that `setSliceStatus` is sugar over `setSliceJson`

Total: 10

---

### RESEARCH_NEEDED

None.

---

### Contradictions Resolved

**SoftwareArchitecture vs TypeScript on `BeginPayloadMap` `goal` optionality:**
Both flagged the same issue (making `goal` required breaks project init) but proposed different solutions. SoftwareArchitecture suggested keeping `goal?: string` with runtime validation OR a discriminated union. TypeScript suggested keeping `goal?: string` with runtime validation. Merged to the simpler shared recommendation: keep `goal?: string` with runtime validation, pending codebase exploration of `init.ts`.

**Holistic vs SoftwareArchitecture on deferred count mechanism:**
Holistic said "RPC layer compares old vs new deferred arrays on target slices." SoftwareArchitecture said "RPC layer counts items where targetSlice exists in new state's `slices/overview.json`." Both are valid; merged to the overview-based approach (simpler, avoids deep array diffing).

---

### Unresolved (USER_INPUT required)

None. All issues are either directly actionable or require codebase exploration (not user decisions).
