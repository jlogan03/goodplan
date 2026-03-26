# Phase 3: Migrate Command — Follow-up Rounds & Confirmation

Implement follow-up rounds driven by Round 1 inventory answers. Per-epic detail questions (slices, architecture, activation), per-slice details (if separate from epic round), and the confirmation round with re-answer correction protocol.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] After submitting Round 1 answers, the CLI returns Round 2 questions but submitting Round 2 answers results in an error or incomplete behavior

**After implementation** (should pass / show presence):
- [ ] After Round 1 (inventory): CLI emits Round 2 with one question per epic asking for slice details, architecture presence, activation date, and slice sequencing
- [ ] After Round 2 (epic details): CLI emits confirmation round with full state summary
- [ ] Confirmation with `approved: true` → CLI returns `{ "status": "complete", "summary": {...} }` (Phase 4 will handle actual state construction)
- [ ] Confirmation with `approved: false, reAnswerIds: ["epic-details-initial"]` → CLI re-emits only the specified question(s)
- [ ] After 3 correction rounds without approval → CLI throws `GoodplanError` with code `VALIDATION_MIGRATION_CORRECTION_LIMIT` including summary of what was answered so far
- [ ] All `sourcePath` fields in follow-up answers are validated immediately

### Tasks

- [ ] Implement Round 2 question generation — driven by Round 1's epic inventory:
  - For each epic from inventory, emit a question with id `epic-details-<name>`:
    - "Provide details for epic '<name>'" with hint about checking the epic's directory for slices/, architecture/, and activation markers
    - `responseSchema` from `z.toJSONSchema(epicDetailSchema)` — slices array (name, goal, status, sourcePath), sliceSequence, hasArchitecture, activatedDate
  - Validate all `sourcePath` fields in slice answers against `.project/<epicSourcePath>/slices/` or equivalent old path
- [ ] Implement confirmation round generation:
  - After all detail rounds are answered, generate a state summary:
    - Project name and goal
    - Per-epic: name, status, slice count, slice names with statuses
    - Per-quest: name, status
    - Total entity counts
  - Emit as a confirmation question with `responseSchema` from the confirmation schema
  - Include the summary as the `hint` field so the LLM can review it
- [ ] Implement re-answer correction protocol:
  - On `approved: false` with `reAnswerIds`: re-emit only the specified questions from previous rounds
  - Track correction round count in `.migration-in-progress.json`
  - After 3 correction rounds: throw `GoodplanError` with code `VALIDATION_MIGRATION_CORRECTION_LIMIT`
  - On re-answer submission: replace the old answer for that question ID, return to confirmation
- [ ] Update `.migration-in-progress.json` schema to track (aligned with the canonical `MigrationState` shape from Phase 1):
  - Current round number and type (inventory, epic-details, confirmation, correction)
  - All accumulated answers keyed by question ID (the single canonical shape — no per-entity-type grouping)
  - Correction round counter
- [ ] Handle edge cases:
  - Epic with zero slices (valid — early-stage epic)
  - Quest with no artifacts beyond goal.md (valid — `created` status)
  - Empty epic inventory (project with no epics — just quests)

### Verification

- Full round-trip test: inventory → epic details → confirmation → approved
- Correction flow: inventory → epic details → confirmation → reject with reAnswerIds → re-answer → confirmation → approved
- Verify `.migration-in-progress.json` state is correct after each round
- `bun run check` passes
