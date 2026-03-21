# Decision: No Work Stack — Three Active Pointers with Sequential Slices

**Status**: active
**Date**: 2026-03-20
**Domain**: architecture
**Context**: create-architecture for epics/goodplan-cli — work stack mechanics

## Decision

Replace the work stack with three simple active pointers in `project.json`: `activeEpic`, `activeSlice`, `activeQuest`. One active epic at a time. One active slice within that epic, executed sequentially (abandon to skip). One active quest at a time, which can run alongside an active slice. Planning can happen without activation.

## Rationale

The work stack was designed for interruption tracking (quest preempts slice, push slice onto stack, pop when quest finishes). But simpler rules achieve the same outcome: since there's one active epic, one active slice (sequential), and one active quest, the state is always three pointers — no stack needed.

Alternatives considered:
- **Full work stack (LIFO)** — from the original design spec. Adds complexity for a scenario (nested interruptions) that the simpler rules already handle. A quest running alongside a slice isn't really an interruption — both can be active simultaneously.
- **Allowing parallel slices** — rejected for simplicity. Slices are specifically built to be executed in order. Can relax this constraint later if needed.

## Consequences

- `goodplan status` reads three fields and knows exactly where the project is
- CLI enforces sequential slice execution — can't start slice 03 until 02 is complete or abandoned
- Side quests run alongside slices without interrupting them
- State model is trivially serializable and understandable
- If nested interruption tracking is needed in the future, a stack can be added without changing the three-pointer model
