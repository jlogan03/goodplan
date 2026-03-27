# Project Health

## Health

### Well-tested areas
- Skill file structure (SKILL.md frontmatter, step numbering, reference paths): verified across 4 skill files during slice-quality-and-health implementation with 28-point checklist
- goodplan CLI: 1040 tests across 90 files, integration + fitness tests. Unit tests cover tree types, schemas, I/O, state machine (including task entity and nested epic paths), RPC (including paths, version-stamp, deferred routing with cross-epic support, migration re-run), context (resolveScope, entityDir with epic paths), commands (including status with embedded overview, slice:list with --all, slice:show with --epic). Integration tests spawn compiled binary and cover migration with nested paths. Fitness functions verify all architectural invariants including ENTITY_EXEMPT_COMMANDS. Type-clean against `tsc --noEmit`.
- goodplan CLI main runner (`src/index.ts`): integration tests cover unknown commands, --help, --version, --json error mode, NO_COLOR, stdin validation, version compatibility checking (4 variants), --quiet suppression of warnings.

### Undertested areas
- Runtime behavior of migrated planning/execution skills (create-plan, create-slices, refine-plan, implement-plan, refine-slices): CLI integration paths verified via grep + 19-step smoke test but not yet exercised on a real project
- Signal tracking algorithm (Step 6d in complete): requires 3+ completed slices to produce data
- Refactor Intelligence Protocol (Step 9 in complete): new detection algorithm, batch table presentation, inline fix application, side quest proposal — all untested on a real codebase
- Maturity/invariants/fitness workflow: Steps 8f/8g/8h in define-architecture, Steps 3b/3c/3d in audit-architecture, maturity evaluation in refine-architecture, reviewer criteria 12/13 — all untested on a real project
- Epic completion mode in /complete: new epic scope type, architecture reconciliation, artifact promotion, archive numbering — all untested on a real epic
- Install script (`scripts/install-skills.sh`): verified manually via `bun run install:skills` + diff; no automated test

