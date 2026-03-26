# Context and Learnings

## What We're Building

Update the context bundling layer to use nested slice paths. This is a TypeScript-only slice — the `/complete` skill learnings.md change moves to slice 04 (skills).

## Behavior

1. `resolveScope()` returns `epics/<epic>/slices/<name>` for slices
2. `priorities.ts` string literals updated: `epics/overview.json`, `epics/${target.epic}/slices/${target.name}`, nested directory references
3. `priorities.ts` `completeSources` array: `"slices/overview.json"` → navigate `epics/overview.json` `items[].slices[]` for slice-level context
4. `priorities.ts` `refineSlicesSources` array: `"slices"` directory → `epics/${target.epic}/slices` for slice definitions
5. `entityDir()` in `priorities.ts` returns nested path for slice targets (function body change, not just string literal — relies on `Target.epic` from slice 01)
6. `context/index.ts` (`resolveScope()`) updated explicitly
7. `learnings.ts` scope paths use nested format

## Verification

- [ ] `tsc --noEmit` — passes
- [ ] `bun test tests/unit/context/` — context tests pass with nested paths
- [ ] `bun test tests/integration/` — integration tests pass (confirms context bundling produces correct nested paths at runtime)
- [ ] `grep -r '"slices/' src/core/context/` — no flat slice path references remain
- [ ] `grep 'completeSources' src/core/context/priorities.ts` — verify references `epics/overview.json` not `slices/overview.json`
- [ ] `grep 'refineSlicesSources' src/core/context/priorities.ts` — verify references `epics/${target.epic}/slices` not flat `slices`

Run context unit tests and integration tests. Verify context bundling produces correct nested paths.

Update architecture docs affected by this slice: `flows.md` (context bundling paths).

## Scope Boundaries

**In scope**: `src/core/context/` (priorities.ts, learnings.ts, index.ts), context unit tests
**Out of scope**: `/complete` skill changes (moved to slice 04), other skill files (slice 04), migration (slice 05)
