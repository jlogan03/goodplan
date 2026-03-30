# Plan: Plugin Scaffold

## Overview

Create the Claude Code plugin directory structure, build script, and marketplace manifest. After this slice, `bun run build:plugin` assembles a valid `dist/gp-plugin/` directory that passes `claude plugin validate` and can be loaded with `claude --plugin-dir dist/gp-plugin`.

The build script (`scripts/build-plugin.sh`) compiles the binary with `__GOODPLAN_VERSION__` (matching slice 01 scope decisions). The `__GP_HMAC_KEY__` define is intentionally omitted — slice 03 adds both the define and the corresponding `declare const` in source together. Skills and hooks directories are empty placeholders — populated by slices 4 and 6 respectively.

> **Note:** The epic architecture doc (`plugin-api.md`) references `__GP_VERSION__`, but the actual source (`src/version.ts`) and slice 01 use `__GOODPLAN_VERSION__`. The architecture doc needs updating — this plan follows the source of truth.

## Phase 1: Build Script & Plugin Structure

Create the build pipeline and assembled plugin directory with compiled binary, plugin manifest, CLAUDE.md, and placeholder directories.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run build:plugin` — fails: script not found in package.json (`error: Script "build:plugin" not found`)
- [ ] `ls dist/gp-plugin/.claude-plugin/plugin.json` — fails: directory doesn't exist

**After implementation** (should pass / show presence):
- [ ] `bun run build:plugin` — exits 0, assembles `dist/gp-plugin/`
- [ ] `cat dist/gp-plugin/.claude-plugin/plugin.json | jq .name` — prints `"gp"`
- [ ] `dist/gp-plugin/binaries/macos-arm64/gp --version --json` — returns version matching `package.json`
- [ ] `claude plugin validate dist/gp-plugin/` — passes structural validation
- [ ] `claude --plugin-dir dist/gp-plugin --print-system-prompt 2>/dev/null | head -1` — plugin loads without errors (skip if `claude` CLI unavailable)
- [ ] `cat dist/gp-plugin/CLAUDE.md` — exists with universal goodplan instructions (generic, no `${CLAUDE_PLUGIN_ROOT}` references — binary path lives in skill content where variable substitution works)
- [ ] `ls dist/gp-plugin/skills/ dist/gp-plugin/hooks/` — both directories exist (empty placeholders)

### Tasks

- [ ] Create `scripts/build-plugin.sh` with `set -e`:
  1. Read version from `package.json` (same pattern as `install-skills.sh`)
  2. Clean and create `dist/gp-plugin/` directory structure: `.claude-plugin/`, `binaries/macos-arm64/`, `skills/`, `hooks/`
  3. Compile binary: `bun build --compile src/index.ts --outfile dist/gp-plugin/binaries/macos-arm64/gp --target=bun-darwin-arm64 --define "__GOODPLAN_VERSION__=\"$VERSION\""` (include a comment explaining `--target` is explicit because `build:plugin` always targets the v1 distribution platform — macOS arm64 — unlike `bun run build` which builds for the host)
  4. Generate `.claude-plugin/plugin.json` with `name: "gp"`, version from variable, `description`, `author`, `skills: "./skills"`, `hooks: "./hooks/hooks.json"` (hooks.json doesn't exist yet — the manifest declares the path forward-looking; if `claude plugin validate` fails on the missing file, create an empty `{"hooks": {}}` at `dist/gp-plugin/hooks/hooks.json` as a fallback)
  5. Copy plugin CLAUDE.md template to `dist/gp-plugin/CLAUDE.md`
  6. Validate: `claude plugin validate dist/gp-plugin/` if `claude` CLI available, else fallback assertions (plugin.json exists and is valid JSON via `jq . dist/gp-plugin/.claude-plugin/plugin.json > /dev/null`, binary is executable and runs via `dist/gp-plugin/binaries/macos-arm64/gp --version`)
  7. Print success summary with assembled file list
- [ ] Create `plugin/CLAUDE.md` — the plugin CLAUDE.md template. Content: generic goodplan instructions only — never manually edit `.goodplan/` state files (`.json`, `.jsonl`); CLI owns JSON/JSONL, LLM owns markdown; always use `--json` for structured output; pipe stdin for input commands. **Do NOT reference `${CLAUDE_PLUGIN_ROOT}` here** — variable substitution does not work in a plugin's root-level CLAUDE.md (see research: `claude-plugin-root-scope.md`). Binary path instructions belong in skill content (`skills/_shared/cli-usage.md`) where `${CLAUDE_PLUGIN_ROOT}` substitution is documented and working. Keep minimal — avoid duplicating project CLAUDE.md content. **Scoping note:** This file is loaded when using `--plugin-dir` (dev/testing) but may not be loaded for marketplace-installed plugins — CLAUDE.md discovery walks up from user cwd, not from the plugin cache. Universal instructions that must reach marketplace users should live in skill content instead. If marketplace testing in slice 07 confirms the file is not loaded, remove it from the build script and move any remaining instructions into skill content.
> **Deferred to slice 06:** `plugin/skills/_shared/cli-usage.md` (shared skill reference with `${CLAUDE_PLUGIN_ROOT}` binary path). No consumer until slice 06 copies skills into the plugin, and creating it now risks drift as slices 03-05 evolve binary path patterns. Note: `skills/_shared/` is safe in Claude Code plugins — directories without `SKILL.md` are silently ignored by auto-discovery.
- [ ] Add `"build:plugin": "bash scripts/build-plugin.sh"` to `package.json` scripts
- [ ] Add `dist/` to `.gitignore` (confirmed absent — definitive addition, not conditional)

### Verification

Run `bun run build:plugin` and verify the complete directory structure:
```
dist/gp-plugin/
├── .claude-plugin/plugin.json
├── binaries/macos-arm64/gp
├── skills/          (empty)
├── hooks/           (empty)
└── CLAUDE.md
```
Run the compiled binary from its plugin location to confirm it's functional. Run `claude plugin validate dist/gp-plugin/` for structural validation. If `claude` CLI is available, also run `claude --plugin-dir dist/gp-plugin` to confirm the plugin loads without errors. Verify plugin.json version matches `package.json` version. Also run `bun run build` (existing build script), `bun run test`, and `bun run check` to confirm no regressions from the `package.json` and `.gitignore` changes.

## Phase 2: Marketplace Manifest & Repo Config

Add the marketplace manifest at the repo root and create supporting directories for future slices.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `cat .claude-plugin/marketplace.json` — fails: file doesn't exist
- [ ] `ls plugin-hooks/` — fails: directory doesn't exist

**After implementation** (should pass / show presence):
- [ ] `cat .claude-plugin/marketplace.json | jq '.plugins[0].name'` — prints `"gp"`
- [ ] `cat .claude-plugin/marketplace.json | jq '.plugins[0].source.source'` — prints `"git-subdir"`
- [ ] `ls plugin-hooks/` — directory exists (empty — populated in slice 4)
- [ ] `cat .gitignore | grep '.goodplan-dev'` — entry exists
- [ ] `ls .goodplan-dev` — sentinel file exists
- [ ] `git status --porcelain .goodplan-dev` — no output (confirms file is gitignored)

### Tasks

- [ ] Create `.claude-plugin/marketplace.json` at repo root with `name: "goodplan-marketplace"`, owner, and plugin entry pointing to `plugins/gp/` on the `release` branch via `git-subdir` source. URL: `https://github.com/ian97531/project-skills.git`. (Note: `plugins/gp/` path is NOT created in this slice — CI assembles it on the release branch in slice 07. The `source.source` nested field structure is correct per marketplace schema.)
- [ ] Create empty `plugin-hooks/` directory at repo root with a `.gitkeep` file (this is where slice 04 will add hook scripts; slice 04 also adds the copy step to `build-plugin.sh` to copy from here to `dist/gp-plugin/hooks/`)
- [ ] Add `.goodplan-dev` to `.gitignore` — this is a local-only sentinel, not committed. Developers must create it manually after clone (correct for a dev-environment marker). The `.gitignore` entry documents its existence for discoverability.
- [ ] Create `.goodplan-dev` sentinel file at repo root (marks this as the dev repo so hook scripts skip the bash-warning during development; gitignored — each developer creates their own). This is a forward-looking placeholder — no hook consumes it until slice 04. Created now so the `.gitignore` entry and the file are introduced together for discoverability.

### Verification

Verify marketplace.json is valid JSON with correct structure. Verify plugin-hooks/ exists. Verify .gitignore has the new entries. Run `bun run test` and `bun run check` to confirm no regressions.
