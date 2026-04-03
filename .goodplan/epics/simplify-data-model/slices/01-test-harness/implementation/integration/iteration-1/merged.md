# Merged Integration Review: Test Harness Foundation

**Consensus Score:** 8/10
**Reviewers:** Generalist (8/10), Software Architecture (8/10), TypeScript (8/10)
**Issues:** Critical: 0, Important: 4, Minor: 5

## Goal Alignment (All Reviewers Agree)

Implementation delivers on all major plan goals: shared utils extracted (809 lines, clean API surface), all 5 scripts migrated, AUTONOMOUS and firstOption removed, `.project/` references cleaned up, model selection consistent, test coverage strong (34 unit + 29 integration + 10 simulated user tests).

## Important Issues

### IMP-1: validate.ts and harness.ts retain inline `log()` instead of `createLogger()`
**Raised by:** Generalist, Software Architecture
**Resolution:** CODEBASE_EXPLORATION

Both scripts define local `log(file, content)` helpers that append to per-run log files. This diverges from `createLogger()` which binds to a single file. The multi-file logging use case is not covered by the current `createLogger()` API. Pragmatic choice but an incomplete migration per the plan.

**Action:** Decide whether to extend `createLogger()` to support multi-file logging or document this as an intentional divergence.

### IMP-2: `test-plugin-skills.ts` hardcodes `binaries/macos-arm64/gp` -- not portable
**Raised by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE

Line 37 hardcodes the platform path. Line 155 also hardcodes `binaries/macos-arm64` in PATH construction. `utils.ts` exports `platformBinaryDir()` for exactly this purpose and other scripts use it correctly.

**Action:** Replace both hardcoded paths with `platformBinaryDir()`.

### IMP-3: `require()` in test file violates `verbatimModuleSyntax`
**Raised by:** TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

`tests/unit/dogfood/utils.test.ts` line 150 uses `const { execFileSync } = require("node:child_process")`. Inconsistent with ESM imports used everywhere else. Bun tolerates it but it violates project tsconfig.

**Action:** Replace with ESM import at top of file.

### IMP-4: Simulated user architecture diverged from plan (persistent vs stateless)
**Raised by:** Generalist, Software Architecture (lifecycle documentation aspect)
**Resolution:** CODEBASE_EXPLORATION

Plan specified stateless `messages.create()` calls; implementation uses persistent Agent SDK `query()` session with `AsyncQueue`. Reasonable improvement (better context accumulation, no separate API key needed), but introduces:
- Required `close()` method (plan said "No close() needed")
- `AsyncQueue` single-consumer race risk (documented but not guarded)
- Fragile AbortError string matching

Additionally, harness.ts and validate.ts create a fresh `simulatedUser` per skill run (isolation), while test-onboard.ts reuses one across tests (accumulation). The docstring claims accumulation is the design intent but per-skill isolation is the dominant usage pattern.

**Action:** Document the plan deviation. Clarify expected lifecycle pattern in `createSimulatedUser()` docstring (per-skill vs shared).

## Minor Issues

### MIN-1: `process.env.HOME!` non-null assertion in validate.ts
**Raised by:** Software Architecture, TypeScript
**Resolution:** DIRECTLY_ACTIONABLE

Line 38-39 uses `HOME!` without a guard. All other scripts check `if (!HOME)` and `process.exit(1)`.

**Action:** Add the standard HOME guard.

### MIN-2: SDK type narrowing via `as Record<string, unknown>` chains
**Raised by:** Generalist, TypeScript
**Resolution:** TRACK (TODO comments exist)

`utils.ts` drain loop and `onMessage` callbacks across 4 scripts use `as Record<string, unknown>` casts for SDK message shapes. Documented via TODO comments. Should simplify when SDK types improve.

### MIN-3: Duplicated `stubMessage` helper
**Raised by:** Software Architecture
**Resolution:** DIRECTLY_ACTIONABLE (low priority)

Identical `stubMessage()` functions in `test-utils.ts` and `utils.test.ts`. Only two consumers; extract shared helper if more emerge.

### MIN-4: Hardcoded fallback path in `resolveDefaultGpBin`
**Raised by:** Generalist
**Resolution:** TRACK

Fallback to version `1.0.2/macos-arm64` will go stale. Low risk since dynamic resolution covers most cases.

### MIN-5: `onMessage` callback type casts duplicated across 4 files
**Raised by:** TypeScript
**Resolution:** DIRECTLY_ACTIONABLE (low priority)

Repeated `as { message: { content: Array<...> } }` casts in harness.ts, validate.ts, test-onboard.ts, test-migrate.ts. A shared `getToolUseBlocks()` utility in utils.ts would deduplicate.

## Directly Actionable Summary

These can be fixed without design decisions:

1. **IMP-2:** Replace hardcoded platform paths in test-plugin-skills.ts with `platformBinaryDir()`
2. **IMP-3:** Replace `require()` with ESM import in utils.test.ts
3. **MIN-1:** Add HOME guard in validate.ts

## Needs Design Decision

1. **IMP-1:** Extend `createLogger()` for multi-file use case or document divergence
2. **IMP-4:** Document persistent session deviation; clarify lifecycle pattern in docstring
