# Holistic Review — Data Model Changes Plan

Reviewer: holistic
Iteration: 1
Scope: Entire plan

## Issues

**[CRITICAL]** Phase 4 references `gp upgrade` but the command is `gp migrate`

The plan's Phase 4 title says "Upgrade Migration" and all Expected Behavior checks use `gp upgrade --json`. The actual CLI command is `gp migrate` (`src/commands/global/migrate.ts`). The epic architecture renames it to `/gp:upgrade` as a future skill rename, but that skill rename is part of a different slice (skill consolidation) — not this data model slice. At the time this plan executes, the command will still be `gp migrate`. Every `gp upgrade` invocation in Phase 4's Expected Behavior and Tasks will fail.

Resolution: DIRECTLY_ACTIONABLE

Fix: Replace all `gp upgrade` references in Phase 4 with `gp migrate`. If the rename happens before this slice ships, adjust then — but plan against the current CLI surface.

---

**[IMPORTANT]** Phase 1 missing `CREATE_DECISION` state event schema update

The plan's Phase 1 tasks update `src/schemas/records/decision.ts` (entry schema) and `src/schemas/commands/decision.ts` (input schema), but do not mention updating the `CREATE_DECISION` event type in `src/schemas/state-events.ts` (lines 122-129). The research file explicitly calls this out: "The `CREATE_DECISION` state event type needs the new fields added." Without this, the new fields cannot flow from the command layer through the state event to the transition handler.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a task to Phase 1: "Add optional `entityPath` (string) and `reconsiderWhen` (string array) to the `CREATE_DECISION` event type in `src/schemas/state-events.ts`."

---

**[IMPORTANT]** Phase 1 entityPath validation placement risks violating INV-003 (State Machine purity)

The plan says: "Add `entityPath` validation in `decision:create` command: if provided, verify the path resolves to an entity directory in `.goodplan/`." This is correct placement (command or RPC layer, not state machine). However, the task is vague about which layer does the validation. The state machine transition handler (`src/core/state/transitions/decision.ts`) builds the `DecisionEntry` field-by-field — if someone adds path validation there, it would violate INV-003 (no I/O in state machine). The task should explicitly state the validation belongs in the command handler or RPC layer, not the transition handler.

Resolution: DIRECTLY_ACTIONABLE

Fix: Clarify the validation task: "Add `entityPath` validation in the `decision:create` command handler (Commands layer) — NOT in the state machine transition handler. Check that the path resolves to an entity directory in `.goodplan/` using filesystem access."

---

**[IMPORTANT]** Phase 2 Expected Behavior "Before" check is not falsifiable

The "Before" section has only: `grep "validUntil" src/schemas/records/learning.ts` -> no match. This is a source code grep, not a behavioral check. There is no "Before" behavioral check that tests the system's runtime behavior (e.g., attempting to pass `validUntil` in a completion payload and verifying it's either ignored or rejected). The "After" checks test via fixture completion, but there's no symmetric "Before" test.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a behavioral "Before" check, e.g.: "In a test fixture, complete a slice with a learning that includes `validUntil` field -> the persisted learning in `learnings.jsonl` does NOT contain `validUntil` (field stripped by schema validation)."

---

**[IMPORTANT]** Phase 2 `validUntil` flow-through assumption needs verification

The research file says "adding `validUntil` to both schemas should be sufficient" because `processLearnings` passes entries through. However, the RPC layer maps `LearningInput` to `LearningEventEntry` (which is an alias for `LearningEntry`). The plan's task says "Update completion handler (`processLearnings` or equivalent)" but doesn't explicitly mention updating the RPC layer's mapping. If the RPC layer uses `learningInputSchema.parse()` then adds `source`, `rollup`, `file` fields manually (likely, since `LearningInput` omits those), it must also pass through `validUntil`. The plan should include a task to verify/update the RPC layer mapping.

Resolution: CODEBASE_EXPLORATION

