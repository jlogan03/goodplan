# Subsystem Architecture

## Four-Layer Stack

Strict unidirectional dependency tree:

```
Commands (thin CLI layer — citty, parsing, output formatting)
    ↓
RPC Layer (workflow orchestration, context bundling)
    ↓ validates transitions     ↓ reads/writes entities
State Machine                Data Layer
(pure rules engine)          (JSON/JSONL I/O, Zod schemas)
                                 ↓
                             Filesystem
```

### Commands Layer

- citty command definitions, one file per command
- Input parsing (flags + stdin merge)
- Output formatting (human-readable, JSON, quiet)
- Thin — delegates immediately to RPC or Data Layer
- Resource commands (CRUD) go directly to Data Layer, bypassing RPC and State Machine

### RPC Layer

- Workflow operations: `begin`, `complete`, `context`, `status`
- Coordinates State Machine and Data Layer
- Context bundling: assembles phase-appropriate context, `--inline` for content inlining with budget
- The "impure shell" — all I/O coordination happens here
- Reads state from filesystem via Data Layer, passes to State Machine, writes results back

### State Machine

- Pure rules engine — reducer + transition table
- No I/O, no filesystem access
- Takes (state, event, context) → returns (new state, new context) or error
- Handles: entity lifecycle, transition validation, guards (activation gate, sequential slices, etc.)
- Tracks: refinement rounds, scores, circuit breaker state, implementation phases

### Data Layer

- Entity CRUD for all JSON/JSONL structures
- Atomic file operations with deterministic key ordering
- Zod schema validation on all reads and writes
- The only layer that touches the filesystem

## Key Properties

- **Unidirectional dependencies** — no layer reaches upward
- **State Machine is pure** — testable without filesystem
- **Data Layer is mechanical** — no business logic, just validated I/O
- **RPC Layer is the coordinator** — knows what a complete workflow operation looks like

## Data Ownership

| Data | Write Path | Enforcement |
|---|---|---|
| JSON/JSONL (state, metadata) | CLI only (Data Layer) | Hard — CLI validates all writes |
| Lifecycle-bound markdown (goals, plans) | CLI `write-<field>` commands | Hard — CLI checks state before writing |
| Free-form markdown (architecture, research, brainstorm) | LLM direct edit | Soft — CLI warns at read time if something looks off |

Full filesystem abstraction for all content (including free-form markdown) was considered but deferred — adds complexity without pressing need. The CLI mediates lifecycle-bound content; the LLM edits free-form content directly. Can revisit if path coupling becomes a problem.

## State Transition Data Flow

```
RPC Layer:
  1. reads current state from filesystem (via Data Layer)
  2. passes state + event + context to State Machine

State Machine:
  3. validates transition, runs guards
  4. returns new state + updated context (or error)
  (no side effects — pure function)

RPC Layer:
  5. writes new state to filesystem (via Data Layer)
  6. appends to activity log (via Data Layer)
  7. assembles context bundle if needed (via Data Layer)
  8. returns result to Commands layer
```
