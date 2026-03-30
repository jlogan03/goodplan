# Plan: Learnings Directory Pattern

## Overview

Unify learnings storage to follow a per-file pattern: every learning gets its own `.md` file in a `learnings/` directory, referenced by a `file` field in `learnings.jsonl`. The CLI handles all file creation — skills pass structured data in the payload, and the CLI derives slugs, writes `.md` files, writes JSONL entries, and copies files during rollup. This replaces the monolithic `learnings.md` which grows unbounded and is merge-conflict prone.

Key design decisions:
- **Every learning gets a file** — no inline-only learnings. `detail` moves from JSONL to `.md` file content.
- **Slug from summary** — file names are kebab-case slugs derived from the summary field (e.g., `learnings/schema-registry-changes-are-load-bearing.md`)
- **CLI writes everything** — the `learningInputSchema` keeps `detail` in the payload. The CLI writes the `.md` file and sets the `file` field in the JSONL entry. Skills never write to `learnings/` directly.
- **Rollup copies files** — when a learning rolls up from slice to epic/project, the `.md` file is copied to the target's `learnings/` directory and a JSONL entry is added pointing to the local copy. Each scope is self-contained.
- **`learnings.md` is retired** — no longer written or read by any skill or CLI command.

**Testing constraint**: All CLI changes are tested on fixture repos, not this repo's live `.project/`. Migration is tested on a copy of this codebase. The user manually installs the new CLI/skills and migrates at the end.

## Phase 1: Schema and State Machine

