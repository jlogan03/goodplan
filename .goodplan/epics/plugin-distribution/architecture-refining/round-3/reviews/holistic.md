# Holistic Review — Plugin Distribution Epic (Round 3)

**Reviewer:** Holistic
**Score:** 8/10
**Issues:** Critical: 1, Important: 2, Minor: 4

---

## Evaluation Criteria

1. **Completeness** — Does the architecture cover all stated goals?
2. **Goal alignment** — Does it deliver what the confirmed goal specifies?
3. **Internal consistency** — Do the documents agree with each other?
4. **Gap detection** — Are there missing pieces that would block implementation?
5. **Invariant compliance** — Does it respect existing system invariants (INV-001 through INV-007)?

---

## CRITICAL Issues

### C1: State directory name mismatch — `.goodplan/` vs `.project/`

The plugin architecture consistently references `.goodplan/` as the state directory (38 occurrences across all 5 files) and `goodplan.json` as the project file. The existing system architecture uses `.project/` as the state directory and `project.json` as the project file — confirmed in `_overview.md`, `data-model.md`, `commands-api.md`, and the live filesystem.

No other epic (including entity-restructuring) mentions a rename from `.project/` to `.goodplan/`. The plugin architecture appears to have silently introduced this rename without documenting it as a change, updating the existing architecture docs, or adding it to the epic scope.

This affects every component: hook patterns match `.goodplan/**/*.json`, the HMAC signature lives in `goodplan.json`, the sentinel file is `.goodplan-dev`, and the CLAUDE.md template references `.goodplan/`.

**Impact:** If the rename is intentional, it is a cross-cutting change that touches the Data Layer, all tests, all skills, the existing CLAUDE.md, and every project currently using `.project/`. It needs to be explicitly scoped, have a migration path, and be documented in the overview as a change. If unintentional, all 38 references need correction to `.project/` and `project.json`.

**Resolution:** Decide whether the directory rename is part of this epic. If yes: add it to the overview's "What's Modified" section, define a migration path for existing repos, update the data model doc, and add affected files. If no: replace all `.goodplan/` references with `.project/` and `goodplan.json` with `project.json` throughout the plugin architecture files.

---

## IMPORTANT Issues

### I1: `gp verify` exit code resolved inconsistently with INV-007

Round 2 flagged exit code 1 for "mismatches found" as conflicting with INV-007's convention (1 = internal error, 2 = validation/usage error). The round 2 merged doc left this as USER_INPUT (U3), but the current cli-changes-api.md still specifies exit code 1 for verification failure. The issue was not resolved.

INV-007 defines: 0 = success, 1 = internal/unexpected, 2 = validation/usage, 3 = state machine errors. A signature mismatch is a validation failure (the state fails an integrity check), so exit code 2 is the natural fit. Using 1 contradicts the established convention and makes it indistinguishable from an internal CLI crash.

**Resolution:** Change `gp verify` exit code for mismatch from 1 to 2, consistent with INV-007's validation category. Update cli-changes-api.md accordingly.

### I2: HMAC verification on every read creates a performance concern not addressed

INV-009 and cli-changes-api.md specify that every Data Layer read assembles the full state tree (all JSON/JSONL files), computes an HMAC, and compares. The existing system reads state frequently — `assembleState()` is called on every command, including read-only commands like `list` and `show`. Computing HMAC-SHA256 over the entire state tree on every single CLI invocation adds I/O (reading all state files even when only one is needed) and CPU overhead.

The cache invalidation section mentions "embedded `stateSignature` comparison" but doesn't specify the optimization path. If the cache already has the signature from a prior read, does it skip the full HMAC recomputation? The mechanism for avoiding redundant full-tree reads on every command is not specified.

**Resolution:** Clarify the read-path optimization. Options: (a) read only `project.json`, compare cached `stateSignature` to embedded value, skip full HMAC if match; (b) verify on first read per process only; (c) accept the overhead as acceptable for a dev tool. Whatever the choice, document it explicitly so implementers don't introduce a performance regression.

---

