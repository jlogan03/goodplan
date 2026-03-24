# Plan: Planning & Execution Skills Migration

## Overview

Migrate 6 skills (create-slices, refine-slices, create-plan, refine-plan, implement-plan, migrate) to use the `goodplan` CLI for all structured state operations. Follows the established migration patterns from slices 03-04. Also fixes the `complete` skill's `mkdir -p .project/side-quests/` to use `quest:create` CLI (follow-up from slice 03).

**Slug:** `plan-exec-skills`

**Key decisions:**
- Group by complexity: low-hit skills first (refine-plan, implement-plan, refine-slices, migrate), high-hit skills second (create-plan, create-slices)
- Per slice 04 learning: skip formal review cycles for skill-only slices — grep + smoke test is sufficient verification
- `__active__` paths in sub-agent prompts (shared-preamble.md, sub-agent-prompts.md) are replaced with `goodplan status --json` → `.activeEpic` instructions
- No CLI code changes expected

## Phase 1: Low-Complexity Skills (refine-plan, implement-plan, refine-slices, migrate)

Migrate 4 skills with low pattern counts (4-5 hits each). migrate is already clean — just needs `requires` frontmatter.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'state\.md\|activity-log\|state-and-activity-formats\|__active__\|ls -d' skills/refine-plan/ skills/implement-plan/ skills/refine-slices/` — returns hits (expected: ~15)
- [ ] `grep -n 'requires:' skills/refine-plan/SKILL.md skills/implement-plan/SKILL.md skills/refine-slices/SKILL.md skills/migrate/SKILL.md` — returns zero hits

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'state\.md\|activity-log\|state-and-activity-formats' skills/refine-plan/ skills/implement-plan/ skills/refine-slices/` — returns zero hits (jq key references excluded — same as slice 04 pattern)
- [ ] `grep -n 'requires:' skills/refine-plan/SKILL.md skills/implement-plan/SKILL.md skills/refine-slices/SKILL.md skills/migrate/SKILL.md` — returns `requires: goodplan >= 1.0.0` for all 4
- [ ] `grep -rn 'ls -d.*__active__' skills/refine-plan/ skills/implement-plan/ skills/refine-slices/` — returns zero hits
- [ ] `bun test` — all pass

### Tasks

- [x] **refine-plan/SKILL.md** (4 hits):
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Step 2b line 97: Replace `epics/__active__*/architecture/` glob with `goodplan status --json` → `.activeEpic` check, then read `epics/<name>/architecture/` using the name from status
  - Step 5 lines 183-189: Replace activity-log.jsonl append with note that CLI handles activity recording via the submit command. If the plan scope is a slice/quest, use the appropriate `submit-refinement` command. If it's a standalone plan (not under `.project/`), skip CLI mutation.
  - Step 5 lines 189-195: Replace state.md update with note that CLI manages state. Remove `state-and-activity-formats.md` reference.
- [x] **refine-plan/references/shared-preamble.md** (1 hit):
  - Line 45: Replace `epics/__active__*/architecture/` glob with instruction to use `goodplan status --json` → `.activeEpic` and read `epics/<name>/architecture/`
- [x] **implement-plan/SKILL.md** (2 hits):
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Step 4.2 lines 296-299: Replace activity-log.jsonl append with CLI submit note (same pattern as refine-plan)
- [x] **implement-plan/references/shared-preamble.md** (1 hit):
  - Line 36: Replace `epics/__active__*/architecture/` glob — same fix as refine-plan's shared-preamble
- [x] **implement-plan/references/sub-agent-prompts.md** (1 hit):
  - Line 59: Replace `ls -d .project/epics/__active__*/ 2>/dev/null` with `goodplan status --json` → `.activeEpic` instruction
- [x] **refine-slices/SKILL.md** (6 hits):
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Prepend version check to existing Step 0 (which has epic detection via `__active__` glob — the version check is added before it, not replacing it). Reference `cli-interaction.md` and use explore/create-architecture skills as pattern.
  - Lines 26, 32, 36: Replace `__active__` paths with `goodplan status --json` → `.activeEpic` + unprefixed paths. Epic detection via `goodplan status --json` instead of globbing.
  - Line 114: Replace state.md update with note about CLI managing state via `submit-refine-slices`
  - Line 115: Replace activity-log.jsonl append with note that CLI handles activity recording via the submit command
  - Line 120 (Cleanup on Interruption): Replace or remove the `activity-log` write with `"status":"abandoned"` — interrupted/abandoned states are not tracked through CLI submit commands; remove this write entirely
- [x] **migrate/SKILL.md** (0 hits — already clean):
  - Add `requires: goodplan >= 1.0.0` to frontmatter only

### Verification

1. `grep -rn 'state\.md\|activity-log\|state-and-activity-formats\|ls -d.*__active__' skills/refine-plan/ skills/implement-plan/ skills/refine-slices/ skills/migrate/` — zero hits (excluding jq key references)
2. `grep -n 'goodplan' skills/refine-plan/SKILL.md skills/implement-plan/SKILL.md skills/refine-slices/SKILL.md` — CLI commands present
3. `bun test` — all pass

