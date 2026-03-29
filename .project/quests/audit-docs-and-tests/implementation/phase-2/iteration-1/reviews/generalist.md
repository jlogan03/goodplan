# Phase 2 Review: `/audit-tests` Skill

**Reviewer**: Generalist
**Score**: 9/10

## Summary

The `/audit-tests` skill is well-implemented, closely follows the approved `/audit-docs` pattern from Phase 1, and adheres to all plan requirements. The lifecycle envelope is structurally identical, the domain-specific middle steps are correctly adapted for test auditing, and all reference files are complete and self-contained. The install script registration is correct and alphabetically ordered.

## Findings

### Critical: 0

None.

### Important: 1

**I-1: Audit report format missing "Overall Assessment" section relative to plan spec**

The plan (line 112, Step 7) specifies the report format should begin with `## Overall Assessment` containing a 2-3 sentence summary of test suite health. The SKILL.md Step 7 (lines 159-189) includes this correctly. No issue in the implementation -- this is properly handled.

*Retracted after re-reading.* No Important issues found.

### Minor: 3

**M-1: `audit-docs` SKILL.md has "Fixes Applied" report section; `audit-tests` does not**

`audit-docs` Step 6 report format includes a `## Fixes Applied` section because it auto-fixes trivial issues with user approval. `audit-tests` correctly omits this since it does not apply fixes (it only proposes side quests). This is intentional and correct -- noting it as a conscious divergence, not a bug.

**M-2: Guidance severity examples could better differentiate from audit-docs**

The `guidance.md` severity examples are well-tailored to tests (e.g., "test that always passes regardless of code behavior" for CRITICAL), but the CRITICAL example "No tests for core business logic" overlaps with IMPORTANT's "Public API with no test coverage." The severity assignment rules section (lines 14-21) correctly disambiguates these via consumer count and false-confidence criteria, so this is just a minor readability concern in the examples table.

**M-3: Sub-agent prompts use `{placeholders}` but SKILL.md Step 4 placeholder mapping doesn't cover all of them**

SKILL.md Step 4 (line 113) documents placeholder mapping: `{coverage_map}`, `{source_file_list}`, `{test_file_list}`, `{test_infrastructure_summary}`, `{conventions_summary}`. The sub-agent prompts use exactly these placeholders. All placeholders are accounted for. However, the quality reviewer prompt only uses `{test_file_list}` and `{test_infrastructure_summary}` (not `{coverage_map}`, `{source_file_list}`, or `{conventions_summary}`), which is correct since the quality reviewer focuses on test code quality rather than coverage. Worth noting that this asymmetry is intentional and appropriate.

## Pattern Consistency with audit-docs

| Aspect | audit-docs | audit-tests | Match? |
|---|---|---|---|
| Frontmatter format | name, description, requires | name, description, requires | Yes |
| Lifecycle envelope | Steps 0-1 setup, Steps 8-9 teardown | Steps 0-1 setup, Steps 9-10 teardown | Yes (consistent envelope, different step count) |
| Version check | Step 0, identical pattern | Step 0, identical pattern | Yes |
| Load context | Step 1, 5 substeps (1a-1e) | Step 1, 5 substeps (1a-1e) | Yes |
| Resume detection | `docs-*.md` glob | `tests-*.md` glob | Yes (domain-adapted) |
| Epic scope detection | `goodplan status --json` | `goodplan status --json` | Yes |
| Sub-agent model | `"opus"` | `"opus"` | Yes |
| Findings inline (not disk) | Yes | Yes | Yes |
| Side quest via CLI | `goodplan quest:create --json` | `goodplan quest:create --json` | Yes |
| Report overwrite on same day | Yes | Yes | Yes |
| Graceful stop markers | Per-step, inline | Per-step, inline | Yes |
| Project health refresh | Read format ref, update sections, confirm | Read format ref, update sections, confirm | Yes |
| Expertise check | Last step, skip silently if no new info | Last step, skip silently if no new info | Yes |
| "When to Ask" section | Present | Present | Yes |
| References section | Present, same structure | Present, same structure | Yes |
| "Does NOT use iteration-loop.md" | Stated | Stated | Yes |
| `mkdir -p .project/audits` | In report step | In report step | Yes |

## Plan Adherence

| Plan Requirement | Status |
|---|---|
| SKILL.md with correct frontmatter (name, description ~270 chars, triggers) | Met |
| 4 reviewer sub-agents (coverage, stale, quality, strategy) | Met |
| Static analysis coverage mapping (no coverage tools) | Met |
| Side quest via `goodplan quest:create --json` | Met |
| Graceful stop markers per step | Met |
| Resume detection in Step 1 | Met |
| Report format with summary table, category sections, side quests, deferred | Met |
| Project health refresh with confirm-before-write | Met |
| Registered in `scripts/install-skills.sh` (alphabetical, after audit-docs) | Met |
| guidance.md: severity levels, output format, side quest template, test categories | Met |
| sub-agent-prompts.md: 4 self-contained templates with placeholders, "do NOT read" instructions, output format | Met |
| Install succeeds (`bun run install:skills`) | Met (per build report) |

## Cross-File Integration

- SKILL.md Step 4 correctly references `references/sub-agent-prompts.md` and documents the placeholder mapping
- SKILL.md Step 1e correctly references `references/guidance.md`
- Sub-agent prompt output formats match the finding schema in `guidance.md`
- The 4 finding categories in `guidance.md` (coverage-gap, stale-test, quality-issue, strategy-misalignment) match the 4 reviewer types and the report section headings
- The project health refresh mapping table in `guidance.md` correctly maps test categories to health sections

## Conclusion

Clean implementation with strong pattern consistency. The skill correctly adapts the audit-docs pattern for test analysis while maintaining the lifecycle envelope. All plan requirements are met. The three minor observations are cosmetic and do not require changes.
