# Merged Feedback — Round 1

**Scores:** Software Architecture 8/10, Architecture Alignment 8/10, Tracer Bullet 7/10, Risk/Dependency 8/10

## Critical (1)

### C1. Slice 05 has a false dependency on slice 04 (RPC), blocking parallelism
**Sources:** risk-dependency (critical), architecture-alignment (minor)
**Trust:** Risk/Dependency reviewer (ordering robustness)

The architecture states read-only commands (`list`, `show`) bypass RPC and go directly to the Data Layer. Slice 05 declares dependency on 04 (RPC), but most read commands only need slice 02 (Data Layer). Only `status` routes through RPC.

**Action:** Change slice 05's dependency to "02 (data layer)" as the primary dependency. Add 04 as a dependency only for the `status` command. Clarify in scope boundaries which read commands use which routing path (list/show -> Data Layer direct; status -> RPC). This unblocks slice 05 to start after slice 02, in parallel with slice 04.

## Important (7)

### I1. Tracer bullet scope creep: defer --quiet, schema, and --query to slice 05
**Sources:** software-architecture (#1), architecture-alignment (minor), tracer-bullet (critical), risk-dependency (important)
**All four reviewers flagged this.** Highest-confidence finding.

Slice 01 includes `goodplan schema --json`, `--quiet`, and `--query` via jqjs alongside the core stack validation. With only init/status, schema output is nearly empty, --quiet is indistinguishable from --json, and the full output formatting pipeline is over-engineered for two commands. If a core risk (citty namespaces, Bun compile) fails, the effort on schema/query/quiet is wasted.

**Action:** Narrow slice 01 to: init + status + `--json` + one jqjs smoke test (proves dependency compiles in binary). Defer `--quiet`, `--query` as a general mechanism, and `goodplan schema` to slice 05 where they have meaningful content. Add a note in slice 05 that it "deepens" the jqjs integration from tracer bullet to full query support.

### I2. Schema ownership between slices 02 and 03 is ambiguous
**Sources:** software-architecture (#3), architecture-alignment (important)
**Trust:** Software Architecture reviewer (module boundaries)

Both slices 02 (Data Layer) and 03 (State Machine) need the full Zod schema set from `src/schemas/`, but slice 01 only creates minimal schemas. Neither slice explicitly owns creating all entity/JSONL schemas. The `(schemas)` dependency label is ambiguous — it could mean the data layer itself.

**Action:** Slice 02 explicitly owns defining all Zod schemas in `src/schemas/` (entity types, JSONL records, `ProjectState`). Slice 03 consumes those schemas and adds `StateEvent` discriminated union and `StateError` types. Update slice 03's dependency to "01 (Zod schemas from src/schemas/), 02 (full entity schemas)" to make the chain clear: 01 (minimal) -> 02 (all entities) -> 03 (events/errors).

### I3. Context bundling in slice 04 is underspecified and risks delaying downstream
**Sources:** software-architecture (#2), risk-dependency (important)

Slice 04 (RPC Core) claims context bundling but success criteria only test it superficially (one priority test, one budget test). The architecture defines 9 distinct phase configurations. Context bundling is architecturally a distinct module (`src/core/context/`) with significant logic (budget-based inlining, per-phase priority tables). If it proves harder than expected, it blocks slices 05-08.

**Action:** Add explicit success criteria in slice 04 for each phase's priority ordering (all 9 phases from transition-tables.md). This keeps the RPC layer self-contained and thoroughly tested before consumers arrive. Alternatively, if this makes slice 04 too large, split context bundling into its own mini-slice between 04 and 05.

### I4. Slice 04 missing `status()` function from RPC API
**Sources:** architecture-alignment (important)

The RPC Layer API defines five functions: `begin`, `complete`, `submit`, `startContext`, and `status`. Slice 04's goal mentions only four — `status()` is missing. It is part of the RPC public API and must be in scope.

**Action:** Add `status()` to slice 04's scope and success criteria.

### I5. Epic status enum values are inconsistent across architecture documents
**Sources:** software-architecture (#4), architecture-alignment (important)

Three different naming sets exist: `state-machine-api.md` uses one set, `transition-tables.md` uses another, and slice 03's goals use yet another. Examples: `exploring` vs `defining-architecture`, `executing` vs `activated`, `complete` vs `completed`.

**Action:** Flag for architecture refinement. The transition tables are the source of truth. Reconcile `EpicStatus` enum values in `state-machine-api.md` and all slice goals to match the `To` column values in `transition-tables.md`. This must be resolved before slice 03 implementation begins.

### I6. Slice 03 (state machine) is not independently verifiable end-to-end
**Sources:** tracer-bullet (important)

Slice 03 produces pure functions verified only by unit tests. No running code calls the reducer until slice 04. The verification section uses coverage metrics against transition tables rather than end-to-end execution.

**Action:** Add a minimal smoke test that wires `reduce()` to a fixture and validates a full entity lifecycle without I/O. Explicitly acknowledge in the goal that this slice is a unit-test-only exception to the end-to-end rule. The fitness function for transition table completeness should derive expected counts from the `StateEvent` discriminated union type rather than parsing the markdown table (per software-architecture #6).

### I7. Slice 02 verification doesn't include binary regression test
**Sources:** tracer-bullet (important)

Slice 02 deepens the data layer but the verification section doesn't include running init/status via the compiled binary. This is a regression risk — the tracer bullet commands should still work with the deeper data layer.

**Action:** Add verification step: "Compile binary, run `goodplan init` + `goodplan status --json` — verify they still work with the full data layer."

## Minor (6)

### M1. Slices 02 and 03 can run in parallel — make this explicit
**Sources:** risk-dependency (important), architecture-alignment (context)
They have no dependency on each other. Making parallelism explicit in the sequencing rationale shortens the critical path.

### M2. Stdin infrastructure (slice 06) should be shared, not mutation-specific
**Sources:** software-architecture (#5)
TTY detection, size limits, and empty-stdin handling belong in shared command infrastructure (slice 01 or 05), not coupled to mutation commands. Slice 06 should consume the infrastructure; integration tests for stdin behavior can stay there.

### M3. Slice 07 should run after slice 06 to avoid skill rework
**Sources:** software-architecture (#7)
Skills reference concrete CLI commands. Migrating before the command surface is final guarantees rework. Add a soft dependency note without making it a hard block.

### M4. Slice 06 verification workflow should be broken into numbered assertions
**Sources:** tracer-bullet (important)
The 7-step workflow verification makes failure diagnosis unclear. Break into numbered assertions with expected state after each command.

### M5. Slice 05 fixture setup is underspecified
**Sources:** tracer-bullet (minor)
Fixtures require data that mutation commands (slice 06) would create, but slice 05 comes first. Specify that fixtures are created via init + direct file creation.

### M6. Slice 07 verification modifies real ~/.claude/skills/
**Sources:** tracer-bullet (minor)
`bun run install:skills` against the real skills directory is risky. Use GOODPLAN_SKILLS_DIR override or backup/restore.

## Deduplication Notes

- Tracer bullet scope creep was raised by all four reviewers — merged into I1.
- Status enum inconsistency raised by software-architecture and architecture-alignment — merged into I5.
- Slice 05's RPC dependency raised by risk-dependency (critical) and architecture-alignment (minor) — merged into C1, trust given to risk-dependency per conflict resolution rules.
- Schema ownership raised by software-architecture and architecture-alignment — merged into I2.
- Fitness function timing (risk-dependency: move earlier) and fitness function implementation (software-architecture: derive from types not markdown) are complementary, not contradictory — addressed in I6.

## Contradictions Resolved

- **Slice 03 mergeability:** Tracer-bullet reviewer suggested merging slice 03 into 04. Risk-dependency reviewer identified 02/03 parallelism as valuable. Resolution: keep slices separate (preserves parallelism) but add the smoke test from tracer-bullet review. Parallelism value outweighs the end-to-end purity concern.
- **Slice 06 -> 05 dependency:** Risk-dependency reviewer says it's unnecessary (mutation routes through RPC, not read commands). Software-architecture reviewer implicitly accepts it. Resolution: trust risk-dependency reviewer — note that the dependency exists for shared output formatting infrastructure only, and recommend extracting that to a shared module to remove the hard block if needed.
