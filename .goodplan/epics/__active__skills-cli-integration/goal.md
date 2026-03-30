# Epic Goal: skills-cli-integration

Update all ~15 goodplan workflow skills to use the `goodplan` CLI binary for `.project/` state operations, replacing direct file reads and writes with CLI commands. This enables dogfooding the CLI on real projects and surfaces ergonomic gaps before attempting full skill consolidation.

Skills currently manage `.project/` state directly — reading JSON files with the Read tool, writing JSON with Write/Edit, manually appending to activity-log.jsonl, and updating state.md. This bypasses the CLI's validation, transition enforcement, and deterministic serialization. After this epic, all structured state access goes through the CLI (`goodplan status --json`, `goodplan epic:create`, `goodplan submit-plan`, etc.), while free-form markdown content (architecture docs, research, brainstorm, goals, plans) continues to be written directly by the LLM per the architecture's design.

The approach is convention-doc-first: write a shared reference file (`_shared/references/cli-interaction.md`) defining how skills detect the binary, invoke commands, parse JSON output, and handle errors. Validate the conventions on 2-3 core skills (create-epic, project-status, complete), then mechanically update the remaining skills against the established patterns.

Key constraints:
- **CLI required**: Skills fail fast if the `goodplan` binary is not found. No graceful fallback to direct file access.
- **CLI conforms to skills, not the reverse**: If the CLI can't handle a workflow that skills encode, the CLI needs to change (new commands, flags, or behaviors) — not the workflow. The only exception is if a skill is attempting something invalid per the documented workflow.
- **Structured state through CLI, content files direct**: JSON/JSONL (entity state, activity log, overviews) goes through CLI commands. Markdown content (architecture, research, brainstorm, goals, plans) is still written directly by the LLM.
- **Convention doc first**: Define interaction patterns before updating skills, to prevent pattern divergence across 15 files.

Out of scope: Full skill consolidation (~12 → ~7 skills with `/create-epic` and `/build` flow skills). That's a future epic that builds on this one. Also out of scope: adding major new CLI commands — use the existing command surface, and surface gaps as side quests or backlog items for the CLI.
