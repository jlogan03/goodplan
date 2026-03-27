# Plan: Learnings Directory Pattern

## Overview

Unify learnings storage to follow a per-file pattern: every learning gets its own `.md` file in a `learnings/` directory, referenced by a `file` field in `learnings.jsonl`. The CLI handles all file creation — skills pass structured data in the payload, and the CLI derives slugs, writes `.md` files, writes JSONL entries, and copies files during rollup. This replaces the monolithic `learnings.md` which grows unbounded and is merge-conflict prone.

Key design decisions:
- **Every learning gets a file** — no inline-only learnings. `detail` moves from JSONL to `.md` file content.
- **Slug from summary** — file names are kebab-case slugs derived from the summary field (e.g., `learnings/schema-registry-changes-are-load-bearing.md`). Truncation at word boundaries (last hyphen before 60 chars). Collision detection uses a `Set<string>` from the state tree, not the filesystem.
- **RPC layer writes files, state machine stays pure** — the `learningInputSchema` keeps `detail` in the payload. The RPC layer maps `LearningInput` (with `detail`) to `LearningEventEntry` (with `file`): it derives the slug, sets the `file` path, and builds the `StateEvent` with `LearningEventEntry[]`. After `reduce()` succeeds, the RPC layer writes `.md` files to disk and calls `commitState()`. The state machine only stores `file` fields in JSONL entries (INV-003 purity). Skills never write to `learnings/` directly.
- **`file` is scope-relative** — the `file` field is always `learnings/<slug>.md` (scope-relative, not absolute). During rollup, JSONL entries keep the same `file` value verbatim. The RPC layer handles copying the physical `.md` file from `<source-scope>/learnings/<slug>.md` to `<target-scope>/learnings/<slug>.md`.
- **Project-level `learnings.md` is retired** — the monolithic `.project/learnings.md` is no longer written or read. However, `completion/learnings.md` (a per-scope re-entry detection artifact used by the `/complete` skill) is preserved and unaffected.
- **Non-breaking schema transition** — `learningEntrySchema` uses `z.union([learningEntrySchemaNew, learningEntrySchemaLegacy])` with two distinct object schemas during Phases 1-3 so existing `detail`-only entries remain valid. Phase 4 runs migration first, verifies all entries pass the tightened schema, then tightens to require `file` only.

**Testing constraint**: All CLI changes are tested on fixture repos, not this repo's live `.project/`. Migration is tested on a copy of this codebase. The user manually installs the new CLI/skills and migrates at the end.

## Phase 1: Schema, State Machine, and RPC Layer

Update the learning schema, transition handlers, and RPC layer to produce per-learning `.md` files instead of storing `detail` inline in JSONL. The state machine sets `file` fields in JSONL entries (pure, no I/O). The RPC layer writes `.md` files to disk and copies files during rollup.

### Expected Behavior

**Before implementation** (should fail / show absence — these target the repo source tree, not a fixture):
- [ ] `grep -c 'learningEntrySchemaNew' src/schemas/records/learning.ts` returns 0 — no new schema variant
- [ ] `grep -c 'deriveSlug' src/util/slug.ts` exits non-zero — file does not exist yet
- [ ] `grep -c 'deriveSlug' src/core/rpc/complete.ts` returns 0 — no slug derivation in RPC layer

**After implementation** (should pass / show presence — these target the repo source tree, not a fixture):
- [ ] `grep -c 'learningEntrySchemaNew' src/schemas/records/learning.ts` returns >= 1 — new schema variant exists
- [ ] `grep -c 'deriveSlug' src/util/slug.ts` returns >= 1 — slug utility exists
- [ ] `grep -c 'deriveSlug' src/core/rpc/complete.ts` returns >= 1 — RPC layer derives slugs and writes .md files
- [ ] Unit test: completing a slice with learnings creates `learnings/<slug>.md` files and JSONL entries with `file` field
- [ ] Unit test: error paths exit with non-zero exit codes (INV-007)

### Tasks

