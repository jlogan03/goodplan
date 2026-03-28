---
name: audit-tests
description: >
  Audit test quality and coverage using static analysis. Spawns parallel
  reviewers to find coverage gaps, stale tests, fragile patterns, and strategy
  misalignment. Proposes side quests for improvements. Common triggers: 'audit
  tests', 'check test coverage', 'are the tests good', 'test quality',
  'audit testing', 'review test strategy'.
requires: goodplan >= 1.0.0
---

# Audit Tests

Evaluate test quality, coverage, and strategy alignment using static analysis. Four functions:

1. **Coverage gap detection** — source modules with no corresponding test file, prioritized by visibility
2. **Stale test detection** — tests importing deleted modules, testing removed features, or referencing old APIs
3. **Quality detection** — fragile patterns (time-dependent, order-dependent, excessive mocking, assertions that are always true, implementation coupling)
4. **Strategy alignment** — test distribution vs conventions, test pyramid balance, right things tested at the right level

Produces actionable output: prioritized findings and side quest proposals for improvements.

**Does NOT use `iteration-loop.md`** — the pattern here (parallel reviewers, synthesize, propose) is structurally distinct from the review-iterate loop.

## Step 0 — Version Check

Read `../_shared/references/cli-interaction.md` for CLI interaction conventions and error handling patterns.

Verify CLI availability and compatibility:

```bash
goodplan --version --json
```

If the command fails (not found, non-zero exit), stop: "The `goodplan` CLI is required but not found. Install it with `bun run build` in the goodplan repo, or ensure it's on your PATH."

If the version doesn't satisfy `requires: goodplan >= 1.0.0`, stop: "This skill requires goodplan >= 1.0.0 but found X.Y.Z. Upgrade the CLI."

## Step 1 — Load Context

**1a. Load learnings and conventions**: Load learnings via `goodplan learning:list --json`. Read `.project/conventions.md` (if it exists) — pay particular attention to any stated testing strategy or conventions.

**1b. Load recent activity-log**: Query recent activity for project context:

```bash
goodplan state --json --query '[.["activity-log.jsonl"][]] | .[-20:]'
```

**1c. Expertise check (load)**: Read `## Expertise` section from `~/.claude/CLAUDE.md` to calibrate communication depth.

**1d. Resume detection**: Glob `.project/audits/tests-*.md` and read the most recent. If it contains a `<!-- partial — interrupted` marker, present the partial report and ask: resume from where it left off, or start fresh?

**1e. Read guidance**: Read `references/guidance.md` for severity levels, reviewer output format, and side quest template.

## Step 2 — Discover Test Infrastructure

**2a. Resolve epic scope**: Detect the active epic via CLI:

```bash
goodplan status --json
```

Check the `.activeEpic` field. If an active epic exists, include epic-scoped test directories in scope alongside project-level tests.

**2b. Discover test infrastructure**: Scan the project for testing setup using Glob and Read:

- **Framework detection**: Look for config files — `jest.config.*`, `vitest.config.*`, `bunfig.toml` (bun test), `.mocharc.*`, `karma.conf.*`, `playwright.config.*`, `cypress.config.*`. Read the config to understand framework settings, transforms, module resolution, and test patterns
- **Test directories**: Glob for `__tests__/`, `test/`, `tests/`, `spec/`, `*.test.*`, `*.spec.*`, `*.test-d.*` (type tests). Map the test directory structure
- **Helper and fixture patterns**: Look for `test-utils.*`, `test-helpers.*`, `fixtures/`, `__fixtures__/`, `__mocks__/`, `setup.*` files, factory functions. Record shared test infrastructure
- **Test scripts**: Read `package.json` scripts for test commands, coverage commands, and test-related configurations
- **CI integration**: Check `.github/workflows/` or similar for test-related CI steps

Focus on TypeScript/Node project patterns first (multi-language as future enhancement). Record what exists — build a complete picture of the test infrastructure.

**Graceful stop marker for this step**: `<!-- partial — interrupted during test infrastructure discovery. Frameworks found: {list}. Directories scanned: {list}. -->`

