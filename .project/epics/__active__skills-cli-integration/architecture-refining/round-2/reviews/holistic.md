# Holistic Architecture Review (Round 2)

## Prior Issues — Resolution Status

All 5 IMPORTANT issues from round 1 have been addressed:

1. **`CREATE_QUEST` missing `goal` field** — Fixed. state-machine-api.md line 63 now shows `{ type: 'CREATE_QUEST'; name: string; goal: string; ts: string }`.
2. **`COMPLETE_QUEST` type inconsistency** — Fixed. Both `COMPLETE_SLICE` and `COMPLETE_QUEST` now consistently use `LearningInput[]` and `ArchitectureDeltaInput[]`. These types are defined in state-machine-api.md (lines 106-121).
3. **`show` command flag inconsistency** — Fixed. cli-interaction-conventions.md now uses entity-specific flags (`--slice`, `--epic`) matching commands-api.md.
4. **`rollup` target type missing from Target union** — Fixed. rpc-layer-api.md Target now includes `{ type: 'rollup'; from: string; to: string }`, and `rollupLearnings()` is factored out as a dedicated function.
5. **`goodplan migrate` absent from commands-api.md** — Fixed. cli-changes.md now explicitly defers migration to a future epic with clear rationale.

Round 1 MINOR issues also resolved: `state` command added to commands-api.md, `goal` artifact field clarified in cli-changes.md, `activity:list` noted as not-yet-implemented, `submit-plan` examples corrected, RPC fitness function gap acknowledged.

## New Issues

### MINOR: Context module `startContext` signature inconsistency between context-api.md and rpc-layer-api.md

- **Severity:** MINOR
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/context-api.md`

context-api.md defines `startContext(state, phase, target, options?)` (positional args). rpc-layer-api.md line 16 lists the same function with the same signature, which is consistent. However, the RPC interface section (line 16) lists `startContext` as an RPC Layer function, while context-api.md establishes it as a peer module at `src/core/context/`. The Commands layer calls it directly for `start-*` commands (context-api.md line 18), and the RPC layer also uses it for `--inline` on mutations. This is correctly documented in both places, but rpc-layer-api.md listing it under "Workflow Operations" (lines 9-16) could mislead implementers into placing it in the RPC module rather than the context module. Consider adding a brief note at the RPC interface that `startContext` is re-exported from the context peer module.

### MINOR: `Target` union includes `project` and `rollup` variants but no commands map to `{ type: 'project' }`

- **Severity:** MINOR
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/rpc-layer-api.md`

The `Target` type includes `{ type: 'project' }` (line 63), but the command-to-RPC routing table and the BeginPhase/SubmitPhase mapping comments don't show any command that produces a project-typed target. `INIT_PROJECT` goes through `init` (a global command), not through `begin()`. If `{ type: 'project' }` exists for future use or for `status()`, a brief comment explaining its purpose would prevent implementers from questioning whether it's dead code.

### MINOR: `plan-created` to `COMPLETE_REFINEMENT_ROUND` skip path not in BeginPhase

- **Severity:** MINOR
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/transition-tables.md`

transition-tables.md shows a skip path where `plan-created` + `COMPLETE_REFINEMENT_ROUND` can directly transition to `plan-refined` (line 74). This allows skipping the `BEGIN_REFINEMENT` step when the first refinement round immediately passes. However, the `submit-refinement` command maps to `COMPLETE_REFINEMENT_ROUND`, and the sub-agent flow (flows.md) shows `begin` happening before `submit`. The skip path is valid for the state machine but the convention doc doesn't document this alternative flow for skills. Low risk since the happy path always goes through `begin` first.

### MINOR: Per-phase context priorities duplicated between rpc-layer-api.md and context-api.md

- **Severity:** MINOR
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/context-api.md`

The per-phase content priority table appears in both context-api.md (lines 59-69) and rpc-layer-api.md (lines 335-347). These are identical, which is good. But dual-maintenance risks drift. context-api.md should be the source of truth; rpc-layer-api.md could reference it rather than duplicating the table.

## Evaluation

