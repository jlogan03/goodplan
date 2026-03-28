# Codebase Context: 02-project-init

_Generated 2026-03-22_

## Documentation Freshness

| Document | Last Commit | Status |
|---|---|---|
| `architecture/*.md` (all 8 files) | `4256c74` — Refine architecture: integrate recursive tree model | **Fresh** — most recent architecture revision, post tracer-bullet |
| `.project/conventions.md` | `4256c74` — same commit | **Fresh** — updated alongside architecture |
| `.project/learnings.md` | `617a990` — Complete tracer bullet slice | **Slightly stale** — predates architecture refinement, but content is still valid (learnings are append-only) |
| `src/` code | `0d723dc` — tracer-bullet Phase 5 | **Fresh** — all code is from tracer bullet, no subsequent code changes |

Architecture docs and source code are in sync. Both reflect the state after the tracer bullet + architecture refinement cycle. No divergence risk.

## Recent Development Activity

All source code was written in a single tracer bullet slice (5 commits, `9ccd248..0d723dc`). Since then, only planning/architecture commits have landed (no code changes). The codebase is small and stable:

- **Total source files:** 13 TypeScript files across `src/`
- **Total test files:** 10 test files across `tests/unit/`
- **No churn areas** — everything was written once during the tracer bullet

## Existing Code Inventory

### What exists (tracer bullet output):

| Path | Purpose | Plan disposition |
|---|---|---|
| `src/core/data/json.ts` | `readEntity()`, `writeEntity()` — single-file JSON CRUD | **Replace** — superseded by `assembleState`/`commitState`. Keep `deterministicStringify` (already in `src/util/json.ts`). |
| `src/core/data/project.ts` | `resolveProjectDir()`, `readProject()`, `writeProject()` | **Partial keep** — `resolveProjectDir()` stays. `readProject`/`writeProject` removed. |
| `src/commands/global/init.ts` | Direct `.project/` creation + `writeProject()` | **Refactor** — rewire through RPC `init()` |
| `src/commands/global/status.ts` | `buildStatusResult()` via `readProject()`, jq query support | **Refactor** — use `assembleState()` instead of `readProject()` |
| `src/schemas/entities/project.ts` | `projectSchema` + `Project` type | **Keep** — already matches architecture data model |
| `src/schemas/shared.ts` | `timestampSchema`, `versionSchema` | **Keep** — reusable by new entity schemas |
| `src/schemas/commands/status.ts` | `StatusResult` schema | **Keep** |
| `src/schemas/error-output.ts` | Error output schema | **Keep** |
| `src/util/errors.ts` | `GoodplanError` with typed error codes | **Extend** — new state error codes needed |
| `src/util/json.ts` | `deterministicStringify()` | **Keep** |
| `src/util/output.ts` | Output formatting | **Keep** |
| `src/util/stdin.ts` | Stdin reading | **Keep** |
| `src/util/validate.ts` | Input validation | **Keep** |

### What needs to be created:

| Path | Phase |
|---|---|
| `src/core/data/tree.ts` | Phase 1 — StateEntry types, navigation helpers, setEntry, ZERO_STATE |
| `src/schemas/entities/epic.ts` | Phase 2 |
| `src/schemas/entities/slice.ts` | Phase 2 |
| `src/schemas/entities/quest.ts` | Phase 2 |
| `src/schemas/entities/overview.ts` | Phase 2 |
| `src/schemas/records/activity-log.ts` | Phase 2 |
| `src/schemas/records/decision.ts` | Phase 2 |
| `src/schemas/records/learning.ts` | Phase 2 |
| `src/schemas/records/architecture-delta.ts` | Phase 2 |
| `src/schemas/state-events.ts` | Phase 2 |
| `src/core/data/schema-registry.ts` | Phase 2 |
| `src/core/data/assemble.ts` | Phase 3 |
| `src/core/data/commit.ts` | Phase 3 |
| `src/core/state/reduce.ts` | Phase 4 |
| `src/core/state/transitions/init.ts` | Phase 4 |
| `src/core/state/types.ts` | Phase 4 |
| `src/core/rpc/init.ts` | Phase 5 |

### Directories that don't exist yet:

- `src/schemas/records/` — new directory for JSONL record schemas
- `src/core/state/` — exists as empty dir (only `.gitkeep` equivalent)
- `src/core/state/transitions/` — new
- `src/core/rpc/` — new

## Key Decisions and Constraints

### TypeScript strictness (from tsconfig.json + CLAUDE.md)
- `noUncheckedIndexedAccess: true` — every `Record<string, T>` lookup returns `T | undefined`
- `exactOptionalPropertyTypes: true` — careful with optional vs nullable
- `verbatimModuleSyntax: true` — explicit `type` imports required

