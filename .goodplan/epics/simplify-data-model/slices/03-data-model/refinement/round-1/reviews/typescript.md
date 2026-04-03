# TypeScript Review: Data Model Changes Plan

## Issues

**[CRITICAL]** Phase 1 missing `entityPath` and `reconsiderWhen` in `BeginPayloadMap["create-decision"]` and `begin.ts` event builder
The plan tasks cover the record schema, command input schema, and transition handler, but omit the RPC layer. The `BeginPayloadMap["create-decision"]` type in `src/core/rpc/types.ts` (line 91) currently has `{ id, domain, title, summary }`. The `buildBeginEvent` case for `"create-decision"` in `src/core/rpc/begin.ts` (lines 184-193) destructures those same four fields and builds the `CREATE_DECISION` event. Both must be extended with optional `entityPath` and `reconsiderWhen` fields. Without this, the new fields from the command input have no path to reach the state event or transition handler. The task "Update `decision:create` handler to pass new fields through to the state machine event" is vague — it should explicitly name `BeginPayloadMap` in `types.ts` and the `"create-decision"` case in `begin.ts`.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Phase 1 missing `entityPath` and `reconsiderWhen` in the `StateEvent` union (`CREATE_DECISION` variant)
The research file correctly identifies this gap (line 25-26: "new fields must be added here too"), but the plan's Phase 1 task list does not include a task to update `src/schemas/state-events.ts`. The `CREATE_DECISION` variant (lines 123-128) carries `{ id, domain, title, summary, ts }`. Without adding the new fields here, the transition handler in `decision.ts` cannot receive them. Add an explicit task: "Add optional `entityPath` and `reconsiderWhen` to the `CREATE_DECISION` variant in `src/schemas/state-events.ts`."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 `entityPath` validation location violates INV-003 (pure state machine)
The plan says to "Add `entityPath` validation in `decision:create` command: if provided, verify the path resolves to an entity directory in `.goodplan/`." This validation requires filesystem I/O (checking that a directory exists). The plan places it in the command layer, which is acceptable, but the wording "check that the path + entity JSON file exists" implies filesystem access. This should be done in the RPC layer (`begin.ts`) where the state is already loaded — the `ProjectState` tree contains all entity paths, so validation can check `getJson(state, entityPath + "/epic.json")` or similar without I/O. This keeps the command layer thin and the validation testable via the state tree. If done in the command layer with direct `fs.existsSync`, it bypasses the data layer abstraction and is harder to test.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 `mapLearningInputs` explicitly maps fields — `validUntil` will be silently dropped
The research file states "adding `validUntil` to the schema should flow through without handler changes" but this is incorrect. The `mapLearningInputs` function in `src/core/rpc/complete.ts` (lines 144-152) constructs `LearningEventEntry` objects by explicitly listing each field: `{ category, summary, file, tags, source, rollup, rollupTo }`. It does NOT spread the input. Adding `validUntil` to the schemas alone will NOT cause it to flow through — the mapping function must be updated to include `validUntil` in the constructed object. Add an explicit task: "Update `mapLearningInputs` in `src/core/rpc/complete.ts` to include `validUntil` in the `LearningEventEntry` construction (conditional spread to satisfy `exactOptionalPropertyTypes`)."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 `validUntil` requires conditional spread for `exactOptionalPropertyTypes` compliance
With `exactOptionalPropertyTypes: true`, you cannot write `validUntil: input.validUntil` when `validUntil` is optional — if the value is `undefined`, it would set the property to `undefined` rather than omitting it. The correct pattern (used elsewhere in this codebase, e.g., `begin.ts` lines 154-155) is `...(input.validUntil ? { validUntil: input.validUntil } : {})`. The plan should note this pattern explicitly for implementers, since it applies to every location where the new optional fields are mapped: `mapLearningInputs`, `handleCreateDecision`, and `BeginPayloadMap` → event construction.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 references `gp upgrade` but no such command exists
Grepping for "upgrade" across all command files yields no results. The existing migration command is `gp migrate` (defined in `src/commands/global/migrate.ts`). The plan must either: (a) add a new `gp upgrade` command, or (b) add the overview consolidation migration to `gp migrate`. The architecture doc (`data-model-changes.md`) references `/gp:upgrade` as a skill, not a CLI command. The plan's Phase 4 tasks assume `gp upgrade` exists as a CLI command with `--json` output. This needs clarification — is this a new command or should the tasks target `gp migrate`?
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 3 task list says "~30 files" but research shows 36 files (14 source + 22 test)
Minor inaccuracy but worth correcting so implementers don't stop searching after 30 files.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 `decision:create` command passes only 4 fields to `begin()`
The `decision:create` command in `src/commands/decision/create.ts` (lines 37-43) constructs the payload as `{ id, domain, title, summary }`. This must be extended with `entityPath` and `reconsiderWhen` from the validated input. The plan's task "Update `decision:create` handler to pass new fields through" covers this but should reference the specific file and the conditional spread pattern needed for optional fields.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 overview schema should use `z.infer<>` pattern consistently
The plan task says "Create unified overview schema" but doesn't specify the type export pattern. The codebase consistently exports both the schema and an inferred type (e.g., `export type Overview = z.infer<typeof overviewSchema>`). The unified schema should follow this pattern: export both `unifiedOverviewSchema` and `type UnifiedOverview = z.infer<typeof unifiedOverviewSchema>`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has solid phasing and good backward-compatibility design, but it has two critical gaps in the Phase 1 data flow (missing `StateEvent` update, missing RPC layer plumbing) and a critical misconception in Phase 2 (claiming `validUntil` flows through automatically when it does not). Phase 4 references a command that doesn't exist. To reach 9+: add explicit tasks for `StateEvent` and `BeginPayloadMap` updates in Phase 1, add the `mapLearningInputs` update task in Phase 2, note the `exactOptionalPropertyTypes` conditional spread pattern, and resolve the `gp upgrade` vs `gp migrate` question in Phase 4.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
