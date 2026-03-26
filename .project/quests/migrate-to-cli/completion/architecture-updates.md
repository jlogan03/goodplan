# Architecture Updates: migrate-to-cli

## Changes Made During Implementation

1. **commands-api.md** — Added `migrate` global command documentation (done in Phase 4)
2. **invariants.md** — Added INV-001 known exception for migration's direct state construction (done in Phase 4)

## No Additional Divergences

The migration command follows established patterns:
- Thin command wrapper + RPC function (matches init pattern)
- Schemas co-located with command (new pattern, but intentional for transient feature)
- Error codes in existing namespaces (VALIDATION_*, DATA_*)

No architecture files need updating beyond what was done during implementation.
