# Plugin API

## Purpose
Packages the goodplan CLI, skills, and hooks as a single Claude Code plugin (`gp`). Consumed by Claude Code's plugin system — not by the CLI codebase itself. Provides state protection enforcement and binary distribution.

## Plugin Directory Structure

```
gp-plugin/
├── .claude-plugin/
│   └── plugin.json
├── binaries/
│   └── macos-arm64/gp           # Compiled CLI binary
├── skills/
│   ├── _shared/                 # Shared references across skills
│   ├── explore/
│   ├── create-architecture/
│   ├── create-plan/
│   ├── create-slices/
│   ├── create-epic/
│   ├── complete/
│   ├── project-status/
│   └── ...                      # All skill directories from repo skills/
├── hooks/
│   ├── protect-state.sh         # Blocks Write/Edit on state files
│   ├── warn-bash-state.sh       # Warns on Bash referencing .goodplan/
│   └── hooks.json               # Hook configuration
└── CLAUDE.md                    # Universal goodplan instructions
```

## Plugin Manifest (`plugin.json`)

```json
{
  "name": "gp",
  "version": "1.0.0",
  "description": "goodplan — structured development workflow for Claude Code",
  "author": { "name": "Ian White" },
  "skills": "skills",
  "hooks": "hooks/hooks.json"
}
```

Version injected by `build:plugin` from `package.json`.

**Note:** The repo-root `.claude-plugin/marketplace.json` (marketplace manifest) and the built `dist/gp-plugin/.claude-plugin/plugin.json` (plugin manifest) use the same `.claude-plugin/` directory name in different contexts. The marketplace manifest lives in the source repo and points to the release branch. The plugin manifest lives inside the built plugin directory and declares plugin metadata.

## Hook Configuration (`hooks.json`)

```json
{
  "description": "Protects .goodplan/ state files from direct modification",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/protect-state.sh"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/warn-bash-state.sh"
          }
        ]
      }
    ]
  }
}
```

## Hook Scripts

### `protect-state.sh` (PreToolUse — Write/Edit)

**Input** (JSON on stdin):
```json
{
  "tool_name": "Write",
  "tool_input": { "file_path": "/abs/path/to/.goodplan/goodplan.json", "content": "..." },
  "cwd": "/abs/path/to/project"
}
```

**Logic:**
```bash
INPUT=$(cat)
FILE_PATH=$(python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('tool_input',{}).get('file_path',''))" <<< "$INPUT")
CWD=$(python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('cwd',''))" <<< "$INPUT")
```
1. Extract `tool_input.file_path` and `cwd` from stdin JSON in a single `python3` invocation
2. Check if path matches `$CWD/.goodplan/**/*.json` or `$CWD/.goodplan/**/*.jsonl`
3. If match -> exit 2, stderr: `"Blocked: direct write to .goodplan/ state file. Use the gp CLI instead (e.g., gp status, gp epic:create). See gp --help for available commands."`
4. If no match -> exit 0 (allow)

### `warn-bash-state.sh` (PreToolUse — Bash)

**Input** (JSON on stdin):
```json
{
  "tool_name": "Bash",
  "tool_input": { "command": "echo '{}' > .goodplan/foo.json" },
  "cwd": "/abs/path/to/project"
}
```

**Logic:**
```bash
INPUT=$(cat)
CWD=$(python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('cwd',''))" <<< "$INPUT")
COMMAND=$(python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('tool_input',{}).get('command',''))" <<< "$INPUT")
```
1. Extract `cwd` and `tool_input.command` from stdin JSON in a single `python3` invocation
2. Check if `$CWD/.goodplan-dev` sentinel file exists — if so, exit 0 (skip warning in dev repo)
3. Check if command contains `.goodplan/`
4. If match -> exit 0, stderr: `"Warning: This command references .goodplan/ files. State files should only be modified via the gp CLI. If this is intentional (e.g., reading docs), ignore this warning."`
5. If no match -> exit 0

## Plugin CLAUDE.md

Ships with the plugin. Additive to any project-level CLAUDE.md — the plugin's CLAUDE.md provides universal goodplan instructions, while projects can add project-specific customizations. Keep minimal to avoid duplication with project CLAUDE.md. Projects should update CLI references from `goodplan` to `gp` after the rename.

Provides universal instructions for any project using goodplan:

- Use `gp` CLI for all `.goodplan/` state mutations
- Never manually edit `.goodplan/` state files (`.json`, `.jsonl`)
- CLI owns JSON/JSONL; LLM owns markdown files (architecture, research, brainstorm, plans)
- Binary location: `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`
- Always use `--json` for structured output
- Pipe stdin for commands that accept input
- `nextCommands` in mutation responses are suggestions — they may fail due to guard conditions or other preconditions

## Build Pipeline (`build:plugin`)

A `package.json` script entry delegating to `scripts/build-plugin.sh` (following the existing `scripts/install-skills.sh` pattern). The shell script enables `set -e`, inline comments, and easier debugging for the multi-step build. Assembles `dist/gp-plugin/`:

1. Clean `dist/gp-plugin/`
2. Compile binary: `bun build --compile src/index.ts --outfile dist/gp-plugin/binaries/macos-arm64/gp --target=bun-darwin-arm64 --define __GP_VERSION__=\"<version>\" --define __GP_HMAC_KEY__=\"${GP_HMAC_KEY:-<dev-key>}\"`
   - Production: `GP_HMAC_KEY` env var injected from GitHub Actions secret `GP_HMAC_KEY`
   - Local dev: falls back to a well-known dev key hardcoded in the script (different from the production key)
