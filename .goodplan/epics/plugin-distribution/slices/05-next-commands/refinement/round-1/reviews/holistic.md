# Holistic Review — Slice 05: Next Commands

## Issues

**[CRITICAL]** Registry is manually maintained, violating the key constraint

The confirmed goal and plan overview both state: "Registry must derive from existing state machine data structures (transition tables, command-to-event mappings) rather than being a parallel manually-maintained definition." However, the Phase 1 task description asks the implementer to *hand-author* `commandMetadata` as a static `Record<string, Record<string, CommandMetadataEntry[]>>` covering "epic (14 statuses), slice (9 statuses), quest (9 statuses), task (3 statuses), decision (3 statuses)."

This is the exact anti-pattern the key constraint warns against. The codebase already has:
1. **Transition tables** in `src/core/state/transitions/` — define `(from, event) -> to` for every entity type.
2. **Command-to-event mapping** in `src/core/rpc/begin.ts` (`buildBeginEvent`) and `commands-api.md` — the `StateEvent` type union in `src/schemas/state-events.ts` enumerates all events.
3. **The `buildBeginEvent` switch** in `begin.ts` maps `(phase, target) -> StateEvent`, which is the inverse of the command-to-event table.

The registry should be *computed* from these existing data structures — e.g., by inverting the transition tables to produce `(entityType, status) -> available events -> corresponding commands`. This way, when a new status or transition is added to the state machine, the registry automatically picks it up. A hand-maintained parallel structure of 38+ status entries will inevitably drift from the transition tables.

The plan should restructure Phase 1 to:
1. Export the transition tables in a data-queryable format (they already exist as code in `src/core/state/transitions/*.ts`)
2. Build a `commandMetadata` registry that *derives* entries by inverting `(from, event) -> to` into `(entityType, to) -> [commands that could have produced this status]` using the command-to-event mapping from `commands-api.md` (which is already codified in `buildBeginEvent`)
3. Annotate each derived entry with display metadata (`description`, `template`, `userFacing`) that cannot be derived automatically

Resolution: CODEBASE_EXPLORATION
Research: Examine `src/core/state/transitions/*.ts` to determine if transition tables are exported as data structures (arrays/objects) or only as functions. Also check `src/core/rpc/begin.ts` `buildBeginEvent` to see if the phase-to-event mapping can be inverted programmatically. This determines whether derivation is feasible at build time or requires a code generation step.

---

**[IMPORTANT]** `computeNextCommands` takes string params instead of leveraging existing typed structures

The function signature `computeNextCommands(entityType: string, entityName: string, newStatus: string, parentEpic?: string)` uses raw strings. The codebase already has `Target` (from `src/core/rpc/types.ts`) which is a discriminated union carrying entity type, name, and parent epic. The result types (`BeginResult`, `CompleteResult`, `SubmitResult`) already carry `newStatus`. Using these existing types would be safer and more consistent with the architecture.

Suggested signature: `computeNextCommands(target: Target, newStatus: string): NextCommands` — this leverages the already-typed `Target` discriminated union, prevents passing inconsistent `entityType`/`parentEpic` combinations, and makes the call sites cleaner (they already have `target` in scope).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 integration pattern spreads `nextCommands` onto result without type safety

The plan says: `output({ ...result, nextCommands }, args)`. This creates an untyped ad-hoc object. The `BeginResult`, `CompleteResult`, and `SubmitResult` types in `src/core/rpc/types.ts` would need to be extended with an optional `nextCommands` field, or a wrapper type should be defined. Without this, `--query` users querying `.nextCommands` would work at runtime but have no type backing, and the `deterministicStringify` in `output()` would serialize it fine but there is no schema enforcement.

The plan should add a task to either:
(a) Add `nextCommands?: NextCommands` to the result types in `src/core/rpc/types.ts`, or
(b) Define a `WithNextCommands<T>` wrapper type in `next-commands.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 Expected Behavior "Before" section says "N/A" — violates verification-first requirement

Every phase needs concrete before/after checks. Phase 3 is a validation-only phase, but it still represents a discrete unit of work. The "Before" could verify that the Phase 2 integration is complete (e.g., `grep -c "computeNextCommands" src/commands/ | ...` returns 37 matches) — this confirms the starting state for the validation phase.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No documentation update tasks

The plan modifies the RPC layer's public API (adding `nextCommands` to every mutation response) and adds a new module (`src/core/rpc/next-commands.ts`). The following docs should be updated:
- `architecture/rpc-layer-api.md` — document `computeNextCommands()` and the `commandMetadata` registry
- `architecture/commands-api.md` — document that `--json` output now includes `nextCommands` for mutations
- `architecture/_overview.md` — mention nextCommands in the RPC Layer description if appropriate

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 Expected Behavior "After" check uses `node -e` with `require()` — Bun project uses ESM

The check `node -e "const m = require('./src/core/rpc/next-commands.ts')"` would fail because this is an ESM + TypeScript project using Bun. It should be `bun -e "import { computeNextCommands } from './src/core/rpc/next-commands.ts'; console.log(typeof computeNextCommands)"`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 test case 5 references `SubmitResult.advanced === false` but is in unit test for `computeNextCommands`

Test case 5 says "Test `SubmitResult.advanced === false` scenario — same status returned, verify nextCommands suggests the same submit command." This is testing an integration scenario (what happens when submit doesn't advance) but is listed in the unit test for the pure `computeNextCommands` function. Since `computeNextCommands` takes `(entityType, entityName, newStatus)`, the `advanced === false` scenario is just "pass the same status you had before" — which is already covered by testing any non-terminal status. The test case description is misleading about what it actually exercises. Consider rephrasing to clarify this is about "status unchanged after submit — still shows the submit command in nextCommands."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** The plan counts "14 statuses" for epic but the transition tables show fewer destination states

Counting unique "To" states in the epic transition tables: created, exploring, explored, defining-architecture, architecture-defined, refining-architecture, architecture-refined, defining-slices, slices-defined, refining-slices, slices-refined, activated, completed, abandoned. That is indeed 14. However, the verification management transitions (`ADD_VERIFICATION`, `UPDATE_VERIFICATION`) stay in the *same* status (shown as "(same)") — these are status-preserving events, not new statuses. The plan should clarify that the registry does not need entries for "the status after ADD_VERIFICATION" because the status doesn't change — it just needs to map the pre-activation statuses to include `add-verification` as an available command where applicable.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has a fundamental conflict with its own key constraint. The registry is described as a hand-maintained static data structure when the confirmed goal explicitly requires derivation from existing state machine data structures. This is not a minor issue — it directly contradicts the purpose of the constraint, which is to prevent two parallel definitions of state machine behavior from drifting apart. The rest of the plan is well-structured with clear phasing, good verification patterns, and comprehensive coverage of the 37 mutation files. To reach 9+: restructure Phase 1 to derive the registry from transition tables + command-to-event mapping (CRITICAL), add type safety for the result extension (IMPORTANT), add documentation tasks (IMPORTANT), and fix the minor verification/test issues.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
