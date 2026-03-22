# TUI and CLI Review: Slice Lifecycle Plan (Round 2)

## Issues

**[MINOR]** `slice:create` human-readable output references `result.entity` but doesn't show epic association

Phase 4 says "Human-readable shows slice name + status + epic." However, the plan's create command description says it calls `begin('create', {type:'slice', name}, {name, goal, epic})` and the human-readable output pattern is `{sliceName}: {previousStatus} -> {newStatus}`. The epic association is stated as a goal but the output pattern doesn't include it. The existing `epic:create` pattern (`${pc.bold(result.entity)}: ${result.previousStatus} -> ${result.newStatus}`) doesn't include any supplemental info either, so this is consistent -- but if the plan specifically calls out "shows slice name + status + epic," then the human-readable format should be specified (e.g., `{sliceName} (epic: {epicName}): none -> created`). Minor because the `--json` output will contain the full result regardless.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `slice:complete` human-readable output for complex result not specified

Phase 4 says "Complete shows deferred count, learnings count, epicComplete flag" but doesn't specify the human-readable format. Given that `slice:complete` returns the richest result in the system (deferredRouted, learningsRolledUp, epicComplete, architecturePaths), the human-readable output should be specified to avoid implementer guesswork. Something like:
```
01-auth: implementation-complete -> completed
  Deferred: 2 items routed
  Learnings: 1 rolled up to epic, 0 to project
  Epic complete: yes
```
This matters because the human-readable output is what the orchestrator (or human debugging) will see by default. The `--json` path is fine since it just serializes the `CompleteResult`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `slice:list --epic` filter not fully specified

Phase 4 says `slice:list` has "Optional `--epic` flag to filter by epic" and returns overview items. The current `epic:list` implementation reads `epics/overview.json`. For slices, the plan says it navigates to `slices/overview.json`. But slices/overview.json is a flat list -- filtering by epic requires knowing which epic each slice belongs to. The plan should clarify whether the overview items contain an `epic` field for filtering, or whether the command needs to cross-reference `slice.json` files. Looking at the architecture, `slices/overview.json` items should have an `epic` field since slices are always associated with an epic. This is a minor gap in specification.

Resolution: CODEBASE_EXPLORATION

## Score: 9/10

All four IMPORTANT issues from round 1 have been resolved. The `slice:create` input contract is now unambiguous (--epic flag, stdin carries {name, goal}). The `BeginPayloadMap` tradeoff is documented with a concrete approach. `CompleteResult` has an explicit extension task. Guard helper inconsistency is addressed with a concrete refactoring task in Phase 2. The remaining issues are all MINOR formatting/specification details that won't block implementation. To reach 10/10: specify the human-readable output format for `slice:complete` (the most complex result in the system deserves explicit formatting guidance).

## Summary
- Critical: 0
- Important: 0
- Minor: 3
