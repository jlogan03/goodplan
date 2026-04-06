# Shared Audit Conventions

Shared conventions for the audit agent family (`audit-architecture-phase`, `audit-docs-phase`, `audit-tests-phase`). Imported by each agent via `@` reference.

## Finding Severity Levels

| Severity | Definition |
|----------|-----------|
| **CRITICAL** | Actively causing problems, misleading users, or giving false confidence |
| **IMPORTANT** | Significant gap, drift, or quality issue that will cause problems as the codebase grows |
| **MINOR** | Worth noting but not urgent |
| **INFO** | Observation, not a problem — documents areas of good health |

### Severity Pattern Rule

A single instance of a finding is MINOR; a pattern of the same finding type (3+) in the same scope is IMPORTANT.

## Agent Output Format

Each audit agent returns findings as structured JSON. The orchestrator (SKILL.md) formats these into a human-readable report.

```json
{
  "status": "SUCCESS | FAILED",
  "summary": "one-line description",
  "findings": [
    {
      "severity": "CRITICAL | IMPORTANT | MINOR | INFO",
      "category": "<mode-specific category>",
      "description": "what's wrong and why it matters",
      "location": "file path or area",
      "suggestion": "specific fix — file path, what to change"
    }
  ],
  "scores": { "<dimension>": <1-10> },
  "proposedSideQuests": [
    { "title": "descriptive-kebab-case-name", "description": "1-3 sentence goal" }
  ]
}
```

### Rules for Audit Agents

- Be specific: file paths, line numbers, exact text. Vague findings are not actionable.
- Report what you find, not what you think should be. Evidence-based findings only.
- Each finding must have a clear Suggested Action — generic instructions like "fix it" or "add docs" are too vague.
- If unsure whether something is intentional, include it as INFO with a note.

## Side Quest Proposal Template

When a finding is too large for an inline fix, include it in the `proposedSideQuests` array of the JSON return. The orchestrator (not the agent) handles CLI creation via `gp quest:create`.

### Side Quest Criteria

- **Scope**: Side quests should cover a coherent gap, not individual small items.
- **Actionability**: The goal must be specific enough that someone can start working immediately.
- **Verification**: The goal should include what "done" looks like.

## Audit Report Format

The orchestrator writes reports to `.goodplan/audits/<type>-<YYYY-MM-DD>.md`. Same-day re-runs overwrite the previous report. See SKILL.md Step 6 for the authoritative report format — agents do not write reports directly.
