# Architecture Overview

## System Summary

`goodplan` is a compiled TypeScript CLI that serves as the single interface to `.goodplan/` state for both humans and LLMs. It owns all deterministic workflow mechanics — state management, transition validation, file I/O, context bundling, and activity logging — while the LLM retains ownership of judgment-driven work (interviewing users, writing content, reviewing, scoring).

The system is a four-layer stack with strict unidirectional dependencies: Commands → RPC Layer → State Machine + Data Layer → Filesystem. Read-only commands (`list`, `show`) bypass the RPC layer and go directly from Commands to the Data Layer.

The CLI and skills are distributed as a Claude Code plugin (`goodplan`). The plugin bundles the compiled binary (`bin/gp` launcher), all 12 workflow skills (namespaced as `/gp:<skill-name>`), 34 agent definitions, and state protection hooks. Users install via `/plugin marketplace add ian97531/goodplan`.

## Subsystems

### Commands

Thin CLI layer built on citty. Responsible for argument parsing (flags + stdin JSON merge), output formatting (human-readable, `--json`, `--quiet`), and routing to the RPC layer or Data Layer. One file per command. Read-only commands (`list`, `show` in each entity namespace) route directly to the Data Layer. Workflow mutation commands (`create`, `plan`, `complete`, etc.) and sub-agent commands (`start-*`, `submit-*`) route to the RPC layer.

**Dependencies:** RPC Layer, Data Layer

### RPC Layer

Workflow orchestration layer. Coordinates the State Machine and Data Layer to execute complete workflow operations. Responsibilities:

- Hydrate entity state from filesystem, feed to State Machine, write results back
- Append to activity log on every state transition
- Assemble context bundles for each phase (with `--inline` budget-based content inlining). Context bundling is a peer module alongside the RPC layer (`src/core/context/`) — depends on tree types, schema types, and RPC types, consumed by both the RPC layer (for `--inline` on mutations) and the Commands layer (for `start-*` commands).
- Handle implicit transitions (e.g., all slices complete → epic needs completion)
- Enforce completion flow ordering (verify goal → deferred work → arch delta → learnings)
- Compute `nextCommands` after each mutation via a `commandMappings` registry that maps `(entityType, status)` pairs to available commands

**Dependencies:** State Machine, Data Layer

### State Machine

Pure rules engine with no I/O. Implements a reducer pattern over declarative transition tables: `(state, event) → new state | error`. Manages lifecycle for all entity types (project, epic, slice, quest, task) including guards (activation gate, sequential slice enforcement, circuit breakers) and tracking state (refinement rounds, scores, implementation phases). Tasks are a lightweight capture entity with a simple open → converted/dropped lifecycle; `CONVERT_TASK` atomically creates a quest or epic from a task using inlined entity creation (no recursive reduce).

**Dependencies:** Shared Tree Types (`src/core/tree.ts` — pure types and helpers with zero I/O, shared across State Machine and Data Layer)

### Data Layer

Entity CRUD and all filesystem I/O. Reads and writes JSON/JSONL with Zod schema validation. Enforces deterministic key ordering for git merge friendliness. Handles atomic file operations. Maintains an embedded HMAC-SHA256 `stateSignature` in `goodplan.json` for state integrity — computed over the serialized state tree on every write, verified on every read. Materializes state machine output onto the filesystem — creates directories and files as needed, including LLM content directories (research/, brainstorm/, architecture/). `assembleState()` handles uninitialized projects by returning a zero state. Lifecycle-bound markdown (goals, plans) is written through CLI `submit-*` commands with state validation (see commands-api.md Sub-Agent Commands). Free-form markdown (architecture, research, brainstorm) is read by the CLI for context bundling but written directly by the LLM.

**Dependencies:** Filesystem

## Key Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| Bun | 1.3.x | Runtime, compiler (`bun build --compile`), package manager |
| citty | 0.2.x | CLI framework (command routing, argument parsing) |
| Zod | 4.x | Schema validation, type inference |
| @michaelhomer/jqjs | 1.6.x | `--query` flag implementation (jq-style JSON filtering) |
| picocolors | 1.1.x | Terminal color output |
| Vitest | 4.x | Test framework |

