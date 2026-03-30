# API Contract Review - Round 3

## Score: 8/10

## Summary

Round 3 addresses the major issues from prior rounds cleanly: embedded `stateSignature` eliminates atomicity gaps, `commandMetadata` registry with `userFacing` flag is well-structured, and `gp verify` is simplified to a single pass/fail. The contracts are internally consistent and align with the existing 4-layer architecture. Remaining issues are around edge cases in the HMAC contract and gaps in the `nextCommands` interface specification.

## Critical Issues (1)

### C1: HMAC verification on every read creates a performance cliff

**Location:** cli-changes-api.md "Every Data Layer read" + conventions.md "Read flow"

Every Data Layer read assembles the full state tree (all JSON/JSONL files), serializes it, and computes an HMAC. For projects with many epics, slices, quests, and a large activity log, this means every single `gp status`, `gp epic:show`, or `gp task:list` performs a full filesystem scan, serialization, and crypto operation. The existing `loadState()` presumably already reads these files, but the serialization-for-HMAC step is additive work that scales with project size.

**Impact:** This is a performance contract that affects every CLI invocation. The architecture does not specify whether `verifyStateTree()` operates on the already-loaded state tree (avoiding redundant I/O) or performs independent I/O. If the former, clarify it. If the latter, this doubles read I/O.

**Recommendation:** Explicitly state that `verifyStateTree()` operates on the in-memory state tree returned by `loadState()` (serialize the already-loaded data, compute HMAC, compare). If that's the intent, the performance cost is serialization + HMAC only (acceptable). If independent I/O is intended, this needs a caching strategy or the performance contract must be documented.

## Important Issues (3)

### I1: `computeNextCommands()` return type does not appear in RPC result types

**Location:** cli-changes-api.md "RPC Layer: computeNextCommands()"

`computeNextCommands()` is defined as an RPC-layer function, but the existing RPC result types (`BeginResult`, `SubmitResult`, `CompleteResult`) do not include a `nextCommands` field. The overview says "Commands layer computes and appends nextCommands after receiving the RPC result," but `computeNextCommands()` is documented as an RPC-layer function. This creates ambiguity: does the RPC layer return `nextCommands` in its result types, or does the Commands layer call `computeNextCommands()` directly?

**Recommendation:** Either (a) add `nextCommands?: NextCommands` to `BeginResult`, `SubmitResult`, and `CompleteResult` in the RPC API doc, or (b) explicitly state that `computeNextCommands()` is exported from the RPC layer but called by the Commands layer post-mutation, and document why it is not part of the RPC result types.

### I2: `serializeStateTree()` ordering contract is unspecified

**Location:** cli-changes-api.md "Data Layer Changes"

The HMAC is computed over `serializeStateTree()` output. For the signature to be deterministic, serialization must produce identical output for identical state regardless of filesystem read order, object key ordering, or platform differences. The contract does not specify: (a) sort order of files in the tree, (b) JSON key ordering within each file, (c) JSONL entry ordering, (d) handling of trailing newlines or whitespace normalization.

**Recommendation:** Specify that `serializeStateTree()` sorts file paths lexicographically, uses deterministic JSON key ordering (matching `JSON.stringify` with sorted keys), preserves JSONL entry order as-is, and normalizes line endings to `\n`. Without this, the same state can produce different HMACs on different machines or after `git checkout`.

### I3: `gp verify --fix` should document its interaction with the bootstrap exception

**Location:** cli-changes-api.md "gp verify Command" + "Integration Points"

The bootstrap exception says: if `stateSignature` is missing, compute and embed it. `gp verify --fix` says: recompute and re-embed. These are operationally identical when `stateSignature` is missing. But the bootstrap runs on every CLI invocation (read or write), while `--fix` is user-initiated. If a user runs `gp verify` (without `--fix`) on a pre-HMAC repo, what happens? The read path would trigger bootstrap (adding the signature), which is a write during a read-only command. This violates the documented contract that `gp verify` without `--fix` is read-only.

**Recommendation:** Clarify: either (a) `gp verify` without `--fix` on a pre-HMAC repo returns `fail` with a message to run `--fix` (bootstrap exception does NOT apply to `gp verify` without `--fix`), or (b) bootstrap is the one exception to the read-only contract and is documented as such.

## Minor Issues (4)

### M1: `parentEpic` resolution for `computeNextCommands()` is underspecified for non-slice entities

**Location:** cli-changes-api.md "parentEpic resolution"

The doc explains `parentEpic` resolution for slice commands but does not clarify what happens for epic, quest, or task commands. Presumably `parentEpic` is `undefined` for those, but this should be explicit to prevent implementers from trying to resolve it.

### M2: "Other mutations" in `nextCommands` is described as "curated list" without specifying the list

**Location:** cli-changes-api.md step 3 of the algorithm

The algorithm says "collect creation commands from all other entity types (curated list of high-value creation commands, not exhaustive)." The example output shows `quest:create` and `task:create`. The full list is not specified. This is fine for an approximation, but should either be enumerated or explicitly marked as implementation-defined.

### M3: Template interpolation for commands with multiple entity references is not covered

**Location:** cli-changes-api.md "Template variables"

Template variables are `{name}` and `{epic}`. Commands like `task:convert --task {name} --to quest` have additional flags (`--to`) that are neither template variables nor angle-bracket user-input placeholders. The contract does not specify how these are handled -- are they hardcoded in the template string? This is implied but not stated.

### M4: Exit code for `gp verify --fix` success is not documented

**Location:** cli-changes-api.md "Exit codes"

Exit codes document 0 (valid) and 1 (mismatch) for `gp verify`. When `--fix` is used and succeeds, should it return 0? The contract implies yes but does not state it explicitly.

## Consistency Check

| Contract Element | Consistent with Existing Architecture? |
|---|---|
| `computeNextCommands()` at RPC layer | Yes -- maintains state machine purity (INV-001) |
| `commandMetadata` derived from Commands API | Yes -- inverts existing command-to-event mapping |
| `userFacing: false` suppression | Yes -- aligns with internal transitions concept |
| HMAC on JSON/JSONL only | Yes -- markdown is LLM-owned per existing conventions |
| `stateSignature` in `goodplan.json` | Yes -- `goodplan.json` is the project root config |
| `gp verify` as global command | Yes -- follows `init`, `migrate`, `status` pattern |
| INV-008 single transition per command | Yes -- consistent with existing command-to-event mapping |
| INV-009 data layer scope | Yes -- data layer owns file I/O |
| Binary rename `gp` | Neutral -- no architectural conflict |
| `.goodplan/` rename | Requires updates to existing architecture docs referencing `.project/` |

## Alignment with Existing Contracts

The `nextCommands` feature threads through the architecture cleanly: the RPC layer owns computation (consistent with its orchestration role), the Commands layer owns presentation (consistent with its thin-bridge role), and the state machine remains pure (consistent with INV-001). The HMAC system is correctly scoped to the Data Layer.

One tension: the existing Commands API doc uses `goodplan` throughout as the binary name. The rename to `gp` will require updating the Commands API doc, RPC Layer API doc, and all architecture files that reference the binary. This is acknowledged in "Affected Files" but the scope of architecture doc updates is broader than listed (the existing `commands-api.md` and `rpc-layer-api.md` both reference `goodplan` extensively).
