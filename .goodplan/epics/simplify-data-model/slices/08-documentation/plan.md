# Plan: Documentation and Skill Bug Fixes

## Overview

Fix skill bugs found during quality validation, update documentation to reflect the 12-skill model, and pass a clean E2E validation run. Five phases: start-epic rewrite, complete-epic fixes, stale reference sweep, documentation updates, E2E validation gate.

**Slug**: `docs-and-fixes`

## Phase 1: Rewrite start-epic Skill

The start-epic skill uses v1.0.3 file-existence checks, directory renaming (`mv`), and direct `activity-log.jsonl` writes. Rewrite to use the CLI.

### Expected Behavior

**Before implementation**:
- [ ] `grep -c 'ls -d\|test -f\|mv .goodplan' skills/start-epic/SKILL.md` returns multiple matches (file-existence checks and directory rename)
- [ ] `grep -c 'activity-log.jsonl\|state.md' skills/start-epic/SKILL.md` returns matches (direct state writes)
- [ ] `grep -c 'epic:activate' skills/start-epic/SKILL.md` returns 0

**After implementation**:
- [ ] `grep -c 'ls -d\|test -f\|mv .goodplan' skills/start-epic/SKILL.md` returns 0
- [ ] `grep -c 'activity-log.jsonl\|state.md' skills/start-epic/SKILL.md` returns 0
- [ ] `grep -c 'epic:activate' skills/start-epic/SKILL.md` returns at least 1
- [ ] `grep -c 'create-architecture\|create-slices\|/explore[^-]' skills/start-epic/SKILL.md` returns 0 (no old skill names)
- [ ] `bun run build:plugin` passes

### Tasks

- [ ] Rewrite `skills/start-epic/SKILL.md` with this structure:
  1. **Step 0 — Version Check**: `gp --version --json` (standard pattern)
  2. **Step 1 — Scope Resolution**: Accept epic name as argument or auto-detect via `gp epic:list --json` — find epic in `slices-refined` status. If no epic in `slices-refined`, check for `activated` (already done). If ambiguous, use AskUserQuestion.
  3. **Step 2 — Pre-activation Check**: `gp epic:show --epic <name> --json` — verify status is `slices-refined`. If already `activated`, report and stop. If wrong status, tell user what's needed.
  4. **Step 3 — Present Architecture**: Load architecture file paths from `gp status --json --query '.artifacts.architecture'`. Read and present them to the user for review. Summarize key subsystems and design decisions.
  5. **Step 4 — User Approval**: Use AskUserQuestion: "Approve this architecture and activate the epic? / Request changes / Cancel". If changes requested, guide user to re-run `/gp:create-epic` to revise.
  6. **Step 5 — Activate**: `gp epic:activate --epic <name> --json`. Verify response shows `activated` status.
  7. **Step 6 — Done Summary**: Display epic name, slice count, next step (`/gp:plan-slice` for the first slice).
- [ ] Remove all references to: `architecture-proposal/`, `approved.md`, `explore-complete.md`, `explore-skipped.md`, `__active__` prefix, `state.md`, `activity-log.jsonl`, `/create-architecture`, `/create-slices`, `/explore`, `/complete`
- [ ] Update the skill description in frontmatter to reflect the simplified flow

### Verification

- `bun run build:plugin` passes
- `grep -r 'ls -d\|test -f\|mv .goodplan\|state\.md\|activity-log' skills/start-epic/SKILL.md` returns 0

## Phase 2: Fix complete-epic Bugs

Three related bugs in the complete-epic orchestrator.

### Expected Behavior

**Before implementation**:
- [ ] `grep 'quest:create --title' skills/complete-epic/SKILL.md` returns a match (wrong syntax)

**After implementation**:
- [ ] `grep 'quest:create --title' skills/complete-epic/SKILL.md` returns 0
- [ ] `grep 'quest:create --json' skills/complete-epic/SKILL.md` returns a match (correct stdin pattern)
- [ ] The skill's Step 7 includes logic to read `consolidated-learnings.md` and extract all learnings
- [ ] The skill's Step 7 includes validation that all verificationResults have `passed: true` before submitting
- [ ] `bun run build:plugin` passes

### Tasks

- [ ] **Bug A — Learnings rollup**: Update Step 7 (CLI Submit) to read `${EPIC_DIR}/completion/consolidated-learnings.md` and parse each learning entry. Include all learnings in the `epic:complete` payload, not just the first one. This is a justified exception to context discipline — the orchestrator needs to read this file to construct the CLI payload, similar to how the implement skill reads plan overview for structural metadata.
- [ ] **Bug B — Quest creation syntax**: Find all `quest:create --title` references and replace with stdin JSON pattern: `echo '{"name":"<name>","goal":"<goal>"}' | $GP quest:create --json`
- [ ] **Bug C — Verification validation**: Before the `$GP epic:complete` call, add a step that checks all `verificationResults` entries have `passed: true`. If any have `passed: false`, present the failures to the user via AskUserQuestion with options: "Fix and retry / Mark as accepted / Cancel completion"

### Verification

