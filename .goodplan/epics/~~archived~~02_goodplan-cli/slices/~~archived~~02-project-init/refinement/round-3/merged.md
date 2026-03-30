# Round 3 — Merged Review Feedback

## Scores
- Holistic: 10/10
- Software Architecture: 9/10
- TypeScript: 9/10
- TUI and CLI: 9/10

---

### CRITICAL Issues

None.

---

### IMPORTANT Issues

**I1. RPC init function should always call `assembleState()` — remove "or construct ZERO_STATE" parenthetical**
Source: Software Architecture

Phase 5 RPC init task says "call `assembleState()` (or construct ZERO_STATE if `.project/` doesn't exist)." This adds ambiguity and a redundant code path. `assembleState` already returns `ZERO_STATE` for missing directories (Phase 3). Per `flows.md` step 3, always call `assembleState()` and let it handle the zero-state case naturally. Fix: remove the parenthetical.

Resolution: DIRECTLY_ACTIONABLE

---

**I2. Document that `getJson<T>` is unsafe for unvalidated trees — `commitState` is the validation boundary**
Source: TypeScript

Phase 1 `getJson<T>(state, path): T | undefined` performs an unchecked cast. This is safe in practice because state-machine output goes through `commitState` validation. But the plan should explicitly state that `getJson<T>` is unsafe for unvalidated trees and that `commitState` is the validation boundary. Without this note, an implementer might assume `getJson<T>` is always type-safe.

Resolution: DIRECTLY_ACTIONABLE

---

**I3. Add explicit "silently skip" language to `assembleState` task text for unregistered `.json` files**
Source: TypeScript

The test list includes "unregistered `.json` files silently skipped (not in tree)" but the corresponding task text doesn't specify this behavior. An implementer reading just the task would not know what to do. Add explicit "silently skip" to the task description (not just the test).

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR Issues

**M1. Phase 4 unit tests should structurally assert activity log entry shape**
Source: Software Architecture

Phase 4 tests operate on raw tree output without `commitState`. If the state machine produces a malformed activity log entry, Phase 4 tests pass but Phase 5 integration fails. Add structural assertions on the activity log entry fields (ts, phase, scope, status, summary) — not via Zod import (that would violate purity), but via plain object shape checks.

Resolution: DIRECTLY_ACTIONABLE

---

**M2. Clarify JSONL new-file vs append-only semantics in Phase 3 `commitState`**
Source: Software Architecture, TypeScript

Two related concerns: (a) The task conflates "new JSONL" (write in full) with "changed JSONL" (append only). Add a note that append-only applies to the changed case; new JSONL files are written in full. (b) With `noUncheckedIndexedAccess`, use array methods (`slice` + `map`) rather than indexed access for append entries to avoid unnecessary undefined checks.

Resolution: DIRECTLY_ACTIONABLE

---

**M3. `buildStatusResult` direct `assembleState` call should note it's temporary**
Source: Software Architecture

Phase 5 has the status command calling `assembleState` directly (bypassing RPC). This is architecturally valid for read-only commands, and the RPC `status()` function doesn't exist yet. But add a note that this is a temporary arrangement to be replaced when RPC `status()` is implemented in a later slice.

Resolution: DIRECTLY_ACTIONABLE

---

**M4. Define `StateEvent` as a plain TypeScript discriminated union, not Zod**
Source: TypeScript

`StateEvent` is internal-only (constructed by RPC, consumed by state machine, never parsed from external input). Zod adds runtime overhead with no validation benefit here. Clarify: define as a plain TS discriminated union, consistent with `StateError`. Reserve Zod for entity schemas that validate filesystem data.

Resolution: DIRECTLY_ACTIONABLE

---

**M5. Export `isStateError` type guard from `src/core/state/types.ts`**
Source: TypeScript

`reduce(state, event): ProjectState | StateError` requires narrowing at the call site. The plan says "check for `StateError`" but doesn't specify how. Export a type guard `isStateError(result): result is StateError` (checking `"code" in result`) for clean narrowing.

Resolution: DIRECTLY_ACTIONABLE

---

**M6. Add `--query` without `--json` error path to binary regression tests**
Source: TUI and CLI

Phase 5 verification tests `goodplan status --query '.project.name'` without `--json` only in dev mode. Binary regression tests don't include this error path. Add it to the binary regression list or explicitly note it as out-of-scope.

Resolution: DIRECTLY_ACTIONABLE

---

**M7. Specify whether init human-mode success message changes after RPC refactor**
Source: TUI and CLI

The plan says to refactor `init.ts` to call RPC instead of direct file writes, but doesn't say whether the human-readable success message should change to reflect the richer init. Add a one-line note: "preserve existing success message format."

Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE (for loop exit)

All 10 issues (3 IMPORTANT + 7 MINOR) are directly actionable. No issues require research or user input.

---

### RESEARCH_NEEDED

None.

---

### Contradictions Resolved

None. The reviewers were consistent. The Software Architecture reviewer noted that unregistered `.json` skip behavior was addressed (in the score summary), while the TypeScript reviewer noted the task text still lacks explicit language — these are compatible observations (the test covers it, the task text doesn't).

---

### Unresolved (USER_INPUT required)

None.