### 1. Goal Alignment (10/10)

The architecture directly enables all ~15 workflow skills to use the CLI binary for structured state operations. The `state --json --query` command is the keystone, `start-*`/`submit-*` bridge orchestrator/sub-agent patterns, and `status --json` replaces `state.md`. Every change serves the confirmed goal.

### 2. Clarity (9/10)

Documents are well-structured with clear purpose sections, TypeScript interfaces, concrete examples, and explicit non-goals. The new context-api.md is concise and well-scoped. The convention doc (cli-interaction-conventions.md) is particularly strong — the migration example and error recovery patterns are actionable. Minor clarity gap: the `Target.project` variant's purpose.

### 3. Completeness (9/10)

All entity lifecycles, state transitions, commands, and interaction patterns are specified. The factored `begin()` with 5 dedicated cross-cutting functions is cleaner than the original overloaded design. The `state` command fills the remaining data access gap. Convention doc covers orchestrator, sub-agent, interactive orchestrator, and read-only skill roles.

### 4. Consistency Across Files (9/10)

Strong improvement from round 1. Event types, flag names, and type names are now consistent across state-machine-api.md, rpc-layer-api.md, commands-api.md, and the convention doc. The `LearningInput`/`ArchitectureDeltaInput` types are properly defined and used uniformly. The duplicated priority tables are the main remaining consistency concern.

### 5. Decision Alignment (10/10)

All 17 active decisions are respected:
- `cli-as-workflow-engine`: CLI owns deterministic mechanics, skills invoke concrete commands
- `skill-cli-integration`: concrete commands in skill prompts, `schema` as escape hatch
- `entity-namespaced-commands`: entity:verb pattern throughout
- `orchestrator-subagent-split`: `start-*`/`submit-*` for sub-agents
- `state-machine-owns-filesystem-structure`: `commitState()` materializes state machine output
- `promote-all-subsystems-to-developing`: reflected in overview maturity levels

### 6. Simplicity (9/10)

The `begin()`/`complete()`/`submit()` trio with `startContext()` as a peer is a clean, minimal RPC surface. Factoring cross-cutting operations (rollup, verification, decision CRUD) into dedicated functions follows the learning about dedicated return types. The `state --json --query` approach elegantly avoids proliferating specialized query commands.

### 7. Invariant Compliance (10/10)

All 7 invariants (INV-001 through INV-007) are directly addressed:
- INV-001: all mutations through state machine, explicitly documented routing
- INV-002: deterministic key ordering in conventions and data layer
- INV-003: state machine purity with externalized timestamps
- INV-004: stateless commands with target flags
- INV-005: schema validation on read and write
- INV-006: schema command from same definitions
- INV-007: structured errors with exit codes

### 8. Fitness Function Awareness (8/10)

Each subsystem has candidate fitness functions. The context module adds 2 (budget enforcement, no state machine imports). The RPC layer remains thin with 1 fitness function — the promote-to-developing decision notes it should get more before Maturing. This is tracked but not yet addressed.

### 9. Gap Detection (9/10)

No significant gaps. The `--archive` removal, `migrate` deferral, and `state.md` elimination are all clean. The `activity:list` is correctly noted as not-yet-implemented with `state --query` as the replacement. The graceful stop handling section in the convention doc addresses a previously implicit concern.

### 10. Cross-File Consistency (9/10)

Command-to-event mappings in commands-api.md match the state machine event types exactly. The RPC routing table aligns with commands. Type definitions in state-machine-api.md match usage in rpc-layer-api.md. The only remaining duplication is the context priority tables across two files.

## Score: 9/10

The architecture has improved substantially from round 1. All 5 IMPORTANT issues are resolved. The new context-api.md is well-positioned as a peer module. The factored `begin()` and dedicated cross-cutting functions follow accumulated learnings. The convention doc is comprehensive and actionable. The 4 remaining MINOR issues are documentation nits — duplicated tables, a missing comment on `Target.project`, and a re-export clarification. None affect correctness or implementability.

## Summary
- Critical: 0
- Important: 0
- Minor: 4
