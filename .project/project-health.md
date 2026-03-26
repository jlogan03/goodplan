# Project Health

## Health

### Well-tested areas
- Skill file structure (SKILL.md frontmatter, step numbering, reference paths): verified across 4 skill files during slice-quality-and-health implementation with 28-point checklist
- goodplan CLI: 941 tests (unit + integration + fitness). Unit tests cover tree types, schemas, I/O, state machine, RPC (including paths, version-stamp), context, commands (including state, show artifacts, status file arrays). Integration tests spawn compiled binary covering init, epic/slice/quest lifecycle, error transitions, circuit breaker, runner modes, show artifacts, result paths, version compatibility. 9 fitness functions verify all architectural invariants. Type-clean against `tsc --noEmit`.
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

<!-- Last updated by: complete for 05-planning-execution-skills, 2026-03-24 -->

## Performance Characteristics

- Full test suite (941 tests, 84 files): ~6.5s total including binary compilation (~1s)
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
- Overview `completed` timestamp never set by status-changing handlers — permanently `null` for all entities.
- Bidirectional `import type` between `context/types.ts` and `rpc/types.ts` — works but violates independent-modules principle.
- `decision:update` stdin schema accepts optional `id` that is silently ignored (command uses `--id` flag). Vestige of pre-review design.
- Schema command human-readable mode uses `process.stdout.write` directly, bypassing `output()` — `--quiet` not respected in human mode.
- State command `--inline` flag uses citty string type for forward-compatibility with budget form (`--inline=<bytes>`), but this means `--inline --query X` is misparsed (citty consumes `--query` as inline's value). Flag ordering constraint documented in convention doc.

### Systemic items
- shared-preamble.md divergence risk: refine-plan's copy is plan-framed but borrowed by refine-architecture and refine-slices. As those skills mature, their needs may diverge. Noted as tech debt — revisit when it causes a real problem.

<!-- Last updated by: complete for epics/__active__skills-cli-integration/slices/01-state-command-convention-doc-tracer, 2026-03-23 -->

## Recent Changes

- **skill-workflow-bugs** (2026-03-26): Fixed 3 skill bugs (redundant goal.md sections, unnecessary confirmation prompts, /complete learnings gate). Created shared Iteration Summary template in output-templates.md. Converted all 7 skills' structured output points from prose to rigid templates. No TS code changes.
- **05-planning-execution-skills** (2026-03-24): Migrated 6 skills (create-plan, create-slices, refine-plan, implement-plan, refine-slices, migrate) to goodplan CLI. Fixed complete skill's mkdir to use quest:create. All direct state.md/activity-log access eliminated. 941 tests (no new — skill-only changes).
- **02-show-status-enrichment** (2026-03-24): `artifacts` boolean flags on `show --json`, `status --json` file arrays (`{ count, files }`), `paths?` on RPC result types, semver compatibility checking, version bump to 1.0.0, deleted dead `files.ts`. 941 tests (+91 new).

<!-- Last updated by: complete for skill-workflow-bugs, 2026-03-26 -->
