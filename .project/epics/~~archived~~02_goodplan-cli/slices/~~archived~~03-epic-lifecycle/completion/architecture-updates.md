# Architecture Updates — 03-epic-lifecycle

## Changes Made

1. **state-machine-api.md: Universal `ts` on all StateEvent variants** — Amended during Phase 3 implementation. All events now carry `ts: string`, not just events that set timestamp fields. RPC layer injects on all events. This was a user-approved decision during implementation.

2. **state-machine-api.md: State Key Dependencies table** — Updated to include `epics/overview.json` in reads/writes for phase events (overview sync on every status change).

3. **rpc-layer-api.md: CompleteInput footnote** — Added note clarifying that slice 03 implements only the epic variant and boolean assertion; optional fields (deferred, learnings, architectureDelta) deferred to slice 04.

## Known Intentional Divergences (No Update Needed)

- **`{type: 'project'}` Target variant**: Added to RPC types.ts for rpcInit compatibility. Documented in code comment. Architecture describes the target state; this extension is backward-compatible.
- **4 additional submit commands in scope**: submit-explore, submit-architecture, submit-slices, submit-refine-architecture pulled forward from original slice 05 scope. Thin wrappers with no significant architectural impact.

## No Changes Needed

Architecture files accurately describe the system as implemented. The epic's target architecture and the top-level current architecture are aligned for the scope of this slice.
