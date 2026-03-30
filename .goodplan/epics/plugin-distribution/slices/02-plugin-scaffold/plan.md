# Plan: Plugin Scaffold

## Overview

Create the Claude Code plugin directory structure, build script, and marketplace manifest. After this slice, `bun run build:plugin` assembles a valid `dist/gp-plugin/` directory that passes `claude plugin validate` and can be loaded with `claude --plugin-dir dist/gp-plugin`.

The build script (`scripts/build-plugin.sh`) compiles the binary with `__GOODPLAN_VERSION__` (matching slice 01 scope decisions) and includes a placeholder `__GP_HMAC_KEY__` define with a dev-key default for future slice 03. Skills and hooks directories are empty placeholders — populated by slices 4 and 6 respectively.

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
- [ ] `cat dist/gp-plugin/CLAUDE.md` — exists with universal goodplan instructions referencing `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`
- [ ] `ls dist/gp-plugin/skills/ dist/gp-plugin/hooks/` — both directories exist (empty placeholders)

### Tasks

- [ ] Create `scripts/build-plugin.sh` with `set -e`:
  1. Read version from `package.json` (same pattern as `install-skills.sh`)
  2. Clean and create `dist/gp-plugin/` directory structure: `.claude-plugin/`, `binaries/macos-arm64/`, `skills/`, `hooks/`
  3. Compile binary: `bun build --compile src/index.ts --outfile dist/gp-plugin/binaries/macos-arm64/gp --target=bun-darwin-arm64 --define __GOODPLAN_VERSION__=\"$VERSION\" --define __GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-key}\"`
  4. Generate `.claude-plugin/plugin.json` with `name: "gp"`, version from variable, `description`, `author`, `skills: "skills"`, `hooks: "hooks/hooks.json"` (hooks.json doesn't exist yet — that's fine, the manifest declares the path)
  5. Copy plugin CLAUDE.md template to `dist/gp-plugin/CLAUDE.md`
  6. Validate: `claude plugin validate dist/gp-plugin/` if `claude` CLI available, else fallback assertions (plugin.json exists, binary is executable)
  7. Print success summary with assembled file list
- [ ] Create `docs/plugin-claude-md.md` — the plugin CLAUDE.md template. Content: use `gp` CLI via `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` for all `.goodplan/` state mutations; never manually edit `.goodplan/` state files (`.json`, `.jsonl`); CLI owns JSON/JSONL, LLM owns markdown; always use `--json` for structured output; pipe stdin for input commands. Keep minimal — avoid duplicating project CLAUDE.md content.
- [ ] Add `"build:plugin": "bash scripts/build-plugin.sh"` to `package.json` scripts
- [ ] Add `dist/` to `.gitignore` (if not already present)

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
Run the compiled binary from its plugin location to confirm it's functional. Run `claude plugin validate dist/gp-plugin/` for structural validation. Verify plugin.json version matches `package.json` version.

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

### Tasks

- [ ] Create `.claude-plugin/marketplace.json` at repo root with `name: "goodplan-marketplace"`, owner, and plugin entry pointing to `plugins/gp/` on the `release` branch via `git-subdir` source. URL: `https://github.com/ian97531/project-skills.git`.
- [ ] Create empty `plugin-hooks/` directory at repo root with a `.gitkeep` file (this is where slice 4 will add hook scripts; the build script copies from here to `dist/gp-plugin/hooks/`)
- [ ] Add `.goodplan-dev` to `.gitignore` (sentinel file for dev repo detection — hooks skip warnings when present)
- [ ] Create `.goodplan-dev` sentinel file at repo root (marks this as the dev repo so hook scripts skip the bash-warning during development)

### Verification

Verify marketplace.json is valid JSON with correct structure. Verify plugin-hooks/ exists. Verify .gitignore has the new entries. Run `bun run test` and `bun run check` to confirm no regressions.
