# Merged Review — Phase 3: Result Type Paths

**Scores:** Generalist 9/10 · Software Architecture 9/10 · TypeScript 10/10
**Overall: 9/10** | Critical: 0, Important: 1, Minor: 3

---

## Important

**1. `mapToBeginPhase` lacks exhaustive `default: never` check** *(Software Architecture)*
`mapToBeginPhase` in `paths.ts` (line 51) handles all current `BeginPhase | SubmitPhase | "complete"` values but has no `default` case with a `never` assertion. A new phase added to either union would silently return `undefined` at runtime rather than producing a compile error. `resolveForBeginPhase` does have the check one call deeper, but the error surface would be confusing. Add the exhaustive default to `mapToBeginPhase` directly.

*Note: The TypeScript reviewer observed that `mapToBeginPhase` is "exhaustive … with a `never` default case in `resolveForBeginPhase`" and scored it 10/10. The Software Architecture reviewer specifically flags the missing check in `mapToBeginPhase` itself (one level above). The SA reviewer's concern is more precise — the fix is at `paths.ts:51`.*

---

## Minor

**1. Inline result mutation instead of construction with `paths` included** *(Generalist)*
In `begin.ts` (line 52), `submit.ts` (line 60), and `complete.ts` (line 54), `paths` is assigned via post-construction mutation (`result.paths = ...`). This works because the objects are freshly constructed, but constructing with `paths` inline (`{ ...buildXxxResult(...), paths: resolvePathReferences(...) }`) would make the "always populated" guarantee visible at the construction site and align with immutable-result conventions. Low risk, all three call sites are consistent.

**2. Redundant `| "complete"` in `resolvePathReferences` signature** *(Software Architecture)*
`SubmitPhase` already includes `"complete"` (types.ts:53), so the explicit `| "complete"` in the `resolvePathReferences` and `mapToBeginPhase` signatures is redundant. TypeScript unions are idempotent so it is harmless, but it adds visual noise. Either remove the redundant member or add a comment explaining the explicit inclusion (e.g., "explicit: `complete()` passes this literal directly").
File: `src/core/rpc/paths.ts:36`

**3. `RollupResult` early return is correct but undocumented** *(Software Architecture)*
`begin()` returns early for rollup operations (line 47-48) before `resolvePathReferences` is called, so `RollupResult` never gets a `paths` field. This is intentional — `RollupResult` has a different shape. A brief inline comment at the early return would make this explicit (e.g., `// Rollup has a different result type — paths field not applicable`).
File: `src/core/rpc/begin.ts:47`

---

## No Action

- **Submit test uses `SubmitPhase` value not CLI command name in description** — The generalist raised a naming clarity point about test descriptions (e.g., "submit result for explore phase" vs mentioning `submit-explore`). The test logic itself is correct and coverage is adequate. Not worth changing.
- **No dedicated submit test for `refine-slices` as `SubmitPhase`** — The generalist noted this but resolved it inline: `paths.test.ts` lines 147-155 cover `"refine-architecture"` and `"refine-slices"` under the submit-phase mapping test, which is sufficient since these values share names with `BeginPhase` values and pass through directly.

---

## Positive Observations

- Exhaustive `never` default in `resolveForBeginPhase` ensures compile-time safety when new phases are added
- `resolveEntityDir` returning `undefined` for non-entity targets cleanly handles the no-paths case without duplicating empty-return logic
- JSDoc on `resolvePathReferences` explicitly documents guaranteed keys per phase — strong contract for skill authors
- Integration tests cover the full CLI binary path (spawn + JSON parse), not just unit-level function calls
- `mapToBeginPhase` correctly handles values that exist in both `BeginPhase` and `SubmitPhase` (e.g., `"explore"`, `"refine-architecture"`)
- `import type` used correctly throughout, consistent with `verbatimModuleSyntax: true`
- No circular dependencies introduced; dependency direction is correct (paths.ts → types.ts, consumed by begin/submit/complete)
- Three-function internal decomposition is minimal — no over-engineering
