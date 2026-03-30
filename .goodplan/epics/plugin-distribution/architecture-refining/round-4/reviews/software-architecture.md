# Software Architecture Review — Plugin Distribution Epic (Round 4)

## Summary

Round 4 architecture is excellent. All prior issues have been resolved. The round 3 important issue (serialization ordering determinism) is now explicitly documented in conventions.md with a clear specification: file paths sorted lexicographically, JSON keys use deterministic ordering per INV-002, JSONL entry order preserved, line endings normalized. The `parentEpic` resolution is clarified — the Commands layer passes the `--epic` flag value directly to `computeNextCommands()`, and the function is deliberately not part of RPC result types. The architecture is implementation-ready with no structural issues remaining.

**Score: 9/10**

---

## Criteria Evaluation

### 1. Subsystem Decomposition (1x)
**Pass.** Four-layer stack preserved without contamination. Plugin infrastructure (hooks, manifest, build, CI/CD) correctly sits outside the CLI's four-layer boundary as a distribution wrapper. Each new concern has a clear home: `commandMetadata` at RPC, HMAC signatures at Data Layer, `gp verify` as a new command, hooks as external Claude Code interceptors. No gratuitous subsystem introduction. The single-cell `serializeStateTree` in the Data Layer is appropriate — it's I/O-adjacent state serialization, not workflow logic.

### 2. API Surface Minimality (1x)
**Pass.** Public surface remains tight and purposeful. `computeNextCommands()` is the single entry point for next-action guidance. `serializeStateTree/signStateTree/verifyStateTree` form a cohesive signature API. `gp verify [--fix]` is the only new command. No convenience wrappers or redundant entry points. The `commandMetadata` registry itself is internal to `computeNextCommands()` — not part of the public API surface.

### 3. Dependency Direction (1x)
**Pass.** Unidirectional dependency flow is rigidly maintained. The `computeNextCommands()` layer ownership is now precisely documented: it lives in the RPC layer, is called by the Commands layer after receiving the RPC mutation result, and is deliberately NOT part of the RPC result types. This prevents the Commands layer from depending on an RPC result field for CLI-specific computation. Hooks have zero inward dependencies — they pattern-match on stdin JSON and return exit codes.

### 4. Data Flow Clarity (1x)
**Pass.** All data flows are now fully specified with no ambiguity:
- HMAC write: mutate -> serialize (lexicographic file order, deterministic keys, exclude `stateSignature`) -> HMAC-SHA256 -> embed in `goodplan.json` -> atomic write
- HMAC read: assemble -> serialize (same ordering) -> recompute -> compare embedded signature -> hard error on mismatch
- Cache invalidation: `stateSignature` field comparison IS the cache validity check — cache hit skips full HMAC verification
- `nextCommands`: RPC result -> Commands layer calls `computeNextCommands(entityType, name, newStatus, epicFlag)` -> merge into JSON output
- Hook: stdin JSON -> single `python3` invocation for parsing -> glob match -> exit code

### 5. Error Handling Strategy (1x)
**Pass.** Error paths are comprehensive and lead to recovery. HMAC mismatch -> hard error directing user to `gp verify --fix`. Bootstrap exception cleanly scoped (missing `stateSignature` only). Note the asymmetry: bootstrap auto-signs on normal CLI operations, but `gp verify` without `--fix` on a pre-HMAC repo returns fail — this prevents `gp verify` from silently bootstrapping, which is correct. Hook exit 2 carries an actionable message referencing `gp --help`. Binary-not-found on wrong platform produces a clear platform constraint error.

### 6. Naming and Terminology (1x)
**Pass.** Naming is consistent and self-documenting. "goodplan" for product prose, "gp" for CLI/plugin/skills — cleanly separated. `__GOODPLAN_VERSION__` renamed to `__GP_VERSION__` across all affected files. `stateSignature` is self-explanatory. `commandMetadata` (static registry) vs `nextCommands` (computed response) distinction is maintained. Template variable formats are distinguished: `{name}` for interpolation, `<reason>` for user-supplied values.

### 7. Cross-Cutting Concern Handling (1x)
**Pass.** Three-layer state protection is well-designed defense in depth:
1. Prevention (hooks) -> blocks Write/Edit on state files
2. Detection (embedded HMAC) -> catches Bash redirects, manual edits, disk errors
3. Recovery (`gp verify --fix`) -> one-command fix

Key rotation via `version` field in `goodplan.json` is a pragmatic future-proofing mechanism that avoids complexity now. The `.goodplan-dev` sentinel cleanly gates dev repo detection. Plugin CLAUDE.md is additive to project CLAUDE.md — no conflict surface.

### 8. Module Depth (2x)
**Pass.** This is the architecture's strongest area. The embedded HMAC signature module is deeply encapsulated: callers interact with three functions (`serialize/sign/verify`) while the module hides lexicographic file ordering, deterministic key serialization, JSONL ordering preservation, line-ending normalization, `stateSignature` field self-exclusion, bootstrap detection, cache invalidation via signature comparison, and algorithm-prefix parsing. The round 3 improvement (eliminating `.signatures.json` in favor of an embedded `stateSignature` field within the atomic write) was a significant depth gain — it collapsed a two-step coordination problem into an internal detail.

