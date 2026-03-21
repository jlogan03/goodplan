# Lifecycle and Completion Design

## Project-Level State

| State | Condition |
|---|---|
| Uninitialized | No `.project/` |
| Needs migration | `.project/` exists but version mismatch |
| Needs goal | Initialized but no `idea.md` |
| Ready | Goal captured, can create/manage epics |

## Goal Hierarchy

- `idea.md` — project-level problem and scope (captured once)
- `epic.json` → goal field — epic-specific goal + verification criteria
- `slice.json` → goal field — slice-specific goal
- `quest.json` → goal field — quest-specific goal

## Epic Lifecycle (Revised)

1. Captured (goal exists)
2. Exploring (research/brainstorm in progress)
3. Explore complete
4. Architecture definition
5. Architecture complete
6. Refining architecture
7. Architecture refined
8. **Activation gate** — CLI enforces: no other active epic, verification criteria must exist
9. Slicing (defining slices)
10. Slices defined
11. Refining slices
12. Slices refined → executing
13. All slices complete
14. **Integration verification** — do slices compose into a working whole?
15. **Epic-level QA** — end-to-end verification against the goal and criteria
16. Complete / Abandoned

### Epic Verification Criteria

- Stored in `epic.json` as a living document
- NOT required at goal creation — required at activation gate
- Any phase (explore, architecture, slicing, planning, implementation) can add/modify verification steps
- Verified at epic completion before the epic can be marked done

## Slice Lifecycle

1. Defined (goal exists)
2. Planning (creating plan)
3. Plan created
4. Refining plan (rounds, scores, circuit breaker)
5. Plan refined
6. Implementing (phases, iterations)
7. Implementation complete
8. **Verify against slice goal** — if fails, back to implementation
9. Deferred work captured and routed to later slices
10. Architecture delta identified, project-level architecture updated
11. Learnings captured and rolled up
12. Complete / Abandoned

### Completion Flow Ordering

Verification happens FIRST. If verification fails, more implementation is needed — which could change what gets deferred, the architecture delta, and the learnings. Only after verification passes do we capture artifacts.

### Deferred Work During Slice Completion

When implementation defers work to a later slice:
1. LLM identifies deferred items
2. CLI records them in the completing slice's metadata
3. CLI updates target slice's metadata (or creates new slice/quest if no obvious target)
4. CLI flags to user: "3 items deferred from slice 01 → slice 03. Review?"

## No Work Stack

Simpler rules replace the work stack:
- One active epic at a time
- One active slice within that epic (sequential execution enforced, abandon to skip)
- One active quest at a time (can run alongside a slice)
- Planning can happen without activation

State is three pointers in `project.json`:
```json
{
  "activeEpic": "goodplan-cli",
  "activeSlice": "01-data-layer",
  "activeQuest": "fix-logging"
}
```

## Two-Layer Architecture — Incremental Updates

- **Project-level** (`architecture/`) — current reality, updated on every slice AND quest completion
- **Epic-level** (`epic/architecture/`) — target state for the epic

Updated incrementally so that:
- Side quests mid-epic see accurate current architecture
- Slice planning sees both current (where we are) and target (where we're going)
- No stale architecture accumulates waiting for epic completion

## Sub-Phase Tracking (Option B)

CLI derives artifact state from filesystem. `goodplan status` reads directories, counts artifacts, reports what's there. Doesn't prescribe what should exist — just reports what does.
