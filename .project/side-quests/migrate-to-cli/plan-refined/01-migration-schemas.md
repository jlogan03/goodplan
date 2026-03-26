# Phase 1: Migration Schemas & Protocol Types

Define Zod migration round schemas (derived from entity schemas) and Q&A protocol envelope types. These are the foundation for the migrate command and provide auto-generated `responseSchema` via `z.toJSONSchema()`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Migration schema files do not yet exist at `src/commands/global/migrate/schemas.ts`
- [ ] `grep -r "toJSONSchema" src/schemas/` → no matches (no schema-to-JSON-Schema usage yet)

**After implementation** (should pass / show presence):
- [ ] Migration schema files exist at chosen location with `rounds.ts`, `protocol.ts` (or similar)
- [ ] `bun test tests/unit/schemas/migration/` → all tests pass
- [ ] A test exercises `z.toJSONSchema(inventoryResponseSchema)` and confirms the output includes `properties`, `required`, and any `.describe()` annotations

### Tasks

- [ ] Create migration round schemas at `src/commands/global/migrate/schemas.ts` (co-located with the migrate command — avoids polluting the shared schema namespace for a transient feature):
  - **Inventory response schema** — referencing shared enum schemas (`epicStatusSchema`, `questStatusSchema`, `sliceStatusSchema`):
    - `project`: `{ name: string, goal: string }` — `name` goes to `project.json`, `goal` is written to `idea.md` during artifact copy (Phase 4), NOT to `project.json` (which has no `goal` field)
    - `epics`: array of `{ name: string, goal: string, status: EpicStatus, sourcePath: string }`
    - `quests`: array of `{ name: string, goal: string, status: QuestStatus, sourcePath: string }`
  - **Per-epic detail schema** — per epic:
    - `slices`: array of `{ name: string, goal: string, status: SliceStatus, sourcePath: string }`
    - `sliceSequence`: `string[]` (ordering)
    - `hasArchitecture`: `boolean`
    - `activatedDate`: use `timestampSchema.nullable()` from `src/schemas/shared.ts` (ISO 8601 validation)
  - **Per-slice detail schema** — per slice (if needed beyond what's in epic details):
    - Status is already captured in the per-epic round; this may collapse into the epic detail round
  - **Confirmation schema** — use `z.discriminatedUnion("approved", [...])`:
    - `approved: true` variant: `{ approved: z.literal(true), notes: z.string() }`
    - `approved: false` variant: `{ approved: z.literal(false), reAnswerIds: z.array(z.string()).min(1), notes: z.string() }`
    - Note: Zod v4's `toJSONSchema()` handles `z.literal(true)` / `z.literal(false)` discriminators correctly, producing valid `oneOf` with `const: true` / `const: false`. No fallback needed.
  - Add `.describe()` annotations on all fields — these carry through to `z.toJSONSchema()` output and serve as hints for the LLM
  - **`import type` compliance:** Shared enum schemas (`epicStatusSchema`, etc.) are runtime Zod values and use value imports. Any inferred types (`EpicStatus`, etc.) must use `import type` per `verbatimModuleSyntax: true`.
- [ ] **Question ID naming convention:** IDs use kebab-case with entity-type prefix. Round 1 IDs are static (`project-info`, `epic-inventory`, `quest-inventory`). Round 2+ IDs are parameterized from prior answers (`epic-details-<name>`). Note: question IDs for round N are derived from answers in round N-1.
- [ ] Create Q&A envelope types (co-located with round schemas):
  - `MigrationQuestion`: `{ id: string, question: string, hint: string, responseSchema: object }`. Note: for large projects, `hint` (especially the confirmation round's state summary) could be very large — implementers should consider truncating or paginating for projects with many entities.
  - `MigrationAnswer<T = unknown>`: `{ id: string, data: T }` — generic to enable type-safe narrowing after validation. Add `validateAnswer<S extends z.ZodType>(answer: MigrationAnswer, schema: S): MigrationAnswer<z.infer<S>>` helper — infers the narrowed type from the schema, avoiding caller-provided `T` and `as` casts.
  - `MigrationRound`: `{ round: number, questions: MigrationQuestion[] }`
  - `MigrationResponse`: `{ round: number, answers: MigrationAnswer[] }`
  - `MigrationState`: define as a **Zod schema** (`migrationStateSchema`), not just a TypeScript type — it is serialized to `.migration-in-progress.json` and validated on re-read (resume path) per INV-005 (schema validation on every read). Shape: `{ status: z.enum(["in-progress", "confirming", "complete"]), round: number, answers: Record<string, unknown>, correctionRound: number }`. Answers are keyed by question ID (e.g., `"project-info"`, `"epic-details-initial"`) — this is the canonical shape used throughout the protocol, including Phase 3's re-answer correction flow. Note: all `Record<string, T>` lookups return `T | undefined` under `noUncheckedIndexedAccess` — add explicit narrowing checks at usage sites.
  - `MigrationResult`: define as a **Zod schema** (`migrationResultSchema`) — `{ status: 'questions', round: MigrationRound } | { status: 'complete', summary: MigrationSummary }`. Since `MigrationState` is already a Zod schema, defining `MigrationResult` as one too enables `goodplan schema --command migrate` to show the output shape. Validation errors are thrown as `GoodplanError` (no embedded `'error'` status variant; single error path via throws).
- [ ] Add `sourcePath` validation helper in the command or utility layer (NOT in schema files — `src/schemas/` must remain pure with no I/O imports): given a `sourcePath` and a base directory, confirm the path exists via `fs.existsSync()`. Used by the migrate command to validate answers immediately.
- [ ] Ensure quest goals from inventory answers are explicitly included in the migration payload (the `goal` field must be passed through to state construction).
- [ ] Write unit tests in `tests/unit/schemas/migration/`:
  - Inventory schema validates correct input, rejects missing required fields
  - `z.toJSONSchema()` produces valid JSON Schema with `.describe()` annotations
  - `sourcePath` validator catches non-existent paths
  - Confirmation schema handles approved=true (no reAnswerIds needed) and approved=false (reAnswerIds required)

### Verification

- Confirm schemas reference shared enum schemas (e.g., `epicStatusSchema`, `questStatusSchema`, `sliceStatusSchema`) rather than re-declaring enums
- Confirm schema files contain no I/O imports (`fs`, `path` for existence checks) — those belong in the command/utility layer
- `bun run check` (type check + lint) passes with no errors
