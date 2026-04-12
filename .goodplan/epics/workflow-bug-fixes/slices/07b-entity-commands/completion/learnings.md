# Learnings — 07b-entity-commands

## Domain

- **Briefings are cross-scope**: Briefings live in both project and epic event logs, requiring the `scope` discriminator field on the Briefing type to identify provenance. This means `reduceBriefing` must handle events from multiple replay contexts.
- **Findings are epic-scoped**: Despite initial plan ambiguity, epic findings belong in `epic.findings` (inside `EpicState`), not a top-level `DerivedStateData` field. Project-level findings were added for the `finding:list` command at project scope.
- **Custom invariants are spine-domain**: Invariant entity events use `domain: "spine"` rather than a dedicated `"invariant"` domain, consistent with subsystems. This groups all "project structure" entities under one reducer.

## Architecture

- **`createProjectCommandContext` pattern**: The existing `createEventCommandContext` was epic-scoped only. Adding a project-scope variant (`createProjectCommandContext`) with a simpler interface (no epic/slice args) worked cleanly. Both share the same invariant-engine wiring pattern.
- **`resolveScopePath` utility**: Factoring scope-to-path resolution into a shared utility prevented duplication across event query/tail commands and project-scope commands. The exhaustive `never` pattern ensures new scopes require explicit path mapping.
- **Reducer-first architecture scales well**: All 6 new entity types are computed via single-pass `computeDerivedState()` reducers. No standalone `compute-*.ts` files were needed. This validates the design choice from slice 02.
- **`main.ts` scaling is real tech debt**: 19 new command imports pushed `main.ts` further into monolithic territory. Namespace-based lazy loading is acknowledged but deferred.

## Code Patterns

- **`narrowPayload` for type-safe reducers**: Every new case branch in reducers uses `narrowPayload(event, schema)` to safely narrow the type-erased event envelope. This is now the established pattern for all reducer handlers.
- **Conditional spread for `exactOptionalPropertyTypes`**: All Zod schemas with `.optional()` fields consistently use `...(value !== undefined ? { field: value } : {})` pattern. This was applied uniformly across all 6 entity schema files.
- **`MutatingCommandOutput` shape**: `{ ok: true, event: "<uuid>", entity: "<type>:<ref>" }` is the de facto JSON output contract for all mutation commands.

## Dependencies

- **citty `defineCommand` handles arg validation**: citty's built-in `required: true` enforcement eliminates manual presence checks for required args. Combined with Zod for payload validation, this provides two-layer input safety.

## Plan Accuracy

- **Plan was highly accurate**: The 5-phase structure (subsystem, project, briefing, finding+invariant, events+integration) mapped cleanly to implementation. The cross-cutting notes (items 1-11) prevented repeated mistakes.
- **Activity-log simplification was correct**: The plan noted that `appendEvent()` itself IS the activity record — this eliminated an entire class of "where does the activity-log call go?" questions during implementation.
- **178 tests vs plan's expected ~130**: More tests were written than planned, primarily due to cross-entity integration tests and edge-case coverage not anticipated in the plan.