3. Copy `skills/` -> `dist/gp-plugin/skills/`
4. Copy hook scripts from `plugin-hooks/` -> `dist/gp-plugin/hooks/` (`plugin-hooks/` is a new top-level directory in the repo, sibling to `skills/`, `scripts/`, `src/`)
5. Generate `.claude-plugin/plugin.json` with version from `package.json`
6. Copy plugin CLAUDE.md template -> `dist/gp-plugin/CLAUDE.md`
7. Validate: `claude plugin validate dist/gp-plugin/` if `claude` CLI is available. Fallback if unavailable: assert `plugin.json` exists and has required fields (`name`, `version`), assert `hooks.json` is valid JSON, assert binary is executable, assert skill directories contain `SKILL.md` files.

## Marketplace Manifest

At repo root: `.claude-plugin/marketplace.json`

```json
{
  "name": "goodplan-marketplace",
  "owner": { "name": "Ian White" },
  "plugins": [
    {
      "name": "gp",
      "source": {
        "source": "git-subdir",
        "url": "https://github.com/ian97531/project-skills.git",
        "path": "plugins/gp",
        "ref": "release"
      },
      "description": "goodplan — structured development workflow for Claude Code"
    }
  ]
}
```

## CI/CD Pipeline

GitHub Actions triggered on version tag push (`v*`):

1. **Build**: compile binary for macOS arm64 on a pinned macOS runner (`macos-15` with Bun) — do not use `macos-latest` as runner mapping can change
2. **Assemble**: run `build:plugin` with `env: { GP_HMAC_KEY: ${{ secrets.GP_HMAC_KEY }} }` mapped explicitly in the workflow step — without this, the build silently falls back to the dev key. (A `package.json` script entry, following the existing `install:skills` pattern.)
3. **Post-build assertion**: run the compiled binary with `--version --json` and verify it returns the expected version matching `plugin.json`. This catches broken binaries before they ship.
4. **Smoke test**: run each hook script (`protect-state.sh`, `warn-bash-state.sh`) with synthetic stdin JSON and verify expected exit codes. Confirm skill files are loadable (valid YAML frontmatter). This is the last gate before users receive the artifact.
5. **Validate**: `claude plugin validate dist/gp-plugin/` if `claude` CLI available in CI. Fallback: assert `plugin.json` exists with required fields, `hooks.json` is valid JSON, binary is executable, skill dirs contain `SKILL.md`.
6. **Upload release asset**: upload `dist/gp-plugin/` as a GitHub Release asset on the version tag for artifact traceability and debugging failed releases.
7. **Tag release**: tag the current commit on `release` branch before force-pushing (enables rollback via `git checkout <tag>`)
8. **Publish**: force-push contents of `dist/gp-plugin/` to `plugins/gp/` on the `release` branch (authenticated via `GITHUB_TOKEN` or deploy key)

**Release branch management:** Version tags on the release branch provide rollback points. Old tags are retained indefinitely (they're lightweight). The release branch itself is force-pushed on each release — no history accumulation. CI uses `concurrency: { group: release-pipeline, cancel-in-progress: false }` to serialize releases — cancelling a mid-release could leave the branch in a partial state.

**Rollback procedure:** If a release has functional regressions, reset the `release` branch to the previous version tag: `git push --force origin <previous-tag>:release`. Consider pinning a tag ref in the marketplace manifest instead of a branch ref for more controlled rollouts in the future.

**Platform constraint (v1):** macOS arm64 only — single runner, no cross-compilation matrix. Future multi-platform support will add a runner matrix.

## Development Testing

Test locally without installing:
```bash
bun run build:plugin
claude --plugin-dir dist/gp-plugin
```

## Contracts

- Plugin manifest version must match CLI binary version (both sourced from `package.json`)
- Hook scripts must not modify files or call the CLI — they are read-only interceptors
- Skills reference CLI at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` — never assume PATH availability. If binary is missing, fail with a clear platform constraint error.
- HMAC key is a stable constant injected from a CI secret — detects tampering (manual edits, bad merges, disk errors), not an access control mechanism

## Fitness Functions

### Hook correctly blocks Write/Edit on state files

- **Test file:** candidate — not yet written
- **Verifies:** `protect-state.sh` exits 2 when `file_path` matches `.goodplan/**/*.json` or `.goodplan/**/*.jsonl`, and exits 0 for non-state files (e.g., `.goodplan/brainstorm/foo.md`)

### Hook allows Write/Edit on LLM-owned markdown

- **Test file:** candidate — not yet written
- **Verifies:** `protect-state.sh` exits 0 when `file_path` targets markdown files within `.goodplan/` (architecture docs, research, brainstorm, plans)

### `build:plugin` produces a valid plugin directory

- **Test file:** candidate — not yet written
- **Verifies:** `claude plugin validate dist/gp-plugin/` passes after running `build:plugin`

## Dependencies

- Claude Code plugin runtime (hook execution, skill loading, `CLAUDE_PLUGIN_ROOT`/`CLAUDE_PLUGIN_DATA` variables)
- `bun build --compile` for binary compilation
- GitHub Actions for CI/CD
- `python3` in hook scripts for JSON parsing (guaranteed on macOS since Catalina)
