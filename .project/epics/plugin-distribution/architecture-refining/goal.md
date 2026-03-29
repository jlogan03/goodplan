# Architecture Refinement Goal

This architecture should enable:
- **Atomic plugin distribution** — CLI, skills, and hooks versioned and delivered together
- **State protection** — LLM cannot bypass CLI for state mutations (hooks + HMAC signatures)
- **Self-documenting CLI** — `nextCommands` guides skills through valid transitions without hardcoded knowledge
- **Clean rename** — `goodplan` → `gp` across binary, plugin, and skill namespace
- **Simple build pipeline** — single script assembles the plugin; CI publishes via release branch

Quality attributes that matter most:
- **Correctness** of state protection (no bypass vectors)
- **Simplicity** of the plugin structure (minimal moving parts)
- **Maintainability** of the `nextCommands` derivation (single source of truth in transition tables)
- **Developer experience** for local testing (`--plugin-dir`)
