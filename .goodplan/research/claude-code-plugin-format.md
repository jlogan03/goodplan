# Claude Code Plugin Format — Research Findings

**Date:** 2026-03-29
**Sources:** Official Claude Code docs (code.claude.com), anthropics/claude-code repo, Context7

---

## 1. Plugin Manifest (`.claude-plugin/plugin.json`)

The manifest is **optional**. If omitted, Claude Code auto-discovers components in default locations and derives the plugin name from the directory name. If included, `name` is the only required field.

### Complete Schema

```json
{
  "name": "plugin-name",               // Required. Kebab-case, no spaces. Used for namespacing (e.g., /plugin-name:skill)
  "version": "1.2.0",                  // Semver. Determines update detection. If also set in marketplace entry, plugin.json wins.
  "description": "Brief description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://github.com/author"
  },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],

  // Component path overrides (replace defaults when specified)
  "commands": "./custom/commands/",       // string | array — replaces default commands/
  "agents": "./custom/agents/",           // string | array — replaces default agents/
  "skills": "./custom/skills/",           // string | array — replaces default skills/
  "hooks": "./config/hooks.json",         // string | array | object — can be inline
  "mcpServers": "./mcp-config.json",      // string | array | object — can be inline
  "outputStyles": "./styles/",            // string | array — replaces default output-styles/
  "lspServers": "./.lsp.json",            // string | array | object — can be inline

  // User-configurable values (prompted at enable time)
  "userConfig": {
    "api_endpoint": {
      "description": "Your team's API endpoint",
      "sensitive": false
    },
    "api_token": {
      "description": "API authentication token",
      "sensitive": true                   // Stored in system keychain, ~2KB limit
    }
  },

  // Channel declarations (message injection, e.g., Telegram/Slack/Discord)
  "channels": [
    {
      "server": "telegram",              // Must match a key in mcpServers
      "userConfig": { ... }              // Per-channel config
    }
  ]
}
```

### Field Categories

| Category | Fields |
|----------|--------|
| **Required** | `name` |
| **Metadata** | `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords` |
| **Component paths** | `commands`, `agents`, `skills`, `hooks`, `mcpServers`, `outputStyles`, `lspServers` |
| **User config** | `userConfig` (prompted at enable time, available as `${user_config.KEY}` and `CLAUDE_PLUGIN_OPTION_<KEY>` env vars) |
| **Channels** | `channels` (bind to MCP servers for message injection) |

### Path Behavior Rules

- All paths must be relative and start with `./`
- Custom paths **replace** defaults for `commands`, `agents`, `skills`, `outputStyles`
- To keep defaults AND add more: `"commands": ["./commands/", "./extras/deploy.md"]`
- `hooks`, `mcpServers`, `lspServers` have different merge semantics (additive)
- Arrays supported for multiple paths

---

## 2. Plugin Discovery and Installation

### Discovery Mechanisms

1. **Marketplaces** — catalogs of plugins in Git repos or URLs, registered via `/plugin marketplace add`
2. **Official marketplace** (`claude-plugins-official`) — auto-available, browsable at claude.com/plugins
3. **Local development** — `claude --plugin-dir ./my-plugin` for testing
4. **Team configuration** — `extraKnownMarketplaces` in `.claude/settings.json`

### Installation Scopes

| Scope | Settings file | Use case |
|-------|--------------|----------|
| `user` | `~/.claude/settings.json` | Personal, across all projects (default) |
| `project` | `.claude/settings.json` | Shared via version control |
| `local` | `.claude/settings.local.json` | Project-specific, gitignored |
| `managed` | Managed settings (read-only) | Organization-managed |

### Plugin Cache

Marketplace plugins are **copied** to `~/.claude/plugins/cache/` (not used in-place). This means:
- Paths that traverse outside the plugin root (`../shared-utils`) won't work
- Symlinks within the plugin dir ARE honored during copy
- Cache invalidation: `rm -rf ~/.claude/plugins/cache` to force re-copy

### Auto-Discovery Within a Plugin

