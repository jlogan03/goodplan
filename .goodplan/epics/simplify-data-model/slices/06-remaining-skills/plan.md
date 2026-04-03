# Plan: Remaining Skills + Cleanup

## Overview

Complete the 19-to-12 skill consolidation by building the remaining new skills, renaming three existing skills, adding all reviewer agents, and cleaning up old skill directories with build pipeline updates.

Six skills need to be created or consolidated:
- **create-side-quest**: new pipeline skill (4 phases) using the proven orchestrator pattern from slices 02-05. Reuses existing `explore-phase.md` and `plan-phase.md` agents via quest-specific task prompts.
- **audit**: lightweight orchestrator dispatching to three mode-specific agents (architecture, docs, tests). Replaces three separate audit skills.
- **init**: lightweight orchestrator auto-detecting mode (onboard existing repo vs new empty project). Spawns `onboard-phase.md` agent for the heavy lifting.
- **task** (rename of capture), **upgrade** (rename of migrate), **status** (rename of project-status): fresh skill directories with updated frontmatter, descriptions, and trigger phrases.

Twelve new reviewer agent definitions complete the reviewer infrastructure (matching the 18-domain architecture spec). All follow the established pattern: ~45-line agent `.md` referencing shared preamble + domain-specific criteria.

Cleanup deletes 15 old skill directories, removes `install-skills.sh` (superseded by plugin distribution), and adds exact count + name assertions to `build-plugin.sh`.

**Slug**: `remaining-skills`

| Phase | Name | Description |
|-------|------|-------------|
| 01 | create-side-quest-pipeline | Build 4-phase orchestrator skill + test harness script |
| 02 | audit-skill | Build audit orchestrator + 3 mode agents + test harness script |
| 03 | init-skill | Build init orchestrator + onboard-phase agent + test harness script |
| 04 | renames | Create task, upgrade, status skills from capture, migrate, project-status |
| 05 | reviewer-agents | Add 12 remaining reviewer agent definitions + domain criteria files |
| 06 | cleanup-and-build | Delete 15 old skills, remove install-skills.sh, update build assertions, final verification |

## Phase 1: create-side-quest Pipeline

Build the `/gp:create-side-quest` skill as a 4-phase pipeline orchestrator following the proven pattern from create-epic and plan-slice.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/create-side-quest/` — directory does not exist
- [ ] `ls tools/dogfood/test-create-side-quest.ts` — file does not exist

**After implementation** (should pass / show presence):
- [ ] `ls skills/create-side-quest/SKILL.md` — file exists
- [ ] `bun tools/dogfood/test-create-side-quest.ts` — full pipeline completes: quest created, explore runs, plan Q&A collects input, plan drafted and refined, quest status reaches `plan-refined`
- [ ] Re-entry test: invoke on a quest in `explored` status — resumes from plan Q&A phase, not goal capture

### Tasks

- [ ] Create `skills/create-side-quest/SKILL.md` as a lightweight orchestrator with these phases:

  | Phase | Type | CLI Status Mapping | What Happens |
  |---|---|---|---|
  | 1. Goal capture | Interactive | `created` | Orchestrator asks about quest goal, creates quest via `gp quest:create`, writes `goal.md` |
  | 2. Explore | Autonomous | `created` → `exploring` → `explored` | Spawns `explore-phase` agent with quest-scoped paths |
  | 3. Plan Q&A | Interactive | `explored` → `planning` | Orchestrator runs plan Q&A (approach, phasing, expected behavior) |
  | 4. Plan draft + refinement | Autonomous | `planning` → `plan-created` → `plan-refined` | Spawns `plan-phase` agent, then refinement-coordinator → reviewers → synthesis → editor loop |

- [ ] Implement context discipline: orchestrator reads only CLI status + sub-agent return values. No Read calls on artifact content.
- [ ] Implement re-entry logic: query `gp quest:show --quest <name> --json`, check `status`, offer continue/go-back for each phase.
- [ ] Use `gp start-plan --quest <name> --inline --json` to get context bundle for plan-phase agent (same pattern as plan-slice).
- [ ] Use `gp start-explore --quest <name> --inline --json` for explore-phase context.
- [ ] Frontmatter: `name: create-side-quest`, `description:` must trigger for "side quest", "new quest", "quick task that needs a plan". Add `user-invocable: true`, `requires: gp >= 1.0.0`.
- [ ] Write `tools/dogfood/test-create-side-quest.ts` following the pattern from `test-create-epic.ts`:
  - Create minimal fixture with `gp init` + `gp epic:create` + `gp epic:activate`
  - Run `/gp:create-side-quest` via Agent SDK `query()` with plugin path
  - Verify quest reaches `plan-refined` status via `verifyEntityStatus()`
  - Test re-entry: create a quest at `explored` status, invoke skill, verify it starts at plan Q&A
  - Accept `--model` and `--max-iterations` flags

### Verification

- `bun tools/dogfood/test-create-side-quest.ts` passes — both full pipeline and re-entry scenarios
- Skill frontmatter validates: `name:`, `description:`, `user-invocable: true` all present
- No Read calls on artifact files in orchestrator context (manual review of SKILL.md)

## Phase 2: audit Skill

Build the `/gp:audit` skill as a lightweight orchestrator that dispatches to mode-specific agents. Replaces audit-architecture, audit-docs, and audit-tests.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/audit/` — directory does not exist
- [ ] `ls agents/audit-architecture-phase.md agents/audit-docs-phase.md agents/audit-tests-phase.md` — none exist
- [ ] `ls tools/dogfood/test-audit.ts` — file does not exist