## Phase 2: High-Complexity Skills (create-plan, create-slices)

Migrate 2 skills with higher pattern counts (15-19 hits). Both have reference file updates.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'state\.md\|activity-log\|state-and-activity-formats\|__active__\|ls -d' skills/create-plan/ skills/create-slices/` — returns hits (expected: ~34)
- [ ] `grep -n 'requires:' skills/create-plan/SKILL.md skills/create-slices/SKILL.md` — returns zero hits

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'state\.md\|activity-log\|state-and-activity-formats' skills/create-plan/ skills/create-slices/` — returns zero hits
- [ ] `grep -rn 'ls -d.*__active__' skills/create-plan/ skills/create-slices/` — returns zero hits
- [ ] `grep -n 'requires:' skills/create-plan/SKILL.md skills/create-slices/SKILL.md` — returns `requires: goodplan >= 1.0.0` for both
- [ ] `bun test` — all pass

### Tasks

- [x] **create-plan/SKILL.md** (12 hits):
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Add version check (Step 0) referencing `cli-interaction.md`
  - Step 2 lines 27, 31: Replace `epics/__active__*/slices/` with `goodplan status --json` → `.activeEpic` + unprefixed paths
  - Step 2 line 29: Replace `read .project/state.md` with `goodplan status --json` → `.activeSlice`
  - Step 3 line 45: Replace `epics/__active__*/architecture/` glob with `status --json` → `.activeEpic` check
  - Step 3 line 50: Replace `epics/__active__<name>/slices/sequencing.md` with unprefixed path
  - Step 4 graceful stop lines 111-112: Remove `state-and-activity-formats.md` references. Graceful stops leave artifacts in place — no state writes. Note: "plan.md written" (line 114) means the full plan flow completed successfully, so calling `submit-plan` is correct in that case — it is not a partial stop.
  - Step 7 lines 139-154: Replace entire state write-back with CLI submit. For slice scope: use `submit-plan --slice <name> --json`. For quest scope: use `submit-plan --quest <name> --json`. Remove state.md update and activity-log.jsonl append. Note: create-plan does not invoke `quest:plan` or `slice:plan` (the begin-phase commands) because the orchestrator has already transitioned the entity to the planning phase before invoking this skill.
  - Step 2 line 29: When detecting quest scope, use `goodplan status --json` → `.activeQuest` (in addition to `.activeSlice` for slice scope)
  - Step 4c3: Remove `mkdir -p .project/decisions/` (preemptive directory creation is no longer needed). Each subsequent decision write uses `decision:create --json` with payload `{ "id", "domain", "title", "summary" }` — the CLI handles directory creation.
- [x] **create-plan/references/guidance.md** (7 hits):
  - Line 5: Replace `__active__` glob with `goodplan status --json` → `.activeEpic`, construct unprefixed path `epics/<name>/...`
  - Line 6: Replace `state.md` read with `goodplan status --json` → `.activeSlice` for slice scope detection
  - Line 7: Replace `__active__` auto-detect glob with `goodplan slice:list --json` to find plannable slices
  - Line 13: Replace `__active__` in the sequencing.md path reference
  - Line 95: Replace `epics/__active__<name>/architecture/` path with unprefixed `epics/<name>/architecture/`
  - Lines 99-103: These lines reference "active epic" conceptually but contain no literal `__active__` strings. Add an instruction to detect the active epic via `goodplan status --json` → `.activeEpic` rather than replacing path literals
  - Lines 113-114: Replace graceful stop state.md/activity-log references — stops leave artifacts, no state writes
- [x] **create-slices/SKILL.md** (14 hits):
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Add version check (Step 0) referencing `cli-interaction.md`
  - Step 0 line 28: Replace `ls -d .project/epics/__active__*/` with `goodplan status --json` → `.activeEpic`
  - Step 0 line 33: Replace `__active__` paths with unprefixed: `.project/epics/<name>/slices/`
  - Graceful stop lines 125-129: Replace `state-and-activity-formats.md` load (line 125) and remove state.md/activity-log writes in all 3 stop cases (lines 127-129). Stops leave artifacts in place — no state writes. Note: create-slices has 3 stop cases: (a) no files written, (b) sequencing.md only, (c) sequencing.md + some goal.md files. Cases (b) and (c) previously wrote partial progress to state.md/activity-log. With CLI migration, partial stops are silent (no `submit-slices` call) — the written artifact files serve as resume markers. This is acceptable because the skill already checks for existing files on re-entry.
  - Step 8 (CLAUDE.md update) lines 146-148: Replace `__active__` path references with dynamic instruction: use `goodplan status --json` → `.activeEpic` to get the epic name, then construct unprefixed path `.project/epics/<name>/slices/sequencing.md`. Do NOT replace the CLAUDE.md update logic itself — only the `__active__` path references within it.
  - Step 9 (Write Back State) lines 170-187: Replace entire state write-back with CLI submit. For epic scope: use `submit-slices --epic <name> --json`. Remove state.md and activity-log.jsonl writes. Remove `state-and-activity-formats.md` reference (line 172).
