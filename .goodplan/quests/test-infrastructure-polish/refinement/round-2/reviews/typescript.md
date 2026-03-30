# TypeScript and JavaScript Review: Test Infrastructure Polish (Round 2)

## Issues

**[MINOR]** Phase 1 regex scoping must be robust against future type additions in `state-events.ts`

The plan specifies scoping the regex between `type XxxErrorCode =` and its terminating semicolon. This is correct and necessary -- `state-events.ts` contains many other `[A-Z]+_[A-Z_]+` string literals in the `StateEvent` union (e.g., `INIT_PROJECT`, `CREATE_EPIC`, `BEGIN_EXPLORE`). However, the plan does not mention that the implementer should verify the scoping works correctly by checking that only 10 codes are extracted from `state-events.ts` (not the 30+ event type strings). The bidirectional set-equality check would catch this if scoping fails, so this is defense-in-depth rather than a gap. No plan change needed, but worth noting.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `noUncheckedIndexedAccess` applies to regex match group access

When using `matchAll` with the pattern `/"([A-Z]+_[A-Z_]+)"/g`, each match's capture group `[1]` is typed as `string | undefined` under `noUncheckedIndexedAccess: true`. The implementer will need to filter or assert these values. This is standard TypeScript handling and does not require a plan change, but noting it since the plan describes the regex pattern without mentioning the type narrowing step.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All critical and important issues from round 1 are fixed. The plan now correctly:
- Names both source files (`src/util/errors.ts` and `src/schemas/state-events.ts`)
- Handles both `| "..."` and `= "..."` union member syntax
- Specifies `import { readFileSync } from "node:fs"`
- Notes the `snapshotFiles` transitive dependency on `collectFiles`
- Uses bidirectional set equality (not just count) for robustness
- Specifies the correct import path (`./helpers.js`)

The remaining minors are implementation-detail awareness items, not plan gaps. To reach 10: no changes needed, the plan is ready for implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
