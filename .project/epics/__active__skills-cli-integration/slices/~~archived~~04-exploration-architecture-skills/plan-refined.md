# Plan: Exploration & Architecture Skills Migration

## Overview

Migrate 4 epic lifecycle skills (`audit-architecture`, `explore`, `create-architecture`, `refine-architecture`) to use the `goodplan` CLI for all structured state operations. Follows the migration patterns established in slice 03 — version check, status orientation, CLI mutations, no direct state.md/activity-log.jsonl access. Three skills introduce sub-agent context bundling via `start-*`/`submit-*` commands.

**Note:** `start-epic` is **retired** — its responsibilities are now split across CLI lifecycle phases (architecture review gate moved to refine-architecture, activation is a CLI command). Auto-activation of epics belongs in the implement-plan skill (slice 05 scope): when starting first slice implementation, activate the epic automatically if not already active; if another epic is active, stop and ask whether to abandon/finish it first.

**Slug:** `explore-arch-skills`

**Key decisions:**
- Group by complexity: simple (audit) → begin/submit (explore, create-arch) → iterative (refine-arch)
- Sub-agent context bundling uses `start-*` CLI commands for reviewer/editor context (not manual file reads)
- `mkdir -p .project/audits/` and `mkdir -p .project/side-quests/<name>/` in audit-architecture are retained as skill-owned (LLM artifact directories, like `completion/`)
- No CLI code changes expected — patterns from slice 03 apply
- CLI handles directory creation via command responses; content merging/copying of architecture files remains skill-owned LLM work
- Non-epic explore scopes (project, slice, quest) lose formal state tracking (state.md/activity-log.jsonl writes) since CLI only supports epic scope — the exploration work itself still happens, just no state transition is recorded
- Audit provenance loss accepted — audit report files (.project/audits/) are the real provenance record; no CLI mutation needed for audit completion

## Phase 1: audit-architecture (Read-Only Migration)

Migrate the simplest skill. `audit-architecture` is read-only (no state transitions, no CLI mutation needed). Audit provenance loss accepted — audit report files (.project/audits/) are the real provenance record.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/audit-architecture/SKILL.md skills/audit-architecture/references/` — returns multiple hits
- [ ] `grep -n 'requires:' skills/audit-architecture/SKILL.md` — returns zero hits

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/audit-architecture/SKILL.md skills/audit-architecture/references/` — returns zero hits
- [ ] `grep -n 'goodplan status\|state --json' skills/audit-architecture/SKILL.md` — returns hits
- [ ] `grep -n 'requires:' skills/audit-architecture/SKILL.md` — returns `requires: goodplan >= 1.0.0`
- [ ] `bun test` — all existing tests pass

### Tasks

- [ ] **Read current `skills/audit-architecture/SKILL.md`** and `skills/audit-architecture/references/` in full
- [ ] **Rewrite `skills/audit-architecture/SKILL.md`**:
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - Version check and error handling reference
  - Replace `activity-log.jsonl` reads with `goodplan state --json --query '[.["activity-log.jsonl"][] | select(.scope | startswith("epics/<name>"))] | .[-20:]'` (scope-filtered to the epic being audited)
  - Replace `ls -d .project/epics/__active__*/` active epic detection with `goodplan status --json` -> `.activeEpic`
  - Replace remaining state.md reads with `goodplan status --json` and `epic:show --json`
  - Replace state.md/activity-log.jsonl writes — audit is read-only, so just eliminate these (no CLI mutation needed; audit report files in .project/audits/ are the real provenance)
  - Keep `mkdir -p .project/audits/` (skill-owned LLM artifact directory) and `mkdir -p .project/side-quests/<name>/` (draft proposals) with inline justification notes (same pattern as `completion/` in slice 03)
  - Keep: sub-agent exploration pattern (self-contained, read-only), maturity evaluation, side quest proposals
  - Sub-agents remain pure codebase-exploration agents; no CLI context commands needed
  - Eliminate: all `state-and-activity-formats.md` references
- [ ] **Verify audit-architecture references/ are clean** (currently zero hits expected for eliminated patterns) — only `SKILL.md` itself needs updates

### Verification

