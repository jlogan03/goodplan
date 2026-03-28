# Plan: Sub-Agent Commands & Quest Lifecycle

## Overview

Implement context bundling (`start-*` commands with `--inline` budget-based markdown inlining) and the full quest entity lifecycle. These are two independent feature clusters sharing a single slice because they complete the sub-agent interface.

Approach: bottom-up, quest lifecycle first (follows proven slice 04 patterns), then context bundling (novel — no precedent in the codebase). Three quest phases mirror slice 04's structure; context bundling introduces a new `src/core/context/` module within the RPC layer.

Key decisions:
- Quest events use `_QUEST_` prefix (matching existing `COMPLETE_QUEST_PLAN` etc. from slice 03)
- Quest helpers consolidated from `slice-submit.ts` local copies to shared `helpers.ts` (per TODO(slice-05))
- `guardQuestStatus` upgraded to return `Quest | StateError` (matching `guardSliceStatus` pattern from slice 04)
- Context bundling is a distinct module (`src/core/context/`) within the RPC layer — separate from state orchestration
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
| 04 | Context Bundling Module | src/core/context/ — startContext(), per-phase priority tables, tree traversal, --inline budget |
| 05 | Start Commands & E2E | 8 start-* CLI commands, full lifecycle verification, binary regression |
