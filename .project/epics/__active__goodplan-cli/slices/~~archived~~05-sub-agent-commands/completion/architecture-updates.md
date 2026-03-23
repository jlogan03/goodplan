# Architecture Updates: 05-sub-agent-commands

## Updates Made During Implementation (Phase 5)

- **rpc-layer-api.md**: Updated `startContext` signature to `startContext(state, phase, target, options?)` (caller provides state). Added `complete` to `SubmitPhase` with JSDoc clarification. Added "Context Bundling as Peer Module" section documenting `src/core/context/` layering.
- **_overview.md**: Updated context module description to "peer module alongside the RPC layer."
- **transition-tables.md**: Added `activeQuest == null` guard to BEGIN_QUEST_PLAN and "One active quest" cross-cutting guard entry.

## Updates Made During Completion

- **rpc-layer-api.md line 5**: Changed "Owns context bundling" to "Coordinates with the context bundling peer module" — aligns the purpose statement with the detailed peer module description added in Phase 5.

## Flagged as Future Work

- **Circular type import between context and RPC**: Bidirectional `import type` works but doesn't match the independent-peer architecture. Shared types file extraction deferred (see learnings).
- **Quest submit handlers in slice-submit.ts**: 3 quest submit handlers remain co-located with slice handlers (304-line file). Splitting to `quest-submit.ts` deferred — functional but inconsistent with one-file-per-entity convention.
- **Overview `completed` timestamp**: Never set by any status handler. Deferred to future work.
