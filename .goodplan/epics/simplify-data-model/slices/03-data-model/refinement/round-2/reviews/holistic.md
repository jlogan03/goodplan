# Holistic Review — Data Model Changes Plan

Reviewer: holistic
Iteration: 2
Scope: Entire plan

## Round 1 Fix Verification

All 11 issues from round 1 (1C, 6I, 4M) have been addressed in the revised plan:

- **[CRITICAL] `gp upgrade` → `gp migrate`**: Fixed. Phase 4 now consistently uses `gp migrate`.
- **[IMPORTANT] CREATE_DECISION event schema**: Fixed. Phase 1 tasks now include adding `entityPath` and `reconsiderWhen` to the `CREATE_DECISION` event type in `src/schemas/state-events.ts`.
- **[IMPORTANT] entityPath validation placement**: Fixed. Phase 1 explicitly states validation belongs in the RPC layer (`begin.ts`), checking the loaded `ProjectState` tree — not in the transition handler, not via direct filesystem I/O.
- **[IMPORTANT] Phase 2 Before check not falsifiable**: Fixed. Before section now includes a behavioral check using a test fixture.
- **[IMPORTANT] validUntil RPC flow-through**: Fixed. Phase 2 now includes an explicit task to update `mapLearningInputs()` in `src/core/rpc/complete.ts` with conditional spread.
- **[IMPORTANT] `slice-submit.ts` incorrect reference**: Fixed. Phase 3 now correctly notes `slice-submit.ts` does NOT reference overview paths.
- **[IMPORTANT] Missing `priorities.ts`**: Fixed. Phase 3 now includes `src/core/context/priorities.ts` as an explicit task.
- **[MINOR] Legacy `slices/overview.json` in fixtures**: Fixed. Phase 3 includes a cleanup task.
- **[MINOR] `slices/overview.json` in migration**: Fixed. Phase 4 includes removing it.
- **[MINOR] Testing against live `.goodplan/`**: Fixed. Phase 4 verification uses fixture in `/tmp`.
- **[MINOR] Documentation updates missing**: Fixed. Phase 3 includes documentation update task for `data-model.md`, `data-layer-api.md`, and `_overview.md`.

## Issues

**[IMPORTANT]** Phase 1 entityPath validation — acceptable entity paths list may be incomplete

The plan specifies four acceptable entity path patterns: `epics/<name>`, `epics/<name>/slices/<name>`, `quests/<name>`, `tasks/<name>`. However, the current `Target` type in `src/core/rpc/types.ts` also includes `type: "decision"` and `type: "project"`. While it's reasonable to exclude these from `entityPath` validation (decisions referencing other decisions is circular, and project-level is meaningless), the plan should explicitly state *why* these are excluded so the implementer doesn't wonder if it's an oversight.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a brief note to the entityPath validation task: "Acceptable entity paths are limited to epics, slices, quests, and tasks. Decisions and the project root are excluded — decisions referencing other decisions is circular, and project-level provenance is meaningless since all decisions are already project-scoped."

---

**[IMPORTANT]** Phase 2 `mapLearningInputs` fix specifies `input.validUntil` but function signature uses destructured fields

The plan task says: "Update `mapLearningInputs()` in `src/core/rpc/complete.ts` to include `validUntil` in the constructed `LearningEventEntry`, using conditional spread: `...(input.validUntil ? { validUntil: input.validUntil } : {})`". However, examining the actual function at line 125-162 of `complete.ts`, it constructs entries by manually picking fields from `input` — `input.category`, `input.summary`, `input.tags`, `input.rollupTo`. The conditional spread pattern is correct, but the plan should ensure it's placed inside the object literal at line 144-152, not as a separate operation. This is mostly a clarity issue — an implementer reading the plan task alongside the code should get it right, but the explicit code location would prevent mistakes.

Resolution: DIRECTLY_ACTIONABLE

Fix: Amend the task to specify: "In the `entries.push({ ... })` call at ~line 144 of `mapLearningInputs`, add `...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {})` alongside the existing field mappings." Note: use `!== undefined` rather than truthiness check, since `validUntil` is `string[] | undefined` and an empty array is a valid (if unusual) value.

---

**[IMPORTANT]** Phase 3 `complete.ts` hardcoded `epics/overview.json` reference not mentioned in tasks

