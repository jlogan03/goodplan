# Codebase Context — Slice 03: Epic Lifecycle

## Fresh Documentation (as of 2026-03-22)

- `.project/epics/__active__goodplan-cli/architecture/_overview.md` — System architecture, 4-layer stack
- `.project/epics/__active__goodplan-cli/architecture/state-machine-api.md` — Pure reducer pattern, discriminated union events
- `.project/epics/__active__goodplan-cli/architecture/data-layer-api.md` — assembleState, loadState, commitState
- `.project/epics/__active__goodplan-cli/architecture/rpc-layer-api.md` — Workflow orchestration, begin/complete/submit
- `.project/epics/__active__goodplan-cli/architecture/commands-api.md` — CLI command structure, entity namespaces
- `.project/epics/__active__goodplan-cli/architecture/conventions.md` — Architectural patterns
- `.project/epics/__active__goodplan-cli/architecture/invariants.md` — 7 system-wide constraints
- `.project/epics/__active__goodplan-cli/architecture/transition-tables.md` — Source of truth for all transitions
- `.project/conventions.md` — Tech stack: TypeScript 6.0, Bun 1.3.x, citty 0.2.x, Zod 4.x, Vitest 4.x, Biome
- `.project/learnings.md` — Accumulated learnings from slices 01-02

## Stale Documentation

None detected. Goal.md (2026-03-22) is newer than all architecture files (2026-03-21).

## Recent Development Activity

All 5 phases of slice 02 (project-init) completed 2026-03-21. Latest commit is the plan for slice 03.

**What exists (built in slices 01-02):**
- Tree types & navigation (`src/core/tree.ts`): DirectoryEntry, JsonEntry, JsonlEntry, MarkdownEntry, ZERO_STATE, resolve, getJson, getJsonl, getDir, hasChild, setEntry
- Data layer (`src/core/data/`): assemble.ts (full walk + schema validation), commit.ts (diff-based, atomic writes, deterministic keys), schema-registry.ts
- State machine (`src/core/state/`): reduce.ts (switch-based, only INIT_PROJECT), transitions/init.ts
- RPC (`src/core/rpc/`): init.ts (one-off rpcInit)
- Commands (`src/commands/`): global/init.ts, global/status.ts, global-args.ts, main.ts
- Utilities (`src/util/`): errors.ts, output.ts, stdin.ts, validate.ts, json.ts (deterministicStringify), debug.ts
- Schemas (`src/schemas/`): entities (project, epic, slice, quest, overview), records (activity-log, decision, learning, architecture-delta), state-events.ts (only INIT_PROJECT), shared.ts
- Tests: `tests/unit/state/reduce.test.ts` — INIT_PROJECT reducer test; pattern: import reduce + ZERO_STATE + nav helpers, call reduce, assert tree

**What doesn't exist yet (slice 03 scope):**
- ~25 StateEvent types for epic/slice/quest lifecycle
- loadState() with cache, concurrent modification detection
- Handler Map pattern in reduce.ts (currently switch)
- Generic RPC begin/complete/submit
- All epic:* commands, submit-* commands
- Context bundling module

## Key Decisions & Constraints

- StateEvent discriminated union — each event carries full typed payload
- ts: string injected by RPC layer (reducer never calls Date.now())
- Handler Map replaces switch for scalability
- Refinement circuit breaker shared across COMPLETE_REFINE_ARCHITECTURE, COMPLETE_REFINE_SLICES, COMPLETE_REFINEMENT_ROUND
- Activity log entries produced by state machine apply functions
- Markdown entries read-only in state tree (LLM writes directly)
- INV-001: State machine is single source of truth for transitions
- INV-003: State machine has zero I/O (pure)
- INV-005: Schema validation at every read/write boundary

## Areas of Churn vs Stability

**Stable:** Tree types, schema shapes, toolchain, activity log format, architectural boundaries
**Active development:** StateEvent union (expanding), reduce.ts (switch→Map), RPC layer (one-off→generic), commands (new surface area)
