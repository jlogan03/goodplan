# Merged Review Feedback — Data Model Changes Plan (Round 1)

Reviewers: holistic (5/10), software-architecture (6/10), typescript (5/10)

## CRITICAL

### C1. Phase 4 references `gp upgrade` but the CLI command is `gp migrate`
Sources: holistic, software-architecture, typescript

All three reviewers flagged this. Phase 4's title, tasks, and Expected Behavior checks all use `gp upgrade --json`. The actual CLI command is `gp migrate` (`src/commands/global/migrate.ts`). The `/gp:upgrade` skill rename is part of the broader epic, not this slice. Every `gp upgrade` invocation will fail.

Resolution: DIRECTLY_ACTIONABLE
Fix: Replace all `gp upgrade` references in Phase 4 with `gp migrate`.

---

### C2. Phase 1 missing `CREATE_DECISION` state event schema update
Sources: holistic, software-architecture, typescript

The plan updates the decision entry schema, command input schema, and transition handler, but does not include a task to add `entityPath` and `reconsiderWhen` to the `CREATE_DECISION` variant in `src/schemas/state-events.ts` (lines 122-129). The research file explicitly flagged this. Without it, new fields cannot reach the transition handler and the implementer will hit type errors.

Resolution: DIRECTLY_ACTIONABLE
Fix: Add task to Phase 1: "Add optional `entityPath` (string) and `reconsiderWhen` (string array) to the `CREATE_DECISION` event type in `src/schemas/state-events.ts`."

---

### C3. Phase 1 missing RPC layer plumbing for new decision fields
Source: typescript

Beyond the state event type, `BeginPayloadMap["create-decision"]` in `src/core/rpc/types.ts` (line 91) and the `"create-decision"` case in `src/core/rpc/begin.ts` (lines 184-193) both destructure only `{ id, domain, title, summary }`. Both must be extended with optional `entityPath` and `reconsiderWhen`. The plan's task "Update `decision:create` handler to pass new fields through" is too vague -- it should explicitly name `BeginPayloadMap` in `types.ts` and the case in `begin.ts`.

Resolution: DIRECTLY_ACTIONABLE
Fix: Add explicit tasks: (1) extend `BeginPayloadMap["create-decision"]` in `src/core/rpc/types.ts` with optional `entityPath` and `reconsiderWhen`, (2) update the `"create-decision"` case in `src/core/rpc/begin.ts` to destructure and forward the new fields using conditional spread.

---

## IMPORTANT

### I1. Phase 1 `entityPath` validation placement must be explicit to protect INV-003
Sources: holistic, software-architecture, typescript

All three reviewers flagged that the plan says "add entityPath validation in `decision:create` command" but doesn't specify the exact insertion point. Risk: an implementer puts filesystem checks inside the state machine transition handler, violating INV-003 (no I/O in state machine). The software-architecture reviewer further notes validation should happen in the RPC layer using the loaded `ProjectState` tree (no direct filesystem access needed), keeping the command layer thin.

Resolution: DIRECTLY_ACTIONABLE
Fix: Clarify the validation task: "Validate `entityPath` in the RPC layer (`begin.ts`) by checking the loaded `ProjectState` tree for the entity -- NOT in the transition handler, NOT via direct filesystem I/O. Acceptable entity paths: `epics/<name>` (has `epic.json`), `epics/<name>/slices/<name>` (has `slice.json`), `quests/<name>` (has `quest.json`), `tasks/<name>` (has `task.json`)."

---

### I2. Phase 2 `validUntil` silently dropped by `mapLearningInputs` field-by-field construction
Sources: holistic, software-architecture, typescript

The research file claims `validUntil` flows through automatically -- this is incorrect. `mapLearningInputs()` in `src/core/rpc/complete.ts` (lines 144-152) explicitly constructs each `LearningEventEntry` field-by-field (`{ category, summary, file, tags, source, rollup, rollupTo }`). It does NOT spread the input. Adding `validUntil` to schemas alone will NOT cause it to flow through.

Resolution: DIRECTLY_ACTIONABLE
Fix: Add explicit task to Phase 2: "Update `mapLearningInputs()` in `src/core/rpc/complete.ts` to include `validUntil` in the constructed `LearningEventEntry`, using conditional spread for `exactOptionalPropertyTypes` compliance: `...(input.validUntil ? { validUntil: input.validUntil } : {})`."

---

### I3. Phase 2 `exactOptionalPropertyTypes` conditional spread pattern needed everywhere
Source: typescript

With `exactOptionalPropertyTypes: true`, writing `validUntil: input.validUntil` when the field is optional will set the property to `undefined` rather than omitting it. The codebase pattern (e.g., `begin.ts` lines 154-155) is `...(value ? { field: value } : {})`. This applies to every location mapping new optional fields: `mapLearningInputs`, `handleCreateDecision`, `BeginPayloadMap` event construction, and `decision:create` command payload.

