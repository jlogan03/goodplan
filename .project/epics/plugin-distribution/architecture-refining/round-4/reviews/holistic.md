# Holistic Review — Plugin Distribution Epic (Round 4)

**Reviewer:** Holistic
**Score:** 9/10
**Issues:** Critical: 0, Important: 1, Minor: 3

---

## Evaluation Criteria

1. **Completeness** — Does the architecture cover all stated goals?
2. **Goal alignment** — Does it deliver what the confirmed goal specifies?
3. **Internal consistency** — Do the documents agree with each other?
4. **Gap detection** — Are there missing pieces that would block implementation?
5. **Invariant compliance** — Does it respect existing system invariants (INV-001 through INV-007)?

---

## CRITICAL Issues

None.

---

## IMPORTANT Issues

### I1: Data Layer schema update for `stateSignature` not tracked as a change

The overview lists Data Layer as "Modified" with "Embedded state signature (HMAC `stateSignature` in `goodplan.json`)." INV-005 requires schema validation on every read and write. The Zod schema for `goodplan.json` (currently `project.json`) must gain a `stateSignature` field — but no architecture document specifies the schema change. The conventions doc describes the write/read flows and the bootstrap exception, but neither the overview nor the cli-changes-api doc identifies the Zod schema update as an affected artifact.

Round 3's invariant compliance table noted this ("Zod schema for `project.json` must be updated to include this field") but the architecture files were not updated to track it.

**Impact:** An implementer could add the HMAC system without updating the Zod schema, causing every read of `goodplan.json` with a `stateSignature` field to fail schema validation (Zod strict mode rejects unknown keys). Alternatively, the bootstrap path where `stateSignature` is absent needs the field to be optional in the schema.

**Resolution:** Add to cli-changes-api.md's "Affected Files" or "Data Layer Changes" section: the `goodplan.json` Zod schema must add `stateSignature` as an optional string field (optional because of the bootstrap exception where the field is initially absent). This is a one-line addition.

---

## MINOR Issues

### M1: `serializeStateTree()` and `assembleState()` relationship could be clearer

The conventions doc says the signature "covers JSON/JSONL files only" and that this "matches `assembleState()` without `--inline`." The cli-changes-api doc defines `serializeStateTree()` as a new function. The relationship between these two is implicit — does `serializeStateTree()` call `assembleState()` internally, or is it an independent implementation? If independent, there is a risk of the two diverging (a new state file added to `assembleState()` but missed in `serializeStateTree()`).

**Resolution:** Add a one-line note to cli-changes-api.md stating whether `serializeStateTree()` delegates to `assembleState()` or is independent, and if independent, note that the bidirectional coverage must be maintained manually (or add a fitness function candidate).

### M2: "Other mutations" list partially enumerated

The cli-changes-api.md step 3 says the curated list includes `gp epic:create`, `gp quest:create`, `gp task:create` and notes "This is implementation-defined and may be extended." This addresses the round 3 M7 feedback. However, `gp slice:create` is absent from the curated list. Slice creation requires an active epic, so it may be intentionally excluded (it is context-dependent), but this is not stated. An implementer might include or exclude it inconsistently.

**Resolution:** Either add `gp slice:create` to the list or add a parenthetical noting it is excluded because it requires an active epic context.

### M3: Completed entity `nextCommands` — explicit but could note the boundary

The cli-changes-api.md now explicitly states: "For completed entities, `computeNextCommands()` does NOT include sibling suggestions." This resolves the round 3 M3 issue. However, it would be marginally clearer to note where sibling-aware suggestions live (skill/LLM layer), so implementers don't try to add them to `computeNextCommands()` later. A single parenthetical would suffice.

**Resolution:** Add "(sibling-aware suggestions belong in the skill/LLM layer)" after the existing sentence. Optional — the current text is adequate.

---

## Round 3 Issue Resolution Check

