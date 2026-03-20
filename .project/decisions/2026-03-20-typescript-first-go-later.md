# Decision: Build CLI in TypeScript/Bun First, Defer Go Port

**Status**: active
**Date**: 2026-03-20
**Domain**: infrastructure
**Context**: explore for epics/goodplan-cli — researched Bun compilation (57 MB binaries) vs Go (8-12 MB) vs Rust (3-5 MB)

## Decision

Build the `goodplan` CLI in TypeScript compiled with Bun. Defer a potential Go port until the API stabilizes and binary size is validated as a real problem in practice.

## Rationale

TypeScript enables faster iteration on the command surface, data model, and state machine logic. The CLI's interface (commands, flags, JSON output) is language-agnostic — a Go port would translate well-understood logic rather than requiring exploratory design. The user can read and reason about TypeScript but not Go, which matters during architecture and design collaboration.

Alternatives considered:
- **Go from the start** — 5-7x smaller binaries (8-12 MB), faster startup (~5ms), battle-tested ecosystem (Cobra, gojq). But adds 1-2 week learning curve and slows initial iteration since the user can't review Go code directly.
- **Rust** — smallest binaries (3-5 MB) but 1-3 month learning curve and harder cross-compilation. Not justified for this use case.
- **Hybrid (TypeScript + Go)** — adds complexity without solving the core problem.

## Consequences

- Binary size will be ~57 MB per platform during the TypeScript phase. Acceptable for a development tool.
- The CLI's command interface and JSON schemas should be designed as a clean contract, making a future port mechanical rather than architectural.
- If binary size becomes a real user complaint, Go port is the planned path forward.
- Tech stack for initial build: Bun compilation, citty (CLI framework), Zod (validation), jqjs (jq queries), picocolors (terminal color).