- [x] **`src/schemas/records/learning.ts` — Update `learningEntrySchema`**: Make the schema non-breaking during transition using a discriminated union with two distinct object schemas:
  ```ts
  const learningEntrySchemaLegacy = z.object({ ..., detail: z.string().min(1) });
  const learningEntrySchemaNew = z.object({ ..., file: z.string().min(1) });
  export const learningEntrySchema = z.union([learningEntrySchemaNew, learningEntrySchemaLegacy]);
  ```
  This produces a clean union type compatible with `exactOptionalPropertyTypes: true` (no `.optional()` needed). Also define `LearningEventEntry` type (with `file` instead of `detail`) for use in state event payloads — the RPC layer maps `LearningInput` to `LearningEventEntry` before building events. Keep `learningInputSchema` unchanged — it still accepts `detail` as input from skills. Phase 4 will tighten the schema to require `file` only after migration.
- [x] **`src/schemas/state-events.ts` — Update event payload types**: Change `learnings: LearningInput[]` to `learnings: LearningEventEntry[]` on both `COMPLETE_SLICE` and `COMPLETE_QUEST` event variants. After the RPC layer maps inputs to `LearningEventEntry`, event construction via `buildCompleteEvent()` must accept the new type.
- [x] **Add slug derivation utility**: Create `src/util/slug.ts` (or add to existing util) with a function `deriveSlug(summary: string, existingSlugs: Set<string>): string` — kebab-case, lowercase, strip non-alphanumeric except hyphens, collapse consecutive hyphens, truncate to 60 chars at word boundaries (last hyphen before 60 chars). Collision handling: if the slug exists in `existingSlugs`, append `-2`, `-3`, etc. The `existingSlugs` set is built from the state tree (existing JSONL entries), not the filesystem. Edge case: if normalization produces an empty string (e.g., summary is all special characters), return a fallback slug like `"learning-<index>"` rather than producing `learnings/.md`.
- [x] **`src/core/data/` — Add markdown file I/O helpers**: Add `writeMarkdownFiles(projectDir, files: Array<{path: string, content: string}>)` and `copyMarkdownFiles(projectDir, copies: Array<{from: string, to: string}>)` to the Data Layer. The RPC layer calls these instead of doing filesystem I/O directly, preserving the architectural boundary where all filesystem I/O flows through the Data Layer. Creates directories on-demand.
- [x] **`src/core/state/transitions/slice-complete.ts` — Store `file` field in JSONL entries**: The state machine receives `LearningEventEntry[]` (with `file` already set by the RPC layer) and stores them via `setEntry()`. Type the local `learningEntries` array as `LearningEventEntry[]` (the narrow new-format type, not the full `LearningEntry` union) — this is assignable to `setEntry()` which accepts the union and prevents ambiguity about which variant is being constructed. No slug derivation here — the state machine is pure (INV-003). For rollup targets, create new JSONL entries keeping the same scope-relative `file` value verbatim.
- [x] **`src/core/state/transitions/quest-complete.ts` — Same changes**: Mirror the slice-complete changes for quest completion. Receives `LearningEventEntry[]` with `file` already set. Use `LearningEventEntry[]` as the local type annotation. Quests only roll up to project, not epic.
- [x] **Extract shared helper for learnings processing**: Both `slice-complete.ts` and `quest-complete.ts` share similar learnings processing logic, but they differ — slices roll up to both `epic` and `project`; quests skip `epic` and only roll up to `project`. Extract a shared helper (e.g., in `transitions/helpers.ts`) with a parameterized signature to make the skip-epic case explicit rather than implicit branching:
  ```typescript
  processLearnings(
    tree: ProjectTree,
    learnings: LearningEventEntry[],
    source: string,
    availableTargets: Set<string>
  ): ProjectState
  ```
  Quests pass `availableTargets = new Set(["project"])`; slices pass both `"epic"` and `"project"`. Follow the existing pattern of shared helpers like `appendActivityLog`.