### Known fragile areas
- Cross-skill reference paths (e.g., refine-slices references refine-plan's shared-preamble.md): if refine-plan files move, refine-slices breaks silently
- refine-plan's shared-preamble.md borrowed by refine-architecture and refine-slices: plan-specific framing ("Plan Location") doesn't match non-plan consumers
- `~~archived~~` prefix sort order: sorts correctly in terminal but may sort above active items in file explorers (VS Code, Finder) due to locale-aware collation
- epic-conventions.md is consumed by 12+ skills: changes require updating all consumers
- citty + `exactOptionalPropertyTypes`: requires `as unknown as CommandDef` casts in `src/index.ts`. May break on citty upgrade.

<!-- Last updated by: complete for 05-tests-and-migration, 2026-03-27 -->

## Performance Characteristics

- Full test suite (1040 tests, 90 files): ~5.9s total including binary compilation (~1s)
- Integration tests (~50 tests): ~10s (dominated by binary spawning)
- Fitness tests (92 tests): ~3s (mix of source parsing and module imports)

<!-- Last updated by: complete for epics/__active__skills-cli-integration/slices/02-show-status-enrichment, 2026-03-24 -->

## Extensibility

### Easy to extend
- Reviewer infrastructure: adding a new reviewer to any skill requires only a prompt section in the reviewers file + a registry entry
- Iteration loop: new skills plug in via Loop Parameters table — architecture-quality proved this, slice-quality-and-health confirmed it, refine-plan-shared-loop completed the consolidation (all 3 consumers now use the shared pattern)
- Epic scope resolution: the Step 0 preamble pattern ($SCOPE_TYPE, $SLICES_DIR, $EPIC_DIR) provides a consistent template for adding epic awareness to any new skill
- goodplan CLI command registration: adding a new command requires creating a file in `src/commands/<namespace>/`, importing in `main.ts`, and adding to `subCommands`. Global flags are shared via `global-args.ts`.
- goodplan CLI schemas: convention of exporting both schema and `z.infer` type from every schema file makes adding new entities straightforward
- State machine transitions: adding a new event requires a handler file in `src/core/state/transitions/`, an entry in the `handlerRecord` (compile-time exhaustiveness via `satisfies`), and the event type in state-events.ts. Shared helpers (`guardEpicStatus`, `guardSliceStatus`, `guardQuestStatus`, `evaluateRefinement`, `updateOverviewStatus`, `updateSliceOverviewStatus`, `updateQuestOverviewStatus`, `appendActivityLog`, `setSliceStatus`, `setQuestStatus`) make handler implementation formulaic.
- Context bundling: adding a new phase requires a priority table entry in `priorities.ts` and the phase added to `SubmitPhase`. The startContext/collect/budget pipeline handles the rest.
- RPC layer: `begin()`/`complete()`/`submit()` generic dispatch — adding a new phase requires a case in the event mapping switch. BeginPayloadMap typing enforces correct payload shapes per phase at compile time.
- assembleState/commitState: schema registry pattern means new entity types just need a schema + regex pattern entry

### Hard to extend
- Multi-file review pattern: the iteration loop assumes single-file or single-directory plans. Scattered working copies (as in refine-slices) require custom editor prompts and file-matching protocols
- citty colon-namespace routing: requires manual pre-dispatch unknown command detection and `as unknown as CommandDef` casts. Adding commands must keep the pre-dispatch check in sync.

<!-- Last updated by: complete for epics/__active__goodplan-cli/slices/02-project-init, 2026-03-22 -->

## Technical Debt

### Localized items
- shared-preamble.md asymmetry: lives in refine-plan/references/ while iteration-loop.md lives in _shared/references/ — candidate for future consolidation
- `--verbose` flag not wired: defined on all commands via `global-args.ts` but never sets `globalThis.__goodplan_verbose`. Debug logging only works via `GOODPLAN_DEBUG=1` env var.
- `setEpicStatus` helper in `helpers.ts` is defined but unused — handlers use `setEpicJson` directly for more control. Dead code candidate.
- loadState cache detects new/removed files but not content changes to existing JSON files. Bounded by commitState always writing fresh cache.
- Quest submit handlers (`handleCompleteQuestPlan`, `handleCompleteQuestRefinementRound`, `handleCompleteQuestImplementation`) remain co-located in `slice-submit.ts` — splitting to `quest-submit.ts` deferred. File is now 304 lines covering two entity types.
- Overview `completed` timestamp now set for task terminal transitions (dropped/converted) but still not set for other entity types (epic, slice, quest) — partially addressed.
- Bidirectional `import type` between `context/types.ts` and `rpc/types.ts` — works but violates independent-modules principle.
- `decision:update` stdin schema accepts optional `id` that is silently ignored (command uses `--id` flag). Vestige of pre-review design.
- Schema command human-readable mode uses `process.stdout.write` directly, bypassing `output()` — `--quiet` not respected in human mode.
- State command `--inline` flag uses citty string type for forward-compatibility with budget form (`--inline=<bytes>`), but this means `--inline --query X` is misparsed (citty consumes `--query` as inline's value). Flag ordering constraint documented in convention doc.

### Systemic items
- shared-preamble.md divergence risk: refine-plan's copy is plan-framed but borrowed by refine-architecture and refine-slices. As those skills mature, their needs may diverge. Noted as tech debt — revisit when it causes a real problem.

<!-- Last updated by: complete for epics/__active__skills-cli-integration/slices/01-state-command-convention-doc-tracer, 2026-03-23 -->

## Recent Changes

- **05-tests-and-migration** (2026-03-27): Fixed 3 failing integration tests and 2 fixture files for nested paths. Added ENTITY_EXEMPT_COMMANDS fitness test category. Removed STATE_ALREADY_INITIALIZED guard (re-migration support), sliceSequence from buildMigrationState output, typed epicJsonContent with Epic schema, timestamped backup naming, warning field for re-migration. Built+installed updated CLI. Self-migrated .project/ to nested epic paths. Updated 5 architecture docs. 1040 tests, 13 files changed.
- **04-skills-update** (2026-03-27): Updated 8 skill/reference files to support nested epic paths alongside flat paths. Dual-path globs for completion scanning, conditional logic in explore skill, Epic Slice row in scope mapping. Removed 7 .project/learnings.md references from /complete (learnings rollup now via CLI payload only). Added CLAUDE.md path audit step to /migrate skill. No TS code changes.
- **02-rpc-and-commands** (2026-03-27): Wired RPC + commands for nested epic paths. Cleared 22 @ts-expect-error/TODO annotations. Added requireActiveEpic helper, --all on slice:list, --epic on slice:show. Fixed migrate.ts destination path. epicOverviewItemSchema.slices defaults to []. 874 tests, 41 files changed.
- **task-capture** (2026-03-26): New task entity (CREATE_TASK, DROP_TASK, CONVERT_TASK with inlined cross-entity creation), 5 CLI commands (task:create/list/show/drop/convert), /capture skill, project-status task count integration. Extracted shared entity builder helpers. 864+ unit tests (+30 new for tasks).

<!-- Last updated by: complete for 05-tests-and-migration, 2026-03-27 -->