**After implementation** (should pass / show presence):
- [ ] `ls skills/audit/SKILL.md` — file exists
- [ ] `ls agents/audit-architecture-phase.md agents/audit-docs-phase.md agents/audit-tests-phase.md` — all three exist
- [ ] `bun tools/dogfood/test-audit.ts` — audit runs in each mode (architecture, docs, tests) and produces findings

### Tasks

- [ ] Create `skills/audit/SKILL.md` as a lightweight orchestrator:
  1. Parse mode from argument: `/gp:audit architecture`, `/gp:audit docs`, `/gp:audit tests`. If no argument, use AskUserQuestion to select mode.
  2. Load project context via `gp status --json` to determine active epic and architecture paths.
  3. Spawn the appropriate mode agent (`audit-architecture-phase`, `audit-docs-phase`, or `audit-tests-phase`) with project paths in the task prompt.
  4. Receive findings from agent, present to user as formatted report.
  5. Offer to create side quests for significant findings.
- [ ] Frontmatter: `name: audit`, `description:` must trigger for "audit architecture", "audit docs", "audit tests", "review codebase", "check quality". Add `user-invocable: true`, `requires: gp >= 1.0.0`.
- [ ] Create `agents/audit-architecture-phase.md`:
  - Adapt content from `skills/audit-architecture/SKILL.md` (Steps 1-8: gap analysis, drift detection, architecture reassessment)
  - Agent reads architecture files + scans codebase, produces gap report and reassessment
  - Returns structured JSON with findings, scores, and proposed side quests
  - Inject relevant shared references via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/` (audit-conventions, maturity-conventions)
- [ ] Create `agents/audit-docs-phase.md`:
  - Adapt content from `skills/audit-docs/SKILL.md` (doc scanning, cross-reference checking, staleness detection)
  - Agent scans docs, checks against codebase, produces findings
  - Returns structured JSON with findings and fix proposals
- [ ] Create `agents/audit-tests-phase.md`:
  - Adapt content from `skills/audit-tests/SKILL.md` (coverage analysis, fragility detection, strategy alignment)
  - Agent analyzes test infrastructure, produces findings
  - Returns structured JSON with findings and improvement proposals
- [ ] Write `tools/dogfood/test-audit.ts`:
  - Create fixture with source code, docs, and tests (realistic enough for meaningful audit findings)
  - Test each mode: architecture, docs, tests
  - Verify each mode produces findings (non-empty output)
  - Accept `--model` flag

### Verification

- `bun tools/dogfood/test-audit.ts` passes for all three modes
- Each mode agent's `.md` body stays under ~500 lines (per agent size guidance)
- Skill SKILL.md stays lightweight — no content-level reading of architecture or code

## Phase 3: init Skill

Build the `/gp:init` skill as a lightweight orchestrator that auto-detects mode (onboard existing repo vs new project). Replaces onboard-repo and subsumes create-epic "Mode A" (new empty project).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/init/` — directory does not exist
- [ ] `ls agents/onboard-phase.md` — file does not exist
- [ ] `ls tools/dogfood/test-init.ts` — exists but tests old skill. New version needed.

