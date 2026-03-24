# Software Architecture Review: skills-cli-integration

## Issues

### 1. `goodplan state` command bypasses the layered routing model
**Severity:** IMPORTANT (2x weight: module depth)
**File:** `cli-changes.md` (section 1), `conventions.md`

The `goodplan state --json --query` command exposes the raw `assembleState()` tree directly to callers. This is architecturally significant because:

- It creates a second read path that bypasses the Commands-to-Data-Layer routing for `list`/`show` and the Commands-to-RPC routing for `status`. Callers can now reach internal state representation details (tree structure, key naming like `"slice.json"`, JSONL array semantics) without going through any abstraction boundary.
- The tree structure *is* the `.project/` directory layout. This means the internal storage organization leaks fully to consumers. If directory structure changes (e.g., nesting slices under epics), every `state --query` expression in every skill breaks.
- The `show`/`list`/`status` commands become redundant ergonomic shortcuts rather than the primary API. Skills will gravitate toward `state --query` because it's more powerful, creating widespread coupling to the internal tree shape.

**Resolution:** Consider whether `state` should expose a *logical* view (entity-oriented, stable schema) rather than the raw filesystem-mirroring tree. Alternatively, document explicitly that the tree structure is a stable public API and accept the coupling. Either way, the current architecture docs present `state` as a convenience while its real effect is to flatten the entire layered abstraction for read operations.

### 2. `show --json` artifacts field uses boolean flags for file existence, duplicating state machine concerns
**Severity:** MINOR
**File:** `cli-changes.md` (section 2)

The `artifacts` field in `show --json` (e.g., `goal: boolean`, `plan: boolean`, `planRefined: boolean`) duplicates the file-existence checks that the state machine's guards already perform. The names (`exploreComplete`, `planRefined`) encode workflow semantics rather than raw file existence, which means the `show` command (routed directly to the Data Layer) now embeds workflow knowledge. This is a mild separation-of-concerns leak -- the Data Layer read path is interpreting workflow-meaningful file patterns.

**Resolution:** Acceptable as an ergonomic shortcut. Document that the artifact field names are derived from the same directory-based guards the state machine uses (conventions.md cross-cutting concerns section), and ensure any new guard in transition-tables.md triggers a corresponding artifact field update. This coupling is manageable.

### 3. RPC `begin()` function overloaded with non-lifecycle operations
**Severity:** IMPORTANT (2x weight: caller friction)
**File:** `rpc-layer-api.md`

The `begin()` RPC function handles entity creation, phase initiation, abandonment, verification management, decision CRUD, and learnings rollup -- 16 different `BeginPhase` values. This makes the interface wide rather than deep. Callers must know which `BeginPhase` string to pass for each operation, and the return type (`BeginResult`) must accommodate all of them. The learnings from completed slices explicitly call this out: "Non-entity RPC operations need dedicated return types" (learnings.md, source: 06-decisions-learnings).

The existing learning was captured but the architecture hasn't been updated to address it. `begin('rollup', ...)`, `begin('add-verification', ...)`, and `begin('create-decision', ...)` are conceptually different from `begin('plan', ...)` or `begin('explore', ...)`.

**Resolution:** Factor cross-cutting operations (`rollup`, `add-verification`, `update-verification`, `create-decision`, `update-decision`) into dedicated RPC functions with specific return types. The `begin()` function should only handle lifecycle phase transitions. This would reduce `BeginPhase` from 16 to ~10 values and allow each return type to be precise.

### 4. Context bundling module's dependency position is ambiguous
**Severity:** IMPORTANT (2x weight: module depth)
**File:** `rpc-layer-api.md`, `conventions.md`, `_overview.md`

The context bundling module (`src/core/context/`) is described as a "peer module alongside the RPC layer" that is consumed by both the RPC layer (for `--inline` on mutations) and the Commands layer (for `start-*` commands). This creates a diamond dependency: Commands depends on both RPC and Context; RPC also depends on Context. The architecture overview doesn't list Context as a subsystem in the maturity table, and it lacks its own API document.

The `startContext()` function signature in `rpc-layer-api.md` takes a `ProjectState` parameter for testability, which is good. But the per-phase priority tables (9 phases x 5-9 items each) and the budget-based inlining algorithm represent significant hidden complexity that isn't documented in its own API spec.

**Resolution:** Promote Context to a first-class subsystem in the architecture: add it to the maturity table in `_overview.md`, create a `context-api.md` documenting the public interface (`startContext`, `collectContent`, budget algorithm), and clarify the dependency direction (Context depends on tree types + Data Layer reads; consumed by RPC and Commands). This also enables independent testing of context bundling.

