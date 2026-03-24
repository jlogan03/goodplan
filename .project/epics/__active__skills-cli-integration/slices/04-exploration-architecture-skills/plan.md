# Plan: Exploration & Architecture Skills Migration

## Overview

Migrate 5 epic lifecycle skills (`start-epic`, `audit-architecture`, `explore`, `create-architecture`, `refine-architecture`) to use the `goodplan` CLI for all structured state operations. Follows the migration patterns established in slice 03 — version check, status orientation, CLI mutations, no direct state.md/activity-log.jsonl access. Three skills introduce sub-agent context bundling via `start-*`/`submit-*` commands.

**Slug:** `explore-arch-skills`

**Key decisions:**
- Group by complexity: simple (start-epic, audit) → begin/submit (explore, create-arch) → iterative (refine-arch)
- Sub-agent context bundling uses `start-*` CLI commands for reviewer/editor context (not manual file reads)
- `mkdir -p .project/audits/` and `mkdir -p .project/side-quests/<name>/` in audit-architecture are retained as skill-owned (LLM artifact directories, like `completion/`)
- No CLI code changes expected — patterns from slice 03 apply

## Phase 1: Simple Migrations (start-epic + audit-architecture)

Migrate the two simplest skills. `start-epic` uses a single mutation (`epic:activate`). `audit-architecture` is read-only (no state transitions).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/start-epic/SKILL.md` — returns multiple hits
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/audit-architecture/SKILL.md skills/audit-architecture/references/` — returns multiple hits
- [ ] `grep -n 'requires:' skills/start-epic/SKILL.md skills/audit-architecture/SKILL.md` — returns zero hits

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/start-epic/SKILL.md` — returns zero hits
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/audit-architecture/SKILL.md skills/audit-architecture/references/` — returns zero hits
- [ ] `grep -n 'epic:activate' skills/start-epic/SKILL.md` — returns hits
- [ ] `grep -n 'goodplan status\|state --json' skills/audit-architecture/SKILL.md` — returns hits
- [ ] `grep -n 'requires:' skills/start-epic/SKILL.md skills/audit-architecture/SKILL.md` — returns `requires: goodplan >= 1.0.0` for both
- [ ] `bun test` — all existing tests pass

### Tasks

- [ ] **Read current `skills/start-epic/SKILL.md`** in full
- [ ] **Rewrite `skills/start-epic/SKILL.md`**:
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Version check: `goodplan --version --json`
  - Error handling reference: `cli-interaction.md` section 10 (with correct exit code semantics from slice 03 learning)
  - Replace state.md reads with `goodplan status --json` and `goodplan epic:show --epic <name> --json` for prerequisite checks (architecture defined, verifications present)
  - Replace `mkdir -p .project/epics/<name>/architecture/` with paths from `epic:activate` response (note: `create` phase returns empty `paths: {}` but `activate` may return paths — verify via `goodplan schema --command epic:activate --json`)
  - Replace state.md/activity-log.jsonl writes — CLI handles via `epic:activate`
  - Entity paths use `<name>` without `__active__` prefix (slice 03 learning)
  - Eliminate: all `state-and-activity-formats.md` references, all `state.md` reads/writes, all `activity-log.jsonl` appends
  - Keep: interactive architecture review, verification review, approval gate
- [ ] **Read current `skills/audit-architecture/SKILL.md`** and `skills/audit-architecture/references/` in full
- [ ] **Rewrite `skills/audit-architecture/SKILL.md`**:
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Version check and error handling reference
  - Replace `activity-log.jsonl` reads with `goodplan state --json --query '.["activity-log.jsonl"] | .[-20:]'`
  - Replace state.md reads with `goodplan status --json` and `epic:show --json`
  - Replace state.md/activity-log.jsonl writes — audit is read-only, so just eliminate these (no CLI mutation needed)
  - Keep `mkdir -p .project/audits/` (skill-owned LLM artifact directory) and `mkdir -p .project/side-quests/<name>/` (draft proposals) with inline justification notes (same pattern as `completion/` in slice 03)
  - Keep: sub-agent exploration pattern (self-contained, read-only), maturity evaluation, side quest proposals
  - Eliminate: all `state-and-activity-formats.md` references
