# Review Preamble

Standard output format, severity levels, and scoring rubric for all reviewer agents. Injected into reviewer agent definitions via `@` reference.

## Output Format

Produce your review in the following structure:

### `## Issues`

List every issue found. For each issue:

```
**[SEVERITY]** Brief issue title
Description of the issue, what's wrong, and how to fix it.
Resolution: RESOLUTION_TAG
```

**Severity levels** (closed set — use exactly one per issue):
- **CRITICAL** — Blocks implementation or causes incorrect behavior. Must be fixed before proceeding.
- **IMPORTANT** — Significant quality, completeness, or design concern. Should be fixed but doesn't block.
- **MINOR** — Style, naming, documentation, or minor improvement. Fix if convenient.

**Resolution tags** (closed set — use exactly one per issue):
- **DIRECTLY_ACTIONABLE** — The editor agent can fix this from the issue description alone.
- **RESEARCH_NEEDED** — Requires external research (API docs, library behavior, platform constraints). Include a `Research:` line specifying what to look up, why it matters, and suggested sources.
- **CODEBASE_EXPLORATION** — Requires exploring existing code to answer a question. Include what to search for and why.
- **USER_INPUT** — Requires a decision from the user (intent, preferences, business context). Phrase as a clear question.

If no issues found, write: "No issues found."

### `## Score: X/10`

A single integer score from 1-10 with brief justification. If below 9, explain specifically what changes would bring it to 9+.

**Score rubric:**

| Score | Meaning |
|-------|---------|
| 10 | Exceptional — no issues, ready to implement as-is |
| 9 | Strong — at most minor issues that don't affect correctness |
| 8 | Good — a few important issues but fundamentally sound |
| 7 | Adequate — several important issues or one significant design concern |
| 6 | Needs work — multiple important issues affecting quality |
| 5 | Significant gaps — major completeness or design problems |
| 4 | Substantial rework — fundamental approach concerns |
| 3 | Major rethink — wrong direction on key aspects |
| 1-2 | Start over — fundamentally misaligned with goal |

### `## Summary`

Severity counts in this exact format:
```
- Critical: N
- Important: N
- Minor: N
```

## Codebase Exploration

Before evaluating, explore the actual codebase using Grep, Glob, and Read tools. Plans and artifacts that look sound in isolation often conflict with existing code, miss reuse opportunities, or reference files that don't exist. Evaluating without exploration leads to false positives and missed issues.

Each reviewer's domain-specific criteria include a Codebase Exploration Focus section — follow those directions.

If `architecture/invariants.md` exists, read it — the document under review must not violate documented system invariants without explicit justification.

## Review Context Adaptation

You will receive a `review_context` value in your task prompt. Adapt your evaluation focus accordingly:

| review_context | Focus |
|----------------|-------|
| `architecture-proposal` | Structural soundness, subsystem boundaries, API surfaces |
| `slice-definitions` | Scope clarity, ordering, dependencies, verifiability |
| `implementation-plan` | Implementability, phasing, risk, completeness |
| `code-implementation` | Code quality, test coverage, architecture alignment |
| `audit-findings` | Accuracy of findings, false positives, completeness |

## Return Format

After completing your review, return your full review content inline as your final message. Include the review markdown followed by a structured JSON block:

```json
{
  "status": "SUCCESS",
  "summary": "<reviewer-domain> | Score: X/10 | Critical: N, Important: N, Minor: N",
  "filesWritten": [],
  "score": X,
  "review": "<your full review markdown (Issues, Score, Summary sections)>"
}
```

The `score` field is the integer score from your `## Score` section. The orchestrator uses this for exit condition evaluation. The `review` field contains your complete review text — the orchestrator writes it to the appropriate file in `<run-dir>/round-{N}/reviews/`. Do not attempt to write review files yourself.
