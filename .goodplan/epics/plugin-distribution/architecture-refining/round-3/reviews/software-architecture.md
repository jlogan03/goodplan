# Software Architecture Review — Plugin Distribution Epic (Round 3)

## Summary

Round 3 architecture is mature and well-structured. All round 1 and round 2 issues have been addressed: command metadata is correctly placed at the RPC layer, HMAC redesigned as a single embedded `stateSignature` in `goodplan.json` (eliminating the atomicity gap and `.signatures.json` tampering vector), hooks.json uses the correct three-level nested format, `jq` replaced with `python3`, dev repo detection uses `.goodplan-dev` sentinel, `commandMetadata` registry fitness function elevated to required, and template placeholder format specified. The remaining issues are minor refinements, not structural problems.

**Score: 9/10**

---

## Criteria Evaluation

### 1. Subsystem Decomposition (1x)
**Pass.** The four-layer stack is preserved intact. Plugin infrastructure (hooks, manifest, build pipeline) correctly lives outside the stack as a distribution wrapper. The `commandMetadata` registry sits at the RPC layer — the correct location since it inverts the Commands API mapping without polluting the state machine. The HMAC signature module is in the Data Layer — correct since it operates on serialized state during I/O. The new `gp verify` command follows the established read-only command pattern. No new subsystems are introduced unnecessarily.

### 2. API Surface Minimality (1x)
**Pass.** New public surface is tight: `computeNextCommands()` in RPC, `serializeStateTree/signStateTree/verifyStateTree` in Data Layer, `gp verify [--fix]` command. Hook scripts expose only exit codes. The embedded `stateSignature` field eliminates a separate `.signatures.json` file, reducing the API surface compared to earlier rounds.

### 3. Dependency Direction (1x)
**Pass.** Strict unidirectional flow preserved. Plugin hooks have zero dependency on the CLI — they are read-only interceptors in Claude Code's runtime that pattern-match file paths. The `commandMetadata` registry depends on Commands API mapping (same direction: RPC depends on Commands knowledge). The Data Layer signature module has no upward dependencies. The build pipeline is external to the stack.

### 4. Data Flow Clarity (1x)
**Pass.** All three new data flows are well-documented with explicit algorithms:
- Hook: stdin JSON -> `python3` parse -> glob match -> exit code
- `nextCommands`: mutation result -> `commandMetadata` registry lookup -> `userFacing` filter -> template interpolation -> response
- HMAC: write -> serialize state tree (JSON/JSONL only, exclude `stateSignature`) -> compute HMAC -> embed in `goodplan.json` -> atomic write; read -> assemble tree -> recompute -> compare -> hard error on mismatch

### 5. Error Handling Strategy (1x)
**Pass.** HMAC mismatch is a hard error with a clear recovery path (`gp verify --fix`). Bootstrap exception is cleanly scoped (missing `stateSignature` field only — computed and embedded on first run). Hook blocking uses exit 2 with actionable stderr message. `nextCommands` approximation nature is explicitly documented as a contract. Exit codes for `gp verify` are defined (0 = pass, 1 = fail).

### 6. Naming and Terminology (1x)
**Pass.** Clean separation maintained: "goodplan" for product prose, "gp" for CLI/plugin/skills. `commandMetadata` (static registry) vs `nextCommands` (computed output) distinction is clear and consistent. `stateSignature` is self-documenting. Template variables (`{name}`, `{epic}`) and angle-bracket placeholders (`<reason>`) have distinct semantics that are documented.

### 7. Cross-Cutting Concern Handling (1x)
**Pass.** State protection is a well-layered defense-in-depth:
1. Prevention: hooks block Write/Edit on state files
2. Detection: embedded HMAC catches what hooks miss (Bash redirects, manual edits, disk errors)
3. Recovery: `gp verify --fix` recomputes and re-embeds

The `.goodplan-dev` sentinel cleanly separates dev repos. Version sourced from `package.json` everywhere. The HMAC key management (CI secret for production, well-known dev key for local builds) is practical and documented.

### 8. Module Depth (2x)
**Pass.** The embedded signature system is deep and well-designed: callers interact with `signStateTree/verifyStateTree` while the module hides serialization ordering, HMAC computation, `stateSignature` field exclusion, bootstrap detection, and cache invalidation. The elimination of a separate `.signatures.json` file in favor of an embedded field in `goodplan.json` is a depth improvement — it reduces the number of files to manage and eliminates the atomicity gap from round 2 (signature update is now part of the state write, not a separate step).

`computeNextCommands()` is appropriately deep — hides registry lookup, `userFacing` filtering, template interpolation, entity-scoped reads, and "other" mutation collection behind a single function call. Callers provide `(entityType, entityName, newStatus, parentEpic?)` and get back a fully computed `NextCommands` object.

### 9. Information Hiding (2x)
**Pass.** The HMAC key is a compile-time constant — callers of the signature module never see it. The `commandMetadata` registry structure is hidden behind `computeNextCommands()` — callers see only the `NextCommands` response shape. Hook pattern-matching logic is hidden from both Claude Code and the CLI. The algorithm prefix (`hmac-sha256:`) in the signature enables future migration without API changes.

