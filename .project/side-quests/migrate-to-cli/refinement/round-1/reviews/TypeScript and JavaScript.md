# TypeScript and JavaScript Review

## Issues

**[CRITICAL] MIGRATE_PROJECT event violates INV-003 (pure state machine) by design**
Phase 4 proposes a `MIGRATE_PROJECT` event that "constructs entities at any status (including terminal states like `completed`/`abandoned`) in one transition." The existing state machine enforces workflow invariants through sequential transitions (e.g., an epic can only reach `activated` after passing through explore/architecture/slicing phases). A single event that places entities at arbitrary statuses bypasses all guards and transition logic — it's essentially a `SET_STATE` backdoor. This doesn't violate INV-003 (purity) per se, but it does undermine the state machine's purpose as the single enforcer of workflow rules (INV-001). Consider an alternative: the migrate command constructs the `ProjectState` tree directly (outside the state machine) and passes it to `commitState()`. This is honest about what's happening — migration is a data import, not a state transition. The state machine stays clean.
Resolution: USER_INPUT

**[IMPORTANT] Plan references `z.pick()` but Zod v4 objects may not support `.pick()` as a method**
Phase 1 says schemas are "composed from entity schemas" using "`z.pick()`/composition." In Zod v4 (which this project uses — `"zod": "^4.0.0"`), the `.pick()` method is available on `z.object()` schemas, but the plan's phrasing `z.pick()` as a standalone function is misleading. More critically, the plan says to compose migration schemas from entity schemas like `epicSchema` — but `epicSchema` includes fields like `refinement`, `verifications`, `created`, `updated` that are irrelevant to migration input. Using `.pick()` on `epicSchema` would work but couples migration schemas to entity internals. Instead, define migration-specific schemas that reference only the shared enum schemas (`epicStatusSchema`, `sliceStatusSchema`, `questStatusSchema`) rather than picking from full entity schemas. This is simpler and avoids breaking when entity schemas change.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] New error codes `STATE_ALREADY_MIGRATED`, `DATA_NO_PROJECT_DIR`, `MIGRATION_VALIDATION_ERROR`, `MIGRATION_CORRECTION_LIMIT`, `MIGRATION_BACKUP_EXISTS` need proper namespace placement**
Phase 2 says "Add error codes to `src/util/errors.ts` if needed" but the proposed codes don't fit existing namespaces. `STATE_ALREADY_MIGRATED` uses the `STATE_` prefix but is defined in `state-events.ts` where `StateErrorCode` lives — it would need to be added there, not just in `errors.ts`. `DATA_NO_PROJECT_DIR` should probably be `DATA_NO_PROJECT` which already exists. `MIGRATION_*` codes introduce a new namespace not currently in `GoodplanErrorCode`. The plan should explicitly specify: (1) which namespace each code belongs to, (2) which type union to extend, and (3) whether a new `MigrationErrorCode` type is needed in the union.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `MigrationAnswer.data` typed as `unknown` loses type safety at validation boundary**
Phase 1 defines `MigrationAnswer` as `{ id: string, data: unknown }`. While this is validated against the question's schema at runtime, the plan doesn't describe how the validated data flows through the system in a type-safe way. After validation, the code should narrow `data` to the concrete type (e.g., `InventoryResponse`, `EpicDetailResponse`). The plan should specify a discriminated union or generic approach: `MigrationAnswer<T = unknown> = { id: string, data: T }` with a `validateAnswer<T>(answer: MigrationAnswer, schema: z.ZodType<T>): MigrationAnswer<T>` helper that returns the narrowed type. Without this, Phase 3-4 code will be littered with unsafe casts.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `MigrationState` uses `Record<string, EpicDetailResponse>` — needs `noUncheckedIndexedAccess` handling**
The `MigrationState` type includes `epicDetails: Record<string, EpicDetailResponse>`. With `noUncheckedIndexedAccess: true` (which this project uses), every lookup returns `EpicDetailResponse | undefined`. The plan doesn't mention this. Phase 3 and 4 code that accesses `state.epicDetails[epicName]` will need explicit undefined checks. Consider using a `Map<string, EpicDetailResponse>` instead (since Maps work better with nullable access patterns), or at minimum note the required narrowing in the task descriptions.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `sourcePath` validation is a filesystem I/O operation in what's described as schema-level code**
Phase 1 lists a "sourcePath validation helper" alongside the schema definitions in `src/schemas/migration/`. But path existence checking requires `fs.existsSync()`, which is I/O. Schema files in `src/schemas/` are currently pure (no I/O imports). The validator should live in the command or a utility module, not in `src/schemas/migration/`. This is consistent with the project's layering where schemas are pure type definitions and I/O happens in commands/data layer.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `fs.renameSync` for `.project/` rename may fail across filesystem boundaries**
Phase 4 says "Use `fs.renameSync` — fast, atomic on same filesystem." This is correct but the plan should handle the failure case explicitly. If `.project/` is on a different mount (e.g., symlinked from another volume), `renameSync` throws `EXDEV`. The plan should specify a fallback (recursive copy + remove) or at minimum catch `EXDEV` and provide a clear error message. Given this is a migration tool that may run in diverse environments, robustness matters.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `activatedDate: string | null` should use `timestampSchema.nullable()` for consistency**
Phase 1 specifies the per-epic detail schema with `activatedDate: string | null` as a plain description. The codebase already has `timestampSchema` (ISO 8601 datetime) in `src/schemas/shared.ts`. The migration schema should use `timestampSchema.nullable()` to get the same validation (`.datetime()` format) rather than a bare `z.string().nullable()` which would accept any string.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Confirmation schema's conditional requirement (`reAnswerIds` required when `approved: false`) needs a Zod discriminated union, not a plain object**
Phase 1 defines `{ approved: boolean, reAnswerIds: string[], notes: string }` but says "approved=true (no reAnswerIds needed) and approved=false (reAnswerIds required)." A plain object schema can't express this conditional requirement. Use a Zod discriminated union: `z.discriminatedUnion("approved", [z.object({ approved: z.literal(true), notes: z.string() }), z.object({ approved: z.literal(false), reAnswerIds: z.array(z.string()).min(1), notes: z.string() })])`. This gives proper type narrowing when checking `approved`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5 status inference heuristics are missing several valid epic statuses**
The skill's status inference only maps to `abandoned`, `completed`, `activated`, `architecture-defined`, and `created`. But the epic status enum includes `exploring`, `explored`, `defining-architecture`, `refining-architecture`, `architecture-refined`, `defining-slices`, `slices-defined`, `refining-slices`, `slices-refined`. For migration of a pre-CLI project, these intermediate statuses are unlikely (they represent in-progress CLI workflows), but the plan should explicitly state that intermediate statuses are not expected in pre-CLI projects and default to the nearest stable state.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6 integration test uses `GOODPLAN_DIR` environment variable that may not exist**
The plan says "Set `GOODPLAN_DIR` to temp dir's `.project/`" but there's no evidence this environment variable is used in the codebase. The existing `init` command uses `process.cwd()` and `path.join(cwd, ".project")`. The test should either change `process.cwd()` or the plan should specify adding `GOODPLAN_DIR` support as a prerequisite task.
Resolution: CODEBASE_EXPLORATION

## Score: 6/10

The plan has a solid high-level design for the multi-round Q&A protocol, good use of `z.toJSONSchema()` per the research, and sensible phase sequencing. However, there are several TypeScript-specific gaps: the `MIGRATE_PROJECT` event's relationship to state machine invariants needs a design decision, error code namespacing is underspecified, type safety through the validation pipeline has gaps (`unknown` data flow), and several schema design choices need refinement (discriminated unions, timestamp reuse, I/O placement). Addressing the CRITICAL item and the IMPORTANT items would bring this to 9+.

## Summary
- Critical: 1
- Important: 6
- Minor: 4