## MINOR Issues

### M1: `nextCommands` not aligned with existing Commands API command surface

The cli-changes-api.md examples show `gp submit-explore --epic {name}` as a next command, but the existing Commands API (commands-api.md) uses `goodplan submit-explore --epic <name>`. Beyond the binary rename (expected), the command signatures in `nextCommands` examples should exactly match the existing Commands API surface. The `submit-*` commands in the existing API are global commands (not namespaced), which is correct in the examples, but the templates should be validated against the actual command definitions to prevent drift. The bidirectional fitness function (marked required) addresses this, but the architecture should note that the registry must be updated whenever a command is added, removed, or has its flags changed.

### M2: `nextCommands` for `complete()` is specified but edge cases are unclear

The contracts state "`nextCommands` is included in `complete()` mutation responses." After completing a slice, `nextCommands` should suggest the next slice or epic completion. But the `commandMetadata` registry maps `(entityType, status)` to commands — after `COMPLETE_SLICE`, the slice's status is `completed`, and the interesting next commands are on *other* entities (the next slice, or the parent epic). The algorithm in step 1 looks up commands for the entity that was just acted on, but a completed slice has no further transitions. Steps 2-3 (entity reads + other mutations) partially cover this, but the most useful suggestion (start the next slice) requires knowledge of sibling entities.

**Resolution:** Document whether `computeNextCommands` for completed entities should include sibling entity suggestions or leave that to the skill/LLM layer. Either approach is fine — just be explicit.

### M3: Plugin CLAUDE.md references `${CLAUDE_PLUGIN_ROOT}` but this is a runtime variable

