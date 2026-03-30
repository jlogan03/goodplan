# Software Architecture Review — Round 5

## Issues

**[MINOR]** `decisionTransitions` prerequisite task conflates two missing exports

The plan's Phase 1 prerequisite task asks for `decisionTransitions` to be exported from `decision.ts` and `taskLifecycleTransitions` from `task-lifecycle.ts`. The confirmed-resolved R4 issue I3 correctly fixed the `"(none)"` sentinel for the `CREATE_DECISION` row. However, a subtlety remains: `decision.ts` currently has no exported transition array at all (confirmed by codebase search — `decisionTransitions` is not present), and `task-lifecycle.ts` similarly has no `taskLifecycleTransitions` export. This is expected (the plan adds them), but the plan's explicit entries for `decisionTransitions` include `UPDATE_DECISION` rows that are status-keyed (e.g., `from: "active", ..., to: "revisiting"`), whereas every other entity's transition table entries use the *event name* on `VALID_DECISION_TRANSITIONS` which is `UPDATE_DECISION` regardless of target status. The plan's `UPDATE_DECISION` rows use a single event name mapping to multiple `to` values — this is correct and matches the existing JSONL-record model, but the plan should note that the derivation code will see multiple `commandToEvent` matches for the same event+entityType, and all of them should produce the same command (since there's only one `decision:update` command regardless of which status `UPDATE_DECISION` transitions to). Without this note an implementer might deduplicate by `(entityType, toStatus)` and introduce spurious entries for each distinct `toStatus` a single command can reach. The current plan text implies one `commandToEvent` entry per command-event pair, but the multi-row expansion for `UPDATE_DECISION` will produce duplicate `decision:update` entries in the Map if grouping is only by `toStatus`. This is not a correctness catastrophe (the fitness test would catch duplicates), but the plan should acknowledge this and specify deduplication by `command` within a `(entityType, toStatus)` bucket.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Wildcard expansion source — `epicVerifyTransitions` uses `"*(pre-activated)"`, but the plan's wildcard expansion section only names `*(non-terminal)` and `*(pre-activated)` as examples; the plan does not specify whether the implementer should look up `PRE_ACTIVATED_STATUSES` from `epic-verify.ts` directly or derive it from the Zod enum. The plan's note (now updated per R4 M3 fix) says to use `.options` from the entity's Zod status enum schema (e.g., `epicStatusSchema.options`). This is correct for `*(non-terminal)`, but `*(pre-activated)` is a *subset* of statuses — it is not all statuses, nor all non-terminal statuses. The plan should clarify: for `*(pre-activated)`, use the statuses listed in `PRE_ACTIVATED_STATUSES` in `epic-verify.ts` (or derive by filtering `epicStatusSchema.options` to exclude `activated`, `completed`, `abandoned`). The current plan text implies `.options` covers it generically, but `epicStatusSchema.options` includes `activated` which is explicitly excluded from pre-activated. If the implementer uses `.options` for `*(pre-activated)` they will incorrectly add `ADD_VERIFICATION`/`UPDATE_VERIFICATION` as suggested commands for `activated` epics.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `epicPhaseTransitions` — confirmed no actual `(same)` rows; only in type union

The R4 I2 fix changed `(same)` expansion from epicVerify-specific to generic. This is correct. However, reading the actual `epicPhaseTransitions` array: the type union includes `"(same)"` as a valid `to` value, but the current array has no rows using it. The plan now states this rule generically, which is the right direction. The minor issue: the plan's wording says "epicPhaseTransitions includes `(same)` in its type union and other tables may adopt it" but this reads slightly ambiguously — an implementer could reasonably wonder if they need to scan for literal `"(same)"` strings in the array at runtime versus just checking the type union. Since the plan correctly says "For any transition entry where `to === '(same)'`" (a runtime value check), the intent is clear, but a brief clarification that the check is runtime not type-level would prevent confusion. This is a documentation micro-issue in the plan.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `task-lifecycle.ts` missing exported transition array — handler vs. table gap

`task-lifecycle.ts` contains `handleDropTask` and `handleConvertTask`, but — confirmed by codebase inspection — it exports no transition arrays. The plan correctly specifies adding `taskLifecycleTransitions` covering `DROP_TASK` and `CONVERT_TASK`. However, there is a gap worth noting: `task-create.ts` exports `createTaskTransitions` (for `CREATE_TASK → open`), but the `task:create` command uses `begin('create-task', ...)` which produces `CREATE_TASK`. The `commandToEvent` entries therefore need entries for both `task:create` (CREATE_TASK) and `task:drop`/`task:convert` (DROP_TASK/CONVERT_TASK). The plan covers all three, which is correct. The minor architecture concern is that the prerequisite task groups `taskLifecycleTransitions` into `task-lifecycle.ts` alongside drop/convert, but `createTaskTransitions` lives separately in `task-create.ts`. This split is fine and consistent with other entity patterns (e.g., `epic-create.ts` vs `epic-lifecycle.ts`), but the plan should confirm `createTaskTransitions` is already exported and will be imported alongside `taskLifecycleTransitions`. No change needed — this is a note for the implementer's benefit.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `computeNextCommands` ordering spec is underspecified for duplicate-event statuses

The plan specifies entity commands ordered "by their position in the transition table (reflecting workflow progression)." This works cleanly for linear flows, but several statuses are reachable via multiple transition tables — for example, `refining-architecture` is reachable from both `epicPhaseTransitions` (via `BEGIN_REFINE_ARCHITECTURE`) and potentially `epicRefineTransitions` (stay-in-place). When a status appears in multiple tables, the "position in the transition table" ordering is ambiguous because the derivation concatenates rows from all tables. The plan should specify a concrete ordering rule: e.g., "ordered by position in the flat concatenation of all transition arrays, in the order they are imported" or "deduplicated by command template, preserving first occurrence." This matters for determinism in the fitness test and for consumer expectations. Without this, two implementers may produce different orderings for the same status.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fitness test "forward check" relies on file-path scanning for command files — plan should specify the scan scope

Phase 1 task 4 "forward check" says: "For every user-facing command in `src/commands/` that calls `begin()`, `complete()`, or `submit()`..." The implementation approach (static file analysis, matching the `mutation-through-state-machine.test.ts` pattern) is sound. However, the plan should specify whether the scan uses `collectTsFiles(SRC_DIR)` filtered to `src/commands/` (as the existing fitness test does) or a glob of `src/commands/**/*.ts`. Both are correct, but the plan should be explicit so the implementer matches the established fitness test helper pattern. The `collectTsFiles` helper in `tests/fitness/helpers.ts` is the right primitive.

Resolution: DIRECTLY_ACTIONABLE

---

## Architecture Assessment

The overall architecture is well-conceived. The derivation-from-transition-tables constraint is genuinely enforced — the plan correctly identifies that `commandToEvent` is the only manually-maintained layer (display metadata + event linkage) and that everything else computes from existing tables. The three module responsibilities are cleanly separated: transition tables (state machine, pure), `next-commands.ts` (registry + computation, RPC layer), `begin/submit/complete.ts` (integration points). INV-003 and INV-004 are preserved.

The `(error)` filtering (I1), `(same)` expansion (I2), and `"(none)"` sentinel (I3) issues from R4 are all correctly integrated into the plan text. The `_testing` namespace was resolved in favor of direct export with `as const ReadonlyArray`, which is consistent with existing transition array exports.

Module depth: `next-commands.ts` is appropriately deep — small public API (`computeNextCommands`, `NextCommands`, `CommandEntry`) hiding significant derivation complexity. The three RPC integration points are minimal callers (single call each), which confirms the module's depth is well-calibrated.

The fitness test design covers three independent failure modes: forward coverage (command files missing from registry), reverse coverage (registry entries with no command file), and transition reachability (derivation bugs). This is the right defense-in-depth strategy for a derived data structure.

## Score: 9/10

The plan is in strong shape after four rounds. The remaining issues are all minor: two are documentation/clarification gaps (pre-activated wildcard resolution, ordering determinism), three are notes for implementers that would prevent subtle bugs. Nothing here blocks implementation. Bringing to 9.5+ would require adding the deduplication note for `UPDATE_DECISION` multi-target entries and the pre-activated expansion clarification.

## Summary

- Critical: 0
- Important: 0
- Minor: 6
