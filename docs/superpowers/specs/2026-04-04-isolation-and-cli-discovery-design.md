# Isolation and CLI-First Discovery

**Date:** 2026-04-04
**Status:** Draft
**Problem:** Claude repeatedly confuses the repo source, installed plugin, and test harness — leading to cache pollution, leaked env vars, and stale `.goodplan/` path references in CLAUDE.md.

## Background

This repo builds the goodplan plugin. The plugin is also installed (via marketplace) and used by Claude Code sessions working in this repo. This creates a persistent confusion hazard between three worlds:

1. **Repo source** (`skills/`, `src/`) — what we edit
2. **Installed plugin** (`~/.claude/plugins/cache/...`) — a frozen published release
3. **Test harnesses** (`tools/dogfood/`) — build from repo, run against `dist/gp-plugin/` in `/tmp` fixtures

Recurring failures:
- Test harnesses spread `...process.env`, leaking installed plugin paths and Claude config vars into test sessions
- CLAUDE.md lists 13 hardcoded `.goodplan/` file paths, encouraging direct filesystem browsing instead of CLI discovery
- Skills write expertise data to `~/.claude/CLAUDE.md` instead of the plugin's persistent data directory
- A stale learning encouraged rsyncing into the installed plugin cache, polluting it with unreleased code

## Design

### 1. Plugin CLAUDE.md (`plugin/CLAUDE.md`)

Ships with the plugin. Applies to all users in all projects where the plugin is installed.

**Expand to cover:**

- **CLI-first discovery** — Don't browse `.goodplan/` directly. Use `gp status --json` to understand project state. Use CLI commands to get file paths for architecture, conventions, etc. that you should then read.
- **Hands-off policy** — Never write to `.goodplan/` state files. The CLI owns JSON/JSONL. The LLM owns markdown, but only at paths provided by the CLI.
- **CLI binary location** — The `gp` binary is on PATH (added automatically by Claude Code from `<plugin-root>/bin/`). Just call `gp` directly.
- **Expertise tracking** — Expertise data is stored in the plugin's persistent data directory. Skills reference `${CLAUDE_PLUGIN_DATA}/expertise.md` for reads and writes.

**Not changing:** The existing `PreToolUse` hooks (`protect-state.sh`, `warn-bash-state.sh`) remain as enforcement backstops.

### 2. Repo CLAUDE.md restructure

Applies only to Claude sessions working in this repo.

**New structure (reordered by importance):**

1. **Three Separate Things** — Moved to top. The three-world model (repo source / installed plugin / test harness) is the most critical guidance. Includes rules table.
2. **Test Harness Isolation** — Env whitelist, `settingSources: []`, `plugins: [{ type: "local" }]`, never touch `~/.claude/plugins/cache/`.
3. **Project Context** — Rewritten: "Use `gp status --json` to discover project state and architecture file paths. Use `gp --help` to discover available commands." All 13 hardcoded `.goodplan/` paths removed.
4. **Workflow Evolution Program** — Kept as-is (references `docs/` files, not `.goodplan/`).
5. **Agent SDK Test Harness** — Kept, updated to reflect env whitelist and isolation rules.

### 3. Harness env isolation (`tools/dogfood/`)

**Replace all `...process.env` spreads** with an explicit whitelist.

Minimum env vars needed for Agent SDK auth (experimentally verified):

| Var | Why |
|-----|-----|
| `PATH` | System tools (git, ls, etc.) + local plugin binary |
| `HOME` | Find `~/.claude/` credentials for auth |
| `USER` | Auth identity |

**PATH filtering:**
```typescript
// Strip installed plugin paths, add local plugin binary dir
const cleanPath = (process.env.PATH ?? "")
  .split(":")
  .filter(p => !p.includes("/.claude/plugins/"))
  .join(":");
const testPath = `${join(PLUGIN_DIR, "bin")}:${cleanPath}`;
```

**Final env:**
```typescript
env: {
  PATH: testPath,
  HOME: process.env.HOME,
  USER: process.env.USER,
}
```

**Files to update:** Every file in `tools/dogfood/` that sets `env:` on Agent SDK options:
- `harness.ts`
- `test-audit.ts`
- `test-complete-epic.ts`
- `test-create-epic.ts`
- `test-create-side-quest.ts`
- `test-implement.ts`
- `test-init.ts`
- `test-integration.ts`
- `test-plan-slice.ts`
- `test-plugin-skills.ts`
- `validate-consolidated.ts`
- `validate.ts`

Ideally centralize the env construction in `utils.ts` so harnesses call a shared function.

### 4. Plugin `bin/gp` launcher script