- [x] **create-slices/references/guidance.md** (1 hit):
  - Lines 41-43: Replace entire Graceful Stop section. Remove state.md, activity-log, and formats.md references in all 3 stop cases (a, b, c). Stops leave artifacts in place — no state writes.

### Verification

1. `grep -rn 'state\.md\|activity-log\|state-and-activity-formats\|ls -d.*__active__' skills/create-plan/ skills/create-slices/` — zero hits
2. `grep -n 'goodplan' skills/create-plan/SKILL.md skills/create-slices/SKILL.md` — CLI commands present
3. `bun test` — all pass

## Phase 3: Validation, Complete Fix & Install

Comprehensive check across all 7 skills (6 migrated + complete fix), CLI smoke test, install.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `grep -rn 'mkdir -p .project/side-quests' skills/complete/references/guidance.md` — returns hit (the follow-up from slice 03)

**After implementation** (should pass / show presence):
- [x] `grep -rn 'mkdir -p .project/side-quests' skills/complete/references/guidance.md` — returns zero hits (replaced with `quest:create`)
- [x] `grep -rn 'state\.md\|activity-log\|state-and-activity-formats\|ls -d.*__active__' skills/create-slices/ skills/refine-slices/ skills/create-plan/ skills/refine-plan/ skills/implement-plan/ skills/migrate/` — zero hits (excluding jq key references)
- [x] `diff -r skills/<name>/ ~/.claude/skills/<name>/` — match for all 7 skills
- [x] `bun test` — all pass

### Tasks

- [x] **Fix complete/references/guidance.md** line 180: Replace `mkdir -p .project/side-quests/<name>/` + Write tool with `quest:create --json` (stdin payload: `{ "name": "<name>", "goal": "<goal>" }`). The CLI handles directory creation.
- [x] **Comprehensive grep check** across all 7 skills (6 migrated + complete):
  ```
  grep -rn 'state\.md\|activity-log' skills/create-slices/ skills/refine-slices/ skills/create-plan/ skills/refine-plan/ skills/implement-plan/ skills/migrate/ skills/complete/
  grep -rn 'state-and-activity-formats\|ls -d.*__active__' skills/create-slices/ skills/refine-slices/ skills/create-plan/ skills/refine-plan/ skills/implement-plan/ skills/migrate/
  ```
  Fix any remaining hits.
- [x] **Install updated skills**: `bun run install:skills` and verify diffs for all 7 skills
- [x] **CLI smoke test** — build binary, exercise the slice/quest lifecycle commands each skill would invoke:
  1. `goodplan init --name test --json`
  2. `echo '{"name":"smoke","goal":"test"}' | goodplan epic:create --json`
  3. Advance epic through explore + architecture + refine-architecture (same as slice 04 smoke test steps 3-10)
  4. `goodplan epic:define-slices --epic smoke --json` — begin slice definition
  5. `echo '{"name":"s01","goal":"test slice"}' | goodplan slice:create --epic smoke --json` — create a slice
  6. `goodplan submit-slices --epic smoke --json` — complete slice definition
  7. `goodplan epic:refine-slices --epic smoke --json` — begin slice refinement
  8. `goodplan start-refine-slices --epic smoke --inline` — verify sub-agent context bundling (human-readable output; `--json` omitted intentionally since output is visually inspected, not parsed)
  9. `echo '{"scores":{"overall":9}}' | goodplan submit-refine-slices --epic smoke --override --json` — complete refinement
  10. `echo '{}' | goodplan slice:plan --slice s01 --json` — begin planning
  11. `goodplan start-plan --slice s01 --inline` — verify sub-agent context
  12. `echo '{}' | goodplan submit-plan --slice s01 --json` — complete planning
  13. `echo '{}' | goodplan slice:refine-plan --slice s01 --json` — begin refinement
  14. `goodplan start-refinement --slice s01 --inline` — verify sub-agent context
  15. `echo '{"scores":{"overall":9}}' | goodplan submit-refinement --slice s01 --override --json` — complete refinement
  16. `echo '{}' | goodplan slice:implement --slice s01 --json` — begin implementation
  17. `goodplan start-implementation --slice s01 --inline` — verify sub-agent context
  18. `echo '{}' | goodplan submit-implementation --slice s01 --json` — complete implementation
  19. `echo '{"name":"test-quest","goal":"test quest creation"}' | goodplan quest:create --json` — verify quest:create works (complete skill fix)
- [x] **Verify no CLI code changes needed**

### Verification

1. Full grep check returns zero hits for direct structured-state access (excluding jq key refs)
2. `bun run install:skills` succeeds
3. Targeted diffs for all 7 skills confirm installed copies match
4. `bun test` — all pass
5. Smoke test passes all 19 steps
