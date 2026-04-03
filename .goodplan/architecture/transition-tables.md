# State Transition Tables

Complete specification of valid state transitions for all entity types. Each row is a transition rule — the reducer walks matching rows for a given `(from, event.type)` pair and the first guard that passes wins. This document is the source of truth for the state machine implementation and tests.

## Project

| From | Event | To | Guard | Error | Orchestrator Returns | Notes |
|---|---|---|---|---|---|---|
| (none) | INIT_PROJECT | — | — | — | project | Creates project.json. No status field on project — "To" is structural (project.json exists). |

## Epic

### Epic Lifecycle

| From | Event | To | Guard | Error | Orchestrator Returns | Notes |
|---|---|---|---|---|---|---|
| (none) | CREATE_EPIC | created | — | — | epic, status | Creates epic.json with goal |
| created | BEGIN_EXPLORE | exploring | — | — | epic, status, previousStatus | |
| created | COMPLETE_EXPLORE | explored | — | — | epic, status | Skip explore path |
| exploring | COMPLETE_EXPLORE | explored | — | — | epic, status, artifactsWritten | |
| explored | BEGIN_ARCHITECTURE | defining-architecture | — | — | epic, status, previousStatus | |
| explored | COMPLETE_ARCHITECTURE | architecture-defined | — | — | epic, status | Skip architecture definition |
| defining-architecture | COMPLETE_ARCHITECTURE | architecture-defined | — | — | epic, status, filesWritten | |
| architecture-defined | BEGIN_REFINE_ARCHITECTURE | refining-architecture | — | — | epic, status, round | |
| architecture-defined | COMPLETE_REFINE_ARCHITECTURE | architecture-refined | — | — | epic, status | Skip architecture refinement |
| refining-architecture | COMPLETE_REFINE_ARCHITECTURE | refining-architecture | scores below threshold AND !override | — | epic, status, round, scores, thresholdMet | Stay in refining |
| refining-architecture | COMPLETE_REFINE_ARCHITECTURE | architecture-refined | scores meet threshold OR override | — | epic, status, round, scores, thresholdMet | |
| architecture-refined | BEGIN_SLICING | defining-slices | — | — | epic, status, previousStatus | |
| defining-slices | COMPLETE_SLICING | slices-defined | — | — | epic, status, sliceCount | |
| slices-defined | BEGIN_REFINE_SLICES | refining-slices | — | — | epic, status, round | |
| slices-defined | COMPLETE_REFINE_SLICES | slices-refined | — | — | epic, status | Skip slice refinement |
| refining-slices | COMPLETE_REFINE_SLICES | refining-slices | scores below threshold AND !override | — | epic, status, round, scores, thresholdMet | Stay in refining |
| refining-slices | COMPLETE_REFINE_SLICES | slices-refined | scores meet threshold OR override | — | epic, status, round, scores, thresholdMet | |
| slices-refined | ACTIVATE_EPIC | activated | project.activeEpic == null AND epic.verifications.length > 0 | — | epic, status, verifications | Sets project.json activeEpic |
| activated | COMPLETE_EPIC | completed | all verificationResults have passed: true | — | epic, status, verificationResults, learningsRolledUp | Clears project.json activeEpic |
| activated | COMPLETE_EPIC | (error) | any verificationResult has passed: false | STATE_VERIFICATION_FAILED | — | |
| * (non-terminal) | ABANDON_EPIC | abandoned | current status is not terminal | — | epic, status, reason | Requires reason. Clears activeEpic if active. |
| * (terminal) | ABANDON_EPIC | (error) | current status is terminal | STATE_INVALID_TRANSITION | — | |

### Epic Verification Management

| From | Event | To | Guard | Error | Orchestrator Returns | Notes |
|---|---|---|---|---|---|---|
| * (pre-activated) | ADD_VERIFICATION | (same) | — | — | epic, verifications | Appends to verifications array |
| * (pre-activated) | UPDATE_VERIFICATION | (same) | index exists | — | epic, verifications | Updates verification at index |

### Epic Context Returns (Sub-Agent)

For each phase, what `startContext()` returns to sub-agents.

