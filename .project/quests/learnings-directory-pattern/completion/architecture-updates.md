# Architecture Updates

## Changes Made

1. **rpc-layer-api.md**: Updated mutating operation pattern to include step 4 (write supplementary files after reduce) between reduce and commitState. This reflects the new `writeMarkdownFiles()` call in `complete()`.

2. **rpc-layer-api.md**: Fixed rollup `.md` copy attribution — correctly states `begin('rollup', ...)` owns the copy step, not `complete()`.

3. **state-machine-api.md**: Added `processLearnings` shared helper documentation — describes the shared transition helper used by both `COMPLETE_SLICE` and `COMPLETE_QUEST` handlers with the `availableTargets` parameter.

## Declined

None.

## Flagged as Tech Debt

None from this quest. Pre-existing divergences noted but not addressed:
- `data-layer-api.md` has stale schema registry paths (flat slice structure from pre-entity-restructuring)
- `rpc-layer-api.md` is missing `commitState` options parameter documentation
