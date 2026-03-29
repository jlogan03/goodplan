## Issues

### 1. hooks.json format does not match Claude Code's actual plugin hook schema
**Severity: CRITICAL**

The architecture's `hooks.json` (in plugin-api.md) uses a flat array format:
```json
{
  "hooks": [
    { "event": "PreToolUse", "matcher": "^(Write|Edit)$", "command": "..." }
  ]
}
```

The research (claude-code-plugin-format.md and claude-code-hooks-pretooluse.md) documents a three-level nested format:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "..." }
        ]
      }
    ]
  }
}
```

The architecture's format will not work with Claude Code's hook loader. Every hook field (`event`, `matcher`, `command`) is structured differently from the actual API. The `type: "command"` field is also missing.

**Resolution: Rewrite hooks.json in plugin-api.md to match the documented three-level nested format. Also add the Bash warning hook as a second entry under PreToolUse.**

---

### 2. Binary at CLAUDE_PLUGIN_ROOT will be replaced on every plugin update -- no persistence strategy
**Severity: IMPORTANT**

The architecture places the binary at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` and has skills reference it there directly. The research (bun-compile-binary-embedding.md, claude-code-plugin-format.md) documents that `CLAUDE_PLUGIN_ROOT` is replaced on every update. The research recommends using a `SessionStart` hook to copy the binary to `${CLAUDE_PLUGIN_DATA}/bin/gp` for persistence.

However, the architecture's approach (direct reference to `CLAUDE_PLUGIN_ROOT`) is actually fine -- the binary will always be the version that shipped with the current plugin. Since plugins update atomically, the binary at `CLAUDE_PLUGIN_ROOT` is always correct for the installed version. Persistence in `CLAUDE_PLUGIN_DATA` only matters if there are scenarios where the plugin root is temporarily unavailable, which is not a documented concern.

This is actually a non-issue on further analysis. The architecture's approach is simpler and correct: always reference the binary where it ships. No `SessionStart` setup hook needed.

**Resolution: None needed. The architecture correctly avoids unnecessary complexity. However, add a brief note in conventions.md explaining why `CLAUDE_PLUGIN_DATA` is not used (the binary ships with each version and `CLAUDE_PLUGIN_ROOT` is always current).**

---

### 3. Skill auto-namespacing bug not addressed
**Severity: IMPORTANT**

