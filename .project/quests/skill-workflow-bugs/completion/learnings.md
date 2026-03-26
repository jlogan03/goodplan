# Learnings — skill-workflow-bugs

## Codebase exploration before planning prevents misdiagnosed bugs

Two of the four original bugs were invalid or mislocated. Bug 1 targeted the wrong file (SKILL.md instead of guidance.md); Bug 4 was entirely a non-issue (file copying already worked). The refinement process caught both via codebase context discovery before any implementation began. Future quests with "fix these bugs" goals should run codebase exploration to verify each bug still exists and is correctly characterized before creating a plan.

## Only extract templates with structural identity — keep divergent templates inline

The Iteration Summary template was structurally identical across 4 skills (differing only by a scope prefix). The Completion Summary, Done Summary, and Context Load Summary all diverged structurally. Extracting only the identical one to a shared file reduced duplication without adding indirection for templates that would need per-skill overrides anyway. The {scope_prefix} conditional pattern cleanly handles the one structural difference (implement-plan prefixes with Phase X).

## Migration sibling detection (Bug 4) was a non-issue — update prior learning

The migrate-to-cli learning "CLI should cross-check LLM-provided paths against siblings" was investigated during refinement. `copyMarkdownFiles()` already copies ALL .md files from source directories. The prior learning should be marked as resolved/investigated.
