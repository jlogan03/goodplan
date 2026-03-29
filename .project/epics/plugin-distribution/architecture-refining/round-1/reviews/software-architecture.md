# Software Architecture Review — Plugin Distribution Epic

## Issues

### 1. [IMPORTANT] Hook configuration format does not match plugin hook schema

**Description:** The architecture specifies `hooks.json` as a flat array format:

```json
{
  "hooks": [
    { "event": "PreToolUse", "matcher": "^(Write|Edit)$", "command": "..." }
  ]
}
```

But the research (`claude-code-plugin-format.md`, `claude-code-hooks-pretooluse.md`) documents the actual plugin hook format as a three-level nested structure: `{ "hooks": { "PreToolUse": [ { "matcher": "...", "hooks": [ { "type": "command", "command": "..." } ] } ] } }`. The architecture's flat format will not work with Claude Code's hook loader. Every hook entry needs a `type` field and the nesting is mandatory.

**Resolution:** Update `hooks.json` in `plugin-api.md` to match the documented three-level nesting format. The research files already have the correct format — the architecture just needs to adopt it consistently.

### 2. [IMPORTANT] Command metadata on transition rows conflates the state machine with CLI concerns

**Description:** The architecture places `command` metadata (template strings like `'gp epic:explore --epic {name}'`) directly on state machine transition table rows. The existing state machine is pure — it knows nothing about CLI commands, binary names, or flag syntax. Adding command templates introduces a CLI-layer concern into the rules engine, violating the clean boundary documented in `state-machine-api.md` ("The state machine imports only its own types and shared schema types from `src/schemas/`"). The `TransitionRow` interface in `cli-changes-api.md` even shows `event`, `from`, `to`, `guard` — a different shape from the actual implementation which uses individual handler functions per event type (see `reduce.ts`).

Furthermore, the actual state machine implementation does not use declarative transition table rows. It uses a `handlerRecord` mapping event types to handler functions. There are no rows to "annotate" with command metadata — this is a structural mismatch between the architecture's assumed implementation and the actual code.

**Resolution:** Keep command metadata in a separate registry at the RPC layer or as a parallel constant map (event type + entity type -> command template). This registry can be co-located with the transition tables conceptually without being embedded in them. The `computeNextCommands()` function can query the registry using the entity's new status and the known event types for that status. This preserves the state machine's purity while still deriving commands from transition knowledge. The registry can have a fitness function ensuring every event type has a corresponding entry.

### 3. [IMPORTANT] HMAC verification on every read creates fragile onboarding and collaboration experience

**Description:** The architecture mandates "every state file read verifies the HMAC" and rejects tampered data with an error. This means: (a) cloning a repo where `.signatures.json` was never committed fails, (b) any team member who runs a different CLI version that uses a different HMAC key (even temporarily) corrupts the entire state, (c) manual recovery from any state corruption requires knowing the HMAC key which is "inaccessible outside the binary," and (d) the first time a user installs the plugin on an existing project, all reads fail because no signatures exist.

The architecture says the HMAC key is "a permanent constant baked into the compiled binary" and "same key across all builds." This means the key is a shared secret embedded in a distributed binary — it provides detection of accidental modification but not security against a motivated actor who can extract the key from the binary. The security value is therefore limited while the friction cost is high.

**Resolution:** Make signature verification advisory rather than blocking on read. The CLI should verify signatures when present and log warnings for mismatches, but still process the data. `gp verify` remains the explicit integrity check that returns an error exit code. On write, always update signatures. This provides the detection benefit without the fragility. Consider a `--strict` flag for environments that want hard verification. For onboarding, generate initial signatures on first write if `.signatures.json` is absent.

### 4. [IMPORTANT] `nextCommands` derivation from transition tables requires knowledge the tables do not encode

**Description:** The architecture says `computeNextCommands()` filters "transition table rows where `from` includes `newStatus`." But the transition tables (as documented in `transition-tables.md`) do not directly map events to CLI commands. Multiple events map to the same CLI command pattern (e.g., `COMPLETE_PLAN` and `COMPLETE_QUEST_PLAN` both come from `submit-plan`). Some transitions are internal (score-threshold re-loops in refinement) and should not produce user-facing commands. Guards may prevent transitions that the simple status-based filter would include. The algorithm as described would produce commands that are invalid due to guard conditions (e.g., suggesting `gp epic:activate` when no verifications exist).

