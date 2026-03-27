## Issues

**[IMPORTANT]** `learning:list` command not documented in cli-interaction.md
Four skills now reference `goodplan learning:list --json` (create-slices, create-plan, refine-slices, audit-architecture), but this command is not documented anywhere in `skills/_shared/references/cli-interaction.md`. The cli-interaction.md file is the authoritative reference for how skills interact with the CLI. Skills following the reference doc would not know this command exists, its output format, or its flags. The command IS documented in `commands-api.md` (architecture), but skills are instructed to use cli-interaction.md as their guide.
File: skills/_shared/references/cli-interaction.md
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** CLAUDE.md learnings reference could mention CLI access
The CLAUDE.md entry `- .project/learnings/ -- per-learning .md files (CLI-managed, one file per learning)` tells humans where learnings live but doesn't hint that skills should use `goodplan learning:list --json` to access them. This is fine for human readers but could be confusing for an LLM that reads CLAUDE.md and tries to read the directory directly. Consider adding a parenthetical like "(query via `goodplan learning:list --json`)" to match the pattern used elsewhere.
File: CLAUDE.md:9
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The skill updates are consistent, well-structured, and correctly replace all `.project/learnings.md` references with CLI commands. The `completion/learnings.md` distinction is preserved and clearly documented as a re-entry detection artifact. The data ownership table in cli-interaction.md correctly adds the new `learnings/*.md` category. The `detail` -> `.md` file mapping is explained in multiple places (cli-interaction.md, complete/references/guidance.md, epic-conventions.md) with consistent language.

The one IMPORTANT issue -- `learning:list` not being documented in cli-interaction.md -- is what keeps this from a 9. Skills that reference a CLI command should be backed by documentation of that command in the shared CLI interaction reference. Without it, a skill author or LLM following the reference docs would not know the command's output shape or available flags.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
