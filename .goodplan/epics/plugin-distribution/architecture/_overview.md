# Architecture Overview — Plugin Distribution Epic

## Summary of Changes

This epic wraps the goodplan CLI, skills, and hooks into a single Claude Code plugin (`gp`) and adds CLI affordances (`nextCommands`) to every mutation response. It also renames the CLI binary from `goodplan` to `gp`.

The existing four-layer stack (Commands → RPC → State Machine → Data Layer) is unchanged in structure. Changes are:
- **RPC Layer**: computes `nextCommands` after each mutation via a `commandMetadata` registry that maps `(entityType, status)` pairs to available commands; binary renamed to `gp`
- **Commands Layer**: surfaces `nextCommands` in JSON output
- **New: Plugin packaging** — hooks, manifest, build pipeline, marketplace config (outside the 4-layer stack)

## What's New

### Plugin Infrastructure
A distribution wrapper around the existing system. Not a new subsystem in the 4-layer stack — it's packaging and enforcement that lives outside the CLI codebase.

- **Plugin manifest** (`plugin.json`) — declares plugin name (`gp`), version, and component paths
- **Hook scripts** — shell scripts executing in Claude Code's runtime, not the CLI's runtime
- **Build script** (`build:plugin`) — assembles the plugin directory from source
- **Marketplace manifest** — enables installation via `/plugin marketplace add`

### State Protection Hooks
Shell scripts that enforce the "CLI owns state files" invariant:
- **protect-state.sh** — PreToolUse hook that blocks Write/Edit on `.goodplan/**/*.json` and `.goodplan/**/*.jsonl` (exit 2)
- **warn-bash-state.sh** — PreToolUse hook that warns when Bash commands reference `.goodplan/` (advisory, exit 0). Skipped when `cwd` is the goodplan source repo.

### CLI Affordances (`nextCommands`)
Every mutation response includes available next actions, derived from a `commandMetadata` registry at the RPC layer:
- **Entity commands** — reads and mutations valid for the entity just acted on
- **Other commands** — mutations available across all entity types (creation events, etc.)
- Read-only commands do not include `nextCommands`.
- `nextCommands` is an approximation — guards may prevent some listed commands from actually succeeding.

## What's Modified

### RPC Layer
After each mutation, computes `nextCommands` using a `commandMetadata` registry that inverts the existing command-to-event mapping from the Commands API:
1. Looking up available commands for `(entityType, newStatus)` in the registry
2. Filtering out entries with `userFacing: false` (internal transitions)
3. Interpolating entity identifiers into command templates
4. Adding entity-scoped read commands (static, small list per entity type)
5. Adding "other" mutations (creation events from all entity types)

The registry is derived from the Commands API's command-to-event mapping — the state machine remains pure and has no knowledge of CLI command syntax.

### Commands Layer
- Binary renamed from `goodplan` to `gp`
- JSON output includes `nextCommands` from RPC layer responses

## Key Invariants

**INV-008: Single Transition Per Command** — Every CLI mutation command maps to exactly one state machine transition. Additional mutations (entity creation, activity log appends, directory creation) are RPC-layer side effects, not state machine events. This guarantees `nextCommands` can be derived from the transition table alone.

**INV-009: State File Integrity via Embedded Signature** — The CLI maintains a `stateSignature` field in `goodplan.json` containing an HMAC-SHA256 computed over the serialized state tree (all `.goodplan/` state files). The HMAC key is a stable constant baked into the compiled binary, injected from a CI secret. On every write, the CLI serializes the full state tree, computes the HMAC (excluding the `stateSignature` field itself), and embeds the signature in `goodplan.json` as part of the atomic write. On every read, the CLI assembles the state tree, recomputes the HMAC, and compares — hard error on mismatch. `gp verify` performs a single pass/fail check; `gp verify --fix` recomputes and re-embeds. Bootstrap exception: if `stateSignature` is missing from `goodplan.json`, compute and add it. The HMAC detects tampering (manual edits, bad merges, disk errors, non-CLI tools) — it is not an access control mechanism.

## Distribution Model

- Single-repo marketplace using `git-subdir` with `ref: "release"`
- CI builds plugin on tag push, force-pushes to `release` branch at `plugins/gp/`
- Users install via `/plugin marketplace add ian97531/goodplan` (`ian97531/goodplan` is the GitHub repo name for goodplan)
- Binary at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` — no PATH integration or setup script needed
- Skills invoked as `/gp:create-plan`, `/gp:explore`, etc.

**Platform constraint (v1):** macOS arm64 only. Multi-platform support (macOS x64, Linux) is a future enhancement requiring a SessionStart hook for platform detection and binary selection from `${CLAUDE_PLUGIN_ROOT}/binaries/<platform>/gp`. Skills should reference `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` directly for v1.

## Subsystems Affected

| Subsystem | Change Type | Description |
|---|---|---|
| RPC Layer | Modified | `commandMetadata` registry, `nextCommands` computation after mutations |
| Commands | Modified | Binary rename, `nextCommands` in output |
| Data Layer | Modified | Embedded state signature (HMAC `stateSignature` in `goodplan.json`) for state tree integrity |
| Plugin (new) | Added | Packaging, hooks, build pipeline, distribution |

## Subsystem Maturity

| Subsystem | Maturity | Dependents | Fitness Functions | Notes |
|---|---|---|---|---|
| Plugin | Experimental | — | candidate | New: packaging, hooks, build pipeline, distribution |
| State Machine | Developing (unchanged) | RPC Layer | — | No changes — remains pure |
| RPC Layer | Developing (modified) | Commands | required | Adding `nextCommands` computation |
| Commands | Developing (modified) | — | — | Binary rename, `nextCommands` in output |
| Data Layer | Developing (modified) | RPC Layer, Commands | candidate | Adding embedded state signature (HMAC) |