## Step 3 — Map Source-to-Test Coverage

Static analysis — build a prose coverage map by comparing source files against test files. Do NOT run coverage tools or execute tests.

**3a. Discover source files**: Glob for source files (e.g., `src/**/*.ts`) excluding test files, type declaration files, and generated files. Group by module/directory.

**3b. Match source to test files**: For each source file, check whether a corresponding test file exists using common conventions:

- `src/foo.ts` matches `src/foo.test.ts`, `src/__tests__/foo.test.ts`, `test/foo.test.ts`, `tests/foo.test.ts`
- `src/bar/index.ts` matches `src/bar/index.test.ts`, `src/bar/__tests__/index.test.ts`, `test/bar/index.test.ts`
- Check the framework config from Step 2 for custom test file patterns or directories

**3c. Build coverage map**: Produce a prose summary (NOT TypeScript syntax) listing:

- Source modules/directories with full test coverage
- Source modules/directories with partial test coverage (some files tested, some not)
- Source modules/directories with no test coverage
- Test files with no matching source file (potential stale tests)

Prioritize by visibility: public API surface > internal modules > utilities.

**Graceful stop marker for this step**: `<!-- partial — interrupted during coverage mapping. Infrastructure discovered. Coverage map partial: {N} of {M} source files mapped. -->`

## Step 4 — Spawn Reviewer Sub-Agents

Read `references/sub-agent-prompts.md` for self-contained reviewer templates.

Spawn four parallel reviewers (model: `"opus"`):

1. **Coverage gap reviewer**: Identifies modules/APIs with no test coverage. Prioritizes by: public API > internal module > utility. Input: coverage map + source file list + test infrastructure summary.
2. **Stale test reviewer**: Finds tests importing deleted modules, testing removed features, or referencing old APIs. Input: test file list + source file list + coverage map.
3. **Quality reviewer**: Detects fragile patterns — time-dependent, order-dependent, excessive mocking, assertions that are always true, tests coupled to implementation details. Input: test file list + test infrastructure summary.
4. **Strategy reviewer**: Compares test distribution against conventions — are the right things tested at the right level? Is the test pyramid balanced? Input: coverage map + conventions + test infrastructure summary.

Each reviewer returns findings inline in their agent response (not written to disk). The orchestrator (this skill) synthesizes all findings in Step 5.

**Placeholder mapping**: Fill `{coverage_map}` with the prose coverage map built in Step 3. Fill `{source_file_list}` with the source file inventory from Step 3a. Fill `{test_file_list}` with the test file inventory from Step 2b. Fill `{test_infrastructure_summary}` with the infrastructure discovered in Step 2. Fill `{conventions_summary}` with any testing conventions from `.project/conventions.md` loaded in Step 1a.

**Graceful stop marker for this step**: `<!-- partial — interrupted during reviewer spawning. Reviewers launched: {list}. Reviewers not launched: {list}. -->`

## Step 5 — Synthesize and Prioritize

Merge findings from all four reviewers:

1. **Deduplicate**: Same issue reported by multiple reviewers collapses to one finding (keep the most detailed version, note which reviewers flagged it).
2. **Prioritize by severity**: CRITICAL coverage gaps > stale tests > IMPORTANT quality issues > strategy misalignment > MINOR improvements.
3. **Group by category**: coverage-gap, stale-test, quality-issue, strategy-misalignment.
4. **Assess overall health**: Summarize the test suite's strengths and weaknesses in 2-3 sentences.

Present the synthesized findings to the user with counts by severity and category.

**Graceful stop marker for this step**: `<!-- partial — interrupted during synthesis. Reviewers complete. Synthesis partial: {categories_merged}. -->`

## Step 6 — Propose Side Quest

If actionable improvements exist (any CRITICAL or IMPORTANT findings), draft a side quest:

```bash
echo '{"name":"<descriptive-name>","goal":"<specific goal with files to add/update/remove, strategy adjustments, and verification criteria>"}' | goodplan quest:create --json
```

Capture the output to extract the created quest name for inclusion in the audit report's "Side Quests Created" section.

