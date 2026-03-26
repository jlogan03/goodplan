# Side Quest: Audit Docs and Tests

## What We're Building

Two new audit skills that detect drift, gaps, and staleness — one for documentation, one for tests. Both follow the pattern established by `/audit-architecture` (compare intended state against actual codebase, produce actionable output). Key difference: `/audit-docs` fixes issues directly; `/audit-tests` proposes a side quest for improvements.

## Dependencies

- **architecture-quality** side quest should be complete (establishes the audit skill pattern with `/audit-architecture`)

## What Changes

### New Skill: `/audit-docs`

Standalone skill that compares documentation against the actual codebase. Fixes issues directly rather than just reporting them.

**How it works**:
1. Discover all documentation sources (README files, doc directories, inline doc comments, API docs, `.project/` docs, architecture files, CLAUDE.md files)
2. Read actual codebase (exports, public APIs, module structure, configuration, CLI commands, environment variables)
3. Evaluate:
   - **Stale docs** — documentation references code, APIs, config, or features that no longer exist
   - **Incorrect docs** — documentation describes behavior that doesn't match the actual implementation
   - **Gap detection** — public APIs, exported functions, CLI commands, or config options that have no documentation
   - **Internal consistency** — cross-references between docs that contradict each other
   - **Example validity** — code examples in docs that won't compile or produce wrong output
4. For each issue found:
   - Fix directly (update text, remove stale references, add missing docs for undocumented APIs)
   - Present changes to user for confirmation before writing
5. Summary report of what was fixed and any issues that require user judgment (e.g., whether a feature should be documented or is intentionally internal)

**Scope of "documentation"**: READMEs, `docs/` directories, JSDoc/docstrings, API documentation, `.project/` workflow files, architecture files, CLAUDE.md files, inline comments that describe module purpose or public API contracts. Does NOT include inline implementation comments (those are code quality, not documentation).

### New Skill: `/audit-tests`

Standalone skill that evaluates test quality, coverage, and strategy alignment. Produces a side quest when improvements are needed.

**How it works**:
1. Read project conventions (`.project/conventions.md`, `.project/architecture/`) to understand intended testing strategy
2. Discover all test files and test infrastructure (frameworks, helpers, fixtures, mocks, CI config)
3. Evaluate:
   - **Coverage gaps** — modules, APIs, or flows with no test coverage (use actual coverage data if available, otherwise static analysis of what's tested vs what exists)
   - **Stale tests** — tests for code that no longer exists, or tests importing deleted modules
   - **Incorrect tests** — tests that pass but don't actually verify what they claim (e.g., mocking away the thing being tested, assertions that are always true)
   - **Strategy alignment** — does the test distribution match the intended strategy? (e.g., conventions say "integration tests for API layer" but only unit tests exist)
   - **Test quality** — fragile tests (time-dependent, order-dependent, flaky patterns), tests coupled to implementation details rather than behavior, excessive mocking
   - **Missing test categories** — if conventions specify certain test types (e2e, integration, unit, snapshot) but some categories are absent
   - **Test infrastructure** — are helpers/fixtures well-organized? Is there unnecessary duplication across test files?
4. Produce prioritized findings grouped by severity (critical gaps, quality issues, strategy misalignment, minor improvements)
5. If actionable improvements exist, draft a side quest `goal.md` with:
   - Specific test files to add/update/remove
   - Strategy adjustments to propose
   - Verification criteria for the improvements
6. Present findings and proposed side quest to user for review

**Testing strategy evaluation** goes beyond coverage numbers:
- Are the right things tested at the right level? (Unit vs integration vs e2e)
- Do test boundaries match module boundaries? (Tests coupled to implementation internals = red flag)
- Is the test pyramid balanced for the project's risk profile?
- Are critical paths tested end-to-end?
- Do tests serve as living documentation of expected behavior?

## Success Criteria

- Run `/audit-docs` on a project with implemented code:
  - Discovers stale documentation referencing removed features
  - Identifies undocumented public APIs
  - Fixes issues directly with user confirmation
  - Distinguishes between "fix directly" and "needs user judgment"
- Run `/audit-tests` on a project with implemented code:
  - Identifies coverage gaps with specific recommendations
  - Evaluates testing strategy alignment with conventions
  - Detects stale or incorrect tests
  - Produces a well-formed side quest goal.md when improvements are needed
  - Findings are prioritized by impact, not just alphabetical

## Verification

- [ ] `/audit-docs` discovers all documentation sources in a project
- [ ] `/audit-docs` detects stale docs referencing removed code
- [ ] `/audit-docs` detects gaps (undocumented public APIs)
- [ ] `/audit-docs` fixes issues directly with user confirmation
- [ ] `/audit-docs` flags ambiguous cases for user judgment
- [ ] `/audit-tests` reads and evaluates against project testing conventions
- [ ] `/audit-tests` identifies coverage gaps with specific recommendations
- [ ] `/audit-tests` detects stale tests for removed code
- [ ] `/audit-tests` evaluates testing strategy (not just coverage numbers)
- [ ] `/audit-tests` produces a side quest goal.md for improvements
- [ ] `/audit-tests` findings are prioritized by severity and impact

## Scope Boundaries

**In scope**: `/audit-docs` (new skill), `/audit-tests` (new skill)

**Out of scope**: Implementing test fixes (that's the side quest `/audit-tests` generates), architecture auditing (that's `/audit-architecture` in architecture-quality), code quality linting (separate concern)
