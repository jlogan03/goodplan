# Plan: Audit Docs and Tests

## Overview

Two new audit skills following the `/audit-architecture` pattern — parallel sub-agent reviewers that analyze the codebase, produce findings, and take action. `/audit-docs` compares documentation against the actual codebase, auto-fixes small issues, confirms large changes, and proposes side quests for significant improvements. `/audit-tests` evaluates test quality, coverage gaps, and strategy alignment using static analysis, then proposes a side quest for improvements.

Both skills live in `skills/` (repo source of truth) and are installed via `bun run install:skills`. No CLI code changes — these are pure skill files.

Key design decisions:
- **Sub-agent reviewers** for parallel analysis — both skills spawn domain-specific reviewer agents (matching the audit-architecture pattern)
- **Auto-fix small, confirm large** — `/audit-docs` auto-applies trivial fixes (typos, dead links, stale references) and presents substantive changes for user confirmation
- **Static analysis for coverage** — `/audit-tests` compares test files against source files rather than depending on coverage tools
- **Side quest proposals** — both skills can propose side quests for improvements that exceed the scope of direct fixes

## Phase 1: `/audit-docs` Skill

Create the documentation audit skill with sub-agent reviewers, auto-fix capability, and side quest proposals.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/audit-docs/SKILL.md` fails — skill doesn't exist
- [ ] `grep -c 'audit-docs' skills/audit-docs/SKILL.md` fails — no skill file

**After implementation** (should pass / show presence):
- [ ] `ls skills/audit-docs/SKILL.md` succeeds — skill file exists
- [ ] `grep -c 'sub-agent\|reviewer' skills/audit-docs/SKILL.md` returns >= 1 — uses reviewer pattern
- [ ] `grep -c 'auto-fix\|AskUserQuestion' skills/audit-docs/SKILL.md` returns >= 1 — fix flow implemented
- [ ] `grep -c 'quest:create\|side quest' skills/audit-docs/SKILL.md` returns >= 1 — proposes side quests
- [ ] Skill frontmatter has correct `name`, `description`, and trigger patterns

### Tasks

- [ ] **Create `skills/audit-docs/SKILL.md`**: The main skill file. Structure:
  - **Step 0 — Version Check**: Standard CLI version check (`goodplan --version --json`)
  - **Step 1 — Discover Documentation Sources**: Scan for READMEs, `docs/` directories, `.project/` workflow files (architecture, conventions, idea.md, learnings), CLAUDE.md files, JSDoc/docstring-heavy files, module-purpose comments. Use Glob patterns for discovery. Record what was found.
  - **Step 2 — Read Codebase Reality**: Read actual exports, public APIs, module structure, CLI commands (from `goodplan --help` or command files), configuration options, environment variables. Build a map of "what exists" to compare against "what's documented."
  - **Step 3 — Spawn Reviewer Sub-Agents**: Parallel reviewers for different doc dimensions:
    - **Staleness reviewer**: Finds docs referencing removed code, APIs, config, or features
    - **Gap reviewer**: Finds undocumented public APIs, exports, CLI commands, config options
    - **Consistency reviewer**: Finds cross-references between docs that contradict each other, and code examples that won't work
    - Each reviewer writes findings to a file. Orchestrator synthesizes.
  - **Step 4 — Classify and Act on Findings**: For each finding:
    - **Trivial** (typos, dead links, stale single-line references): auto-fix, present summary after
    - **Substantive** (rewrites, new doc sections, structural changes): present with diff preview, use AskUserQuestion for confirmation
    - **Large scope** (missing entire doc sections, documentation strategy gaps, cross-cutting inconsistencies): propose as side quest via `goodplan quest:create`
  - **Step 5 — Summary Report**: Present findings table with counts by category, what was fixed, what was proposed as side quests, what needs user judgment.
- [ ] **Create `skills/audit-docs/references/` directory**: Add reference files as needed:
  - `reviewer-prompts.md` — prompts for the 3 reviewer sub-agents (staleness, gap, consistency)
  - `doc-discovery-patterns.md` — glob patterns and heuristics for finding documentation sources across different project types (TypeScript, Python, Rust, etc.)
- [ ] **Add trigger patterns to SKILL.md frontmatter**: Common triggers: 'audit docs', 'check documentation', 'are the docs up to date', 'find stale docs', 'documentation audit', 'audit documentation', 'review docs', 'check for undocumented APIs'.
- [ ] **Test on this repo**: Run `/audit-docs` on the goodplan repo to verify it discovers sources, finds issues, and the fix/propose flow works. Verify it handles the `.project/` documentation (architecture files, conventions, learnings) correctly.

### Verification

- Skill file is valid (frontmatter parses, triggers match, step numbering is correct)
- Reviewer sub-agents produce structured findings
- Auto-fix applies without breaking existing docs
- Side quest proposals are well-formed (`goodplan quest:create` compatible)

## Phase 2: `/audit-tests` Skill

Create the test audit skill with sub-agent reviewers, static analysis, and side quest proposals.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/audit-tests/SKILL.md` fails — skill doesn't exist

