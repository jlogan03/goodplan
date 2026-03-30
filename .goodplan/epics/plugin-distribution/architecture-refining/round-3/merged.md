# Merged Feedback — Round 3

## Synthesis Summary

**Reviewers:** Software Architecture (9/10), Holistic (8/10), DevOps-Infra (6/10), API Contract (8/10)

**Dismissed (already-decided):**
- `.goodplan/` vs `.project/` rename (Holistic C1, API-Contract consistency note) — intentional design decision scoped to this epic
- `gp verify` exit code of 1 (Holistic I1) — explicit USER_INPUT decision from round 2

**Raw counts:** Critical: 4, Important: 11, Minor: 15
**After dedup/dismiss:** Critical: 1, Important: 5, Minor: 8

---

## CRITICAL

### C1: No pre-publish smoke test on the assembled plugin artifact
**Source:** DevOps-Infra C1
**Severity justification:** A broken hook script or missing file would ship to users with no gate. The `--version` assertion only checks the binary runs, not that the plugin directory functions as a plugin.

**Recommendation:** Add a smoke test step between validation and force-push that runs each hook script with synthetic stdin JSON to verify exit codes, and confirms skill files are loadable. This is the last gate before users receive the artifact.

---

## IMPORTANT

### I1: `serializeStateTree()` ordering must be deterministic and documented
**Sources:** Software Architecture #1, API Contract I2 (deduplicated — API Contract version is more specific)
**Severity:** Important (trusted to Software Architecture per conflict rules)

The HMAC is computed over `serializeStateTree()` output. The contract does not specify: (a) sort order of files in the tree, (b) JSON key ordering within each file, (c) JSONL entry ordering, (d) handling of trailing newlines or whitespace normalization. Without this, the same state can produce different HMACs on different machines or after `git checkout`.

**Recommendation:** Specify that `serializeStateTree()` sorts file paths lexicographically, uses deterministic JSON key ordering (matching existing INV-002), preserves JSONL entry order as-is, and normalizes line endings to `\n`.

### I2: HMAC verification on every read — performance contract unclear
**Sources:** Holistic I2, API Contract C1 (deduplicated — same issue, API Contract rated it Critical but Holistic rated Important)
**Severity:** Important (not Critical — this is a performance optimization question, not a correctness bug; the architecture just needs to specify the intent)

Every Data Layer read assembles the full state tree and computes HMAC. The architecture does not specify whether `verifyStateTree()` operates on the already-loaded in-memory state tree (avoiding redundant I/O) or performs independent I/O. If the former, the cost is serialization + HMAC only (acceptable). If the latter, this doubles read I/O.

**Recommendation:** Explicitly state that `verifyStateTree()` operates on the in-memory state tree returned by `loadState()`. If that's the intent, document it. If independent I/O is intended, add a caching strategy or document the performance contract.

### I3: `computeNextCommands()` layer ownership ambiguity
**Source:** API Contract I1
**Severity:** Important

`computeNextCommands()` is defined as an RPC-layer function, but RPC result types (`BeginResult`, `SubmitResult`, `CompleteResult`) don't include a `nextCommands` field. The overview says the Commands layer computes and appends, creating ambiguity about who calls what.

