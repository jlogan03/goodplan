# Merged Architecture Review — Round 1

## CRITICAL Issues

### C1. `cli-interaction-conventions.md` uses `--name` flag but implementation and `commands-api.md` use entity-specific flags
- **Flagged by:** software-architecture (#12), holistic (#3), api-contract (#1), tui-cli (#1)
- **File:** `cli-interaction-conventions.md`
- **Description:** Convention doc shows `--name` for `show` commands; actual API and implementation use `--slice`/`--epic`/`--quest`. Skills following the convention doc will produce validation errors. Contradicts INV-004 and the entity-namespaced-commands decision.
- **Resolution:** DIRECTLY_ACTIONABLE — Update all `--name` references in `cli-interaction-conventions.md` to use entity-specific flags matching `commands-api.md`.

### C2. `COMPLETE_QUEST` event uses `Learning[]`/`ArchitectureDelta[]` but `COMPLETE_SLICE` uses `LearningInput[]`/`ArchitectureDeltaInput[]`
- **Flagged by:** holistic (#2), api-contract (#2)
- **File:** `state-machine-api.md` (line ~70 vs ~60)
- **Description:** Implementation correctly uses `LearningInput[]`/`ArchitectureDeltaInput[]` for both. The doc has the wrong type names for `COMPLETE_QUEST`, which have different shapes (stored types include `source` and `rollup` fields; input types omit them).
- **Resolution:** DIRECTLY_ACTIONABLE — Change `Learning[]` to `LearningInput[]` and `ArchitectureDelta[]` to `ArchitectureDeltaInput[]` in `COMPLETE_QUEST` event definition in `state-machine-api.md`.

### C3. No concrete migration examples for skill rewrite patterns
- **Flagged by:** agent-skill (#1)
- **File:** `cli-interaction-conventions.md`
- **Description:** Convention doc defines patterns abstractly but never shows a complete before/after for a real skill. Without this, the first 2-3 skill rewrites will reinvent the migration pattern independently.
- **Resolution:** DIRECTLY_ACTIONABLE — Add a "Migration Example" section showing a representative skill section (e.g., create-epic's state write steps) rewritten to CLI commands.

### C4. Interactive orchestrator skills not addressed as a distinct pattern
- **Flagged by:** agent-skill (#2)
- **File:** `cli-interaction-conventions.md`
- **Description:** Several core skills (create-epic, create-plan, complete) are interactive orchestrators needing deep content AND state transitions in a single session. They don't fit the orchestrator or sub-agent categories cleanly. The `start-*` commands are described as sub-agent commands, but interactive orchestrators need them too.
- **Resolution:** DIRECTLY_ACTIONABLE — Add "Interactive Orchestrator" as a third interaction pattern: calls `begin` to initiate, uses `state --query` or `start-*` for context, does interactive user work, then calls `submit-*` to persist.

---

## IMPORTANT Issues

### I1. `goodplan state` command not registered in `commands-api.md`
- **Flagged by:** holistic (#6), api-contract (#3), tui-cli (#3)
- **File:** `commands-api.md`, `cli-changes.md`
- **Description:** The keystone `state` command is fully specified in `cli-changes.md` but absent from the authoritative `commands-api.md` Global Commands section. Also missing from `main.ts` (expected — new work for this epic).
- **Resolution:** DIRECTLY_ACTIONABLE — Add `state` to `commands-api.md` Global Commands with its flags (`--json`, `--query`, `--offset`, `--limit`) and routing (read-only, Data Layer direct).

### I2. `goodplan state` command bypasses the layered routing model
- **Flagged by:** software-architecture (#1)
- **File:** `cli-changes.md`, `conventions.md`
- **Description:** Exposes raw `assembleState()` tree directly. Creates a second read path bypassing Commands-to-Data-Layer/RPC routing. Tree structure mirrors `.project/` directory layout, leaking internal storage organization. `show`/`list`/`status` become redundant ergonomic shortcuts. Skills will gravitate toward `state --query` for power, creating widespread coupling to internal tree shape.
- **Resolution:** USER_INPUT — Decide: (a) expose a logical/entity-oriented view with stable schema, or (b) document that the tree structure IS the stable public API and accept coupling. Either way, clarify in architecture docs.

### I3. No architecture spec for `goodplan state` tree JSON serialization format
- **Flagged by:** software-architecture (#8)
- **File:** `cli-changes.md`, `data-model.md`
- **Description:** Skills writing jq queries need to know exactly how each `StateEntry` variant serializes to JSON. Does `JsonEntry<T>` serialize unwrapped or as `{ type: "json", content: T }`? Does `DirectoryEntry` serialize as a flat object? The jq examples imply unwrapped, but this must be explicit.
- **Resolution:** DIRECTLY_ACTIONABLE — Add "State Tree JSON Format" section to `cli-changes.md` or `data-model.md` specifying serialization of each `StateEntry` variant.

### I4. `begin()` RPC overloaded with non-lifecycle operations (16 BeginPhase values)
- **Flagged by:** software-architecture (#3)
- **File:** `rpc-layer-api.md`
- **Description:** `begin()` handles entity creation, phase initiation, abandonment, verification management, decision CRUD, and learnings rollup. The project's own learnings identified this: "Non-entity RPC operations need dedicated return types." `begin('rollup', ...)`, `begin('add-verification', ...)` etc. are conceptually different from `begin('plan', ...)`.
- **Resolution:** DIRECTLY_ACTIONABLE — Factor cross-cutting operations (`rollup`, `add-verification`, `update-verification`, `create-decision`, `update-decision`) into dedicated RPC functions with specific return types. Reduces `BeginPhase` from 16 to ~10.

### I5. Context bundling module's dependency position is ambiguous
- **Flagged by:** software-architecture (#4)
- **File:** `rpc-layer-api.md`, `conventions.md`, `_overview.md`
- **Description:** Diamond dependency: Commands depends on both RPC and Context; RPC depends on Context. Not listed in maturity table, no API doc. Per-phase priority tables (9 phases x 5-9 items) and budget algorithm are significant hidden complexity.
- **Resolution:** DIRECTLY_ACTIONABLE — Promote Context to first-class subsystem: add to maturity table in `_overview.md`, create `context-api.md`, clarify dependency direction.

### I6. `--archive` flag bypasses state machine filesystem mutation ownership
- **Flagged by:** software-architecture (#6), api-contract (#14)
- **File:** `cli-changes.md`, `invariants.md`
- **Description:** Directory renaming after completion is a filesystem mutation outside the state machine, tensioning INV-001 (state machine owns filesystem structure). Creates testing gap. Also: `--archive` not in `commands-api.md` flags tables, `CompleteResult` lacks `archivedPath?` field.
- **Resolution:** USER_INPUT — Choose: (a) model archive in state machine output (cleaner), or (b) carve out explicitly in invariants doc as post-state-machine operation. Then add to flags tables and result types.

### I7. `BeginResult`/`SubmitResult`/`CompleteResult` spec-implementation divergence on `context?` and `paths?` fields
- **Flagged by:** api-contract (#5, #6)
- **File:** `rpc-layer-api.md`, `src/core/rpc/types.ts`
- **Description:** Spec defines optional `context?: ContextBundle` and `paths?: PathReferences` on result types. Implementation omits them. Convention doc tells skills to use `paths` from mutation responses. This is a contract gap that will break skills.
- **Resolution:** DIRECTLY_ACTIONABLE — Add `context` and `paths` fields to implementation result types, or remove from spec and update convention doc to show alternative path discovery.

### I8. `Target` type missing `rollup` and `project` variants in spec
- **Flagged by:** holistic (#4), api-contract (#7, #10)
- **File:** `rpc-layer-api.md`
- **Description:** Implementation has `{ type: "project" }` and `{ type: "rollup"; from: string; to: string }` beyond the four spec variants. The `rollup` target duplicates `from`/`to` in both Target and BeginPayloadMap. Spec acknowledged this as awkward via learnings.
- **Resolution:** DIRECTLY_ACTIONABLE — Update `rpc-layer-api.md` to document `project` and `rollup` Target variants and `RollupResult` type.

### I9. `CREATE_QUEST` event missing `goal` field in `state-machine-api.md`
- **Flagged by:** holistic (#1), api-contract (#12)
- **File:** `state-machine-api.md`
- **Description:** `CREATE_EPIC` has `goal: string` but `CREATE_QUEST` only has `name` and `ts`. Yet `quest.json` has a `goal` field and `quest:create` accepts a goal via stdin. Implementation correctly includes `goal`.
- **Resolution:** DIRECTLY_ACTIONABLE — Add `goal: string` to `CREATE_QUEST` event in `state-machine-api.md`.

### I10. `show --json` artifacts field not implemented; `goal.md` reference incorrect
- **Flagged by:** holistic (#7), api-contract (#8)
- **File:** `cli-changes.md`, `src/commands/slice/show.ts`
- **Description:** `cli-changes.md` specifies `artifacts` field with boolean flags. Current `show` implementations return only raw entity JSON. Also, `artifacts: { goal: boolean }` references `goal.md` existence, but goals are stored in entity JSON per `data-model.md`.
- **Resolution:** DIRECTLY_ACTIONABLE — Fix `goal.md` reference in `cli-changes.md` (goals are in entity JSON). Note `artifacts` enrichment as planned work for this epic.

### I11. `status --json` enrichment (file arrays) not reflected in `StatusResult` type
- **Flagged by:** api-contract (#9)
- **File:** `cli-changes.md`, `rpc-layer-api.md`
- **Description:** `cli-changes.md` specifies upgrading artifact counts to include file listings (`{ count: 10, files: [...] }`). `StatusResult` type still shows simple number fields.
- **Resolution:** DIRECTLY_ACTIONABLE — Update `StatusResult` type in `rpc-layer-api.md` to match the enriched shape in `cli-changes.md`.

### I12. `--version --json` not implemented; skills depend on JSON output
- **Flagged by:** tui-cli (#2)
- **File:** `src/index.ts`, `cli-changes.md`
- **Description:** Convention doc and `cli-changes.md` specify `goodplan --version --json` returning `{ "version": "1.2.0" }`. Implementation prints plain string `goodplan 0.0.1\n`, ignoring `--json`. Skills parsing JSON will get parse errors.
- **Resolution:** DIRECTLY_ACTIONABLE — Track as implementation work for this epic. Ensure `cli-changes.md` lists this as a required change.

### I13. `goodplan migrate` command referenced but absent from `commands-api.md`
- **Flagged by:** holistic (#5), software-architecture (#11)
- **File:** `cli-changes.md`, `commands-api.md`
- **Description:** `cli-changes.md` describes `goodplan migrate` for schema migrations. No corresponding entry in `commands-api.md`, no `MIGRATE_PROJECT` state event, no transition table entry. Partial specs for unimplemented features create confusion.
- **Resolution:** DIRECTLY_ACTIONABLE — Either add to `commands-api.md` with state machine events, or explicitly defer to a future epic and remove from this epic's architecture docs.

### I14. Missing guidance on `state.md` elimination in interactive skills
- **Flagged by:** agent-skill (#4)
- **File:** `cli-interaction-conventions.md`
- **Description:** Skills use `state.md` in nuanced ways (fast resume hint, auto-detect active slice, concurrent work warnings). Convention doc says `status --json` replaces this but doesn't bridge from current usage patterns to new CLI equivalents.
- **Resolution:** DIRECTLY_ACTIONABLE — Add "Replacing state.md Reads" subsection mapping each current usage pattern to its CLI equivalent.

### I15. Graceful stop patterns have no CLI equivalent
- **Flagged by:** agent-skill (#5)

---

### USER_INPUT Resolved

**U1. Raw tree for `goodplan state`:** Expose the raw `assembleState()` tree. The tree structure IS the public API. Accept that skills' jq queries couple to directory layout — that layout is stable and well-documented. `show`/`list`/`status` remain as ergonomic shortcuts.

**U2. Remove `--archive` entirely:** Directory renaming (`~~archived~~` prefix) is no longer needed. Entity JSON already captures completion status. Remove all `--archive` references from the architecture. This also resolves the INV-001 tension.

**U3. No partial progress on graceful stop:** Graceful stops produce no state record. Skills exit cleanly, user re-runs to resume. CLI's `status --json` shows current entity state. The atomic state machine transitions are the only state updates.
- **File:** `cli-interaction-conventions.md`
- **Description:** Current skills have elaborate graceful stop handling (e.g., "learnings written but architecture review pending"). State machine transitions are atomic. No guidance on how skills record partial progress after migration.
- **Resolution:** USER_INPUT — Decide: (a) add intermediate states to the state machine, (b) let skills track their own progress outside the state machine, or (c) accept that graceful stops produce no state record. Then document in convention doc.

### I16. `submit-*` stdin payload shapes not fully documented in convention doc
- **Flagged by:** agent-skill (#6), holistic (#9)
- **File:** `cli-interaction-conventions.md`
- **Description:** Convention doc shows `submit-plan` with `{"plan":"..."}` content but `submit-plan` is actually a pure state trigger (no content payload). `submit-refinement` requires `{"scores": {...}}`. Misleading examples will cause skill errors.
- **Resolution:** DIRECTLY_ACTIONABLE — Correct all `submit-*` examples in convention doc to show actual stdin shapes, or reference `goodplan schema --command <cmd> --json`.

### I17. Missing error recovery examples for common failures
- **Flagged by:** agent-skill (#8)
- **File:** `cli-interaction-conventions.md`
- **Description:** Exit codes listed but no concrete recovery patterns. E.g., exit 3 `STATE_INVALID_TRANSITION` on re-entry — is it success? `STATE_QUEST_ALREADY_ACTIVE` — offer to abandon? These patterns will be rediscovered per skill.
- **Resolution:** DIRECTLY_ACTIONABLE — Add worked error recovery examples for each exit code, including idempotent re-entry handling.

---

## MINOR Issues

### M1. Missing `status` RPC function documentation
- **Flagged by:** software-architecture (#5)
- **File:** `rpc-layer-api.md`
- **Resolution:** Add "Status Derivation" section specifying conditions that produce each recommendation/warning.

### M2. `BeginPhase`/`SubmitPhase` naming inconsistency with event names
- **Flagged by:** software-architecture (#7)
- **File:** `rpc-layer-api.md`
- **Resolution:** Either align phase strings with event name suffixes or ensure mapping is type-safe with exhaustiveness checking.

### M3. `--offset`/`--limit` flags not in commands-api.md flag tables
- **Flagged by:** api-contract (#4), tui-cli (#5)
- **File:** `commands-api.md`
- **Resolution:** Add as `state`-specific flags when adding the `state` command to `commands-api.md`.

### M4. `activity:list` referenced in convention doc but not implemented
- **Flagged by:** holistic (#8), api-contract (#11), tui-cli (#4), agent-skill (#11)
- **File:** `cli-interaction-conventions.md`, `commands-api.md`
- **Resolution:** Remove from convention doc examples or note as superseded by `state --query`.

### M5. Transition tables don't document that refinement is mandatory
- **Flagged by:** software-architecture (#9)
- **File:** `transition-tables.md`
- **Resolution:** Add note clarifying mandatory refinement (at least one round with passing scores).

### M6. `schema` command parallel registry drift risk
- **Flagged by:** tui-cli (#6)
- **File:** `src/commands/global/schema.ts`
- **Resolution:** Acceptable with existing drift-detection test. Optionally note in conventions.

### M7. JSON errors to stdout rationale not documented
- **Flagged by:** tui-cli (#7)
- **File:** `conventions.md`
- **Resolution:** Add one-line note explaining JSON errors go to stdout for LLM consumption.

### M8. `parseInlineBudget` silently accepts invalid numeric strings
- **Flagged by:** tui-cli (#8)
- **File:** `src/commands/global-args.ts`
- **Resolution:** Return `VALIDATION_INVALID_INPUT` error instead of defaulting to `true`.

### M9. `--archive` flag not yet implemented
- **Flagged by:** tui-cli (#9)
- **File:** `src/commands/slice/complete.ts`
- **Resolution:** Track as implementation work. Convention doc should note as planned.

### M10. `DecisionEntry` lacks `context` field referenced in jq examples
- **Flagged by:** api-contract (#16)
- **File:** `cli-changes.md`, `state-machine-api.md`
- **Resolution:** Remove the jq example or add `context` to `DecisionEntry`.

### M11. Error shape `detail` type inconsistency
- **Flagged by:** api-contract (#13)
- **File:** `state-machine-api.md`, `src/util/errors.ts`
- **Resolution:** Align `StateError.detail` type to include `string | Record<string, unknown> | undefined`.

### M12. RPC Layer fitness functions are thin relative to responsibility
- **Flagged by:** holistic (#10)
- **File:** `rpc-layer-api.md`
- **Resolution:** Consider adding fitness functions for implicit transition detection, completion flow ordering, error propagation.

### M13. `--inline` budget guidance missing for different skill types
- **Flagged by:** agent-skill (#9)
- **File:** `cli-interaction-conventions.md`
- **Resolution:** Add brief sizing table (orchestrator vs sub-agent budgets).

### M14. Version check adds latency to every skill invocation
- **Flagged by:** agent-skill (#10)
- **File:** `cli-interaction-conventions.md`
- **Resolution:** Add guidance on when to skip (e.g., sub-agents in same session as verified orchestrator).

### M15. Convention doc doesn't address shared skill patterns
- **Flagged by:** agent-skill (#12)
- **File:** `cli-interaction-conventions.md`
- **Resolution:** Add "Common Patterns" section with reusable CLI command sequences for scope resolution, decisions loading, etc.

### M16. `submit-refinement` disambiguation not shown in convention doc
- **Flagged by:** tui-cli (#11)
- **File:** `cli-interaction-conventions.md`
- **Resolution:** Add example showing `--slice` vs `--quest` disambiguation for submit commands.

### M17. No guidance on non-`.project/` file access (skill reference files)
- **Flagged by:** agent-skill (#7)
- **File:** `cli-interaction-conventions.md`
- **Resolution:** Add note that reference file loading via Read tool remains unchanged.

### M18. `create-epic` Mode A project initialization path not documented
- **Flagged by:** agent-skill (#3)
- **File:** `commands-api.md`, `cli-interaction-conventions.md`
- **Resolution:** Document `init` usage and who creates `idea.md` content in convention doc.

### M19. stdin handling `isTTY` assumption and `stdin: ""` prominence
- **Flagged by:** tui-cli (#10)
- **File:** `cli-interaction-conventions.md`
- **Resolution:** Make `stdin: ""` guidance more prominent in convention doc.

---

## DIRECTLY_ACTIONABLE (for loop exit)

1. **C1 — Fix `--name` to entity-specific flags in `cli-interaction-conventions.md`**: Replace all `--name` occurrences in show command examples with `--slice`/`--epic`/`--quest` as appropriate.

2. **C2 — Fix `COMPLETE_QUEST` types in `state-machine-api.md`**: Change `Learning[]` to `LearningInput[]` and `ArchitectureDelta[]` to `ArchitectureDeltaInput[]` in the `COMPLETE_QUEST` event definition.

3. **C3 — Add migration example to `cli-interaction-conventions.md`**: Add a "Migration Example" section showing one real skill section (e.g., create-epic state writes) before and after CLI migration.

4. **C4 — Add "Interactive Orchestrator" pattern to `cli-interaction-conventions.md`**: Document the third interaction pattern for skills that do interactive user work between `begin` and `submit-*` calls.

5. **I1 — Add `state` command to `commands-api.md`**: Add under Global Commands with flags `--json`, `--query`, `--offset`, `--limit`. Route: read-only, Data Layer direct.

6. **I3 — Add state tree JSON serialization spec**: Add section to `cli-changes.md` or `data-model.md` specifying how each `StateEntry` variant serializes (unwrapped vs wrapped, DirectoryEntry flattening).

7. **I4 — Factor non-lifecycle operations out of `begin()`**: Extract `rollup`, `add-verification`, `update-verification`, `create-decision`, `update-decision` into dedicated RPC functions with specific return types.

8. **I5 — Promote Context to first-class subsystem**: Add to maturity table in `_overview.md`, create `context-api.md`, clarify dependency direction.

9. **I7 — Align result types between spec and implementation**: Add `context?` and `paths?` fields to implementation result types OR remove from spec and update convention doc.

10. **I8 — Add `project` and `rollup` Target variants to `rpc-layer-api.md`**: Document these existing implementation variants and the `RollupResult` type.

11. **I9 — Add `goal: string` to `CREATE_QUEST`**: Fix in `state-machine-api.md`.

12. **I10 — Fix `goal.md` reference in `cli-changes.md` artifacts**: Goals are in entity JSON, not separate markdown files. Note `artifacts` enrichment as planned work.

13. **I11 — Update `StatusResult` type**: Change simple number fields to enriched shape `{ count: number, files: string[] }` in `rpc-layer-api.md`.

14. **I12 — Track `--version --json` implementation**: Ensure listed as required work in epic scope.

15. **I13 — Resolve `goodplan migrate` status**: Either add fully to `commands-api.md` with state events, or defer and remove from this epic's docs.

16. **I14 — Add state.md replacement guide**: Map each current `state.md` usage pattern to its CLI equivalent in convention doc.

17. **I16 — Fix `submit-*` stdin examples**: Correct `submit-plan` to show no content payload; show correct `submit-refinement` shape with scores.

18. **I17 — Add error recovery examples**: Add worked examples for exit 3 re-entry (idempotent?), quest conflicts, and exit 2 retry guidance.

---

## RESEARCH_NEEDED

1. **I7 — `paths`/`context` on result types**: Check current implementation of `BeginResult`, `SubmitResult`, `CompleteResult` in `src/core/rpc/types.ts` to determine whether adding these fields is feasible or if the architecture should change approach. Strategy: Read the implementation types and the convention doc references to `paths` to determine the correct resolution direction.

2. **I4 — begin() factoring scope**: Review all 16 `BeginPhase` values and their callers to determine which operations should become dedicated RPC functions. Strategy: Grep for `begin(` calls across commands and skills to understand usage patterns.

3. **M1 — Status derivation logic**: Check `src/core/rpc/status.ts` (or equivalent) to understand how recommendations and warnings are currently derived, so the spec can be written from implementation. Strategy: Read the status implementation files.

---

## Contradictions Resolved

1. **`--name` flag severity: CRITICAL (api-contract) vs IMPORTANT (tui-cli) vs MINOR (software-architecture)**
   - Resolved as **CRITICAL**. Trusted api-contract reviewer — this is a contract issue where skills will generate broken commands. Software-architecture rated it MINOR as a "documentation fix" but the impact on skill consumers makes it critical.

2. **`CREATE_QUEST` missing `goal`: IMPORTANT (holistic) vs MINOR (api-contract)**
   - Resolved as **IMPORTANT**. Holistic flagged first with full context. Api-contract rated MINOR because the implementation is correct, but the doc gap could mislead new implementers. Trusted holistic as this is a cross-file consistency issue.

3. **`activity:list` status: Flagged differently by 4 reviewers**
   - All agree: remove from convention doc or note as superseded. No contradiction, just different severity ratings. Kept as MINOR since `state --query` replacement is already documented.

4. **`begin()` overloading: software-architecture says factor out; api-contract says document rationale**
   - Trusted **software-architecture** on boundary/depth issues per conflict resolution rules. The project's own learnings support factoring out.

5. **`create-epic` Mode A init path: agent-skill rates IMPORTANT; no other reviewer flags**
   - Kept as **MINOR** (M18). This is a convention doc completeness issue, not a contract or architectural problem. Downgraded since `goodplan init` exists and the gap is documentation-only.

---

## Unresolved (USER_INPUT required)

### U1. Should `goodplan state` expose raw tree or logical view?
- **Question:** Should `state --json` expose the raw `assembleState()` tree (mirroring filesystem structure), or a logical entity-oriented view with a stable schema?
- **Context:** Raw tree is more powerful but couples every skill's jq queries to internal directory structure. Logical view preserves layered abstraction but requires designing and maintaining a separate schema.
- **Flagged by:** software-architecture (#1)
- **Impact:** Determines whether `show`/`list`/`status` remain the primary API or become redundant ergonomic shortcuts.

### U2. How should `--archive` relate to the state machine?
- **Question:** Should archive directory renaming be (a) modeled as part of state machine output (new state includes renamed path, `commitState` handles rename), or (b) explicitly carved out as a post-state-machine operation in invariants doc?
- **Context:** Option (a) preserves INV-001 cleanly. Option (b) is more pragmatic but requires documenting why it's safe outside the reducer.
- **Flagged by:** software-architecture (#6), api-contract (#14)

### U3. How should graceful stop be handled after CLI migration?
- **Question:** When a skill is interrupted mid-workflow (e.g., learnings written but architecture review pending), how should partial progress be recorded? Options: (a) intermediate states in the state machine, (b) skills track own progress outside state machine, (c) no partial progress record.
- **Context:** Current skills have 4-6 distinct graceful stop cases per skill with specific state writes. The atomic state machine has no intermediate states for this.
- **Flagged by:** agent-skill (#5)

---

### USER_INPUT Resolved

**U1. Raw tree for `goodplan state`:** Expose the raw `assembleState()` tree. The tree structure IS the public API. Accept that skills' jq queries couple to directory layout — that layout is stable and well-documented. `show`/`list`/`status` remain as ergonomic shortcuts.

**U2. Remove `--archive` entirely:** Directory renaming (`~~archived~~` prefix) is no longer needed. Entity JSON already captures completion status. Remove all `--archive` references from the architecture. This also resolves the INV-001 tension.

**U3. No partial progress on graceful stop:** Graceful stops produce no state record. Skills exit cleanly, user re-runs to resume. CLI's `status --json` shows current entity state. The atomic state machine transitions are the only state updates.