When no manifest exists (or component paths aren't overridden), Claude Code scans these default locations:

| Component | Default location |
|-----------|-----------------|
| Manifest | `.claude-plugin/plugin.json` |
| Commands | `commands/` |
| Agents | `agents/` |
| Skills | `skills/` (subdirs with `SKILL.md`) |
| Output styles | `output-styles/` |
| Hooks | `hooks/hooks.json` |
| MCP servers | `.mcp.json` |
| LSP servers | `.lsp.json` |
| Settings | `settings.json` |

---

## 3. `${CLAUDE_PLUGIN_ROOT}` vs `${CLAUDE_PLUGIN_DATA}`

Both are substituted inline in skill content, agent content, hook commands, and MCP/LSP server configs. Both are also exported as environment variables to subprocesses.

### `${CLAUDE_PLUGIN_ROOT}`

- **Absolute path** to the plugin's installation directory
- **Changes on update** — files written here do NOT survive updates
- Use for referencing bundled scripts, binaries, config files

### `${CLAUDE_PLUGIN_DATA}`

- **Persistent directory** for plugin state that **survives updates**
- Resolves to `~/.claude/plugins/data/{id}/` where `{id}` is the sanitized plugin identifier
- Created automatically on first reference
- **Deleted** when plugin is uninstalled from last scope (unless `--keep-data`)
- Use for: installed dependencies (`node_modules`, venvs), generated code, caches, binaries

### Recommended Pattern: Dependency Installation

Use a `SessionStart` hook that compares bundled manifest against cached copy:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "diff -q \"${CLAUDE_PLUGIN_ROOT}/package.json\" \"${CLAUDE_PLUGIN_DATA}/package.json\" >/dev/null 2>&1 || (cd \"${CLAUDE_PLUGIN_DATA}\" && cp \"${CLAUDE_PLUGIN_ROOT}/package.json\" . && npm install) || rm -f \"${CLAUDE_PLUGIN_DATA}/package.json\""
      }]
    }]
  }
}
```

This covers both first-run and dependency-changing updates.

---

## 4. Hooks in Plugins

### Yes, Plugins Can Ship PreToolUse Hooks

Plugins support ALL hook event types (26+), including `PreToolUse`. Hook configuration lives at `hooks/hooks.json` in the plugin root, or inline in `plugin.json`.

### Hook Configuration Format

Three-level nesting: Event → Matcher Group → Handler(s)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/protect-state.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### PreToolUse Decision Control

PreToolUse hooks can output JSON with `hookSpecificOutput` to control execution:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "explanation",
    "updatedInput": { },
    "additionalContext": "context for Claude"
  }
}
```

- `"deny"` blocks the tool call, reason shown to Claude
- `"allow"` skips permission prompt
- `"ask"` prompts the user
- `updatedInput` can modify tool parameters before execution

### Hook Types

| Type | Description |
|------|-------------|
| `command` | Execute shell commands/scripts |
| `http` | POST event JSON to a URL |
| `prompt` | Evaluate a prompt with an LLM |
| `agent` | Run an agentic verifier with tools |

### All Supported Hook Events

`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `Stop`, `StopFailure`, `Notification`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`

### Hook Resolution Order

1. Built-in hooks (internal)
2. User settings hooks (`~/.claude/settings.json`)
3. Project settings hooks (`.claude/settings.json`)
4. Local settings hooks (`.claude/settings.local.json`)
5. **Plugin hooks** (when plugin enabled)
6. Managed policy hooks (organization-wide)

Plugin hooks merge with user/project hooks. Identical handlers are deduplicated (by command string or URL). All matching hooks run in parallel.

---

## 5. Skills in Plugins

### Auto-Discovery

Skills are auto-discovered in the `skills/` directory. Each skill is a subdirectory containing a `SKILL.md` file.

```
skills/
├── code-reviewer/
│   └── SKILL.md
├── pdf-processor/
│   ├── SKILL.md
│   ├── reference.md        # Optional supporting files
│   └── scripts/            # Optional scripts
```

### Namespacing

Plugin skills are namespaced: `/<plugin-name>:<skill-name>`. Example: a skill `code-review` in plugin `goodplan` becomes `/goodplan:code-review`.

### SKILL.md Format

```markdown
---
name: code-review
description: Reviews code for best practices. Use when reviewing code or checking PRs.
---

Instructions for the skill...
```

Skills can include supporting files alongside `SKILL.md`. The `$ARGUMENTS` placeholder captures user input after the skill name. `${CLAUDE_PLUGIN_ROOT}` is substituted in skill content.

### Commands (Legacy)

`commands/` directory holds simple markdown files (legacy; prefer `skills/` for new work). These are also auto-discovered and namespaced.

---

## 6. Setup Scripts

