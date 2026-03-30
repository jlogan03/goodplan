# Architecture Updates: 03-hmac-signatures

## Top-Level Architecture

No updates needed. All three relevant docs accurately reflect the implementation:
- `data-layer-api.md` — HMAC State Integrity section is excellent; cache-hit exception documented
- `commands-api.md` — verify command entry accurate
- `invariants.md` — INV-001 exception for `gp verify --fix` documented

## Epic Architecture (not modified — deferred to epic completion)

One divergence noted for epic completion:
- `conventions.md` references `serializeStateTree()` as the HMAC serialization function. The actual function is `serializeForHmac()` in `src/core/data/hmac.ts`, which uses a custom `serializeExcludingMarkdown()` walker (fully excludes markdown entries instead of replacing with `true`). These are semantically different functions. Should be corrected during epic completion reconciliation.

## Changes Made

None — architecture was updated during Phase 4 implementation and is accurate.

## Tech Debt Flagged

None.