This is critical for `tree.ts` navigation helpers. `resolve()` must handle `undefined` at every step of path traversal. `DirectoryEntry.contents` access always returns `StateEntry | undefined`.

### Zod 4.x
Package.json pins `zod: ^4.0.0`. The architecture mentions Zod 4.x. Schema syntax should use Zod v4 API (mostly same as v3, but check `safeParse` return shape if it changed).

### No mocks for filesystem (conventions.md)
Tests use real temp directories with real `.project/` structures. This affects Phase 3 (assembleState/commitState) test design — need fixture directories, not mock fs.

### Debug logging convention
Plan specifies `GOODPLAN_DEBUG=1` for stderr logging. Conventions say `--verbose` for diagnostics. The plan's `GOODPLAN_DEBUG` env var approach is specific to this slice; need to ensure it doesn't conflict.

### citty + exactOptionalPropertyTypes friction (from learnings.md)
Known issue: `CommandDef<ArgsDef>` needs `as unknown as CommandDef` casts. Already handled in tracer bullet, but new command changes should be aware.

## Architecture Alignment Check

### Plan vs architecture — no conflicts detected

The plan faithfully implements the architecture docs:
- **Tree types** (Phase 1) match `data-model.md` StateEntry definition exactly
- **Schema registry** (Phase 2) matches the registry in `data-model.md` and `data-layer-api.md`
- **assembleState/commitState** (Phase 3) match `data-layer-api.md` signatures
- **reduce + INIT_PROJECT** (Phase 4) match `state-machine-api.md`
- **RPC wiring** (Phase 5) matches `rpc-layer-api.md` pattern

### Deferred items (explicitly out of scope per plan)
- **State cache** (`loadState()`, `.state-cache.json`) — deferred to slice 03
- **Concurrent modification detection** — deferred to slice 03
- **`commitState()` skips markdown entries** — by design (LLM writes markdown directly)

### INIT_PROJECT transition table alignment
From `transition-tables.md`: `(none) | INIT_PROJECT | — | — | — | project` — no guard, creates project.json. The plan's Phase 4 INIT_PROJECT handler adds a guard (project.json must not exist), which is correct — this is the error path, not a transition guard. The "already initialized" check can happen either in the state machine (via `hasChild`) or pre-flight in the command (checking `.project/` existence). Plan says both: state machine checks tree, command checks filesystem. This matches the tracer bullet learning about checking cwd directly.

### Error code coverage
`src/util/errors.ts` already defines `STATE_ALREADY_INITIALIZED` and `STATE_INVALID_TRANSITION`. These are the two state error codes needed for Phase 4. No new error codes need to be added to the union type for this slice.

## Test Structure Notes

Existing test layout:
```
tests/unit/commands/init.test.ts    — tests direct file write (will need refactoring in Phase 5)
tests/unit/commands/status.test.ts  — tests readProject path (will need refactoring in Phase 5)
tests/unit/data/json.test.ts        — tests readEntity/writeEntity (may become obsolete)
tests/unit/data/project.test.ts     — tests resolveProjectDir/readProject/writeProject
tests/unit/schemas/*.test.ts        — schema validation tests (keep as-is)
tests/unit/util/*.test.ts           — utility tests (keep as-is)
```

New test files needed:
```
tests/unit/data/tree.test.ts        — Phase 1
tests/unit/schemas/entities/*.ts    — Phase 2 (multiple files)
tests/unit/schemas/records/*.ts     — Phase 2 (multiple files)
tests/unit/data/assemble.test.ts    — Phase 3
tests/unit/data/commit.test.ts      — Phase 3
tests/unit/state/reduce.test.ts     — Phase 4
```

## Risk Areas

1. **Zod 4 API surface** — if Zod 4 changed `safeParse` return types or schema definition syntax, existing patterns in `json.ts` may need adjustment. Quick check: existing code uses `z.object()`, `z.string()`, `.safeParse()` — these are stable across Zod versions.

2. **`setEntry` immutability** — building a new tree via `setEntry` requires careful handling of intermediate directories that may not exist. The plan calls this out explicitly as an edge case to test.

3. **JSONL append detection in commitState** — comparing array lengths to detect new entries assumes entries are never removed or reordered. This is correct per architecture (JSONL is append-only), but the implementation must not accidentally trigger a full rewrite if content objects are compared by reference vs value.

4. **Phase 5 migration** — removing `readProject`/`writeProject` while keeping `resolveProjectDir` means updating imports in all callers. The current callers are: `init.ts`, `status.ts`, `project.test.ts`. Small blast radius.
