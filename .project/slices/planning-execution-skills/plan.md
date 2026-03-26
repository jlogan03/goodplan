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
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/refine-plan/ skills/implement-plan/ skills/refine-slices/` — returns hits (expected: ~13)
- [ ] `grep -n 'requires:' skills/refine-plan/SKILL.md skills/implement-plan/SKILL.md skills/refine-slices/SKILL.md skills/migrate/SKILL.md` — returns zero hits

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/refine-plan/ skills/implement-plan/ skills/refine-slices/` — returns zero hits (jq key references excluded — same as slice 04 pattern)
- [ ] `grep -n 'requires:' skills/refine-plan/SKILL.md skills/implement-plan/SKILL.md skills/refine-slices/SKILL.md skills/migrate/SKILL.md` — returns `requires: goodplan >= 1.0.0` for all 4
- [ ] `grep -rn 'ls -d.*__active__' skills/refine-plan/ skills/implement-plan/ skills/refine-slices/` — returns zero hits
- [ ] `bun test` — all pass

### Tasks

- [ ] **refine-plan/SKILL.md** (4 hits):
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Step 2b line 97: Replace `epics/__active__*/architecture/` glob with `goodplan status --json` → `.activeEpic` check, then read `epics/<name>/architecture/` using the name from status
  - Step 5 lines 183-189: Replace activity-log.jsonl append with note that CLI handles activity recording via the submit command. If the plan scope is a slice/quest, use the appropriate `submit-refinement` command. If it's a standalone plan (not under `.project/`), skip CLI mutation.
  - Step 5 lines 189-195: Replace state.md update with note that CLI manages state. Remove `state-and-activity-formats.md` reference.
- [ ] **refine-plan/references/shared-preamble.md** (1 hit):
  - Line 45: Replace `epics/__active__*/architecture/` glob with instruction to use `goodplan status --json` → `.activeEpic` and read `epics/<name>/architecture/`
- [ ] **implement-plan/SKILL.md** (2 hits):
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Step 4.2 lines 296-299: Replace activity-log.jsonl append with CLI submit note (same pattern as refine-plan)
- [ ] **implement-plan/references/shared-preamble.md** (1 hit):
  - Line 36: Replace `epics/__active__*/architecture/` glob — same fix as refine-plan's shared-preamble
- [ ] **implement-plan/references/sub-agent-prompts.md** (1 hit):
  - Line 59: Replace `ls -d .project/epics/__active__*/ 2>/dev/null` with `goodplan status --json` → `.activeEpic` instruction
- [ ] **refine-slices/SKILL.md** (4 hits):
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Add version check (Step 0) referencing `cli-interaction.md`
  - Lines 26, 32, 36: Replace `__active__` paths with `goodplan status --json` → `.activeEpic` + unprefixed paths. Epic detection via `goodplan status --json` instead of globbing.
  - Line 114: Replace state.md update with note about CLI managing state via `submit-refine-slices`
- [ ] **migrate/SKILL.md** (0 hits — already clean):
  - Add `requires: goodplan >= 1.0.0` to frontmatter only

### Verification

1. `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats\|ls -d.*__active__' skills/refine-plan/ skills/implement-plan/ skills/refine-slices/ skills/migrate/` — zero hits (excluding jq key references)
2. `grep -n 'goodplan' skills/refine-plan/SKILL.md skills/implement-plan/SKILL.md skills/refine-slices/SKILL.md` — CLI commands present
3. `bun test` — all pass

## Phase 2: High-Complexity Skills (create-plan, create-slices)

Migrate 2 skills with higher pattern counts (15-19 hits). Both have reference file updates.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/create-plan/ skills/create-slices/` — returns hits (expected: ~34)
- [ ] `grep -n 'requires:' skills/create-plan/SKILL.md skills/create-slices/SKILL.md` — returns zero hits

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/create-plan/ skills/create-slices/` — returns zero hits
- [ ] `grep -rn 'ls -d.*__active__' skills/create-plan/ skills/create-slices/` — returns zero hits
- [ ] `grep -n 'requires:' skills/create-plan/SKILL.md skills/create-slices/SKILL.md` — returns `requires: goodplan >= 1.0.0` for both
- [ ] `bun test` — all pass

### Tasks

- [ ] **create-plan/SKILL.md** (12 hits):
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Add version check (Step 0) referencing `cli-interaction.md`
  - Step 2 lines 27, 31: Replace `epics/__active__*/slices/` with `goodplan status --json` → `.activeEpic` + unprefixed paths
  - Step 2 line 29: Replace `read .project/state.md` with `goodplan status --json` → `.activeSlice`
  - Step 3 line 45: Replace `epics/__active__*/architecture/` glob with `status --json` → `.activeEpic` check
  - Step 3 line 50: Replace `epics/__active__<name>/slices/sequencing.md` with unprefixed path
  - Step 4 graceful stop lines 111-112: Remove `state-and-activity-formats.md` references. Graceful stops leave artifacts in place — no state.md/activity-log writes.
  - Step 7 lines 139-154: Replace entire state write-back with CLI submit. For slice scope: use `submit-plan --slice <name> --json`. For quest scope: use the quest equivalent. Remove state.md update and activity-log.jsonl append.
  - Step 4c3: Replace `mkdir -p .project/decisions/` with `decision:create --json` (same pattern as slice 04 explore)
