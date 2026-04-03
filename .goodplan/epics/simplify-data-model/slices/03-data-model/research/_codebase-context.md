# Codebase Context: Data Model Changes

Research date: 2026-04-02

## 1. Current Schema Shapes

### Decision (`src/schemas/records/decision.ts`)

```ts
decisionEntrySchema = z.object({
  id: z.string().min(1),
  status: z.enum(["active", "superseded", "revisiting"]),
  domain: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  date: z.string().date(),
  supersededBy: z.string().nullable(),
});
```

No `entityPath` or `reconsiderWhen` fields exist yet.

Command input schema (`src/schemas/commands/decision.ts`): `{ id, domain, title, summary }` -- no provenance fields.

State event (`src/schemas/state-events.ts` line 123): `CREATE_DECISION` carries `{ id, domain, title, summary, ts }` -- new fields must be added here too.

Transition handler (`src/core/state/transitions/decision.ts`): builds `DecisionEntry` directly from event fields (lines 29-37). New fields need explicit mapping.

### Learning (`src/schemas/records/learning.ts`)

```ts
learningEntrySchema = z.object({
  category: z.string().min(1),
  summary: z.string().min(1),
  file: z.string().min(1),
  tags: z.array(z.string()),
  source: z.string().min(1),
  rollup: z.boolean(),
  rollupTo: z.array(z.string()),
});
// No validUntil field exists yet.

learningInputSchema = z.object({
  category: z.enum(["domain", "worked", "didnt-work", "do-differently"]),
  summary: z.string().min(1),
  detail: z.string().min(1),
  tags: z.array(z.string()),
  rollupTo: z.array(z.enum(["epic", "project"])),
});
// No validUntil field exists yet.
```

`processLearnings` in `helpers.ts` (line 566) passes `LearningEventEntry[]` through unchanged -- adding `validUntil` to the schema should flow through without handler changes (the RPC layer maps `LearningInput` to `LearningEventEntry`).

### Overview (`src/schemas/entities/overview.ts`)

Three separate schemas:
- `overviewSchema` = `{ items: OverviewItem[] }` -- used for quests and tasks
- `epicOverviewSchema` = `{ items: EpicOverviewItem[] }` -- epics with embedded slices
- `OverviewItem` = `{ name, status, epic?, title?, created, completed }`
- `EpicOverviewItem` = OverviewItem + `slices: SliceOverviewItem[]`
- `SliceOverviewItem` = OverviewItem minus `epic` and `title`

## 2. Overview Path References

### Source files (14 files)

| File | Paths referenced |
|---|---|
| `src/core/state/transitions/helpers.ts` | `epics/overview.json` (6x), `quests/overview.json` (3x), `tasks/overview.json` (2x) |
| `src/core/state/transitions/init.ts` | All 3 overview paths |
| `src/core/state/transitions/epic-create.ts` | `epics/overview.json` |
| `src/core/state/transitions/quest-create.ts` | `quests/overview.json` |
| `src/core/state/transitions/task-create.ts` | `tasks/overview.json` |
| `src/core/state/transitions/slice-create.ts` | `epics/overview.json` |
| `src/core/state/transitions/slice-plan.ts` | `epics/overview.json` (via helpers) |
| `src/core/rpc/complete.ts` | quests and/or tasks overview |
| `src/core/context/priorities.ts` | overview paths |
| `src/commands/epic/list.ts` | `epics/overview.json` |
| `src/commands/quest/list.ts` | `quests/overview.json` |
| `src/commands/task/list.ts` | `tasks/overview.json` |
| `src/commands/slice/list.ts` | `epics/overview.json` |
| `src/commands/global/status.ts` | multiple overview paths |

### Test files (22 files)

All state machine tests, command tests, data layer tests, fitness tests, and dogfood utils reference overview paths. Full list in grep results.

### Schema registry (`src/core/data/schema-registry.ts`)

Three entries:
```ts
{ pattern: /^epics\/overview\.json$/, schema: epicOverviewSchema },
{ pattern: /^quests\/overview\.json$/, schema: overviewSchema },
{ pattern: /^tasks\/overview\.json$/, schema: overviewSchema },
```

These must be replaced with a single `overview.json` pattern.

## 3. Helper Function Signatures (overview-related)

All in `src/core/state/transitions/helpers.ts`:

```ts
updateOverviewStatus(state, epicName, newStatus): ProjectState         // epics/overview.json
updateSliceOverviewStatus(state, epicName, sliceName, newStatus, ts)   // epics/overview.json
addEpicToOverview(state, epicName, status, ts)                         // epics/overview.json
addSliceToOverview(state, epicName, sliceItem)                         // epics/overview.json
updateQuestOverviewStatus(state, questName, newStatus)                 // quests/overview.json
addQuestToOverview(state, questName, status, ts)                       // quests/overview.json
updateTaskOverviewStatus(state, taskName, newStatus, ts?)              // tasks/overview.json
```

All 7 helpers read from and write to their respective overview paths. In the consolidated model, they all operate on a single `overview.json` but access different sub-keys (`epics`, `quests`, `tasks`).

## 4. Test Fixtures

6 fixture directories, each with 4 overview files (24 total):
- `epics/overview.json`, `quests/overview.json`, `tasks/overview.json`, `slices/overview.json`

Note: `slices/overview.json` is a legacy artifact -- no source code references it. The schema registry has no pattern for it, so `assembleState` silently skips it. It can be removed or left (it's inert).

Fixtures: `epic-activated`, `epic-created`, `fresh-init`, `pagination`, `slice-in-progress`, `slice-refining-max-rounds`.

## 5. Stale Assumption Check

- Goal file created: 2026-04-01 (committed in state snapshot)
- Key source files last modified: 2026-03-28 (decision/learning schemas), 2026-03-30 (fixture updates)
- Architecture files: stable since before goal creation

No drift detected. The goal references current schema shapes and paths accurately.

## 6. Observations for Reviewers

**Phase 1 (Decision Provenance)**: 5 files to change + tests. The `CREATE_DECISION` state event type needs the new fields added. The transition handler builds `DecisionEntry` explicitly field-by-field (not a spread of event), so each new field must be mapped. `entityPath` validation (checking entity existence) belongs in the RPC layer or command, not the pure reducer.

**Phase 2 (Learning Validity)**: 1-2 files to change + tests. Because `processLearnings` passes entries through opaquely and the RPC layer maps input to entry, adding `validUntil` to both schemas should be sufficient. Verify the RPC layer's `LearningInput` -> `LearningEventEntry` mapping preserves the field.

**Phase 3 (Overview Consolidation)**: The plan's "~30 files" estimate is accurate: 14 source + 22 test files = 36 files contain overview path references. The 7 helper functions form a clean abstraction layer -- changing them handles most transition handlers indirectly. Direct path references in commands (`list.ts`, `status.ts`) and `init.ts` need individual updates. The unified schema must accommodate all 3 current shapes (epics with slices, quests, tasks) in a single `{ epics, quests, tasks }` object.

**Phase 4 (Migration)**: The existing `gp migrate` command (`src/commands/global/migrate.ts`) delegates to `rpcMigrate`. The plan references `gp upgrade` instead -- need to confirm whether this is an existing alias or a new command. The migration must handle the `slices/overview.json` legacy artifact in fixtures (either remove or ignore).
