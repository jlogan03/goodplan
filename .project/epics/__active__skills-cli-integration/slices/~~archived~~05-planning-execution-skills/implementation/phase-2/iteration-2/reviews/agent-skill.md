# Agent Skill Review: Phase 2 Iteration 2 — High-Complexity Skills (create-plan, create-slices)

## Issues

**[MINOR]** create-plan guidance.md Scope Resolution section missing `.project/` prefix
The guidance.md Scope Resolution section (line 5) says: `match in \`epics/<name>/slices/\`, \`.project/slices/\`, or \`.project/side-quests/\`` — the first entry is missing the `.project/` prefix. The SKILL.md counterpart correctly uses `.project/epics/<name>/slices/`. An agent reading only guidance.md (as it may on re-load in Step 4d) would look at the wrong path for the epic slices directory.
File: skills/create-plan/references/guidance.md:5
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** decision:create payload in both skills specifies `id` as `<kebab-case-id>` but the commands-api.md example uses a date-prefixed format `2026-03-20-my-decision`
The `decision:create` stdin example in commands-api.md shows `{ "id": "2026-03-20-my-decision", "domain": "architecture", ... }`. Both create-plan SKILL.md (line 119) and create-slices SKILL.md (line 105) instruct the agent to use `<kebab-case-id>` without the date prefix. This inconsistency with the canonical example means decisions created by these skills may have IDs that don't follow the established convention. This is a minor guidance quality issue — the CLI likely accepts either form, but the example should match what the spec shows.
File: skills/create-plan/SKILL.md:119
Resolution: DIRECTLY_ACTIONABLE

## Confirmed Fixes from Iteration 1

Both IMPORTANT issues from iteration 1 are correctly resolved:

1. **create-slices `decision:create` fix**: Step 4 now correctly uses `echo '{"id":"<kebab-case-id>","domain":"<topic-area>","title":"<decision-title>","summary":"<brief-summary>"}' | goodplan decision:create --json` instead of `mkdir -p .project/decisions/`. The CLI handles directory creation and state management note is present.

2. **create-plan concrete `decision:create` syntax**: Step 4c3 now shows the full bash block with `echo '...' | goodplan decision:create --json`, consistent with the established pattern from create-architecture.

Additional migration correctness checks:

- `requires: goodplan >= 1.0.0` frontmatter: present in both skills ✓
- Step 0 version checks with correct stop messages: present in both skills ✓
- `__active__` glob patterns replaced with `goodplan status --json` → `.activeEpic`: replaced throughout both skills ✓
- `state.md` reads/writes eliminated: eliminated in both skills ✓
- `activity-log.jsonl` manual appends eliminated: eliminated in both skills ✓
- `state-and-activity-formats.md` references eliminated: eliminated from graceful stop sections in both skills ✓
- `submit-plan` / `submit-slices` CLI calls use correct flag syntax (`--slice`, `--quest`, `--epic`): correct ✓
- Graceful stop simplification (no state writes on stop): correctly simplified in both skills ✓
- CLAUDE.md migration note updated for `__active__` → plain name paths: updated in create-slices SKILL.md ✓
- `stdin: ""` pattern: both skills use `echo '{}' |` which is functionally equivalent and consistent with other migrated skills ✓

## Score: 9/10

Both IMPORTANT issues from iteration 1 are correctly fixed. The implementation is consistent with the established migration patterns from slices 03-04. The two remaining issues are MINOR: a missing `.project/` prefix in guidance.md that could mislead an agent on re-load, and a `decision:create` `id` format that diverges from the canonical example. Neither blocks correctness for the common case. Score reaches 9/10 with these minor notes; fixing both would bring it to 10.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