- `bun run build:plugin` passes
- `grep 'quest:create --title' skills/complete-epic/SKILL.md` returns 0

## Phase 3: Fix Stale Skill Name References

Systematic sweep across all skill files and shared references.

### Expected Behavior

**Before implementation**:
- [ ] `grep -r 'create-architecture\|refine-architecture\|create-plan\|refine-plan\|create-slices\|refine-slices\|implement-plan\|/complete[^-]\|/capture\b\|onboard-repo\|/migrate\b\|project-status\|audit-architecture\|audit-docs\|audit-tests' skills/ --include='*.md' | grep -v 'SKILL.md:.*description'` returns matches

**After implementation**:
- [ ] Same grep returns 0 matches (excluding false positives in natural language like "capture learnings", "migrate data")
- [ ] All `/explore` references have `/gp:` prefix
- [ ] `bun run build:plugin` passes

### Tasks

- [ ] Update `skills/status/references/status-logic.md` — replace ~20 old skill name references in the state-to-next-skill mapping table:
  - `/explore` → `/gp:explore`
  - `/create-architecture` → `/gp:create-epic`
  - `/create-slices` → `/gp:create-epic`
  - `/create-plan` → `/gp:plan-slice`
  - `/refine-plan` → `/gp:plan-slice`
  - `/implement-plan` → `/gp:implement`
  - `/complete` → `/gp:complete-epic` (for epics) or "built into /gp:implement" (for slices)
  - `/start-epic` → `/gp:start-epic`
  - `/create-epic` → `/gp:create-epic`
- [ ] Update `skills/_shared/references/output-templates.md` — replace references to `refine-plan`, `refine-architecture`, `refine-slices`, `implement-plan` with current skill names
- [ ] Update `skills/_shared/references/iteration-loop.md` — update description from "refine-plan, refine-architecture" to current skill names
- [ ] Update `skills/explore/SKILL.md` — fix next-step guidance from `/create-architecture`, `/create-plan` to `/gp:create-epic`, `/gp:plan-slice`
- [ ] Update `skills/init/SKILL.md` — fix line ~209 reference to `/gp:create-architecture` → `/gp:create-epic`
- [ ] Run full grep to find any remaining stale references in skills/ and agents/ directories

### Verification

- `grep -r 'create-architecture\|refine-architecture\|create-plan\b\|refine-plan\b\|create-slices\|refine-slices\|implement-plan\|/capture\b\|onboard-repo\|/migrate\b\|project-status\|audit-architecture\|audit-docs\|audit-tests' skills/ --include='*.md'` — filter for actionable matches (not false positives), expect 0
- `bun run build:plugin` passes

## Phase 4: Documentation Updates

Update project documentation to reflect the 12-skill model.

### Expected Behavior

**Before implementation**:
- [ ] `grep -c 'create-plan\|refine-plan\|implement-plan\|19.*skill' README.md` returns matches (stale references)

**After implementation**:
- [ ] README.md lists exactly 12 skills with correct `/gp:` names
- [ ] `.goodplan/architecture/_overview.md` references 12 skills, describes `agents/` directory, has updated subsystem maturity
- [ ] `.goodplan/conventions.md` includes `agents/` in repo structure
- [ ] CLAUDE.md has no stale skill references

### Tasks

- [ ] Update `README.md`:
  - List the 12 skills: init, status, upgrade, create-epic, start-epic, explore, plan-slice, implement, create-side-quest, complete-epic, audit, task
  - Update workflow overview to show consolidated pipeline flow
  - Update installation/usage instructions
- [ ] Update `.goodplan/architecture/_overview.md`:
  - Update skill count to 12
  - Add `agents/` as a described component (34 agent definitions)
  - Update subsystem maturity levels
  - Update deployment model section to reflect `bin/gp` launcher
- [ ] Update `.goodplan/conventions.md`:
  - Add `agents/` to repo structure
  - Update skill development conventions
- [ ] Verify CLAUDE.md — scan for any remaining stale references (most were fixed in the isolation quest)

### Verification

- Read each doc and confirm accuracy
- `grep -r 'create-plan\|refine-plan\|implement-plan' README.md .goodplan/architecture/_overview.md .goodplan/conventions.md` returns 0

## Phase 5: E2E Validation Gate

Build the plugin fresh and run the full pipeline. This phase is the gate — the slice isn't done until it passes clean.

### Expected Behavior

**Before implementation**:
- [ ] Previous E2E run had 2 pipeline failures (start-epic, plan-slice) and 4 metric failures

**After implementation**:
- [ ] All 8 pipeline steps PASS
- [ ] All 6 quality metrics PASS
- [ ] No orchestrator discipline violations

### Tasks

- [ ] Build plugin: `bun run build:plugin`
- [ ] Run E2E: `bun tools/dogfood/validate-consolidated.ts --model claude-opus-4-6`
- [ ] If any step fails, diagnose and fix the skill or harness issue, then re-run
- [ ] Record final results: cost, elapsed time, per-step pass/fail, per-metric pass/fail

### Verification

- All 8 pipeline steps: PASS
- All 6 quality metrics: PASS
- `bun run build:plugin` passes (final build after any fixes)
