# Plan: Restructure Plugin References

## Overview

Restructure the goodplan plugin's reference files for context efficiency across all skills and agents. Currently `skills/_references/` is a flat 34-file, 232KB directory consumed by a mix of skills, agents, and nothing — with some skills reimplementing shared patterns inline instead of referencing shared files.

This plan audits actual usage (validating existing research in `plugin-mechanics.md`), reorganizes files into a two-tier layout (`skills/_references/` for skill-shared and cross-consumer files, `agents/_references/` for agent-only files), optimizes content so each consumer loads only what it needs, consolidates fragmented iteration loop implementations, creates a non-user-invocable orientation skill for always-on CLI/workflow context, converts Read-based reference loading to permission-free `@` auto-includes, and verifies the restructured plugin produces correct LLM behavior.

All changes target repo source (`skills/`, `agents/`, `plugin/`, `scripts/`). The installed plugin and `.goodplan/` are not modified. Commit incrementally after each phase. All changes are reversible via git.

## Phase 1: Audit & Map All Reference Usage

Validate and complete the existing consumer mappings in `plugin-mechanics.md` — produce a verified evidence map of every reference file, every consumer (skill and agent), and which content each consumer relies on. This is the foundation for all subsequent phases.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] No audit document exists at `.goodplan/quests/restructure-plugin-references/research/reference-audit.md`

**After implementation** (should pass / show presence):
- [x] `.goodplan/quests/restructure-plugin-references/research/reference-audit.md` exists with: per-file consumer list, per-consumer content usage, loading mechanism (@ vs Read), contradictions, redundancies, unused files, and iteration loop fragmentation analysis

### Tasks

- [x] For each of the 34 files in `skills/_references/`: identify every consumer (skill or agent) and the loading mechanism (@ auto-include or Read tool instruction)
- [x] For each consumer: read the consumer alongside each reference it loads and document which sections/content the consumer actually relies on
- [x] Identify files with zero consumers (candidates for deletion)
- [x] Identify skills using Read tool to load references (permission prompt risk): explore, status, upgrade for local refs; create-epic, plan-slice for cross-skill refs
- [x] Identify contradictions between reference files or between references and skill instructions
- [x] Identify redundancies (same information in multiple files)
- [x] Document iteration loop fragmentation: which skills reimplement the loop inline (plan-slice, create-epic 2x, create-side-quest) vs reference iteration-loop.md (implement only)
- [x] Identify content that belongs in the always-on orientation skill (CLI interaction rules, state restrictions, workflow entry points)
- [x] Write complete audit document to quest research directory (direct write is safe — `.md` files are exempt from HMAC integrity checks)

### Verification

Audit document accounts for every file in `skills/_references/` and every skill/agent consumer. Cross-reference: `grep -r '@\${CLAUDE_PLUGIN_ROOT}' skills/ agents/` output matches the audit's consumer mappings.

## Phase 2: Restructure Directory Layout

Move files to where their consumers are. Create a non-user-invocable orientation skill for always-on context. Convert all Read-based reference loading to permission-free `@` auto-includes.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] Reviewer agents reference review criteria at `skills/_references/review-*.md` (not yet at `agents/_references/`)
- [x] No `workflow-guide` skill exists in `skills/`
- [x] Skills `explore`, `status`, `upgrade` instruct LLM to use Read tool for their local references
- [x] `create-epic` and `plan-slice` instruct LLM to Read `skills/implement/references/reviewer-registry.md`
- [x] `reviewer-registry.md` lives under `skills/implement/references/` (not yet at `skills/_references/`)

