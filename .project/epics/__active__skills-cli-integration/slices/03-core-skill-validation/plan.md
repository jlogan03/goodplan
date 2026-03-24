# Plan: Core Skill Validation — create-epic & complete

## Overview

Migrate the two broadest-interaction workflow skills (`create-epic` and `complete`) to use the `goodplan` CLI for all structured state operations. `create-epic` is a clean simplification (316→~160 lines) — `init` + `epic:create` replace manual directory creation, `state.md`, and `activity-log.jsonl` writes. `complete` is more complex (628 lines) — uses filesystem-backed accumulation to collect learnings, architecture deltas, and decisions during its interactive flow, then constructs a single `slice:complete` payload at the end. Phase 3 validates both skills against real workflows, documents migration patterns for slices 04-05, and installs the updated skills.

**Slug:** `core-skill-val`

**Key decisions:**
- Simplify aggressively: both skills drop state machine awareness, `epic-conventions.md` references for state logic, `state-and-activity-formats.md` references, and manual `state.md`/`activity-log.jsonl` management
- `complete` uses filesystem-backed accumulation: writes intermediate results to disk (compaction-safe), reads them back to construct the `slice:complete` payload — no new CLI commands needed
- No CLI code changes expected — this slice validates existing CLI commands. Gaps are documented in the convention doc for follow-up
- Both skills add `requires: goodplan >= 1.0.0` to SKILL.md frontmatter per convention doc

## Phase 1: create-epic Migration

Rewrite `create-epic` SKILL.md to use CLI commands, eliminating all direct `.project/` structured-state access. The skill becomes significantly thinner — its real job is the interactive dialogue with the user, not state management.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -n 'state\.md' skills/create-epic/SKILL.md` — returns multiple hits (current skill reads/writes state.md)
- [ ] `grep -n 'activity-log\.jsonl' skills/create-epic/SKILL.md` — returns multiple hits (current skill appends directly)
- [ ] `grep -n 'mkdir -p .project' skills/create-epic/SKILL.md` — returns hits (current skill creates directories manually)
- [ ] No `requires:` field in SKILL.md frontmatter

**After implementation** (should pass / show presence):
- [ ] `grep -n 'state\.md' skills/create-epic/SKILL.md` — returns zero hits (excluding comments about elimination)
- [ ] `grep -n 'activity-log\.jsonl' skills/create-epic/SKILL.md` — returns zero hits
- [ ] `grep -n 'mkdir -p .project' skills/create-epic/SKILL.md` — returns zero hits
- [ ] `grep -n 'goodplan init' skills/create-epic/SKILL.md` — returns hits (uses CLI for project init)
- [ ] `grep -n 'epic:create' skills/create-epic/SKILL.md` — returns hits (uses CLI for epic creation)
- [ ] `grep -n 'goodplan status' skills/create-epic/SKILL.md` — returns hits (uses CLI for state orientation)
- [ ] `grep -n 'requires:' skills/create-epic/SKILL.md` — returns `requires: goodplan >= 1.0.0`
- [ ] Skill line count is ≤200 lines (down from 316)
- [ ] `bun test` — all existing tests still pass (no CLI code changes)

### Tasks

- [ ] **Read current `skills/create-epic/SKILL.md`** and `skills/create-epic/references/templates.md` in full to understand every step and reference
- [ ] **Rewrite `skills/create-epic/SKILL.md`** with the simplified flow:
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - **Step 1 — Version Check**: `goodplan --version --json`, verify version satisfies `requires` constraint. If CLI not found or version mismatch, show error per convention doc and stop.
  - **Step 2 — Detect Mode**: `goodplan status --json`. If it succeeds → Mode B (existing project, check `.activeEpic`). If it fails with `DATA_NO_PROJECT` → Mode A (fresh project). No `ls -la .project/`, no `state.md` reads.
  - **Mode A flow**: Interactive dialogue (project name, idea, epic goal) → `goodplan init --name <name> --json` (creates `.project/`, `project.json`, all directories) → Write `idea.md` to `.project/idea.md` (LLM-owned markdown, path is deterministic after init) → `echo '{"name":"initial","goal":"<goal>"}' | goodplan epic:create --json` → Write `goal.md` to path from `epic:create` response → `goodplan epic:show --epic initial --json` to confirm → Update CLAUDE.md Project Context section
  - **Mode B flow**: Interactive dialogue (epic name, goal) → `echo '{"name":"<name>","goal":"<goal>"}' | goodplan epic:create --json` → Write `goal.md` to path from response → `goodplan status --json` to confirm
  - Eliminate: all `state.md` reads/writes, all `activity-log.jsonl` appends, all `mkdir -p .project/...`, all `.gitignore` manipulation, all `epic-conventions.md` state machine references, all `state-and-activity-formats.md` references
  - Keep: `CLAUDE.md` update logic (LLM-owned), `idea.md` writing (LLM-owned), `goal.md` writing (LLM-owned), interactive dialogue quality, expertise check
  - Reference `cli-interaction-conventions.md` for error handling patterns (exit codes, structured error JSON)
- [ ] **Update `skills/create-epic/references/templates.md`** if needed — check if templates reference any eliminated patterns
- [ ] **Verify line count** — target ≤200 lines for SKILL.md

### Verification

1. `wc -l skills/create-epic/SKILL.md` — verify ≤200 lines
2. `grep -rn 'state\.md\|activity-log\.jsonl\|mkdir.*\.project\|epic-conventions\|state-and-activity-formats' skills/create-epic/` — zero hits
3. `grep -n 'goodplan' skills/create-epic/SKILL.md` — verify CLI commands present (init, epic:create, status, --version)
4. `bun test` — all pass (no CLI code changes expected)

## Phase 2: complete Migration

Rewrite `complete` SKILL.md + `references/guidance.md` to use CLI commands. The skill retains its interactive multi-step structure but replaces all direct structured-state access with CLI calls. Uses filesystem-backed accumulation: intermediate results (learnings, architecture updates, decisions) are written to disk as each step completes, then read back to construct the final `slice:complete` payload.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -n 'state\.md' skills/complete/SKILL.md skills/complete/references/guidance.md` — returns multiple hits
- [ ] `grep -n 'activity-log\.jsonl' skills/complete/SKILL.md skills/complete/references/guidance.md` — returns multiple hits (both reads and writes)
- [ ] `grep -cn 'echo.*activity-log' skills/complete/SKILL.md skills/complete/references/guidance.md` — returns count > 0 (direct appends)
- [ ] No `requires:` field in SKILL.md frontmatter

