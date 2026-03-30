# Merged Architecture Review — Plugin Distribution Epic (Round 1)

### CRITICAL Issues

**C1. hooks.json format does not match Claude Code's actual plugin hook schema**
*Flagged by: software-architecture, holistic, devops-infra, api-contract (all four reviewers)*

The architecture specifies `hooks.json` as a flat array with `event`, `matcher`, `command` fields. The actual Claude Code format uses three-level nesting: event name key -> matcher group array -> handler array with `type: "command"`. The architecture's format will silently fail to load. The `type` field is missing and the `description` field does not belong on individual entries.

**Resolution:** Rewrite `hooks.json` in plugin-api.md to use the three-level nested format documented in the research. Drop `event` and `description` from individual entries. Add `type: "command"` to each handler. Add the Bash warning hook as a second PreToolUse entry.

---

### IMPORTANT Issues

**I1. Command metadata on transition rows conflates state machine with CLI concerns**
*Flagged by: software-architecture, api-contract*

The architecture places CLI command templates (e.g., `gp epic:explore --epic {name}`) directly on transition table rows. The existing state machine is pure — it uses `handlerRecord` mapping event types to handler functions, not declarative rows. There are no rows to annotate. Adding CLI syntax to the state machine violates the layered architecture (state machine should not know about CLI command syntax or flag names). The Commands API already has the complete command-to-event mapping.

**Resolution:** Keep command metadata out of the state machine. Define a `commandMetadata` registry at the RPC layer that maps `(entityType, status)` pairs to available commands. The registry inverts the existing command-to-event mapping. Include a `userFacing: boolean` flag to suppress internal transitions. Accept that `nextCommands` is an approximation (guards may prevent some listed commands) and document this contract explicitly.

---

**I2. HMAC read-time verification will break on fresh clones, existing repos, and collaboration**
*Flagged by: software-architecture, holistic*

The architecture mandates "every state file read verifies the HMAC" and errors on mismatch. This breaks: (a) fresh clones where `.signatures.json` doesn't exist, (b) repos initialized before the HMAC system, (c) legitimate out-of-band edits (merge conflicts, migrations), (d) collaboration with different CLI versions. No bootstrapping or migration path is defined.

**Resolution:** Make signature verification advisory on read — verify when present, warn on mismatch, but still process data. `gp verify` remains the strict integrity check. On write, always update signatures. Define bootstrapping: if `.signatures.json` is missing, skip verification and offer `gp verify --init`. Add `gp verify --fix` / `gp resign` to re-sign after legitimate modifications. Consider a `--strict` flag for environments wanting hard verification.

---

**I3. HMAC key as permanent constant creates security/rotation concerns**
*Flagged by: holistic, devops-infra, api-contract*

The architecture claims the key is "inaccessible outside the binary" but `--define` values in Bun binaries are extractable via `strings`. The key is the same across all builds, so anyone with the binary can forge signatures. No rotation path exists if the key is leaked. The architecture overstates the security guarantee.

**Resolution:** (a) Acknowledge in invariants that HMAC prevents accidental corruption and casual LLM bypass, not determined adversaries. (b) Soften "permanent constant that never changes" to "stable constant that changes only with major version migration." (c) Consider per-installation key generation (stored in `CLAUDE_PLUGIN_DATA`) instead of baking into binary. (d) Add key rotation path via `gp verify --migrate` using the existing `version` field. (e) If baked in, inject from CI secret rather than source control.

---

**I4. Skill auto-namespacing bug not addressed**
*Flagged by: holistic*