**After implementation** (should pass / show presence):
- [x] Every `@` reference in `agents/*.md` resolves to an existing file at the referenced path
- [x] Every `@` reference in `skills/*/SKILL.md` resolves to an existing file at the referenced path
- [x] No skill or agent instructs the LLM to use Read tool to load always-needed reference/instruction files (intentionally deferred/conditional Read instructions are preserved)
- [x] `skills/_references/` contains files consumed by skills and cross-consumer shared files (agents reference these via `@${CLAUDE_PLUGIN_ROOT}/skills/_references/`)
- [x] `agents/_references/` contains only files consumed exclusively by agents
- [x] No root `_references/` directory exists — two tiers only: `skills/_references/` and `agents/_references/`. Cross-consumer files go in `skills/_references/` (agents already reference via `@${CLAUDE_PLUGIN_ROOT}/skills/_references/`)
- [x] Unused files are deleted (README.md, state-and-activity-formats.md, others identified in Phase 1)
- [x] Review criteria files (review-preamble.md + 20 review-*.md) are moved to `agents/_references/` with existing `@` include pattern preserved in reviewer agent definitions
- [x] `skills/workflow-guide/SKILL.md` exists with `user-invocable: false`, containing CLI orientation, state interaction rules, workflow entry points, and flow recovery guidance
- [x] All skills that previously loaded CLI interaction rules via Read or @ retain an explicit `@` include of `cli-interaction.md` — workflow-guide supplements (does not replace) these explicit includes. `cli-interaction.md` provides the operational rules each skill needs; `workflow-guide/SKILL.md` provides orientation context (entry points, flow recovery) auto-loaded via description matching. Skills do not need to `@`-include workflow-guide
- [x] `reviewer-registry.md` lives at `skills/_references/reviewer-registry.md` and all consumers reference it via `@` include (no cross-skill Read calls)

### Tasks

- [x] Create `agents/_references/` directory
- [x] Create `skills/workflow-guide/SKILL.md` with `user-invocable: false` — content boundary: CLI query/mutation patterns, .goodplan/ write restrictions, skill entry points per flow, interrupted flow recovery, essential error handling. Explicitly excludes: per-skill operational logic (stays in skill SKILL.md), review criteria (stays in agents/_references/), and reference content already covered by `@` includes in consuming skills. Source content from `cli-interaction.md` sections covering CLI patterns, state restrictions, and workflow routing — not the full 28KB file
- [x] Move agent-only reference files to `agents/_references/` (sub-agent-return-format.md, audit-conventions.md, codebase-context-discovery.md, maturity-conventions.md, plan-format.md — subject to Phase 1 audit confirming these are agent-only)
- [x] Move review-preamble.md + all review-*.md to `agents/_references/`; keep the existing `@` include pattern (do not inline — 21 files totaling ~80KB would create massive duplication)
- [x] Move `reviewer-registry.md` from `skills/implement/references/` to `skills/_references/`
- [x] Evaluate `plugin/CLAUDE.md` vs `workflow-guide` coexistence: if workflow-guide subsumes `plugin/CLAUDE.md` content, delete it and remove the build script copy step; if distinct, document why both exist
- [x] Place any cross-consumer files in `skills/_references/` (agents reference via `@${CLAUDE_PLUGIN_ROOT}/skills/_references/`); no root `_references/` directory
- [x] Update all `@` paths in agent definitions for moved files
- [x] Update `@` paths in reviewer agent definitions for moved review files
- [x] Update `iteration-loop.md` line 48 and all other consumers to reference `skills/_references/reviewer-registry.md` via `@` include
- [x] Convert Read tool instructions in explore, status, upgrade SKILL.md files to `@` auto-includes for their local `references/*.md` files — but only for always-loaded top-level Read instructions. Preserve conditional/deferred Read for actual skill reference files only: `explore/references/explore-logic.md` (on-demand in Step 1), `status/references/status-logic.md` (conditional loading), `upgrade/references/migration-heuristics.md` (loaded in Step 4 only when answering questions). Note: project-data Reads (e.g., `.goodplan/` sequencing/expertise files) are out of scope for this restructuring
- [x] Convert `implement` SKILL.md's inline `@` reference to iteration-loop.md to a mandatory standalone `@` line (not embedded in prose). Accept the ~300-line context cost — Phase 3's loop consolidation depends on this reference loading reliably, and silent failure is the worst case
- [x] Verify build passes with new layout
- [x] Delete files identified as unused in the Phase 1 audit (including `state-and-activity-formats.md` — confirmed zero consumers) — deletions intentionally follow build verification so breakage is caught before removing files
- [x] Re-verify build passes after deletions. Diagnostic: first build (after moves) should succeed; second build (after zero-consumer deletions) should also succeed. If second fails, the Phase 1 audit missed a consumer

### Verification

`grep -ri 'read.*tool.*load\|read.*tool.*references\|Read tool.*\.md' skills/*/SKILL.md` returns zero hits for always-loaded reference file loading (manually exclude intentionally deferred/conditional Read calls). `grep -r '@\${CLAUDE_PLUGIN_ROOT}' skills/ agents/` — every referenced path exists. `skills/workflow-guide/SKILL.md` exists with correct frontmatter.