**After implementation** (should pass / show presence):
- [ ] `grep -n 'state\.md' skills/complete/SKILL.md skills/complete/references/guidance.md` — returns zero hits (excluding comments about elimination)
- [ ] `grep -n 'echo.*activity-log' skills/complete/SKILL.md skills/complete/references/guidance.md` — returns zero hits (no direct appends)
- [ ] `grep -n 'goodplan status' skills/complete/SKILL.md` — returns hits (uses CLI for scope detection)
- [ ] `grep -n 'slice:complete\|epic:complete\|quest:complete' skills/complete/SKILL.md` — returns hits (uses CLI for completion)
- [ ] `grep -n 'decision:create' skills/complete/SKILL.md skills/complete/references/guidance.md` — returns hits (uses CLI for decisions)
- [ ] `grep -n 'learning:rollup' skills/complete/SKILL.md skills/complete/references/guidance.md` — returns hits (uses CLI for learnings)
- [ ] `grep -n 'state --json --query' skills/complete/SKILL.md skills/complete/references/guidance.md` — returns hits (uses CLI for activity-log reads)
- [ ] `grep -n 'requires:' skills/complete/SKILL.md` — returns `requires: goodplan >= 1.0.0`
- [ ] `bun test` — all existing tests still pass

### Tasks