Add a cross-platform launcher script at `<plugin-root>/bin/gp` that detects the platform and execs the correct binary. Claude Code automatically adds `<plugin-root>/bin/` to PATH for installed plugins.

**Launcher script:**
```bash
#!/usr/bin/env sh
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)  exec "${0%/*}/../binaries/macos-arm64/gp" "$@" ;;
  Darwin-x86_64) exec "${0%/*}/../binaries/macos-x64/gp" "$@" ;;
  Linux-aarch64) exec "${0%/*}/../binaries/linux-arm64/gp" "$@" ;;
  Linux-x86_64)  exec "${0%/*}/../binaries/linux-x64/gp" "$@" ;;
  *) echo "gp: unsupported platform $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac
```

**Build script changes (`scripts/build-plugin.sh`):**
- Add `mkdir -p "$PLUGIN_DIR/bin"` and write the launcher script
- Keep compiling the binary to `binaries/macos-arm64/gp` as today
- `chmod +x "$PLUGIN_DIR/bin/gp"`

**Skill reference updates:**
- Update all skills that reference `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` to just use `gp` (since it's now on PATH)
- Update `plugin/CLAUDE.md` to reflect: "The `gp` binary is on PATH"

### 5. Expertise tracking migration

Move expertise data from `~/.claude/CLAUDE.md` to `${CLAUDE_PLUGIN_DATA}/expertise.md`.

**Behavior:**
- `${CLAUDE_PLUGIN_DATA}` resolves for marketplace-installed plugins (production) — expertise data persists across sessions
- `${CLAUDE_PLUGIN_DATA}` does NOT resolve for local plugins via Agent SDK (test harnesses) — the literal string `${CLAUDE_PLUGIN_DATA}` remains in the skill content. Skills should guard against this: check if the path exists before writing, and skip expertise tracking if it doesn't resolve. This prevents errors in test harnesses without requiring special test configuration.
- Substitution works in skill content but NOT in plugin CLAUDE.md

**Files to update:**
- `skills/explore/SKILL.md` — change expertise write target from `~/.claude/CLAUDE.md` to `${CLAUDE_PLUGIN_DATA}/expertise.md`
- `skills/init/references/expertise-profiling.md` — change expertise write target
- `skills/status/SKILL.md` — change expertise read source
- `skills/_shared/references/expertise-tracking.md` — update path references

### 6. Codebase audit

Verify no code writes to `~/.claude/`, `.claude/`, or `CLAUDE.md` outside the approved patterns.

**Audit scope:**

1. **Skill instructions** — Verify all `~/.claude/CLAUDE.md` references are updated to `${CLAUDE_PLUGIN_DATA}` (covered by Section 5)
2. **Harness files** — Verify every `...process.env` spread is replaced with whitelist (covered by Section 3)
3. **Build script** — Verify `build-plugin.sh` doesn't write outside `dist/gp-plugin/` (already confirmed clean)
4. **Plugin hooks** — Verify `protect-state.sh` and `warn-bash-state.sh` don't touch `~/.claude/` (already confirmed clean)
5. **Stale learnings** — The learning at `.goodplan/epics/simplify-data-model/slices/06-remaining-skills/learnings/agent-sdk-skill-discovery-requires-installed-plugin-cache.md` says harnesses "must rsync to the installed plugin cache." This is incorrect and should be corrected via `gp learning:add` with the corrected understanding.
6. **Stale comments** — Remove any comments in harness files referencing cache sync patterns.

## Key findings from investigation

| Finding | Detail |
|---------|--------|
| Agent SDK minimum env | `PATH`, `HOME`, `USER` — no `CLAUDE_*` vars needed |
| `${CLAUDE_PLUGIN_DATA}` for local plugins | Does NOT resolve — treated as literal/empty |
| `${CLAUDE_PLUGIN_ROOT}` for local plugins | Does NOT resolve — treated as literal |
| Plugin `bin/` PATH mechanism | Claude Code automatically adds `<plugin-root>/bin/` to PATH for all installed plugins |
| Plugin CLAUDE.md substitution | Variable substitution does NOT work in plugin CLAUDE.md |
| Current cache state | Polluted — v1.0.3 cache contains unreleased skills from a prior harness sync |

## Out of scope

- Cleaning the polluted plugin cache (`rm -rf ~/.claude/plugins/cache/goodplan-marketplace/goodplan/1.0.3`) — manual user action
- Compiling binaries for additional platforms (linux-x64, linux-arm64, macos-x64) — the launcher script supports them but we only compile macos-arm64 today
- Testing expertise tracking persistence end-to-end — requires marketplace-installed plugin
