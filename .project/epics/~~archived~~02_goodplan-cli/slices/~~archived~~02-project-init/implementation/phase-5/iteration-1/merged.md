# Merged Review — Phase 5: Refactor Init & Wire Full Stack

**Consensus score: 9/10** (Generalist 9, Architecture 8, TypeScript 9)
**Critical: 0 | Important: 3 | Minor: 3**

---

## Important

### 1. Unsafe `as GoodplanErrorCode` cast on `StateError.code`
**File:** `src/core/rpc/init.ts:38-39`
**Flagged by:** All three reviewers
**Resolution:** DIRECTLY_ACTIONABLE

`StateError.code` is typed `string`, cast to `GoodplanErrorCode` with `as`. Today only valid codes flow through, but the cast is a type-safety hole that grows with each new transition. Fix options:
- **(a)** Narrow `StateError.code` to `GoodplanErrorCode` in `state-events.ts` — simplest, keeps coupling internal.
- **(b)** Runtime-validate at the RPC boundary; fall back to `INTERNAL_ERROR` for unknown codes.

### 2. RPC `rpcInit` calls `assembleState()` directly instead of `loadState()`
**File:** `src/core/rpc/init.ts:27`
**Flagged by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

Architecture docs specify RPC depends on `loadState()` / `commitState()`. `status.ts` has a TODO explaining this is temporary (pending slice 03), but `rpcInit` has no such annotation — making it look intentional. Add a TODO or alias so the deviation is visible and tracked.

### 3. Fallback values in `rpcInit` mask potential bugs
**File:** `src/core/rpc/init.ts:50-51`
**Flagged by:** TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

`project?.name ?? name` and `project?.version ?? "1.0.0"` silently hide cases where `getJson<Project>(result, "project.json")` returns `undefined` after a successful `commitState`. A missing `project.json` at that point is a genuine bug in the transition handler; an assertion/throw would surface it earlier.

---

## Minor

### 4. `json.test.ts` file location mismatch
**File:** `tests/unit/data/json.test.ts`
**Flagged by:** Generalist, TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

After removing `readEntity`/`writeEntity`, this file only tests `deterministicStringify` from `src/util/json.ts`. Move or rename to `tests/unit/util/json.test.ts` to match source layout.

### 5. `status.ts` TODO contradicts architecture on read-only command routing
**File:** `src/commands/global/status.ts:18-19`
**Flagged by:** Software Architecture
**Resolution:** USER_INPUT

The TODO says to route `status` through RPC, but the architecture says read-only commands bypass RPC and go directly to the Data Layer. However, the RPC Command-to-RPC Routing table also lists `status`. Reconcile the architecture with the TODO — either update the arch doc or remove the TODO.

### 6. RPC result types not centralized
**File:** `src/core/rpc/init.ts:14-18`
**Flagged by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

`InitResult` is defined locally. As more RPC functions land, result types will scatter. Consider establishing `src/core/rpc/types.ts` for RPC result types. Not urgent for one function.
