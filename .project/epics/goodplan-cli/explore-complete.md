# Explore Complete

## Scope
epics/goodplan-cli

## What Was Explored
- Bun compilation: binary sizes, cross-compilation, startup time, limitations
- jq-in-JS libraries: jqjs, JMESPath, build-your-own tradeoffs
- CLI frameworks: citty, commander, cac, clipanion comparison
- JSONL patterns: atomic appends, git merge strategies, event sourcing for updates
- Small binary alternatives: Deno compile, Node SEA, txiki.js, Go, Rust
- Zod + citty integration for CLI input validation
- Go/Rust as alternative implementation languages
- Command surface design: namespacing, verb hierarchy, input/output patterns
- Orchestrator/sub-agent interaction patterns and context protection
- Skill prompt ↔ CLI integration strategy

## Key Conclusions
- **Tech stack confirmed**: TypeScript + Bun compilation, citty for CLI framework, jqjs for queries, Zod for validation, picocolors for color. Go port deferred until API stabilizes.
- **CLI is a workflow engine**: Owns all deterministic mechanics (loop tracking, circuit breakers, transition validation), not just state storage.
- **Command surface uses colon namespaces**: `epic:`, `build:`, `resource:` with consistent verb patterns (`begin`/`status`/`context`/`complete`/`abandon` for orchestrator, `start-*`/`submit-*` for sub-agents).
- **Orchestrator/sub-agent split**: Orchestrator uses `begin`/`status`/`complete` (compact data), sub-agents use `context`/`start-*`/`submit-*` (deep content). Sub-agents write results directly to CLI.
- **Skills contain concrete CLI commands**: Schema is escape hatch. Future distribution epic has CLI generate skills.
- **jqjs validated via prototype**: All 7 query patterns work in compiled Bun binary. Correct package is `@michaelhomer/jqjs` (not the npm `jqjs`).
- **57 MB binary size is acceptable for now**: No smaller alternative exists in the Node/Bun/Deno ecosystem. Go port is the path to smaller binaries if needed.

## Artifacts
- `research/bun-compilation.md`
- `research/jq-libraries.md`
- `research/cli-frameworks.md`
- `research/jsonl-patterns.md`
- `research/small-binary-alternatives.md`
- `research/zod-citty-validation.md`
- `research/go-rust-alternatives.md`
- `brainstorm/command-surface.md`
- `brainstorm/orchestrator-patterns.md`
- `brainstorm/skill-cli-integration.md`
- `prototypes/jqjs-spike/`