**After implementation** (should pass / show presence):
- [ ] `ls skills/init/SKILL.md` — file exists
- [ ] `ls agents/onboard-phase.md` — file exists
- [ ] `bun tools/dogfood/test-init.ts` — init detects empty repo (new project) and repo with source (onboard) correctly

### Tasks

- [ ] Create `skills/init/SKILL.md` as a lightweight orchestrator:
  1. **Auto-detection**: Check for source code files (`src/`, `lib/`, `app/`, `*.ts`, `*.py`, `*.js`, `*.go`, `*.rs`, `*.java` at root or one level deep). If found → onboard mode. If empty → new project mode. Override: argument `--mode new` or `--mode onboard`.
  2. **New project path** (inline in orchestrator):
     - Ask user for project name and brief description via AskUserQuestion
     - Run `gp init --name <name> --json`
     - Write `.goodplan/idea.md` from user's description
     - Present: "Project initialized. Next: `/gp:create-epic` to start building."
  3. **Onboard path** (delegated to agent):
     - Run `gp init --name <name> --json` first (needs project scaffolding before agent runs)
     - Spawn `onboard-phase` agent with repo root path, project name, and conventions context
     - Agent scans repo, extracts conventions, scaffolds architecture, populates `.goodplan/`
     - Present summary of what was detected and written
- [ ] Frontmatter: `name: init`, `description:` must trigger for "init", "initialize", "onboard", "new repo", "set up project", "new project". Add `user-invocable: true`, `requires: gp >= 1.0.0`.
- [ ] Create `agents/onboard-phase.md`:
  - Adapt content from `skills/onboard-repo/SKILL.md` (Steps 1-12: repo scanning, convention extraction, architecture scaffolding, subsystem detection, maturity assessment)
  - Agent has full tool access (Read, Grep, Glob, Write, WebSearch)
  - Writes conventions.md, architecture files, idea.md based on repo analysis
  - Returns structured JSON with summary of what was detected and written
  - Inject shared references: expertise-tracking, maturity-conventions, codebase-context-discovery
  - Keep under ~500 lines by moving stable reference content to shared files
- [ ] Update `tools/dogfood/test-init.ts` to test the new skill:
  - Test 1: Empty directory → new project mode → project initialized
  - Test 2: Directory with TypeScript source files → onboard mode → conventions and architecture extracted
  - Test 3: Override with `--mode new` on a repo with source → forces new project mode
  - Verify via `gp status --json` that project is initialized

### Verification

- `bun tools/dogfood/test-init.ts` passes for both modes
- onboard-phase agent body stays under ~500 lines
- Auto-detection correctly differentiates empty vs populated repos

## Phase 4: Renames

Create fresh skill directories for task (from capture), upgrade (from migrate), and status (from project-status). Each gets updated frontmatter, descriptions, trigger phrases, and CLI references adapted from the old skill content.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/task/SKILL.md skills/upgrade/SKILL.md skills/status/SKILL.md` — none exist

**After implementation** (should pass / show presence):
- [ ] `ls skills/task/SKILL.md` — exists with `name: task` in frontmatter
- [ ] `ls skills/upgrade/SKILL.md` — exists with `name: upgrade` in frontmatter
- [ ] `ls skills/status/SKILL.md` — exists with `name: status` in frontmatter
- [ ] `grep -c 'name: task' skills/task/SKILL.md` — returns 1
- [ ] `grep -c 'name: upgrade' skills/upgrade/SKILL.md` — returns 1
- [ ] `grep -c 'name: status' skills/status/SKILL.md` — returns 1

### Tasks

- [ ] Create `skills/task/SKILL.md` — adapted from `skills/capture/SKILL.md`:
  - Rename: `name: task`
  - Description triggers: "capture", "quick note", "bug", "idea", "todo", "task", "note this"
  - Update any internal references from "capture" to "task"
  - Add `user-invocable: true`, `requires: gp >= 1.0.0`
  - Content: same CLI commands (`gp task:create`), same flow — the rename is primarily in frontmatter and user-facing language

- [ ] Create `skills/upgrade/SKILL.md` — adapted from `skills/migrate/SKILL.md`:
  - Rename: `name: upgrade`
  - Description triggers: "upgrade", "migrate", "update state format", "convert project"
  - Copy reference files from `skills/migrate/references/` if needed
  - Add `user-invocable: true`, `requires: gp >= 1.0.0`
  - Update internal skill references (any mentions of "migrate" in the context of the skill name)

- [ ] Create `skills/status/SKILL.md` — adapted from `skills/project-status/SKILL.md`:
  - Rename: `name: status`
  - Description triggers: "status", "where am I", "what's next", "project state", "orient", "re-orient"
  - Copy reference files from `skills/project-status/references/` if needed
  - Update `requires: gp >= 1.0.0` (currently `>= 0.0.1`)
  - Add `user-invocable: true`

- [ ] Verify each new skill's SKILL.md has valid frontmatter (opening/closing `---`, `name:`, `description:`, `user-invocable: true`)

### Verification

- All three new skill directories exist with valid SKILL.md files
- Frontmatter passes the same validation build-plugin.sh runs (name, description fields present)
- No references to old skill names in new skill content (grep for "capture" in task/, "migrate" in upgrade/, "project-status" in status/)

## Phase 5: Reviewer Agents

Add the 12 remaining reviewer agent definitions to complete the 18-domain reviewer infrastructure specified in the architecture. Each reviewer follows the established pattern: ~45-line agent `.md` + ~100-150 line domain criteria file in `skills/_shared/references/`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls agents/reviewer-python.md agents/reviewer-backend.md agents/reviewer-frontend.md` — none exist
- [ ] `ls skills/_shared/references/review-python.md skills/_shared/references/review-backend.md` — none exist

