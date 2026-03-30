# Architectural Conventions

## Patterns and Abstractions

### Reducer Pattern

The State Machine uses a reducer pattern: `(state, event, context) → (new state, new context | error)`. Transition rules are declared in typed tables, validated by a generic reducer function. Guards on transitions encode business rules (activation gate, sequential slice enforcement, circuit breakers). The state machine is pure — no I/O.

### Command Routing

Commands are one of two types:
- **Resource commands** (entity CRUD): Commands → Data Layer (skip RPC and State Machine)
- **Workflow commands** (`begin`, `complete`, `context`, `status`): Commands → RPC Layer → State Machine + Data Layer

### Schema-Driven Validation

All external input (CLI flags, stdin JSON) is validated by Zod schemas at the Commands layer boundary before reaching the RPC layer. Internal interfaces between layers trust their inputs — no defensive re-validation.

## Module and Boundary Rules

### Layer Boundaries

- Dependencies are strictly unidirectional: Commands → RPC → State Machine + Data Layer
- No layer may import from a layer above it
- The State Machine may not import from the Data Layer (pure, no I/O)
- Shared types (schemas, error types) live in `src/schemas/` and are imported by any layer

### Command Structure

- One file per command in `src/commands/`, organized by namespace (`epic/`, `build/`, `resource/`, `global/`)
- Commands are thin: parse input, call RPC or Data Layer, format output
- No business logic in command files

### Data Ownership

- **JSON/JSONL**: CLI-owned. All structural data, metadata, state, goals, verification criteria, learnings, decisions, activity log. All writes go through the Data Layer with Zod validation.
- **Free-form markdown**: LLM-owned content and internal structure, CLI-owned root paths. Architecture files, research, brainstorm, plans. The CLI creates root directories and returns their paths in command responses so the LLM always writes to the correct location. Within those directories, the LLM is free to create whatever file and subdirectory structure it needs. The CLI reads these files for context bundling.

## Cross-Cutting Concerns

### Error Handling

Structured errors with namespaced codes (e.g., `STATE_INVALID_TRANSITION`, `VALIDATION_MISSING_FLAG`). Every error returns the same JSON shape: `{ error: { code, message, detail? } }`. Exit codes: 0 success, 2 validation/usage errors, 1 all other errors. No empty catch blocks.

### Output Modes

- **Default**: human-readable, colored terminal output (picocolors)
- **`--json`**: structured JSON for LLM consumption
- **`--quiet`**: minimal output for scripting
- **`--query`**: jq-style post-processing filter on any JSON output (via jqjs)
- **`--inline-context`**: include prioritized content in context bundles (budget-based)

### Activity Logging

Every state transition appends to `activity-log.jsonl` via the RPC layer. The Data Layer handles the append; the RPC layer decides when to log.

### Deterministic JSON

All JSON files use alphabetical key ordering for git merge friendliness. JSONL files are append-only.

### Stateless Commands

Every command is self-contained — target flags required on every call. No implicit state from prior commands. Enables safe concurrent sessions.
