# Epic Learnings: entity-restructuring

## Schema registry changes are load-bearing for reads and must precede data migration
_Recurring in: 01-schema-and-state-machine, 02-rpc-and-commands_

Zod schema registry controls not just write validation but also read parsing — `getJson` uses it to resolve the Zod schema, which strips unrecognized fields. The `epicOverviewSchema` registry entry had to be in place before any data migration or the `slices` arrays would be silently stripped on every round-trip. Combined with the state cache bypassing schema defaults (slice 02), this means schema changes require a specific ordering: (1) update schema registry, (2) bump cache version or clear cache, (3) then migrate data. Future data model changes should treat schema+cache as an atomic precondition, not a parallel step.

## Cross-slice work absorption is a valid refinement outcome — plan for it
_Recurring in: 02-rpc-and-commands, 03-context-and-learnings, 04-skills-update_

Three of five slices had significant work absorption across boundaries. Slice 03 was entirely absorbed by slices 02 and 05. Slice 02 naturally completed the context layer changes because those functions lived in the same modules being updated for RPC path changes. This is inherent to path-migration epics where the same string literals appear across module boundaries. Future multi-slice epics that change cross-cutting concerns (paths, naming conventions, config formats) should plan for refinement to collapse slices — budget 1-2 buffer slices that may become no-ops.

## String literal path references need exhaustive grep-based enumeration, not manual listing
_Recurring in: 02-rpc-and-commands, 04-skills-update_

Scattered path references in large functions (e.g., `buildSliceCompleteResult` with 6 references across 100 lines) and dual-path references in skill files (33 actual vs 10-12 estimated) consistently surprised during implementation. TypeScript cannot catch string literal path changes — they are invisible to the type system. Plans for string-literal migrations should include a grep-driven inventory step that counts ALL occurrences by pattern, classifies them (standalone, co-occurrence, conditional), and uses the count as the verification target.

## Self-hosting development tools creates an inherent installed-vs-repo divergence constraint
_Recurring in: 02-rpc-and-commands, 05-tests-and-migration_

The repo's code expects nested paths but the running project's data is in the old flat layout. State mutations must use the installed CLI until migration is run. This bootstrapping constraint is permanent for self-hosted tools — any structural data change creates a window where the locally-built CLI cannot operate on its own project data. The migration slice (05) must always be sequenced last, and self-migration is the strongest validation of correctness (caught issues unit tests missed).

## Architecture doc updates are load-bearing for downstream consumers and should not be deferred past the epic
_Recurring in: 01-schema-and-state-machine, 05-tests-and-migration_

Slice 01 correctly deferred doc updates to avoid describing a partial migration, but the deferred updates were critical for slice 05 and skill consumers. The slice 05 plan included doc updates as Phase 3 (not a cleanup step), which prevented stale path examples from propagating. For multi-slice structural changes, defer doc updates to the last implementation slice but make them a first-class phase, not an afterthought.