**Recommendation:** Explicitly state that `computeNextCommands()` is exported from the RPC layer but called by the Commands layer post-mutation, and document why it is not part of the RPC result types. (Software Architecture #2 notes the same gap for `parentEpic` — the Commands layer should pass the `--epic` flag value directly rather than modifying RPC result types.)

### I4: `build:plugin` script complexity belongs in a shell script
**Source:** DevOps-Infra #3
**Severity:** Important

The build pipeline has 7 steps with multiple `--define` flags, secret handling, and validation. Encoding this as a `package.json` one-liner is unmaintainable. The repo already has `scripts/install-skills.sh` as a pattern.

**Recommendation:** `"build:plugin": "bash scripts/build-plugin.sh"` with multi-step logic in a proper shell script. Enables `set -e`, comments, and easier debugging.

### I5: No `GP_HMAC_KEY` rotation or compromise procedure
**Source:** DevOps-Infra C2
**Severity:** Important (downgraded from DevOps Critical — the key is a tamper-detection key, not an access-control secret; extraction from the binary is trivially acknowledged; rotation is an operational concern, not a design flaw)

No documented procedure for rotating the key, migrating existing repos, or detecting stale keys.

**Recommendation:** Document a key rotation procedure: (1) generate new key, (2) update CI secret, (3) publish new binary, (4) users run `gp verify --fix` to re-sign. Acknowledge operational implications of binary-embedded keys.

---

## MINOR

### M1: `gp verify --fix` interaction with bootstrap exception
**Source:** API Contract I3
**Severity:** Minor (downgraded — edge case for pre-HMAC repos during transition period only)

If a user runs `gp verify` (without `--fix`) on a pre-HMAC repo, the read path would trigger bootstrap (adding the signature), which is a write during a read-only command.

**Recommendation:** `gp verify` without `--fix` on a pre-HMAC repo should return fail with a message to run `--fix`. Bootstrap exception does NOT apply to `gp verify`.

### M2: `parentEpic` resolution underspecified
**Sources:** Software Architecture #2, API Contract M1 (deduplicated)

`parentEpic` resolution is explained for slice commands but not for epic, quest, or task commands (presumably `undefined`). Also, the RPC result types don't expose `parentEpic`.

**Recommendation:** Document that `parentEpic` is `undefined` for non-slice entities. The Commands layer passes the `--epic` flag value directly to `computeNextCommands()`.

### M3: `nextCommands` for completed entities — sibling suggestions unclear
**Sources:** Holistic M2

After completing a slice, the most useful suggestion is "start the next slice," which requires sibling entity knowledge. The algorithm doesn't cover this.

**Recommendation:** Document whether `computeNextCommands` for completed entities includes sibling suggestions or leaves that to the skill/LLM layer.

### M4: `python3` JSON parsing invoked twice per hook
**Source:** DevOps-Infra #8

Both hook scripts spawn two `python3` processes for the same stdin JSON.

**Recommendation:** Parse once, extract both values in a single `python3` invocation.

### M5: `.goodplan-dev` sentinel file undocumented
**Sources:** Holistic M4, DevOps-Infra #10 (deduplicated)

The sentinel file is not documented in the data model. Location, content, creation method, and gitignore status are unspecified.

**Recommendation:** Add a one-line definition: location (project root), content (empty file), creation (manual by developer), gitignored. Consider environment variable (`GP_DEV=1`) as alternative.

### M6: No integrity check on `release` branch after force-push
**Source:** DevOps-Infra #4

No verification that the force-push succeeded or that the resulting tree matches what was built.

**Recommendation:** Add a post-push verification step. Use GitHub Actions `concurrency` key to prevent parallel release jobs from racing.

### M7: "Other mutations" curated list not enumerated
**Source:** API Contract M2

Step 3 of the `nextCommands` algorithm says "curated list" but doesn't specify the full list.

**Recommendation:** Either enumerate the list or mark as implementation-defined.

### M8: `gp verify --fix` success exit code not documented
**Source:** API Contract M4

When `--fix` succeeds, the exit code is implied to be 0 but not stated.

**Recommendation:** Explicitly document exit code 0 for `--fix` success.

---

## Dismissed Issues (Already Decided)

| Issue | Source | Reason |
|---|---|---|
| `.goodplan/` vs `.project/` rename | Holistic C1, API-Contract consistency | Intentional design decision for this epic |
| `gp verify` exit code 1 vs INV-007 | Holistic I1 | USER_INPUT decision from round 2 (U3) |

## Issues Resolved by Deduplication

| Merged Into | Absorbed From |
|---|---|
| I1 (serialization ordering) | Software Architecture #1 + API Contract I2 |
| I2 (HMAC read performance) | Holistic I2 + API Contract C1 |
| I3 (nextCommands layer) | API Contract I1 + Software Architecture #2 (parentEpic aspect folded into M2) |
| M2 (parentEpic) | Software Architecture #2 + API Contract M1 |
| M5 (sentinel file) | Holistic M4 + DevOps-Infra #10 |

## Items NOT Carried Forward (low-value or covered elsewhere)

| Issue | Source | Reason |
|---|---|---|
| Markdown exclusion from HMAC | Software Architecture #3 | Acknowledged as known limitation, no action needed for v1 |
| HMAC key quoting in `--define` | Software Architecture #4 | Covered by I4 (shell script handles this naturally) |
| `nextCommands` command surface drift | Holistic M1 | Covered by the required bidirectional fitness function |
| `CLAUDE_PLUGIN_ROOT` interpolation | Holistic M3 | Standard Claude Code plugin convention, no action needed |
| Plugin manifest schema versioning | DevOps-Infra #9 | Managed by Claude Code's plugin system |
| Template interpolation for multi-flag commands | API Contract M3 | Implementation detail, hardcoded flags in template strings |
| Dev HMAC key in source control | DevOps-Infra #5 | Covered by I4 (shell script with clear comments) |
| CI workflow file not specified | DevOps-Infra #6 | Implementation detail, not architecture-level |
| Rollback procedure is manual | DevOps-Infra #7 | Acknowledged as acceptable for v1, tag-ref pinning noted as future enhancement |
| `gp` binary rename affecting existing docs | API-Contract consistency note | Implementation-scoped; "Affected Files" section already tracks this |