### 10. Subsystem Boundaries and Contracts (2x)
**Pass.** Contracts are explicit, complete, and well-separated:
- Hooks: read-only, no CLI calls, no file modifications, `python3` for JSON parsing
- Signatures: every write embeds, every read verifies, bootstrap exception for missing `stateSignature`, covers JSON/JSONL only (markdown excluded)
- `nextCommands`: computed not cached, approximation documented, included in mutation responses only, `userFacing` flag suppresses internal transitions
- Build pipeline: version from `package.json`, binary version must match manifest version, post-build assertion enforces this
- `commandMetadata` bidirectional coverage: required fitness function before merge

### 11. Caller Friction (2x)
**Pass.** `nextCommands` is automatically included in every mutation response — zero caller friction for skills. `gp verify --fix` provides one-command recovery. Binary at a fixed path eliminates PATH concerns. Plugin installation is a single marketplace command. The embedded `stateSignature` is transparent to callers — the Data Layer handles it during read/write without caller involvement. Bootstrap is automatic (no manual "first run" step).

---

## Issues

### IMPORTANT

#### 1. `serializeStateTree()` ordering must be deterministic and documented

The HMAC is computed over a serialized state tree. The architecture defines `serializeStateTree()` but does not specify the serialization order of files within the tree. If the order varies between runs (e.g., due to filesystem enumeration order or `Object.keys()` ordering on directory contents), the same logical state produces different HMACs, causing false mismatch errors. The existing Data Layer uses deterministic key ordering for JSON (INV-002), but `serializeStateTree()` concatenates multiple files — the file ordering also needs to be deterministic.

**Recommendation:** Document that `serializeStateTree()` sorts file paths lexicographically before concatenating, consistent with INV-002's determinism principle. Since `assembleState()` already produces a tree with deterministic structure, this may be implicitly guaranteed — but it should be explicit in the contract.

### MINOR

#### 2. `parentEpic` resolution for slice `nextCommands` is under-specified

`computeNextCommands()` accepts `parentEpic?: string` for interpolating `{epic}` in slice command templates. The doc says it's "sourced from the RPC mutation result (which includes the parent epic context) or from the `--epic` flag passed to the CLI command." But the RPC result types (`BeginResult`, `SubmitResult`, `CompleteResult`) do not include a `parentEpic` field. The Commands layer would need to either extract this from the RPC result (which doesn't expose it) or carry it through from the original `--epic` flag.

**Recommendation:** Either add `parentEpic?: string` to `BeginResult`/`SubmitResult` for slice operations, or document that the Commands layer passes the `--epic` flag value directly to `computeNextCommands()`. The latter is simpler and avoids modifying RPC result types.

#### 3. Markdown exclusion from HMAC creates an unmonitored modification surface

The architecture deliberately excludes markdown files from the HMAC signature, allowing LLMs to write architecture docs, research, and brainstorm freely. This is the correct design for the stated goal (markdown is LLM-owned content). However, it means that plan files (`plan.md`, `plan-refined.md`) — which the state machine uses as guard conditions (`hasChild` checks for `COMPLETE_PLAN` and `BEGIN_IMPLEMENTATION`) — are outside the signature's protection. A malicious or confused LLM could create `plan.md` to bypass the guard without going through the plan submission workflow.

**Recommendation:** No action needed for v1 — the hooks already block Write/Edit on `.goodplan/**/*.json` and `.goodplan/**/*.jsonl`, and the guard checks are for content existence rather than content integrity. The plan submission workflow (`submit-plan`) triggers the state transition, and the guard only checks that the file exists. Document this as a known limitation: plan file existence is a soft gate, not a cryptographic guarantee.

#### 4. Build pipeline `--define` for HMAC key should document quoting behavior

The build script uses `--define __GP_HMAC_KEY__=\"${GP_HMAC_KEY:-<dev-key>}\"`. Bun's `--define` replaces identifiers with literal code — if the key contains characters that are syntactically meaningful in JavaScript (e.g., backticks, dollar signs), the replacement will produce invalid code. The architecture does not specify the key format constraints.

**Recommendation:** Document that the HMAC key must be a hex string (or base64 without special characters) to avoid escaping issues in `--define` substitution. Add a CI step that validates the key format before building.

---

## What Improved Since Round 2

1. **Embedded `stateSignature` in `goodplan.json`** — eliminates the separate `.signatures.json` file, the atomicity gap (signature update is part of the atomic state write), and the `.signatures.json` tampering vector (no separate file to tamper with)
2. **Single HMAC over the full state tree** — simpler than per-file signatures, eliminates the per-file update ordering question
3. **`commandMetadata` fitness function elevated to required** — bidirectional coverage enforced before merge
4. **Template placeholder format specified** — angle-bracket placeholders (`<reason>`) clearly distinguished from interpolation variables (`{name}`)
5. **Marketplace manifest ambiguity resolved** — repo-root vs built-plugin context clarified
6. **`jq` replaced with `python3`** — single dependency, guaranteed on macOS, no fallback chain

## Verdict

The architecture is ready for implementation. The embedded `stateSignature` design is the most significant improvement from round 2 — it transforms the HMAC system from a multi-file coordination problem into a single-field atomic operation, which is both simpler and more robust. The `commandMetadata` registry at the RPC layer correctly separates CLI knowledge from state machine purity. The three-layer state protection (hooks, HMAC, `gp verify`) provides defense in depth without over-engineering. The one important issue (serialization ordering) is straightforward to address during implementation.

| Severity | Count |
|---|---|
| Critical | 0 |
| Important | 1 |
| Minor | 3 |
