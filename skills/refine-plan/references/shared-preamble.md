# Shared Reviewer Preamble

Use this file when assembling reviewer instructions. Inline orchestration may read it directly, and helper agents may read it via the bootstrap prompt. Replace `{placeholders}` with actual values.

---

```
## Plan Location

PLAN TYPE: {plan_type}

For single-file plans:
  Plan file: {absolute path to plan file}

For directory-based plans:
  Overview: {absolute path to _overview.md}
  Phase files (in order): {list of absolute paths to phase files}

Read ALL plan files using the Read tool before beginning your evaluation.

## Confirmed Goal

{confirmed_goal}

All evaluation must be anchored to this goal.

## Available Research

{research_file_paths}

Read listed files if they would inform your evaluation. Do not read files outside this list.

## Team Defaults

{team_defaults}

## Codebase Exploration

Explore the actual codebase before evaluating — plans that look sound in isolation often conflict with existing code, miss reuse opportunities, or propose changes to files that don't exist. Evaluating without exploration leads to false positives and missed issues.

Each reviewer's prompt includes a domain-specific Codebase Exploration Focus section — follow those directions.

## Output

### File Output (primary)

Write your full review to: {run_dir}/round-{iteration}/reviews/{reviewer_name}.md

Use these section headers in the file:

## Issues
[Each with severity (CRITICAL/IMPORTANT/MINOR), resolution tag, file path]

For each issue:

**[CRITICAL]** Brief issue title
Description of the issue, what's wrong, and how to fix it.
Resolution: DIRECTLY_ACTIONABLE

(Use severity CRITICAL, IMPORTANT, or MINOR.)
(Resolution must be: DIRECTLY_ACTIONABLE, RESEARCH_NEEDED, CODEBASE_EXPLORATION, or USER_INPUT.)
(How your tags drive the loop: DIRECTLY_ACTIONABLE items are applied by the plan editor. RESEARCH_NEEDED spawns a research sub-agent that writes docs to `<scope_dir>/research/` — be specific about what to look up and suggest sources. CODEBASE_EXPLORATION works the same way but uses Grep/Glob/Read instead of external search. USER_INPUT is batched and presented to the user; their answers are recorded and passed to the plan editor as resolved items. All results carry forward to the next review cycle.)
(For RESEARCH_NEEDED: include a `Research:` line specifying what to look up, why it matters for this review, and suggested sources — e.g., "Research: Check if LibX v3 removed the `fooBar()` API — the plan relies on it but the migration guide mentions breaking changes. Source: LibX changelog or docs.")
(If no issues found, write "No issues found.")

## Score: X/10
Brief justification. If below 9, explain what would bring it to 9+.

## Summary
- Critical: N
- Important: N
- Minor: N

### Return Value (summary only)

After writing the file, return ONLY this one-line summary:
{reviewer_name} | Score: X/10 | Critical: N, Important: N, Minor: N

### Inline Fallback

If running inline (no sub-agent), output the full review directly — file-based output only saves context when sub-agents are used.
```