| Issue | Status | Notes |
|---|---|---|
| C1: `.goodplan/` vs `.project/` | **Resolved (already-decided)** | Confirmed as intentional design decision. All docs consistently use `.goodplan/`. |
| I1: `serializeStateTree()` ordering | **Resolved** | Conventions doc specifies lexicographic file paths, deterministic JSON keys, preserved JSONL order, `\n` normalization. |
| I2: HMAC read-path performance | **Resolved** | Cli-changes-api.md specifies `stateSignature` comparison as cache validity check; cache hit skips full HMAC verification. |
| I3: `computeNextCommands()` layer ownership | **Resolved** | Cli-changes-api.md explicitly documents RPC-layer function called by Commands layer, not part of RPC result types. |
| I4: `build:plugin` shell script | **Resolved** | Conventions doc and plugin-api.md both specify `scripts/build-plugin.sh` pattern. |
| I5: HMAC key rotation procedure | **Resolved** | Invariants.md documents full rotation procedure with version-field detection. |
| M1: `gp verify --fix` bootstrap exception | **Resolved** | Cli-changes-api.md explicitly states bootstrap exception does NOT apply to `gp verify`. |
| M2: `parentEpic` resolution | **Resolved** | Cli-changes-api.md documents `parentEpic` is `undefined` for non-slice entities. |
| M3: Completed entity sibling suggestions | **Resolved** | Explicitly documented as not included; skill/LLM layer responsibility. |
| M4: Double `python3` invocation | **Resolved** | Both hook scripts now use single `python3` invocation. |
| M5: `.goodplan-dev` sentinel | **Resolved** | Conventions doc defines location, content, creation, gitignore status. |
| M6: Release branch integrity | **Resolved** | Plugin-api.md adds `concurrency` key and tag-before-force-push. |
| M7: "Other mutations" curated list | **Resolved** | List enumerated with "implementation-defined" note. |
| M8: `gp verify --fix` exit code | **Resolved** | Exit code 0 explicitly documented. |

All 14 round 3 issues are resolved.

---

## Goal Alignment Assessment

| Goal Component | Coverage | Notes |
|---|---|---|
| Atomic plugin distribution | Complete | Plugin manifest, marketplace manifest, CI/CD pipeline with smoke tests, rollback via tags |
| State protection (hooks) | Complete | `protect-state.sh` (block) and `warn-bash-state.sh` (warn) with dev repo exemption |
| State protection (HMAC) | Complete | Embedded signature, verify command, bootstrap exception, cache integration, key rotation |
| Self-documenting CLI (nextCommands) | Complete | Registry, algorithm, response shape, layer ownership, fitness functions (one required) |
| Clean rename (goodplan to gp) | Complete | Binary, build defines, skills, CLAUDE.md, architecture docs all addressed |
| Simple build pipeline | Complete | Shell script, CI/CD with pinned runner, local testing via `--plugin-dir` |

All goal components are fully covered with no gaps.

---

## Internal Consistency Check

All five architecture documents were checked for cross-references:

- **_overview.md** and **cli-changes-api.md** agree on: `commandMetadata` registry location (RPC layer), `nextCommands` computation flow, HMAC mechanism, binary rename scope.
- **conventions.md** and **invariants.md** agree on: HMAC serialization determinism, key management, bootstrap exception semantics, markdown exclusion.
- **plugin-api.md** and **conventions.md** agree on: hook behavior (read-only interceptors), binary path convention, dev sentinel file, build pipeline delegation to shell script.
- **invariants.md** INV-008 and INV-009 are consistent with all other documents.

No contradictions found between documents.

---

## Invariant Compliance

| Invariant | Compliance | Notes |
|---|---|---|
| INV-001: Mutations through state machine | Compliant | `nextCommands` computed post-mutation, HMAC embedded during `commitState()` |
| INV-002: Deterministic key ordering | Compliant | `serializeStateTree()` explicitly uses same ordering; `stateSignature` is part of `goodplan.json` written through existing path |
| INV-003: State machine purity | Compliant | `commandMetadata` registry at RPC layer, state machine unchanged |
| INV-004: Stateless commands | Compliant | `gp verify` requires no implicit state |
| INV-005: Schema validation on read/write | Needs attention | `stateSignature` field must be added to Zod schema (see I1) |
| INV-006: Schema output reflects signatures | Compliant | `gp verify` must appear in schema output (implementation concern) |
| INV-007: Structured errors with exit codes | Compliant | `gp verify` uses exit 1 for mismatch (user decision), exit 0 for pass/fix-success |
| INV-008 (new): Single transition per command | Self-consistent | Well-justified, decision doc exists |
| INV-009 (new): Embedded signature | Self-consistent | Comprehensive with rotation procedure |

---

## Summary

The architecture has matured significantly across four rounds. All 14 round 3 issues are resolved. The documents are internally consistent, well-structured, and cover all five goal components without gaps. The one important issue (Zod schema update for `stateSignature`) is a documentation tracking gap, not a design flaw — the schema change is implied but should be explicit so implementers don't miss it. The minor issues are documentation clarity improvements, not design concerns. The architecture is ready for implementation.
