# Claude Code Capability Verification

Researched: 2026-04-01 | Source: docs (code.claude.com), GitHub issues (anthropics/claude-code), web search

---

## 1. `agents/` directory in plugins

**Status: Confirmed working**

Plugins auto-discover agents from an `agents/` directory at the plugin root. Each `.md` file in that directory becomes a namespaced agent available as `plugin-name:agent-name`.

**Evidence:**
- Plugins reference docs explicitly list `agents/` as the default location: "Location: `agents/` directory in plugin root"
- The subagents docs confirm plugin agents appear in `/agents` and can be invoked via `@agent-<plugin-name>:<agent-name>` or `claude --agent <plugin-name>:<agent-name>`
- The standard plugin layout in the docs shows `agents/` at plugin root with multiple `.md` files

**Risks:** None identified -- this is well-documented and stable.

---

## 2. `skills:` frontmatter in agent definitions

**Status: Confirmed working for project-level agents + project-level skills. BROKEN for plugin agents referencing plugin skills.**

The `skills:` frontmatter field injects full SKILL.md content into the agent's context at startup. However, when a plugin-deployed agent references a plugin-bundled skill, the injection silently fails.

**Evidence:**
- Subagents docs: "The full content of each skill is injected into the subagent's context, not just made available for invocation. Subagents don't inherit skills from the parent conversation; you must list them explicitly."
- [Issue #25834](https://github.com/anthropics/claude-code/issues/25834): "Plugin agent skills: frontmatter silently fails to inject skill content" -- tested across 17 plugin agents, 0/17 had skills injected. Project-level agent + project-level skill works. Closed as duplicate of #15178.
- [Issue #27736](https://github.com/anthropics/claude-code/issues/27736): Confirms skills ARE injected into the subagent's context for some cases, but the skills field is not rendered in the Agent tool description visible to the calling session.

**Risks:** CRITICAL. Plugin agents cannot use `skills:` to reference plugin skills. This is a silent failure -- no error, no warning. The only working path is project-level agent referencing project-level skill. Workaround: embed skill content directly in the agent's markdown body, or use `@${CLAUDE_PLUGIN_ROOT}/path` references in the agent body.

---

## 3. `user-invocable: false` on skills

**Status: Confirmed working**

Setting `user-invocable: false` hides the skill from the `/` slash command menu while keeping it available for Claude to invoke automatically (and for `skills:` injection in agent definitions).

**Evidence:**
- Skills docs: "`user-invocable: false`: Only Claude can invoke the skill. Use this for background knowledge that isn't actionable as a command."
- Invocation table in docs confirms: user-invocable: false means "You can invoke: No, Claude can invoke: Yes, Description always in context, full skill loads when invoked"
- Docs note: "The `user-invocable` field only controls menu visibility, not Skill tool access."

**Risks:** Low. Well-documented and straightforward. Note that `user-invocable: false` does NOT prevent programmatic Skill tool invocation -- use `disable-model-invocation: true` for that.

---

## 4. `"agents"` field in plugin.json

**Status: Confirmed working**

The `agents` field in plugin.json is a valid component path field. It accepts `string | array` and replaces the default `agents/` auto-discovery directory.

**Evidence:**
- Plugins reference docs, complete schema example: `"agents": "./custom/agents/"`
- Component path fields table: "agents: string|array -- Custom agent files (replaces default `agents/`)"
- Path behavior rules: "For commands, agents, skills, and outputStyles, custom paths replace the default directory."
- To keep defaults AND add more: `"agents": ["./agents/", "./extra-agents/reviewer.md"]`

**Risks:** Low. If you specify `agents` in plugin.json, it REPLACES the default `agents/` directory scan -- so include `"./agents/"` in the array if you want both default and custom paths.

---

## 5. Agent tool spawning named plugin agents

**Status: Confirmed working**

The main conversation can spawn plugin agents by name. Plugin agents appear in the Agent tool's available types with `plugin-name:agent-name` naming.

**Evidence:**
- Subagents docs: "Subagents provided by an enabled plugin appear in the typeahead as `<plugin-name>:<agent-name>`"
- Manual mention syntax: `@agent-<plugin-name>:<agent-name>`
- CLI syntax: `claude --agent <plugin-name>:<agent-name>`
- Agent tool `tools` field can restrict spawnable types: `tools: Agent(worker, researcher)`

**Risks:**
- Subagents CANNOT spawn other subagents ("Subagents cannot spawn other subagents"). This means a plugin agent cannot delegate to another plugin agent. Only the main conversation (or an agent running as `--agent`) can spawn subagents.
- [Issue #31977](https://github.com/anthropics/claude-code/issues/31977): "In-process team agents lack the Agent tool (cannot spawn subagents)" -- confirms this is a known limitation.

---

## 6. `model` field in agent definitions

**Status: Confirmed working**

Agent definitions can specify which model to use via the `model` frontmatter field. Resolution order: (1) `CLAUDE_CODE_SUBAGENT_MODEL` env var, (2) per-invocation `model` parameter, (3) agent definition's `model` frontmatter, (4) main conversation's model.

**Evidence:**
- Subagents docs: "`model`: Model to use: `sonnet`, `opus`, `haiku`, a full model ID (for example, `claude-opus-4-6`), or `inherit`. Defaults to `inherit`"
- Plugins reference confirms `model` is in the supported frontmatter list for plugin agents

**Risks:** Low. The per-invocation model parameter (when Claude spawns the agent) overrides the frontmatter value. The env var overrides everything. This is well-documented.

---

## 7. Plugin agents inheriting tools

**Status: Confirmed working, with caveats**

By default, subagents inherit ALL tools from the parent conversation, including MCP tools. Plugin agents can restrict tools via `tools` (allowlist) or `disallowedTools` (denylist) frontmatter.

**Evidence:**
- Subagents docs: "By default, subagents inherit all tools from the main conversation, including MCP tools."
- Plugin agents support `tools` and `disallowedTools` frontmatter fields per the plugins reference

**Risks:**
- IMPORTANT: Plugin agents do NOT support `hooks`, `mcpServers`, or `permissionMode` frontmatter fields. These are silently ignored for security.
- [Issue #21560](https://github.com/anthropics/claude-code/issues/21560): "Plugin-defined subagents cannot access MCP tools" -- reports that plugin agents cannot access MCP tools defined in the plugin's `.mcp.json`, even though built-in agents DO receive MCP tools. This is OPEN as of 2026-03-31.
- The docs say "If both [tools and disallowedTools] are set, disallowedTools is applied first, then tools is resolved against the remaining pool."

---

## 8. `@` file reference syntax in SKILL.md

**Status: Confirmed working (with caveats on mechanism)**

The `@path/to/file` syntax in SKILL.md and agent content injects file content at load time, before Claude sees the prompt. `${CLAUDE_PLUGIN_ROOT}` is substituted inline in skill and agent content, so `@${CLAUDE_PLUGIN_ROOT}/path/to/file.md` works for referencing plugin-bundled files.

**Evidence:**
- Plugins reference docs: "Both [CLAUDE_PLUGIN_ROOT and CLAUDE_PLUGIN_DATA] are substituted inline anywhere they appear in skill content, agent content, hook commands, and MCP or LSP server configs."
- Our own prior research (`plugin-file-permissions.md`): confirms `@${CLAUDE_PLUGIN_ROOT}/path` injects content at skill load time, bypassing Read tool and permission prompts
- Skills docs list `${CLAUDE_SKILL_DIR}` as available substitution for referencing files relative to the skill directory

**Risks:**
- The `@` syntax is a user-prompt feature that also works in skill/agent content because of how content is preprocessed. It is not extensively documented as a SKILL.md feature specifically.
- Large files referenced via `@` consume context tokens at load time whether needed or not. The alternative (referencing files in prose for on-demand Read) hits the permission prompt bug (#31036).

---

## 9. Plugin skill reading plugin files (Read tool)

**Status: BROKEN -- known bug, no fix as of 2026-03-31**

When a plugin skill instructs Claude to read files within `${CLAUDE_PLUGIN_ROOT}`, the Read tool triggers a permission prompt. Plugin files receive no special permission treatment despite docs implying they should.

**Evidence:**
- [Issue #31036](https://github.com/anthropics/claude-code/issues/31036): OPEN. "Plugin skills prompted for Read permission on their own plugin directory files." Multiple confirmations in comments as recently as 2026-03-26.
- Docs state "Skills can include supporting files alongside SKILL.md" -- implying implicit access was intended
- Plugin `settings.json` cannot help: "Only agent settings are currently supported"

**Workarounds:**
1. Use `@${CLAUDE_PLUGIN_ROOT}/path` in skill content to inject at load time (preferred)
2. Add `Read(~/.claude/plugins/cache/<plugin>/**)` to `permissions.allow` in user settings (requires user action)
3. Use `!` backtick shell injection to cat files: `` !`cat ${CLAUDE_PLUGIN_ROOT}/file.md` ``

**Risks:** HIGH. This fundamentally limits plugin skill architecture. Any pattern that relies on Claude reading supporting files on-demand will hit permission prompts in plugin contexts.

---

## 10. Multiple `skills:` entries in agent definitions

**Status: Confirmed working (for project-level skills; broken for plugin skills per #2 above)**

Agent definitions accept a YAML array of skill names in the `skills:` frontmatter. All listed skills have their full content injected into the subagent's context at startup.

**Evidence:**
- Subagents docs example shows multiple skills:
  ```yaml
  skills:
    - api-conventions
    - error-handling-patterns
  ```
- Docs: "The full content of each skill is injected into the subagent's context"
- CLI `--agents` JSON also supports skills as an array

**Risks:** Same as #2 -- multiple plugin skills referenced from a plugin agent will ALL silently fail to inject. This compounds the problem because you cannot pre-load domain knowledge into plugin agents via this mechanism.

---

## Summary Risk Matrix

| # | Capability | Status | Risk Level |
|---|---|---|---|
| 1 | `agents/` in plugins | Working | Low |
| 2 | `skills:` in agent frontmatter | Broken for plugin skills | **CRITICAL** |
| 3 | `user-invocable: false` | Working | Low |
| 4 | `"agents"` in plugin.json | Working | Low |
| 5 | Agent tool spawning plugin agents | Working (no nesting) | Medium |
| 6 | `model` field in agents | Working | Low |
| 7 | Plugin agents inheriting tools | Working (MCP bug) | Medium |
| 8 | `@` file reference in SKILL.md | Working | Low |
| 9 | Plugin skill reading plugin files | **Broken** | **HIGH** |
| 10 | Multiple `skills:` entries | Working (same bug as #2) | **CRITICAL** |

## Architectural Implications

The two critical findings for the simplify-data-model epic:

1. **Plugin agents cannot load plugin skills via `skills:` frontmatter** (issues #25834, #15178). This means an orchestrator agent defined in a plugin cannot pre-load domain knowledge from plugin-bundled skills. Workaround: embed knowledge directly in the agent's markdown body, or use `@${CLAUDE_PLUGIN_ROOT}/path` references to inject file content at agent load time.

2. **Plugin files require permission prompts for Read tool access** (issue #31036). This means plugin skills that instruct Claude to "read this reference file" will hit UX friction. Workaround: use `@` references or `` !`cat` `` shell injection to pre-load content.

Both issues are well-documented bugs that Anthropic is aware of but has not yet fixed. The `@${CLAUDE_PLUGIN_ROOT}/path` pattern is the reliable workaround for both -- it injects content at load time, bypassing both the skill injection bug and the Read permission bug.
