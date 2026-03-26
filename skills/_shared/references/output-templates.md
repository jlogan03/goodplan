# Output Templates

Shared rigid templates for structured output displayed to users. Skills reference these templates to ensure consistent formatting across runs.

## Iteration Summary Template

Display after every review iteration, immediately after synthesizing feedback and before applying fixes.

**Used by**: refine-plan, refine-architecture, refine-slices, implement-plan

```
---

### {scope_prefix}Iteration {N} Review

**Reviewers**: {reviewer1} ({score}/10), {reviewer2} ({score}/10), ...

| # | Severity | Issue | Source | Resolution |
|---|----------|-------|--------|------------|
| 1 | CRITICAL | {brief issue description} | {Reviewer name(s)} | {DIRECTLY_ACTIONABLE / USER_INPUT / RESEARCH_NEEDED / CODEBASE_EXPLORATION} |
| 2 | IMPORTANT | {brief issue description} | {Reviewer} | {resolution} |
| ... | ... | ... | ... | ... |

**Contradictions**: {N resolved, N unresolved — or "None"}
**USER_INPUT needed**: {brief list — or "None"}
**RESEARCH_NEEDED**: {brief list of topics to research — or "None"}

**Actions**: {what will be done — e.g., "Researching 2 topics, then applying 4 IMPORTANT and 3 MINOR fixes. Asking user about 1 item."}

---
```

### Substitution Rules

| Placeholder | Description |
|---|---|
| `{scope_prefix}` | **Conditional.** implement-plan: `Phase {X} — `. All other skills: omit (empty string). |
| `{N}` | Iteration number within the current scope (phase for implement-plan, full loop for refine-* skills). |
| `{reviewer1}`, `{reviewer2}`, ... | Reviewer names and scores, comma-separated. Include all reviewers active in this iteration. |
| `{brief issue description}` | One-line summary — enough to identify the issue, not the full explanation. |
| `{Reviewer name(s)}` | Source reviewer(s). If deduplicated across reviewers, list all (e.g., "Holistic, Backend"). |
| `{resolution}` | One of: `DIRECTLY_ACTIONABLE`, `USER_INPUT`, `RESEARCH_NEEDED`, `CODEBASE_EXPLORATION`. |

### Display Rules

- List ALL issues, not just a summary count. Users want to see what was found.
- Order by severity: CRITICAL first, then IMPORTANT, then MINOR.
- Keep issue descriptions to one line.
- The "Actions" line previews what happens next before the orchestrator proceeds.
- Display every iteration, not just every N iterations.