**After implementation** (should pass / show presence):
- [ ] `ls skills/audit-tests/SKILL.md` succeeds — skill file exists
- [ ] `grep -c 'sub-agent\|reviewer' skills/audit-tests/SKILL.md` returns >= 1 — uses reviewer pattern
- [ ] `grep -c 'static analysis\|coverage' skills/audit-tests/SKILL.md` returns >= 1 — static coverage analysis
- [ ] `grep -c 'quest:create\|side quest' skills/audit-tests/SKILL.md` returns >= 1 — proposes side quests
- [ ] Skill frontmatter has correct `name`, `description`, and trigger patterns

### Tasks

- [ ] **Create `skills/audit-tests/SKILL.md`**: The main skill file. Structure:
  - **Step 0 — Version Check**: Standard CLI version check
  - **Step 1 — Load Testing Context**: Read `.project/conventions.md` for intended testing strategy. Discover test infrastructure: frameworks (jest, vitest, pytest, bun test, etc.), config files, test directories, helper/fixture patterns. Record what exists.
  - **Step 2 — Map Source-to-Test Coverage**: Static analysis — for each source module/file, check if a corresponding test file exists. Build a coverage map: `{ source: string, testFile: string | null, hasTests: boolean }`. Don't run coverage tools — just compare file structures.
  - **Step 3 — Spawn Reviewer Sub-Agents**: Parallel reviewers:
    - **Coverage gap reviewer**: Identifies modules/APIs with no test coverage. Prioritizes by: public API > internal module > utility.
    - **Stale test reviewer**: Finds tests importing deleted modules, testing removed features, or referencing old APIs.
    - **Quality reviewer**: Detects fragile patterns (time-dependent, order-dependent, excessive mocking, assertions that are always true, tests coupled to implementation details).
    - **Strategy reviewer**: Compares test distribution against conventions — are the right things tested at the right level? Is the test pyramid balanced?
    - Each writes findings to a file.
  - **Step 4 — Synthesize and Prioritize**: Merge findings, deduplicate, prioritize by severity (critical gaps > stale tests > quality issues > strategy misalignment > minor improvements).
  - **Step 5 — Propose Side Quest**: If actionable improvements exist, draft a side quest goal with specific files to add/update/remove, strategy adjustments, and verification criteria. Create via `goodplan quest:create`. Present findings and proposal to user.
  - **Step 6 — Summary Report**: Present findings table by category and severity.
- [ ] **Create `skills/audit-tests/references/` directory**: Add reference files:
  - `reviewer-prompts.md` — prompts for the 4 reviewer sub-agents
  - `test-patterns.md` — heuristics for test file discovery, common framework conventions, and source-to-test mapping patterns across project types
- [ ] **Add trigger patterns to SKILL.md frontmatter**: Common triggers: 'audit tests', 'check test coverage', 'are the tests good', 'test quality', 'audit testing', 'review test strategy', 'find stale tests', 'test audit'.
- [ ] **Test on this repo**: Run `/audit-tests` on the goodplan repo (1075 tests across 93 files). Verify it correctly maps source files to test files, identifies any coverage gaps, evaluates strategy against conventions, and produces a well-formed side quest proposal.

### Verification

- Skill file is valid (frontmatter, triggers, step numbering)
- Static analysis correctly maps source → test files
- Reviewer sub-agents produce structured, prioritized findings
- Side quest proposal is well-formed and actionable