**After implementation** (should pass / show presence):
- [ ] `ls agents/reviewer-*.md | wc -l` — returns 18 (6 existing + 12 new)
- [ ] `ls skills/_shared/references/review-*.md | wc -l` — returns 18 (6 existing + 12 new)
- [ ] Each new agent `.md` has valid frontmatter (`name:`, `description:`, `model: opus`)
- [ ] Each new agent body contains `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-preamble.md` and `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-<domain>.md`

### Tasks

New reviewer agents to create (each needs an agent `.md` in `agents/` + a criteria `.md` in `skills/_shared/references/`):

**Language specialists:**
- [ ] `reviewer-python.md` + `review-python.md` — type hints (mypy/pyright), packaging (pyproject.toml), async patterns, virtual environments, dependency management
- [ ] `reviewer-rust.md` + `review-rust.md` — ownership/borrowing, error handling (Result/Option), unsafe blocks, Cargo patterns, trait design

**Web specialists:**
- [ ] `reviewer-backend.md` + `review-backend.md` — API design (REST/GraphQL), auth patterns, database access, middleware, error handling, input validation
- [ ] `reviewer-frontend.md` + `review-frontend.md` — component patterns, state management, accessibility, performance (bundle size, rendering), responsive design
- [ ] `reviewer-data-layer.md` + `review-data-layer.md` — schema design, migrations, query patterns, indexing, connection pooling, data integrity
- [ ] `reviewer-devops.md` + `review-devops.md` — containerization, infrastructure-as-code, deployment strategies, secrets management, monitoring, scaling

**Cross-cutting specialists:**
- [ ] `reviewer-ci-github-workflows.md` + `review-ci-github-workflows.md` — workflow correctness, caching, secrets, matrix strategies, job dependencies, artifact handling
- [ ] `reviewer-ux-ia.md` + `review-ux-ia.md` — information architecture, user flows, navigation, content hierarchy, interaction patterns
- [ ] `reviewer-api-contract.md` + `review-api-contract.md` — API contract design, versioning, backward compatibility, documentation, error response standards

**AI tooling specialists:**
- [ ] `reviewer-mcp-server.md` + `review-mcp-server.md` — MCP protocol compliance, tool definitions, resource handling, transport patterns

**Scientific specialists:**
- [ ] `reviewer-algorithm-numerical.md` + `review-algorithm-numerical.md` — algorithmic complexity, numerical stability, precision, edge cases, correctness proofs
- [ ] `reviewer-performance.md` + `review-performance.md` — profiling, memory allocation, concurrency, caching strategies, I/O optimization
- [ ] `reviewer-ml-pipeline.md` + `review-ml-pipeline.md` — data preprocessing, feature engineering, model training, evaluation metrics, deployment, reproducibility
- [ ] `reviewer-data-io.md` + `review-data-io.md` — data format handling (CSV, JSON, Parquet), streaming, ETL patterns, data validation, schema evolution

