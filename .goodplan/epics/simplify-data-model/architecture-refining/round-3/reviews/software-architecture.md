# Software Architecture Review — Simplify Data Model Epic (Round 3)

## R2 Resolutions Verified

All 3 IMPORTANT issues from R2 are addressed:

- **Migration crash-safe ordering** (I-1): `data-model-changes.md` lines 204-213 now specify correct ordering: write consolidated file first, update HMAC, verify, then remove old files. Crash at any point leaves recoverable state. Idempotency on re-run confirmed.
- **`reconsiderWhen`/`validUntil` evaluation ownership** (I-2): `conventions.md` lines 56-69 now consolidates evaluation to exactly three phase agents (`architecture-phase`, `plan-phase`, `completion-phase`). Orchestrator loads conditions via CLI before spawning these agents. Reviewers and coordinators explicitly excluded. Clean single-owner pattern.
- **Reviewer domain prompts migration** (I-3): `skill-model-api.md` line 211 now explicitly states reviewer domain prompts "become markdown body of `agents/reviewer-*.md` files." No ambiguity.

All 4 MINOR issues also addressed:
- Pipeline vs. standalone definition added to `conventions.md` line 233.
- `verifyEntityStatus` naming consistent across `conventions.md` and `test-harness-api.md`.
- Budget estimate in `_overview.md` line 131 now notes orchestrator context only, with spawn overhead addendum.
- `plugin.json` `"agents"` field format specified in `_overview.md` line 188.

## Issues

**[MINOR]** `data-model-changes.md` schema for `learningInputSchema` omits `validUntil` rendering as a CLI-side gap
The target `learningInputSchema` (lines 124-131) adds `validUntil: string[] | undefined`. However, the impact section (line 155) says "`slice:complete` and `quest:complete` payloads accept `validUntil` per learning" — but the `learningInputSchema` is also consumed by the RPC layer's completion handler. The architecture should note that the RPC layer passes `validUntil` through to the persisted `learningEntrySchema` (analogous to how `rollupTo` is currently handled). Without this, implementers may add the field to the input schema but forget to wire it through the RPC mapping from `LearningInput` to `LearningEntry`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Overview consolidation impact estimate ("~50 files affected" in `_overview.md` line 166 vs "~30+ test files" in `data-model-changes.md` line 199) inconsistency
The `_overview.md` says "~50 files affected (schemas, transitions, commands, tests, fixtures)" while `data-model-changes.md` says "~30+ test files update fixture paths and assertions." Both may be correct (50 total = 30 tests + 20 source), but the discrepancy could confuse implementers. Either reconcile the numbers or clarify in `_overview.md` that the 50 includes both source and test files.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The architecture has matured significantly across three rounds. All R2 issues are cleanly resolved. The orchestrator pattern is well-defined with clear context discipline and a concrete fitness function. Module boundaries are sharp: orchestrator owns control flow, phase agents own content decisions, the CLI owns state transitions. The `reconsiderWhen`/`validUntil` evaluation is now properly consolidated into three named phase agents rather than spread across all agents. The crash-safe migration ordering follows the existing `commitState` pattern. The `_shared/references/` migration table is complete.

Deep module analysis (2x weight): The architecture creates genuinely deep modules. The orchestrator hides all control flow complexity behind a simple phase-table interface. The refinement loop (coordinator -> reviewers -> synthesis -> editor) is a deep module with a tiny interface (spawn coordinator, get back scores). The continuation file protocol absorbs the complexity of cross-spawn state management. The schema registry absorbs overview file restructuring behind the existing `assembleState`/`commitState` boundary. No shallow modules or unnecessary caller friction identified.

The two remaining items are minor documentation consistency issues that won't affect implementation quality.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