## Phase 3: Optimize Content for Context Efficiency

Trim, split, deduplicate, and consolidate reference content. Each consumer should load only the information it needs. Fix contradictions. Consolidate iteration loop implementations.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] Reference files contain content not used by any consumer (migration history, deprecated patterns, obvious examples)
- [x] `plan-slice`, `create-epic`, `create-side-quest` define iteration loops inline instead of referencing iteration-loop.md
- [x] Reference files may duplicate content that's in the workflow-guide skill

**After implementation** (should pass / show presence):
- [x] Every section in every reference file is used by at least one consumer
- [x] No reference file duplicates content in the workflow-guide skill
- [x] Where consumers use disjoint sections of a reference, the file is split so each loads only its portion
- [x] No contradictions between reference files, between references and skill instructions, or between references and the workflow-guide skill
- [x] All reference files are complete and correct — no consumer lost information it needs
- [x] `plan-slice`, `create-epic` (both arch and slices loops), and `create-side-quest` reference `iteration-loop.md` with skill-specific Loop Parameters instead of reimplementing inline
- [x] `iteration-loop.md` is complete enough to support all four consuming skills' loop patterns

### Tasks

- [x] For each reference file: remove sections no consumer uses (based on Phase 1 audit)
- [x] For each reference file: remove content that now lives in the workflow-guide skill
- [x] Where a reference serves multiple consumers with disjoint needs, split into focused files and update `@` paths
- [x] Review all references for contradictions; resolve them
- [x] Update `iteration-loop.md` to be complete and parameterizable for all four loop patterns (implement, plan-refinement, architecture-refinement, slices-refinement). The shared loop is scoped to **iteration control flow only** — exit criteria, stagnation detection, round directory management. Reviewer context assembly and score computation stay inline per skill (these diverge too much to parameterize cleanly). The Loop Parameters schema covers:
    - `max_iterations`: configurable (plan-slice/create-side-quest: 10, create-epic: 3, implement: 12)
    - `early_exit_threshold`: optional score threshold for early exit (implement only)
    - `override_flag`: optional `--override` CLI flag for stagnation exits (create-epic only)
    - `run_dir_mode`: `temp` (plan-slice, create-epic, create-side-quest) vs `persistent` with git commits (implement)
    - `submit_command`: skill-specific submit CLI command
    - `resume_detection`: optional, not applicable to all skills
    - `stagnation_window`: consecutive-no-change counter threshold (default: 2 for all skills — exit after N consecutive rounds with identical net score; counter resets on any score change)
    - `reduction_exit_threshold`: total rounds with net score decrease before exiting, any position — not necessarily consecutive (default: 2) — the counter never resets on improvement, only `stagnation_window` resets
- [x] Replace inline loop implementations in `plan-slice/SKILL.md` with reference to iteration-loop.md + Loop Parameters section. Each consuming skill includes a `## Loop Parameters` section in the same format as `implement/SKILL.md`
- [x] Replace inline loop implementations in `create-epic/SKILL.md` (both architecture and slices refinement) with references to iteration-loop.md + Loop Parameters sections
- [x] Replace inline loop implementation in `create-side-quest/SKILL.md` with reference to iteration-loop.md + Loop Parameters section
- [x] Verify completeness: for each consumer, confirm it still has access to all information it needs
  - Note: sanity-check that `@` include chain depth stays within 5 hops (current max is 2-3; the restructuring moves files but doesn't add nesting levels, so this is unlikely to be an issue)

### Verification

For each reference file: (a) every section has at least one consumer, (b) no duplication with workflow-guide, (c) no consumer lost access to needed information. For iteration loops: all four skills' Loop Parameters sections correctly parameterize the shared pattern.

**Score-sequence regression table** — for each skill, verify the consolidated Loop Parameters produce the same exit decision as the current inline implementation:

| Skill | Score Sequence | Expected Exit | Exit Reason |
|---|---|---|---|
| plan-slice | [6, 7, 8, 7, 6] | Exit at round 5 | reduction_exit_threshold: 2 total decreases (round 4: 8→7, round 5: 7→6) |
| plan-slice | [6, 5, 7, 8, 7] | Exit at round 5 | reduction_exit_threshold: 2 total decreases (round 2: 6→5, round 5: 8→7) — non-adjacent |
| create-epic (arch) | [5, 7, 8] | Exit at round 3 | max_iterations: 3 reached (score 8 < pass threshold 9) |
| create-epic (slices) | [8, 7, 6] | Exit at round 3 | reduction_exit_threshold: 2 total decreases (rounds 2-3) |
| create-side-quest | [6, 8, 8, 8] | Exit at round 4 | stagnation_window: 2 consecutive no-change rounds (rounds 3-4: both 8, below pass threshold 9) |
| implement | [7, 8, 9, 10] | Exit at round 4 | early_exit_threshold: score >= 10 |

## Phase 4: Build, Verify & End-to-End Test

Update build infrastructure for new directory structure. Verify the restructured plugin builds correctly, all references resolve, and the instructions produce correct LLM behavior without permission prompts.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] Build script assertions reference old directory structure