There is no dedicated "setup script" mechanism. Instead, use **`SessionStart` hooks** to run setup logic:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/setup.sh"
      }]
    }]
  }
}
```

Common setup patterns:
- **Binary installation**: symlink bundled binary to `${CLAUDE_PLUGIN_DATA}/bin/`
- **Dependency installation**: `npm install` or `pip install` into `${CLAUDE_PLUGIN_DATA}`
- **First-run detection**: compare manifest file against `${CLAUDE_PLUGIN_DATA}` copy

The `SessionStart` matcher can distinguish session types: `startup`, `resume`, `clear`, `compact`.

---

## 7. Versioning and Updates

### Version Format

Semantic versioning (`MAJOR.MINOR.PATCH`). Set in `plugin.json` or in `marketplace.json` (plugin.json takes priority if both set).

### Update Mechanism

- `claude plugin update <plugin> [--scope <scope>]` — updates to latest version
- **Claude Code uses version to detect updates**. If code changes but version doesn't bump, users won't see changes due to caching.
- Pre-release versions supported: `2.0.0-beta.1`

### Auto-Updates

- Official marketplaces: auto-update **enabled** by default
- Third-party/local marketplaces: auto-update **disabled** by default
- Toggle per-marketplace via `/plugin` > Marketplaces > select > Enable/Disable auto-update
- `DISABLE_AUTOUPDATER=true` disables all auto-updates
- `FORCE_AUTOUPDATE_PLUGINS=true` keeps plugin auto-updates even when `DISABLE_AUTOUPDATER` is set

### Update Behavior

- `${CLAUDE_PLUGIN_ROOT}` is replaced on update (bundled files refreshed)
- `${CLAUDE_PLUGIN_DATA}` survives updates (persistent state preserved)
- Use `SessionStart` hooks to detect changed dependencies and re-install

---

## Implications for goodplan Plugin

Based on this research, the goodplan plugin design in `Target Workflow Vision.md` aligns well with the official plugin format:

1. **State protection** — `PreToolUse` hooks with `deny` decision work exactly as envisioned. The hook can block `Write|Edit` on `.project/*.json` and `.project/*.jsonl` files.

2. **Binary distribution** — Use `SessionStart` hook to symlink from `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/goodplan` to `${CLAUDE_PLUGIN_DATA}/bin/goodplan`. The binary survives updates in `CLAUDE_PLUGIN_DATA`.

3. **Skills** — Place all workflow skills in `skills/` with `SKILL.md` files. They'll be namespaced as `/goodplan:<skill-name>`. Auto-discovery handles the rest.

4. **Atomic versioning** — Bump `version` in `plugin.json` for each release. CLI, skills, and hooks update together since `CLAUDE_PLUGIN_ROOT` is replaced atomically.

5. **No `CLAUDE_PLUGIN_DATA` for binary** — The vision doc's approach of putting the binary in `CLAUDE_PLUGIN_DATA` is correct. The binary should live there (persistent) with a `SessionStart` hook that copies/symlinks from `CLAUDE_PLUGIN_ROOT` on version change.

6. **Distribution** — Can use the official marketplace submission flow, a team marketplace via Git repo, or `--plugin-dir` for development.

### Open Questions

- **Multi-platform binaries**: Plugin format doesn't natively support platform detection. The `SessionStart` hook script would need to detect `uname` and select the right binary.
- **Skill name length**: All skills get `/goodplan:` prefix. Current skill names like `project-status` become `/goodplan:project-status` — acceptable but verbose.
- **Plugin size limits**: No documented size limits for plugins in the cache, but large binaries (~50MB+) could slow marketplace cloning.
- **`userConfig` for telemetry endpoint**: Could use `userConfig` with `sensitive: false` for optional telemetry endpoint configuration rather than requiring manual setup.

---

## Sources

- [Plugins reference — Claude Code Docs](https://code.claude.com/docs/en/plugins-reference)
- [Create plugins — Claude Code Docs](https://code.claude.com/docs/en/plugins)
- [Hooks reference — Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Discover and install plugins — Claude Code Docs](https://code.claude.com/docs/en/discover-plugins)
- [Plugin marketplaces — Claude Code Docs](https://code.claude.com/docs/en/plugin-marketplaces)
- [anthropics/claude-code plugins README](https://github.com/anthropics/claude-code/blob/main/plugins/README.md)
- [anthropics/claude-code plugin-structure skill](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/plugin-structure/SKILL.md)
