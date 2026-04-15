# Context Layer

Depends on the Engine Layer (reads `DerivedState`). Single subsystem: Context Bundler. Assembles per-phase context bundles with token budgeting and inline/reference selection.

## Context Bundler (`src/context/`)

### Purpose

Replaces the v1 context system (`collect.ts`, `budget.ts`, `priorities.ts`) which operated on the mutable `ProjectState` tree. The v2 bundler reads from event-log-derived state with explicit per-phase inline/reference distinctions.

### Core Interface

```typescript
interface ContextBundle {
  phase: Phase;
  scope: ScopeRef;
  inline: InlineSection[];      // full content included in prompt
  references: ReferenceSection[]; // paths + summaries, content on demand
  tokenBudget: TokenBudget;
}

interface InlineSection {
  key: string;            // e.g. "architecture-current", "plan", "conventions"
  content: string;        // full markdown content
  estimatedTokens: number;
}

interface ReferenceSection {
  key: string;
  path: string;           // relative path within .goodplan/
  summary: string;        // 1-2 sentence summary for the agent
  estimatedTokens: number; // tokens if the agent requests full content
}

interface TokenBudget {
  total: number;          // max tokens for this bundle
  inlineUsed: number;     // tokens consumed by inline sections
  referenceReserve: number; // tokens reserved for on-demand reference expansion
  remaining: number;      // available for agent working memory
}
```

### Integration with Entity Commands

Context bundles are not a standalone CLI command. Instead, phase-starting entity commands (e.g., `gp epic:explore-start`, `gp slice:plan-draft`, `gp slice:implement-start`) return a `ContextBundle` as part of their `--json` output. The `src/context/` module is called internally by these commands to assemble the bundle.

Each agent type may receive a different budget (phase agents get larger budgets than reviewer agents). Skills read the context bundle from the phase-starting command's output and pass it to spawned agents.

### Per-Phase Bundle Specs

**Core principle: the budget limits inline content only. References are never budget-limited.** Every context bundle includes the full list of reference paths regardless of budget. The agent can always read any referenced file — the budget controls how much is pre-loaded into the prompt, not how much the agent can see. This is an optimization for context window efficiency, not an information gate.

The key design decision: which artifacts are **inlined** (full content in the prompt) vs **referenced** (path + summary, expandable on demand). This varies by phase because each phase needs different context.

| Phase | Inline | Referenced |
|---|---|---|
| P1 (epic-capture) | `architecture-current`, `conventions`, subsystem registry (with maturity), active decisions | Recent learnings, exploration artifacts |
| P2 (explore) | Epic goal, `architecture-current`, relevant research | Subsystem docs, prior exploration cycles |
| P3 (architecture) | Epic goal, `architecture-current`, exploration conclusions, subsystem registry | `conventions`, prior architecture drafts |
| P4 (pressure-test) | `architecture-target`, epic goal, subsystem registry | `architecture-current` (for delta comparison), `conventions` |
| P5 (slice-set) | `architecture-target`, pressure test findings, epic goal | Subsystem docs, `conventions` |
| P6 (activate) | Epic summary (goal + architecture + slices), `architecture-current` | Full slice details |
| P7 (slice-plan-draft) | Slice goal, `architecture-target`, `architecture-current`, relevant subsystem docs | Other slice plans, `conventions` |
| P8 (plan-shape) | Slice plan draft, slice goal, `architecture-target` | `architecture-current`, subsystem docs |
| P9 (slice-plan-refine) | Slice plan, reviewer feedback, `architecture-target` | `architecture-current`, subsystem docs |
| P10 (implement) | Plan (with chunks), `architecture-current` (honest baseline) | `architecture-target`, subsystem docs, `conventions` |
| P11 (code-refine) | Code diff, reviewer feedback, plan chunks | `architecture-current`, test output |
| P12 (slice-land) | Slice summary, chunk evidence, `architecture-current` | `architecture-target` (for reconciliation), learnings |

**Design rationale (from delta 1.8):** P10 (implementation) gets `architecture-current` inline because the implementer needs the honest baseline of what the codebase IS, not what it aspires to be. P3 (architecture design) gets both because the designer needs to understand the current state to plan the target.

### Architecture-Current vs Architecture-Target Selection

Two architecture documents exist with different semantics:

- **`architecture-current.md`** (at `.goodplan/` root) — what the codebase IS. Updated at every P12. Spine-protected.
- **`architecture-target.md`** (inside each epic directory) — what the codebase is BECOMING. Drafted during P3, frozen after P5.

The bundler selects which to inline based on the phase's needs:

| Need | Phases | Which document |
|---|---|---|
| Honest baseline for implementation | P10, P11, P12 | `architecture-current` inline |
| Target for planning/review | P3, P4, P5, P7, P8, P9 | `architecture-target` inline |
| Both for comparison | P3 (drafting), P6 (activation review) | Both inline |
| Neither (not architecture-relevant) | P1, P2 | `architecture-current` inline (background context) |

### Token Budgeting Strategy

Token budgets are configured per phase and per agent type:

```typescript
interface BudgetConfig {
  // Per-phase base budgets (tokens)
  phaseBudgets: Record<Phase, number>;

  // Agent-type multipliers (applied to phase budget)
  agentMultipliers: {
    phase: 1.0;        // full budget
    editor: 0.8;       // slightly reduced
    reviewer: 0.5;     // reviewers need less context
    synthesis: 0.3;    // synthesis gets summaries only
  };
}
```

**Budget allocation order:**
1. Mandatory inline sections first (e.g., the plan in P10 is always inlined)
2. Priority inline sections next (ranked by phase-specific priority)
3. Remaining budget allocated to reference reserve
4. If mandatory sections exceed budget, warn but do not truncate

**Back-of-envelope estimate:** Typical context bundles range from 5K-30K tokens depending on phase. P10 (implementation) is the heaviest due to full plan + architecture-current + subsystem docs. P11 (code refinement) may exceed budgets if code diffs are large -- the bundler truncates diffs to the changed-file subset relevant to the current chunk.

### Trust Data Access

The Context Bundler needs convergence state and reviewer scores to assemble review-phase bundles (P9, P11). Rather than importing `src/trust/` directly (which would violate the layer dependency rule), this data flows through `DerivedState`.

The Engine Layer's `DerivedStateData` includes trust-related projections computed from trust events in the event log (see [engine.md](./engine.md#core-interface) for the full `DerivedStateData` definition, including `convergenceSnapshots` and `latestDimensionScores` fields). The projection types (`ConvergenceSnapshot`, `DimensionScore`) are defined in `src/schemas/` (shared layer) so both engine and trust layers import from the same source without cross-layer coupling.

The Context Bundler accesses trust data via the standalone accessor functions `convergenceState()` and `latestScores()`, which operate on `DerivedStateData`.

This keeps the dependency direction clean: Context reads Engine (`DerivedStateData`), Engine reads event log (which contains trust events). The Trust Layer remains a peer that Context never imports.

## Cross-References

- Engine layer (DerivedState): [engine.md](./engine.md)
- Trust layer (convergence, reviewers): [trust.md](./trust.md)
- Architecture split design: [brainstorm/11-delta.md](../brainstorm/11-delta.md) section 1.8
- Context bundle retirement: [brainstorm/11-delta.md](../brainstorm/11-delta.md) section 4.5