`computeNextCommands()` is similarly deep: a single call hides registry lookup by `(entityType, status)`, `userFacing` filtering, template variable interpolation (`{name}`, `{epic}`), static read-command injection, "other" mutation collection, and angle-bracket placeholder passthrough. The caller provides four values and gets a complete `NextCommands` object.

### 9. Information Hiding (2x)
**Pass.** Sensitive internals are properly hidden:
- HMAC key: compile-time constant via `--define`, never exposed in the public API, algorithm prefix allows internal migration
- `commandMetadata` registry: internal to `computeNextCommands()`, not exported
- Serialization determinism: callers of `verifyStateTree()` never know about file ordering or key sorting — they get a boolean
- Hook pattern-matching logic: hidden from both Claude Code (which just sees exit codes) and the CLI (which doesn't know hooks exist)
- Build pipeline internals (compilation flags, key injection, version stamping): hidden from the plugin consumer

One observation: the `stateSignature` field is visible in `goodplan.json`, but the algorithm prefix (`hmac-sha256:`) is a deliberate information exposure that enables future migration. This is the right tradeoff — it's metadata about the signature, not the key or implementation.

### 10. Subsystem Boundaries and Contracts (2x)
**Pass.** Contracts are precise and enforceable:
- Hooks: read-only, no CLI calls, no file modifications, `python3` for JSON parsing, exit 0/2 only
- Signatures: every write embeds, every read verifies, bootstrap auto-signs on CLI operations (but NOT on `gp verify` without `--fix`), covers JSON/JSONL only, markdown excluded
- `nextCommands`: computed not cached, approximation documented, mutation responses only, `userFacing` filter, `parentEpic` from `--epic` flag (not RPC result)
- Build: version from `package.json`, post-build assertion (binary `--version --json` must match `plugin.json`), smoke test for hooks, pinned macOS runner (`macos-15`, not `macos-latest`)
- Bidirectional `commandMetadata` coverage: required fitness function before merge — this is the right enforcement level for a registry that must stay in sync

### 11. Caller Friction (2x)
**Pass.** Every integration point has minimal caller burden:
- `nextCommands`: zero-friction — automatically included in all mutation responses, skills just read it
- HMAC: transparent — Data Layer handles sign/verify during normal read/write, no caller involvement
- Bootstrap: automatic — first CLI run on a pre-HMAC repo auto-signs
- Plugin installation: single marketplace command
- Binary access: fixed path via `${CLAUDE_PLUGIN_ROOT}`, no PATH setup
- `gp verify --fix`: one command for recovery
- Dev testing: `claude --plugin-dir dist/gp-plugin` — no installation needed

The `computeNextCommands()` separation (RPC exports, Commands calls) adds minimal friction — the Commands layer already has the entity context from the RPC result and the `--epic` flag value. No extra I/O or state loading needed.

---

## Issues

### MINOR

#### 1. `warn-bash-state.sh` substring match on `.goodplan/` may produce false positives

The hook checks if `command` contains `.goodplan/` as a substring. Commands like `echo "see docs at .goodplan/architecture"` or `grep -r "pattern" . | grep -v .goodplan/` would trigger the warning even when they are read-only or referencing the path in a non-modifying context. Since the hook is advisory (exit 0, warning only), this is low impact, but noisy false positives can train users and LLMs to ignore the warning.

**Recommendation:** No action needed for v1 — the advisory nature and `.goodplan-dev` skip make this tolerable. If false positive noise becomes a problem in practice, a future refinement could check for write-indicative patterns (`>`, `>>`, `rm`, `mv`, `cp`, `sed -i`, `tee`) in the command.

#### 2. CI rollback procedure assumes operator familiarity with release branch structure

The architecture documents rollback as `git push --force origin <previous-tag>:release` and mentions future consideration of pinning a tag ref in the marketplace manifest. For a v1 single-developer project this is fine, but the rollback procedure is documented in the architecture (a design document) rather than in an operational runbook. If the project grows, operational procedures should be separated from architectural decisions.

**Recommendation:** Acceptable for v1. When multi-contributor support becomes relevant, extract the rollback procedure and release branch management into a separate operational document.

---

## What Improved Since Round 3

1. **Serialization determinism fully specified** — `serializeStateTree()` now documents lexicographic file path sorting, deterministic JSON key ordering (per INV-002), JSONL entry order preservation, and `\n` line-ending normalization. This eliminates the round 3 important issue about potential false HMAC mismatches.
2. **`parentEpic` resolution clarified** — explicitly documented that the Commands layer passes the `--epic` flag value directly to `computeNextCommands()`, and that `computeNextCommands()` is deliberately not part of RPC result types. This resolves the round 3 minor about under-specification.
3. **Cache invalidation integrated with HMAC** — the `stateSignature` field comparison serves as both integrity check and cache validity check, eliminating a separate cache invalidation mechanism.
4. **`gp verify` bootstrap asymmetry documented** — the bootstrap exception does NOT apply to `gp verify` without `--fix`, preventing silent auto-signing during explicit verification.

## Verdict

The architecture is mature and implementation-ready. The embedded HMAC signature system is well-designed with proper depth and information hiding. The `commandMetadata` registry correctly separates CLI knowledge from state machine purity. The three-layer state protection provides defense in depth. All prior issues have been resolved. The two remaining minor issues are operational refinements that do not affect correctness or implementability. No further refinement rounds are needed.

| Severity | Count |
|---|---|
| Critical | 0 |
| Important | 0 |
| Minor | 2 |
