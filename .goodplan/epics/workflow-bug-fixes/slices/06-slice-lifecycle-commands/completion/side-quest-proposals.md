# Side Quest Proposals: Slice 06

## 1. Fix code-refine-start ContextBundle phase parameter

**Rationale**: `code-refine-start.ts` passes `"P10"` to `buildContextBundle` but should likely pass `"P11"` (code refinement phase). If the bundler tailors context by phase, this produces wrong context.
**Scope**: Small
**Priority**: High

## 2. Remove v1 fallback shim after slice 12

**Rationale**: `slice:list` and `slice:show` contain v1 fallback logic (reading `overview.json`/`slice.json`). After slice 12 completes v1-to-v2 migration, this dead code should be removed.
**Scope**: Small
**Priority**: Low (blocked by slice 12)

## 3. Migrate learningInputSchema to v2 event-native schema

**Rationale**: `slice:land` reuses v1 `learningInputSchema`. A v2 schema aligned with event-sourced patterns would be cleaner and enable richer learning metadata.
**Scope**: Medium
**Priority**: Medium (planned for slice 07)

## 4. Unify chunk command boilerplate

**Rationale**: The 8 chunk commands (`chunk-start` through `chunk-decide`) share significant structural similarity. A `createChunkCommand` factory could reduce ~50% of per-file boilerplate while keeping each command independently testable.
**Scope**: Medium
**Priority**: Low (cosmetic, current pattern works)

## 5. Add negative invariant tests for all 24 core rules

**Rationale**: Phase 5 added 5 negative invariant tests, but the invariant engine has 24 core rules. Expanding coverage ensures no event-name drift regressions.
**Scope**: Medium
**Priority**: Medium