| Phase | Inline Priority (highest first) | References |
|---|---|---|
| explore | epic goal, existing research titles, brainstorm titles, conventions, completed epics, completed quests, pending quests | research/*.md, brainstorm/*.md, prototypes/* |
| architecture | epic goal, exploration summary, conventions, existing architecture | research/*.md, brainstorm/*.md, prototypes/* |
| refine-architecture | architecture files, conventions, epic goal, active decisions | research/*.md |
| slices | epic goal, full architecture, conventions, learnings | research/*.md, brainstorm/*.md |
| refine-slices | slice sequencing, slice goals, architecture overview, conventions, epic goal | architecture/*.md |

## Slice

### Slice Lifecycle

| From | Event | To | Guard | Error | Orchestrator Returns | Notes |
|---|---|---|---|---|---|---|
| (none) | CREATE_SLICE | created | — | — | slice, epic, status | Creates slice.json, links to epic |
| created | BEGIN_PLAN | planning | previous slice completed/abandoned OR first slice | — | slice, status, previousStatus | Sequential enforcement. Sets project.json activeSlice. |
| created | BEGIN_PLAN | (error) | previous slice not completed/abandoned | STATE_SLICE_NOT_READY | — | |
| planning | COMPLETE_PLAN | plan-created | hasChild(state, "slices/<name>", "plan.md") | — | slice, status | submit-plan triggers this |
| planning | COMPLETE_PLAN | (error) | !hasChild(state, "slices/<name>", "plan.md") | STATE_CONTENT_MISSING | — | |
| plan-created | BEGIN_REFINEMENT | refining | — | — | slice, status, round | |
| refining | COMPLETE_REFINEMENT_ROUND | refining | scores below threshold AND round < maxRounds AND !override | — | slice, status, round, scores, thresholdMet | Increments round, records scores |
| refining | COMPLETE_REFINEMENT_ROUND | plan-refined | scores meet threshold OR override | — | slice, status, round, scores, thresholdMet | |
| refining | COMPLETE_REFINEMENT_ROUND | (error) | round >= maxRounds AND !override | STATE_MAX_ROUNDS_REACHED | — | Circuit breaker |
| plan-created | COMPLETE_REFINEMENT_ROUND | plan-refined | scores meet threshold (first round) | — | slice, status, round, scores, thresholdMet | Skip path: first round passes |
| plan-refined | BEGIN_IMPLEMENTATION | implementing | hasChild(state, "slices/<name>", "plan-refined.md") | — | slice, status, previousStatus | |
| plan-refined | BEGIN_IMPLEMENTATION | (error) | !hasChild(state, "slices/<name>", "plan-refined.md") | STATE_CONTENT_MISSING | — | |
| implementing | COMPLETE_IMPLEMENTATION | implementation-complete | — | — | slice, status | submit-implementation triggers this |
| implementation-complete | COMPLETE_SLICE | completed | verificationPassed == true | — | slice, status, deferredRouted, architecturePaths, epicComplete, learningsRolledUp | Routes deferred, appends learnings + arch deltas. Clears project.json activeSlice. |
| implementation-complete | COMPLETE_SLICE | (error) | verificationPassed == false | STATE_VERIFICATION_FAILED | — | Stays in implementation-complete |
| * (non-terminal) | ABANDON_SLICE | abandoned | current status is not terminal | — | slice, status, reason | Requires reason. Clears project.json activeSlice if this was the active slice. |
| * (terminal) | ABANDON_SLICE | (error) | current status is terminal | STATE_INVALID_TRANSITION | — | |

### Slice Context Returns (Sub-Agent)

| Phase | Inline Priority (highest first) | References |
|---|---|---|
| plan | slice goal, current architecture overview, target architecture overview, conventions, active decisions, recent learnings | architecture/*.md, research/*.md |
| refinement | plan, slice goal, current architecture, target architecture, conventions, active decisions | architecture/*.md, research/*.md |
| implementation | refined plan, slice goal, current architecture, target architecture, conventions, relevant learnings | architecture/*.md |
| complete | slice goal, remaining slice overview, implementation results, current architecture, target architecture, learnings at all levels | architecture/*.md |

## Quest

Quest lifecycle mirrors slice. Quests are project-scoped (no epic field, no sequential enforcement).

### Quest Lifecycle

| From | Event | To | Guard | Error | Orchestrator Returns | Notes |
|---|---|---|---|---|---|---|
| (none) | CREATE_QUEST | created | — | — | quest, status | Creates quest.json |
| created | BEGIN_QUEST_EXPLORE | exploring | — | — | quest, status, previousStatus | Does NOT set activeQuest — allows other quests to remain accessible during potentially long explore phase. |
| created | COMPLETE_QUEST_EXPLORE | explored | — | — | quest, status | Skip explore path |
| exploring | COMPLETE_QUEST_EXPLORE | explored | — | — | quest, status | Normal explore completion |
| created | BEGIN_QUEST_PLAN | planning | activeQuest == null | — | quest, status, previousStatus | No sequential enforcement. Sets project.json activeQuest. Dual precondition: accepts both `created` (skip explore) and `explored` (after exploration). |
| explored | BEGIN_QUEST_PLAN | planning | activeQuest == null | — | quest, status, previousStatus | Post-exploration path to planning. |
| created | BEGIN_QUEST_PLAN | (error) | activeQuest != null | STATE_QUEST_ALREADY_ACTIVE | — | Must complete or abandon active quest first. |
| planning | COMPLETE_QUEST_PLAN | plan-created | hasChild(state, "quests/<name>", "plan.md") | — | quest, status | submit-plan --quest triggers this |
| planning | COMPLETE_QUEST_PLAN | (error) | !hasChild(state, "quests/<name>", "plan.md") | STATE_CONTENT_MISSING | — | |
| plan-created | BEGIN_QUEST_REFINEMENT | refining | — | — | quest, status, round | |
| plan-created | COMPLETE_QUEST_REFINEMENT_ROUND | plan-refined | scores meet threshold (first round) | — | quest, status, round, scores, thresholdMet | Skip path: first round passes |
| refining | COMPLETE_QUEST_REFINEMENT_ROUND | refining | scores below threshold AND round < maxRounds AND !override | — | quest, status, round, scores, thresholdMet | |
| refining | COMPLETE_QUEST_REFINEMENT_ROUND | plan-refined | scores meet threshold OR override | — | quest, status, round, scores, thresholdMet | |
| refining | COMPLETE_QUEST_REFINEMENT_ROUND | (error) | round >= maxRounds AND !override | STATE_MAX_ROUNDS_REACHED | — | Circuit breaker |
| plan-refined | BEGIN_QUEST_IMPLEMENTATION | implementing | hasChild(state, "quests/<name>", "plan-refined.md") | — | quest, status, previousStatus | |
| plan-refined | BEGIN_QUEST_IMPLEMENTATION | (error) | !hasChild(state, "quests/<name>", "plan-refined.md") | STATE_CONTENT_MISSING | — | |
| implementing | COMPLETE_QUEST_IMPLEMENTATION | implementation-complete | — | — | quest, status | |
| implementation-complete | COMPLETE_QUEST | completed | verificationPassed == true | — | quest, status, architecturePaths, learningsRolledUp | Routes learnings, arch deltas. Clears project.json activeQuest. |
| implementation-complete | COMPLETE_QUEST | (error) | verificationPassed == false | STATE_VERIFICATION_FAILED | — | |
| * (non-terminal) | ABANDON_QUEST | abandoned | current status is not terminal | — | quest, status, reason | Requires reason. Clears project.json activeQuest if this was the active quest. |
| * (terminal) | ABANDON_QUEST | (error) | current status is terminal | STATE_INVALID_TRANSITION | — | |

### Quest Context Returns (Sub-Agent)

| Phase | Inline Priority (highest first) | References |
|---|---|---|
| explore | quest goal, current architecture, target architecture, conventions, completed epics, completed quests, pending quests | — |
| plan | quest goal, current architecture overview, target architecture overview, conventions, active decisions, recent learnings | architecture/*.md, research/*.md |
| refinement | plan, quest goal, current architecture, target architecture, conventions, active decisions | architecture/*.md, research/*.md |
| implementation | refined plan, quest goal, current architecture, target architecture, conventions, relevant learnings | architecture/*.md |
| complete | quest goal, implementation results, current architecture, target architecture, learnings at all levels | architecture/*.md |

## Task

### Task Lifecycle

| From | Event | To | Guard | Error | Orchestrator Returns | Notes |
|---|---|---|---|---|---|---|
| (none) | CREATE_TASK | open | — | — | task, status | Creates task.json. Lazily creates tasks/overview.json if missing. |
| open | DROP_TASK | dropped | — | — | task, status, reason | Requires reason. Sets completed timestamp in overview. |
| open | CONVERT_TASK | converted | target entity name does not exist AND target overview exists | STATE_INVALID_TRANSITION | task, status, convertedTo | Atomically creates quest or epic entity. Sets completed timestamp in overview. |
| * (terminal) | DROP_TASK | (error) | current status is terminal | STATE_INVALID_TRANSITION | — | |
| * (non-open) | CONVERT_TASK | (error) | current status is not open | STATE_INVALID_TRANSITION | — | |

## Decision

| From | Event | To | Guard | Error | Orchestrator Returns | Notes |
|---|---|---|---|---|---|---|
| (none) | CREATE_DECISION | active | — | — | decision, status | Appends to decisions.jsonl |
| active | UPDATE_DECISION | active | newStatus == 'active' OR no status change | — | decision, status | Updates fields |
| active | UPDATE_DECISION | superseded | newStatus == 'superseded' | — | decision, status, supersededBy | Links to replacement |
| active | UPDATE_DECISION | revisiting | newStatus == 'revisiting' | — | decision, status | Flags for review |
| revisiting | UPDATE_DECISION | active | newStatus == 'active' | — | decision, status | Resolved |
| revisiting | UPDATE_DECISION | superseded | newStatus == 'superseded' | — | decision, status, supersededBy | Replaced |

## Cross-Cutting Guards

| Guard | Applies To | Rule | Error |
|---|---|---|---|
| One active epic | ACTIVATE_EPIC | project.activeEpic == null | STATE_EPIC_ALREADY_ACTIVE |
| One active quest | BEGIN_QUEST_PLAN | project.activeQuest == null | STATE_QUEST_ALREADY_ACTIVE |
| Verification criteria exist | ACTIVATE_EPIC | epic.verifications.length > 0 | STATE_MISSING_VERIFICATIONS |
| All verifications passed | COMPLETE_EPIC | all verificationResults have passed: true | STATE_VERIFICATION_FAILED |
| Sequential slice execution | BEGIN_PLAN | previous slice completed/abandoned OR first slice | STATE_SLICE_NOT_READY |
| Circuit breaker | COMPLETE_REFINEMENT_ROUND, COMPLETE_QUEST_REFINEMENT_ROUND, COMPLETE_REFINE_ARCHITECTURE, COMPLETE_REFINE_SLICES | round < maxRounds OR override | STATE_MAX_ROUNDS_REACHED |
| Verification passed | COMPLETE_SLICE, COMPLETE_QUEST | verificationPassed == true | STATE_VERIFICATION_FAILED |
| Content exists | COMPLETE_PLAN, COMPLETE_QUEST_PLAN | hasChild(state, "<entity>/<name>", "plan.md") | STATE_CONTENT_MISSING |
| Refined plan exists | BEGIN_IMPLEMENTATION, BEGIN_QUEST_IMPLEMENTATION | hasChild(state, "<entity>/<name>", "plan-refined.md") | STATE_CONTENT_MISSING |

## Implicit Transitions

Not triggered by events — detected by the RPC layer after a state change.

| Condition | Detection | Effect |
|---|---|---|
| All slices in epic completed | After any COMPLETE_SLICE, check all sibling slices | Flag in response: `epicComplete: true` |
| Active entity abandoned | After ABANDON_*, check if entity was active | Clear active pointer in project.json |

## Terminal States

| Entity | Terminal States |
|---|---|
| Epic | completed, abandoned |
| Slice | completed, abandoned |
| Quest | completed, abandoned |
| Task | dropped, converted |
| Decision | superseded (revisiting is NOT terminal) |
