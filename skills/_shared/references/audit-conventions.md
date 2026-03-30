# Shared Audit Conventions

Shared conventions for the audit skill family (`audit-architecture`, `audit-docs`, `audit-tests`). Each skill's `references/guidance.md` imports these shared definitions and adds domain-specific content.

## Finding Severity Levels

| Severity | Definition |
|----------|-----------|
| **CRITICAL** | Actively causing problems, misleading users, or giving false confidence |
| **IMPORTANT** | Significant gap, drift, or quality issue that will cause problems as the codebase grows |
| **MINOR** | Worth noting but not urgent |
| **INFO** | Observation, not a problem — documents areas of good health |

### Severity Pattern Rule

A single instance of a finding is MINOR; a pattern of the same finding type (3+) in the same scope is IMPORTANT.

## Reviewer Output Format

Each reviewer returns findings as structured markdown. All findings across all audit skills must use this schema:

```markdown
### Finding <N>: <brief title>
- **Severity**: <CRITICAL | IMPORTANT | MINOR | INFO>
- **Category**: <domain-specific category from the skill's guidance.md>
- **Description**: <what's wrong and why it matters>
- **Evidence**:
  - <specific file paths, line references, code snippets>
  - <what exists vs what's expected>
- **Suggested Action**: <specific fix — file path, what to change>
```

### Rules for Reviewers

- Be specific: file paths, line numbers, exact text. Vague findings are not actionable.
- Report what you find, not what you think should be. Evidence-based findings only.
- Each finding must have a clear Suggested Action — generic instructions like "fix it" or "add docs" are too vague.
- If unsure whether something is intentional, include it as INFO with a note.

## Side Quest Proposal Template

When a finding is too large for an inline fix, propose a side quest via the CLI:

```bash
echo '{"name":"<descriptive-kebab-case-name>","goal":"<1-3 sentence goal describing scope, affected files, and what done looks like>"}' | gp quest:create --json
```

Capture the output to extract the created quest name for inclusion in the audit report's "Side Quests Created" section.

### Side Quest Criteria

- **Scope**: Side quests should cover a coherent gap, not individual small items.
- **Actionability**: The goal must be specific enough that someone can start working immediately.
- **Verification**: The goal should include what "done" looks like.

## Audit Report Format

All audit skills write reports to `.goodplan/audits/<type>-<YYYY-MM-DD>.md`. Same-day re-runs overwrite the previous report.

```bash
mkdir -p .goodplan/audits
```

Report structure:

```markdown
# <Type> Audit — <YYYY-MM-DD>

## Findings Summary
| # | Severity | Category | Finding | Action |
|---|----------|----------|---------|--------|
| 1 | ... | ... | ... | fixed / deferred / side-quest-name |

## <Category> Findings
<findings with evidence>

## Fixes Applied
<list of fixes applied, with file paths>

## Side Quests Created
<list with quest names and goals>

## Deferred Findings
<findings user chose not to address now>
```

## Project Health Refresh

After writing the audit report, update `.goodplan/project-health.md`. Each audit skill maps its finding categories to health sections — see the skill's own `guidance.md` for the mapping.

### Sections NOT Updated by Audit

- **Recent Changes**: Driven by slice completion, not audit. Audits should not touch this section.
