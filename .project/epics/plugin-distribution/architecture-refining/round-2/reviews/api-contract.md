# API Contract Review — Round 2

**Reviewer:** API Contract Reviewer
**Scope:** nextCommands interface, hook contracts, HMAC signature contracts, gp verify interface
**Score: 8/10**

## Summary

Round 2 significantly tightened the API contracts. The `commandMetadata` registry placement at the RPC layer is correct — it preserves state machine purity while enabling self-documenting CLI output. The HMAC system is well-specified with clear bootstrap semantics, hard-error-on-mismatch policy, and a practical `gp verify --fix` escape hatch. Several contract-level gaps remain around edge cases, atomicity, and interface consistency.

## Critical Issues (1)

### C1: `updateSignature()` and `commitState()` atomicity gap

**Location:** cli-changes-api.md lines 127-129, data-layer-api.md commitState contract

The doc states "Every Data Layer write to a `.json` or `.jsonl` file calls `updateSignature()` after the write succeeds" and that `.signatures.json` comparison is the cache invalidation mechanism. However, `commitState()` already has its own atomic write protocol (temp + rename, entity JSON first, JSONL appends second, cache last). The signature update creates a new failure window: if the process crashes after writing a state file but before updating `.signatures.json`, the next read will hard-error on HMAC mismatch — and unlike a stale cache, there is no automatic recovery path. The user must manually run `gp verify --fix`.

**Recommendation:** Specify that `.signatures.json` is updated atomically as part of the `commitState()` write sequence, and define its position in the write ordering (after all state files, before or in place of the state cache). Alternatively, specify that on HMAC mismatch, the error message explicitly tells the user to run `gp verify --fix`, so recovery is discoverable.

## Important Issues (3)

### I1: `computeNextCommands` return type inconsistency with `BeginResult`/`SubmitResult`

**Location:** cli-changes-api.md lines 48-64, rpc-layer-api.md lines 228-245

`computeNextCommands()` is documented as a standalone function returning `NextCommands`, but the existing `BeginResult`, `SubmitResult`, and `CompleteResult` types in the RPC Layer API do not include a `nextCommands` field. The cli-changes-api.md says "Mutation command handlers include `nextCommands` in their JSON output" but does not specify whether this is added by the Commands layer (wrapping the RPC result) or by the RPC layer (extending the result types).

**Recommendation:** Either extend `BeginResult`, `SubmitResult`, and `CompleteResult` with an optional `nextCommands` field, or explicitly document that the Commands layer computes and appends `nextCommands` after receiving the RPC result. The current ambiguity will cause implementation confusion about which layer owns the responsibility.

### I2: `gp verify` contract contradiction

**Location:** cli-changes-api.md line 185

The contracts section states: "`gp verify` is read-only -- it reports but does not fix mismatches." This is correct for `gp verify` without flags, but the same section also documents `gp verify --fix` which re-signs all state files. The `--fix` flag is a write operation. The contract statement should be scoped to `gp verify` (without `--fix`) to avoid confusion, or reworded to clarify that `--fix` is the explicit opt-in to mutation.

**Recommendation:** Reword to: "`gp verify` without `--fix` is read-only. `gp verify --fix` is a write operation that re-signs all state files."

### I3: Template interpolation for slice commands lacks `{epic}` resolution path

**Location:** cli-changes-api.md lines 38-41, 58-64

The `computeNextCommands` signature accepts `parentEpic?: string` for interpolating `{epic}` into templates. But the `commandMetadata` registry is keyed by `(entityType, status)` — for slice commands, the caller must provide `parentEpic` externally. The existing RPC layer `BeginResult` and `SubmitResult` return `entity: string` (the entity name) but do not return the parent epic name. If `computeNextCommands` is called by the Commands layer, it would need the epic name from somewhere.

**Recommendation:** Document where `parentEpic` is sourced when `computeNextCommands` is called for slice entities. If it comes from the RPC result, add `parentEpic?: string` to `BeginResult`/`SubmitResult`/`CompleteResult`. If it comes from the command flags, document that explicitly.

## Minor Issues (3)

### M1: `gp verify` exit code overlap with validation errors

`gp verify` uses exit code 1 for mismatches/failures. The existing error convention (commands-api.md) uses exit 1 for internal errors and exit 2 for validation errors. A signature mismatch is neither — it is an integrity violation. Consider whether a distinct exit code (e.g., 4) would help callers distinguish "verify found problems" from "verify itself failed."

### M2: `nextCommands` not specified for `complete()` operations

The cli-changes-api.md example shows `nextCommands` for `epic:explore` (a begin operation). `CompleteResult` in the RPC Layer API already has a rich return type with `epicComplete?`, `learningsRolledUp?`, etc. The doc should clarify whether `nextCommands` is included in complete responses (it logically should be — after completing a slice, you want to know what's next).

### M3: `commandMetadata` registry does not specify handling of `task` and `decision` entity types

The registry is typed as `Record<EntityType, Record<string, CommandMetadataEntry[]>>` but the examples and algorithm description only cover epic, slice, and quest entities. Task and decision commands have different lifecycle patterns (no status progression in the same way). Clarify whether these entity types have registry entries or are handled differently in the "other" section.

## Positive Observations

- The `userFacing` flag on `CommandMetadataEntry` is a clean mechanism for suppressing internal transitions without polluting the state machine.
- "nextCommands is an approximation" is explicitly called out as a contract — this prevents consumers from treating it as authoritative and building guard-like logic on top of it.
- The HMAC bootstrap exception (missing `.signatures.json` triggers initial signing) is well-defined and avoids a chicken-and-egg problem for existing repos.
- The algorithm prefix (`hmac-sha256:`) enabling future migration with unknown prefixes treated as failures is good forward-thinking.
- `.signatures.json` not being self-signed, with explicit acknowledgment of the bootstrap problem, shows the design thought through the recursion.
- Hard error on mismatch (never silently using tampered data) is the correct security posture for this threat model.
