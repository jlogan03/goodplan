# Architecture Updates: 01-rename-gp

## Changes Made

1. **Epic architecture — cli-changes-api.md**: Updated Binary Rename section to reflect scope decision: `__GOODPLAN_VERSION__` define, `GOODPLAN_DIR`/`GOODPLAN_DEBUG` env vars, and globalThis flags all kept as-is. Previously spec'd `__GP_VERSION__` rename that was descoped during refinement.

## No Top-Level Architecture Changes Needed

The rename is a surface change (binary name, state directory path, skill/doc references). No changes to the four-layer architecture, subsystem boundaries, data model, or API contracts. All subsystems remain at Developing maturity.

## Declined / Flagged

None.
