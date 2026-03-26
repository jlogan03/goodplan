# Completion Learnings: archived-prefix-migration

## ~~archived~~ prefix sort order depends on the tool

In raw ASCII/terminal `ls`, tilde (~) sorts after lowercase letters as intended — `~~archived~~` directories appear after active ones. But file explorers (VS Code, Finder) use locale-aware collation where `~` may sort before letters, placing archived items above active ones. The "sorts to bottom" rationale from the design spec doesn't hold universally. Known limitation for now.

## Verification grep paths must match actual file locations

The refinement caught a wrong exclusion path in the verification grep (`docs/superpowers/specs/` vs `.project/specs/`). For migration quests with verification steps that exclude known false positives, validate the exclusion paths against the actual filesystem before finalizing the plan.

## Simple rename quests work fine without /implement-plan

This quest was a straightforward find-and-replace across 13 directories and 3 skill files. Direct implementation with a single commit was appropriate — running through `/implement-plan` would have added overhead without proportional value. Good heuristic: if the plan is a single file with <60 lines and all tasks are mechanical, direct implementation is fine.