- [x] **`src/core/state/transitions/rollup-learnings.ts` — Update JSONL entries only**: Update `handleRollupLearnings()` to create JSONL entries at the target scope keeping the same scope-relative `file` value verbatim. The state machine does NOT copy files (INV-003).
- [x] **RPC layer — Map inputs, reduce, then write files**: The RPC layer orchestrates the full sequence in `complete()` in `src/core/rpc/complete.ts`: (1) map `LearningInput[]` → `LearningEventEntry[]` by extracting `detail`, deriving slugs, and setting `file` to `learnings/<slug>.md` — no disk write yet. This mapping happens before calling `buildCompleteEvent()`, which accepts `LearningEventEntry[]` for its learnings field. `buildCompleteEvent` remains a pure type-mapping function; slug derivation stays in the orchestration layer. (2) build the `StateEvent` with `LearningEventEntry[]` and call `reduce()`, (3) on success, add a block between `reduce()` and `commitState()` that calls `writeMarkdownFiles()` to write `.md` files to disk (creating the directory on-demand), (4) call `commitState()`. Note: `CompleteInput` in `src/core/rpc/types.ts` intentionally retains `LearningInput[]` as the input boundary type — only the `StateEvent` payload changes to `LearningEventEntry[]`. This preserves the load-reduce-commit pattern and avoids orphan files if `reduce()` fails — the `detail` text remains available from the original input payload for writing after reduce succeeds. Recovery semantics: dangling `.md` files without JSONL references are inert (all learning reads go through JSONL); JSONL entries with missing `.md` files degrade gracefully at read time.
- [x] **RPC layer — `ROLLUP_LEARNINGS` handler must copy `.md` files**: The standalone `learning:rollup` command dispatches `ROLLUP_LEARNINGS` through a dedicated `rollupLearnings()` RPC function (not a conditional inside `begin()`) — this is what the plan means by "standalone `ROLLUP_LEARNINGS` handler". After reduce succeeds, copy `.md` files from `<source-scope>/learnings/<slug>.md` to `<target-scope>/learnings/<slug>.md` via `copyMarkdownFiles()`. Without this, standalone rollup would create JSONL entries pointing to non-existent files at the target scope.
- [x] **Verify `assembleState` picks up `learnings/*.md` automatically** (verification step): On a fixture repo with `learnings/*.md` files, run `goodplan state --json --query '.learnings'` and confirm learnings appear as `MarkdownEntry` nodes. The existing `.md` file handling already covers this — no schema-registry task needed.
- [x] **Update tests**: Add/update unit tests for the modified transition handlers and RPC layer. Test: (1) completing a slice with learnings creates `.md` files and JSONL entries with `file`, (2) rollup copies `.md` files to target scope via RPC layer, (3) slug collision handling works with `Set<string>` from state tree, (4) `detail` field in input is transformed to `file` in output, (5) error paths produce non-zero exit codes.

### Verification

- Run `bun test` and verify all existing tests pass (schema uses union so old `detail`-only entries still validate).
- Run integration test: create a project, complete a slice with learnings, verify `learnings/` directory contains `.md` files.
- Verify slug derivation handles edge cases: very long summaries (truncation at word boundaries), special characters, duplicate summaries.

## Phase 2: CLI Commands and Data Layer