Resolution: DIRECTLY_ACTIONABLE
Fix: Add a note to Phases 1 and 2: "All new optional fields must use conditional spread pattern for `exactOptionalPropertyTypes` compliance."

---

### I4. Phase 3 missing `src/core/context/priorities.ts` in explicit file list
Sources: holistic, software-architecture

`src/core/context/priorities.ts` references `quests/overview.json` (line 78). Phase 3's task list does not mention updating the context subsystem. The "grep exhaustively" task may catch it, but the context module is a separate architectural layer worth calling out explicitly.

Resolution: DIRECTLY_ACTIONABLE
Fix: Add `src/core/context/priorities.ts` to the explicit file list in Phase 3 tasks.

---

### I5. Phase 3 missing documentation update tasks
Sources: holistic, software-architecture

`architecture/data-model.md` documents the current 3-file overview structure with example state trees. Phase 3 changes this to a single `overview.json` but has no task for updating docs. This will mislead future slice planning.

Resolution: DIRECTLY_ACTIONABLE
Fix: Add documentation task to Phase 3: "Update `.goodplan/architecture/data-model.md`, `data-layer-api.md`, and `_overview.md` to reflect the consolidated overview structure."

---

### I6. Phase 3 incorrectly lists `slice-submit.ts` as touching overview
Source: holistic

`slice-submit.ts` does NOT reference any overview path. Including it adds confusion and risks unnecessary changes. `slice-plan.ts` does reference `epics/overview.json` (line 33).

Resolution: DIRECTLY_ACTIONABLE
Fix: Remove `slice-submit.ts` from the Phase 3 task's explicit file list. The "grep exhaustively" task handles discovery.

---

### I7. Phase 2 Expected Behavior "Before" check is not falsifiable
Source: holistic

The "Before" check is only a source code grep (`grep "validUntil" ...` -> no match). There is no behavioral "Before" test.

Resolution: DIRECTLY_ACTIONABLE
Fix: Add a behavioral "Before" check: "In a test fixture, complete a slice with a learning that includes `validUntil` -> the persisted learning does NOT contain `validUntil`."

---

## MINOR

### M1. Phase 4 migration should handle legacy `slices/overview.json`
Sources: holistic, software-architecture

The research file notes `slices/overview.json` is a legacy artifact with no code references. Phase 4's migration handles `quests/overview.json` and `tasks/overview.json` but not this. Migration is the right time to clean it up.

Fix: Add to Phase 4 migration: "If `slices/overview.json` exists, remove it during migration (legacy artifact)."

---

### M2. Phase 4 verification should use fixture repo, not live `.goodplan/`
Source: holistic

Testing migration against the live repo's `.goodplan/` violates the project rule: "Test CLI changes against a fixture repo in `/tmp`."

Fix: Replace verification step: "Run migration against a fixture in `/tmp` containing old-style separate overview files."

---

### M3. Phase 3 should specify unified overview type exports
Sources: software-architecture, typescript

The plan says "Create unified overview schema" but doesn't specify type exports or how existing consumers (`Overview`, `EpicOverview`, `EpicOverviewItem`, `OverviewItem`, `SliceOverviewItem`) should be handled. The codebase uses `z.infer<>` pattern consistently.

Fix: Specify: "Export both `unifiedOverviewSchema` and `type UnifiedOverview = z.infer<typeof unifiedOverviewSchema>`. Specify whether existing types are preserved as sub-shapes or replaced."

---

### M4. Phase 1 `entityPath` validation should specify valid path structure
Source: software-architecture

The plan doesn't define what constitutes a valid entity path. Valid paths must map to entities with corresponding JSON files, not just any directory.

Fix: (Covered by I1 resolution above.)

---

### M5. Phase 3 task says "~30 files" but research shows 36 (14 source + 22 test)
Source: typescript

Minor inaccuracy. Fix: Correct to "~36 files."

---

### M6. No documentation update for test fixtures removing legacy `slices/overview.json`
Source: holistic

Fix: Add minor cleanup task: "Remove `slices/overview.json` from test fixtures if present."

---

## Resolved Contradictions

**entityPath validation layer**: holistic says "command handler or RPC layer", software-architecture says "RPC layer using ProjectState tree", typescript says "RPC layer". Merged resolution: RPC layer, using the loaded state tree (no direct filesystem I/O). This is the strongest position -- it avoids INV-003 risk, bypasses data layer abstraction concerns, and keeps validation testable.

**`gp upgrade` severity**: holistic rates CRITICAL, software-architecture rates CRITICAL, typescript rates IMPORTANT (frames it as needing "clarification"). Merged: CRITICAL -- the command literally does not exist, so Phase 4 will fail entirely.

**`validUntil` flow-through**: holistic flags as CODEBASE_EXPLORATION needed, software-architecture and typescript both confirm the field-by-field mapping and provide the exact code location. Merged: DIRECTLY_ACTIONABLE -- the answer is already known from the other reviews.