Research documents a known bug (issue #20994) where plugin skills are NOT automatically namespaced with the plugin prefix. Skills use exactly the `name` field from YAML frontmatter. The architecture assumes automatic namespacing throughout without mentioning the risk.

**Resolution:** Add a note in conventions.md acknowledging the bug. Define fallback: if the bug persists at implementation time, manually prefix skill names in YAML frontmatter (e.g., `name: gp:explore`). Include a verification step in the build pipeline.

---

**I5. No multi-platform binary strategy**
*Flagged by: devops-infra (critical), software-architecture (minor), holistic (minor)*

The architecture hardcodes `binaries/macos-arm64/gp` in all references. The system overview lists three target platforms. No platform detection or conditional path resolution exists.

**Resolution (per conflict rules — devops-infra trusted on infra):** Either (a) add a SessionStart hook that detects platform via `uname` and symlinks the correct binary from `${CLAUDE_PLUGIN_ROOT}/binaries/<platform>/gp` to `${CLAUDE_PLUGIN_DATA}/bin/gp`, or (b) scope first release explicitly to macOS arm64 only with documented constraint and clear migration path. Option (b) is acceptable for v1; option (a) is the target state. Skills should reference a platform-agnostic path.

*Note: devops-infra rated this CRITICAL; holistic argued it's a non-issue since PLUGIN_ROOT always has the current binary. Resolved by treating it as IMPORTANT — v1 can ship macOS-arm64-only if explicitly scoped, but the architecture must acknowledge the limitation rather than silently hardcoding.*

---

**I6. No GitHub Actions workflow and CI runner requirements unspecified**
*Flagged by: devops-infra*

No `.github/workflows/` exists. The pipeline description lacks: runner requirements, cross-compilation validation, release branch authentication mechanism, and subdirectory management strategy.

**Resolution:** Add specifics to plugin-api.md CI/CD section: runner matrix with OS and Bun version, authentication mechanism for release branch push, cross-compilation viability note, and release branch management strategy (orphan branch with force-pushed content).

---

**I7. Force-push to release branch has no rollback strategy**
*Flagged by: devops-infra*

Force-push overwrites history. Marketplace manifest pins `ref: "release"` with no SHA pinning. All users get the latest (possibly broken) version immediately.

**Resolution:** Add SHA pinning to the marketplace manifest (updated as part of release workflow). Keep tags on the release branch so previous versions are recoverable. Consider version tags (`v1.0.0`) on the release branch.

---

**I8. `gp verify` output contract missing `extra` field for untracked state files**
*Flagged by: api-contract*

No accounting for state files that exist on disk but have no entry in `.signatures.json`.

**Resolution:** Add `extra` count to output and `"status": "unsigned"` entries in the results array for untracked state files.

---

### MINOR Issues

**M1. `warn-bash-state.sh` dev-repo detection is brittle**
*Flagged by: software-architecture*

Checks `package.json` for `"name": "goodplan"` — breaks if name changes.

**Resolution:** Use a `.goodplan-dev` sentinel file, or accept false positives since the warning is advisory (exit 0).

---

**M2. `.signatures.json` not in the schema registry**
*Flagged by: software-architecture*

New file in `.project/` needs either a schema registry entry or explicit exclusion from the state tree.

**Resolution:** Add a schema entry or document that the signature module handles it separately.

---

**M3. Plugin CLAUDE.md and project CLAUDE.md interaction undefined**
*Flagged by: software-architecture*

No guidance on how plugin-level and project-level CLAUDE.md files interact.

**Resolution:** Clarify plugin CLAUDE.md is additive. Keep it minimal to avoid duplication. Document that projects should update references from `goodplan` to `gp` after rename.

---

**M4. No rollback/recovery for signature mismatches**
*Flagged by: software-architecture*

No way to re-sign files after legitimate out-of-band modifications.

**Resolution:** Add `gp verify --fix` or `gp resign` command. (Overlaps with I2 resolution.)

---

**M5. `nextCommands` "other" section is unbounded**
*Flagged by: holistic*

Creation commands from ALL entity types included; will grow noisy as entity types expand.

**Resolution:** Limit to curated high-value creation commands or document the list is intentionally comprehensive.

---

**M6. Marketplace manifest uses `ian97531/project-skills` without context**
*Flagged by: holistic*

Repo name not explained; may confuse readers.

**Resolution:** Add a one-line note clarifying `ian97531/project-skills` is the GitHub repo name for goodplan.

---

**M7. Build pipeline step numbering gap**
*Flagged by: holistic, devops-infra*

Steps skip from 5 to 7 in plugin-api.md.

**Resolution:** Renumber sequentially.

---

**M8. `jq` dependency not validated**
*Flagged by: devops-infra*

`jq` is not installed by default on macOS; hooks will fail if missing.

**Resolution:** Use built-in shell tools for simple JSON parsing in hooks, or add a `jq` check with a clear error message.

---

**M9. `build:plugin` script location underspecified**
*Flagged by: devops-infra*

Not clear if it's a shell script, Bun script, or package.json entry.

**Resolution:** Specify as a `package.json` script entry following the existing `install:skills` pattern.

---

**M10. No binary-to-manifest version consistency check**
*Flagged by: devops-infra*

Binary version could mismatch plugin manifest version.

**Resolution:** Add a post-build assertion that runs the binary with `--version` and compares against `plugin.json`.

---

**M11. `.signatures.json` algorithm prefix has no unknown-algorithm handling strategy**
*Flagged by: api-contract*

If a future version uses a different algorithm, old CLIs can't verify.

**Resolution:** Define behavior for unknown algorithm prefix: treat as verification failure (safe default) or skip with warning.

---

**M12. `nextCommands` template variables too limited**
*Flagged by: api-contract*

Only `{name}` and `{epic}` are supported; commands requiring `--reason`, `--index`, etc. can't be fully interpolated.

**Resolution:** Document that interpolation only handles entity identifiers. Commands requiring user input use literal placeholders and are guidance, not executable. Consider an `executable: boolean` field on `CommandEntry`.

---

**M13. Hook stdin contract: `cwd` parsing not shown in pseudocode**
*Flagged by: api-contract*

Script pseudocode uses `$cwd` as a shell variable but it's inside a JSON payload on stdin.

**Resolution:** Show explicit `jq` extraction of `cwd` from stdin JSON in the spec.

---

**M14. INV-008 too broad — includes read-only commands**
*Flagged by: holistic*

"Every CLI command maps to exactly one state machine transition" but read-only commands have none.

**Resolution:** Refine to "Every CLI mutation command maps to exactly one state machine transition."

---

**M15. Inconsistency between exit-code and JSON hook decision control**
*Flagged by: holistic*

Architecture uses simpler exit-code model; research documents richer JSON model.

**Resolution:** None needed — exit-code model is sufficient. No action required.

---

### DIRECTLY_ACTIONABLE

1. **C1** — Rewrite hooks.json format (mechanical fix, research has correct format)
2. **I1** — Move command metadata out of state machine to RPC-layer registry
3. **I2** — Make HMAC verification advisory on read, add bootstrapping path
4. **I4** — Add skill namespacing bug acknowledgment and fallback
5. **I5** — Scope v1 to macOS arm64 explicitly or add platform detection
6. **I8** — Add `extra` field to `gp verify` output
7. **M1** — Fix dev-repo detection mechanism
8. **M2** — Add `.signatures.json` to schema registry or document exclusion
9. **M3** — Clarify CLAUDE.md interaction
10. **M7** — Renumber build steps
11. **M8** — Remove `jq` dependency or add validation
12. **M9** — Specify `build:plugin` as package.json script
13. **M13** — Fix hook pseudocode to show JSON parsing
14. **M14** — Refine INV-008 wording

### RESEARCH_NEEDED

1. **I3** — Per-installation key generation vs baked-in key: investigate whether `CLAUDE_PLUGIN_DATA` persists across updates and whether per-installation keys break repo portability
2. **I6** — CI runner requirements: confirm Bun cross-compilation behavior (macOS arm64 binary built on ubuntu-latest)
3. **I7** — SHA pinning in marketplace manifest: confirm Claude Code marketplace supports `ref` with SHA vs branch name

### Contradictions Resolved

1. **Multi-platform binary severity:** devops-infra rated CRITICAL; holistic and software-architecture rated MINOR. Resolved as IMPORTANT — per conflict rules, devops-infra is trusted on infrastructure concerns, but the architecture can scope v1 to a single platform if explicitly documented, making it not blocking (IMPORTANT rather than CRITICAL).

2. **Binary location (PLUGIN_ROOT vs PLUGIN_DATA):** devops-infra (IMPORTANT) says PLUGIN_ROOT is unsafe due to mid-session updates; holistic (self-corrected to non-issue) says PLUGIN_ROOT is simpler and correct. Resolved in favor of devops-infra per conflict rules — add a note about the trade-off, recommend PLUGIN_DATA for multi-platform future but accept PLUGIN_ROOT for v1 single-platform.

3. **`nextCommands` on transition rows vs separate registry:** software-architecture and api-contract both say separate registry. No contradiction — unanimous agreement. Resolved: move to RPC-layer registry.

### Unresolved (USER_INPUT required)

(None — all resolved.)

### USER_INPUT Resolved

1. **HMAC verification strictness policy:** Hard error on mismatch — refuse to proceed with tampered data. **Bootstrap exception:** first time the CLI runs on a project with no `.signatures.json`, it creates signatures for all existing state files and proceeds normally. This handles fresh clones and pre-HMAC repos.

2. **HMAC key management model:** Permanent baked-in constant, same key across all installations and versions, never rotates. The purpose is not secrecy — it's making it as hard as possible for the LLM to directly modify state. Acknowledge in the architecture that this prevents accidental corruption and casual LLM bypass, not determined adversaries. Inject from CI secret (not source control) for the compiled binary.

3. **I3 resolution:** Per the user's decision, baked-in key is confirmed. No research needed. Update I3 to soften security claims and acknowledge the actual threat model.