Update CLI commands and data layer to work with the new `learnings/` directory structure. Verify project-level `learnings.md` references are removed from active code paths (excluding `migrate.ts` and `completion/learnings.md`).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan learning:list --json` on a fixture with new-format learnings does NOT include `file` field in entries
- [ ] `goodplan state --json --query '.learnings["foo.md"]'` returns null — `assembleState` doesn't pick up learnings directory

**After implementation** (should pass / show presence):
- [ ] `goodplan learning:list --json` returns entries with `file` fields (breaking change to JSON output — accepted, pre-1.0)
- [ ] `goodplan state --inline --json --query '.learnings["foo.md"]'` returns markdown content; without `--inline`, returns `true`
- [ ] `goodplan status --json` learnings count includes file-based learnings
- [ ] `goodplan learning:list` (no `--json`) output does NOT include file paths — file paths are for programmatic consumers only
- [ ] Error paths (missing file, bad slug) exit with non-zero exit codes

### Tasks

- [ ] **`src/commands/learning/list.ts` — Show file paths in JSON only**: Update the list output to include the `file` field in `--json` mode (replaces `detail` — breaking change, accepted pre-1.0). Omit `file` from human output — file paths are primarily useful for programmatic consumers. Human output keeps the existing `{category} {summary} ({source})` format.
- [ ] **Document breaking change**: Note the `learning:list --json` output change (adding `file`, removing `detail`) in the changelog or release notes. Accepted as a pre-1.0 breaking change.
- [ ] **`src/core/data/` — Verify `assembleState`**: Confirm `assembleState` handles `learnings/` directories automatically via its existing `.md` file handling. Verify the directory contents appear as nested objects in the state tree: `state.learnings["foo.md"]` (not flat keys with slashes). Files are accessible via `state --json --query '.learnings["foo.md"]'`.
- [ ] **`src/commands/global/status.ts` — Update learnings count**: The status command counts learnings from `learnings.jsonl`. Verify this still works correctly with the new schema (it counts JSONL entries, not files, so it should be fine — but verify).
- [ ] **Verify project-level `learnings.md` references are inactive**: Search `src/` for references to the monolithic `.project/learnings.md`. Confirm that `collectLearnings()` reads `learnings.jsonl` (not `learnings.md`). Explicitly exclude from this audit: (1) `src/core/rpc/migrate.ts` — needed for Phase 4 migration, leave untouched, (2) any references to `completion/learnings.md` — this is a re-entry detection artifact and must be preserved.
- [ ] **`src/core/context/types.ts` — Add `file` to `LearningSummary`**: Add `file?: string` to the `LearningSummary` type. With `exactOptionalPropertyTypes: true`, the projection in `collectLearnings` must use conditional spread (`"file" in entry ? { file: entry.file } : {}`) to avoid assigning `undefined` to the optional field. `LearningSummary` is also exposed through `ContextBundle.learnings`, so any future consumer that accesses the `file` field should use `"file" in learning` checks rather than `learning.file !== undefined` to satisfy `exactOptionalPropertyTypes`.
- [ ] **`src/core/context/learnings.ts` — Update context bundling**: The `collectLearnings()` function reads `learnings.jsonl` and projects to `LearningSummary[]`. Update: (1) include the `file` field in the projection using conditional spread, (2) keep `collectLearnings` unchanged — callers that need inline detail read the `.md` files themselves using the `file` path from the returned entries. This is the simpler "caller reads files" approach, avoiding overloaded signatures or new types.
- [ ] **Update tests**: Verify learning list, state query, and context bundling work with the new format. Include exit code assertions for error paths.

### Verification

- On a fixture repo with new-format learnings: `goodplan learning:list --json` shows `file` fields, `goodplan state --json --query '.learnings["foo.md"]'` works, `goodplan status --json` counts correctly.
- Context bundling returns learnings with file references.
- `completion/learnings.md` references remain untouched in all code paths.

## Phase 3: Skills Update

Update skills to work with the new learnings pattern. Skills that read the monolithic `.project/learnings.md` switch to CLI commands. The `/complete` skill continues to write `completion/learnings.md` as a re-entry detection artifact — this is distinct from the retired project-level `learnings.md`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c '\.project/learnings\.md' skills/create-slices/SKILL.md` returns >= 1 — reads monolithic learnings.md for context
- [ ] `grep -c '\.project/learnings\.md' skills/audit-architecture/SKILL.md` returns >= 1

**After implementation** (should pass / show presence):
- [ ] `grep -rc '\.project/learnings\.md' skills/` returns 0 — no monolithic project-level learnings.md references
- [ ] `grep -c 'learnings\.md' skills/audit-architecture/SKILL.md` returns only `completion/learnings.md` references — no bare `learnings.md` references remain
- [ ] `grep -c 'learning:list\|learnings/' skills/create-slices/SKILL.md` returns >= 1 — uses CLI or directory
- [ ] `grep -c 'completion/learnings\.md' skills/complete/SKILL.md` returns >= 1 — re-entry artifact preserved
- [ ] `grep -c '\.project/learnings\.md' skills/create-slices/SKILL.md` returns 0 — reads from CLI instead

### Tasks

