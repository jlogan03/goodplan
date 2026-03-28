# Audit Tests Guidance

Severity definitions, reviewer output format, side quest template, and test-specific finding categories for the audit-tests skill.

## Finding Severity Levels

| Severity | Definition | Examples |
|----------|-----------|----------|
| **CRITICAL** | Missing tests for critical paths or tests that give false confidence | No tests for core business logic; test that always passes regardless of code behavior; test mocking the thing it's supposed to test |
| **IMPORTANT** | Significant coverage gap or quality issue that undermines test reliability | Public API with no test coverage; test importing a deleted module (always passes vacuously); time-dependent test that flakes in CI |
| **MINOR** | Worth noting but not urgent | Utility function without a test; slightly redundant test; minor naming mismatch between test and source |
| **INFO** | Observation, not a problem | Test coverage is thorough in this area; good test strategy alignment |

### Severity Assignment Rules

- A missing test for a public API with 3+ consumers is IMPORTANT; with fewer consumers is MINOR.
- Any test that gives false confidence (always passes, mocks the system under test) is CRITICAL.
- A stale test that imports a deleted module is IMPORTANT (it passes vacuously, hiding a coverage gap).
- Tests with fragile patterns (time-dependent, order-dependent) are IMPORTANT if they affect CI reliability, MINOR otherwise.
- Strategy misalignment is IMPORTANT if it means the wrong things are tested (e.g., heavy integration tests for pure logic), MINOR if it's just suboptimal distribution.
- A single missing test is MINOR; a pattern of missing tests (3+) in the same module is IMPORTANT.

## Reviewer Output Format

Each reviewer returns findings as structured markdown. All findings must use this schema:

```markdown
### Finding <N>: <brief title>
- **Severity**: <CRITICAL | IMPORTANT | MINOR | INFO>
- **Category**: <coverage-gap | stale-test | quality-issue | strategy-misalignment>
- **Description**: <what's wrong and why it matters>
- **Evidence**:
  - <specific file paths, line references, code snippets>
  - <what exists vs what's tested or missing>
- **Suggested Action**: <specific fix — file path, what to add/change/remove>
```

### Rules for Reviewers

- Be specific: file paths, line numbers, exact imports. Vague findings are not actionable.
- Report what you find, not what you think should be. Evidence-based findings only.
- Each finding must have a clear Suggested Action — "add more tests" is too vague.
- If unsure whether something is intentional, include it as INFO with a note.

## Side Quest Proposal Template

When findings are actionable (CRITICAL or IMPORTANT severity), propose a side quest:

```json
{
  "name": "<descriptive-kebab-case-name>",
  "goal": "<1-3 sentence goal describing what tests to add/fix/remove, which files are affected, strategy adjustments, and what 'done' looks like>"
}
```

### Side Quest Criteria

- **Scope**: Side quests should cover a coherent improvement area, not individual missing tests.
- **Actionability**: The goal must be specific enough that someone can start working immediately.
- **Verification**: The goal should include what "done" looks like (e.g., "all public exports in src/core/ have at least one test; all stale tests in src/legacy/ are removed or updated").

## Test-Specific Finding Categories

### Coverage Gap

Source code that lacks test coverage:

- **Untested public APIs**: Exported functions, types, or interfaces with no test file
- **Untested critical paths**: Core business logic, state transitions, or error handling with no tests
- **Untested integration points**: Module boundaries, external service interfaces, or data layer operations with no integration tests
- **Partial coverage**: Module has tests but significant code paths are untested (conditionals, error branches, edge cases)

### Stale Test

Tests that are outdated or no longer valid:

- **Dead imports**: Tests importing modules, functions, or types that no longer exist
- **Removed feature tests**: Tests exercising features or behaviors that have been removed from the codebase
- **Old API references**: Tests calling functions with outdated signatures, wrong parameter counts, or deprecated patterns
- **Orphaned test files**: Test files with no matching source file (source was deleted or moved)

### Quality Issue

Tests that exist but have reliability or design problems:

- **Time-dependent**: Tests that depend on wall-clock time, timezones, or date formatting
- **Order-dependent**: Tests that pass only when run in a specific order or fail when run in isolation
- **Excessive mocking**: Tests that mock so much of the system that they test the mocks, not the code
- **Always-true assertions**: Assertions that pass regardless of code behavior (e.g., `expect(true).toBe(true)`, asserting on the mock return value)
- **Implementation coupling**: Tests that break when refactoring internals without changing behavior (testing private methods, asserting on internal state)
- **Missing assertions**: Test functions that run code but never assert anything

### Strategy Misalignment

Test distribution that doesn't match project needs:

- **Inverted test pyramid**: More integration/E2E tests than unit tests for pure logic
- **Convention mismatch**: Testing strategy doesn't align with `.project/conventions.md` or stated project goals
- **Wrong level of testing**: Unit tests for things that need integration tests (or vice versa)
- **Unbalanced coverage**: Some modules over-tested while critical modules are under-tested

## Project Health Refresh

Test audit findings map to project-health sections:

| Finding Category | Profile Section | Rationale |
|---|---|---|
| **Coverage Gap** | **Technical Debt** | Missing tests for public APIs is testing debt |
| **Coverage Gap** | **Extensibility** | Untested public APIs are fragile to future changes |
| **Stale Test** | **Health** | Stale tests indicate neglected zones — maintenance is not keeping up |
| **Stale Test** | **Technical Debt** | Tests that pass vacuously hide real coverage gaps |
| **Quality Issue** | **Health** | Fragile tests undermine CI reliability and developer confidence |
| **Strategy Misalignment** | **Technical Debt** | Wrong-level testing is structural debt that compounds over time |

### Sections NOT Updated by Audit

- **Recent Changes**: Driven by slice completion, not audit. Audit should not touch this section.
