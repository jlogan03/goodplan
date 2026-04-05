# Plan: Isolation and CLI-First Discovery

## Overview

Enforce isolation boundaries between repo source, installed plugin, and test harnesses. This quest delivers six changes: (1) a cross-platform `bin/gp` launcher script in the plugin so `gp` is on PATH, (2) an expanded `plugin/CLAUDE.md` with CLI-first discovery and hands-off policy, (3) hardened test harness env using a whitelist instead of `...process.env` spreads, (4) a restructured repo `CLAUDE.md` with three-world model at top and no `.goodplan/` file paths, (5) expertise tracking migrated from `~/.claude/CLAUDE.md` to `${CLAUDE_PLUGIN_DATA}/expertise.md`, and (6) a codebase audit for stale cache-sync patterns and learnings.

**Slug**: `isolation-cli-discovery`

**Design spec**: `docs/superpowers/specs/2026-04-04-isolation-and-cli-discovery-design.md`

## Phase 1: Plugin bin/gp Launcher

Add a cross-platform shell script launcher at `bin/gp` in the plugin dist, and update the build script to create it. This is foundational because subsequent phases reference "gp on PATH."

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls dist/gp-plugin/bin/gp` returns "No such file or directory"
- [ ] `grep -c 'mkdir.*bin' scripts/build-plugin.sh` returns 0

**After implementation** (should pass / show presence):
- [ ] `bun run build:plugin` succeeds (exit 0)
- [ ] `ls dist/gp-plugin/bin/gp` shows the file exists
- [ ] `file dist/gp-plugin/bin/gp` shows "shell script" or "text"
- [ ] `dist/gp-plugin/bin/gp --version` outputs the CLI version (same as `dist/gp-plugin/binaries/macos-arm64/gp --version`)
- [ ] `head -1 dist/gp-plugin/bin/gp` shows `#!/usr/bin/env sh`

### Tasks

- [ ] Create `plugin/bin/gp` source file with the cross-platform launcher script from the design spec:
  ```sh
  #!/usr/bin/env sh
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64)  exec "${0%/*}/../binaries/macos-arm64/gp" "$@" ;;
    Darwin-x86_64) exec "${0%/*}/../binaries/macos-x64/gp" "$@" ;;
    Linux-aarch64) exec "${0%/*}/../binaries/linux-arm64/gp" "$@" ;;
    Linux-x86_64)  exec "${0%/*}/../binaries/linux-x64/gp" "$@" ;;
    *) echo "gp: unsupported platform $(uname -s)-$(uname -m)" >&2; exit 1 ;;
  esac
  ```
- [ ] Update `scripts/build-plugin.sh` to copy `bin/gp` into the plugin dist:
  - After the `mkdir -p "$PLUGIN_DIR/hooks"` line, add `mkdir -p "$PLUGIN_DIR/bin"`
  - After copying hooks, add `cp "$REPO_ROOT/plugin/bin/gp" "$PLUGIN_DIR/bin/gp"` and `chmod +x "$PLUGIN_DIR/bin/gp"`
- [ ] Update `scripts/build-plugin.sh` fallback assertions to verify `bin/gp` is executable: add `test -x "$PLUGIN_DIR/bin/gp"` and an echo confirming it

### Verification

- Run `bun run build:plugin` and confirm it passes all existing assertions plus the new bin/gp check.
- Run `dist/gp-plugin/bin/gp --version` and confirm output matches `dist/gp-plugin/binaries/macos-arm64/gp --version`.

## Phase 2: Update Skill Binary References

Update all skills and the shared CLI interaction reference to use `gp` (on PATH) instead of `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r 'CLAUDE_PLUGIN_ROOT.*binaries/macos-arm64/gp' skills/` returns matches in 11 skill files plus `_shared/references/cli-interaction.md`

**After implementation** (should pass / show presence):
- [ ] `grep -r 'CLAUDE_PLUGIN_ROOT.*binaries/macos-arm64/gp' skills/` returns zero matches
- [ ] `grep -r 'GP="gp"' skills/` or `grep -r '"gp" --version' skills/` shows all skills now reference `gp` directly
- [ ] `bun run build:plugin` still passes (no regressions)

### Tasks

- [ ] Update `skills/_shared/references/cli-interaction.md`:
  - Section 1 "Binary Detection & Version": change `"${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"` to `gp` throughout
  - Remove the paragraph about `${CLAUDE_PLUGIN_ROOT}` substitution; replace with: "The `gp` binary is on PATH (automatically added by Claude Code from the plugin's `bin/` directory). Use `gp` directly for all invocations."
  - Update all code examples to use `gp` instead of the full path
