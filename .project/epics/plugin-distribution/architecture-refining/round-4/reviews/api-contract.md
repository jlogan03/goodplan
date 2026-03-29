# API Contract Review — Plugin Distribution Epic (Round 4)

**Reviewer:** API Contract
**Score:** 9/10
**Issues:** Critical: 0, Important: 1, Minor: 3

---

## Evaluation Criteria

1. **Contract consistency** — Do new APIs align with existing API contracts and conventions?
2. **Ergonomics** — Are the APIs intuitive, minimal, and easy to use correctly?
3. **Stability** — Are the APIs resilient to future changes without breaking consumers?
4. **Completeness** — Do contracts cover all edge cases, error conditions, and response shapes?

---

## CRITICAL Issues

None.

---

## IMPORTANT Issues

### I1: `computeNextCommands()` is called from the Commands layer but lives in the RPC layer — contract boundary ambiguity

cli-changes-api.md says: "The RPC layer computes; the Commands layer formats and surfaces. This function is deliberately NOT part of the RPC result types (BeginResult, SubmitResult, CompleteResult) — the Commands layer calls it separately."

This creates an unusual contract: the Commands layer imports from the RPC layer and calls `computeNextCommands()` directly, but the RPC layer's existing contract (rpc-layer-api.md) defines three entry points (`begin`, `complete`, `submit`) that return typed results. Adding a fourth export that the Commands layer calls separately — and that is explicitly excluded from the result types — breaks the pattern that the RPC layer's public API is its three workflow functions.

Two concrete risks:
1. Every mutation command handler must remember to call `computeNextCommands()` after the RPC call and merge the result. If a new command is added and the developer forgets, it silently omits `nextCommands` with no type error or test failure (the bidirectional fitness function checks the registry, not whether commands actually call `computeNextCommands`).
2. The Commands layer needs to extract `entityType`, `entityName`, `newStatus`, and `parentEpic` from the RPC result to pass to `computeNextCommands()`. This duplicates context assembly that the RPC layer already has.

**Resolution:** Consider one of: (a) have the RPC layer's `begin`/`complete`/`submit` return `nextCommands` as part of their result types (cleanest — every mutation automatically gets it), (b) wrap the pattern in a shared helper at the Commands layer so no individual command handler can forget, or (c) document the rationale explicitly and add a fitness function verifying every mutation command handler calls `computeNextCommands()`. Any of the three works — the current spec just leaves the integration fragile.

---

## MINOR Issues

### M1: `gp verify` is not reflected in the existing Commands API structure

The existing Commands API (commands-api.md) organizes commands into entity namespaces and global commands. `gp verify` is a new global command but is only specified in cli-changes-api.md. The plugin architecture doesn't note that it will need to be added to the Commands API's global commands section alongside `status`, `state`, `init`, `migrate`, and `schema`. Similarly, `gp verify` needs a Zod input schema, an exit code mapping entry, and an entry in the `schema` command's output.

This is documentation/implementation planning, not a design flaw — the existing contracts make the requirements clear. But listing it explicitly prevents implementation gaps.

### M2: `serializeStateTree()` contract does not specify whether it operates on in-memory state or performs I/O

The Data Layer signature functions (`serializeStateTree`, `signStateTree`, `verifyStateTree`) are specified in cli-changes-api.md but their signatures take no parameters. The existing Data Layer pattern (per rpc-layer-api.md) passes `projectDir` to `loadState()` and operates on the returned `ProjectState`. The signature functions need to specify whether they:
- Accept a `ProjectState` parameter (consistent with `startContext` which takes caller-provided state for testability), or
- Perform their own I/O by reading from the filesystem directly

The read flow ("read state -> assemble state tree") and write flow ("mutate state -> serialize state tree") descriptions suggest these operate during the existing `loadState()`/`commitState()` cycle, but the function signatures don't make this explicit.

**Resolution:** Add parameter types to the signature function signatures. If they operate on in-memory state, accept `ProjectState`. If they are integrated into `loadState()`/`commitState()`, document them as internal to those functions rather than as standalone exports.

### M3: `NextCommands` response shape uses `entity` and `other` as top-level keys — potential confusion with existing `entity` field

Mutation responses already have an `entity` field (e.g., `"entity": "plugin-distribution"` in `BeginResult`). The `nextCommands` object also has an `entity` key (list of commands for the current entity). While they are at different nesting levels and unambiguous in JSON, having `result.entity` (string name) and `result.nextCommands.entity` (command array) in the same response object creates a minor naming collision that could confuse consumers parsing the response. Consider `forEntity` / `general`, or `current` / `other`, though this is cosmetic.

---

## Round 3 Issue Resolution Check

Checking whether relevant round 3 issues from other reviewers were addressed:

| Issue | Status | Notes |
|---|---|---|
| Holistic C1: `.goodplan/` vs `.project/` | **Resolved** | User confirmed `.goodplan/` rename is intentional (already-decided) |
| Holistic I1: `gp verify` exit code | **Resolved** | User confirmed exit code 1 is intentional (already-decided) |
| Holistic I2: HMAC read-path performance | **Resolved** | Cache hit path specified — `stateSignature` comparison skips HMAC verification (already-decided) |
| Holistic M2: `nextCommands` for completed entities | **Resolved** | Explicitly documented: no sibling suggestions, left to skill/LLM layer |
| Holistic M4: `.goodplan-dev` sentinel | **Resolved** | Defined in conventions.md with location, content, creation method, gitignore |

---

## Contract Consistency Assessment

| Existing Contract | Alignment | Notes |
|---|---|---|
| Commands API command structure | Aligned | `gp verify` follows established global command pattern |
| Commands API input handling (Zod + stdin) | Aligned | `gp verify` uses flags only, no stdin — consistent with read-only commands |
| Commands API output handling | Aligned | `nextCommands` added to JSON output, not affecting human-readable or `--quiet` modes |
| Commands API exit codes | Aligned | Exit code 1 for verify failure is user-decided |
| RPC layer result types | Minor gap | `nextCommands` deliberately excluded from result types (see I1) |
| Data Layer `loadState`/`commitState` | Aligned | HMAC integrated into existing read/write cycle |
| INV-001 (mutations through state machine) | Aligned | `gp verify --fix` writes only `stateSignature`, not state machine data |
| INV-002 (deterministic key ordering) | Aligned | `serializeStateTree()` uses same ordering (explicitly stated) |
| INV-008 (single transition per command) | Aligned | `gp verify` has no state machine transition |

---

## Stability Assessment

The new APIs are well-designed for evolution:
- `hmac-sha256:` algorithm prefix enables future HMAC migration without schema changes
- `commandMetadata` registry is additive — new commands add entries without modifying existing ones
- `userFacing` flag provides a clean suppression mechanism
- `stateSignature` as a field in `goodplan.json` avoids managing a separate file
- Template variable interpolation (`{name}`, `{epic}`) is extensible

No breaking change vectors identified for v1 consumers.

---

## Summary

The API contracts are well-designed and consistent with the existing system. The `nextCommands` feature respects layer boundaries correctly, and the embedded HMAC signature integrates cleanly into the existing Data Layer read/write cycle. The one important issue is the fragile integration pattern where individual command handlers must manually call `computeNextCommands()` — this should be addressed either by including it in RPC result types or by adding a shared helper. The minor issues are documentation/naming refinements, not design flaws.
