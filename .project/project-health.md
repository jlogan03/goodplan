# Project Health

## Health

### Well-tested areas
- Skill file structure (SKILL.md frontmatter, step numbering, reference paths): verified across 4 skill files during slice-quality-and-health implementation with 28-point checklist
- goodplan CLI tracer bullet + project-init: 256 unit tests covering tree types (42), entity schemas (109), I/O layer (28), state machine (6), command framework, init, and status commands. Binary compilation verified with end-to-end verification. Type-clean against `tsc --noEmit`.

### Undertested areas
- Runtime behavior of new skills (refine-slices, updated define-slices three-lens evaluation): not yet exercised on a real project
- Signal tracking algorithm (Step 6d in complete): requires 3+ completed slices to produce data
- Refactor Intelligence Protocol (Step 9 in complete): new detection algorithm, batch table presentation, inline fix application, side quest proposal — all untested on a real codebase
- Maturity/invariants/fitness workflow: Steps 8f/8g/8h in define-architecture, Steps 3b/3c/3d in audit-architecture, maturity evaluation in refine-architecture, reviewer criteria 12/13 — all untested on a real project
- Epic completion mode in /complete: new epic scope type, architecture reconciliation, artifact promotion, archive numbering — all untested on a real epic
- goodplan CLI main runner (`src/index.ts`): no automated integration tests — only verified via manual CLI invocation. Pre-dispatch regression (exit 0 for unknown commands) was caught by review, not tests. Scoped for slice 08.

### Known fragile areas
- Cross-skill reference paths (e.g., refine-slices references refine-plan's shared-preamble.md): if refine-plan files move, refine-slices breaks silently
- refine-plan's shared-preamble.md borrowed by refine-architecture and refine-slices: plan-specific framing ("Plan Location") doesn't match non-plan consumers
- `~~archived~~` prefix sort order: sorts correctly in terminal but may sort above active items in file explorers (VS Code, Finder) due to locale-aware collation
- epic-conventions.md is consumed by 12+ skills: changes require updating all consumers
- citty + `exactOptionalPropertyTypes`: requires `as unknown as CommandDef` casts in `src/index.ts`. May break on citty upgrade.

<!-- Last updated by: complete for epics/__active__goodplan-cli/slices/02-project-init, 2026-03-22 -->

## Performance Characteristics

- No performance observations yet — skill files are markdown documents parsed by the agent at invocation time

<!-- Last updated by: complete for side-quests/slice-quality-and-health, 2026-03-17 -->

## Extensibility

### Easy to extend
- Reviewer infrastructure: adding a new reviewer to any skill requires only a prompt section in the reviewers file + a registry entry
- Iteration loop: new skills plug in via Loop Parameters table — architecture-quality proved this, slice-quality-and-health confirmed it, refine-plan-shared-loop completed the consolidation (all 3 consumers now use the shared pattern)
- Epic scope resolution: the Step 0 preamble pattern ($SCOPE_TYPE, $SLICES_DIR, $EPIC_DIR) provides a consistent template for adding epic awareness to any new skill
- goodplan CLI command registration: adding a new command requires creating a file in `src/commands/<namespace>/`, importing in `main.ts`, and adding to `subCommands`. Global flags are shared via `global-args.ts`.
- goodplan CLI schemas: convention of exporting both schema and `z.infer` type from every schema file makes adding new entities straightforward
- State machine transitions: adding a new event requires only a handler file in `src/core/state/transitions/` and a case in `reduce()`. The `setEntry` immutable builder makes constructing new tree states clean.
- assembleState/commitState: schema registry pattern means new entity types just need a schema + regex pattern entry

### Hard to extend
- Multi-file review pattern: the iteration loop assumes single-file or single-directory plans. Scattered working copies (as in refine-slices) require custom editor prompts and file-matching protocols
- citty colon-namespace routing: requires manual pre-dispatch unknown command detection and `as unknown as CommandDef` casts. Adding commands must keep the pre-dispatch check in sync.

<!-- Last updated by: complete for epics/__active__goodplan-cli/slices/02-project-init, 2026-03-22 -->

## Technical Debt

### Localized items
- shared-preamble.md asymmetry: lives in refine-plan/references/ while iteration-loop.md lives in _shared/references/ — candidate for future consolidation
- `--verbose` flag not wired: defined on all commands via `global-args.ts` but never sets `globalThis.__goodplan_verbose`. Debug logging only works via `GOODPLAN_DEBUG=1` env var.

### Systemic items
- shared-preamble.md divergence risk: refine-plan's copy is plan-framed but borrowed by refine-architecture and refine-slices. As those skills mature, their needs may diverge. Noted as tech debt — revisit when it causes a real problem.

<!-- Last updated by: complete for epics/__active__goodplan-cli/slices/02-project-init, 2026-03-22 -->

## Recent Changes

- **02-project-init** (2026-03-22): Recursive tree state model end-to-end — ProjectState types, all entity Zod schemas, assembleState/commitState I/O, INIT_PROJECT state machine, RPC wiring. Refactored init+status through full load→reduce→commit cycle. Removed readEntity/writeEntity. 256 tests, binary verified.
- **01-tracer-bullet** (2026-03-21): First goodplan CLI implementation — Bun project scaffolding, Zod schemas, data layer (readEntity/writeEntity), citty command framework with custom runner, init and status commands, --query via jqjs, compiled to 58MB binary. 99 tests, type-clean.
- **refactor-intelligence** (2026-03-19): Upgraded /complete Step 9 from generic cleanup question to proactive refactor detection with scope/risk classification, batch table presentation, inline fix application (capped at 5), and side quest proposals.

<!-- Last updated by: complete for epics/__active__goodplan-cli/slices/02-project-init, 2026-03-22 -->
