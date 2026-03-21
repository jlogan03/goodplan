# Software Architecture Review: Slice Goals & Sequencing

**Reviewer perspective:** Software Architecture (module boundaries, dependency direction, coupling/cohesion, layering, data flow, testability, module depth)
**Score: 8/10**

## Critical Issues (0)

None.

## Important Issues (3)

### 1. goal-refining.md [01-tracer-bullet]: Premature cross-cutting concerns increase coupling risk

The tracer bullet includes `--query` via jqjs, output formatting (`--json`, `--quiet`, `--query`), and `goodplan schema` alongside the core stack validation (Bun compile + citty + Zod + data layer). This bundles the output formatting subsystem and the schema introspection system into what should be a minimal stack-proving exercise.

The `schema` command in particular depends on the full command tree being defined — in slice 01, the command tree is trivial (init + status), making the schema output nearly empty and not representative. Testing jqjs in the compiled binary is valid for a tracer bullet, but coupling it with a full `--query` flag across all commands means the output formatting module established here must be revisited in slice 05 when read commands add real complexity.

**Recommendation:** Narrow the tracer bullet's output surface to `--json` only (proves Bun serialization works) plus a single jqjs smoke test (proves the dependency compiles). Defer `--quiet`, `--query` as a general mechanism, and `schema` to slice 05 where they have meaningful content to operate on. This keeps the tracer bullet focused on its stated purpose: proving the tech stack.

### 2. goal-refining.md [04-rpc-core]: Context bundling module has unclear slice ownership

The architecture defines context bundling as an internal module within the RPC layer at `src/core/context/`, with its own distinct concerns (budget-based inlining, per-phase priority tables). Slice 04 (RPC Core) claims context bundling in scope, but the success criteria only test `startContext` at a surface level — one priority ordering test, one budget test.

Slice 05 (Commands: Read) then needs context bundling to work for `start-*` commands, and slice 06 (Commands: Mutate) depends on it for `submit-*` commands. The context module's per-phase priority tables (9 distinct phase configurations from transition-tables.md) represent significant logic that is underspecified in slice 04's success criteria.

**Recommendation:** Either (a) add explicit success criteria in slice 04 for each phase's priority ordering (all 9 phases from transition-tables.md context rows), or (b) split context bundling into its own concern within slice 05, since that's where it's first exercised end-to-end via `start-*` commands. Option (a) is better architecturally — it keeps the RPC layer self-contained and tested before consumers arrive.

### 3. goal-refining.md [02-data-layer] + [03-state-machine]: Shared schema dependency creates implicit coupling

Both slices 02 and 03 depend on Zod schemas from `src/schemas/`, but slice 01 only creates the minimal schemas needed for `project.json` and `StatusResult`. Slices 02 and 03 both need the full schema set (all entity types, all event types, all JSONL record types) but neither slice explicitly owns schema creation.

The sequencing table shows slice 03 depends on "01 (schemas)" — but slice 01 only defines minimal schemas. If slice 02 runs first and defines its schemas, slice 03 may need different shapes for the same types (e.g., `SliceEntity` needs `status` for the state machine but `refinement` for the data layer). If slice 03 runs first, the data layer schemas don't exist yet.

**Recommendation:** Add explicit language to slice 02's scope: "Defines all Zod schemas in `src/schemas/` for all entity types, JSONL records, and the unified `ProjectState` type." Slice 03 then consumes these schemas and adds the `StateEvent` discriminated union and `StateError` types. This establishes a clear schema ownership chain: 01 (project.json, StatusResult) -> 02 (all entity schemas, ProjectState) -> 03 (event/error types).

## Minor Issues (4)

### 4. goal-refining.md [01-tracer-bullet]: Status enum mismatch between architecture and slice goals

The architecture's `EpicStatus` type uses names like `'executing'` and `'complete'`, but the transition tables use `'activated'` and `'completed'`. The tracer bullet slice will establish the initial enum values — if it follows the wrong naming, all subsequent slices inherit the mismatch. This is an architecture inconsistency rather than a slice goal issue, but the tracer bullet is the first place it materializes.

**Recommendation:** Flag for architecture refinement: reconcile `EpicStatus` enum values in `state-machine-api.md` with the `To` column values in `transition-tables.md`. The transition tables should be the source of truth.

### 5. goal-refining.md [06-commands-mutate]: Stdin handling is an architectural cross-cut, not a command concern

Slice 06 specifies TTY detection, empty stdin handling, and 1 MB max as in-scope. These are input boundary concerns that architecturally belong at the Commands layer's shared input handling (per `commands-api.md` Input Handling section). Implementing them in slice 06 risks coupling stdin logic to mutation commands specifically rather than the shared `readStdin()` + `validateInput()` infrastructure.

**Recommendation:** Move stdin infrastructure (TTY detection, size limit, empty-as-`{}`) to slice 01 or slice 05, where the shared `readStdin()` function would naturally live. Slice 06 then consumes the infrastructure. The success criteria for stdin behavior can stay in slice 06 as integration tests.

### 6. goal-refining.md [08-integration-test]: Fitness function for transition table completeness creates brittle coupling

The fitness function "count of transition test cases matches count of transition rows in transition-tables.md" requires parsing a markdown document at test time. This couples the test suite to the format of an architecture document — if the markdown table format changes, the fitness function breaks.

**Recommendation:** Instead of parsing the markdown, derive the expected count from the `StateEvent` discriminated union type and the status enum types. TypeScript's type system can enumerate all `(status, event)` pairs at compile time. This makes the fitness function self-verifying against the code rather than an external document.

### 7. sequencing-refining.md: Slice 07 (skills-migrate) listed as parallel but has an implicit ordering constraint

The sequencing table says slice 07 has no dependencies and "can run anytime." However, the skills being migrated will contain concrete CLI commands (per the skill-cli-integration decision). If skills are migrated before the command surface is finalized (slices 05-06), the migrated skills will contain outdated or placeholder commands. Running slice 07 after slice 06 avoids a guaranteed rework cycle.

**Recommendation:** Add a soft dependency note: "07 should run after 06 to avoid migrating skills with outdated CLI commands." Keep it as technically parallel for scheduling flexibility, but document the practical ordering.

## Summary

The slice decomposition maps well to the four-layer architecture. Each slice targets a clear subsystem boundary, dependencies flow in the correct direction, and the sequencing respects the architectural layering (data layer and state machine before RPC, RPC before commands). The tracer bullet approach is sound for validating compilation and runtime risks early.

The main structural concerns are: (1) the tracer bullet includes more cross-cutting output infrastructure than needed for stack validation, (2) context bundling ownership between RPC Core and Commands slices needs clarification, and (3) the shared schema dependency between the data layer and state machine slices needs explicit ownership assignment. These are all addressable through scope adjustments without changing the fundamental sequencing.