## Deployment Model

Single compiled binary per platform via `bun build --compile`. Target platforms: darwin-arm64, darwin-x64, linux-x64. Binary size ~57 MB (acceptable for a development tool; Go port is the path to smaller binaries if needed).

**Known Platform Gaps:** windows-x64 is aspirational. Bun's Windows support is maturing but not production-ready for compiled binaries. Known concerns: `fs.rename` atomicity differences, path separator handling in state keys. Windows support will be revisited when Bun's Windows maturity improves.

Distributed as a Claude Code plugin via marketplace. CI builds the plugin on version tag push (`v*`), assembles skills/hooks/binary into `dist/gp-plugin/`, and force-pushes to a `release` branch. Users install via `/plugin marketplace add ian97531/goodplan`. The plugin includes a `bin/gp` shell launcher that detects the host platform and executes the correct platform-specific binary from `bin/`. Skills reference the CLI as `$GP` (resolved by the launcher). Skills are namespaced as `/gp:<skill-name>`. The CLI and skills are versioned together — skill prompts contain concrete CLI commands.

**Platform constraint (v1):** macOS arm64 only. Multi-platform support is a future enhancement.

## Plugin/Skills Layer

The CLI is distributed as a Claude Code plugin. The plugin bundles the compiled binary, 12 workflow skills (namespaced as `/gp:<skill-name>`), 34 agent definitions, and state protection hooks.

**Skills** (`skills/` directory) — 12 orchestrator-level SKILL.md files that drive the workflow. Three pipeline skills (`create-epic`, `plan-slice`, `create-side-quest`) use an orchestrator pattern that spawns sub-agents per phase. Four merged standalone skills (`audit`, `implement`, `complete-epic`, `explore`). Five utility skills (`init`, `status`, `upgrade`, `start-epic`, `task`).

**Agents** (`agents/` directory) — 34 agent definitions spawned by orchestrator skills. Includes 20 domain-specialist reviewers, pipeline phase agents (explore, plan, architecture, slices, implement, completion), coordination agents (refinement-coordinator, synthesis, editor), and audit mode agents. Agent content is loaded by Claude Code at spawn time via `@${CLAUDE_PLUGIN_ROOT}/path` references.

**Shared references** (`skills/_shared/references/`) — shared review criteria, output templates, and conventions consumed by agents and skills via `@` references.

## Subsystem Maturity

| Subsystem | Maturity | Dependents | Fitness Functions | Notes |
|---|---|---|---|---|
| Plugin | Developing | — | `tools/dogfood/validate-consolidated.ts` | Packaging, hooks, build pipeline, CI/CD, marketplace distribution. 12 skills, 34 agents. |
| Commands | Developing | — | `tests/fitness/stateless-commands.test.ts`, `tests/fitness/schema-output-accuracy.test.ts`, `tests/fitness/structured-errors.test.ts` | Thin CLI layer. Stable across 8 slices. |
| RPC Layer | Developing | Commands | `tests/fitness/mutation-through-state-machine.test.ts` | Workflow orchestration. Stable across 8 slices. Tested indirectly via integration tests. |
| State Machine | Developing | RPC Layer | `tests/fitness/state-machine-purity.test.ts`, `tests/fitness/transition-completeness.test.ts` | Pure rules engine. Purity and completeness fitness functions in place. |
| Data Layer | Developing | RPC Layer, Commands | `tests/fitness/data-determinism.test.ts`, `tests/fitness/schema-validation.test.ts`, `tests/fitness/tree-accuracy.test.ts`, `tests/fitness/concurrent-modification.test.ts`, `tests/fitness/atomic-writes.test.ts` | All planned fitness functions implemented. |
| Context | Developing | RPC Layer, Commands | candidate | Peer module at `src/core/context/`. Budget-based content inlining, per-phase priority tables. Depends on tree types, schema types, and RPC types. |
