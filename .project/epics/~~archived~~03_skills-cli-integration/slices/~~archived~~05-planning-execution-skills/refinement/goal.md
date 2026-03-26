# Confirmed Goal

Migrate 6 skills (create-slices, refine-slices, create-plan, refine-plan, implement-plan, migrate) to use the `goodplan` CLI for all structured state operations, plus fix the `complete` skill's `mkdir -p .project/side-quests/` to use `quest:create`.

Done means:
- All 6 skills have `requires: goodplan >= 1.0.0` frontmatter
- All direct `state.md`, `activity-log.jsonl`, `state-and-activity-formats.md` references replaced with CLI equivalents
- All `__active__` glob paths replaced with `goodplan status --json` → `.activeEpic` approach
- The `complete` skill's `mkdir -p .project/side-quests/` replaced with `quest:create`
- `bun test` passes, skills installed and verified
