# Software Architecture Review — Plugin Distribution Epic (Round 2)

## Summary

The architecture packages the existing four-layer CLI into a Claude Code plugin with state protection hooks, HMAC integrity verification, self-documenting `nextCommands`, and a clean binary rename. Round 2 addressed the major issues from round 1: command metadata correctly moved to RPC layer, HMAC verification behavior clarified, hooks.json corrected, platform scope narrowed, and dev repo detection simplified. The result is a well-structured design with clear boundaries.

**Score: 8/10**

---

## Criteria Evaluation

### 1. Subsystem Decomposition (1x)
**Pass.** The plugin infrastructure is correctly separated from the four-layer CLI stack. Hook scripts, manifest, and build pipeline live outside the CLI codebase. The HMAC signature module is placed in the Data Layer (correct — it's an I/O concern). The `commandMetadata` registry sits at the RPC layer (correct — it inverts the Commands API mapping without polluting the state machine). The new `gp verify` command follows the existing read-only command pattern.

### 2. API Surface Minimality (1x)
**Pass.** New public APIs are minimal: `computeNextCommands()` in RPC, `signFile/verifyFile/updateSignature/verifyAll` in Data Layer, `gp verify` command. Hook scripts expose only exit codes. No unnecessary abstractions.

### 3. Dependency Direction (1x)
**Pass.** Strict unidirectional flow preserved. Plugin hooks have no dependency on the CLI — they're read-only interceptors in Claude Code's runtime. The `commandMetadata` registry depends on Commands API mapping (same direction). Signature module in Data Layer has no upward dependencies.

### 4. Data Flow Clarity (1x)
**Pass.** Three data flows are well-documented:
- Hook: stdin JSON -> pattern match -> exit code
- `nextCommands`: mutation result -> registry lookup -> interpolation -> response
- HMAC: write -> sign -> update manifest; read -> verify -> hard error or proceed

### 5. Error Handling Strategy (1x)
**Pass.** HMAC mismatch is a hard error (never silently uses tampered data). Bootstrap exception is clearly scoped (missing `.signatures.json` only). `gp verify` exit codes are defined (0 = valid, 1 = mismatch). Hook blocking uses exit 2 with descriptive stderr. `nextCommands` being an approximation (guards not evaluated) is explicitly documented.

### 6. Naming and Terminology (1x)
**Pass.** Clean separation: "goodplan" for product prose, "gp" for CLI/plugin/skills. `commandMetadata` vs `nextCommands` distinction is clear (registry vs computed output). Template variables (`{name}`, `{epic}`) are self-documenting.

### 7. Cross-Cutting Concern Handling (1x)
**Pass.** State protection uses three complementary layers (prevention via hooks, detection via HMAC, recovery via `gp verify --fix`). The `.goodplan-dev` sentinel file cleanly separates dev from production repos. Version is sourced from `package.json` everywhere.

### 8. Module Depth (2x) -- IMPORTANT
**Pass with minor concern.** The signature module is deep — simple interface (`sign/verify/update`) hiding HMAC computation, manifest management, cache invalidation, and bootstrap detection. `computeNextCommands()` is reasonably deep — hides registry lookup, filtering, interpolation, and template expansion behind a single call. However, the `commandMetadata` registry itself is a static data structure that must be manually kept in sync with the Commands API mapping — see Important issue below.

### 9. Information Hiding (2x) -- IMPORTANT
**Pass.** The HMAC key is an implementation detail of the Data Layer — callers never see it. Hook scripts hide pattern matching logic from both Claude Code and the CLI. The signature manifest format (algorithm prefix, version field) enables future migration without changing the API. `nextCommands` hides the registry structure — callers see only the computed result.

### 10. Subsystem Boundaries and Contracts (2x) -- IMPORTANT
**Pass.** Contracts are explicit and well-separated:
- Hooks: read-only, no CLI calls, no file modifications
- Signatures: every write updates, every read verifies, bootstrap exception documented
- `nextCommands`: computed not cached, approximation documented
- Build pipeline: version from `package.json`, binary version must match manifest version

### 11. Caller Friction (2x) -- IMPORTANT
**Pass.** `nextCommands` is automatically included in mutation responses — zero caller friction for skills. `gp verify --fix` provides a clean recovery path after legitimate modifications. Binary at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` eliminates PATH concerns. Plugin installation is a single marketplace command.

---

## Issues

### IMPORTANT

#### 1. `commandMetadata` registry drift risk — no fitness function enforcing sync
The `commandMetadata` registry inverts the Commands API mapping, but there is no mechanism ensuring they stay in sync at build time. A candidate fitness function is mentioned ("Every user-facing command has a registry entry") but it's not yet written. If a new command is added to the Commands API without a corresponding registry entry, `nextCommands` silently omits it. This is a maintenance hazard for a growing command surface.

**Recommendation:** Elevate this fitness function from "candidate" to "required before merge." The test should assert bidirectional coverage: every user-facing command has a registry entry, and every registry entry maps to a valid command. Consider deriving the registry programmatically from the Commands API's command-to-event mapping rather than maintaining it as a separate static data structure — this would eliminate the sync problem entirely.

#### 2. Cache invalidation via `.signatures.json` comparison — atomicity gap
The architecture states that cache invalidation is handled by comparing `.signatures.json` on disk against the cached version. But `.signatures.json` is updated after each individual file write. If the CLI writes multiple state files in a single `commitState()` call (which it does — e.g., `COMPLETE_SLICE` writes to slice.json, epic.json, project.json, learnings.jsonl, architecture-deltas.jsonl, and activity-log.jsonl), there's a window where `.signatures.json` is partially updated. A concurrent reader during this window would see a valid `.signatures.json` but with stale signatures for not-yet-written files.

**Recommendation:** Clarify whether `updateSignature()` is called per-file during `commitState()` or once at the end with all signatures. If per-file, document that `.signatures.json` is written atomically at the end of `commitState()` (batch all signature updates, write once). This aligns with the existing atomic write pattern in the Data Layer.

#### 3. Hook `jq` dependency — fragile fallback chain
The architecture notes that `jq` may not be installed on all macOS configurations and suggests `python3 -c` or `osascript -l JavaScript` as fallbacks. This creates a fragile three-way fallback chain in shell scripts that must be tested across environments. For a v1 targeting macOS arm64 only, this is manageable but adds unnecessary complexity.

**Recommendation:** Pick one approach and require it. Since the plugin targets macOS arm64, `python3` is guaranteed by macOS (since Catalina). Use `python3 -c "import sys,json; ..."` as the primary JSON parser in hooks — no fallback needed. Or bundle a static `jq` binary in the plugin directory.

### MINOR

#### 4. `nextCommands` template variables are under-specified for edge cases
Template interpolation handles `{name}` and `{epic}`. But some commands require flags that don't map to entity identifiers (e.g., `--reason` for abandon, `--index` for update-verification). The doc says these "use literal placeholders and serve as guidance, not executable strings" — but it doesn't specify what those literal placeholders look like in the output. Skills consuming `nextCommands` need to know whether `--reason "..."` or `--reason <reason>` or something else appears.

**Recommendation:** Specify the exact placeholder format for non-interpolated flags (e.g., `--reason "<reason>"`) and document that `nextCommands` entries containing angle-bracket placeholders are templates requiring user input, not directly executable.

#### 5. `.signatures.json` not signed — acknowledged but worth noting
The doc correctly notes that `.signatures.json` itself is not signed (bootstrap problem) and is protected by the same hooks. This means a determined bypass of hooks (which the doc acknowledges is possible via Bash redirects) could tamper with the manifest itself. This is consistent with the stated threat model (casual LLM bypass, not determined adversaries), but worth calling out: the entire HMAC system collapses if `.signatures.json` is tampered.

**Recommendation:** No action needed given the stated threat model. Just ensure `gp verify` output clearly distinguishes between "signature mismatch" (file was tampered) and "manifest tampered" (`.signatures.json` itself was modified — detectable only by comparing against git history). Consider a future enhancement where `gp verify` optionally compares `.signatures.json` against the git-committed version.

#### 6. Marketplace manifest location ambiguity
The marketplace manifest is described as living "At repo root: `.claude-plugin/marketplace.json`" — but this appears to be the same `.claude-plugin/` directory used for the plugin manifest (`plugin.json`). The marketplace manifest is for the marketplace repo, while the plugin manifest is inside the assembled plugin directory at `dist/gp-plugin/.claude-plugin/plugin.json`. These are different contexts but use the same directory name, which could cause confusion during implementation.

**Recommendation:** Add a sentence clarifying that the repo-root `.claude-plugin/marketplace.json` is for marketplace discovery and is separate from `dist/gp-plugin/.claude-plugin/plugin.json` which ships with the plugin.

---

## What Improved Since Round 1

1. **Command metadata at RPC layer** — correctly separates CLI knowledge from state machine purity
2. **HMAC hard error on mismatch** — eliminates ambiguity about behavior on tampering
3. **hooks.json format corrected** — three-level nesting matches Claude Code's actual API
4. **Platform scope narrowed** — macOS arm64 only for v1, with clear future expansion path
5. **Dev repo detection via `.goodplan-dev` sentinel** — simpler than checking git remotes
6. **`gp verify --fix`** — clean recovery path for legitimate out-of-band modifications

## Verdict

Solid architecture that respects existing boundaries, adds meaningful protection layers, and avoids over-engineering. The main risk is the manually-maintained `commandMetadata` registry drifting from the Commands API — address this with a required fitness function or derive the registry programmatically. The HMAC system is well-designed for its stated threat model. The plugin packaging is clean and follows Claude Code's plugin conventions.

| Severity | Count |
|---|---|
| Critical | 0 |
| Important | 3 |
| Minor | 3 |