- [ ] **Read current `skills/complete/SKILL.md`** (342 lines) and `skills/complete/references/guidance.md` (286 lines) in full
- [ ] **Read `cli-interaction-conventions.md`** sections on: Binary Detection, Data Ownership, State Orientation, Mutation Commands, Error Handling
- [ ] **Rewrite `skills/complete/SKILL.md`** — step by step replacement:
  - Add `requires: goodplan >= 1.0.0` to frontmatter
  - **Step 0 (Scope Resolution Preamble)**: Keep the `$SCOPE_TYPE` / `$SLICES_DIR` / `$EPIC_DIR` variable resolution, but derive from CLI commands instead of filesystem scanning
  - **Step 1 (Load References)**: Keep. Add version check (`goodplan --version --json`). Replace decisions loading with `goodplan state --json --query '.["decisions.jsonl"]'` or `goodplan decision:list --json`
  - **Step 2 (Determine Scope)**: Replace `state.md` read with `goodplan status --json` (`.activeSlice`, `.activeEpic`). Replace directory scanning with `goodplan slice:list --json` + check `status` and `artifacts` fields (from slice 02) to find implementation-complete-but-not-completed scopes. Keep re-entry check logic (reads `completion/learnings.md` — LLM-owned, allowed)
  - **Step 3 (Load Artifacts)**: Keep LLM-owned markdown reads (plans, architecture, research — all allowed). Replace `activity-log.jsonl` reads with `goodplan state --json --query '.["activity-log.jsonl"]'`. Replace entity JSON reads with `slice:show --json` / `epic:show --json` (now includes `artifacts` field)
  - **Step 4 (Synthesize Learnings)**: Keep interactive flow. Write `completion/learnings.md` to disk (LLM-owned, filesystem-backed accumulation)
  - **Step 5 (Roll Up Learnings)**: Replace direct `.project/learnings.md` edit with `goodplan learning:rollup --json` with stdin payload. Keep idempotency check (read `.project/learnings.md` — LLM-owned, allowed)
  - **Step 6 (Architecture Updates)**: Keep interactive flow. Write `completion/architecture-updates.md` to disk (LLM-owned). Replace direct `decisions/` writes with `goodplan decision:create --json` with stdin payload
  - **Step 6b (Project Health)**: Keep — direct `.project/project-health.md` edit (LLM-owned)
  - **Step 6c (Debt Evaluation)**: Keep — no state operations
  - **Step 6d (Signal Tracking)**: Replace direct `activity-log.jsonl` reads with `goodplan state --json --query '[.["activity-log.jsonl"][] | select(.phase == "complete")]'`. Keep filesystem scanning for `completion/learnings.md` existence (allowed — reading directory structure)
  - **Step 6e (Artifact Promotion)**: Keep — file copies (LLM-owned)
  - **Step 6f (Maturity Evaluation)**: Keep — reads/edits `_overview.md` (LLM-owned). Use `decision:create` for approved changes
  - **Step 7 (CLAUDE.md)**: Keep — direct edit (LLM-owned)
  - **Step 8 (Review Remaining Work)**: Replace slice `goal.md` enumeration with `goodplan slice:list --json` to discover unimplemented slices, then read `goal.md` files directly (LLM-owned)
  - **Step 9 (Refactor Intelligence)**: Keep — git analysis, no state operations
  - **Step 10 (Write Back State)**: **Major change.** Eliminate `state.md` writes. Eliminate `activity-log.jsonl` appends. Instead: read back filesystem-accumulated results (`completion/learnings.md`, `completion/architecture-updates.md`) and construct the `slice:complete` / `epic:complete` / `quest:complete` stdin payload. Call the appropriate CLI command. The CLI handles state transition, activity-log entry, and archiving.
  - **Step 10b (Archive)**: **Eliminate.** The CLI's `slice:complete` / `epic:complete` handles the `~~archived~~` rename.
  - **Graceful Stop**: Update all cases — cases (b) through (f) previously wrote `state.md` and `activity-log.jsonl`. Now: graceful stops before the final `slice:complete` call just leave filesystem artifacts in place. Re-entry (Step 2) detects these. No `state.md` updates needed.
  - Eliminate all references to: `state-and-activity-formats.md`, `state.md` (read or write), `echo.*activity-log.jsonl`, `epic-conventions.md` for state machine logic (keep for directory structure conventions and archive numbering convention if needed for epic completion)
- [ ] **Rewrite `skills/complete/references/guidance.md`** — same replacements as SKILL.md for the guidance reference sections:
  - Replace Graceful Stop state.md/activity-log patterns with "filesystem artifacts in place, re-entry detects"
  - Replace Signal Tracking `activity-log.jsonl` reads with `state --json --query`
  - Replace Decision File Format write instructions with `decision:create` CLI call
  - Replace Learnings rollup direct edit with `learning:rollup` CLI call
  - Keep: Refactor Intelligence Protocol (git-based), Maturity Evaluation Protocol (reads LLM-owned markdown), Archive Convention (informational)
