# Software Architecture Review: Next Commands Plan

## Issues

**[CRITICAL]** Registry is manually maintained, violating the key constraint

The plan's Phase 1 Task 1.2 says to "Build the `commandMetadata` registry as `Record<string, Record<string, CommandMetadataEntry[]>>`" and then manually populate it with entries for every `(entityType, status)` pair (14 epic statuses, 9 slice statuses, etc.). This directly contradicts the confirmed goal's KEY CONSTRAINT: "Registry must derive from existing state machine data structures (transition tables, command-to-event mappings) rather than being a parallel manually-maintained definition."

The codebase already has all the data needed to derive this automatically:
1. **Transition table rows** exported from every transition file (e.g., `epicPhaseTransitions`, `epicLifecycleTransitions`, `beginPlanTransitions`, `sliceImplementTransitions`, etc.) — each row specifies `{ from, event, to }`.
2. **The `buildBeginEvent()` function** in `src/core/rpc/begin.ts` maps `(BeginPhase, Target) -> StateEvent`, and the command-to-event table in `commands-api.md` maps CLI commands to `StateEvent` types.

The registry should be computed at module load time by:
- Collecting all exported transition rows to build a `(entityType, fromStatus) -> event[]` map
- Inverting the command-to-event mapping (which already exists as the `buildBeginEvent` switch and the `submit()` phase dispatch) to map `event -> command template`
- The result is a derived `(entityType, status) -> command[]` map

Without this derivation, the registry becomes a second source of truth for "which commands are valid in which states" — exactly the drift risk the constraint was designed to prevent. This is also the most architecturally significant aspect of this slice.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** `computeNextCommands` lives in the wrong layer

The plan places `computeNextCommands()` in `src/core/rpc/next-commands.ts` and then has 37 command files call it directly with `import { computeNextCommands } from "../../core/rpc/next-commands.js"`. This violates the current layering: the Commands layer should not be importing and calling RPC functions inline after receiving the RPC result. The existing pattern is clear — command files call one RPC function (`begin()`, `complete()`, or `submit()`), receive a result, and pass it to `output()`.

There are two clean alternatives:
1. **RPC layer returns nextCommands**: The RPC functions (`begin()`, `complete()`, `submit()`) compute and include `nextCommands` in their result types (`BeginResult`, `CompleteResult`, `SubmitResult`). This means the 37 command files need zero changes to their output logic — `output(result, args)` already serializes whatever the RPC layer returns. This is the deep module approach: callers don't need to know about nextCommands at all.
2. **Commands layer wrapper**: A thin `withNextCommands(result, target)` utility in the Commands layer that wraps the output. Less clean but keeps the RPC layer unaware.

Option 1 is strongly preferred — it's consistent with how `paths` was added to results (the RPC layer populates it, callers just serialize), keeps command files thin per the "No Business Logic" contract, and avoids 37 files each reimplementing the same `computeNextCommands(entityType, entityName, result.newStatus, parentEpic)` call.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 integration pattern creates high caller friction and shotgun surgery risk

The plan requires modifying 37 command files to add identical boilerplate: import `computeNextCommands`, extract `entityType`/`entityName`/`parentEpic` from command context, call the function, spread the result into output. This is the textbook definition of shallow module design — every caller must understand the same ceremony.

If the RPC layer returns nextCommands in its result (per the CRITICAL above), Phase 2 becomes trivial: update `BeginResult`/`CompleteResult`/`SubmitResult` types and the three RPC functions. The 37 command files need no changes at all. This eliminates Phase 2 entirely as a separate phase.

Even if the team prefers command-layer integration, the plan should centralize the `(target, result) -> nextCommands` logic in one place (e.g., a shared utility), not scatter it across 37 files.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing type integration with existing result types

