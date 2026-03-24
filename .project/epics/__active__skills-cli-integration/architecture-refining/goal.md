# Architecture Refinement Goal

## What "good architecture" means for skills-cli-integration

### What the architecture should enable
- All ~15 goodplan workflow skills use the CLI binary for structured state operations (no direct JSON/JSONL access)
- CLI gap filling: `goodplan state --json --query`, enriched `show`/`status`, `--archive` on complete, semantic versioning
- Clean orchestrator/sub-agent interaction pattern (`start-*`/`submit-*` commands)
- `state.md` elimination (replaced by `status --json`)

### Quality attributes (priority order)
1. **Module depth** — 4-layer stack (Commands → RPC → State Machine → Data Layer) with deep modules hiding complexity behind small interfaces
2. **Boundary quality** — strict unidirectional dependencies, state machine purity (INV-003), data ownership clarity (CLI owns JSON, LLM owns markdown)
3. **API surface minimality** — each subsystem exposes the smallest useful public API
4. **Completeness** — all entity lifecycles (epic, slice, quest, decision), all state transitions, all CLI commands fully specified
5. **Consistency** — uniform patterns across entity types (quest mirrors slice), consistent error handling (INV-007)

### Key constraints
- CLI conforms to skills, not the reverse
- 7 system invariants (INV-001 through INV-007) must hold
- 16 active decisions must be respected
- Existing implementation across 8 completed slices constrains what can change
