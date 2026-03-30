# Brainstorm: Plugin Design & Distribution

## Naming

- **Product name**: "goodplan" stays in prose references to the workflow system
- **CLI binary**: renamed from `goodplan` to `gp`
- **Plugin name**: `gp` — skills invoked as `/gp:create-plan`, `/gp:explore`, etc.
- **Skill/CLI references**: all `goodplan` invocations in skill bodies and references updated to `gp`
- **No backward compatibility** with `goodplan` binary name — clean break via plugin distribution

## State Protection Hook Design

| Tool | Action | Mechanism |
|---|---|---|
| Write, Edit | **Block** (exit 2) | Check `file_path` matches `.project/**/*.json` or `.project/**/*.jsonl` |
| Bash | **Warn** (exit 0, advisory on stderr) | Grep command string for `.project/` — emit warning |

- Bash warning skipped when `cwd` is the goodplan source repo (detect via marker file)
- Warning message: advisory only, suggests using `gp` CLI instead
- Write/Edit block message: explains which CLI command to use instead

## CLI Affordances (`nextCommands`)

Every mutation response includes available next actions:

```json
{
  "nextCommands": {
    "entity": [
      { "command": "gp submit-explore --epic plugin-distribution", "description": "Complete exploration phase" },
      { "command": "gp epic:show --epic plugin-distribution", "description": "View epic details" }
    ],
    "other": [
      { "command": "gp quest:create", "description": "Create a side quest" },
      { "command": "gp task:create", "description": "Capture a quick task" }
    ]
  }
}
```

- **Entity commands**: both mutations and reads for the entity just acted on
- **Other commands**: mutations only (skip read-only like `status`, `list`, `show`, `state`)
- Computed in the **RPC layer** — it has context of both entity state and CLI command surface
- Read-only commands (`status`, `show`, `list`, `state`) do NOT include `nextCommands`

## Build Pipeline

`bun run build:plugin` assembles `dist/gp-plugin/`:

```
dist/gp-plugin/
├── .claude-plugin/
│   └── plugin.json          # name: "gp", version from package.json
├── binaries/
│   └── macos-arm64/gp       # compiled binary
├── skills/
│   └── <all skill dirs>/    # copied from repo skills/
├── hooks/
│   ├── protect-state.sh     # PreToolUse: block Write/Edit on state files
│   ├── warn-bash-state.sh   # PreToolUse: warn on Bash commands referencing .project/
│   └── hooks.json           # hook configuration
└── CLAUDE.md                # universal goodplan instructions
```

Steps:
1. Compile binary: `bun build --compile src/index.ts --outfile dist/gp-plugin/binaries/macos-arm64/gp --target=bun-darwin-arm64`
2. Copy `skills/` → `dist/gp-plugin/skills/`
3. Copy hook scripts → `dist/gp-plugin/hooks/`
4. Generate `plugin.json` with version from `package.json`

## Distribution

- **Development testing**: `claude --plugin-dir dist/gp-plugin` or test harness equivalent
- **Real installs**: marketplace manifest in GitHub repo → users add marketplace
- No `install:skills` replacement needed — existing script stays for current workflow until migration

### Single-Repo Distribution

The goodplan source repo can serve as its own marketplace:
- `marketplace.json` at repo root with `git-subdir` source pointing to the built plugin
- CI builds plugin and commits to a **release branch** (keeps `main` clean of the 58 MB binary)
- Or uses Git LFS for the binary in a `plugin/` directory on `main`

## Plugin CLAUDE.md

Universal instructions that ship with the plugin (replaces project-level CLAUDE.md goodplan sections):
- "Use `gp` CLI for all `.project/` state mutations"
- "Never manually edit `.project/` state files (`.json`, `.jsonl`)"
- Data ownership rules (CLI owns JSON/JSONL, LLM owns markdown)
- Brief CLI interaction patterns

## Open Questions for Architecture

1. Release branch vs Git LFS vs separate repo for binary distribution
2. Exact marketplace manifest format and `git-subdir` configuration
3. CI pipeline design (GitHub Actions: build, test, assemble plugin, push to release branch)
4. `nextCommands` data structure in the RPC layer — static registry vs derived from transition tables
5. Reliable detection of "goodplan repo" in Bash warning hook
6. SessionStart hook for binary setup — symlink to `CLAUDE_PLUGIN_DATA/bin/gp` and PATH integration
7. How does `CLAUDE_PLUGIN_DATA` get added to PATH? Does the setup script need to modify shell config, or does Claude Code handle it?

## Decisions

- Clean break from `goodplan` CLI name — no backward compat shim
- State protection blocks Write/Edit, warns on Bash (advisory only)
- `nextCommands` computed in RPC layer, included in mutation responses only
- Single-repo distribution preferred over separate marketplace repo
- Plugin includes CLAUDE.md with universal instructions
