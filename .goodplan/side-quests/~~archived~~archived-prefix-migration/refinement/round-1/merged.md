# Merged Feedback — Round 1

Reviewers: Holistic (8/10), Software Architecture (8/10)

## Issues

**[IMPORTANT-1]** Plan does not acknowledge `flow-log.jsonl` references to old directory paths
Skills use the `scope` field in `flow-log.jsonl` to correlate entries with filesystem directories. After renaming, any skill that constructs a path from a `scope` value needs prefix-aware resolution. The plan updates skill files to strip `~~archived~~` instead of `__done__`, but should explicitly verify no skill reads the flow-log `scope` field and constructs a filesystem path without that resolution. Additionally, the Phase 2 verification's `--include='*.md'` filter happens to exclude `flow-log.jsonl`, but a note should acknowledge that historical references there are intentionally preserved.
*Sources: Software Architecture (CODEBASE_EXPLORATION), Holistic (DIRECTLY_ACTIONABLE)*
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT-2]** Missing verification that `~~` characters are safe in all consumer contexts (glob patterns, shell expansion)
Skill files use glob patterns like `.project/vertical-slices/*/completion/learnings.md`. The `~~` characters in directory names should be tested with the actual glob implementation used by Claude Code tools and bash globbing. The plan should include a verification step confirming glob patterns match `~~archived~~`-prefixed directories.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT-3]** Phase 2 verification grep comment/command misalignment and incomplete exclusion documentation
The plan text says "excluding the design spec file and this quest's goal.md" but the actual grep only excludes `specs/2026-03-18` and `archived-prefix-migration`. While technically correct (the quest directory exclusion covers `goal.md` and `plan.md`), the description and command are misaligned. The plan should explicitly acknowledge that `plan.md` (the original pre-refinement plan) also contains `__done__` references and is covered by the exclusion.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-1]** Phase 2 verification grep exclusion pattern is fragile
The `grep -v` exclusions use partial path substrings. If the spec file moves or another file legitimately references the old convention, the verification silently misses real issues. Consider using full file paths or a more explicit exclusion list.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-2]** No explicit git commit task
Neither phase includes a task for staging and committing changes. Directory renames are significant git operations (tracked as delete + add). Include an explicit commit task after Phase 2 at minimum.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-3]** Phase 2 replacements should note context-aware editing, not blind find-and-replace
The occurrence counts are accurate, but for descriptive text (e.g., "visually separate completed work"), the implementer should also update surrounding description to say "archived" rather than "done" where appropriate. Add a note that the implementer should review surrounding context when replacing.
Resolution: DIRECTLY_ACTIONABLE

## Contradictions Resolved

1. **flow-log.jsonl handling** — Holistic flagged it as a documentation gap (note that historical refs are preserved); Software Architecture flagged it as a functional risk (skills may construct paths from scope fields). These are complementary, not contradictory. Merged into IMPORTANT-1 with the broader scope (CODEBASE_EXPLORATION) since the functional risk subsumes the documentation concern.

2. **Verification grep exclusions** — Holistic flagged comment/command misalignment; Software Architecture flagged the exclusion pattern as fragile. These are distinct issues addressing different aspects of the same grep command. Kept as separate items (IMPORTANT-3 and MINOR-1).

## Summary
- Critical: 0
- Important: 3
- Minor: 3
- DIRECTLY_ACTIONABLE: 5
- CODEBASE_EXPLORATION: 1
- RESEARCH_NEEDED: 0
- USER_INPUT: 0
