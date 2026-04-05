# Plugin File Permissions

Researched: 2026-04-01 | Source: docs, web search, Context7, GitHub issues

---

## Summary

Plugin skills **cannot** read files within their own plugin directory without either a permission prompt or a workaround. There is no special permission treatment for plugin directories. The `@` file reference syntax is the primary workaround -- it injects file content at skill load time, bypassing the Read tool entirely.

---

## Q1: Can a plugin skill read `../_shared/references/cli-interaction.md` without a permission prompt?

**No.** When a plugin skill at `~/.claude/plugins/cache/marketplace/plugin/version/skills/explore/SKILL.md` instructs Claude to "Read `../_shared/references/cli-interaction.md`", Claude uses the Read tool, which triggers a permission prompt for that path. Plugin files receive no special permission treatment.

This is a **known bug** tracked in multiple GitHub issues:
- [#31036](https://github.com/anthropics/claude-code/issues/31036) -- "Plugin skills prompted for Read permission on their own plugin directory files"
- [#15757](https://github.com/anthropics/claude-code/issues/15757) -- "Skills unable to read their own bundled files without permissions"

The docs say "Skills can include supporting files alongside SKILL.md" and the debug checklist says "Verify file permissions allow reading the plugin files," implying implicit read access was intended. But the implementation does not provide it.

**Workaround:** Use `@` file reference syntax instead of instructing Claude to Read:

```markdown
# In SKILL.md content:
Follow the conventions in @${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/cli-interaction.md
```

The `@path` syntax injects file content at skill load time (before Claude sees the prompt), so it never invokes the Read tool and never triggers a permission prompt.

---

## Q2: Does `allowed-tools` help? Can it whitelist Read for specific paths?

**Partially.** The `allowed-tools` frontmatter field grants tool access without per-use permission prompts when the skill is active. You can whitelist `Read` broadly:

```yaml
allowed-tools: Read
```

This allows all Read operations without prompts while the skill is active -- not just reads within the plugin directory. There is **no path-scoped Read filter** in `allowed-tools`. Unlike Bash which supports pattern matching (`Bash(git:*)`), Read does not support `Read(/some/path/*)` syntax in `allowed-tools`.

**However**, `allowed-tools` has known bugs:
- [#14956](https://github.com/anthropics/claude-code/issues/14956) -- "Skill allowed-tools doesn't grant permission for Bash commands" (Bash patterns sometimes ignored)
- [#13494](https://github.com/anthropics/claude-code/issues/13494) -- "Inconsistent tool permission behavior in skill's allowed-tools" (some patterns work, others don't)
- [#18737](https://github.com/anthropics/claude-code/issues/18737) -- "Major Inconsistency in SKILL.md allowed-tools support between Claude Code CLI and Agent SDK" (Agent SDK ignores `allowed-tools` entirely)

**Recommendation:** `allowed-tools: Read` would work for the CLI but is overly broad (allows reading any file, not just plugin files) and unreliable in the Agent SDK. The `@` syntax is more reliable.

---

## Q3: Is there a `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PLUGIN_ROOT}` path with special permission treatment?

**No special permission treatment.** Both variables are string substitutions only:

| Variable | Resolves to | Permission treatment |
|---|---|---|
| `${CLAUDE_SKILL_DIR}` | Directory containing the current SKILL.md | None -- purely a path substitution |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin installation root directory | None -- purely a path substitution |
| `${CLAUDE_PLUGIN_DATA}` | Persistent plugin data directory | None -- purely a path substitution |

These variables are substituted in skill content, agent content, hook commands, and MCP/LSP configs. They are also exported as environment variables to subprocesses. But they do **not** grant any implicit file access permissions. A Read to `${CLAUDE_PLUGIN_ROOT}/some-file.md` still requires permission.

The variables work well with the `@` syntax though:
```markdown
@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/cli-interaction.md
```

---

## Q4: Do plugin files get any special permission treatment compared to arbitrary filesystem paths?

**No.** Plugin files are treated identically to any other filesystem path for permission purposes. The permission model is:

1. **Deny rules** checked first (from settings.json at all scopes)
2. **Ask rules** checked next
3. **Allow rules** checked last
4. First matching rule wins; default is to prompt

There is no built-in "plugin files are automatically allowed" rule. The plugin cache at `~/.claude/plugins/cache/` is not whitelisted.

The only mechanism that bypasses permissions entirely is the `@` file reference syntax, which injects content at skill load time without invoking any tool.

---

## Q5: What do the Claude Code docs say about plugin file access?

The official docs ([Plugins reference](https://code.claude.com/docs/en/plugins-reference), [Skills docs](https://code.claude.com/docs/en/skills)) describe the `@` syntax for including file content and `!` backtick syntax for shell commands. The docs show examples of plugin skills referencing their own files:

```markdown
---
description: Use plugin config if exists
allowed-tools: Bash(test:*), Read
---

!`test -f ${CLAUDE_PLUGIN_ROOT}/config.json && echo "exists" || echo "missing"`

If config exists, load it: @${CLAUDE_PLUGIN_ROOT}/config.json
Otherwise, use defaults...
```

Note: even in the official example, `Read` is listed in `allowed-tools`. This confirms that without it, Read operations would prompt. The `@` reference loads the file without needing Read permission, while `allowed-tools: Read` covers cases where Claude decides to use the Read tool at runtime.

The [permissions docs](https://code.claude.com/docs/en/permissions) describe the deny > ask > allow evaluation order and confirm that Read rules follow gitignore-style patterns. But there is no documented "plugin directory auto-allow" feature.

---

## Mechanisms for Reading Plugin Files (Ranked by Reliability)

| Mechanism | Reliability | Scope | Notes |
|---|---|---|---|
| `@${CLAUDE_PLUGIN_ROOT}/path` in SKILL.md | **High** | Load-time injection | Content injected before Claude sees it. No tool call. No permission. Best for known files. |
| `!`\``cat ${CLAUDE_PLUGIN_ROOT}/path`\` in SKILL.md | **Medium** | Load-time injection | Shell command output injected at load time. Needs `allowed-tools: Bash(cat:*)` or similar. |
| `allowed-tools: Read` in frontmatter | **Medium** | All reads while skill active | Overly broad. Known bugs with Bash patterns. Agent SDK ignores it. |
| `settings.json` allow rule | **Low** | Per-user config | Not portable -- each user must configure it. Plugin can ship a `settings.json` but it only covers agent settings currently. |
| PreToolUse hook with `"allow"` decision | **Low** | Custom hook | Complex. Could auto-allow reads matching plugin cache path, but fragile. |

---

## Implications for goodplan

### Current state (personal skills at `~/.claude/skills/`)

Skills instruct Claude to "Read `../_shared/references/cli-interaction.md`". This works because:
1. The user has already granted Read permission to `~/.claude/skills/` paths during their session
2. Personal skills are in a familiar location that users tend to allow

### After plugin distribution

When skills move to `~/.claude/plugins/cache/marketplace/...`, the Read prompt will fire for an unfamiliar path deep in the plugin cache. This is a worse UX.

### Recommended approach

1. **Use `@` syntax for all known file references.** Convert "Read `../_shared/references/cli-interaction.md`" instructions to `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/cli-interaction.md` inline references in SKILL.md content. This loads content at skill invocation time with zero permission prompts.

2. **Add `allowed-tools: Read, Grep, Glob` to frontmatter** as a safety net for cases where Claude decides to read files dynamically (e.g., reading project files during implementation). This doesn't help with the Agent SDK but covers the CLI.

3. **Do not rely on `${CLAUDE_SKILL_DIR}` relative paths for Read tool calls.** They resolve correctly but still trigger permission prompts.

4. **Watch issues #31036 and #15757** for a potential fix that grants implicit read access to plugin directory files. If/when this lands, the `@` syntax workaround becomes unnecessary for plugin-internal files.

---

## Sources

- [Claude Code Skills docs](https://code.claude.com/docs/en/skills)
- [Claude Code Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Claude Code Permissions docs](https://code.claude.com/docs/en/permissions)
- [Plugin skills Read permission bug #31036](https://github.com/anthropics/claude-code/issues/31036)
- [Skills can't read bundled files #15757](https://github.com/anthropics/claude-code/issues/15757)
- [allowed-tools doesn't grant Bash #14956](https://github.com/anthropics/claude-code/issues/14956)
- [Inconsistent allowed-tools #13494](https://github.com/anthropics/claude-code/issues/13494)
- [allowed-tools CLI vs Agent SDK gap #18737](https://github.com/anthropics/claude-code/issues/18737)
- [plugin-dev skill-development SKILL.md](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/skill-development/SKILL.md)
- [plugin-dev command-development plugin-features-reference.md](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md)
