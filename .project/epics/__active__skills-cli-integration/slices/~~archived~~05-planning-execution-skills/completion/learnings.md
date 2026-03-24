# Learnings: 05-planning-execution-skills

## Version check is part of the requires pattern, not a separate decision

Any skill that calls `goodplan` at runtime needs a Step 0 version check + `cli-interaction.md` loading. The plan only listed this for 3 of the 6 skills, and reviewers caught the gap in the other 2 (refine-plan, implement-plan). Future migration plans should treat the version check as automatically implied by the `requires` frontmatter — not something to decide per-skill.

## CLI command syntax must be concrete, not abstract

Abstract descriptions like "use `decision:create --json`" leave room for implementing agents to deviate from the established convention. The concrete piped form (`echo '{"id":"..."}' | goodplan decision:create --json`) avoids ambiguity. This applies to all skill instructions that reference CLI commands — show the exact invocation, not a description of it.

## stdin convention consistency matters for agent pattern recognition

`stdin: "" |` is the project convention (from cli-interaction.md) for empty payloads. `echo '{}' |` is functionally equivalent but agents copy the exact syntax they see in skill instructions. Three instances of `echo '{}' |` slipped in and were caught during integration review. Future implementations should grep for the canonical form and match it.

## Run actual grep commands during planning, not estimated counts

Expected grep counts needed 3 refinement iterations to get right (~13, ~18, ~34 all shifted). Running the actual `grep` commands during plan creation and embedding the real output would eliminate this back-and-forth.

## Graceful stop semantics need explicit scenario inventory

"Stops leave artifacts, no state writes" is too vague. Reviewers pushed for explicit enumeration of each stop case (e.g., create-slices has 3: no files written, sequencing.md only, sequencing.md + goal.md files). This specificity prevented ambiguity during implementation and should be standard for any skill with partial-progress states.

## Consider including version in all --json responses

Every skill currently runs a separate `goodplan --version --json` check before doing anything. If every `--json` response included a `version` field in its envelope, skills could verify compatibility from any CLI call — eliminating the dedicated version check step entirely. This is a CLI enhancement to consider for a future slice.
