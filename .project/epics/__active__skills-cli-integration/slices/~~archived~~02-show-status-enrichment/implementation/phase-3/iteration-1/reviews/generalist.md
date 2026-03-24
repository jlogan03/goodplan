# Generalist Review: Phase 3 — Result Type Paths

**Score: 9/10** | Critical: 0, Important: 1, Minor: 2

## Summary

Clean, well-structured implementation that faithfully follows the plan. The `paths.ts` module is well-decomposed (entity dir resolution, submit-to-begin mapping, per-phase resolution), uses exhaustive switches with `never` default, and has comprehensive JSDoc. Integration into `begin`, `submit`, and `complete` is minimal and correct. Test coverage is thorough across unit and integration layers.

## Important

1. **Mutation of result objects before return** — In `begin.ts` (line 52), `submit.ts` (line 60), and `complete.ts` (line 54), `paths` is assigned via direct mutation of the result object (`beginResult.paths = ...`). This works because the result objects are freshly constructed, but it circumvents the `paths?: PathReferences` optional typing intent. The plan says "always include `paths` in results — no conditional spread needed," which supports this pattern. However, constructing the result with `paths` inline (e.g., returning `{ ...buildBeginResult(...), paths: resolvePathReferences(...) }`) would be more idiomatic and make the "always populated" guarantee visible at the construction site. Low risk since all three call sites follow the same pattern, but worth noting for consistency with immutable-result conventions elsewhere in the codebase.

## Minor

1. **Submit test uses `SubmitPhase` directly, not the `submit-*` CLI command names** — The unit test at `tests/unit/rpc/submit.test.ts` line 165 calls `submit(projectDir, "explore", ...)` which tests the `SubmitPhase` → `BeginPhase` mapping correctly. However, the test description says "submit result for explore phase" rather than clarifying it tests the `submit-explore` → `explore` path mapping. The integration test (`result-paths.test.ts` line 41) correctly uses the CLI command `submit-plan` which is the actual consumer-facing interface. Minor naming clarity issue only.

2. **Plan mentions `submit-refine-slices` mapping but no test covers it** — The plan's submit-to-begin mapping table includes `submit-refine-slices` → `refine-slices`, but the unit test for submit phases (`tests/unit/rpc/paths.test.ts` lines 147-155) only tests `submit-refine-architecture` and `submit-refine-slices` via the `SubmitPhase` value `"refine-slices"`. The `paths.test.ts` does cover `refine-slices` for epic targets (line 89-91). However, no submit-specific test exists for `refine-slices` as a `SubmitPhase` value — the test at line 147-155 covers `"refine-architecture"` and `"refine-slices"` under "submit phases map to begin-phase equivalents" which is sufficient since these are `SubmitPhase` values that happen to share names with `BeginPhase` values and pass through directly.

## Positive Observations

- Exhaustive `never` default in `resolveForBeginPhase` ensures compile-time safety when new phases are added
- `resolveEntityDir` returning `undefined` for non-entity targets (project, decision, rollup) cleanly handles the "no paths" case without duplicating empty-return logic
- JSDoc on `resolvePathReferences` explicitly documents guaranteed keys per phase — excellent for skill authors
- Integration tests cover the full CLI binary path (spawn + JSON parse), not just unit-level function calls
- The `mapToBeginPhase` function handles the dual nature of values that exist in both `BeginPhase` and `SubmitPhase` (like `"explore"`, `"refine-architecture"`) correctly by listing them in both the submit-mapping and pass-through sections
