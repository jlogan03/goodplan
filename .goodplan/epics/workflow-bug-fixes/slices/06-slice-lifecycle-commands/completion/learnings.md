# Learnings: Slice 06 — Slice Lifecycle Commands

## Domain

### Chunk verification semantics
`chunk-unverifiable` alone does NOT mean the chunk is "decided" — the follow-up `chunk-unverifiable-decided` event is required. This two-step pattern ensures user oversight for unverifiable chunks while keeping the event stream auditable.

### Landing is event-only
`slice:land` emits the `slice-landed` event and nothing more. Deferred-item routing, learnings rollup, and architecture delta propagation are skill-level concerns. This keeps the CLI command composable and testable.

## Architecture

### Shared command context helper
Extracting `createEventCommandContext` into `src/commands/_shared/command-context.ts` eliminated ~15 lines of duplicated boilerplate from every mutating command. The generic overload pattern (`requireSlice: true` vs `false`) provides type-safe access to `sliceName` without runtime casts.

### Epic-scoped events for slices
Slice and chunk events live in `epics/<name>/events.jsonl` with identity in payload fields (`sliceRef`, `chunkId`), NOT in separate per-slice files. This was architecturally specified but worth reaffirming — it simplifies replay and cross-slice queries.

### ContextBundle at phase boundaries
Three phase-starting commands (`plan-draft`, `implement-start`, `code-refine-start`) return ContextBundle in their JSON output. This enables skills to pass assembled context directly to agents without a separate bundler call.

## Code Patterns

### Conditional spread for exactOptionalPropertyTypes
Under `exactOptionalPropertyTypes: true`, Zod `z.array(...).optional()` produces `T[] | undefined` which is not assignable to `?: T[]`. The pattern `...(value ? { field: value } : {})` solves this consistently. Used in `land.ts`, `plan-draft.ts`, and others.

### MutatingCommandOutput interface
Introduced `{ ok: true; event: string; entity: string }` as a standard return shape for all mutating commands. Provides a consistent contract for skills to parse.

### v1 fallback shim in list/show
`slice:list` and `slice:show` fall back to reading `overview.json`/`slice.json` when no v2 events exist. This enables the v2 CLI to work against repos still using v1 state. Marked with TODO comments — removable after slice 12 migration.

## Dependencies

### Bun-specific APIs needed Vitest compatibility
Phase 1 encountered Bun-specific API usage that needed adaptation for Vitest test runner compatibility.

## Plan Accuracy

### High accuracy
The refined plan closely matched implementation. All 21 commands were implemented as specified in `architecture/commands.md`. The only notable divergences:
- Phase 3 discovered 2 invariant rule event name drifts (CRITICAL fix) — the invariant rules referenced stale event names
- `land.ts` SPLIT decision was planned but the scope boundary (event-only vs skill-level routing) was clarified during implementation
- `code-refine-start` uses phase `P10` for context bundle (matching implement-start), which may need correction to `P11` in a future pass
