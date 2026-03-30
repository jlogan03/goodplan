# Claude Code Skill Loading from Plugins

Research date: 2026-03-29

## 1. How Claude Code Discovers Skills

Claude Code scans multiple locations for skills, in priority order:

| Location | Path | Scope |
|---|---|---|
| Enterprise | Managed settings (org-controlled) | All users in org |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All projects for this user |
| Project | `.claude/skills/<skill-name>/SKILL.md` | This project only |
| Plugin | `<plugin-root>/skills/<skill-name>/SKILL.md` | Where plugin is enabled |
| Nested (monorepo) | `packages/foo/.claude/skills/` | Auto-discovered when editing files in that subdirectory |
| Additional dirs | Skills in directories added via `--add-dir` | Session-scoped |

**Loading is lazy and three-stage:**
1. Only skill **descriptions** (from frontmatter) are loaded into context initially — full skill content is NOT loaded.
2. Claude matches user requests against descriptions to decide which skill to invoke.
3. Full `SKILL.md` content loads only when the skill is actually invoked.

The description budget scales at 1% of the context window (fallback: 8,000 chars). Individual descriptions are capped at 250 characters. Budget can be overridden via `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.

**Precedence when same name exists at multiple levels:** enterprise > personal > project. Plugin skills use `plugin-name:skill-name` namespace so they cannot conflict with other levels. If a skill and a legacy command (`.claude/commands/`) share the same name, the skill takes precedence.

Source: [Claude Code Skills docs](https://code.claude.com/docs/en/skills)

## 2. SKILL.md File Format

Each skill is a directory containing a `SKILL.md` file. The file has two parts:

### YAML Frontmatter

```yaml
---
name: my-skill                    # Display name, becomes /slash-command. Optional — defaults to directory name.
description: What it does         # Recommended. Claude uses this for auto-invocation matching. 250 char cap in listings.
argument-hint: "[issue-number]"   # Shown in autocomplete
disable-model-invocation: true    # Prevent Claude auto-loading. Default: false
user-invocable: false             # Hide from / menu. Default: true
allowed-tools: Read, Grep, Glob   # Tools allowed without permission prompts
model: sonnet                     # Override model
effort: medium                    # low | medium | high | max
context: fork                     # Run in subagent
agent: Explore                    # Which subagent type (when context: fork)
hooks: { ... }                    # Skill-scoped hooks
paths: "*.ts,*.tsx"               # Only activate for matching file patterns
shell: bash                       # bash (default) or powershell
---
```

All frontmatter fields are optional. Only `description` is recommended.

### String Substitutions

| Variable | Description |
|---|---|
| `$ARGUMENTS` | All args passed when invoking |
| `$ARGUMENTS[N]` / `$N` | Positional args (0-based) |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Directory containing this SKILL.md |
| `` !`command` `` | Dynamic context injection — shell command output replaces placeholder before Claude sees it |

### Directory Structure

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── template.md        # Template for Claude to fill in
├── examples/
│   └── sample.md      # Example output
├── references/        # Detailed docs loaded on demand
│   └── api-spec.md
└── scripts/
    └── validate.sh    # Script Claude can execute
```

`SKILL.md` should stay under 500 lines. Supporting files are referenced from `SKILL.md` and loaded by Claude when needed.

## 3. Plugin Skill Packaging

A plugin is a directory with a `.claude-plugin/plugin.json` manifest. Skills are auto-discovered in the `skills/` directory at the plugin root.

