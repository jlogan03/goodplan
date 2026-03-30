# Generalist Review: Phase 1 -- `/audit-docs` Skill

**Score: 7/10**

## Summary

The skill is well-structured, comprehensive, and follows the audit-architecture lifecycle pattern closely. The three reference files (SKILL.md, guidance.md, sub-agent-prompts.md) are complete and internally consistent. The install script registration is correct. Two issues prevent a higher score: a dash convention mismatch that will break resume detection, and the end-to-end test task was not completed.

## Critical Issues (1)

### C1: Graceful stop markers use `--` instead of `---` (em-dash), breaking resume detection

The plan explicitly specifies em-dash markers (`<!-- partial --- interrupted`) matching audit-architecture's convention. The plan also warns: "marker wording must not be changed without updating resume detection logic."

The implementation uses double-hyphens throughout:
- `<!-- partial -- interrupted during source discovery...`
- Resume detection in Step 1d searches for `<!-- partial -- interrupted`

audit-architecture uses em-dashes:
- `<!-- partial --- interrupted during gap analysis...`
- Resume detection searches for `<!-- partial --- interrupted`

This means:
1. A future cross-audit-skill resume detector would fail to match audit-docs markers
2. The markers diverge from the canonical format specified in the plan
3. The `--` vs `---` distinction extends to all section headers (`## Step 0 -- Version Check` vs `## Step 0 --- Version Check`), creating a style inconsistency across the audit skill family

**Fix**: Replace all `--` with `---` in SKILL.md to match the plan and audit-architecture convention. This is a global find-replace.

## Important Issues (1)

### I1: End-to-end test not completed

The plan's task list includes: "Test on this repo: Invoke /audit-docs end-to-end on the goodplan repo." This checkbox remains unchecked. The build report confirms installation succeeded, but the actual invocation test was not run. The verification section explicitly requires: "audit report file exists at expected path, report contains at least one finding."

This is important because skill files are instructions for an LLM -- subtle issues (ambiguous wording, missing context in sub-agent prompts, incorrect CLI invocation syntax) only surface during actual execution. Static review cannot substitute for a live run.

## Minor Issues (3)

### M1: Side quest creation uses pipe syntax that may not work with `goodplan quest:create`

Step 5 shows:
```bash
echo '{"name":"<descriptive-name>","goal":"..."}' | goodplan quest:create --json
```

The plan uses the same syntax. However, it is worth verifying that `goodplan quest:create` actually reads JSON from stdin. If `--json` only controls output format (as the plan notes), the input mechanism needs confirmation. This could silently fail during execution.

### M2: No graceful stop markers for Steps 0, 1, or 9

Steps 0 (Version Check), 1 (Load Context), and 9 (Expertise Check) have no graceful stop markers. While these are brief steps where interruption is unlikely, audit-architecture also lacks them, so this is consistent. Noting for completeness.

### M3: `{placeholders}` in sub-agent prompts lack documentation of expected content shape

The sub-agent prompts use `{documentation_sources_list}` and `{codebase_reality_summary}` but don't specify what format these should be in (bullet list? JSON? prose?). The orchestrator must decide at runtime, which could lead to inconsistent reviewer inputs. A brief note in sub-agent-prompts.md about expected format would help.

## Positive Observations

- **Guidance file is thorough**: Severity definitions, assignment rules, category breakdowns, and project health mapping are all well-defined and consistent with audit-architecture conventions.
- **Sub-agent prompts are genuinely self-contained**: Each includes severity rules, output format, and explicit "do NOT read SKILL.md" instructions as required.
- **Install script registration is correct**: `audit-docs` is in alphabetical position after `audit-architecture`.
- **Lifecycle envelope matches audit-architecture**: Steps 0-1 (setup) and final steps (report, health refresh, graceful stop, expertise) follow the same structural pattern.
- **Plan checkboxes updated appropriately**: Three of four tasks checked off, with the end-to-end test correctly left unchecked.