- [ ] **`skills/complete/SKILL.md` — Update learnings synthesis (Step 4)**: The skill still synthesizes learnings (LLM judgment work) and still writes `completion/learnings.md` as a working artifact for re-entry detection (this file is NOT being retired). The CLI payload with `detail` fields is the authoritative output for persistence. The `detail` field in each learning entry contains the full text that the CLI will write to the `.md` file.
- [ ] **`skills/complete/references/guidance.md` — Update learnings format**: Update the Learnings.md Entry Format section to reflect the new pattern. Remove references to appending to a monolithic project-level file. Update the JSONL rollup section to note that the CLI now handles `.md` file creation. Clarify that `completion/learnings.md` continues to be written as before.
- [ ] **`skills/create-slices/SKILL.md` — Replace `.project/learnings.md` read** (content read): This skill reads the monolithic file for LLM context. Replace with: `goodplan learning:list --json` to get learnings. Present summaries to the LLM.
- [ ] **`skills/create-plan/SKILL.md` — Replace `.project/learnings.md` read** (content read): If create-plan references `.project/learnings.md`, replace with CLI command.
- [ ] **`skills/create-plan/references/guidance.md` — Update learnings reference** (template instruction): Line 13 has a bare `learnings.md` in the Context Loading list. Update path to `learnings/` directory pattern.
- [ ] **`skills/project-status/SKILL.md` — Remove `.project/learnings.md` reference**: If project-status references the monolithic file, update to use CLI.
- [ ] **`skills/audit-architecture/SKILL.md` — Replace `.project/learnings.md` references**: Two references: (1) line 69 is a file-read instruction — replace with `goodplan learning:list --json` CLI command; (2) line 116 is a prose instruction — update wording to say `learnings/` directory instead of `learnings.md`.
- [ ] **`skills/refine-slices/SKILL.md` — Replace `.project/learnings.md` read** (content read): This skill reads `.project/learnings.md` for context. Replace with `goodplan learning:list --json`.
- [ ] **`skills/create-architecture/SKILL.md` — Replace `.project/learnings.md` reference** (template instruction): Update to use CLI command for learnings context. Step 9 (line 302) has an `ls` command checking `learnings.md` — change to check `learnings/` directory and update the accompanying comment.
- [ ] **`skills/create-architecture/references/guidance.md` — Update conditional learnings inclusion** (template instruction): Replace `.project/learnings.md` conditional inclusion with CLI-based approach.
- [ ] **`skills/_shared/references/epic-conventions.md` — Update directory structure diagrams**: The existing `completion/learnings.md` entries under `completion/` must be preserved (these are re-entry detection artifacts, not the retired monolithic file). Add a new `learnings/` directory entry alongside the existing structure. Do not change `completion/learnings.md` references.
- [ ] **`skills/_shared/references/cli-interaction.md` — Update data ownership table**: The table lists JSON/JSONL as CLI-owned. Add `learnings/*.md` as CLI-owned (not LLM-owned) since the CLI writes these files.
- [ ] **`skills/_shared/references/cli-interaction.md` — Update payload examples**: Update the `slice:complete` and `quest:complete` payload examples (showing `"detail": "..."`) to reflect that skills still pass `detail` in the payload, but the CLI maps it to a `.md` file. Add a clarifying note about the CLI-side `detail` -> `file` mapping so examples don't become misleading after Phase 4 tightening.
- [ ] **CLAUDE.md — Update Project Context**: Replace `.project/learnings.md` reference with `.project/learnings/` directory reference.
- [ ] **Audit all skills**: `grep -r "\.project/learnings\.md" skills/` to find any remaining references to the monolithic file. Update or remove each one. References to `completion/learnings.md` are expected and must be preserved.
- [ ] **Update architecture documentation**: Update `.project/architecture/data-model.md`, `.project/architecture/data-layer-api.md`, and `.project/architecture/rpc-layer-api.md` to reflect the new `learnings/` directory pattern, the `file` field in `learningEntrySchema`, and the RPC layer's role in writing `.md` files.

### Verification