The plugin-api.md says the CLAUDE.md template tells users the binary is at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp`. If CLAUDE.md is a static markdown file, `${CLAUDE_PLUGIN_ROOT}` won't be interpolated — it will appear as a literal string. This is fine if Claude Code understands this convention when reading plugin CLAUDE.md files (it likely does, since skills use the same pattern). But if not, the binary path instruction is useless. The architecture should note the assumption that Claude Code interpolates `${CLAUDE_PLUGIN_ROOT}` in plugin CLAUDE.md at load time, or that the LLM is expected to resolve it from context.

### M4: `.goodplan-dev` sentinel file not defined in any existing architecture doc

The `warn-bash-state.sh` hook checks for `.goodplan-dev` (or `.project-dev` if the rename is corrected) as a sentinel to skip warnings in the development repo. This sentinel file is not documented in the data model, the existing architecture, or the conventions. Implementers need to know: where is it created? Is it gitignored? Is it a zero-byte file or does it have content? Who creates it — the developer manually, or a CLI command?

**Resolution:** Add a one-line definition of the sentinel file: location (project root), content (empty file), creation (manual by developer), gitignore status (should be in `.gitignore`).

---

## Round 2 Issue Resolution Check

Checking whether round 2 issues were addressed:

| Issue | Status | Notes |
|---|---|---|
| C1: Atomicity gap | **Resolved** | Embedded signature in `goodplan.json` eliminates separate `.signatures.json`. Write flow is atomic. |
| I1: Registry drift | **Resolved** | Fitness function elevated to "required before merge." |
| I2: HMAC threat model | **Resolved** | Consistently framed as tamper-detection, not access control. |
| I3: `nextCommands` not wired into RPC types | **Resolved** | Commands layer computes and appends. Explicitly documented. |
| I4: `__GP_VERSION__` rename | **Resolved** | Rename documented with affected files list. |
| I5: HMAC key injection | **Resolved** | CI secret name, env var, and dev key fallback all specified. |
| I6: Rollback strategy | **Resolved** | Tag before force-push, rollback procedure documented. |
| I7: `parentEpic` resolution | **Resolved** | Sourced from RPC result or command flag, documented. |
| I8: `gp verify` read-only wording | **Resolved** | Reworded correctly. |
| M1: Hook JSON parser | **Resolved** | `python3` only, no `jq` dependency. |
| M2: `gp verify` exit code | **NOT resolved** | Still uses exit code 1. See I1 above. |
| M3: `gp verify` in commands-api.md | **Not applicable** | This epic's architecture doesn't modify commands-api.md directly; that would happen during implementation. |
| M4: Placeholder format | **Resolved** | Angle-bracket format specified. |
| M5: `warn-bash-state.sh` step order | **Resolved** | Steps now match code order. |
| M6: `nextCommands` in plugin CLAUDE.md | **Resolved** | Mentioned in plugin CLAUDE.md content. |
| M7: `macos-latest` runner | **Resolved** | Pinned to `macos-15`. |
| M8: `nextCommands` for `complete()` | **Partially resolved** | Contract says it's included, but edge cases remain (see M2 above). |
| M9: `task` entity coverage | **Not explicitly resolved** | Task commands appear in the commands list but the registry coverage fitness function should catch gaps. |
| M10: `.signatures.json` not self-signed | **Resolved (by removal)** | No more `.signatures.json` — embedded in `goodplan.json`. |
| M11: Marketplace manifest location | **Resolved** | Clarifying note added. |
| M12: `claude plugin validate` in CI | **Resolved** | Conditional with graceful skip. |
| U1: `__GP_VERSION__` decision | **Resolved** | Rename chosen, affected files listed. |
| U2: HMAC dev key | **Resolved** | Well-known dev key hardcoded in build script. |
| U3: `gp verify` exit code | **NOT resolved** | See I1 above. |

---

## Goal Alignment Assessment

The confirmed goal: "Atomic plugin distribution, state protection (hooks + HMAC), self-documenting CLI (nextCommands), clean rename (goodplan to gp), simple build pipeline."

| Goal Component | Coverage | Notes |
|---|---|---|
| Atomic plugin distribution | Complete | Plugin manifest, marketplace manifest, CI/CD pipeline, rollback |
| State protection (hooks) | Complete | protect-state.sh and warn-bash-state.sh fully specified |
| State protection (HMAC) | Complete | Embedded signature, verify command, bootstrap, threat model |
| Self-documenting CLI (nextCommands) | Complete | Registry, algorithm, response shape, contracts, fitness functions |
| Clean rename (goodplan to gp) | Complete | Binary, defines, skills, CLAUDE.md all addressed |
| Simple build pipeline | Complete | Single script, CI/CD, local testing path |

All goal components are covered. The architecture is comprehensive and internally consistent (modulo the `.goodplan/` naming issue). The embedded signature approach from round 3 is a significant improvement over the separate `.signatures.json` from round 2 — it eliminates the atomicity gap entirely.

---

## Invariant Compliance

| Invariant | Compliance | Notes |
|---|---|---|
| INV-001: Mutations through state machine | Compliant | `nextCommands` is computed post-mutation, does not bypass state machine |
| INV-002: Deterministic key ordering | Compliant | No new JSON write paths that bypass `commitState()` |
| INV-003: State machine purity | Compliant | `commandMetadata` registry lives at RPC layer, not state machine |
| INV-004: Stateless commands | Compliant | `gp verify` takes no implicit state |
| INV-005: Schema validation on read/write | Needs attention | `stateSignature` field added to `goodplan.json` — Zod schema for `project.json` must be updated to include this field |
| INV-006: Schema output reflects signatures | Compliant | `gp verify` is a new command that must appear in schema output |
| INV-007: Structured errors with correct exit codes | Partially compliant | `gp verify` exit code 1 contradicts convention (see I1) |
| INV-008 (new): Single transition per command | Self-consistent | Defined and justified |
| INV-009 (new): Embedded signature | Self-consistent | Comprehensive specification |

---

## Summary

The architecture is well-structured and comprehensive after two rounds of refinement. The embedded signature approach is elegant and resolves the previous atomicity concerns. The `nextCommands` design properly respects layer boundaries. The critical issue is the `.goodplan/` vs `.project/` naming discrepancy, which permeates all documents and must be resolved before implementation can begin. The remaining important issues (exit code convention, read-path performance) are tractable. Minor issues are documentation gaps, not design flaws.