The research (claude-code-skill-loading.md) documents a known bug (issue #20994) where plugin skills are NOT automatically namespaced with the plugin prefix. Skills use exactly the `name` field from their YAML frontmatter. If the bug persists, skills named `explore` in their frontmatter will appear as `/explore` not `/gp:explore`.

The architecture assumes automatic namespacing throughout (conventions.md: "Skills are namespaced as `/gp:<skill-name>` when loaded from the plugin") without mentioning this risk or a mitigation plan.

**Resolution: Add a note in conventions.md or plugin-api.md acknowledging the auto-namespacing bug. Define the fallback: if the bug persists at implementation time, manually prefix skill names in YAML frontmatter (e.g., `name: gp:explore`). Include a verification step in the build pipeline to check skill namespacing.**

---

### 4. HMAC key as a "permanent constant" creates a security/rotation problem
**Severity: IMPORTANT**

The architecture states the HMAC key is "permanent -- never changes across versions" (conventions.md, cli-changes-api.md, plugin-api.md). This means:
- If the key is ever leaked (binary reverse engineering, accidental logging), there is no rotation path
- All existing `.signatures.json` files across all repos become invalid if the key changes
- The key must be the same across all builds, meaning it exists in source code or CI secrets

The architecture does not address key compromise scenarios or migration paths. While the HMAC is defense-in-depth (hooks are the primary protection), a "permanent, never changes" stance is unnecessarily rigid.

**Resolution: Soften the language from "permanent constant that never changes" to "stable constant that changes only with a major version migration." Add a brief note about the key compromise scenario: if needed, a new key can be introduced with a `gp verify --migrate` command that re-signs all files. The `.signatures.json` version field (already present) enables this.**

---

### 5. Read-time HMAC verification will break on fresh clones and existing repos
**Severity: IMPORTANT**

cli-changes-api.md states: "Every Data Layer read of a `.json` or `.jsonl` file verifies the HMAC against `.signatures.json`. If the signature doesn't match, the CLI returns an error -- it never silently uses tampered data."

This creates problems for:
- **Fresh clones of existing repos** where `.signatures.json` doesn't exist yet (pre-plugin-distribution era)
- **Repos initialized before the HMAC system** that have no signatures at all
- **Legitimate out-of-band edits** (manual git merge conflict resolution, migration scripts)

The architecture has no migration/bootstrapping path for existing repos. The strict "error on mismatch" policy will make the CLI unusable for any repo that didn't start with HMAC signing.

**Resolution: Define the bootstrapping behavior. Options: (a) if `.signatures.json` is missing, skip verification and offer `gp verify --init` to create it; (b) if a file has no entry in `.signatures.json`, warn but allow; (c) `gp migrate` handles signing all existing files. The `version` field in `.signatures.json` supports future format changes.**

---

### 6. `nextCommands` "other" section is unbounded and may grow noisy
**Severity: MINOR**

The algorithm for the "other" section includes creation events from ALL entity types except the one just acted on. Currently that's epic, slice, quest, task, and decision creation commands. As entity types grow, this section will expand. The architecture does not specify filtering or capping.

**Resolution: Consider limiting "other" to a curated set of high-value creation commands (e.g., quest:create, task:create) rather than scanning all entity types. Or document that the list is intentionally comprehensive and small in practice.**

---

### 7. Marketplace manifest uses `ian97531/project-skills` but this repo name is not explained
**Severity: MINOR**

The overview references `ian97531/project-skills` as the source repo, and the decision doc confirms this. But the architecture files reference the project as "goodplan" everywhere else. The repo name `project-skills` is not contextualized -- a reader might wonder if it's a different repo.

**Resolution: Add a one-line note in the overview or conventions.md clarifying that `ian97531/project-skills` is the GitHub repo name for the goodplan project (a historical name, not a separate repository).**

---

### 8. Build pipeline step numbering gap
**Severity: MINOR**

In plugin-api.md, the build pipeline steps go 1, 2, 3, 4, 5, 7, 8 -- step 6 is missing. This is a minor formatting error but could confuse implementers.

**Resolution: Renumber the build pipeline steps sequentially (1-7).**

---

### 9. protect-state.sh blocks `.project/.signatures.json` writes by the CLI
**Severity: IMPORTANT**

The hook blocks Write/Edit on `.project/**/*.json`. The CLI's Data Layer writes `.project/.signatures.json` after every state mutation. If the CLI triggers file writes through Claude Code's Write tool, the hook would block its own signature updates.

However, the CLI is a compiled binary that writes directly to the filesystem via Node.js `fs` APIs -- it does not use Claude Code's Write/Edit tools. The hooks only intercept Claude Code tool calls, not direct filesystem operations. So this is not actually a problem.

On further analysis: the architecture is correct. The hook intercepts Claude Code's LLM-driven tool calls, not subprocess filesystem operations. The CLI binary writes directly and is unaffected.

**Resolution: None needed. Add a clarifying sentence in plugin-api.md or conventions.md noting that hooks only intercept Claude Code tool calls, not direct filesystem writes by subprocesses (the CLI binary).**

---

### 10. No platform detection strategy for multi-platform binary distribution
**Severity: MINOR**

The architecture hardcodes `binaries/macos-arm64/gp` in all skill and convention references. The research notes this is macOS arm64 only, with darwin-x64 and linux-x64 as future targets (in the existing architecture overview). The plugin-api.md CI section mentions "future: multi-platform matrix" but there is no skill-side strategy for selecting the right binary on different platforms.

**Resolution: Since macOS arm64 is the only current target, this is acceptable for now. Add a brief note in conventions.md that multi-platform support will require skills to use a platform detection wrapper (e.g., a `bin/gp` shell script that dispatches to the right binary based on `uname`).**

---

### 11. Inconsistency between conventions.md and research on hook decision control
**Severity: MINOR**

The conventions.md describes hooks using exit codes (exit 0 = allow, exit 2 = block). The research documents a richer JSON-based decision control (`permissionDecision: "allow|deny|ask"`, `updatedInput`, `additionalContext`). The architecture uses the simpler exit-code model, which works but doesn't leverage the full API.

This is actually fine -- the exit-code model is sufficient for state protection. The JSON output model is optional and additive.

**Resolution: None needed. The simpler model is appropriate for the use case.**

---

### 12. INV-008 does not account for commands with no state machine transition
**Severity: MINOR**

INV-008 states "Every CLI command maps to exactly one state machine transition." But read-only commands (show, list, status, schema, verify) have no state machine transition at all. The invariant as stated is too broad.

The overview does say "nextCommands" is only on mutation responses, and read-only commands bypass the RPC layer. But INV-008's wording could be misread to imply read-only commands must also have transitions.

**Resolution: Refine INV-008 wording to "Every CLI mutation command maps to exactly one state machine transition" (add the word "mutation").**

## Score: 7/10

The architecture tells a coherent story across all four files. The layered approach (hooks for prevention, HMAC for detection, nextCommands for guidance) is well-reasoned. The separation between plugin infrastructure (outside the 4-layer stack) and CLI modifications (within the stack) is clean. The transition table as single source of truth for both state transitions and command mappings is elegant.

The critical issue (hooks.json format mismatch) would cause implementation failure if not caught. The important issues around HMAC bootstrapping and skill namespacing represent real risks that need mitigation plans. The architecture is otherwise well-aligned with the confirmed goals and internally consistent.

## Summary
- Critical: 1
- Important: 3
- Minor: 5
