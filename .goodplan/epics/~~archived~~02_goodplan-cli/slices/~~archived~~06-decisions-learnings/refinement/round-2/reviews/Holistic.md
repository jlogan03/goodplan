# Holistic Review (Round 2) -- Decisions, Learnings & Full Status

## Issues

**[IMPORTANT]** Phase 2 `decision:create` stdin payload specifies `id` but `commands-api.md` shows `name` + `goal` pattern

The `commands-api.md` spec (line 201) groups `decision:create` with `epic:create` and `quest:create`, showing the shared `{ "name": "...", "goal": "..." }` stdin shape. However, the Phase 2 task defines `createDecisionInputSchema` as `{id, domain, title, summary}` -- completely different fields from the architecture spec. The `state-machine-api.md` event payload does use `{id, domain, title, summary, ts}`, which is correct at the state machine level. The architecture doc appears to be wrong here (decisions genuinely need different fields than other entities), but the plan should explicitly note this deviation from `commands-api.md` and include a task to update the architecture doc to show the correct decision:create stdin shape. Without this, the Phase 4 schema command will expose the real shape, creating a visible inconsistency with the spec.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 status command does not specify how to count `completedSlices` vs `totalSlices`

The task says "Count slice overview items for completed/total" but `slices/overview.json` contains an `items` array of `OverviewItem` with `{ name, status, created, completed }`. The plan does not specify which statuses count as "completed" (is `abandoned` counted? what about `completed` only?). This matters for the `artifacts.completedSlices` field. The implementer needs explicit criteria: completed = items where `status === "completed"`, total = all items regardless of status (including abandoned).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 task for `decision:create` command says "reads stdin JSON `{id, domain, title, summary}`" but `decision:show` says `--id` flag

Internally consistent within Phase 2, but worth noting: `decision:create` takes `id` via stdin (user-chosen identifier like "use-postgres"), while `decision:show` and `decision:update` reference the same id via `--id` flag. This is the correct pattern (stdin for creation payloads, flags for lookups), matching the existing `slice:complete` (stdin) vs `slice:show --slice` (flag) pattern. No action needed, just confirming alignment.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 E2E walkthrough step 3 references "walk through plan -> submit -> refine -> submit -> implement -> submit -> complete" but does not mention quest creation context

Step 11 says "Quest lifecycle: create -> plan -> complete with learnings" but quests require `goal` on creation (per `CREATE_QUEST` event type). The E2E step should specify the quest creation payload to avoid ambiguity. This is minor since it is a test script instruction, not production code.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 ROLLUP_LEARNINGS handler specifies "Guard: source path must resolve to a valid `learnings.jsonl`" but doesn't specify error code

The handler description includes a guard for invalid source path but does not name the error code to use. Other guards in the same phase specify codes explicitly (e.g., `STATE_DUPLICATE_DECISION`, `STATE_INVALID_TRANSITION`). Should specify: use `STATE_INVALID_TRANSITION` (source not found) or add a new code.

Resolution: DIRECTLY_ACTIONABLE

---

## Round 1 Issues -- Verification of Fixes

All round 1 issues have been addressed in the current plan text:

- **C1 (toJSONSchema casing):** Fixed -- Phase 4 now correctly references `z.toJSONSchema()` with `{ unrepresentable: "any" }`.
- **I1 (buildBeginResult decision branch):** Fixed -- Phase 2 now includes explicit task for `target.type === "decision"` in `buildBeginResult`.
- **I2 (create-decision phase type):** Fixed -- Phase 2 uses `"create-decision"` as a dedicated `BeginPhase`, not routing through `begin('create', {type:'decision'})`.
- **I3 (O(n^2) fix completeness):** Fixed -- Phase 1 now explicitly describes both epic-rollup and project-rollup batch operations with separate arrays per target scope.
- **I5 (ROLLUP_LEARNINGS semantics):** Fixed -- Phase 1 clarifies filtering by `rollupTo` matching target scope, with explicit label-to-scope mapping.
- **I6 (flag naming):** Fixed -- `decision:show --id`, `learning:list --source`.
- **I7 (supersededBy guard):** Fixed -- Phase 1 explicitly guards against `supersededBy` without status->superseded.
- **I8 (StateErrorCode additions):** Fixed -- `STATE_DUPLICATE_DECISION` added, `STATE_INVALID_TRANSITION` reuse documented.
- **I9 (Phase 4 before-check):** Fixed -- now checks unfiltered output instead of expecting citty error.
- **M1-M11:** All addressed in current plan text.
- **U1 (learning:show):** Dropped per user input -- plan now shows 6 commands (4 decision + 2 learning).
- **U2 (ROLLUP_LEARNINGS filter):** Resolved -- filter by `rollupTo` tag, documented clearly.

## Score: 9/10

The plan is thorough, well-phased, and covers all aspects of the confirmed goal. All round 1 issues have been addressed. The two IMPORTANT items remaining are relatively minor: the `commands-api.md` deviation should be documented explicitly, and the slice counting criteria need a one-line clarification. Both are straightforward fixes that would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
