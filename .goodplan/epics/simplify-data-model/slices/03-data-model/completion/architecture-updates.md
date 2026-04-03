# Architecture Updates: 03-data-model

## Comparison against epic target (`data-model-changes.md`)

### 1. Decision Provenance Field
**Target**: Add optional `entityPath` and `reconsiderWhen` to decision schema.
**Built**: Both fields added exactly as specified. Validation in RPC layer (`begin.ts`) using `getJson()` against loaded state. Acceptable entity paths match spec (epics, slices, quests, tasks; decisions and project excluded).
**Divergence**: None.

### 2. Learning Validity Conditions
**Target**: Add optional `validUntil` (string array) to both `learningEntrySchema` and `learningInputSchema`.
**Built**: Both schemas updated. RPC completion handler maps the field through. Pass-through in `processLearnings` confirmed.
**Divergence**: None.

### 3. Overview Consolidation
**Target**: Single root `overview.json` with `{ epics, quests, tasks }` structure, replacing 3 separate files.
**Built**: Unified schema created. Schema registry updated to single pattern. All 7 helper functions updated. All command files, context, and RPC references updated. Test fixtures consolidated (including removal of legacy `slices/overview.json`).
**Divergence**: None. The target specified Option A (root `overview.json`) and that is what was built.

### 4. Migration
**Target**: Crash-safe migration via `gp migrate` with idempotent re-entry.
**Built**: Migration in `src/core/rpc/migrate.ts` with detection, merge, `commitState` recomputation, and old file cleanup. Integration tests cover fresh migration, idempotent re-run, and interrupted state.
**Divergence**: The architecture doc referenced `/gp:upgrade` skill for migration; implementation correctly uses `gp migrate` CLI command (the rename is a separate slice). This was caught in refinement round 1 as a critical issue.

## Conclusion

No architecture updates needed. All three data model changes and the migration align with the epic's target architecture.
