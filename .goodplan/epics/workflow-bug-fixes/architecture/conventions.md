# Architectural Conventions — goodplan v2

Conventions specific to this epic. These supplement the project-level conventions in `.goodplan/conventions.md`.

## Layer Boundary Enforcement

Every import must respect the dependency hierarchy. This is enforced by fitness tests.

```
schemas/, util/    <- leaf modules, no internal imports
engine/            <- imports only schemas, util
trust/             <- imports engine, schemas, util
context/           <- imports engine, schemas, util
commands/          <- imports anything in src/
```

**No cross-imports between peer layers:** `trust/` must not import `context/`, and vice versa.

## Event Design Conventions

### Naming

- Event types use `kebab-case`: `epic-goal-committed`, `chunk-red-test-failed`
- Event type names follow `<entity>-<action>-<qualifier>` pattern
- Past tense for completed actions: `committed`, `captured`, `landed`
- Present participle for state transitions: (avoid — use past tense)

### Payload Design

- Every payload is a distinct Zod schema, not a generic `Record<string, unknown>`
- Payloads reference artifacts via `ContentRef`, not inline content
- Payloads include only the data needed to reconstruct the state change — not the full entity

### Envelope Discipline

- `actor.kind` distinguishes user-initiated vs CLI-internal vs skill vs agent events
- `branch` is always populated (even if `main`)
- `commitHint` is best-effort — null if not in a git repo or HEAD is detached
- `prevId` is mandatory for all events except the first in a scope

## Schema Conventions

- All schemas in `src/schemas/` using Zod v4
- Event schemas use `z.discriminatedUnion()` (not `z.union()`) for better error messages and performance
- Two-level nesting: outer discriminant on `domain`, inner on `type`
- Error codes use `z.enum()` for compile-time safety
- One file per event domain (not per event type)
- Shared types (`ContentRef`, `EventEnvelope`, timestamps) in dedicated files
- Trust projection types (`ConvergenceSnapshot`, `DimensionScore`) are defined in `src/schemas/` so both engine and trust layers import from the same source -- no cross-layer coupling
- Entity schemas (what's computed from events) separate from event schemas (what's stored)
- The `exactOptionalPropertyTypes` workaround applies: use conditional spread for optional Zod properties

## Command Conventions

- All commands are entity-namespaced: `gp <entity>:<verb>` (no bare verbs)
- Read-only commands never emit events
- Mutating commands always emit exactly one primary event
- Error output is structured JSON to stderr with a `code` field
- `--json` mode implies no interactive prompts (skills always use `--json`)
- `--override=<reason>` is the only way to bypass convergence gates (scoped to `gp refine:*` commands), and it emits a `convergence-overridden` event
- Human-facing destructive commands use inline confirmation (no global `--force` flag)

## Artifact Naming

All artifact files follow the date-prefix pattern:

```
<YYYY-MM-DD>_<slug>_<suffix>.md
```

- Date is creation date
- Slug is kebab-case descriptor
- Suffix is a short random string for uniqueness

Epic directories: `<YYYY-MM-DD>_<slug>/`
Side-quest directories: `<YYYY-MM-DD>_<slug>/`

## Subsystem Ownership

Every file in `src/` belongs to exactly one subsystem. Ownership is tracked in subsystem registry files at `.goodplan/subsystems/<slug>.md`. The `owns` field lists glob patterns.

No file should be owned by zero subsystems (orphan) or two+ subsystems (conflict).

## Testing Conventions

- Mirror `src/` structure in `tests/`: `tests/engine/`, `tests/trust/`, `tests/commands/`
- Invariant tests written BEFORE retiring v1 transition guards (the test becomes the spec)
- Event engine tests use in-memory JSONL (no filesystem for unit tests)
- Integration tests use temp directories with real filesystem
- E2E tests use Agent SDK harness at `tools/dogfood/` with opus model

## Plugin Conventions

- Skills call CLI commands, never import `src/`
- Agents return structured JSON matching the `AgentReturn` envelope
- Reviewer agents produce `ReviewerPayload` with dimension scores and findings
- Hook scripts are pure bash — no node/python runtime dependency
- Reviewer files use YAML frontmatter for structured metadata

## Integrity Files (Hook-Protected)

The following files are protected from direct LLM writes by `protect-state.sh`. All mutations must go through CLI commands.

- `events.jsonl` (any scope: project, epic, side-quest)
- `architecture-current.md` (spine)
- `conventions.md` (spine)
- `invariants.md` (spine)
- All `*.jsonl` files under `.goodplan/`

**Allowed direct writes:** Artifact content files (plans, goals, research, brainstorms) and reviewer/rubric files in `.goodplan/reviewers/`.

## Error Handling

- CLI returns structured errors with a fixed set of error codes (see [commands.md](./commands.md#error-codes) for the canonical list)
- `SCHEMA_INVALID` from extractors is retryable (skill asks agent to fix the block)
- `INVARIANT_FAILED` is never retryable without changing the precondition
- `CONVERGENCE_STUCK` surfaces to user with override option
- Empty catch blocks are forbidden — log or rethrow

## Deferred Features

The following were considered for v2 but deferred to reduce surface area. Build if demand emerges post-launch.

- **`--dry-run`** — preview mutations without appending events. Deferred to post-v2 launch; build if demand emerges.
- **`gp phase:*`** — generic phase wrappers (`phase:start`, `phase:submit`, `phase:transition`) for scripting use. Deferred; skills call entity commands directly (e.g., `gp slice:plan-draft` instead of `gp phase:start plan`).
- **`gp completions`** — shell completion script generation for bash/zsh/fish. Deferred to post-v2 launch.

## Cross-References

- Engine layer (event envelope, derived state, invariants): [engine.md](./engine.md)
- Trust layer (convergence, extractors, reviewers): [trust.md](./trust.md)
- Command layer (CLI surface, error codes): [commands.md](./commands.md)
- Plugin architecture (skills, agents, hooks): [plugin.md](./plugin.md)
- Migration strategy: [migration.md](./migration.md)