**After implementation** (should pass / show presence):
- [x] `bun run build` succeeds with no errors
- [x] Build script assertions updated for new directory structure (new shared directories, workflow-guide skill, removed files)
- [x] All `@` references in built `dist/gp-plugin/` resolve to existing files
- [x] Dogfood test harness runs on Opus with `bypassPermissions` and asserts zero `Read` tool calls targeting shared reference paths (`skills/_references/`, `agents/_references/`) — preserved conditional Reads for skill-local references (explore-logic.md, status-logic.md, migration-heuristics.md) are expected and excluded from this assertion
- [x] Dogfood test demonstrates correct LLM behavior: skills load restructured references and execute without errors (behavioral correctness beyond reference loading is verified by existing dogfood tests, not this restructuring-specific test)

### Tasks

- [x] Update `scripts/build-plugin.sh`: adjust assertions for new directory structure — use exact `-eq 13` skill count assertion with a comment listing expected skills (exact counts catch accidental additions; the deleted-skills guard handles regressions), reference directory checks, removed file guards
- [x] Verify no root `_references/` directory exists (two-tier layout: `skills/_references/` and `agents/_references/` only)
- [x] Confirm `agents/_references/` is present in dist after existing agents rsync (rsync -a handles subdirectories). Add assertion: `test -d "$PLUGIN_DIR/agents/_references/"` (parallels existing `skills/_references/` check)
- [x] Add brief comment in `build-plugin.sh` explaining the two-tier layout: `skills/_references/` (skill-shared + cross-consumer) vs `agents/_references/` (agent-only, primarily review criteria). Phase 4 verification: `grep -q 'two-tier' scripts/build-plugin.sh` confirms the comment exists
- [x] Run `bun run build` and fix any failures
- [x] Replace the existing agents-only `@` reference validation loop in `scripts/build-plugin.sh` (currently lines 190-215) with a single unified loop using glob `$PLUGIN_DIR/{skills,agents}/**/*.md` — this replaces, not supplements, the existing loop to avoid double-validating agent references
- [x] Verify all `@` references in `dist/gp-plugin/` resolve via the extended validation
- [x] Create or adapt dogfood test that exercises key flows on Opus with `bypassPermissions`: status query, plan creation (to test iteration loop), skill invocation (to test reference loading)
- [x] Assert zero `Read` tool calls targeting shared reference paths (`skills/_references/`, `agents/_references/`) in the tool call log — this verifies shared reference loading uses `@` auto-includes. Preserved conditional Reads for skill-local references are expected and excluded
- [x] Verify LLM behavior: skills execute correctly with restructured references and all `@` references resolve. Iteration loop convergence is not tested here — that is validated by re-running existing dogfood tests post-restructure. Note: workflow-guide auto-loading is best-effort supplementary context (relies on Claude's probabilistic description-matching) — do not depend on it for correctness; critical operational rules must be explicitly `@`-included by each skill that needs them
- [x] If test reveals broken instructions or missing context, fix in source and re-run

### Verification

Build succeeds. All `@` references resolve in dist. Dogfood test on Opus with `bypassPermissions`: (1) zero `Read` tool calls targeting shared reference paths (`skills/_references/`, `agents/_references/`) in tool call log, (2) correct LLM workflow behavior with restructured instructions.