### Plugin Directory Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json        # Manifest (only file that goes here)
├── skills/                # Auto-discovered
│   ├── code-review/
│   │   └── SKILL.md
│   └── pdf-processor/
│       ├── SKILL.md
│       └── scripts/
├── commands/              # Legacy commands (also auto-discovered)
├── agents/                # Subagent definitions
├── hooks/
│   └── hooks.json
├── .mcp.json              # MCP servers
├── .lsp.json              # LSP servers
├── settings.json          # Default settings
└── scripts/               # Utility scripts
```

**Key rule:** All component directories (`skills/`, `commands/`, `agents/`, `hooks/`) must be at plugin root — NOT inside `.claude-plugin/`.

**Auto-discovery:** If `plugin.json` exists, Claude Code auto-discovers components in default locations. The manifest is optional — without it, the plugin name derives from the directory name.

**Custom paths:** The `skills` field in `plugin.json` can override the default `skills/` location. Custom paths **replace** the default directory (unlike hooks/MCP which merge). To keep defaults AND add custom paths, include both: `"skills": ["./skills/", "./extra-skills/"]`.

Source: [Claude Code Plugins docs](https://code.claude.com/docs/en/plugins), [Plugins reference](https://code.claude.com/docs/en/plugins-reference)

## 4. Skill Naming and Namespacing

### How It Works

Plugin skills are namespaced as `plugin-name:skill-name`. The `name` field in `plugin.json` determines the namespace prefix. For a plugin named `my-plugin` with a skill directory `hello/`, the skill is invoked as `/my-plugin:hello`.

### Known Issue: Auto-Namespacing Bug

There is a documented bug ([issue #20994](https://github.com/anthropics/claude-code/issues/20994)): the docs state skills are automatically namespaced with the plugin name prefix, but in practice, skills use exactly what's in the YAML `name` field with no automatic prefixing. If the YAML says `name: stories`, it appears as `/stories`, not `/my-plugin:stories`.

**Workaround:** Manually include the plugin prefix in the YAML `name` field (e.g., `name: my-plugin:stories`). As of 2026-03-29, it's unclear whether the fix has shipped — testing is needed.

### Standalone vs Plugin

| Approach | Skill name | Example |
|---|---|---|
| Standalone (`.claude/`) | `/hello` | Short, no prefix |
| Plugin | `/plugin-name:hello` | Namespaced |

## 5. Current `install:skills` Script

Located at `/Users/iwhite/Repos/goodplan/scripts/install-skills.sh`. It does two things:

### Binary Installation
1. Builds the goodplan CLI via `bun build --compile`
2. Copies the binary to `~/.local/bin/goodplan`

### Skill Installation
1. Has a **hardcoded** `SKILL_DIRS` array listing every skill directory (including `_shared`)
2. For each directory in the array, does `rm -rf` on the destination then `rsync -a` from `skills/` to `~/.claude/skills/`
3. New skills must be manually added to the `SKILL_DIRS` array (known learning — not auto-discovered)

**Installed skill directories** (from the array): `_shared`, `audit-architecture`, `audit-docs`, `audit-tests`, `capture`, `complete`, `create-architecture`, `create-epic`, `create-plan`, `create-slices`, `explore`, `implement-plan`, `migrate`, `onboard-repo`, `project-status`, `refine-architecture`, `refine-plan`, `refine-slices`, `start-epic`

The script copies skills as **personal/global skills** to `~/.claude/skills/`. This means they are available across all projects but are NOT namespaced — they appear as plain `/explore`, `/create-plan`, etc.

## 6. Precedence and Conflict Resolution

| Scenario | Resolution |
|---|---|
| Same name at enterprise + personal + project | Enterprise wins (enterprise > personal > project) |
| Plugin skill vs personal/project skill | No conflict — plugin skills are namespaced (`plugin:name`) |
| Skill vs legacy command (same name) | Skill takes precedence |
| Local plugin dir (`--plugin-dir`) vs installed marketplace plugin (same name) | Local copy takes precedence for that session |
| Managed (enterprise) force-enabled plugins | Cannot be overridden |

**Bottom line:** Plugin namespacing prevents conflicts entirely. The only real conflict scenario is between personal and project skills with the same name (project wins... actually the docs say "higher-priority locations win: enterprise > personal > project" which means personal beats project — this is the opposite of what some third-party guides claim). Testing to confirm the actual behavior is recommended.

**Correction on precedence:** The official docs state "enterprise > personal > project" — meaning personal skills take priority over project skills when names conflict.

## 7. Shared Resources and Dependencies in Plugins

### Current Approach in goodplan

The `_shared/` directory under `skills/` contains shared references used by multiple skills via relative paths (e.g., `../_shared/references/cli-interaction.md`). The install script copies `_shared` to `~/.claude/skills/_shared/`, and skills reference it via `../` relative paths.

### Plugin Context: Path Traversal Limitation

**This is the critical constraint for plugin distribution:**

> "Installed plugins cannot reference files outside their directory. Paths that traverse outside the plugin root (such as `../shared-utils`) will not work after installation because those external files are not copied to the cache."

Installed marketplace plugins are copied to `~/.claude/plugins/cache/`. Only files within the plugin directory are copied. Symlinks ARE honored during copying, so symlinked content gets included.

### Available Variables for Path References

| Variable | Description |
|---|---|
| `${CLAUDE_PLUGIN_ROOT}` | Absolute path to plugin installation directory. Changes on update. |
| `${CLAUDE_PLUGIN_DATA}` | Persistent directory for plugin state (survives updates). At `~/.claude/plugins/data/{id}/`. |
| `${CLAUDE_SKILL_DIR}` | Directory containing the current skill's `SKILL.md`. For plugin skills, this is the skill subdirectory, NOT the plugin root. |

### How to Handle `_shared` in a Plugin

Since skills in a plugin reference `_shared` via `../_shared/references/foo.md`, and plugin skills live at `<plugin-root>/skills/<skill-name>/`, the relative path `../_shared/` resolves to `<plugin-root>/skills/_shared/` — which is within the plugin root. **This means the current `_shared` directory structure should work as-is inside a plugin**, as long as `_shared` is a sibling directory to the skill directories under `skills/`.

However, skills currently use relative paths from `SKILL.md` (e.g., `../_shared/references/cli-interaction.md`). An alternative approach would be to use `${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/cli-interaction.md` for more explicit resolution, but relative paths should work since Claude resolves them from the skill directory.

### No Plugin Dependency System

There is no built-in plugin dependency system. Feature requests exist ([issue #9444](https://github.com/anthropics/claude-code/issues/9444), [issue #27113](https://github.com/anthropics/claude-code/issues/27113)) for declarative plugin dependencies, but as of 2026-03-29, each plugin must be self-contained — duplicate shared resources if needed.

## Key Implications for goodplan Plugin Distribution

1. **The `skills/` directory structure already matches plugin layout.** The current `skills/` directory with individual skill subdirectories and `_shared/` as a sibling maps directly to a plugin's `skills/` directory.

2. **Skill names will change.** Currently installed as `/explore`, `/create-plan`, etc. As a plugin, they become `/goodplan:explore`, `/goodplan:create-plan`. All CLAUDE.md references, skill cross-references, and user muscle memory need updating.

3. **No more `install:skills` script.** Plugin installation replaces the manual rsync approach. Users would `claude plugin install goodplan` instead.

4. **`_shared` relative paths should work.** Since `_shared` lives under `skills/` alongside skill directories, the `../_shared/` relative paths resolve within the plugin boundary.

5. **Auto-namespacing bug needs verification.** If the bug from issue #20994 is still present, skills may need manual `name: goodplan:<skill-name>` in their frontmatter. The current SKILL.md files use `name: explore`, `name: capture`, etc. — these would need updating.

6. **The `requires: goodplan >= 1.0.0` frontmatter field is custom.** It's not part of the Claude Code SKILL.md spec. Skills can keep it for documentation, but Claude Code won't enforce it. The version check logic in the skill body (Step 0) handles enforcement.

7. **Plugin manifest needed.** A `.claude-plugin/plugin.json` with `name`, `description`, and `version` fields. The `name` field controls the namespace prefix.

8. **CLI binary distribution is separate.** The install script currently bundles CLI binary installation with skill installation. A plugin only distributes skills/agents/hooks — the `goodplan` CLI binary would need a separate distribution mechanism (npm package, Homebrew, etc.).

## Sources

- [Claude Code Skills docs](https://code.claude.com/docs/en/skills)
- [Claude Code Plugins docs](https://code.claude.com/docs/en/plugins)
- [Claude Code Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Skill auto-namespacing issue #20994](https://github.com/anthropics/claude-code/issues/20994)
- [Plugin dependency feature request #9444](https://github.com/anthropics/claude-code/issues/9444)
- [Plugin dependency feature request #27113](https://github.com/anthropics/claude-code/issues/27113)
- [Claude Code Skills deep dive (Mikhail Shilkov)](https://mikhail.io/2025/10/claude-code-skills/)
- [Anthropic official plugins repo](https://github.com/anthropics/claude-plugins-official)
