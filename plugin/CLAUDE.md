# goodplan Plugin

## CLI-First Discovery

Do not browse `.goodplan/` directly. Use the `gp` CLI to discover project state and get file paths:

- `gp status --json` — project state, architecture file paths, epic/slice progress
- `gp --help` — discover available commands
- `gp status --json --query '.architecture'` — architecture file paths to read

The CLI returns paths to files you should read (architecture, conventions, etc.). Read those files, but discover them through the CLI rather than scanning the directory.

## Hands-Off Policy

Never write to `.goodplan/` state files (`.json`, `.jsonl`) — the CLI owns all structured data. The LLM owns markdown content, but only at paths provided by the CLI (e.g., architecture files, research, plans). The `PreToolUse` hooks (`protect-state.sh`, `warn-bash-state.sh`) enforce this — they will block direct writes to state files.

## CLI on PATH

The `gp` binary is on PATH (added automatically by Claude Code from the plugin's `bin/` directory). Use `gp` directly for all invocations:

- Always use `--json` for structured output when parsing results
- Pipe stdin for input commands (e.g., `echo '{"key":"value"}' | gp command --json`)
- Use `gp status --json` to check current project state

## Expertise Tracking

Expertise data is stored in the plugin's persistent data directory. Skills that track expertise read from and write to this location automatically. The data persists across sessions and projects where this plugin is installed.
