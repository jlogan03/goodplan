# Confirmed Goal

Create two new audit skills (`/audit-docs` and `/audit-tests`) following the `/audit-architecture` pattern. Both are pure skill files (SKILL.md + references/) in the `skills/` directory — no CLI code changes.

- `/audit-docs`: Spawns parallel sub-agent reviewers (staleness, gap, consistency) to compare documentation against the actual codebase. Auto-fixes trivial issues, confirms substantive changes with the user, and proposes side quests for large-scope improvements.
- `/audit-tests`: Spawns parallel sub-agent reviewers (coverage gap, stale test, quality, strategy) using static analysis to evaluate test quality. Synthesizes findings and proposes side quests for improvements.

**Done**: Both skills installed via `bun run install:skills`, each with correct frontmatter/triggers, sub-agent reviewer prompts, and verified working on this repo.
