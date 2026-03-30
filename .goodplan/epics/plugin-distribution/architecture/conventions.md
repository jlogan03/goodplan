# Architectural Conventions — Plugin Distribution Epic

## Patterns and Abstractions

### Command Metadata Registry at the RPC Layer
The state machine transition tables remain the source of truth for state transitions only — they have no knowledge of CLI command syntax. A `commandMetadata` registry at the RPC layer maps `(entityType, status)` pairs to available CLI commands. This registry inverts the existing command-to-event mapping from the Commands API. Each entry includes a `userFacing: boolean` flag to suppress internal transitions from `nextCommands` output. Because the registry does not evaluate guards, `nextCommands` is an approximation — some listed commands may fail due to guard conditions.

### RPC-Layer Side Effects
When a CLI command needs to perform multiple mutations (e.g., `task:convert` creates a new entity), only one state machine transition fires. Additional mutations are RPC-layer side effects executed after the transition succeeds. This preserves INV-008 (single transition per command).

### Plugin Components Are Separate from the CLI
Hook scripts, the plugin manifest, and the marketplace manifest are not part of the four-layer CLI stack. They execute in Claude Code's runtime, not the CLI's runtime. The only interaction between hooks and the CLI is indirect — hooks block actions that should go through the CLI instead.

### Binary Reference by Absolute Path
Skills and hooks reference the CLI binary at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. No PATH modification, no setup script, no copy to `CLAUDE_PLUGIN_DATA` needed. The binary lives in the plugin directory and is always available. If the binary path does not exist (e.g., wrong platform), the skill or hook must fail with a clear error message: `"gp binary not found at ${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp — this plugin requires macOS arm64."`.

### State File Integrity via Embedded HMAC Signature
The CLI maintains a `stateSignature` field in `goodplan.json` containing an HMAC-SHA256 computed over the serialized state tree. **The signature covers JSON/JSONL files only — markdown files are excluded.** This matches `assembleState()` without `--inline` (markdown entries are boolean markers, not content). LLM-owned markdown (architecture docs, plans, research, brainstorm, goals) can be written and edited freely without invalidating the signature. The HMAC key is a stable constant baked into the compiled binary via `--define __GP_HMAC_KEY__`, injected from a CI secret (not stored in source control).

**Serialization determinism:** `serializeStateTree()` uses the same deterministic key ordering as all other Data Layer JSON writes (INV-002). Specifically: file paths are sorted lexicographically, JSON keys within each file use deterministic ordering, JSONL entry order is preserved as-is, and line endings are normalized to `\n`. This guarantees HMAC stability — the same logical state always produces the same serialized output and therefore the same signature.

**Write flow:** mutate state → serialize state tree (JSON/JSONL only, excluding `stateSignature` field) → compute HMAC → embed signature in `goodplan.json` → write atomically.

**Read flow:** read state → assemble state tree (JSON/JSONL only, excluding `stateSignature` field) → compute HMAC → compare to embedded signature → hard error on mismatch.

This is defense in depth — hooks prevent most out-of-band modifications, the embedded signature detects the rest. The HMAC detects tampering (manual edits, bad merges, disk errors, non-CLI tools) — it is not an access control mechanism. The key can be extracted from the binary via `strings`.

**Bootstrap exception:** if `stateSignature` is missing from `goodplan.json` (first CLI run on a pre-HMAC repo or fresh clone), the CLI computes and embeds the signature, then proceeds normally.

**Key rotation:** Handled via the `version` field in `goodplan.json`. A future major version can change the key; the CLI detects version mismatch and re-signs automatically. For v1, the key is permanent. See INV-009 in invariants.md for the full rotation procedure.

**Local development:** For local `build:plugin` runs, a well-known dev key is hardcoded in the `package.json` build script. This is a different key from the production CI secret. The dev key enables local testing of the signature system without requiring CI secrets.

## Module and Boundary Rules

### Hook Scripts
- Written in shell (bash/sh) for portability
- Receive JSON on stdin from Claude Code (tool name, tool input, cwd, session metadata)
- Return: exit 0 (allow), exit 2 (block with stderr message)
- Must not call the `gp` CLI — hooks run before the tool call, not as part of it
- Must not modify any files — they are read-only interceptors
- Use `python3 -c "import sys,json; ..."` for JSON parsing — guaranteed on macOS since Catalina, no `jq` dependency

### Build Pipeline
- `build:plugin` is a `package.json` entry delegating to `scripts/build-plugin.sh` — not part of the CLI codebase
- Shell script enables `set -e`, inline comments, and multi-step logic (following the existing `scripts/install-skills.sh` pattern)
- Produces `dist/gp-plugin/` containing the assembled plugin directory
- Sources: `src/` (compiled binary), `skills/` (copied), `hooks/` (copied), templates for `plugin.json` and `marketplace.json`
- Version derived from `package.json` — single source of truth for versioning

### Development Repo Detection (`.goodplan-dev`)
A `.goodplan-dev` sentinel file in the project root marks the repo as a development repo. Location: project root. Content: empty file. Creation: manual by developer. Must be gitignored. When present, the `warn-bash-state.sh` hook skips its advisory warning.

### `.gitignore` Additions
This epic requires adding to `.gitignore`: `dist/` (build output from `build:plugin`), `.goodplan-dev` (development sentinel).

### Skill References
- All skill bodies reference the CLI as `gp`, not `goodplan`
- Skills reference shared files via `../_shared/references/` relative paths (works within plugin boundary)
- Skills are namespaced as `/gp:<skill-name>` when loaded from the plugin
- **Known bug (issue #20994):** Plugin skills may NOT be automatically namespaced with the plugin prefix — they may use exactly the `name` field from YAML frontmatter. Fallback: if auto-namespacing does not work at implementation time, manually prefix skill names in YAML frontmatter (e.g., `name: gp:explore`). The build pipeline should include a verification step asserting all skill names carry the `gp:` prefix.

## Cross-Cutting Concerns

### Naming
- **Product name**: "goodplan" in prose (documentation, descriptions, comments about the workflow system)
- **CLI binary**: `gp`
- **Plugin name**: `gp`
- **Skill invocation**: `/gp:<skill-name>`
- References to the CLI in skill bodies, CLAUDE.md, and hook messages use `gp`

### State Protection — Three Layers
1. **Prevention (hooks)**: Write/Edit on `.goodplan/**/*.json` and `.goodplan/**/*.jsonl` -> blocked (exit 2). Bash commands containing `.goodplan/` -> warned (exit 0, advisory).
2. **Detection (embedded signature)**: `stateSignature` field in `goodplan.json` stores an HMAC-SHA256 computed over the entire state tree. CLI verifies on read (hard error on mismatch); `gp verify` performs a single pass/fail check; `gp verify --fix` recomputes and re-embeds the signature.
3. **Repo detection**: Bash warning skipped when `.goodplan-dev` sentinel file exists in `cwd` (development repo).

### `nextCommands` Response Shape
```json
{
  "nextCommands": {
    "entity": [
      { "command": "gp epic:show --epic {name}", "description": "View epic details" },
      { "command": "gp submit-explore --epic {name}", "description": "Complete exploration phase" }
    ],
    "other": [
      { "command": "gp quest:create", "description": "Create a side quest" },
      { "command": "gp task:create", "description": "Capture a quick task" }
    ]
  }
}
```
- Included in every mutation response (JSON mode only)
- Entity section: reads + mutations for the entity just acted on
- Other section: mutations only (creation events across all entity types)
- Not included in read-only command responses
- `nextCommands` are suggestions — listed commands may fail due to guard conditions or other preconditions