Each agent `.md` follows the exact template from existing reviewers:
```
---
name: reviewer-<domain>
description: Reviews artifacts for <domain focus>. Spawned by pipeline orchestrators during refinement loops when the artifact involves <trigger>.
model: opus
---
# <Domain> Reviewer Agent
<role description, NOT responsible for clause>
## Inputs (provided in task prompt)
<standard inputs block>
## Shared Review Standards
@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-preamble.md
## Domain-Specific Criteria
@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-<domain>.md
## Output
<standard output block with JSON>
```

Each criteria `.md` follows the template from existing criteria files:
```
# <Domain> Review Criteria
## Codebase Exploration Focus
<what to check in the repo before reviewing>
## Evaluation Criteria
1-6 numbered criteria with sub-items
## Scoring Guidelines
<domain-specific scoring adjustments>
```

### Verification

- All 18 `agents/reviewer-*.md` files exist with valid frontmatter
- All 18 `skills/_shared/references/review-*.md` files exist
- `@` references in all reviewer agents resolve to existing files (same check build-plugin.sh runs)
- `bun run build:plugin` passes — all reviewer agents validate

## Phase 6: Cleanup and Build Updates

Delete 15 old skill directories, remove install-skills.sh, update build-plugin.sh assertions. This is the destructive phase — execute only after all prior phases are verified.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/ | wc -l` — returns more than 13 (12 skills + _shared)
- [ ] `ls scripts/install-skills.sh` — file exists (should be deleted)

**After implementation** (should pass / show presence):
- [ ] `ls skills/ | grep -v _shared | wc -l` — returns exactly 12
- [ ] `ls skills/` shows only: `_shared`, `audit`, `complete-epic`, `create-epic`, `create-side-quest`, `explore`, `implement`, `init`, `plan-slice`, `start-epic`, `status`, `task`, `upgrade`
- [ ] `ls scripts/install-skills.sh` — file does not exist
- [ ] `bun run build:plugin` — passes with "Packaged 12 skills" in output
- [ ] `bun tools/dogfood/test-plugin-skills.ts` — all 12 skills discovered with `/gp:` namespace
- [ ] `bun test` — all tests pass

### Tasks

- [ ] Delete 15 old skill directories:
  - `skills/create-architecture/`
  - `skills/refine-architecture/`
  - `skills/create-plan/`
  - `skills/refine-plan/`
  - `skills/create-slices/`
  - `skills/refine-slices/`
  - `skills/implement-plan/`
  - `skills/complete/`
  - `skills/audit-architecture/`
  - `skills/audit-docs/`
  - `skills/audit-tests/`
  - `skills/capture/`
  - `skills/onboard-repo/`
  - `skills/migrate/`
  - `skills/project-status/`

- [ ] Delete `scripts/install-skills.sh` — superseded by plugin distribution via `build-plugin.sh`

- [ ] Update `build-plugin.sh`:
  - Add exact skill count assertion: `test "$SKILL_COUNT" -eq 12 || { echo "FAIL: expected 12 skills, got $SKILL_COUNT"; exit 1; }`
  - Add deleted skill name assertion: check that none of the 15 deleted skill directory names exist in `$PLUGIN_DIR/skills/`
  - Verify existing regression guards still pass (old CLI name check, .DS_Store check, frontmatter validation)

- [ ] Update `package.json` if it has an `install:skills` script — remove or update it

- [ ] Run `bun tools/dogfood/test-plugin-skills.ts` to verify all 12 skills are discovered
- [ ] Run `bun test` to verify no test breakage from deletions
- [ ] Verify sub-ordering discipline: `git log --oneline` shows build-phase commits (phases 1-5) before cleanup-phase commits (phase 6)

### Verification

- `bun run build:plugin` succeeds with exactly 12 skills and all agents
- `bun tools/dogfood/test-plugin-skills.ts` discovers all 12 skills with `/gp:` namespace
- `bun test` passes — no regressions from deleted skills
- `ls skills/` shows exactly 12 skill directories + `_shared/`
- No old skill names appear in `dist/gp-plugin/skills/`
- `scripts/install-skills.sh` no longer exists
- Git log confirms build commits precede cleanup commits
