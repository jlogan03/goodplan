# Plan: Audit Docs and Tests

## Overview

Two new audit skills following the `/audit-architecture` pattern — parallel sub-agent reviewers that analyze the codebase, produce findings, and take action. `/audit-docs` compares documentation against the actual codebase, batches trivial fixes for user approval, confirms large changes, and proposes side quests for significant improvements. `/audit-tests` evaluates test quality, coverage gaps, and strategy alignment using static analysis, then proposes a side quest for improvements.

Both skills live in `skills/` (repo source of truth) and are installed via `bun run install:skills`. No CLI code changes — these are pure skill files. Both skills must also be registered in `scripts/install-skills.sh` (the `SKILL_DIRS` array).

Key design decisions:
- **Sub-agent reviewers** for parallel analysis — both skills spawn domain-specific reviewer agents (model: `"opus"`, matching the audit-architecture pattern)
- **Confirm before fixing** — `/audit-docs` batches trivial fixes and presents them via `AskUserQuestion` for batch approval before applying; substantive changes get individual confirmation
- **Static analysis for coverage** — `/audit-tests` compares test files against source files rather than depending on coverage tools
- **Side quest proposals** — both skills propose side quests via `goodplan quest:create --json` (CLI-native mechanism, intentional modernization vs audit-architecture's filesystem approach). The `--json` flag controls output format (not stdin parsing); capture the output to extract the created quest name for inclusion in the audit report's "Side Quests Created" section. This divergence from audit-architecture is tracked as a follow-up: after these skills are complete, propose a side quest to update audit-architecture to also use `goodplan quest:create`
- **Full audit lifecycle** — both skills follow the complete audit-architecture lifecycle: version check, context loading, domain work with graceful stop markers, audit report, project health refresh, expertise check. Graceful stop marker strings (e.g., `<!-- partial — interrupted during source discovery`) are canonical keys — resume detection parses them to determine where to continue, so marker wording must not be changed without updating resume detection logic
- **Consistent lifecycle envelope** — Steps 0-1 (setup: version check, load context) and the final 4 steps (teardown: write audit report, refresh project health, graceful stop, expertise check) use the same names and relative order across all audit skills. Domain-specific steps occupy the middle and may differ in count between skills. This means `/audit-docs` has Steps 0-9 and `/audit-tests` has Steps 0-10 — the absolute step numbers for teardown differ, but the lifecycle envelope is structurally identical

## Phase 1: `/audit-docs` Skill

Create the documentation audit skill with sub-agent reviewers, auto-fix capability, and side quest proposals.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/audit-docs/SKILL.md` fails — skill doesn't exist

**After implementation** (should pass / show presence):
- [ ] `ls skills/audit-docs/SKILL.md` succeeds — skill file exists
- [ ] Skill frontmatter has correct `name`, `description` (~270 chars with trigger phrases), and trigger patterns
- [ ] End-to-end: invoke `/audit-docs` on the goodplan repo — verify it discovers documentation sources, spawns reviewer sub-agents, produces findings, and writes an audit report to `.project/audits/docs-<date>.md`

### Tasks

- [x] **Create `skills/audit-docs/SKILL.md`**: The main skill file with frontmatter including `name: audit-docs` and `description` field (~270 chars with embedded trigger phrases, following audit-architecture's pattern). Draft description: `"Audit documentation against the actual codebase. Spawns parallel reviewers to find stale docs, undocumented APIs, and cross-doc inconsistencies. Batches trivial fixes for approval, confirms substantive changes, and proposes side quests for gaps. Common triggers: 'audit docs', 'check documentation', 'are the docs up to date', 'documentation audit', 'review docs'."` Structure:
  - **Step 0 — Version Check**: Read `../_shared/references/cli-interaction.md`. Run `goodplan --version --json`, validate against `requires: goodplan >= 1.0.0`.
  - **Step 1 — Load Context**: Following audit-architecture Step 1 pattern:
    1. Load learnings via `goodplan learning:list --json`
    2. Read `.project/conventions.md` (if exists)
    3. Load recent activity-log via `goodplan state --json --query` (filter for recent entries, e.g., last 20 activity-log items to understand recent project context)
    4. Expertise check (load): read `## Expertise` from `~/.claude/CLAUDE.md`
    5. Resume detection: glob `.project/audits/docs-*.md`, check most recent for `<!-- partial — interrupted` marker. If found, ask: resume or start fresh?
    6. Read `references/guidance.md` for severity levels and side quest format
  - **Step 2 — Discover Documentation Sources**: Check for active epic via `goodplan status --json` (`.activeEpic` field) — if present, include `.project/epics/<name>/` documentation in scope alongside project-level docs. Epic subdirectories to include: `architecture/`, `slices/` (goal and plan files). Epic subdirectories to exclude: `research/`, `brainstorm/`, `prototypes/` (scratch/exploratory content, not authoritative docs). Scan for READMEs, `docs/` directories, `.project/` workflow files (architecture, conventions, idea.md, learnings), CLAUDE.md files, JSDoc/docstring-heavy files, module-purpose comments. Inline the glob patterns and heuristics for discovery directly in SKILL.md (matching audit-architecture's approach — no separate discovery-patterns file). Focus on TypeScript/goodplan-specific patterns first (multi-language as future enhancement). Record what was found.
  - **Step 3 — Read Codebase Reality**: Read actual exports, public APIs, module structure, CLI commands (from `goodplan --help` or command files), configuration options, environment variables. Build a map of "what exists" to compare against "what's documented."
  - **Step 4 — Spawn Reviewer Sub-Agents**: Read `references/sub-agent-prompts.md` for self-contained reviewer templates. Spawn parallel reviewers (model: `"opus"`):
    - **Staleness reviewer**: Finds docs referencing removed code, APIs, config, or features
    - **Gap reviewer**: Finds undocumented public APIs, exports, CLI commands, config options
    - **Consistency reviewer**: Finds cross-references between docs that contradict each other, and code examples that won't work
    - Each reviewer returns findings inline in their agent response (not written to disk), matching audit-architecture's pattern. Orchestrator synthesizes.
  - **Step 5 — Classify and Act on Findings**: For each finding:
    - **Trivial** (typos, dead links, stale single-line references): batch and present via `AskUserQuestion` ("Apply these N trivial fixes?") — do NOT auto-fix without approval. If rejected: skip all trivial fixes, note them as "deferred" in the audit report with the list of skipped items, and continue to substantive findings
    - **Substantive** (rewrites, new doc sections, structural changes): present with diff preview, use `AskUserQuestion` for individual confirmation
    - **Large scope** (missing entire doc sections, documentation strategy gaps, cross-cutting inconsistencies): propose as side quest via `echo '{"name":"fix-stale-docs","goal":"..."}' | goodplan quest:create --json`. Capture the output to extract the created quest name for inclusion in the audit report's "Side Quests Created" section
  - **Step 6 — Write Audit Report**: Run `mkdir -p .project/audits`. Write findings to `.project/audits/docs-<date>.md` following audit-architecture report format (findings summary table, sections by category, side quests created, deferred findings). Same-day re-runs overwrite the previous report (consistent with audit-architecture)
  - **Step 7 — Refresh Project Health**: Read `.project/project-health.md` and `../_shared/references/project-health-format.md`. Update health, technical debt, and extensibility sections with doc audit findings. Write `<!-- Last updated by: audit-docs, <date> -->`.
  - **Step 8 — Graceful Stop**: If user says "stop" at any point, write partial report with a step-specific marker. Per-step detail:
      - **During Step 2 (Discover Sources)**: `<!-- partial — interrupted during source discovery. Sources found so far: [list]. -->` Persist discovered source list.
      - **During Step 3 (Read Codebase)**: `<!-- partial — interrupted during codebase reading. Sources discovered. Codebase map partial: [modules read]. -->` Persist source list + partial codebase map.
      - **During Step 4 (Spawn Reviewers)**: `<!-- partial — interrupted during reviewer spawning. Reviewers launched: [list]. Reviewers not launched: [list]. -->` Persist any completed reviewer findings (returned inline in agent responses).
      - **During Step 5 (Classify and Act)**: `<!-- partial — interrupted during finding classification. Findings classified: [N]. Fixes applied: [N]. Remaining: [N]. -->` Persist all reviewer findings + classification progress + any fixes already applied.
      - **During Step 6 (Write Report)**: `<!-- partial — interrupted during report writing. Findings complete. Report incomplete. -->` Persist all findings (report can be regenerated on resume).
      - **During Step 7 (Refresh Health)**: `<!-- partial — interrupted during project-health refresh. Audit report complete. Project-health.md not updated. -->` Audit report is already written.
      - On resume (detected in Step 1), read the partial report and continue from where it left off.
  - **Step 9 — Expertise Check**: Reflect on conversation. If new expertise info observed, read `../_shared/references/expertise-tracking.md` and update `~/.claude/CLAUDE.md`. Otherwise skip silently.
- [x] **Create `skills/audit-docs/references/` directory**: Add reference files:
  - `guidance.md` — contents: (1) severity level definitions (Critical, Important, Minor — matching audit-architecture convention), (2) shared reviewer output format (findings table with columns: Severity, Description, Evidence, Suggested Action), (3) side quest proposal template (name, goal, scope, verification criteria), (4) doc-specific finding categories (staleness, gap, inconsistency). Does NOT include fitness functions, invariants, or maturity criteria (those are architecture-specific).
  - `sub-agent-prompts.md` — fully self-contained templates for the 3 reviewer sub-agents (staleness, gap, consistency). Each template must include `{placeholders}`, explicit "do NOT read parent skill files" instructions, and defined output format matching the findings table schema from `guidance.md` (Severity, Description, Evidence, Suggested Action).
- [x] **Register in `scripts/install-skills.sh`**: Add `"audit-docs"` to the `SKILL_DIRS` array (alphabetical order, after `audit-architecture`).
- [ ] **Test on this repo**: Invoke `/audit-docs` end-to-end on the goodplan repo. Verify it discovers sources, spawns reviewers, produces findings, writes audit report to `.project/audits/`, and the batch-approval fix flow works. Verify it handles `.project/` documentation (architecture files, conventions, learnings) correctly.

### Verification

- Skill file is valid (frontmatter parses with `name`, `description`, triggers; step numbering follows audit-architecture lifecycle)
- `bun run install:skills` installs the skill (registered in `SKILL_DIRS`)
- End-to-end invocation on goodplan repo: discovers sources, spawns reviewers, produces structured findings, writes audit report to `.project/audits/docs-<date>.md`. Success criteria: audit report file exists at expected path, report contains at least one finding, each reviewer sub-agent returned structured findings matching the output format
- Batch-approval fix flow works via `AskUserQuestion` (no auto-fixing without approval)
- Side quest proposals are well-formed (`goodplan quest:create` compatible)

## Phase 2: `/audit-tests` Skill

Create the test audit skill with sub-agent reviewers, static analysis, and side quest proposals.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/audit-tests/SKILL.md` fails — skill doesn't exist

**After implementation** (should pass / show presence):
- [ ] `ls skills/audit-tests/SKILL.md` succeeds — skill file exists
- [ ] Skill frontmatter has correct `name`, `description` (~270 chars with trigger phrases), and trigger patterns
- [ ] End-to-end: invoke `/audit-tests` on the goodplan repo — verify it discovers test infrastructure, maps source-to-test coverage, spawns reviewer sub-agents, produces findings, and writes an audit report to `.project/audits/tests-<date>.md`

### Tasks

- [ ] **Create `skills/audit-tests/SKILL.md`**: The main skill file with frontmatter including `name: audit-tests` and `description` field (~270 chars with embedded trigger phrases). Draft description: `"Audit test quality and coverage using static analysis. Spawns parallel reviewers to find coverage gaps, stale tests, fragile patterns, and strategy misalignment. Proposes side quests for improvements. Common triggers: 'audit tests', 'check test coverage', 'are the tests good', 'test quality', 'audit testing', 'review test strategy'."` Structure:
  - **Step 0 — Version Check**: Read `../_shared/references/cli-interaction.md`. Run `goodplan --version --json`, validate against `requires: goodplan >= 1.0.0`.
  - **Step 1 — Load Context**: Following audit-architecture Step 1 pattern:
    1. Load learnings via `goodplan learning:list --json`
    2. Read `.project/conventions.md` for intended testing strategy (if exists)
    3. Load recent activity-log via `goodplan state --json --query` (filter for recent entries, e.g., last 20 activity-log items to understand recent project context)
    4. Expertise check (load): read `## Expertise` from `~/.claude/CLAUDE.md`
    5. Resume detection: glob `.project/audits/tests-*.md`, check most recent for `<!-- partial — interrupted` marker. If found, ask: resume or start fresh?
    6. Read `references/guidance.md` for severity levels and side quest format
  - **Step 2 — Discover Test Infrastructure**: Check for active epic via `goodplan status --json` (`.activeEpic` field) — if present, include epic-scoped test directories in scope. Discover test infrastructure: frameworks (jest, vitest, bun test, etc.), config files, test directories, helper/fixture patterns. Inline the discovery heuristics, framework conventions, and source-to-test mapping patterns directly in SKILL.md (matching audit-architecture's approach — no separate discovery-patterns file). Focus on TypeScript/Node project patterns first (multi-language as future enhancement). Record what exists.
  - **Step 3 — Map Source-to-Test Coverage**: Static analysis — for each source module/file, determine whether a corresponding test file exists. Track which source files have coverage and which don't. Don't run coverage tools — just compare file structures.
  - **Step 4 — Spawn Reviewer Sub-Agents**: Read `references/sub-agent-prompts.md` for self-contained reviewer templates. Spawn parallel reviewers (model: `"opus"`):
    - **Coverage gap reviewer**: Identifies modules/APIs with no test coverage. Prioritizes by: public API > internal module > utility.
    - **Stale test reviewer**: Finds tests importing deleted modules, testing removed features, or referencing old APIs.
    - **Quality reviewer**: Detects fragile patterns (time-dependent, order-dependent, excessive mocking, assertions that are always true, tests coupled to implementation details).
    - **Strategy reviewer**: Compares test distribution against conventions — are the right things tested at the right level? Is the test pyramid balanced?
    - Each reviewer returns findings inline in their agent response (not written to disk), matching audit-architecture's pattern.
  - **Step 5 — Synthesize and Prioritize**: Merge findings, deduplicate, prioritize by severity (critical gaps > stale tests > quality issues > strategy misalignment > minor improvements).
  - **Step 6 — Propose Side Quest**: If actionable improvements exist, draft a side quest goal with specific files to add/update/remove, strategy adjustments, and verification criteria. Create via `echo '{"name":"improve-test-coverage","goal":"..."}' | goodplan quest:create --json`. Capture the output to extract the created quest name for inclusion in the audit report's "Side Quests Created" section. Present findings and proposal to user.
  - **Step 7 — Write Audit Report**: Run `mkdir -p .project/audits`. Write findings to `.project/audits/tests-<date>.md` following audit-architecture report format (findings summary table, sections by category, side quests created, deferred findings). Same-day re-runs overwrite the previous report (consistent with audit-architecture).
  - **Step 8 — Refresh Project Health**: Read `.project/project-health.md` and `../_shared/references/project-health-format.md`. Update health, technical debt, and extensibility sections with test audit findings. Write `<!-- Last updated by: audit-tests, <date> -->`.
  - **Step 9 — Graceful Stop**: If user says "stop" at any point, write partial report with a step-specific marker. Per-step detail:
      - **During Step 2 (Discover Test Infrastructure)**: `<!-- partial — interrupted during test infrastructure discovery. Frameworks found: [list]. Directories scanned: [list]. -->` Persist discovered infrastructure.
      - **During Step 3 (Map Coverage)**: `<!-- partial — interrupted during coverage mapping. Infrastructure discovered. Coverage map partial: [N] of [M] source files mapped. -->` Persist infrastructure + partial coverage map.
      - **During Step 4 (Spawn Reviewers)**: `<!-- partial — interrupted during reviewer spawning. Reviewers launched: [list]. Reviewers not launched: [list]. -->` Persist any completed reviewer findings (returned inline in agent responses).
      - **During Step 5 (Synthesize)**: `<!-- partial — interrupted during synthesis. Reviewers complete. Synthesis partial: [categories merged]. -->` Persist all reviewer findings + partial synthesis.
      - **During Step 6 (Propose Side Quest)**: `<!-- partial — interrupted during side quest proposal. Findings synthesized. Quest not yet created. -->` Persist synthesized findings.
      - **During Step 7 (Write Report)**: `<!-- partial — interrupted during report writing. Findings complete. Report incomplete. -->` Persist all findings (report can be regenerated on resume).
      - **During Step 8 (Refresh Health)**: `<!-- partial — interrupted during project-health refresh. Audit report complete. Project-health.md not updated. -->` Audit report is already written.
      - On resume (detected in Step 1), read the partial report and continue from where it left off.
  - **Step 10 — Expertise Check**: Reflect on conversation. If new expertise info observed, read `../_shared/references/expertise-tracking.md` and update `~/.claude/CLAUDE.md`. Otherwise skip silently.
- [ ] **Create `skills/audit-tests/references/` directory**: Add reference files:
  - `guidance.md` — contents: (1) severity level definitions (Critical, Important, Minor — matching audit-architecture convention), (2) shared reviewer output format (findings table with columns: Severity, Description, Evidence, Suggested Action), (3) side quest proposal template (name, goal, scope, verification criteria), (4) test-specific finding categories (coverage gap, stale test, quality issue, strategy misalignment). Does NOT include fitness functions, invariants, or maturity criteria (those are architecture-specific).
  - `sub-agent-prompts.md` — fully self-contained templates for the 4 reviewer sub-agents (coverage gap, stale test, quality, strategy). Each template must include `{placeholders}`, explicit "do NOT read parent skill files" instructions, and defined output format matching the findings table schema from `guidance.md` (Severity, Description, Evidence, Suggested Action).
- [ ] **Register in `scripts/install-skills.sh`**: Add `"audit-tests"` to the `SKILL_DIRS` array (alphabetical order, after `audit-docs`).
- [ ] **Test on this repo**: Invoke `/audit-tests` end-to-end on the goodplan repo (1075 tests across 93 files). Verify it correctly maps source files to test files, spawns reviewers, identifies any coverage gaps, evaluates strategy against conventions, writes audit report to `.project/audits/`, and produces a well-formed side quest proposal.

### Post-Completion

- **Track audit-architecture divergence**: After both skills are complete and verified, propose a side quest (via `echo '{"name":"audit-arch-quest-create","goal":"..."}' | goodplan quest:create --json`) to update `/audit-architecture` to use `goodplan quest:create` instead of direct filesystem writes for side quest creation, aligning it with the new skills.
- **Consolidate shared audit conventions**: Consider extracting shared severity level definitions, findings table schema, and side quest proposal template from all three audit skills into `skills/_shared/references/audit-conventions.md` to reduce drift risk. Acceptable to defer since all audit skills are new and some duplication preserves skill independence.

### Verification

- Skill file is valid (frontmatter parses with `name`, `description`, triggers; step numbering follows audit-architecture lifecycle)
- `bun run install:skills` installs the skill (registered in `SKILL_DIRS`)
- End-to-end invocation on goodplan repo: discovers test infrastructure, maps source-to-test files, spawns reviewers, produces structured findings, writes audit report to `.project/audits/tests-<date>.md`. Success criteria: audit report file exists at expected path, report contains at least one finding, each reviewer sub-agent returned structured findings matching the output format
- Static analysis correctly maps source to test files
- Side quest proposal is well-formed and actionable (`goodplan quest:create` compatible)
