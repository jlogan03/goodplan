# Learnings: 05-tests-and-migration

## Re-migration support transforms `migrate` from a one-time tool to a general-purpose state rebuilder
_Category: domain_

Removing the `STATE_ALREADY_INITIALIZED` guard fundamentally changes `migrate` from "convert a pre-CLI project" to "rebuild state from directory contents at any time." This matters as the state format evolves — users re-run migrate rather than writing manual migration scripts. The warning field on re-migration keeps the change safe and machine-parseable (INV-007 compliant).

## Timestamped backup naming prevents re-migration collisions and preserves history
_Category: worked_

Using `.project-old-<YYYYMMDD-HHmmss>/` instead of a fixed `.project-old/` means multiple migrations accumulate backups. The sub-second `fs.existsSync` guard is defensive but costs nothing. This pattern should be standard for any destructive operation that creates backups.

## Typing migration output with entity schemas catches stale field drift at compile time
_Category: do-differently_

`sliceSequence` survived in `buildMigrationState` output for an entire epic because `epicJsonContent` was typed as `Record<string, unknown>`. Applying `z.infer<typeof epicSchema>` after removing the stale field immediately surfaces any future schema/output divergence. Apply entity types to all migration output builders, not just epic.

## Fitness test categories need explicit documentation of their exclusion semantics
_Category: domain_

`ENTITY_EXEMPT_COMMANDS` (for `migrate`) is distinct from `READ_ONLY_COMMANDS` (which includes `init`). Both are project-scoped, but the exemption reason differs: `migrate` lacks an entity identifier in its stdin payload, while `init` is read-only. Clear comments explaining why each command is in each set prevents future confusion.

## Self-migration is the strongest validation of migration code changes
_Category: worked_

Running `goodplan migrate` on the goodplan repo itself after updating the migration code caught issues that unit/integration tests missed (activity log scope strings, architecture doc staleness). This dogfooding step should be standard for any migration-related changes.

## Architecture doc updates are load-bearing for downstream skill consumers
_Category: domain_

Updating `data-model.md`, `state-machine-api.md`, `rpc-layer-api.md`, `flows.md`, and `commands-api.md` immediately after the structural change prevents skills and future slices from reading stale path examples. The plan correctly included this as Phase 3 rather than deferring it.
