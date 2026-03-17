# Shared References

Reference files consumed by multiple skills. Each skill reads these via absolute paths (`~/.claude/skills/_shared/references/<file>`).

## Adding a New Shared Reference

Consolidation criterion: only move a file here if it is expected to stay unified long-term across all consuming skills. If skills are likely to diverge (e.g., reviewer prompts with different placeholder sets), keep separate copies.

## Troubleshooting

If a skill fails with a Read error pointing to a `~/.claude/skills/_shared/references/` path, this directory or its files may be missing. Re-create the directory and restore the files from the skill repository.