The plan introduces `NextCommands` as a standalone type but doesn't update `BeginResult`, `CompleteResult`, or `SubmitResult` in `src/core/rpc/types.ts` to include it. Whether nextCommands is computed at the RPC layer or the Commands layer, the result type contracts need updating. Currently `BeginResult`, `CompleteResult`, and `SubmitResult` are the canonical shapes that `output()` serializes. Adding an ad-hoc `{ ...result, nextCommands }` spread in 37 files creates an untyped output shape that doesn't match any declared interface.

The plan should explicitly update the result types:
```typescript
interface BeginResult {
  // ...existing fields...
  nextCommands?: NextCommands;
}
```

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Fitness function checks templates but doesn't verify derivation

The planned fitness test (`command-metadata-coverage.test.ts`) checks bidirectional coverage: every command has a registry entry, and every registry entry has a command file. This is good but insufficient given the key constraint. It verifies the registry's *completeness* but not its *derivation*. If someone manually adds a registry entry that doesn't correspond to any transition table row, the fitness test passes happily.

The fitness function should additionally verify:
- Every `commandMetadata[entityType][status]` entry is reachable via the transition tables (there exists a transition row with `to === status` for that entity type)
- Every `(from, event) -> to` transition that maps to a user-facing command has a corresponding registry entry

This would catch drift between the transition tables and the registry even if the registry is manually maintained (defense in depth), and would be trivially satisfied if the registry is computed from the transition tables (belt and suspenders).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `SubmitResult.advanced === false` test case is misplaced

Phase 1 Task 2.5 says to "Test `SubmitResult.advanced === false` scenario — same status returned, verify nextCommands suggests the same submit command." This test case conflates two concerns: it's testing `computeNextCommands` behavior (which just takes a status string) with `SubmitResult` semantics (which is an RPC concern). `computeNextCommands` doesn't receive `advanced` — it receives `newStatus`. When `advanced === false`, `newStatus` is the same as before, so the unit test should simply verify that `computeNextCommands("slice", "my-slice", "refining", "my-epic")` returns commands appropriate for the `refining` status (including the submit command). The `advanced` flag is irrelevant at the `computeNextCommands` level.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `computeNextCommands` signature uses `string` for entityType instead of a union type

The plan defines `computeNextCommands(entityType: string, ...)`. The codebase already has `Target.type` as a discriminated union (`"epic" | "slice" | "quest" | "task" | "decision" | "project" | "rollup"`). Using `string` loses type safety — callers could pass typos like `"Epic"` or `"slce"` without a compile error. The function should accept `Target["type"]` or a narrower union of entity types that have nextCommands.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 (E2E validation) tests against `./gp` which may not be built

Phase 3 references `./gp` for all validation commands but doesn't include a build step. The local binary must be compiled via `bun build --compile` before these commands work. The plan should note this prerequisite or include `bun run build` as a task.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** "Other section" logic is hardcoded, not derived

The plan says the "other" section should contain "Curated creation commands from other entity types." This is a small manually-maintained list (`gp epic:create`, `gp quest:create`, `gp task:create`) which is acceptable for now, but the plan should acknowledge this as a pragmatic exception to the derivation constraint and note that it could be derived from the transition tables' `CREATE_*` events if needed later.

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The plan has two critical architectural issues: (1) it proposes a manually-maintained registry despite the confirmed goal explicitly requiring derivation from existing data structures, and (2) it places computation in the wrong layer, creating a 37-file shotgun surgery pattern instead of using the existing deep module pattern where the RPC layer returns enriched results. Both issues would be caught during implementation review but are more expensive to fix after 37 files are already modified. Fixing the layer placement (moving nextCommands computation into the RPC layer's `begin()`/`complete()`/`submit()` functions) would eliminate Phase 2 entirely, simplify the plan, and produce a deeper module design. Fixing the derivation approach would satisfy the key constraint and prevent future drift between the registry and the transition tables.

To reach 9+: (1) derive the registry from the exported transition table rows and the command-to-event mapping, (2) compute nextCommands inside the RPC layer so it's included in result types automatically, (3) update `BeginResult`/`CompleteResult`/`SubmitResult` types to include `nextCommands?`, (4) strengthen the fitness function to verify derivation not just coverage.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
