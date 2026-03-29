# Merged Architecture Review — Plugin Distribution Epic (Round 2)

**Reviewers:** Software Architecture (8/10), Holistic (8/10), DevOps/Infra (7/10), API Contract (8/10)

---

## CRITICAL Issues

### C1: `updateSignature()` and `commitState()` atomicity gap
**Source:** API Contract (C1), Software Architecture (#2), Holistic (#2)
**Trusted reviewer:** API Contract (domain specialist for contract correctness)

Three reviewers flagged variants of this issue. The most specific formulation (API Contract): if the process crashes after writing a state file but before updating `.signatures.json`, the next read will hard-error on HMAC mismatch with no automatic recovery — the user must manually run `gp verify --fix`. Additionally, `.signatures.json` is partially updated during multi-file `commitState()` writes, creating a window for concurrent readers to see inconsistent state.

**Resolution:**
1. Specify that `.signatures.json` is updated atomically as the final step of `commitState()`, after all state files are written (batch all signature updates, single atomic write).
2. Define its position in the write ordering explicitly.
3. On HMAC mismatch, the error message must tell the user to run `gp verify --fix` so recovery is discoverable.
4. Clarify that `.signatures.json`-based cache invalidation is an optimization (avoids reading every file to check staleness), complementary to existing `commitState()` concurrent modification detection — not a replacement for it.

**Category:** DIRECTLY_ACTIONABLE

---

## IMPORTANT Issues

### I1: `commandMetadata` registry drift risk — no enforced sync mechanism
**Source:** Software Architecture (#1), Holistic (#7)

The `commandMetadata` registry inverts the Commands API mapping, but no build-time or test-time mechanism enforces they stay in sync. A new command added without a registry entry causes `nextCommands` to silently omit it.

**Resolution:** Elevate the fitness function from "candidate" to "required before merge." Assert bidirectional coverage: every user-facing command has a registry entry, every registry entry maps to a valid command. Consider deriving the registry programmatically from the Commands API to eliminate the sync problem entirely.

**Category:** DIRECTLY_ACTIONABLE

---

### I2: HMAC threat model framing overstates protection against LLM bypass
**Source:** Holistic (#1)

The HMAC key is baked into a public binary and extractable via `strings`. Calling it "prevents casual LLM bypass" overstates its value — any LLM with tool use could extract the key. The hooks are the actual LLM bypass prevention. The HMAC's real value is tamper-detection (manual edits, bad merges, disk errors, non-CLI tools).

**Resolution:** Reframe the HMAC as a tamper-detection checksum, not an access control mechanism. Remove "prevents casual LLM bypass" framing. The hooks prevent; the HMAC detects what hooks miss (direct filesystem writes outside Claude Code).

**Category:** DIRECTLY_ACTIONABLE

---

### I3: `computeNextCommands` return type not wired into existing RPC result types
**Source:** API Contract (I1)

`BeginResult`, `SubmitResult`, and `CompleteResult` in the RPC Layer API do not include a `nextCommands` field. The architecture says mutation handlers include `nextCommands` in JSON output but doesn't specify which layer adds it.

**Resolution:** Either extend the RPC result types with an optional `nextCommands` field, or explicitly document that the Commands layer computes and appends `nextCommands` after receiving the RPC result.

**Category:** DIRECTLY_ACTIONABLE

---

### I4: `__GP_VERSION__` vs `__GOODPLAN_VERSION__` define mismatch
**Source:** DevOps/Infra (#1)

The plugin build spec uses `__GP_VERSION__` but the codebase uses `__GOODPLAN_VERSION__` everywhere (`src/version.ts`, `vitest.config.ts`, `tests/global-setup.ts`, `package.json`). If `build:plugin` uses `__GP_VERSION__` without updating source files, version injection silently fails and the binary produces `0.0.0-dev`.

**Resolution:** Either (a) keep `__GOODPLAN_VERSION__` in build:plugin (simpler, no code changes) or (b) explicitly document the rename as a migration step listing all affected files.

**Category:** DIRECTLY_ACTIONABLE

---

### I5: CI pipeline lacks HMAC key injection detail
**Source:** DevOps/Infra (#2)

The architecture specifies HMAC key injection from a CI secret but doesn't name the secret, specify how it's passed to the build script, or define behavior for local `build:plugin` runs.

**Resolution:** Specify: (a) GitHub Actions secret name, (b) env var mechanism for passing to build, (c) local dev behavior — either a hardcoded dev key or env var with documented fallback.

**Category:** DIRECTLY_ACTIONABLE

---

### I6: No rollback or versioned release strategy
**Source:** DevOps/Infra (#3)

Force-push to `release` branch has no rollback path. All users get the latest version immediately. The post-build assertion catches version mismatches but not functional regressions.

**Resolution:** (a) Tag releases on `release` branch before force-pushing. (b) Consider pinning a tag ref in the marketplace manifest instead of a branch ref. (c) Document manual rollback procedure.

**Category:** DIRECTLY_ACTIONABLE

---

### I7: Template interpolation for slice commands lacks `{epic}` resolution path
**Source:** API Contract (I3)

`computeNextCommands` accepts `parentEpic?: string` but existing RPC result types don't return parent epic name. The caller needs the epic name from somewhere.

**Resolution:** Document where `parentEpic` is sourced. If from RPC results, add `parentEpic?: string` to result types. If from command flags, document explicitly.

**Category:** DIRECTLY_ACTIONABLE

---

### I8: `gp verify` contract wording contradiction
**Source:** API Contract (I2)

The contracts section says "`gp verify` is read-only" but also documents `gp verify --fix` which is a write operation.

**Resolution:** Reword to: "`gp verify` without `--fix` is read-only. `gp verify --fix` is a write operation that re-signs all state files."

**Category:** DIRECTLY_ACTIONABLE

---

## MINOR Issues

### M1: Hook `jq` dependency — pick one JSON parser
**Source:** Software Architecture (#3), DevOps/Infra (#7)

Three-way fallback chain (`jq` / `python3` / `osascript`) adds complexity. macOS guarantees `python3` since Catalina.

**Resolution:** Use `python3 -c "import sys,json; ..."` as the sole JSON parser in hooks. Remove `jq` dependency and fallback chain entirely.

**Category:** DIRECTLY_ACTIONABLE

---

### M2: `gp verify` exit code conflicts with existing convention
**Source:** Holistic (#3), API Contract (M1)

Exit code 1 for "mismatches found" conflicts with the existing convention where 1 = internal error. A mismatch is expected behavior, not an error.

**Resolution:** Use exit code 2 for "mismatches found" (validation category), keeping 1 for internal failures. Or use a distinct code (e.g., 4) for integrity violations.

**Category:** DIRECTLY_ACTIONABLE

---

### M3: `gp verify` missing from Commands API surface
**Source:** Holistic (#5)

`gp verify` and `gp verify --fix` are defined in cli-changes-api.md but not added to commands-api.md.

**Resolution:** Add `gp verify [--fix] [--json]` to Global Commands in commands-api.md with routing, flags, and exit codes.

**Category:** DIRECTLY_ACTIONABLE

---

### M4: `nextCommands` placeholder format under-specified
**Source:** Software Architecture (#4)

Non-interpolated flags (e.g., `--reason`) appear as placeholders but the exact format is not specified.

**Resolution:** Specify placeholder format (e.g., `--reason "<reason>"`) and document that entries with angle-bracket placeholders require user input.

**Category:** DIRECTLY_ACTIONABLE

---

### M5: `warn-bash-state.sh` numbered steps don't match code order
**Source:** Holistic (#4)

Numbered steps show sentinel check before JSON extraction, but the code extracts JSON first (needs `CWD` for sentinel path).

**Resolution:** Reorder numbered steps to match actual code: (1) extract JSON, (2) check sentinel, (3) check command.

**Category:** DIRECTLY_ACTIONABLE

---

### M6: `nextCommands` guidance missing from plugin CLAUDE.md
**Source:** Holistic (#6)

No mention in the plugin CLAUDE.md template that `nextCommands` are suggestions, not guarantees.

**Resolution:** Add one-line note to plugin CLAUDE.md template content mentioning `nextCommands` may fail due to preconditions.

**Category:** DIRECTLY_ACTIONABLE

---

### M7: `macos-latest` runner may not be arm64 in future
**Source:** DevOps/Infra (#4)

GitHub Actions `macos-latest` mapping can change. The build targets arm64 and runs the binary for post-build assertion.

**Resolution:** Pin runner to `macos-14` or `macos-15` instead of `macos-latest`.

**Category:** DIRECTLY_ACTIONABLE

---

### M8: `nextCommands` not specified for `complete()` operations
**Source:** API Contract (M2)

After completing a slice, the user wants to know what's next, but `nextCommands` for complete responses isn't documented.

**Resolution:** Clarify whether `nextCommands` is included in complete responses.

**Category:** DIRECTLY_ACTIONABLE

---

### M9: `commandMetadata` registry doesn't cover `task` and `decision` entity types
**Source:** API Contract (M3)

Examples only cover epic, slice, and quest entities. Task and decision have different lifecycle patterns.

**Resolution:** Clarify whether these entity types have registry entries or are handled differently.

**Category:** DIRECTLY_ACTIONABLE

---

### M10: `.signatures.json` not self-signed — acknowledged limitation
**Source:** Software Architecture (#5)

Bypass of hooks allows tampering with the manifest itself, collapsing the HMAC system. Consistent with stated threat model.

**Resolution:** No action for v1. Consider future `gp verify` comparison against git-committed version.

**Category:** RESEARCH_NEEDED (future enhancement)

---

### M11: Marketplace manifest location ambiguity
**Source:** Software Architecture (#6)

Repo-root `.claude-plugin/marketplace.json` vs `dist/gp-plugin/.claude-plugin/plugin.json` use the same directory name in different contexts.

**Resolution:** Add clarifying sentence distinguishing the two.

**Category:** DIRECTLY_ACTIONABLE

---

### M12: `claude plugin validate` availability in CI
**Source:** DevOps/Infra (#6)

CI validation step assumes `claude` CLI is installed but doesn't ensure it.

**Resolution:** Either install `claude` CLI in CI or make validation conditional with structural fallback checks.

**Category:** DIRECTLY_ACTIONABLE

---

## Contradictions Resolved

### HMAC threat model framing
- **Holistic** said HMAC framing as "prevents casual LLM bypass" is wrong — the key is publicly extractable
- **Software Architecture** accepted the framing at face value, noting it's consistent with the stated threat model
- **Resolution:** Trust Holistic's domain-specific analysis. The HMAC key being in a public binary means it cannot prevent LLM bypass. Reframe as tamper-detection (I2 above).

### Cache invalidation characterization
- **Holistic** said `.signatures.json` cache invalidation is redundant with `commitState()` concurrent modification detection
- **API Contract** flagged it as a crash-recovery gap (atomicity issue)
- **Software Architecture** flagged it as an atomicity concern during multi-file writes
- **Resolution:** Both perspectives are correct and complementary. The atomicity fix (batch signature updates) resolves the API Contract concern. The Holistic clarification (optimization, not replacement) is also needed. Both resolutions included in C1.

---

## Unresolved (USER_INPUT Required)

### U1: `__GP_VERSION__` rename decision
Should the plugin build use the existing `__GOODPLAN_VERSION__` define (no code changes) or rename to `__GP_VERSION__` (requires migration of 4+ files)? The rename aligns with the `gp` branding but adds implementation scope.

### U2: HMAC key for local development
Should local `build:plugin` runs use a hardcoded dev key, require a `GP_HMAC_KEY` env var, or skip HMAC entirely? This affects developer experience and testing.

### U3: `gp verify` exit code choice
Exit code 2 (validation category) or a new distinct code (e.g., 4 for integrity violations)? Different reviewers suggested different approaches.

---

## Counts

| Category | Count |
|---|---|
| CRITICAL | 1 |
| IMPORTANT | 8 |
| MINOR | 12 |
| DIRECTLY_ACTIONABLE | 19 |
| RESEARCH_NEEDED | 1 |
| USER_INPUT required | 3 |
| Contradictions resolved | 2 |