### 5. Missing `status` RPC function documentation
**Severity:** MINOR
**File:** `rpc-layer-api.md`

The `status()` function is declared in the interface section but lacks implementation details. The `StatusResult` type is defined, but there is no specification of how `recommendations` and `warnings` are derived. These are the primary signals skills use for workflow orientation. Without a spec, the recommendation logic will be ad-hoc and inconsistent.

**Resolution:** Add a "Status Derivation" section to `rpc-layer-api.md` specifying the conditions that produce each recommendation and warning string. Even a table mapping (condition -> recommendation text) would suffice.

### 6. `--archive` flag on complete commands adds filesystem mutation outside the state machine
**Severity:** IMPORTANT (2x weight: test boundary alignment)
**File:** `cli-changes.md` (section 4), `invariants.md` (INV-001)

The `--archive` flag renames directories after successful completion. Per the architecture, the state machine is the single authority on filesystem structure (decision: `state-machine-owns-filesystem-structure`), and every state mutation goes through the state machine (INV-001). Directory renaming is a filesystem mutation that bypasses the state machine -- the rename happens "after the state transition succeeds" at the RPC or Commands layer.

This creates a testing gap: the state machine's transition tests won't cover the rename behavior, and integration tests must verify both the state transition and the filesystem rename as a coupled pair. It also means the state tree (which mirrors the filesystem) will become stale after the rename unless `assembleState()` is re-invoked.

**Resolution:** Either (a) model archive renaming as part of the state machine output (the new state includes the renamed path, and `commitState` handles the rename), which preserves INV-001, or (b) explicitly carve out `--archive` as a post-state-machine filesystem operation in the invariants doc, documenting why it's safe to do outside the reducer. Option (a) is cleaner architecturally; option (b) is more pragmatic.

### 7. `SubmitPhase` and `BeginPhase` types create a confusing mapping layer
**Severity:** MINOR
**File:** `rpc-layer-api.md`

The `BeginPhase` (16 values) and `SubmitPhase` (9 values) types create an intermediate vocabulary between commands and state events. The mapping from command to phase to event is documented in a large comment block but not enforced by types. A caller must consult the comment to know that `begin('refine-plan', {type: 'slice'})` maps to `BEGIN_REFINEMENT` (not `BEGIN_REFINE_PLAN`). The existing codebase handles this correctly (8 slices completed), but the naming inconsistency between phase strings and event names creates unnecessary cognitive load.

**Resolution:** Consider aligning phase strings with event name suffixes where possible (e.g., `'refinement'` -> `BEGIN_REFINEMENT` vs `'refine-plan'` -> `BEGIN_REFINEMENT`). Alternatively, accept the indirection and ensure the mapping is type-safe (a `Record<BeginPhase, ...>` with exhaustiveness checking). The learnings doc notes that `satisfies Record<K, V>` before Map conversion provides compile-time exhaustiveness -- apply this pattern to the phase-to-event mapping.

### 8. No architecture spec for the `goodplan state` command's tree serialization format
**Severity:** IMPORTANT (2x weight: caller friction)
**File:** `cli-changes.md`, `data-model.md`

The `goodplan state --json` command exposes `assembleState()` output, but the architecture doesn't specify the JSON serialization format of the state tree. `data-model.md` describes the TypeScript types (`DirectoryEntry`, `JsonEntry`, `JsonlEntry`, `MarkdownEntry`) with their `type` discriminator fields, but `cli-changes.md` shows jq queries like `.slices["my-slice"]["slice.json"].status` that imply the discriminated union wrappers are stripped (no `.content` accessor). The query `.architecture | keys` implies `DirectoryEntry.contents` is flattened into the parent object.

Skills writing jq queries against the state tree need an exact, stable contract for how the tree is serialized to JSON. Without this, skills will write queries against whatever the implementation happens to produce, and any serialization change breaks them.

**Resolution:** Add a "State Tree JSON Format" section to `cli-changes.md` or `data-model.md` specifying exactly how each `StateEntry` variant serializes. Does `JsonEntry<T>` serialize as `T` directly (unwrapped) or as `{ type: "json", content: T }`? Does `DirectoryEntry` serialize as a flat object of its `contents`? The jq examples imply unwrapped, but this must be explicit.

### 9. Transition tables don't specify `plan-created -> BEGIN_IMPLEMENTATION` (skip refinement path)
**Severity:** MINOR
**File:** `transition-tables.md`

For slices, the path from `plan-created` to `implementing` requires going through refinement (`plan-created -> refining -> plan-refined -> implementing`). There's a skip path for the first refinement round (`plan-created + COMPLETE_REFINEMENT_ROUND -> plan-refined` if scores pass), but no direct path from `plan-created -> implementing` without any refinement round. This is consistent and intentional (every plan gets at least one review), but the quest table has the same constraint. Worth noting that the architecture enforces mandatory plan review -- if a skill wants to skip refinement entirely, it must submit a refinement round with passing scores. This should be documented as an explicit design choice.

