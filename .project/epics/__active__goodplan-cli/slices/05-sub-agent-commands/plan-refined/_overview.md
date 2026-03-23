# Plan: Sub-Agent Commands & Quest Lifecycle

Status: COMPLETE
Completed: 2026-03-22

## Overview

Implement context bundling (`start-*` commands with `--inline` budget-based markdown inlining) and the full quest entity lifecycle. These are two independent feature clusters sharing a single slice because they complete the sub-agent interface.

Approach: bottom-up, quest lifecycle first (follows proven slice 04 patterns), then context bundling (novel — no precedent in the codebase). Three quest phases mirror slice 04's structure; context bundling introduces a new `src/core/context/` module within the RPC layer.

Key decisions:
- Quest events use `_QUEST_` prefix (matching existing `COMPLETE_QUEST_PLAN` etc. from slice 03)
- Quest helpers consolidated from `slice-submit.ts` local copies to shared `helpers.ts` (per TODO(slice-05))
- `guardQuestStatus` upgraded to return `Quest | StateError` (matching `guardSliceStatus` pattern from slice 04)
- Context bundling is a peer module (`src/core/context/`) alongside the RPC layer — depends on tree types and Data Layer reads, consumed by both RPC (for `--inline` on mutations) and Commands (for `start-*`)
- Budget applies to total inlined markdown size, not full response size
- `startContext()` is read-only — no state mutations, no `reduce()` call
- 5 epic-phase submit commands already fully implemented in slice 03 — this slice fixes `resolveStatuses` quest placeholders and adds quest lifecycle
- All `start-*` commands registered as top-level commands (same pattern as `submit-*`)

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | Quest Types & Helpers | Add 6 quest lifecycle events, extend CompleteInput, consolidate quest helpers, placeholder handlers |
| 02 | Quest State Machine | All quest transition handlers: CREATE_QUEST, BEGIN_QUEST_PLAN, COMPLETE_QUEST (learnings + arch deltas), ABANDON_QUEST |
| 03 | Quest RPC & CLI | Wire quest targets through begin()/complete(), fix submit resolveStatuses, 8 quest:* CLI commands |
| 04 | Context Bundling Module | src/core/context/ — startContext(), 9 per-phase priority tables (including complete), tree traversal, --inline budget |
| 05 | Start Commands & E2E | 8 start-* CLI commands, full lifecycle verification, binary regression |
