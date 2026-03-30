# Context Module API

## Purpose

Budget-based content assembly for sub-agent context bundles. Peer module alongside the RPC Layer at `src/core/context/`. Assembles prioritized content for each workflow phase, inlining markdown within a configurable budget.

## Position in the Architecture

The Context module is a peer of the RPC Layer, not a child of it:

```
Commands ──┬──> RPC Layer ──> State Machine
           │        │
           │        v
           └──> Context ──> Data Layer (tree reads only)
```

- **Commands layer** uses Context for `start-*` commands (read-only context assembly)
- **RPC Layer** uses Context for `--inline` on mutation results (e.g., `complete()`)
- **Context** reads from the `ProjectState` tree (passed in, not loaded internally)
- **Context** has no dependency on the State Machine

## Interface

```typescript
function startContext(
  state: ProjectState,
  phase: SubmitPhase,
  target: Target,
  options?: StartContextOptions
): ContextBundle;
```

**Sole owner of `startContext`.** This is the canonical definition — the RPC layer re-exports it for `--inline` use on mutation results, but does not define its own version. `start-*` commands route directly from Commands to this module (Commands → Context → Data Layer), bypassing the RPC layer entirely.

Takes a caller-provided `ProjectState` for testability — does not call `loadState()` internally. This allows both the RPC layer (which already has state loaded) and the Commands layer (which loads state separately) to use the same function without redundant I/O.

### ContextBundle

```typescript
interface ContextBundle {
  inline: Record<string, string>;    // key -> markdown content (within budget)
  references: string[];               // file paths for remaining content
  decisions: DecisionSummary[];
  learnings: LearningSummary[];
}
```

### StartContextOptions

```typescript
interface StartContextOptions {
  inlineContext?: boolean | number;  // true = default budget (~20-30KB), number = custom budget in bytes
}
```

### Per-Phase Content Priority

Each phase has a hardcoded priority list. Content is inlined in priority order until the budget is exhausted. Without `--inline`, only references are returned.

| Phase | Priority order (highest first) |
|---|---|
| plan | Entity goal, current architecture, target architecture, conventions, active decisions, recent learnings |
| refinement | Plan, entity goal, current architecture, target architecture, conventions, decisions |
| implementation | Refined plan, entity goal, current architecture, target architecture, conventions, relevant learnings |
| complete | Entity goal, remaining slice overview, implementation results, current architecture, target architecture, learnings at all levels |
| explore | Epic goal, existing research/brainstorm, conventions, completed epics, completed quests, pending quests |
| architecture | Epic goal, exploration output, conventions, existing architecture |
| slices | Epic goal, full architecture, conventions, learnings |
| refine-architecture | Epic goal, current architecture, exploration output, conventions, decisions, learnings |
| refine-slices | Epic goal, full architecture, current slice definitions, conventions, learnings |

### Tree Traversal for Directory References

When a priority item references a directory (e.g., "current architecture"), the context module resolves it to a `DirectoryEntry` node via `resolve(state, path)` and walks `DirectoryEntry.contents` recursively, collecting all `MarkdownEntry` children for inlining. JSON/JSONL entries within directories are not inlined — only markdown content is eligible.

## Contracts

### Budget Enforcement

With `--inline=N`, the total size of inlined content never exceeds N bytes. Content is inlined in the phase's priority order until the budget is exhausted.

### No State Mutation

The context module is read-only. It never modifies `ProjectState`, never calls `commitState()`, and never writes to the filesystem.

### No State Machine Dependency

The context module does not import from or depend on the State Machine. It reads tree types and Data Layer accessor helpers only.

## Dependencies

- Tree navigation helpers: `resolve()`, `getJson()`, `getDir()`, `getMarkdown()`, etc.
- Tree types: `ProjectState`, `DirectoryEntry`, `MarkdownEntry`
- Shared types from `src/schemas/` (for `DecisionSummary`, `LearningSummary`, `SubmitPhase`, `Target`)

## Fitness Functions

**Implementation priority:** These fitness functions should be implemented early in the epic, especially the "no State Machine imports" check — it enforces the architectural boundary that makes the Context module independently testable.

### Context budget is respected

- **Test file:** candidate — not yet written
- **Verifies:** With `--inline=N`, the total size of inlined content never exceeds N bytes

### Context module has no State Machine imports

- **Test file:** candidate — implement early (enforces architectural boundary)
- **Verifies:** AST or import scan of all files in `src/core/context/` confirming no imports from `src/core/state/`
