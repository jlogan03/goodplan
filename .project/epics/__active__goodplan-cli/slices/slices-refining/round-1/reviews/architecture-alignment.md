# Architecture Alignment Review

**Score: 8/10** | Critical: 0 | Important: 3 | Minor: 3

## Summary

Slices map well to the four-layer architecture. Each slice targets a specific subsystem or layer boundary, dependencies follow the architecture's unidirectional graph, and scope boundaries are clearly stated. The main issues are status enum mismatches between the transition tables and slice goals, the tracer bullet's scope creep risk from including too many concerns, and a gap in how slice 05 handles the read-command shortcut (Commands -> Data Layer, bypassing RPC).

## Issue Detail

### Important

**sequencing-refining.md / 03-state-machine: Dependency on slice 01 is underspecified.** The sequencing table says slice 03 depends on "01 (schemas)". The architecture places Zod schemas in `src/schemas/`, which is a shared module imported by all layers. The state machine itself depends on zero other subsystems (pure functions, no I/O). The real dependency is that slice 01 defines the Zod schemas and entity types that the state machine consumes. This should say "01 (Zod schemas from src/schemas/)" rather than just "01 (schemas)" to make clear it is the shared schema module, not the data layer, that creates the dependency. An implementer might misread this as the state machine depending on the data layer, which violates INV-003.

**03-state-machine/goal-refining.md: Epic status enums in the goal do not match the transition tables.** The goal lists `EpicStatus` values including `exploring`, `explored`, `architecting`, `architected`, `refining-architecture`, `slicing`, `sliced`, `refining-slices`, `ready`, `executing`. The transition tables use different status names: `defining-architecture`, `architecture-defined`, `refining-architecture`, `defining-slices`, `slices-defined`, `refining-slices`, `slices-refined`, `activated`. The state machine API (`state-machine-api.md`) lists yet another set. The slice goal must use the exact status values from the transition tables since those are the source of truth. Mismatched enums will cause confusion during implementation and test writing.

**04-rpc-core/goal-refining.md: Missing mention of `status()` function.** The RPC Layer API defines five functions: `begin`, `complete`, `submit`, `startContext`, and `status`. The slice goal mentions only four (begin, complete, submit, startContext). While `status` is read-only and simpler, it still lives in the RPC layer and is part of its public API. The implementer needs to know it is in scope for this slice.

### Minor

**01-tracer-bullet/goal-refining.md: Includes `goodplan schema --json` and `--query` via jqjs, but sequencing puts read commands in slice 05.** The tracer bullet includes `goodplan schema --json` and the `--query` flag with jqjs. Slice 05 (commands-read) says it "deepens" schema and "proves jqjs works in compiled binary." This overlap is acceptable for a tracer bullet (the point is end-to-end validation), but the goal should note that schema and --query are minimal/proof-of-concept here and will be deepened in slice 05 to avoid an implementer building the full schema introspection system in slice 01.

**05-commands-read/goal-refining.md: Does not mention the read-command routing shortcut.** The architecture explicitly states that read-only commands (`list`, `show`) bypass the RPC Layer and go directly from Commands to the Data Layer. Slice 05's goal says read commands depend on "02, 04" (data layer and RPC core). If read commands bypass RPC, the dependency on slice 04 is only for the `status` command (which goes through RPC). The scope boundaries should clarify which commands use which routing path so the implementer knows that `list`/`show` go to the data layer directly while `status` goes through RPC.

**06-commands-mutate/goal-refining.md: Slice lifecycle in success criteria uses simplified status names.** The success criteria describe a lifecycle path including `slice:refine-plan` and `start-refinement`/`submit-refinement` flow, but the transition tables show an intermediate `plan-created` status between `planning` and `refining` that requires `COMPLETE_PLAN` (via `submit-plan`) before `BEGIN_REFINEMENT`. The success criteria lifecycle path skips this step. While this is a test-level detail, an implementer writing the lifecycle test from the success criteria alone would miss the submit-plan step.

## What Works Well

- **Clean subsystem isolation.** Slices 02, 03, and 04 each map to exactly one architecture subsystem (Data Layer, State Machine, RPC Layer respectively). No boundary crossing.
- **Dependency graph matches architecture.** Slice 04 depends on 02 and 03; slice 05 depends on 02 and 04; slice 06 depends on 04 and 05. This mirrors the architecture's Commands -> RPC -> State Machine + Data Layer graph.
- **Parallel independence of slice 07.** Skills migration has no code dependency on the CLI subsystems, correctly marked as parallel.
- **Slice 08 as capstone.** Integration tests depend on slice 06 (the full CLI surface), validating the complete system after all subsystems are built. Fitness functions tie back to the architecture's candidate fitness functions.
- **Scope boundaries are explicit.** Every slice has clear in-scope/out-of-scope lists that reference specific architecture subsystem names and API functions.
