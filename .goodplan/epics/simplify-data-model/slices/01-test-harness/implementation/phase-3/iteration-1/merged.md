# Merged Review — Phase 3, Iteration 1

**Reviewers:** Generalist (7/10), Software Architecture (5/10), TypeScript (5/10)

## Critical Issues

### C1: `gpForce` missing `stdin` support — root cause of all dropped payloads

**File:** `tools/dogfood/utils.ts` (line ~151)
**Flagged by:** All 3 reviewers

`gpForce()` accepts `opts?: { cwd?: string; gpBin?: string }` — no `stdin` field. This is the root cause of C2 and C3 below. Even if callers passed `stdin`, it would be silently ignored.

**Fix:** Add `stdin?: string` to `gpForce`'s options type and forward it to both the initial `gp()` call and the `--force` retry.

### C2: All `stdin` payloads dropped in `validate.ts`

**File:** `tools/dogfood/validate.ts`
**Flagged by:** All 3 reviewers

Every `gpForce` call that previously passed `stdin` data now passes only `{ cwd: PROJECT_DIR }`. Affected commands:
- `epic:create` — name + goal lost
- `epic:add-verification` — verification payload lost
- `epic:complete` — verificationResults lost
- `slice:complete` — verificationPassed/learnings lost
- `quest:create` — name + goal lost
- `quest:complete` — verificationPassed/learnings lost
- `submit-refine-architecture` — scores payload lost
- `submit-refine-slices` — scores payload lost
- `submit-refinement` — scores payload lost

This is a systemic regression — every stdin-dependent call is broken.

**Fix:** Restore `stdin` at all affected call sites (depends on C1 fix).

### C3: `stdin` payloads constructed but never passed in `harness.ts`

**File:** `tools/dogfood/harness.ts`
**Flagged by:** All 3 reviewers

`gpLocalForce` accepts `stdin` in its type signature but silently discards it (only forwards `cwd` to `gpForce`). Multiple `completePayload` variables are dead code:
- Line ~913: `slice:complete`
- Line ~957: `epic:complete` (phase 2)
- Line ~1163: `quest:complete`
- Line ~1686: `slice:complete` (phase 4)
- Line ~1727: `epic:complete` (phase 4)

**Fix:** Fix `gpLocalForce` to forward `stdin` to `gpForce` (depends on C1 fix). Pass `{ stdin: completePayload }` at all affected call sites.

## Important Issues

### I1: Violation summary removed from end-of-run reports

**Files:** `tools/dogfood/validate.ts`, `tools/dogfood/harness.ts`
**Flagged by:** Generalist, Software Architecture

The original code printed an aggregate violation summary at completion (count + per-violation details). The migrated code only logs violations inline via `runSkillSession` as they occur — easy to miss in long output. For validate.ts (whose stated purpose is monitoring `.goodplan/` access violations), losing the aggregate report is a significant regression.

**Fix:** Accumulate violations from `runSkillSession` results and restore the summary block at end of run.

### I2: `require()` instead of ESM import in `validate.ts`

**File:** `tools/dogfood/validate.ts` (line 49)
**Flagged by:** Generalist, TypeScript

`log()` uses `const { appendFileSync } = require("node:fs")` — an ESM anti-pattern in a `verbatimModuleSyntax: true` project. Adds runtime overhead per call.

**Fix:** Import `appendFileSync` at the top of the file via ESM.

### I3: Unused imports across files

**Files:** `tools/dogfood/harness.ts`, `tools/dogfood/validate.ts`
**Flagged by:** Generalist, TypeScript

- `harness.ts`: `createLogger` imported but unused (uses inline `log()`)
- `validate.ts`: `SkillSessionResult` type imported but unused
- `validate.ts`: `createLogger` imported but unused

**Fix:** Remove all unused imports.

## Minor Issues

### M1: `verifyEntityStatus` called with empty string as `expected` in `harness.ts`

**File:** `tools/dogfood/harness.ts` (line ~101)
**Flagged by:** Generalist

Passing `""` to retrieve status without checking is semantically misleading. Consider `gpLocalJson` directly or a dedicated `getEntityStatus` helper.

### M2: Error handler swallows errors and exits 0

**File:** `tools/dogfood/harness.ts` (line ~1989)
**Flagged by:** Software Architecture, TypeScript

`try/catch` at entry point catches all errors and falls through to summary with exit code 0. Fatal phase failures are invisible to CI.

**Fix:** Set `process.exit(1)` after summary when an error was caught.

### M3: Dead `completePayload` variables in `harness.ts`

**File:** `tools/dogfood/harness.ts`
**Flagged by:** Generalist

Multiple `const completePayload = JSON.stringify(...)` declarations are dead code (functional fix is in C3; this is about removing the dead declarations if the fix approach changes).

### M4: `GOODPLAN_BIN` inconsistency in test-onboard.ts and test-migrate.ts

**Files:** `tools/dogfood/test-onboard.ts` (line 38), `tools/dogfood/test-migrate.ts` (line 41)
**Flagged by:** Software Architecture, TypeScript

Both define `GOODPLAN_BIN` for post-run verification via `execFileSync`, bypassing the shared `gp()` utility's bin resolution. Creates two code paths for finding the binary.

### M5: `as` casts without type guards in `harness.ts` `onMessage`

**File:** `tools/dogfood/harness.ts` (line ~211)
**Flagged by:** TypeScript

Unvalidated `as` casts on SDK message objects could silently break if the message shape changes.

### M6: Unicode box-drawing characters replaced with ASCII

**File:** `tools/dogfood/harness.ts`
**Flagged by:** Generalist

All `═` replaced with `=`. Cosmetic, undocumented change. Not functional.

### M7: `test-onboard.ts` imports `gp as gpCli` but never uses it

**File:** `tools/dogfood/test-onboard.ts` (line 24)
**Flagged by:** TypeScript

Unused aliased import.

## Deduplication Notes

- All 3 reviewers independently identified dropped `stdin` payloads as the primary critical issue. Merged into C1 (root cause) + C2/C3 (per-file manifestations).
- Generalist C2 (validate.ts submit scores) is a subset of C2 above.
- Software Architecture I1 (gpForce missing stdin) is the root cause, elevated to C1.
- Generalist M1 (gpLocalForce drops stdin) is a subset of C3.
- Generalist M4 (dead completePayload) is the cleanup side of C3.