**Resolution:** The command metadata registry (per issue 2) should include a `userFacing: boolean` flag to suppress internal transitions. Guard-dependent transitions should either be always included (the CLI will return a clear error if the guard fails) or the registry should encode the guard condition as a description hint (e.g., "requires verification criteria"). Accept that `nextCommands` is an approximation of available actions, not a guarantee — document this contract explicitly.

### 5. [MINOR] Binary path is hardcoded to `macos-arm64` with no platform detection

**Description:** Skills and hooks reference the binary at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. The existing architecture overview documents three target platforms (darwin-arm64, darwin-x64, linux-x64). The research confirms "Plugin format doesn't natively support platform detection." The architecture provides no mechanism for selecting the correct binary on non-arm64-Mac platforms.

**Resolution:** Document a `SessionStart` hook that detects platform via `uname` and symlinks the correct binary to `${CLAUDE_PLUGIN_DATA}/bin/gp`. Skills reference `${CLAUDE_PLUGIN_DATA}/bin/gp` instead of the platform-specific path. This is already hinted at in the binary embedding research but not incorporated into the architecture.

### 6. [MINOR] `warn-bash-state.sh` dev-repo detection is brittle

**Description:** The hook checks `package.json` for `"name": "goodplan"` to skip warnings in the dev repo. This check parses JSON with `jq` but relies on the exact string match. If the package name changes (the architecture renames the binary to `gp`), if the file is temporarily absent, or if another project happens to have `"name": "goodplan"`, the behavior is wrong.

**Resolution:** Use a more robust detection mechanism — check for `src/core/state/reduce.ts` existence or a `.goodplan-dev` sentinel file. Alternatively, accept the false positive rate since the warning is advisory (exit 0) and the cost of a false warning is low.

### 7. [MINOR] `.signatures.json` not validated by the schema registry

**Description:** The Data Layer's schema registry (`data-layer-api.md`) maps path patterns to Zod schemas. `.signatures.json` is a new file in `.project/` but is not mentioned in the registry. It would be read by `assembleState()` and needs validation rules, or it needs to be excluded from the state tree.

**Resolution:** Either add a schema registry entry for `.signatures.json` (path pattern, Zod schema for the `{ version, files }` shape) or document that it is handled separately by the signature module and excluded from the state tree.

### 8. [MINOR] Plugin CLAUDE.md and project CLAUDE.md may conflict

**Description:** The plugin ships a `CLAUDE.md` at the plugin root with instructions about using `gp`. Projects using goodplan already have a `CLAUDE.md` referencing `goodplan` CLI commands. The architecture does not address how these interact or whether the plugin CLAUDE.md is additive or overriding.

**Resolution:** Clarify that the plugin CLAUDE.md is loaded by Claude Code as plugin-level instructions (additive to project CLAUDE.md). Document that after the rename, project CLAUDE.md files should be updated to reference `gp` instead of `goodplan`. Consider whether the plugin CLAUDE.md should be minimal (just the binary path and core rules) to avoid duplication with per-project instructions.

### 9. [MINOR] No rollback or recovery mechanism for signature mismatches

**Description:** When `gp verify` reports mismatches, the architecture says it "reports but does not fix." There is no documented way to re-sign files after legitimate out-of-band modifications (e.g., manual JSON fixes, migrations from older versions). The user must somehow get the CLI to rewrite every affected file.

**Resolution:** Add a `gp verify --fix` or `gp resign` command that re-reads all state files and regenerates signatures. This is a simple Data Layer operation (read + sign + write `.signatures.json`) that does not require state machine involvement.

## Score: 7/10

The architecture makes sound high-level decisions: keeping the 4-layer stack intact, using hooks for state protection, and deriving `nextCommands` from transition knowledge rather than a parallel registry. The distribution model (single-repo, release branch, git-subdir) is well-researched and practical. However, there are structural issues at the module boundary level. The command metadata placement in the state machine layer leaks CLI concerns into the pure rules engine (a module depth violation — the state machine should hide transition implementation details behind its `reduce()` interface, not expose CLI command templates). The HMAC signature system creates a deep module in the Data Layer but with a fragile read-time contract that will cause friction during adoption and collaboration. The hook format mismatch is a correctness issue that must be fixed. Together these represent meaningful boundary violations that affect the architecture's primary quality attributes.

## Summary
- Critical: 0
- Important: 4
- Minor: 5
