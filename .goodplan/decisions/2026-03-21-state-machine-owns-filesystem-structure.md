# Decision: State machine owns filesystem structure via commitState materialization

**Status**: active
**Date**: 2026-03-21
**Domain**: architecture
**Context**: create-plan for epics/goodplan-cli/slices/02-data-layer

## Decision

The state machine is the single authority on what files and directories exist in `.project/`. `commitState()` materializes state machine output onto the filesystem — creating directories, writing new files, updating changed files. `assembleState()` returns a zero state (empty `ProjectState`) for uninitialized projects, enabling `init` to go through the normal state machine path (`INIT_PROJECT` event). LLM content directories (research/, brainstorm/, architecture/) are created by `commitState()` as part of entity creation, not by ad-hoc `mkdir` calls in command handlers.

The `ProjectState` uses a discriminated union (`StateEntry`) where each key maps to either a `DirectoryEntry` (with `files: string[]` for existence checks), `JsonEntry<T>` (concrete typed content), or `JsonlEntry<T>` (concrete typed records). This replaces the previous `_derived` boolean map — file existence is checked via directory `files` arrays.

## Rationale

The previous design didn't specify how directories hosting LLM content get created, leaving it implicit. Making the state machine the authority on filesystem structure means:
- Project initialization is a normal state machine transition, not a special case
- Entity creation (epics, slices, quests) automatically creates all needed directories
- The `_derived` map is replaced by a cleaner directory-contents model
- `commitState()` becomes a generic materializer — no path-specific logic needed

Alternatives considered:
- **Ad-hoc directory creation in commands** — fragile, duplicated, inconsistent
- **Separate directory creation step in RPC** — splits filesystem authority between two layers
- **Derive directories from file paths only** — can't represent empty directories that should exist

## Consequences

- `assembleState()` must handle missing `.project/` gracefully (return empty state)
- `commitState()` must create parent directories before writing new files
- The tracer bullet's `init` command (which writes `project.json` directly) must be refactored to use the state machine path in slice 03
- Schema registry maps path patterns to Zod schemas for `commitState()` validation
- All entity creation events in the state machine must produce the full directory structure (entity directory + subdirectories for LLM content)