- [ ] Update the following skill files to replace `GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"` with `GP="gp"` (or equivalent direct `gp` invocations):
  - `skills/audit/SKILL.md`
  - `skills/task/SKILL.md`
  - `skills/plan-slice/SKILL.md`
  - `skills/explore/SKILL.md`
  - `skills/create-epic/SKILL.md`
  - `skills/status/SKILL.md`
  - `skills/implement/SKILL.md`
  - `skills/create-side-quest/SKILL.md`
  - `skills/complete-epic/SKILL.md`
  - `skills/upgrade/SKILL.md`
  - `skills/init/SKILL.md`

### Verification

- `grep -r 'CLAUDE_PLUGIN_ROOT.*binaries' skills/` returns zero matches.
- `bun run build:plugin` passes.

## Phase 3: Plugin CLAUDE.md Expansion

Rewrite `plugin/CLAUDE.md` to cover CLI-first discovery, hands-off policy, and `gp` on PATH. This ships with the plugin and applies to all users.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `wc -l plugin/CLAUDE.md` shows ~13 lines
- [ ] `grep -c 'CLI-first\|hands-off\|on PATH' plugin/CLAUDE.md` returns 0

**After implementation** (should pass / show presence):
- [ ] `grep 'CLI-first\|hands-off\|on PATH' plugin/CLAUDE.md` returns matches for all three concepts
- [ ] `grep 'binaries/macos-arm64' plugin/CLAUDE.md` returns zero matches (no hardcoded binary path)
- [ ] `plugin/CLAUDE.md` covers: CLI-first discovery, hands-off policy, `gp` on PATH, expertise tracking via `${CLAUDE_PLUGIN_DATA}`

### Tasks

