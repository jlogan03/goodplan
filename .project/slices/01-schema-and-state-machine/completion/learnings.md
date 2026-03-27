# Learnings — 01-schema-and-state-machine

## Optional-parameter overloads enable incremental type migration

When changing function signatures across many call sites (getSlice, setSliceJson, setSliceStatus), TypeScript function overloads with optional parameters let the types phase compile while handler call sites still use the old arity. This is safer than @ts-expect-error (which silently swallows ALL errors on the annotated line) and cleaner than changing everything in one commit. Use this pattern for any future multi-phase signature migration.

## Schema registry is load-bearing for reads, not just writes

Updating the schema registry pattern for `epics/overview.json` → `epicOverviewSchema` had to happen atomically with any code writing `slices` arrays. Without it, `getJson` silently strips unrecognized fields via Zod parsing. Future plans modifying schema registry entries should treat the registry change as the FIRST step, not a cleanup step.

## @ts-expect-error with scope tags works for cross-slice boundaries

The 22 `@ts-expect-error` annotations tagged with `// slice 02` clearly delineate what's deferred and why. The TypeScript compiler still catches real errors on other lines. This is a practical pattern for epics where one slice changes types and another slice updates consumers — each slice compiles on its own terms.
