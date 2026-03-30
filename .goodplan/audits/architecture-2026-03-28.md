# Architecture Audit — 2026-03-28

## Findings Summary

| # | Severity | Type | Finding | Action |
|---|----------|------|---------|--------|
| 1 | IMPORTANT | invariant-violation | INV-003: `new Date()` in state machine helper `updateSliceOverviewStatus` | Fixed inline |
| 2 | IMPORTANT | gap | RPC API signatures significantly diverged from docs (projectDir, BeginPayloadMap, StatusResult) | Deferred — doc update quest |
| 3 | IMPORTANT | gap | Context module dependency description wrong (says Data Layer, actually RPC types) | Fixed inline |
| 4 | MINOR | gap | `src/schemas/` undocumented as cross-cutting shared module | Deferred |
| 5 | MINOR | gap | `src/util/` undocumented as shared utility layer | Deferred |
| 6 | MINOR | gap | `serializeStateTree()` consumer-facing API undocumented | Deferred |
| 7 | MINOR | gap | `resolveProjectDir()` most-imported Data Layer function undocumented | Deferred |
| 8 | MINOR | gap | `--force` global flag undocumented + missing from GLOBAL_FLAG_KEYS | Code fix applied, doc deferred |
| 9 | MINOR | gap | `CommitOptions.force` safety override undocumented | Deferred |
| 10 | MINOR | gap | State machine doc describes "transition tables" but code uses handler Map | Deferred |
| 11 | MINOR | gap | `status()` documented as RPC function but lives in Commands | Deferred |
| 12 | MINOR | stale-fitness-function | `state-machine-purity.test.ts` didn't detect `Date` calls | Fixed — expanded test |
| 13 | INFO | dead-code | `countFiles()` in `src/core/data/files.ts` has zero consumers | Noted |

## Gap Analysis

10 architecture files audited via parallel exploration agents. Broad alignment across all subsystem boundaries — the four-layer stack is correctly enforced. Key gaps are doc drift in the RPC layer (signatures evolved without doc updates) and several undocumented modules/exports.

## Invariant Compliance

| Invariant | Status |
|-----------|--------|
| INV-001 | Compliant |
| INV-002 | Compliant |
| INV-003 | VIOLATION FIXED — `new Date()` removed from `updateSliceOverviewStatus` |
| INV-004 | Compliant |
| INV-005 | Compliant |
| INV-007 | Compliant |

## Fitness Function Audit

All 11 documented fitness test files exist and contain real assertions. `state-machine-purity.test.ts` was expanded to detect non-deterministic calls (`new Date()`, `Date.now()`, `Math.random()`, `crypto.randomUUID()`).

## Maturity Changes

No maturity changes. All subsystems remain at Developing.

## Fixes Applied

1. `src/core/state/transitions/helpers.ts` — Removed `new Date()` from `updateSliceOverviewStatus`, now uses `ts` parameter passed from `setSliceStatus`
2. `tests/fitness/state-machine-purity.test.ts` — Added second test suite detecting non-deterministic calls (24 new tests)
3. `src/util/validate.ts` — Added `force` to `GLOBAL_FLAG_KEYS` set
4. `.project/architecture/_overview.md` — Fixed Context module dependency description

## Side Quests Created

None — code fixes applied inline. RPC doc update deferred (significant scope).

## Deferred Findings

- RPC API doc drift (#2) — significant rewrite needed, good candidate for `consistent-skill-output` or a dedicated doc quest
- Undocumented modules/exports (#4-7, #9-11) — cosmetic doc improvements, can be bundled into a future doc update quest
- Dead code `countFiles` (#13) — trivial removal, can happen opportunistically
