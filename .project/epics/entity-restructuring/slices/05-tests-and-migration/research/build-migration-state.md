# Research: `buildMigrationState` Structural Changes

## What Was Investigated

Whether `buildMigrationState` in `src/core/rpc/migrate.ts` constructs slices under a top-level `slices/` directory or nests them under `epics/<epic>/slices/`.

## Key Findings

**`buildMigrationState` already nests slices under epics.** No restructuring needed.

The function builds the state tree as follows (lines 279-335):

1. Creates `epicsContents` map with per-epic directories (line 270)
2. Iterates epics a second time to build slice directories (line 281)
3. Creates `slicesDirContents` per epic (line 292)
4. Attaches slices to the epic directory: `epicDir.contents.slices = { type: "directory", contents: slicesDirContents }` (line 334)

The final root tree (lines 390-406) has no top-level `slices` key:
```
contents: {
  "project.json", "activity-log.jsonl", "decisions.jsonl", "learnings.jsonl",
  epics: { ... },    // slices nested inside each epic
  quests: { ... },
  architecture, research, brainstorm, prototypes
}
```

There is **no** top-level `slices/` directory in the output. The slice overview is embedded inside each epic's overview item (lines 235-248, 300-308), not in a separate `slices/overview.json`.

## Recommendation

**No changes needed to `buildMigrationState`.** It already produces the correct nested `epics/<epic>/slices/<slice>` structure. Only test assertions that reference a top-level `slices/` path pattern would need updating -- but `buildMigrationState` itself is correct.
