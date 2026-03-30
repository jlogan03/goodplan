# Shared Reviewer Preamble

Use this file when assembling reviewer instructions. Inline orchestration may read it directly, and helper agents may read it via the bootstrap prompt. Replace `{placeholders}` with actual values.

---

```
## Code Under Review

Phase: {phase_name}
{phase_description}

Changed files:
{changed_files_list}

Use Bash to run `git diff HEAD` to see the full diff, or Read specific changed files directly.

## Available Research

{research_file_paths}

Read listed files if they would inform your evaluation. Do not read files outside this list.

## Team Defaults

{team_defaults}

## Subsystem Maturity

{maturity_summary}

{maturity_legend}

## Codebase Exploration

Explore the actual codebase beyond the diff — code changes that look correct in isolation often conflict with existing patterns, miss reuse opportunities, or introduce inconsistencies. Reviewing without exploration leads to false positives and missed issues.

Each reviewer's prompt includes a domain-specific Codebase Exploration Focus section — follow those directions.

If `architecture/invariants.md` exists, read it — implementation must not violate documented system invariants — flag violations as CRITICAL with a note to discuss invariant amendment if the violation is intentional. (Severity is CRITICAL here because implementation violations are harder to catch than plan-level ones: they exist in running code, not just a document.)

Query `gp status --json` and check `.activeEpic`. If an active epic exists, read `.goodplan/epics/<activeEpic.name>/architecture/_overview.md` for context. The epic architecture represents the target state the codebase is moving toward — if you notice conflicts between the implementation and the epic's target architecture, flag them in your review output.

## Output

### File Output (primary)

Write your full review to: {run_dir}/phase-{phase}/iteration-{iteration}/reviews/{reviewer_name}.md

Use these section headers in the file:

## Issues
[Each with severity (CRITICAL/IMPORTANT/MINOR), resolution tag, file path]

For each issue:

**[CRITICAL]** Brief issue title
Description of the issue, what's wrong, and how to fix it.
File: path/to/file.ext:line_number
Resolution: DIRECTLY_ACTIONABLE

(Include a `File:` line with path and line number for every issue.)
(Use severity CRITICAL, IMPORTANT, or MINOR.)
(Resolution must be: DIRECTLY_ACTIONABLE, RESEARCH_NEEDED, CODEBASE_EXPLORATION, or USER_INPUT.)
(How your tags drive the loop: DIRECTLY_ACTIONABLE items are applied by the implementation agent. RESEARCH_NEEDED spawns a research sub-agent that writes docs to `<scope_dir>/research/` — be specific about what to look up and suggest sources. CODEBASE_EXPLORATION works the same way but uses Grep/Glob/Read instead of external search. USER_INPUT is batched and presented to the user; their answers are recorded and passed to the implementation agent as resolved items. All results carry forward to the next review cycle.)
(For RESEARCH_NEEDED: include a `Research:` line specifying what to look up, why it matters for this review, and suggested sources — e.g., "Research: Check if LibX v3 removed the `fooBar()` API — the implementation uses it but the migration guide mentions breaking changes. Source: LibX changelog or docs.")
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