Phase 3's task list mentions updating RPC layer files (`migrate.ts`, `complete.ts`) for the new overview path, but the specific reference in `complete.ts` at line 309 (`getJson<EpicOverview>(newState, "epics/overview.json")`) reads the epics overview to derive `epicComplete` status. In the consolidated model, this path changes to `overview.json` and the data shape changes from `{ items: EpicOverviewItem[] }` to `{ epics: [...], quests: [...], tasks: [...] }`. The existing code accesses `.items` — it will need to access `.epics` instead. This is a non-trivial change that the "grep exhaustively" task should catch, but given `complete.ts` is critical path code (every slice/quest completion goes through it), it deserves explicit mention.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add to Phase 3 tasks: "Update `complete.ts` epicComplete derivation (~line 309): change path from `epics/overview.json` to `overview.json` and access `.epics` instead of `.items`."

---

**[MINOR]** Phase 3 `migrate.ts` may not need overview path changes

The plan lists `migrate.ts` as needing updates for the new overview path. However, grep shows `migrate.ts` references `epics/overview.json` and `quests/overview.json` in its `buildMigrationState()` function — but this function builds state for *importing* old `.project/` directories, not for reading current `.goodplan/` state. After this slice ships, new projects use the consolidated `overview.json`, but the migration from `.project/` format still needs to produce the *new* unified structure. So `migrate.ts` does need changes, but the nature is different: it must write a single `overview.json` instead of separate files. The plan's task description ("update for new overview path") is slightly misleading — it's about changing the *output* structure, not just updating path strings.

Resolution: DIRECTLY_ACTIONABLE

Fix: Clarify the `migrate.ts` task: "Update `buildMigrationState()` in `migrate.ts` to write a single `overview.json` with `{ epics, quests, tasks }` structure instead of separate `epics/overview.json`, `quests/overview.json`, and `tasks/overview.json`."

---

**[MINOR]** Phase 3 unified schema task could be more precise about type exports

The task says: "Specify whether existing types (`Overview`, `EpicOverview`, `EpicOverviewItem`, `OverviewItem`, `SliceOverviewItem`) are preserved as sub-shapes or replaced." This is good guidance, but the decision has downstream consequences. Currently `EpicOverview` is imported by `complete.ts` (line 7) and `task-lifecycle.ts` (line 7 — imports `Overview`). If these types are removed rather than preserved as aliases, every import site needs updating. The plan should recommend a specific approach: keep the existing types as sub-shapes of the unified type (e.g., `UnifiedOverview["epics"]` maps to the old `EpicOverviewItem[]`) to minimize import churn.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add guidance: "Recommend preserving `EpicOverviewItem`, `OverviewItem`, `SliceOverviewItem` as named sub-types (derived from the unified schema) to minimize import churn. The top-level `Overview` and `EpicOverview` types can be replaced with `UnifiedOverview` since their shape changes structurally."

---

**[MINOR]** Phase 1 `decision:show` task lacks specificity on human-readable format

The task says "Update `decision:show` command to include new fields in both JSON and human-readable output formats." The JSON format is straightforward (schema-driven), but the human-readable format at `src/commands/decision/show.ts` manually formats output. The plan should specify how the new fields appear in human-readable output — e.g., `entityPath` as "Scope: epics/simplify-data-model/slices/01-test-harness" and `reconsiderWhen` as a bullet list under "Reconsider when:". Without this, the implementer must make formatting decisions.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add to the task: "In human-readable output, display `entityPath` as 'Scope: <path>' (omit line if absent) and `reconsiderWhen` as a 'Reconsider when:' header followed by bullet items (omit section if absent)."

## Score: 8/10

Strong improvement from round 1. All previous issues are resolved. The plan is well-structured with clear phasing, good verification sections, and proper attention to `exactOptionalPropertyTypes` compliance. The remaining issues are clarity improvements rather than correctness problems — the "grep exhaustively" task in Phase 3 would likely catch the `complete.ts` reference, and the `mapLearningInputs` code location is findable. To reach 9+: add the explicit `complete.ts` task for the epicComplete derivation (this is critical-path code that deserves named attention), clarify the `migrate.ts` output structure change, and tighten the `mapLearningInputs` task wording.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