**Resolution:** Add a note to `transition-tables.md` clarifying that refinement is mandatory (at least one round with passing scores) and that the "skip refinement" path is achieved by submitting passing scores on the first round. This helps skill authors understand the intended workflow.

### 10. `goodplan state --query` with `--offset`/`--limit` adds pagination to a non-paginated architecture
**Severity:** MINOR
**File:** `cli-changes.md` (section 1)

The `--offset`/`--limit` flags on `state` add array pagination. This is the only command in the architecture with pagination semantics. The behavior is specified clearly (applies after `--query`, ignored if result isn't an array), but it introduces a concept (server-side pagination) that doesn't exist elsewhere in the architecture. Activity log entries could grow large, so this is pragmatically useful, but it's a one-off pattern.

**Resolution:** Acceptable as-is. The implementation is simple (array slice after jq evaluation) and self-contained. No action needed unless other commands start needing pagination, at which point extract a shared pattern.

### 11. Semantic versioning spec lacks migration detail for the immediate epic
**Severity:** MINOR
**File:** `cli-changes.md` (section 5)

The versioning spec is thorough for steady-state operation but introduces concepts (migration registry, `goodplan migrate` command) that aren't connected to any state event, transition table entry, or RPC function in the rest of the architecture. The `INIT_PROJECT` event writes version to `project.json`, but there's no `MIGRATE_PROJECT` event. The migration path is described abstractly ("migration functions registered in a migration registry") without specifying where this lives architecturally.

**Resolution:** Either (a) add `MIGRATE_PROJECT` to the state machine events and transition tables, or (b) explicitly defer the migration machinery to a future epic and remove it from the architecture docs for this epic. Partial specs for unimplemented features create confusion about what's in scope.

### 12. `show` command flag inconsistency: `--name` vs `--epic`/`--slice`/`--quest`
**Severity:** MINOR
**File:** `cli-interaction-conventions.md`, `commands-api.md`

In `cli-interaction-conventions.md`, the show command uses `--name`: `goodplan slice:show --name my-slice --json`. In `commands-api.md`, the show command uses `--slice`: `goodplan slice:show --slice <name>`. The main architecture (`commands-api.md`) uses entity-specific flags (`--slice`, `--epic`, `--quest`) consistently, which aligns with INV-004 (stateless commands with explicit target flags). The convention doc uses `--name`, which is ambiguous across entity types.

**Resolution:** Update `cli-interaction-conventions.md` to use `--slice`/`--epic`/`--quest` consistently, matching `commands-api.md`. This is a documentation fix.

### 13. No explicit error handling for `goodplan state` with invalid `--query` expressions
**Severity:** MINOR
**File:** `cli-changes.md`

The `commands-api.md` specifies that invalid jq expressions produce exit 2 with `VALIDATION_INVALID_QUERY` for the `--query` flag. The `state` command inherits this behavior, but `cli-changes.md` doesn't mention it. Given that skills will be writing jq queries programmatically, error handling on malformed queries is important.

**Resolution:** Add a note to `cli-changes.md` section 1 confirming that `state --query` follows the same error behavior as `--query` on other commands (exit 2, `VALIDATION_INVALID_QUERY`). Or simply reference the conventions doc.

## Score: 8/10

This is a well-designed architecture that has been battle-tested across 8 completed implementation slices. The 4-layer stack with a pure state machine reducer is a strong foundation, and the architecture documents are unusually thorough -- covering transition tables, state key dependencies, fitness functions, and invariants. The module boundaries are clear and the dependency directions are strictly unidirectional.

The primary concern is the `goodplan state` command, which effectively exposes the entire internal state representation as a public API (issues 1 and 8). This flattens the read-side abstraction that the layered architecture provides. The command is powerful and pragmatically useful, but it trades module depth for convenience. Combined with the `begin()` overloading (issue 3) and the context module's ambiguous architectural position (issue 4), the read-side and orchestration-side of the architecture are shallower than the write-side.

To reach 9+:
- Specify the state tree JSON serialization format explicitly (issue 8) -- this is the highest-impact fix because it affects every skill's jq queries
- Factor cross-cutting operations out of `begin()` into dedicated RPC functions (issue 3) -- the project's own learnings identified this
- Resolve the `--archive` invariant tension (issue 6) -- either model it in the state machine or carve it out explicitly
- Promote context bundling to a documented subsystem (issue 4)

## Summary
- Critical: 0
- Important: 4
- Minor: 6