Update the learning schema and transition handlers to write per-learning `.md` files instead of storing `detail` inline in JSONL.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c '"file"' src/schemas/records/learning.ts` returns 0 — no `file` field in schema
- [ ] `grep -c "learnings/" src/core/state/transitions/slice-complete.ts` returns 0 — no directory writes
- [ ] `grep -c "learnings/" src/core/state/transitions/quest-complete.ts` returns 0

**After implementation** (should pass / show presence):
- [ ] `grep -c '"file"' src/schemas/records/learning.ts` returns >= 1 — `file` field in learningEntrySchema
- [ ] `grep -c "learnings/" src/core/state/transitions/slice-complete.ts` returns >= 1 — writes .md files
- [ ] `grep -c "learnings/" src/core/state/transitions/quest-complete.ts` returns >= 1
- [ ] Unit test: completing a slice with learnings creates `learnings/<slug>.md` files and JSONL entries with `file` field

### Tasks

- [ ] **`src/schemas/records/learning.ts` — Update `learningEntrySchema`**: Replace `detail: z.string().min(1)` with `file: z.string().min(1)`. The `file` field holds the relative path to the `.md` file (e.g., `learnings/schema-registry-changes.md`). Keep `learningInputSchema` unchanged — it still accepts `detail` as input from skills. The CLI transforms `detail` → file during state machine processing.
- [ ] **Add slug derivation utility**: Create `src/util/slug.ts` (or add to existing util) with a function `deriveSlug(summary: string): string` — kebab-case, lowercase, strip non-alphanumeric except hyphens, collapse consecutive hyphens, truncate to 60 chars. Add collision handling: if the slug already exists in the target `learnings/` directory, append `-2`, `-3`, etc.
- [ ] **`src/core/state/transitions/slice-complete.ts` — Write `.md` files**: In the learnings processing block (lines 73-117), after creating `LearningEntry` objects: (1) derive slug from `summary`, (2) set `file` to `learnings/<slug>.md`, (3) write the `detail` text to the `.md` file in the slice's scope directory. (4) For rollup targets, copy the `.md` file to the target's `learnings/` directory and create a new JSONL entry pointing to the local copy. The state machine must create the `learnings/` directory if it doesn't exist.
- [ ] **`src/core/state/transitions/quest-complete.ts` — Same changes**: Mirror the slice-complete changes for quest completion (lines 47-82). Quests only roll up to project, not epic.
- [ ] **`src/core/state/transitions/rollup-learnings.ts` — Copy files during rollup**: Update `handleRollupLearnings()` to copy `.md` files from source `learnings/` to target `learnings/` when rolling up. Update the target JSONL entry's `file` field to point to the local copy.
- [ ] **`src/core/state/transitions/init.ts` — Create `learnings/` directory**: During project initialization (line 76-78), create `learnings/` directory alongside the empty `learnings.jsonl`.
- [ ] **`src/core/data/schema-registry.ts` — Register `learnings/` directory**: Add a registry entry for `learnings/*.md` so `assembleState` picks up the directory contents. Also register `*/learnings/*.md` for scoped learnings directories.
- [ ] **Update tests**: Add/update unit tests for the modified transition handlers. Test: (1) completing a slice with learnings creates `.md` files and JSONL entries with `file`, (2) rollup copies `.md` files to target scope, (3) slug collision handling works, (4) `detail` field in input is transformed to `file` in output.

### Verification

- Run `bun test` and verify all existing tests pass (schema changes may break some).
- Run integration test: create a project, complete a slice with learnings, verify `learnings/` directory contains `.md` files.
- Verify slug derivation handles edge cases: very long summaries, special characters, duplicate summaries.

## Phase 2: CLI Commands and Data Layer

Update CLI commands and data layer to work with the new `learnings/` directory structure.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan learning:list --json` on a fixture with new-format learnings shows entries without `file` field or doesn't handle them correctly
- [ ] `goodplan state --json --query '.["learnings/"]'` returns null — `assembleState` doesn't pick up learnings directory

**After implementation** (should pass / show presence):
- [ ] `goodplan learning:list --json` returns entries with `file` fields
- [ ] `goodplan state --json --query '."learnings/"'` returns directory contents (or `.learnings` — depends on assembleState keying)
- [ ] `goodplan status --json` learnings count includes file-based learnings

### Tasks

- [ ] **`src/commands/learning/list.ts` — Show file paths**: Update the list output to include the `file` field. For `--json` mode, include it in the response. For human mode, optionally show the file path alongside the summary.
- [ ] **`src/core/data/` — Update `assembleState`**: Ensure `assembleState` handles `learnings/` directories. The schema registry changes from Phase 1 should make this automatic, but verify the directory is included in the state tree and files are accessible via `state --json --query`.
- [ ] **`src/commands/global/status.ts` — Update learnings count**: The status command counts learnings from `learnings.jsonl`. Verify this still works correctly with the new schema (it counts JSONL entries, not files, so it should be fine — but verify).
- [ ] **Remove `learnings.md` handling**: Search for all references to `learnings.md` in `src/` — remove any code that reads, writes, or references the monolithic file. Key locations: `src/core/rpc/migrate.ts` (may copy `learnings.md` during migration — defer to Phase 4), `src/core/data/` (assembleState may include it), `src/core/context/` (context bundling may reference it).
- [ ] **`src/core/context/learnings.ts` — Update context bundling**: The `collectLearnings()` function reads `learnings.jsonl` and projects to `LearningSummary[]`. Update: (1) include the `file` field in the projection, (2) when `--inline` is used, read the `.md` file content and include it. Update `LearningSummary` type in `types.ts` accordingly.
- [ ] **Update tests**: Verify learning list, state query, and context bundling work with the new format.

### Verification

- On a fixture repo with new-format learnings: `goodplan learning:list --json` shows `file` fields, `goodplan state --json --query '.["learnings.jsonl"]'` works, `goodplan status --json` counts correctly.
- Context bundling returns learnings with file references.

## Phase 3: Skills Update

Update skills to work with the new learnings pattern. The `/complete` skill is the main one — it no longer writes a monolithic `completion/learnings.md`. Other skills that read `learnings.md` need updating.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c "learnings.md" skills/complete/SKILL.md` returns >= 1 — references monolithic file
- [ ] `grep -c "learnings.md" skills/create-slices/SKILL.md` returns >= 1 — reads learnings.md for context

**After implementation** (should pass / show presence):
- [ ] `grep -c "learnings.md" skills/complete/SKILL.md` returns 0 — no monolithic file references (except possibly in migration/deprecation notes)
- [ ] `grep -c "learning:list\|learnings/" skills/complete/SKILL.md` returns >= 1 — uses CLI or directory
- [ ] `grep -c "learnings.md" skills/create-slices/SKILL.md` returns 0 — reads from CLI instead

### Tasks

- [ ] **`skills/complete/SKILL.md` — Update learnings synthesis (Step 4)**: The skill currently writes `completion/learnings.md` as a monolithic draft, then converts to JSONL payload in Step 10. Change: the skill still synthesizes learnings (LLM judgment work — deciding what's worth recording), but instead of writing a monolithic file, it structures them as entries for the CLI payload directly. The `completion/learnings.md` file becomes optional — the skill may still write it as a working artifact for the LLM's own use during synthesis, but the CLI payload is the authoritative output. The `detail` field in each learning entry contains the full text that the CLI will write to the `.md` file.
- [ ] **`skills/complete/references/guidance.md` — Update learnings format**: Update the Learnings.md Entry Format section to reflect the new pattern. Remove references to appending to a monolithic file. Update the JSONL rollup section to note that the CLI now handles file creation.
- [ ] **`skills/create-slices/SKILL.md` — Replace learnings.md read**: The skill reads `.project/learnings.md` for context during slice creation. Replace with: `goodplan learning:list --json` to get learnings, or `goodplan state --json --query '.["learnings.jsonl"]'`. Present summaries to the LLM.
- [ ] **`skills/create-plan/SKILL.md` — Replace learnings.md read**: If create-plan references `learnings.md`, replace with CLI command. Check `references/guidance.md` too.
- [ ] **`skills/project-status/SKILL.md` — Remove learnings.md reference**: If project-status references learnings.md, update to use CLI.
- [ ] **`skills/_shared/references/cli-interaction.md` — Update data ownership table**: The table lists JSON/JSONL as CLI-owned. Add `learnings/*.md` as CLI-owned (not LLM-owned) since the CLI writes these files.
- [ ] **CLAUDE.md — Update Project Context**: Replace `.project/learnings.md` reference with `.project/learnings/` directory reference.
- [ ] **Audit all skills**: `grep -r "learnings.md" skills/` to find any remaining references. Update or remove each one.

### Verification

- `grep -r "learnings\.md" skills/` returns 0 (or only deprecation notes).
- `/complete` skill instructions reference the CLI payload pattern, not monolithic file writing.
- Skills that need learnings context use CLI commands.

## Phase 4: Migration and Testing

Update the migration logic to convert existing `learnings.md` to per-learning files. Test on a copy of this codebase.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Running `goodplan migrate` on a project with `learnings.md` and no `learnings/` directory does not create the directory

**After implementation** (should pass / show presence):
- [ ] Running `goodplan migrate` on a copy of this repo's `.project/` creates `learnings/` directories with per-learning `.md` files at project level (and per-scope where learnings exist)
- [ ] The migrated `learnings.jsonl` entries have `file` fields pointing to the correct `.md` files
- [ ] The monolithic `learnings.md` is not copied/referenced in the migrated state

### Tasks

- [ ] **`src/core/rpc/migrate.ts` — Add learnings.md conversion**: During migration, if `learnings.md` exists in the source: (1) parse it into individual learning entries (split on `## ` headings, extract source from `_Source:` line), (2) for each entry, derive a slug, write to `learnings/<slug>.md`, create a JSONL entry with `file` field. Remove the `learnings.md` copy from the migration artifact list.
- [ ] **Handle per-scope learnings.md**: Check if any scope (epic, slice, quest) has a `learnings.md`. If so, apply the same conversion. Note: most per-scope learnings are already in JSONL format — the monolithic `.md` is primarily at project level. For JSONL entries that have `detail` inline (old format), convert to file-based: write `.md` file, replace `detail` with `file`.
- [ ] **Handle re-migration**: If a project already has `learnings/` directories (new format), preserve them. Only convert entries that still have `detail` inline and no `file` field.
- [ ] **Create test fixture**: Copy this repo's `.project/` directory to `tests/fixtures/` as a migration test case. Include the `learnings.md` and existing `learnings.jsonl` files.
- [ ] **Write migration integration test**: Test that `goodplan migrate` on the fixture creates the expected `learnings/` directory structure with correct file contents and JSONL entries.
- [ ] **Test on a copy of this codebase**: Create a full copy of this repo, run `goodplan migrate`, verify the result. This is the real-world validation.

### Verification

- Migration integration test passes.
- Manual verification on a copy of this codebase: `ls .project/learnings/` shows per-learning files, `goodplan learning:list --json` shows entries with `file` fields, monolithic `learnings.md` is not present in the migrated output.
- Re-migration of an already-migrated project is idempotent — no duplicate files or entries.