- [ ] Rewrite `plugin/CLAUDE.md` with the following sections:
  1. **CLI-first discovery** — Don't browse `.goodplan/` directly. Use `gp status --json` to understand project state. Use CLI commands to get file paths for architecture, conventions, etc., then read those files.
  2. **Hands-off policy** — Never write to `.goodplan/` state files. The CLI owns JSON/JSONL. The LLM owns markdown, but only at paths provided by the CLI. The PreToolUse hooks (`protect-state.sh`, `warn-bash-state.sh`) enforce this.
  3. **CLI on PATH** — The `gp` binary is on PATH (added automatically by Claude Code from the plugin's `bin/` directory). Just call `gp` directly. Use `--json` for structured output. Use `gp --help` to discover commands.
  4. **Expertise tracking** — Expertise data is stored in the plugin's persistent data directory. Skills reference `${CLAUDE_PLUGIN_DATA}/expertise.md`.
  - Note: variable substitution does NOT work in plugin CLAUDE.md, so describe concepts without using `${CLAUDE_PLUGIN_DATA}` paths. Refer to "the plugin's persistent data directory" conceptually.

### Verification

- `bun run build:plugin` passes (copies updated CLAUDE.md).
- Read the built `dist/gp-plugin/CLAUDE.md` and confirm content covers all four sections.

## Phase 4: Harness Environment Isolation

Replace all `...process.env` spreads in dogfood harness files with a whitelist-only env. Centralize the env construction in `utils.ts`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r '\.\.\.process\.env' tools/dogfood/` returns 25+ matches across 12 files

**After implementation** (should pass / show presence):
- [ ] `grep -r '\.\.\.process\.env' tools/dogfood/` returns zero matches
- [ ] `grep -c 'makeTestEnv\|createTestEnv\|testEnv' tools/dogfood/utils.ts` returns at least 1 (centralized helper exists)
- [ ] Every harness file that previously used `...process.env` now calls the shared helper

### Tasks

- [ ] Add a `createTestEnv` function to `tools/dogfood/utils.ts`:
  ```typescript
  export function createTestEnv(pluginDir: string): Record<string, string> {
    const cleanPath = (process.env.PATH ?? "")
      .split(":")
      .filter(p => !p.includes("/.claude/plugins/"))
      .join(":");
    const testPath = `${join(pluginDir, "bin")}:${cleanPath}`;
    return {
      PATH: testPath,
      HOME: process.env.HOME ?? "",
      USER: process.env.USER ?? "",
    };
  }
  ```
- [ ] Update every harness file to use the shared helper. For each file, replace the `env: { ...process.env, PATH: ... }` block with `env: createTestEnv(PLUGIN_DIR)`. Files to update (26 occurrences across 12 files):
  - `tools/dogfood/test-plugin-skills.ts` (1 occurrence at line 157)
  - `tools/dogfood/test-plan-slice.ts` (1 occurrence)
  - `tools/dogfood/test-integration.ts` (1 occurrence)
  - `tools/dogfood/validate-consolidated.ts` (1 occurrence)
  - `tools/dogfood/harness.ts` (1 occurrence)
  - `tools/dogfood/test-implement.ts` (5 occurrences)
  - `tools/dogfood/test-init.ts` (5 occurrences)
  - `tools/dogfood/test-create-epic.ts` (3 occurrences)
  - `tools/dogfood/validate.ts` (1 occurrence)
  - `tools/dogfood/test-complete-epic.ts` (1 occurrence)
  - `tools/dogfood/test-audit.ts` (2 occurrences)
  - `tools/dogfood/test-create-side-quest.ts` (3 occurrences)
- [ ] Remove the `import { join } from "node:path"` if it becomes unused after the refactor (unlikely — most files already use it for other purposes)

### Verification

- `grep -r '\.\.\.process\.env' tools/dogfood/` returns zero matches.
- `grep -r 'createTestEnv' tools/dogfood/` shows usage in all 12 harness files.
- TypeScript compilation: `bunx tsc --noEmit tools/dogfood/utils.ts` passes (or equivalent type check).

## Phase 5: Repo CLAUDE.md Restructure

Restructure the repo `CLAUDE.md` to lead with the three-world model, remove hardcoded `.goodplan/` paths, and use CLI-first discovery.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `head -20 CLAUDE.md` starts with `# goodplan` then `## Project Context`
- [ ] `grep -c '\.goodplan/' CLAUDE.md` returns a high count (13+ hardcoded `.goodplan/` file paths in the Project Context section)

**After implementation** (should pass / show presence):
- [ ] The first major section after `# goodplan` is "Three Separate Things" (the three-world model)
- [ ] `grep 'gp status --json\|gp --help' CLAUDE.md` returns matches (CLI-first discovery)
- [ ] The "Project Context" section no longer lists individual `.goodplan/` file paths; instead it directs to `gp status --json` and `gp --help`
- [ ] `.goodplan/` paths that remain are limited to the `docs/` and Workflow Evolution sections (which reference files outside `.goodplan/`)

### Tasks

- [ ] Move "Three Separate Things" section to immediately after `# goodplan`, before "Project Context". This is the most critical guidance for this repo.
- [ ] Add "Test Harness Isolation" as a new section after "Three Separate Things", documenting:
  - Env whitelist: PATH (filtered), HOME, USER
  - `settingSources: []` — no user config leakage
  - `plugins: [{ type: "local", path: PLUGIN_DIR }]` — local plugin only
  - Never touch `~/.claude/plugins/cache/`
- [ ] Rewrite "Project Context" section:
  - Replace the 13 hardcoded `.goodplan/` file paths with: "Use `gp status --json` to discover project state and architecture file paths. Use `gp --help` to discover available commands."
  - Keep the "Also check if relevant" subsection that references `docs/` files (these are NOT `.goodplan/` paths)
  - Keep reference to `.goodplan/idea.md` and `.goodplan/conventions.md` only if they are LLM-owned markdown (check — they are, so brief mention is OK but frame as "read via CLI paths")
- [ ] Update "Agent SDK Test Harness" section to reference the env whitelist and isolation rules from the new section
- [ ] Keep "Workflow Evolution Program" as-is (it references `docs/` files, not `.goodplan/`)

### Verification

- Read the restructured `CLAUDE.md` and confirm the section order matches the design.
- `grep -c '\.goodplan/architecture/' CLAUDE.md` returns 0 (no hardcoded architecture paths).
- The three-world rules table is present near the top.

## Phase 6: Expertise Tracking Migration

Migrate expertise data storage from `~/.claude/CLAUDE.md` to `${CLAUDE_PLUGIN_DATA}/expertise.md`. Update all skill files that reference the old location.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r '~/.claude/CLAUDE.md' skills/` returns matches in `explore/SKILL.md`, `status/SKILL.md`, `_shared/references/expertise-tracking.md`

**After implementation** (should pass / show presence):
- [ ] `grep -r '~/.claude/CLAUDE.md' skills/` returns zero matches
- [ ] `grep -r 'CLAUDE_PLUGIN_DATA.*expertise' skills/` returns matches in the updated files
- [ ] `grep -r 'guard\|resolve\|exists' skills/_shared/references/expertise-tracking.md` shows guard logic for unresolved paths

### Tasks

- [ ] Rewrite `skills/_shared/references/expertise-tracking.md`:
  - Change the two-layer system from `~/.claude/CLAUDE.md` + `~/.claude/projects/<project>/memory/` to `${CLAUDE_PLUGIN_DATA}/expertise.md` as single source
  - Add guard instructions: "Before writing, check if the path `${CLAUDE_PLUGIN_DATA}/expertise.md` resolves to a real filesystem path. If `${CLAUDE_PLUGIN_DATA}` is still a literal string (unresolved), skip expertise tracking silently. This happens in test harnesses where the plugin is loaded locally."
  - Update the format section to describe the single-file `expertise.md` format
  - Update the "When to Create/Update" section to reference `${CLAUDE_PLUGIN_DATA}/expertise.md`
  - Remove references to `~/.claude/projects/<project>/memory/expertise_<domain>.md` auto memory files
- [ ] Update `skills/explore/SKILL.md`:
  - Step 5b "Expertise Check": change `~/.claude/CLAUDE.md` references to `${CLAUDE_PLUGIN_DATA}/expertise.md`
  - Add guard for unresolved `${CLAUDE_PLUGIN_DATA}`
- [ ] Update `skills/status/SKILL.md`:
  - Step 7b "Load Expertise Summary": change from reading `~/.claude/CLAUDE.md` `## Expertise` to reading `${CLAUDE_PLUGIN_DATA}/expertise.md`
  - Add guard for unresolved path
  - Update output format templates that reference "from CLAUDE.md ## Expertise"
- [ ] Update `skills/init/references/expertise-profiling.md`:
  - Section 5 "Two-Layer Expertise Protocol": update write targets from `~/.claude/CLAUDE.md` to `${CLAUDE_PLUGIN_DATA}/expertise.md`
  - Remove references to auto memory files in `~/.claude/projects/`
- [ ] Verify no other skill files reference `~/.claude/CLAUDE.md` for expertise: `grep -r '~/.claude/CLAUDE.md' skills/`

### Verification

- `grep -r '~/.claude/CLAUDE.md' skills/` returns zero matches.
- `grep -r 'CLAUDE_PLUGIN_DATA' skills/_shared/references/expertise-tracking.md` returns matches.
- `bun run build:plugin` passes.

## Phase 7: Codebase Audit and Stale Cleanup

Audit for stale cache-sync patterns, incorrect learnings, and stale comments. Correct via CLI and file edits.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -r 'cache sync\|rsync.*plugin.*cache' tools/dogfood/` returns stale comments
- [ ] The learning at `.goodplan/epics/simplify-data-model/slices/06-remaining-skills/learnings/agent-sdk-skill-discovery-requires-installed-plugin-cache.md` contains incorrect guidance about cache syncing

**After implementation** (should pass / show presence):
- [ ] `grep -r 'cache sync' tools/dogfood/` returns zero matches (stale comments removed)
- [ ] A corrected learning exists via `gp learning:list --json` that says Agent SDK local plugin path is sufficient without cache sync
- [ ] `grep 'cache.sync\|rsync.*plugin.*cache' .goodplan/project-health.md` — the stale cache-sync bullet in project-health.md is corrected or removed

### Tasks

- [ ] Remove stale cache-sync comments from harness files:
  - `tools/dogfood/validate-consolidated.ts` line 103: remove comment `// Local plugin path (PLUGIN_DIR) is passed directly to Agent SDK — no cache sync needed.`
  - `tools/dogfood/test-implement.ts` line 140: remove similar stale comment
  - Search for any other `cache sync` or `cache-sync` comments in `tools/dogfood/` and remove
- [ ] Add corrected learning via CLI: `gp learning:add` with summary "Agent SDK local plugin path is sufficient for skill discovery — no cache sync to installed plugin cache is needed" and appropriate tags
- [ ] Update `.goodplan/project-health.md` to remove or correct the stale bullet about "Agent SDK skill discovery requires both local plugin path AND installed cache sync"
- [ ] Final audit grep to confirm no remaining stale patterns:
  - `grep -r 'rsync.*\.claude/plugins' .` should return zero matches (excluding build-plugin.sh which rsyncs to dist/, not cache)
  - `grep -r '\.claude/CLAUDE\.md' skills/` should return zero matches (from Phase 6)
  - `grep -r '\.\.\.process\.env' tools/dogfood/` should return zero matches (from Phase 4)

### Verification

- All audit greps pass clean.
- `gp learning:list --json` shows the corrected learning.
- `bun run build:plugin` passes as final integration check.