- [ ] **Verify no references to eliminated patterns** in both files

### Verification

1. `grep -rn 'state\.md\|echo.*activity-log\|state-and-activity-formats' skills/complete/` — zero hits
2. `grep -n 'goodplan' skills/complete/SKILL.md` — verify CLI commands present (status, show, state --query, slice:complete, epic:complete, decision:create, learning:rollup)
3. `bun test` — all pass
4. Review the `slice:complete` payload construction logic — confirm it reads from filesystem artifacts written in Steps 4-6

## Phase 3: Validation & Convention Doc

Verify both migrated skills against real CLI workflows, update the convention doc with migration patterns discovered, and install the updated skills.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r 'state\.md\|activity-log\.jsonl\|\.project/.*\.json' skills/create-epic/ skills/complete/` — returns hits (if any direct access patterns remain)
- [ ] No "Migration Patterns" section in `cli-interaction-conventions.md`

**After implementation** (should pass / show presence):
- [ ] `grep -r 'state\.md\|activity-log\.jsonl\|\.project/.*\.json' skills/create-epic/ skills/complete/` — returns zero hits (excluding references to convention doc, architecture files, and LLM-owned markdown paths)
- [ ] `grep -n 'Migration Patterns' skills/_shared/references/cli-interaction.md` — returns a hit (new section)
- [ ] `diff skills/ ~/.claude/skills/` shows the updated files are installed (or `bun run install:skills` succeeds)
- [ ] `bun test` — all pass

### Tasks

- [ ] **Comprehensive grep check** — run the full exclusion-aware grep from the goal's success criteria:
  ```
  grep -rn 'state\.md\|activity-log\.jsonl' skills/create-epic/ skills/complete/
  grep -rn '\.project/.*\.json\|\.project/.*\.jsonl' skills/create-epic/ skills/complete/
  ```
  Exclude: references to convention doc paths, architecture file paths (LLM-owned), and markdown content paths. Any remaining hits are bugs — fix them.
- [ ] **Manual validation: create-epic Mode A** — In a temporary empty directory, read through the migrated `create-epic` SKILL.md and trace the flow: does the version check make sense? Does `goodplan init` get called correctly? Does `epic:create` get the right stdin shape? Are the `idea.md` and `goal.md` write paths correct?
- [ ] **Manual validation: create-epic Mode B** — In a project that already has `.project/`: does the `goodplan status --json` detection work? Does `epic:create` construct the correct payload for a subsequent epic?
- [ ] **Manual validation: complete slice flow** — Trace the migrated `complete` SKILL.md through a slice completion: scope detection via `status --json`, artifact loading with `state --query`, learnings synthesis (filesystem write), architecture review (filesystem write + `decision:create`), learnings rollup (`learning:rollup`), and final `slice:complete` with assembled payload. Verify the payload shape matches what the CLI expects.
- [ ] **Manual validation: complete epic flow** — Same trace for epic completion: `epic:complete` payload shape, archive handling, artifact promotion.
- [ ] **Add Migration Patterns section to convention doc** (`skills/_shared/references/cli-interaction.md`) — document patterns discovered during migration:
  - Simplification rule: skills should drop state machine awareness; let CLI errors guide recovery
  - Filesystem-backed accumulation: for multi-step interactive flows, write intermediate results to disk, read back to construct CLI payloads
  - CLI command mapping table: common direct-access patterns → CLI equivalents
  - What stays direct: LLM-owned markdown (plans, goals, architecture, research, brainstorm, project-health, CLAUDE.md)
  - Version check pattern: `goodplan --version --json` + `requires:` frontmatter
- [ ] **Install updated skills** — `bun run install:skills` and verify the installed copies match
- [ ] **Verify no CLI code changes needed** — if any were made during Phases 1-2, ensure they have tests and the convention doc is updated. If no CLI changes were made, note this as validation that the existing CLI surface is sufficient.

### Verification

1. Full grep check returns zero hits for direct structured-state access
2. Migration Patterns section exists in convention doc with the patterns listed above
3. `bun run install:skills` succeeds
4. `diff -r skills/ ~/.claude/skills/ --exclude='*.pyc' --exclude='__pycache__'` — shows only expected differences
5. `bun test` — all pass