- [ ] **create-plan/references/guidance.md** (7 hits):
  - Lines 5-7: Replace `state.md` and `__active__` in scope resolution with CLI equivalents
  - Line 13: Replace `__active__` in context loading paths
  - Lines 95, 99-103: Replace `__active__` in Two-Layer Architecture section with unprefixed paths and `status --json` for epic detection
  - Lines 113-114: Replace graceful stop state.md/activity-log references — stops leave artifacts, no state writes
- [ ] **create-slices/SKILL.md** (14 hits):
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Add version check (Step 0) referencing `cli-interaction.md`
  - Step 0 line 28: Replace `ls -d .project/epics/__active__*/` with `goodplan status --json` → `.activeEpic`
  - Step 0 line 33: Replace `__active__` paths with unprefixed: `.project/epics/<name>/slices/`
  - Steps 8/10 lines 125-186: Replace entire state write-back section. For epic scope: use `submit-slices --epic <name> --json`. Remove state.md and activity-log.jsonl writes. Remove `state-and-activity-formats.md` references.
  - Graceful stop lines 127-129: Stops leave artifacts in place — no state writes
  - Step 9 (CLAUDE.md update) lines 146-148: Replace `__active__` path references with unprefixed paths
- [ ] **create-slices/references/guidance.md** (1 hit):
  - Line 41: Replace `state.md` reference in graceful stop — stops leave artifacts, no state writes

### Verification

1. `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats\|ls -d.*__active__' skills/create-plan/ skills/create-slices/` — zero hits
2. `grep -n 'goodplan' skills/create-plan/SKILL.md skills/create-slices/SKILL.md` — CLI commands present
3. `bun test` — all pass

## Phase 3: Validation, Complete Fix & Install

Comprehensive check across all 7 skills (6 migrated + complete fix), CLI smoke test, install.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'mkdir -p .project/side-quests' skills/complete/references/guidance.md` — returns hit (the follow-up from slice 03)

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'mkdir -p .project/side-quests' skills/complete/references/guidance.md` — returns zero hits (replaced with `quest:create`)
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats\|ls -d.*__active__' skills/create-slices/ skills/refine-slices/ skills/create-plan/ skills/refine-plan/ skills/implement-plan/ skills/migrate/` — zero hits (excluding jq key references)
- [ ] `diff -r skills/<name>/ ~/.claude/skills/<name>/` — match for all 7 skills
- [ ] `bun test` — all pass

### Tasks

- [ ] **Fix complete/references/guidance.md** line 180: Replace `mkdir -p .project/side-quests/<name>/` + Write tool with `quest:create --json` (stdin payload: `{ "name": "<name>", "goal": "<goal>" }`). The CLI handles directory creation.
- [ ] **Comprehensive grep check** across all 7 skills (6 migrated + complete):
  ```
  grep -rn 'state\.md\|activity-log\.jsonl' skills/create-slices/ skills/refine-slices/ skills/create-plan/ skills/refine-plan/ skills/implement-plan/ skills/migrate/ skills/complete/
  grep -rn 'state-and-activity-formats\|ls -d.*__active__' skills/create-slices/ skills/refine-slices/ skills/create-plan/ skills/refine-plan/ skills/implement-plan/ skills/migrate/
  ```
  Fix any remaining hits.
- [ ] **Install updated skills**: `bun run install:skills` and verify diffs for all 7 skills
- [ ] **CLI smoke test** — build binary, exercise the slice/quest lifecycle commands each skill would invoke:
  1. `goodplan init --name test --json`
  2. `echo '{"name":"smoke","goal":"test"}' | goodplan epic:create --json`
  3. Advance epic through explore + architecture + refine-architecture (same as slice 04 smoke test steps 3-10)
  4. `goodplan epic:define-slices --epic smoke --json` — begin slice definition
  5. `echo '{"name":"s01","goal":"test slice"}' | goodplan slice:create --epic smoke --json` — create a slice
  6. `goodplan submit-slices --epic smoke --json` — complete slice definition
  7. `goodplan epic:refine-slices --epic smoke --json` — begin slice refinement
  8. `goodplan start-refine-slices --epic smoke --inline` — verify sub-agent context bundling
  9. `echo '{"scores":{"overall":9}}' | goodplan submit-refine-slices --epic smoke --override --json` — complete refinement
  10. `stdin: "" | goodplan slice:plan --slice s01 --json` — begin planning
  11. `goodplan start-plan --slice s01 --inline` — verify sub-agent context
  12. `stdin: "" | goodplan submit-plan --slice s01 --json` — complete planning
  13. `stdin: "" | goodplan slice:refine-plan --slice s01 --json` — begin refinement
  14. `goodplan start-refinement --slice s01 --inline` — verify sub-agent context
  15. `echo '{"scores":{"overall":9}}' | goodplan submit-refinement --slice s01 --override --json` — complete refinement
  16. `stdin: "" | goodplan slice:implement --slice s01 --json` — begin implementation
  17. `goodplan start-implementation --slice s01 --inline` — verify sub-agent context
  18. `stdin: "" | goodplan submit-implementation --slice s01 --json` — complete implementation
  19. `echo '{"name":"test-quest","goal":"test quest creation"}' | goodplan quest:create --json` — verify quest:create works (complete skill fix)
- [ ] **Verify no CLI code changes needed**

### Verification

1. Full grep check returns zero hits for direct structured-state access (excluding jq key refs)
2. `bun run install:skills` succeeds
3. Targeted diffs for all 7 skills confirm installed copies match
4. `bun test` — all pass
5. Smoke test passes all 19 steps
