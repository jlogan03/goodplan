# Phase 1: Migration Schemas & Protocol Types

Define Zod migration round schemas (derived from entity schemas) and Q&A protocol envelope types. These are the foundation for the migrate command and provide auto-generated `responseSchema` via `z.toJSONSchema()`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/schemas/migration/` → "No such file or directory"
- [ ] `grep -r "toJSONSchema" src/schemas/` → no matches (no schema-to-JSON-Schema usage yet)

**After implementation** (should pass / show presence):
- [ ] `ls src/schemas/migration/` → lists `rounds.ts`, `protocol.ts` (or similar)
- [ ] `bun test tests/unit/schemas/migration/` → all tests pass
- [ ] A test exercises `z.toJSONSchema(inventoryResponseSchema)` and confirms the output includes `properties`, `required`, and any `.describe()` annotations

### Tasks

- [ ] Create `src/schemas/migration/rounds.ts` with migration round schemas:
  - **Inventory response schema** — composed from entity schemas:
    - `project`: `{ name: string, goal: string }` (picks from project concept + idea.md content)
    - `epics`: array of `{ name: string, goal: string, status: EpicStatus, sourcePath: string }`
    - `quests`: array of `{ name: string, goal: string, status: QuestStatus, sourcePath: string }`
  - **Per-epic detail schema** — per epic:
    - `slices`: array of `{ name: string, goal: string, status: SliceStatus, sourcePath: string }`
    - `sliceSequence`: `string[]` (ordering)
    - `hasArchitecture`: `boolean`
    - `activatedDate`: `string | null` (ISO 8601)
  - **Per-slice detail schema** — per slice (if needed beyond what's in epic details):
    - Status is already captured in the per-epic round; this may collapse into the epic detail round
  - **Confirmation schema**:
    - `{ approved: boolean, reAnswerIds: string[], notes: string }`
  - Add `.describe()` annotations on all fields — these carry through to `z.toJSONSchema()` output and serve as hints for the LLM
- [ ] Create `src/schemas/migration/protocol.ts` with Q&A envelope types:
  - `MigrationQuestion`: `{ id: string, question: string, hint: string, responseSchema: object }`
  - `MigrationAnswer`: `{ id: string, data: unknown }` (validated against the question's schema)
  - `MigrationRound`: `{ round: number, questions: MigrationQuestion[] }`
  - `MigrationResponse`: `{ round: number, answers: MigrationAnswer[] }`
  - `MigrationState`: `{ status: 'in-progress' | 'confirming' | 'complete', round: number, inventory: InventoryResponse | null, epicDetails: Record<string, EpicDetailResponse>, correctionRound: number }` — the shape of `.migration-in-progress.json`
  - `MigrationResult`: `{ status: 'questions', round: MigrationRound } | { status: 'error', errors: MigrationError[] } | { status: 'complete', summary: MigrationSummary }`
- [ ] Add `sourcePath` validation helper: given a `sourcePath` and a base directory, confirm the path exists. Used by the migrate command to validate answers immediately.
- [ ] Write unit tests in `tests/unit/schemas/migration/`:
  - Inventory schema validates correct input, rejects missing required fields
  - `z.toJSONSchema()` produces valid JSON Schema with `.describe()` annotations
  - `sourcePath` validator catches non-existent paths
  - Confirmation schema handles approved=true (no reAnswerIds needed) and approved=false (reAnswerIds required)

### Verification

- Confirm schemas import from entity schemas (e.g., `epicStatusSchema`, `questStatusSchema`, `sliceStatusSchema`) rather than re-declaring enums
- `bun run check` (type check + lint) passes with no errors
