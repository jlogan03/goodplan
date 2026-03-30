# State Machine Libraries for TypeScript CLI

## Use Case

Managing entity states (epics, slices, quests) with validated transitions, plus tracking metadata like refinement round counts, scores, and circuit breaker state. State is file-based (hydrated from `.project/` directory structure), not in-memory.

## Libraries Evaluated

### XState v5

- **Bundle:** ~16-17 KB min+gzip, zero deps
- **TypeScript:** Best-in-class since v5. `setup()` API provides full type inference for context, events, guards, actions.
- **Verdict:** Overkill. Actor model, parallel states, hierarchical statecharts — designed for complex UI orchestration. Our state machines are linear progressions with guards. Would use ~20% of capabilities. Every library assumes in-memory state — fighting against our file-based hydration.

### Robot3

- **Bundle:** ~1.2 KB min+gzip
- **TypeScript:** Weak. No compile-time transition validation.
- **Verdict:** Too weak on TypeScript. Small bundle is irrelevant for a CLI.

### Newer Libraries (2025-2026)

- **ts-state-machines** — type-safe transitions but no guards, no context, no actions
- **fiume** — async-friendly, `onEntry`/`onExit` hooks, but transitions aren't declarative
- **doeixd/machine** — type-state programming, compile-time safety, but awkward for serialization
- **typescript-fsm** — ~1 KB, zero deps, but no guards or context

None hit the sweet spot of type-safe transitions + guards + context + good maintenance.

### Roll Your Own (Recommended)

~50-80 lines of infrastructure. Typed transition table with a generic reducer:

```typescript
type SliceState = 'defined' | 'planning' | 'refining' | 'implementing' | 'qa' | 'completing' | 'done';

interface Transition<S extends string, E extends string, C> {
  from: S;
  on: E;
  to: S;
  guard?: (ctx: C) => boolean;
  action?: (ctx: C) => C;
}

const sliceTransitions: Transition<SliceState, SliceEvent, SliceContext>[] = [
  { from: 'defined', on: 'BEGIN_PLAN', to: 'planning' },
  { from: 'refining', on: 'ROUND_COMPLETE', to: 'refining', guard: ctx => ctx.score < 9 },
  { from: 'refining', on: 'ROUND_COMPLETE', to: 'implementing', guard: ctx => ctx.score >= 9 },
];

function reduce<S, E, C>(table, state, event, ctx): { state: S; ctx: C }
```

**Why this wins:**
- File-based state hydration IS the state machine — no adapter layer
- Graphs are simple linear progressions, not complex statecharts
- Pure functions — trivially testable
- XState is the upgrade path if complexity grows
