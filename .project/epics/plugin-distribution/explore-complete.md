# Explore Complete

## Scope
epics/plugin-distribution

## What Was Explored
- Claude Code plugin manifest format, directory structure, and discovery mechanisms
- Bun compile behavior for standalone binary creation (58 MB, no runtime deps)
- PreToolUse hook mechanics for blocking/warning on tool calls
- Skill loading and namespacing from plugins
- Current build and install pipeline in this repo
- Plugin marketplace distribution (manifest format, git-subdir source, single-repo hosting)
- Plugin design brainstorm covering naming, state protection, CLI affordances, build pipeline, and distribution

## Key Conclusions

### Plugin Format
- `plugin.json` in `.claude-plugin/` with auto-discovery of `skills/` and `hooks/`
- Skills namespaced as `/gp:skill-name` via plugin name
- `CLAUDE_PLUGIN_ROOT` (replaced on update) vs `CLAUDE_PLUGIN_DATA` (persistent across updates)
- PreToolUse hooks can block tool calls (exit 2) or warn (exit 0 + stderr message)

### Naming
- CLI binary renamed from `goodplan` to `gp`; plugin name `gp`
- "goodplan" stays as product name in prose; `gp` for all invocation references
- Clean break — no backward compatibility with `goodplan` binary name

### State Protection
- Block Write/Edit on `.project/**/*.json` and `.project/**/*.jsonl` (exit 2)
- Warn on Bash commands referencing `.project/` (advisory only, exit 0)
- Skip Bash warning when in the goodplan source repo

### CLI Affordances
- Every mutation response includes `nextCommands` with entity-specific commands (reads + mutations) and other available mutations
- Computed in the RPC layer from state machine transition tables
- Read-only commands do not include `nextCommands`

### Binary Distribution
- No PATH integration needed — skills/hooks reference binary at `${CLAUDE_PLUGIN_DATA}/bin/gp`
- SessionStart hook copies binary from plugin root to persistent data directory
- 58 MB standalone macOS arm64 binary via `bun build --compile`

### Distribution Model
- Single-repo marketplace: `marketplace.json` at repo root, plugin built by CI
- Release branch or Git LFS for the compiled binary (keeps main clean)
- Dev testing via `claude --plugin-dir dist/gp-plugin`
- Real installs via marketplace: `/plugin marketplace add ian97531/project-skills`

### Open Questions for Architecture
1. Release branch vs Git LFS vs separate directory for binary in CI
2. CI pipeline design (GitHub Actions)
3. `nextCommands` data structure — static registry vs derived from transition tables
4. Reliable detection of goodplan source repo in Bash warning hook
5. Marketplace manifest `git-subdir` configuration for pointing at release branch or subdirectory

## Artifacts
- research/claude-code-plugin-format.md
- research/bun-compile-binary-embedding.md
- research/claude-code-hooks-pretooluse.md
- research/claude-code-skill-loading.md
- research/current-build-pipeline.md
- research/plugin-marketplace-distribution.md
- brainstorm/plugin-design.md
