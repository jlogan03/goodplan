# Audit Docs Guidance

Severity definitions, reviewer output format, side quest template, and documentation-specific finding categories for the audit-docs skill.

## Finding Severity Levels

| Severity | Definition | Examples |
|----------|-----------|----------|
| **CRITICAL** | Documentation actively misleading users or causing errors | Code example that crashes; API docs describe a removed endpoint; setup instructions reference deleted config |
| **IMPORTANT** | Significant doc gap or staleness that will cause confusion | Public API with no documentation; architecture doc describes a subsystem that was restructured; CLI command help text contradicts actual behavior |
| **MINOR** | Worth noting but not urgent | Typo in a doc; minor naming mismatch between doc and code; slightly outdated version number reference |
| **INFO** | Observation, not a problem | Documentation is thorough in this area; good alignment between docs and code |

### Severity Assignment Rules

- A single stale reference is MINOR; a pattern of stale references (3+) in the same document is IMPORTANT.
- Any documentation that would cause a user to write broken code is CRITICAL.
- Missing documentation for a public API with 3+ consumers is IMPORTANT; with fewer consumers is MINOR.
- Cross-doc contradictions are IMPORTANT if they affect user-facing behavior, MINOR if internal-only.
- Dead links are MINOR individually, IMPORTANT if widespread (5+).

## Reviewer Output Format

Each reviewer returns findings as structured markdown. All findings must use this schema:

```markdown
### Finding <N>: <brief title>
- **Severity**: <CRITICAL | IMPORTANT | MINOR | INFO>
- **Category**: <staleness | gap | inconsistency>
- **Description**: <what's wrong and why it matters>
- **Evidence**:
  - <specific file paths, line references, code snippets>
  - <what the doc says vs what the code does>
- **Suggested Action**: <specific fix — file path, what to change>
```

### Rules for Reviewers

- Be specific: file paths, line numbers, exact text. Vague findings are not actionable.
- Report what you find, not what you think should be. Evidence-based findings only.
- Each finding must have a clear Suggested Action — "update the docs" is too vague.
- If unsure whether something is intentional, include it as INFO with a note.

## Side Quest Proposal Template

When a finding is too large for an inline fix (missing entire doc sections, documentation strategy gaps, cross-cutting inconsistencies), propose a side quest:

```json
{
  "name": "<descriptive-kebab-case-name>",
  "goal": "<1-3 sentence goal describing what needs to be documented, which files are affected, and what 'done' looks like>"
}
```

### Side Quest Criteria

- **Scope**: Side quests should cover a coherent documentation gap, not individual typos.
- **Actionability**: The goal must be specific enough that someone can start working immediately.
- **Verification**: The goal should include what "done" looks like (e.g., "all public exports in src/core/ have JSDoc comments").

## Documentation-Specific Finding Categories

### Staleness

Documentation that references things that no longer exist or have changed:

- **Removed code references**: Docs mention functions, classes, modules, or files that have been deleted
- **Changed API references**: Docs describe API signatures, parameters, or return types that have changed
- **Stale config references**: Docs reference configuration options, environment variables, or flags that no longer exist
- **Outdated examples**: Code examples that won't compile or run against the current codebase
- **Dead links**: Internal cross-references pointing to files or sections that don't exist

### Gap

Things that exist in code but lack documentation:

- **Undocumented public APIs**: Exported functions, types, or interfaces with no JSDoc or doc file coverage
- **Undocumented CLI commands**: Commands or flags present in code but not in help text or docs
- **Undocumented config options**: Configuration or environment variables used in code but not documented
- **Missing module docs**: Significant modules or subsystems with no README or architecture coverage
- **Undocumented conventions**: Patterns consistently used in code but not captured in conventions.md

### Inconsistency

Documentation that contradicts itself or the code:

- **Cross-doc contradictions**: Two documents describe the same thing differently
- **Doc-code mismatch**: Documentation describes one behavior, code implements another
- **Broken code examples**: Examples in docs that reference wrong imports, types, or APIs
- **Naming mismatches**: Docs use different names than code for the same concept
- **Stale cross-references**: Doc A references a section in Doc B that has been renamed or reorganized

## Project Health Refresh

Documentation audit findings map to project-health sections:

| Finding Category | Profile Section | Rationale |
|---|---|---|
| **Staleness** | **Health** | Stale docs indicate neglected zones — maintenance is not keeping up |
| **Staleness** | **Technical Debt** | Documentation that should match code but doesn't is documentation debt |
| **Gap** | **Technical Debt** | Missing docs for public APIs is documentation debt |
| **Gap** | **Extensibility** | Undocumented APIs and missing onboarding paths create friction for new contributors |
| **Inconsistency** | **Health** | Contradictions between docs indicate systemic maintenance issues |

### Sections NOT Updated by Audit

- **Recent Changes**: Driven by slice completion, not audit. Audit should not touch this section.