1. `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/audit-architecture/` — zero hits
2. `grep -n 'goodplan' skills/audit-architecture/SKILL.md` — CLI commands present
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
  - Replace state.md scope resolution with `goodplan status --json`. Explicit "no argument" scope resolution: check `activeSlice` (absent when `undefined`, not null — use `activeSlice !== undefined`) > `activeQuest` > `activeEpic` > prompt user for scope argument. Priority order matches work stack depth.
  - Use `goodplan epic:explore --epic <name> --json` to begin exploration (transitions to `exploring`)
  - **Skip flow**: `submit-explore` handles both skip (from `created` state — fire without ever calling `epic:explore`) and normal completion (from `exploring`). Guard accepts both `from` statuses: `["created", "exploring"]`. No skip-specific command or payload needed.
  - Sub-agents for research use `goodplan start-explore --epic <name> --inline` for context bundling (CLI provides the context bundle; sub-agents don't read state directly). Note: `start-*` commands always output JSON — no `--json` flag needed. `--inline` accepts an optional `=<bytes>` suffix to control context budget (default: ~32KB); use this if sub-agents hit context limits.
  - Use `goodplan submit-explore --epic <name> --json` to complete (skill writes `explore-complete.md`; this command transitions state only)
  - Replace `mkdir -p .project/decisions/` with `decision:create --json` — stdin payload: `{ id: string, domain: string, title: string, summary: string }`. During the interactive decision-recording session, construct the payload from user responses (`id` from kebab-case title, `domain` from topic area, `title` and `summary` from discussion) and pipe to `echo '<json>' | goodplan decision:create --json`.
  - Graceful stops: leave filesystem artifacts in place, no state.md writes
  - **Non-epic scopes**: CLI only supports epic scope (`submit-explore` hardcodes `type: "epic"`). For non-epic scopes (project, slice, quest), the exploration work itself still happens but formal state tracking (state.md/activity-log.jsonl writes) is lost. This is accepted — consistent with the audit provenance loss decision.
  - Eliminate: all state.md/activity-log.jsonl access, all `state-and-activity-formats.md` references
  - Keep: interactive research/brainstorm/prototype loop, decision recording via CLI
- [ ] **Read current `skills/create-architecture/SKILL.md`** and `skills/create-architecture/references/` in full
- [ ] **Rewrite `skills/create-architecture/SKILL.md`**:
  - Add `requires: goodplan >= 1.0.0`, version check, error handling reference
  - Replace `ls -d .project/epics/__active__*/` active epic detection with `goodplan status --json` -> `.activeEpic`
  - Use `goodplan epic:define-architecture --epic <name> --json` to begin
  - Write architecture markdown to paths from CLI response (`paths.architecture` — verify shape via schema command)
  - Use `goodplan submit-architecture --epic <name> --json` to complete
  - Conventions research sub-agent stays as regular Agent tool call (one-off research, not CLI context bundling). Note: `start-architecture` exists but no sub-agents in create-architecture need its context bundling — the conventions research sub-agent (Step 4.1) does web research only, and all other work is orchestrator-level.
  - **Graceful stop redesign**: Replace 6 graceful-stop scenarios with CLI-based equivalents. For all scenarios, the CLI status stays `defining-architecture` (no CLI mutation on graceful stop). Re-entry detection: `epic:show --json` status = `defining-architecture` means resume. File existence signals progress:
    - (a) Initial Q&A incomplete → no architecture files exist → restart Q&A
    - (b) Q&A complete, design tree not started → Q&A notes exist, no `_overview.md` → resume from design tree
    - (c) Design tree in progress → partial `_overview.md` exists → resume design tree
    - (d) Design tree complete, conventions research not started → `_overview.md` complete, no `conventions.md` → start conventions
    - (e) Conventions research in progress → partial `conventions.md` → resume conventions
    - (f) All content written, not submitted → all architecture files present → proceed to `submit-architecture`
    Acknowledge ~15 `state.md`/`activity-log.jsonl` references across these scenarios need rewriting.
  - Eliminate: all state.md/activity-log.jsonl access, all `state-and-activity-formats.md` references, all `mkdir -p .project/architecture/` (use CLI paths). Note: CLI handles directory creation; content merging/copying of architecture files remains skill-owned LLM work.
  - Keep: interactive Q&A, design tree protocol, design-it-twice, CLAUDE.md update
- [ ] **Update `explore/references/explore-logic.md`**: remove `state-and-activity-formats.md` reference (line 1), replace `__active__` paths in Scope Path Mapping (lines 9-14) with CLI-provided paths, update `explore-complete.md` and `explore-skipped.md` templates for new scope format
- [ ] **Update `create-architecture/references/guidance.md`** lines 56-63: rewrite Early Stop section to use CLI-based equivalents (`epic:show --json` status checks + file existence) instead of state.md/activity-log.jsonl instructions

### Verification

1. `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/explore/ skills/create-architecture/` — zero hits
2. `grep -n 'goodplan' skills/explore/SKILL.md skills/create-architecture/SKILL.md` — CLI commands present
3. `bun test` — all pass

## Phase 3: Iterative Review Skill (refine-architecture)

Migrate the most complex skill — an iterative review loop with multiple sub-agent types.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'activity-log\.jsonl\|state\.md\|state-and-activity-formats' skills/refine-architecture/SKILL.md skills/refine-architecture/references/` — returns hits
- [ ] `grep -n 'requires:' skills/refine-architecture/SKILL.md` — returns zero hits

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'activity-log\.jsonl\|state\.md\|state-and-activity-formats' skills/refine-architecture/SKILL.md skills/refine-architecture/references/` — returns zero hits (no direct reads or writes)
- [ ] `grep -n 'epic:refine-architecture\|submit-refine-architecture' skills/refine-architecture/SKILL.md` — returns hits
- [ ] `grep -n 'start-refine-architecture.*--inline' skills/refine-architecture/SKILL.md` — returns hits (sub-agent context bundling)
- [ ] `grep -n 'requires:' skills/refine-architecture/SKILL.md` — returns `requires: goodplan >= 1.0.0`
- [ ] `bun test` — all pass

### Tasks

- [ ] **Read current `skills/refine-architecture/SKILL.md`** and `skills/refine-architecture/references/` in full
- [ ] **Rewrite `skills/refine-architecture/SKILL.md`**:
  - Add `requires: goodplan >= 1.0.0`, version check, error handling reference
  - Use `goodplan epic:refine-architecture --epic <name> --json` to begin — CLI returns `{ architecture: "<path>" }`. Use this CLI-provided path for the source architecture.
  - The skill creates its own `-refining` working copy of architecture files for the iterative review loop — this working copy management is skill-owned LLM work (similar to refine-plan creating `-refining` copies).
  - Reviewer and editor sub-agents use `goodplan start-refine-architecture --epic <name> --inline` for context bundling (CLI provides architecture files, decisions, learnings as context bundle)
  - Use `goodplan submit-refine-architecture --epic <name> --json` with scores payload to complete
  - Replace `activity-log.jsonl` resume detection with dual detection: (a) `epic:show --json` for lifecycle status (`refining-architecture` = in progress, otherwise fresh start), AND (b) directory structure inspection (count `architecture-refining/` round directories, read last `merged.md`) for iteration progress. Eliminate the skill-local `activity-log.jsonl` — round directory structure provides the same information. Note: `architecture-refining/` is a skill-owned working directory (like `completion/`), so `mkdir -p` is retained.
  - Add task: Replace `ls -d .project/epics/__active__*/` active epic detection with `goodplan status --json` -> `.activeEpic`
  - Iterative loop structure stays intact: reviewer spawn → synthesis → editor → re-review
  - Graceful stops: leave artifacts in place, no state writes
  - **Epic-only after migration**: project-level architecture refinement fallback (`.project/architecture/` when no active epic) is removed. refine-architecture becomes epic-only. Future side quest if project-level refinement is needed.
  - Eliminate: all `activity-log.jsonl` reads/writes, all `state\.md` reads/writes, all `state-and-activity-formats.md` references
  - Keep: reviewer registry, sub-agent prompt templates, synthesis logic, iteration loop mechanics
- [ ] **Verify reference files are clean** (currently zero hits expected for `state.md`/`activity-log`/`state-and-activity-formats` in `references/sub-agent-prompts.md`, `guidance.md`, `reviewer-registry.md`) and update only `SKILL.md` (2 hits for `state-and-activity-formats`)

### Verification

1. `grep -rn 'activity-log\.jsonl\|state-and-activity-formats' skills/refine-architecture/` — zero hits
2. `grep -n 'goodplan' skills/refine-architecture/SKILL.md` — CLI commands present (refine-architecture, start-refine-architecture, submit-refine-architecture, status, --version)
3. `bun test` — all pass

## Phase 4: Validation & Install

Verify all 4 migrated skills against real CLI workflows, install, and update convention doc if gaps found.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl' skills/explore/ skills/create-architecture/ skills/refine-architecture/ skills/audit-architecture/` — may return hits (if any direct access patterns remain)

**After implementation** (should pass / show presence):
- [ ] `grep -rn 'state\.md\|activity-log\.jsonl\|state-and-activity-formats' skills/explore/ skills/create-architecture/ skills/refine-architecture/ skills/audit-architecture/` — returns zero hits. Note: avoid broad patterns like `\.project/.*\.json` which produce false positives from comments/documentation.
- [ ] `diff -r skills/explore/ ~/.claude/skills/explore/` and `diff -r` for all 4 skills — match installed copies
- [ ] `bun test` — all pass

### Tasks

- [ ] **Comprehensive grep check** for all 4 skills:
  ```
  grep -rn 'state\.md\|activity-log\.jsonl' skills/explore/ skills/create-architecture/ skills/refine-architecture/ skills/audit-architecture/
  grep -rn 'state-and-activity-formats\|ls -d.*__active__' skills/explore/ skills/create-architecture/ skills/refine-architecture/ skills/audit-architecture/
  ```
  Fix any remaining hits.
- [ ] **Manual validation traces** — read through each migrated skill and trace the CLI command flows:
  - `audit-architecture`: status → show → state --query → sub-agent exploration (read-only, no mutations)
  - `explore`: status → epic:explore → start-explore --inline (sub-agents) → submit-explore
  - `create-architecture`: status → epic:define-architecture → write to paths → submit-architecture
  - `refine-architecture`: status → epic:refine-architecture → start-refine-architecture --inline (sub-agents) → iterate → submit-refine-architecture
- [ ] **Dry-run invocation test** — for at least one migrated skill (e.g., audit-architecture), do a dry-run invocation on a test project to verify CLI commands are correctly assembled and executed
- [ ] **Install updated skills** — `bun run install:skills` and verify diffs
- [ ] **End-to-end smoke test** — build binary, create test project, exercise the CLI commands each skill would invoke:
  1. `goodplan init --name test --json`
  2. `echo '{"name":"smoke","goal":"test"}' | goodplan epic:create --json`
  3. `goodplan epic:explore --epic smoke --json` — begin exploration
  4. `echo '{"id":"dec-001","domain":"testing","title":"Test Decision","summary":"Smoke test decision"}' | goodplan decision:create --json` — verify decision creation
  5. `goodplan start-explore --epic smoke --inline` — verify sub-agent context bundling
  6. `goodplan submit-explore --epic smoke --json` — complete exploration
  7. `goodplan epic:define-architecture --epic smoke --json` — begin architecture
  8. `goodplan submit-architecture --epic smoke --json` — complete architecture (no stdin required — content already on disk)
  9. `goodplan epic:refine-architecture --epic smoke --json` — begin refinement
  10. `goodplan submit-refine-architecture --epic smoke --json` — complete refinement (expected stdin payload: scores that pass the threshold, or add `--override` if using dummy scores to bypass the score-threshold guard)
  _(Steps 1-10 validate this slice's scope. Steps 11-16 are optional full-lifecycle verification.)_
  11. `goodplan epic:define-slices --epic smoke --json` — begin slice definition
  12. `goodplan submit-slices --epic smoke --json` — complete slice definition (expected stdin payload: slice data)
  13. `goodplan epic:refine-slices --epic smoke --json` — begin slice refinement
  14. `goodplan submit-refine-slices --epic smoke --json` — complete slice refinement (expected stdin payload: refined slice data)
  15. `goodplan epic:add-verification --epic smoke --json` — add verification (guard requires `epic.verifications.length > 0`)
  16. `goodplan epic:activate --epic smoke --json` — activate epic (requires `slices-refined` status)
- [ ] **Review and update CLAUDE.md** if skill interaction patterns changed fundamentally
- [ ] **Update convention doc** if any gaps discovered during migration
- [ ] **Verify no CLI code changes needed**

### Verification

1. Full grep check returns zero hits for direct structured-state access
2. `bun run install:skills` succeeds
3. Targeted diffs for all 4 skills confirm installed copies match
4. `bun test` — all pass