- [ ] **Update audit-architecture references/** if needed — check for eliminated patterns in reference files

### Verification

1. `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/start-epic/ skills/audit-architecture/` — zero hits
2. `grep -n 'goodplan' skills/start-epic/SKILL.md skills/audit-architecture/SKILL.md` — CLI commands present
3. `bun test` — all pass

## Phase 2: Begin/Submit Skills (explore + create-architecture)

Migrate skills that follow the begin → interactive work → submit pattern.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/explore/SKILL.md` — returns multiple hits
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/create-architecture/SKILL.md skills/create-architecture/references/` — returns multiple hits
- [ ] `grep -n 'requires:' skills/explore/SKILL.md skills/create-architecture/SKILL.md` — returns zero hits

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/explore/SKILL.md` — returns zero hits
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/create-architecture/SKILL.md skills/create-architecture/references/` — returns zero hits
- [ ] `grep -n 'epic:explore\|submit-explore' skills/explore/SKILL.md` — returns hits
- [ ] `grep -n 'start-explore.*--inline' skills/explore/SKILL.md` — returns hits (sub-agent context bundling)
- [ ] `grep -n 'epic:define-architecture\|submit-architecture' skills/create-architecture/SKILL.md` — returns hits
- [ ] `grep -n 'requires:' skills/explore/SKILL.md skills/create-architecture/SKILL.md` — returns `requires: goodplan >= 1.0.0` for both
- [ ] `bun test` — all pass

### Tasks

- [ ] **Read current `skills/explore/SKILL.md`** and `skills/explore/references/` in full
- [ ] **Rewrite `skills/explore/SKILL.md`**:
  - Add `requires: goodplan >= 1.0.0`, version check, error handling reference
  - Replace state.md scope resolution with `goodplan status --json`
  - Use `goodplan epic:explore --epic <name> --json` to begin exploration (transitions to `exploring`)
  - Sub-agents for research use `goodplan start-explore --epic <name> --inline` for context bundling (CLI provides the context bundle; sub-agents don't read state directly). Note: `start-*` commands always output JSON — no `--json` flag needed.
  - Use `goodplan submit-explore --epic <name> --json` to complete (writes `explore-complete.md`)
  - Replace `mkdir -p .project/decisions/` with `decision:create --json` (established in slice 03)
  - Graceful stops: leave filesystem artifacts in place, no state.md writes
  - Eliminate: all state.md/activity-log.jsonl access, all `state-and-activity-formats.md` references
  - Keep: interactive research/brainstorm/prototype loop, decision recording via CLI
- [ ] **Read current `skills/create-architecture/SKILL.md`** and `skills/create-architecture/references/` in full
- [ ] **Rewrite `skills/create-architecture/SKILL.md`**:
  - Add `requires: goodplan >= 1.0.0`, version check, error handling reference
  - Use `goodplan epic:define-architecture --epic <name> --json` to begin
  - Write architecture markdown to paths from CLI response (`paths.architecture` — verify shape via schema command)
  - Use `goodplan submit-architecture --epic <name> --json` to complete
  - Conventions research sub-agent stays as regular Agent tool call (one-off research, not CLI context bundling)
  - Replace graceful stop state.md writes — CLI handles state, stops just leave artifacts in place
  - Eliminate: all state.md/activity-log.jsonl access, all `state-and-activity-formats.md` references, all `mkdir -p .project/architecture/` (use CLI paths)
  - Keep: interactive Q&A, design tree protocol, design-it-twice, CLAUDE.md update
- [ ] **Update reference files** for both skills if they contain eliminated patterns

### Verification

1. `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/explore/ skills/create-architecture/` — zero hits
2. `grep -n 'goodplan' skills/explore/SKILL.md skills/create-architecture/SKILL.md` — CLI commands present
3. `bun test` — all pass

## Phase 3: Iterative Review Skill (refine-architecture)

Migrate the most complex skill — an iterative review loop with multiple sub-agent types.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'activity-log\.jsonl' skills/refine-architecture/SKILL.md skills/refine-architecture/references/` — returns hits
- [ ] `grep -n 'requires:' skills/refine-architecture/SKILL.md` — returns zero hits

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'activity-log\.jsonl' skills/refine-architecture/SKILL.md skills/refine-architecture/references/` — returns zero hits (no direct reads or writes)
- [ ] `grep -n 'epic:refine-architecture\|submit-refine-architecture' skills/refine-architecture/SKILL.md` — returns hits
- [ ] `grep -n 'start-refine-architecture.*--inline' skills/refine-architecture/SKILL.md` — returns hits (sub-agent context bundling)
- [ ] `grep -n 'requires:' skills/refine-architecture/SKILL.md` — returns `requires: goodplan >= 1.0.0`
- [ ] `bun test` — all pass

### Tasks

- [ ] **Read current `skills/refine-architecture/SKILL.md`** and `skills/refine-architecture/references/` in full
- [ ] **Rewrite `skills/refine-architecture/SKILL.md`**:
  - Add `requires: goodplan >= 1.0.0`, version check, error handling reference
  - Use `goodplan epic:refine-architecture --epic <name> --json` to begin (returns paths for working copy)
  - Reviewer and editor sub-agents use `goodplan start-refine-architecture --epic <name> --inline` for context bundling (CLI provides architecture files, decisions, learnings as context bundle)
  - Use `goodplan submit-refine-architecture --epic <name> --json` with scores payload to complete
  - Replace `activity-log.jsonl` resume detection with `goodplan status --json` or `epic:show --json` to check current status (if status is `refining-architecture`, in progress; otherwise, fresh start)
  - Replace `mkdir -p .project/architecture-refining/` with paths from CLI `epic:refine-architecture` response
  - Iterative loop structure stays intact: reviewer spawn → synthesis → editor → re-review
  - Graceful stops: leave artifacts in place, no state writes
  - Eliminate: all `activity-log.jsonl` reads/writes, all `state-and-activity-formats.md` references
  - Keep: reviewer registry, sub-agent prompt templates, synthesis logic, iteration loop mechanics
- [ ] **Update reference files** if they contain eliminated patterns (check `references/sub-agent-prompts.md` for activity-log references)

### Verification

1. `grep -rn 'activity-log\.jsonl\|state-and-activity-formats' skills/refine-architecture/` — zero hits
2. `grep -n 'goodplan' skills/refine-architecture/SKILL.md` — CLI commands present (refine-architecture, start-refine-architecture, submit-refine-architecture, status, --version)
3. `bun test` — all pass

## Phase 4: Validation & Install

Verify all 5 migrated skills against real CLI workflows, install, and update convention doc if gaps found.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r 'state\.md\|activity-log\.jsonl\|\.project/.*\.json' skills/explore/ skills/create-architecture/ skills/refine-architecture/ skills/audit-architecture/ skills/start-epic/` — may return hits (if any direct access patterns remain)

**After implementation** (should pass / show presence):
- [ ] `grep -r 'state\.md\|activity-log\.jsonl\|\.project/.*\.json' skills/explore/ skills/create-architecture/ skills/refine-architecture/ skills/audit-architecture/ skills/start-epic/` — returns zero hits (excluding convention doc references and LLM-owned paths)
- [ ] `diff -r skills/explore/ ~/.claude/skills/explore/` and `diff -r` for all 5 skills — match installed copies
- [ ] `bun test` — all pass

### Tasks

- [ ] **Comprehensive grep check** for all 5 skills:
  ```
  grep -rn 'state\.md\|activity-log\.jsonl' skills/explore/ skills/create-architecture/ skills/refine-architecture/ skills/audit-architecture/ skills/start-epic/
  grep -rn '\.project/.*\.json\|\.project/.*\.jsonl' skills/explore/ skills/create-architecture/ skills/refine-architecture/ skills/audit-architecture/ skills/start-epic/
  ```
  Fix any remaining hits.
- [ ] **Manual validation traces** — read through each migrated skill and trace the CLI command flows:
  - `start-epic`: status → show → activate → verify
  - `audit-architecture`: status → show → state --query → sub-agent exploration (read-only, no mutations)
  - `explore`: status → epic:explore → start-explore --inline (sub-agents) → submit-explore
  - `create-architecture`: status → epic:define-architecture → write to paths → submit-architecture
  - `refine-architecture`: status → epic:refine-architecture → start-refine-architecture --inline (sub-agents) → iterate → submit-refine-architecture
- [ ] **Install updated skills** — `bun run install:skills` and verify diffs
- [ ] **End-to-end smoke test** — build binary, create test project, exercise the CLI commands each skill would invoke:
  1. `goodplan init --name test --json`
  2. `echo '{"name":"smoke","goal":"test"}' | goodplan epic:create --json`
  3. `goodplan epic:explore --epic smoke --json` — begin exploration
  4. `goodplan submit-explore --epic smoke --json` — complete exploration
  5. `goodplan epic:define-architecture --epic smoke --json` — begin architecture
  6. `goodplan submit-architecture --epic smoke --json` — complete architecture
  7. `goodplan epic:refine-architecture --epic smoke --json` — begin refinement
  8. `goodplan submit-refine-architecture --epic smoke --json` — complete refinement with scores
  9. `goodplan epic:activate --epic smoke --json` — activate epic
- [ ] **Update convention doc** if any gaps discovered during migration
- [ ] **Verify no CLI code changes needed**

### Verification

1. Full grep check returns zero hits for direct structured-state access
2. `bun run install:skills` succeeds
3. Targeted diffs for all 5 skills confirm installed copies match
4. `bun test` — all pass
