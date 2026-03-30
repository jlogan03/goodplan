# Architecture Overview

## System Summary

`goodplan` is a compiled TypeScript CLI that serves as the single interface to `.project/` state for both humans and LLMs. It owns all deterministic workflow mechanics — state management, transition validation, file I/O, context bundling, and activity logging — while the LLM retains ownership of judgment-driven work (interviewing users, writing content, reviewing, scoring).

The system is a four-layer stack with strict unidirectional dependencies: Commands → RPC Layer → State Machine + Data Layer → Filesystem. Resource commands (entity CRUD) bypass the RPC layer and go directly from Commands to the Data Layer.

## Subsystems

### Commands

Thin CLI layer built on citty. Responsible for argument parsing (flags + stdin JSON merge), output formatting (human-readable, `--json`, `--quiet`), and routing to the RPC layer or Data Layer. One file per command. Resource commands (`epic list`, `slice show`, etc.) route directly to the Data Layer. Workflow commands (`begin`, `complete`, `context`, `status`) route to the RPC layer.

**Dependencies:** RPC Layer, Data Layer

### RPC Layer

Workflow orchestration layer. Coordinates the State Machine and Data Layer to execute complete workflow operations. Responsibilities:

- Hydrate entity state from filesystem, feed to State Machine, write results back
- Append to activity log on every state transition
- Assemble context bundles for each phase (with `--inline` budget-based content inlining)
- Handle implicit transitions (e.g., all slices complete → epic needs completion)
- Enforce completion flow ordering (verify goal → deferred work → arch delta → learnings)

**Dependencies:** State Machine, Data Layer

### State Machine

Pure rules engine with no I/O. Implements a reducer pattern over declarative transition tables: `(state, event, context) → (new state, new context | error)`. Manages lifecycle for all entity types (project, epic, slice, quest) including guards (activation gate, sequential slice enforcement, circuit breakers) and tracking state (refinement rounds, scores, implementation phases).

**Dependencies:** None (pure functions)

### Data Layer

Entity CRUD and all filesystem I/O. Reads and writes JSON/JSONL with Zod schema validation. Enforces deterministic key ordering for git merge friendliness. Handles atomic file operations. Lifecycle-bound markdown (goals, plans) is written through CLI `write-<field>` commands with state validation. Free-form markdown (architecture, research, brainstorm) is read by the CLI for context bundling but written directly by the LLM.

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

Single compiled binary per platform via `bun build --compile`. Target platforms: darwin-arm64, darwin-x64, linux-x64, windows-x64. Binary size ~57 MB (acceptable for a development tool; Go port is the path to smaller binaries if needed).

Installed alongside Claude Code skills. Skills are versioned in the repo (`skills/`) and installed to `~/.claude/skills/` via `bun run install:skills`. The CLI and skills are versioned together — skill prompts contain concrete CLI commands.

## Subsystem Maturity

| Subsystem | Maturity | Dependents | Fitness Functions | Notes |
|---|---|---|---|---|
| Commands | Experimental | — | candidate | Thin CLI layer. Depends on RPC and Data Layer. |
| RPC Layer | Experimental | Commands | candidate | Workflow orchestration. Depends on State Machine and Data Layer. |
| State Machine | Experimental | RPC Layer | candidate | Pure rules engine. No dependencies. |
| Data Layer | Experimental | RPC Layer, Commands | candidate | Filesystem I/O. No internal dependencies. |