Research: Check `src/core/rpc/complete.ts` for the `LearningInput` -> `LearningEventEntry` mapping. Does the RPC layer spread the input or manually pick fields? If it picks fields, `validUntil` will be silently dropped. Identify the exact code path and determine if an explicit task is needed.

---

**[IMPORTANT]** Phase 3 references `slice-submit.ts` touching overview, but it does not

The Phase 3 task list includes: "Update `slice-plan.ts`, `slice-submit.ts`, and other slice transition files that touch overview." Codebase exploration shows `slice-plan.ts` does reference `epics/overview.json` (line 33), but `slice-submit.ts` does NOT reference any overview path. Including it adds confusion and risks unnecessary changes.

Resolution: DIRECTLY_ACTIONABLE

Fix: Remove `slice-submit.ts` from the Phase 3 task. Replace with: "Grep for all source files referencing overview paths and update each one" (the plan already has this as a separate task, so just remove the incorrect file reference).

---

**[IMPORTANT]** Phase 3 does not mention updating `src/core/context/priorities.ts`

The research file lists `src/core/context/priorities.ts` as containing overview path references (confirmed: it references `quests/overview.json` at line 78). Phase 3's task list does not mention updating this file. The "grep exhaustively" task should catch it, but the specific file list should include it since the Context module is a separate subsystem from the ones listed.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add `src/core/context/priorities.ts` to the explicit file list in Phase 3 tasks, or at minimum note it as a known reference point for the exhaustive grep task.

---

**[MINOR]** Phase 3 does not address legacy `slices/overview.json` in test fixtures

The research file notes: "slices/overview.json is a legacy artifact — no source code references it." The plan's Phase 3 updates all test fixtures from separate overview files to a single `overview.json`, but doesn't mention removing `slices/overview.json` from fixtures. This is inert but leaving undocumented legacy artifacts in fixtures is a maintenance smell.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a minor cleanup task in Phase 3 or Phase 4: "Remove `slices/overview.json` from test fixtures if present (legacy artifact, not referenced by any code)."

---

**[MINOR]** Phase 4 does not mention handling `slices/overview.json` during migration

If existing projects have a `slices/overview.json` (the legacy artifact found in fixtures), the migration should either ignore it or clean it up. The plan's migration only handles `quests/overview.json` and `tasks/overview.json`.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a note to Phase 4: "If `slices/overview.json` exists, remove it during migration cleanup (legacy artifact not used by any code path)."

---

**[MINOR]** Phase 4 verification says "Run upgrade against this repo's own `.goodplan/` state" — risky

Testing migration against the live repo's `.goodplan/` state is risky. The CLAUDE.md rules say: "Test CLI changes: Run `./gp` against a **fixture repo** in `/tmp`." The plan should test migration against a purpose-built fixture with old-style overviews, not the real project state.

Resolution: DIRECTLY_ACTIONABLE

Fix: Replace the verification step with: "Run migration against a fixture in `/tmp` containing old-style separate overview files. Verify consolidated result."

---

**[MINOR]** No documentation update tasks

The plan does not include tasks for updating architecture documentation (`data-model.md`, `_overview.md` maturity table, `data-layer-api.md`) after the overview consolidation. These files currently describe the three-file overview structure.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a documentation task in Phase 3 or as a final phase: "Update `.goodplan/architecture/data-model.md`, `data-layer-api.md`, and `_overview.md` to reflect the consolidated overview structure."

## Score: 5/10

The plan covers the right scope and phases are logically ordered. However, the `gp upgrade` vs `gp migrate` naming mismatch is a critical issue that would cause Phase 4 to fail entirely. Multiple important issues around missing state event schema updates, unclear validation layer boundaries, and unverified RPC flow-through assumptions would lead to implementation bugs. To reach 9+: fix the command name, add the state event schema task, clarify validation placement, verify the RPC learning mapping, and add documentation tasks.

## Summary
- Critical: 1
- Important: 6
- Minor: 4