The side quest goal should include:
- Specific files to add, update, or remove
- Strategy adjustments if the strategy reviewer found misalignment
- Verification criteria (how to confirm the improvements are complete)

Present findings and the side quest proposal to the user.

If no actionable improvements exist (all findings are MINOR or INFO), skip quest creation and note in the report that the test suite is in good shape.

**Graceful stop marker for this step**: `<!-- partial — interrupted during side quest proposal. Findings synthesized. Quest not yet created. -->`

## Step 7 — Write Audit Report

```bash
mkdir -p .project/audits
```

Write findings to `.project/audits/tests-<YYYY-MM-DD>.md`. Same-day re-runs overwrite the previous report.

Report format:

```markdown
# Test Audit — <YYYY-MM-DD>

## Overall Assessment
<2-3 sentence summary of test suite health>

## Findings Summary
| # | Severity | Category | Finding | Action |
|---|----------|----------|---------|--------|
| 1 | ... | coverage-gap/stale-test/quality-issue/strategy-misalignment | ... | side-quest-name / noted |

## Coverage Gap Findings
<findings with evidence: source files missing tests, priority level, consumer count>

## Stale Test Findings
<findings with evidence: test files referencing removed code, specific imports/assertions>

## Quality Findings
<findings with evidence: fragile patterns, specific test files and line references>

## Strategy Findings
<findings with evidence: test pyramid analysis, convention misalignment, distribution issues>

## Side Quests Created
<list with quest names and goals>

## Deferred Findings
<findings not addressed, with rationale>
```

**Graceful stop marker for this step**: `<!-- partial — interrupted during report writing. Findings complete. Report incomplete. -->`

## Step 8 — Refresh Project Health

Update `.project/project-health.md` with findings from this audit.

1. **Read**: Read `.project/project-health.md` (if it exists) and `../_shared/references/project-health-format.md` for the canonical format.

2. **If missing**: Create `.project/project-health.md` using the format from `project-health-format.md`, populating initial content derived from audit findings:
   - **Health**: Areas with stale or missing tests indicate maintenance gaps
   - **Technical Debt**: Coverage gaps and quality issues are testing debt
   - **Extensibility**: Missing tests for public APIs indicate fragility risk for future changes

3. **If exists**: Update relevant sections, writing `<!-- Last updated by: audit-tests, <date> -->` at the end of each updated section:
   - **Health**: Incorporate stale test and quality findings — areas with fragile tests indicate neglected zones
   - **Technical Debt**: Incorporate coverage gap and quality findings as testing debt
   - **Extensibility**: Incorporate coverage gap findings about untested public APIs
   - **Recent Changes**: Not updated by audit (this is slice-driven)

4. **Confirm before writing**: Present a brief summary of proposed changes before writing. Proceed unless the user objects.

**Graceful stop marker for this step**: `<!-- partial — interrupted during project-health refresh. Audit report complete. Project-health.md not updated. -->`

## Step 9 — Graceful Stop

If the user says "stop" or "that's enough" at any point during the audit, write a partial report with the appropriate step-specific marker from the step where execution was interrupted. The markers are documented inline at each step above.

On resume (detected in Step 1d): read the partial report, identify which step was interrupted from the marker, and continue from where it left off.

## Step 10 — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise?

- **If yes**: Read `../_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently.

## When to Ask the User

Only stop and ask when you encounter:
- Ambiguity about whether a missing test is intentional (e.g., trivial utility deliberately untested)
- Test changes that would invalidate existing plans or active side quests
- Multiple valid interpretations of testing strategy
- Resume vs start fresh (Step 1d)

Do NOT ask for permission to continue between analysis steps.

## References

- **CLI interaction**: `../_shared/references/cli-interaction.md` — CLI conventions, error handling, invocation patterns
- **Guidance**: `references/guidance.md` — severity levels, reviewer output format, side quest template
- **Sub-agent prompts**: `references/sub-agent-prompts.md` — self-contained reviewer agent prompts
- **Expertise tracking**: `../_shared/references/expertise-tracking.md`
