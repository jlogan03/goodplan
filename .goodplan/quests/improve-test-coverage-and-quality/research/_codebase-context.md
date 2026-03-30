# Codebase Context: Improve Test Coverage and Quality

Generated: 2026-03-28

## Documentation Freshness

### Architecture Docs (Plan-Affected)

| Doc | Last Updated | Updated By | Freshness |
|---|---|---|---|
| `_overview.md` | 2026-03-27 | arch-docs-update quest | FRESH -- updated 1 day ago to reflect current subsystem maturity and fitness function listings |
| `commands-api.md` | 2026-03-27 | arch-docs-update quest | FRESH -- updated 1 day ago; fitness function section at line 369 has one "candidate -- not yet written" entry (structured errors, INV-007) |
| `rpc-layer-api.md` | 2026-03-27 | arch-docs-update quest | FRESH -- updated 1 day ago; fitness function section at line 400 has two "candidate -- not yet written" entries (context budget, INV-001 mutation-through-state-machine) |
| `invariants.md` | 2026-03-27 | arch-docs-update quest | FRESH -- INV-001 through INV-007 documented with verification notes and known exceptions |
| `conventions.md` | 2026-03-27 | arch-docs-update quest | FRESH |

### Test Conventions

Defined in `.project/conventions.md` under "Testing" section:
- Vitest 4.x framework
- Unit tests for core/ logic; integration tests spawn compiled binary
- **No mocks for filesystem** -- use temp directories with real `.project/` structures from fixtures
- Coverage not enforced numerically, but all state transitions and validation paths must be tested

### Key Constraint: Global Setup

`tests/global-setup.ts` compiles the binary once before all tests via `bun build --compile`. Integration and fitness tests that spawn the binary depend on this. The plan's Phase 1 (investigate failures) should check whether the compiled binary is current -- a known past issue (learning: build-time defines must be mirrored in test compilation).

## Recent Development Activity in Plan-Affected Areas

### Tests (High Churn -- 79 files changed on this branch)

The `quest-completions` branch (diverged from main) has significant test changes:
- **2026-03-27**: learnings-dir Phase 4 added migration tests, state-events test updated, fixture `learnings-migration` added
- **2026-03-27**: tests-and-migration Phase 1 fixed test fixtures and assertions
- **2026-03-26**: schema-state-machine Phases 1-2 added task tests (503 lines), updated handlers and helpers tests
- **2026-03-26**: migrate-to-cli Phase 6 added integration test for migrate
- **2026-03-26**: task-capture Phases 1-2 added task entity tests

Net: +2473 lines, -528 lines across 79 test files on this branch.

### Source Files Targeted for New Unit Tests

| File | Last Modified | Last Commit | Stability |
|---|---|---|---|
| `src/core/state/transitions/helpers.ts` | 2026-03-27 | learnings-dir Phase 1 | ACTIVE CHURN -- 11 commits touching this file across multiple slices/epics |
| `src/core/data/serialize.ts` | 2026-03-23 | state-cmd-tracer Phase 1 | STABLE -- untouched for 5 days |
| `src/core/data/markdown-files.ts` | 2026-03-27 | learnings-dir migration | RECENTLY CHANGED -- markdown file operations updated for learnings directory pattern |

### Fixtures (Moderate Churn)

Current fixtures: `fresh-init`, `epic-created`, `epic-activated`, `slice-in-progress`, `slice-refining-max-rounds`, `pre-cli-project`, `learnings-migration`

Last fixture updates:
- 2026-03-27: `learnings-migration` fixture added
- 2026-03-27: Fixture assertions fixed for tests-and-migration
- 2026-03-26: `pre-cli-project` fixture added for migrate tests

The plan notes fixtures may be missing `tasks/overview.json` -- this aligns with task entity being added in 2026-03-26 (schema-state-machine slice) while older fixtures predate it.

### Fitness Functions (Stable)

9 existing fitness function test files in `tests/fitness/`. Last substantive changes:
- `stateless-commands.test.ts`: 2026-03-27
- `transition-completeness.test.ts`: 2026-03-26
- All others: 2026-03-26 or earlier

The two planned new fitness functions (INV-007 structured errors, INV-001 mutation-through-state-machine) are explicitly marked "candidate -- not yet written" in the architecture docs.

### Architecture Docs (Plan Targets for Update)

The plan's Phase 4 includes updating `commands-api.md` and `rpc-layer-api.md` fitness function sections. Both were updated 2026-03-27 by the arch-docs-update quest, so the "candidate -- not yet written" markers are current and intentional placeholders.

## Key Decisions and Constraints from Git History

### Testing Strategy Learnings (from `.project/learnings/`)

1. **Binary spawning requires explicit stdin and GOODPLAN_DIR**: Without `stdin: ""` the binary blocks; without `GOODPLAN_DIR` it walks to the repo's own `.project/`. Both required for every integration test.

2. **Fitness functions must classify binary-testable vs import-testable**: Data layer invariants (concurrent modification, deterministic serialization) are internal to `commitState`/`assembleState` -- not observable through CLI binary. Plan's INV-001 fitness function uses static analysis (import graph), which is correct per this learning.

3. **INV-001 has documented exceptions**: `goodplan migrate` bypasses `reduce()` via `buildMigrationState()` -- documented in `invariants.md`. The mutation-through-state-machine fitness function must account for this exception and the `version-stamp.ts` exception.

4. **Build-time defines must be mirrored**: `__GOODPLAN_VERSION__` define was previously missing from `global-setup.ts`, breaking integration tests. This was fixed (commit c97109c, 2026-03-24). Current `global-setup.ts` includes it.

### No Active Epic

All 4 epics are archived (`initial`, `goodplan-cli`, `skills-cli-integration`, `entity-restructuring`). No epic architecture to reconcile against. The plan operates at project-level architecture only.

## Areas of Active Churn vs Stability

### Active Churn (test with awareness of potential further changes)
- `src/core/state/transitions/helpers.ts` -- most-changed file in the plan scope, 11+ commits
- Test fixtures -- updated multiple times in last 2 days as new entities added
- Integration tests -- 18 files, frequent updates as CLI surface evolves

### Stable (safe to test against current interface)
- `src/core/data/serialize.ts` -- unchanged since 2026-03-23
- Existing fitness function patterns -- well-established, 9 files with consistent structure
- `src/util/errors.ts` -- last changed 2026-03-26, error code structure is mature
- `src/core/data/commit.ts` -- last changed 2026-03-25, stable write path

### Architecture Docs (Recently Refreshed)
- All plan-affected docs updated 2026-03-27 by dedicated arch-docs-update quest
- Fitness function placeholders are intentional and current
- `_overview.md` subsystem maturity table is accurate