- `grep -r '\.project/learnings\.md' skills/` returns 0 — no monolithic file references (full-path check).
- `grep -r 'learnings\.md' skills/` — only matches are `completion/learnings.md` references and `plan-learnings-and-feedback.md` (a skill filename, not a data reference). Both are expected non-target matches.
- `grep -r 'completion/learnings\.md' skills/complete/` returns >= 1 — re-entry artifact preserved.
- `/complete` skill instructions reference the CLI payload pattern, not monolithic file writing.
- Skills that need learnings context use CLI commands.
- Architecture documentation reflects the new pattern.

## Phase 4: Migration and Testing

Update the migration logic to convert existing `learnings.md` to per-learning files and tighten the schema. Migration reads the filesystem directly (via `buildMigrationState()`, not `assembleState`), so Phase 2's removal of monolithic file references from active code paths is safe. Test on a copy of this codebase.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] Running `goodplan migrate` on a project with `learnings.md` and no `learnings/` directory does not create the directory

**After implementation** (should pass / show presence):
- [ ] Running `goodplan migrate` on a copy of this repo's `.project/` creates `learnings/` directories with per-learning `.md` files at project level (and per-scope where learnings exist)
- [ ] The migrated `learnings.jsonl` entries have `file` fields pointing to the correct `.md` files
- [ ] The monolithic `.project/learnings.md` is removed after migration (not `completion/learnings.md` — that is preserved)
- [ ] Error paths use specific exit codes per INV-007: corrupt `learnings.md` = validation error (exit 2), missing file = data error (exit 1)

### Tasks

- [ ] **`src/core/rpc/migrate.ts` — Add learnings.md conversion**: Migration reads the filesystem directly via `buildMigrationState()`. If `learnings.md` exists in the source: (1) parse it into individual learning entries. The format is: `# Learnings` heading, then entries as `## <summary>` headings, followed by `_Source: <name>_` on its own line, then detail body paragraphs. Source attribution may include suffixes like `(updated by <slice>)` or `(epic)`. (2) For each entry, derive a slug, write to `learnings/<slug>.md`, create a JSONL entry with `file` field. Remove `learnings.md` from `PROJECT_MARKDOWN_FILES` — migration now converts to per-file format instead of copying the monolithic file verbatim.
- [ ] **Handle per-scope learnings.md**: Check if any scope (epic, slice, quest) has a `learnings.md`. If so, apply the same conversion. Note: most per-scope learnings are already in JSONL format — the monolithic `.md` is primarily at project level. For JSONL entries that have `detail` inline (old format), convert to file-based: write `.md` file, replace `detail` with `file`.
- [ ] **Handle re-migration**: If a project already has `learnings/` directories (new format), preserve them. Only convert entries that still have `detail` inline and no `file` field.
- [ ] **Create test fixture**: Copy this repo's `.project/` directory to `tests/fixtures/` as a migration test case. Include the `learnings.md` and existing `learnings.jsonl` files.
- [ ] **Write migration integration test**: Test that `goodplan migrate` on the fixture creates the expected `learnings/` directory structure with correct file contents and JSONL entries. Assert specific exit codes for error paths per INV-007: corrupt `learnings.md` = exit 2 (validation), missing file = exit 1 (data error).
- [ ] **Verify all JSONL entries pass tightened schema**: After migration runs, verify that every `learnings.jsonl` entry across all scopes has a `file` field and no `detail` field. This is a prerequisite for schema tightening.
- [ ] **`src/schemas/records/learning.ts` — Tighten schema**: Only after migration is verified, make `file` required and remove the `detail` / legacy variant from `learningEntrySchema`. The union approach from Phase 1 is no longer needed. Running schema tightening before migration would cause `assembleState()` validation failures on existing data.
- [ ] **Test on a copy of this codebase**: Create a full copy of this repo, run `goodplan migrate`, verify the result. This is the real-world validation.

### Verification

- Migration integration test passes.
- Manual verification on a copy of this codebase: `ls .project/learnings/` shows per-learning files, `goodplan learning:list --json` shows entries with `file` fields, monolithic `learnings.md` is not present in the migrated output.
- Re-migration of an already-migrated project is idempotent — no duplicate files or entries.
- `completion/learnings.md` files at all scopes remain untouched by migration.
