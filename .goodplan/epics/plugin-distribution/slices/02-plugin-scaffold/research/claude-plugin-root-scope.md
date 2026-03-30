# Does `${CLAUDE_PLUGIN_ROOT}` work in a plugin's root-level CLAUDE.md?

**Date:** 2026-03-29
**Status:** Unknown / likely NOT substituted
**Triggered by:** IMP-6 from slice 02 refinement round 1

---

## Question

The goodplan plugin's root-level `CLAUDE.md` needs to tell Claude the binary path: `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. Will Claude Code substitute `${CLAUDE_PLUGIN_ROOT}` in this file, or will it appear as a literal string?

## Findings

### Official documentation says: NOT in scope

The [Plugins reference](https://code.claude.com/docs/en/plugins-reference) states (emphasis added):

> Both are substituted inline anywhere they appear in **skill content, agent content, hook commands, and MCP or LSP server configs**. Both are also exported as **environment variables** to hook processes and MCP or LSP server subprocesses.

The plugin's root-level `CLAUDE.md` is **not listed** as a substitution target. The exhaustive list is:
1. Skill content (`SKILL.md` files)
2. Agent content (agent `.md` files)
3. Hook commands (JSON `command` fields)
4. MCP server configs (`.mcp.json` / inline)
5. LSP server configs (`.lsp.json` / inline)
6. Environment variables in subprocess contexts

### CLAUDE.md is a memory/instructions file, not a plugin component

The [Memory docs](https://code.claude.com/docs/en/memory) describe CLAUDE.md as a general-purpose instructions file loaded from the directory hierarchy. Plugins do not have a documented `CLAUDE.md` component — the plugin component list is: commands, agents, skills, hooks, MCP servers, LSP servers, output styles, and settings. A `CLAUDE.md` at the plugin root would be loaded by the standard CLAUDE.md discovery mechanism (directory tree walk), not the plugin component loader.

### Confirmed bug: variables NOT substituted in command markdown

[GitHub issue #9354](https://github.com/anthropics/claude-code/issues/9354) confirms that `${CLAUDE_PLUGIN_ROOT}` is **not substituted in command markdown files** (the `commands/` directory). The reporter shows that when a command `.md` file references `${CLAUDE_PLUGIN_ROOT}`, the variable appears empty/undefined at runtime. This was filed against Claude Code v2.0.22.

If command markdown (a documented plugin component) does not get substitution, a root-level `CLAUDE.md` (not a plugin component at all) almost certainly does not either.

### Plugin directory structure has no CLAUDE.md slot

The official [plugin directory structure](https://code.claude.com/docs/en/plugins-reference#plugin-directory-structure) example lists every standard file but does **not include CLAUDE.md**:

```
enterprise-plugin/
├── .claude-plugin/plugin.json
├── commands/
├── agents/
├── skills/
├── output-styles/
├── hooks/
├── settings.json
├── .mcp.json
├── .lsp.json
├── scripts/
├── LICENSE
└── CHANGELOG.md
```

### Will a CLAUDE.md at the plugin root even be loaded?

Uncertain. Marketplace plugins are **copied to `~/.claude/plugins/cache/`**. CLAUDE.md loading walks up from the current working directory (the user's project), not from the plugin cache directory. So a `CLAUDE.md` inside the plugin cache would only load if:
- Claude Code has special handling to inject plugin CLAUDE.md files, OR
- The plugin is loaded via `--plugin-dir` pointing to a local directory that happens to be an ancestor of the cwd

Neither is documented. The most likely scenario is that a plugin's root-level `CLAUDE.md` is **never loaded into context** for marketplace-installed plugins.

## Conclusion

**`${CLAUDE_PLUGIN_ROOT}` is almost certainly NOT substituted in a plugin's root-level CLAUDE.md.** Furthermore, the CLAUDE.md may not even be loaded into context for marketplace-installed plugins. The documentation, the plugin component model, and a confirmed bug in command markdown all point the same direction.

## Fallback strategies

### Strategy A: Put the binary path in skill content (recommended)

Skills DO get `${CLAUDE_PLUGIN_ROOT}` substitution. Each skill's `SKILL.md` can reference the binary path directly:

```markdown
Use the gp CLI at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` for all state mutations.
```

This is reliable, documented, and already how the architecture references the binary in skills. The "universal instructions" that would have gone in CLAUDE.md can instead go in a shared reference file that skills import via relative path (e.g., `@../shared/cli-instructions.md` from within SKILL.md).

### Strategy B: Use a SessionStart hook to export the path

A `SessionStart` hook can write the resolved path to a known location or set it as context:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "echo '{\"hookSpecificOutput\":{\"additionalContext\":\"gp binary is at ${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp\"}}'"
      }]
    }]
  }
}
```

Note: [GitHub issue #27145](https://github.com/anthropics/claude-code/issues/27145) reports `CLAUDE_PLUGIN_ROOT` may not be set for SessionStart hooks specifically, so test this before relying on it.

### Strategy C: Use an agent with the instructions

Agent content gets `${CLAUDE_PLUGIN_ROOT}` substitution. A plugin-shipped agent could include the binary path instructions. However, agents are heavier-weight and this would be an unusual pattern.

### Recommendation

**Use Strategy A.** Put the binary path and CLI usage instructions in skill content (where substitution is documented and working), not in a root-level CLAUDE.md. Each skill already needs to know the binary path to invoke it, so this is natural rather than redundant.

If universal instructions are needed across all skills, use a shared markdown file at `skills/_shared/cli-usage.md` and import it from each SKILL.md via relative path.

## Sources

- [Plugins reference — Claude Code Docs](https://code.claude.com/docs/en/plugins-reference)
- [Create plugins — Claude Code Docs](https://code.claude.com/docs/en/plugins)
- [How Claude remembers your project — Claude Code Docs](https://code.claude.com/docs/en/memory)
- [GitHub issue #9354: ${CLAUDE_PLUGIN_ROOT} not substituted in command markdown](https://github.com/anthropics/claude-code/issues/9354)
- [GitHub issue #27145: CLAUDE_PLUGIN_ROOT not set for SessionStart hooks](https://github.com/anthropics/claude-code/issues/27145)
