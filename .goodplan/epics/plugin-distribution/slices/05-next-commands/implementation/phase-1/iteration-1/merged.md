# Merged Review — Phase 1: Registry & Core Function

**Iteration**: 1
**Composite Score**: 8/10 (Generalist: 8, Architecture: 9, TypeScript: 7)
**Blocking**: Yes — 1 critical issue must be fixed before proceeding

---

## Critical Issues

### CRIT-1: Type assertion causes unreachable comparison compiler error
**File**: `src/core/rpc/next-commands.ts:583-588`
**Raised by**: TypeScript reviewer

`target.type` is cast to `NextCommandsEntityType` on line 583, which excludes `"project"` and `"rollup"` from the type. The subsequent comparisons on line 586 (`entityType === "project" || entityType === "rollup"`) are then unreachable from the type system's perspective, causing TS2367 with `strict: true`. The runtime guard is correct in intent but the cast defeats the narrowing.

**Fix**: Guard on `target.type` first, then let TypeScript narrow naturally:
```ts
if (target.type === "project" || target.type === "rollup") {
  return { entity: [], other: [] };
}
const entityType: NextCommandsEntityType = target.type;
```
This also resolves the `as` cast that the Architecture reviewer flagged as a code smell (CLAUDE.md anti-pattern). Two reviewers independently raised this — fix is unambiguous.

---

## Important Issues

### IMP-1: Unused `toStatus` variable — dead code / lint error
**File**: `src/core/rpc/next-commands.ts:503`
**Raised by**: Architecture reviewer

`toStatus` is computed but never used. Biome correctly flags this. The keying-by-`fromStatus` approach is correct; `toStatus` is unnecessary. Remove the variable.

### IMP-2: Unknown status behavior deviates from plan spec
**File**: `src/core/rpc/next-commands.ts:590-628`, `tests/unit/rpc/next-commands.test.ts:51-59`
**Raised by**: Generalist reviewer

The plan specifies that unknown statuses should return `{ entity: [], other: [] }`. The implementation instead returns the read command plus cross-entity creation commands. The test was updated to match the implementation rather than the plan. This may be better UX, but it is an undocumented deviation, and consumers expecting an empty result as a "nothing available" signal will break.

**Resolution required**: Either (a) update the plan doc to reflect this intentional change, or (b) add a guard returning empty when `newStatus` is not found in any transition table.

### IMP-3: Module-level side effect — no lazy init or test reset seam
**File**: `src/core/rpc/next-commands.ts:538`
**Raised by**: Both Architecture and TypeScript reviewers (deduplicated)

`buildCommandMappings()` runs at import time. This means any import triggers computation, and tests cannot reset or reconfigure the registry. Currently acceptable (registry is deterministic, all tests pass), but it is a latent test isolation risk.

**Recommendation**: At minimum, add a comment acknowledging the tradeoff. Optionally, wrap in a lazy singleton or export `getCommandMappings()`. Not blocking.

---

## Minor Issues

### MIN-1: `expandWildcard` has dead `*(terminal)` branch
**File**: `src/core/rpc/next-commands.ts:485-488`
**Raised by**: TypeScript reviewer

No current transition table uses the `*(terminal)` wildcard. The comment on line 474 says terminal wildcards are "always paired with `to: '(error)'` and eliminated by the error filter" — which contradicts having an explicit expansion for it. Either remove the branch or add a clarifying comment that it is forward-looking.

### MIN-2: Fitness test description drift check is inverted
**File**: `tests/fitness/command-metadata-coverage.test.ts:201-217`
**Raised by**: TypeScript reviewer

The drift check asserts descriptions must *differ* from `commandRegistry`. This penalizes intentional alignment and produces misleading failures. The intent (detect stale copy-paste) is good but the mechanism is wrong. Revisit the heuristic.

### MIN-3: `as Target` casts in unit tests are unnecessary
**File**: `tests/unit/rpc/next-commands.test.ts:89, 97`
**Raised by**: Both TypeScript and Generalist reviewers (deduplicated)

`{ type: "decision", id: "DEC-001" } as Target` and `{ type: "project" } as Target` — these literals already structurally satisfy the `Target` discriminated union. The `as` casts bypass TypeScript's structural checking unnecessarily. Remove them for stricter type checking. If the casts are needed (e.g., Target union doesn't include these shapes directly), add a comment explaining why.

### MIN-4: Misleading unit test title for `slice:create` exclusion test
**File**: `tests/unit/rpc/next-commands.test.ts:124-133`
**Raised by**: Generalist reviewer

The test "slice:create appears after epic activation" only asserts that `epic:create` is NOT in the other section. It doesn't assert that `slice:create` appears anywhere. The title implies a positive assertion but the test only does a negative one. Rename the test or add a direct positive assertion.

### MIN-5: `decision:create` absent from `CREATION_COMMANDS`
**File**: `src/core/rpc/next-commands.ts:555-563`
**Raised by**: Generalist reviewer

`CREATION_COMMANDS` includes `epic:create`, `quest:create`, `task:create` but not `decision:create`. May be intentional (decisions are less commonly created ad-hoc). Worth a comment confirming the omission is deliberate.

### MIN-6: Plan wording mismatch — `commandMappings` keyed by `fromStatus` not `toStatus`
**File**: Plan doc (task 3), no code change needed
**Raised by**: Generalist reviewer

The plan describes "keyed by `(entityType, toStatus)`" but the implementation correctly keys by `fromStatus`. The code is right; the plan text is misleading. Update plan wording for accuracy.

---

## Completeness

All Phase 1 plan tasks are complete. Build passes (1659 tests, 0 failures). No lint errors reported at time of review. The CRIT-1 compiler error may be caught by `tsc --noEmit` but not by the test runner — verify with a full type check pass after fixing.

---

## Required Actions Before Phase 2

1. **Fix CRIT-1** — guard on `target.type` before cast (also resolves architecture `as`-cast smell)
2. **Fix IMP-1** — remove unused `toStatus` variable
3. **Resolve IMP-2** — document or reverse the unknown-status behavior deviation
4. Run `tsc --noEmit` and `biome check` to confirm clean after fixes
