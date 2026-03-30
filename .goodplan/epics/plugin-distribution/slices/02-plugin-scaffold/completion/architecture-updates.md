# Architecture Updates — 02-plugin-scaffold

## Changes Made

### Epic architecture: `plugin-api.md` (2 fixes)
1. Fixed plugin.json manifest paths: `"skills"` → `"./skills"`, `"hooks"` → `"./hooks/hooks.json"`. `claude plugin validate` requires `./` prefix.
2. Fixed build command version define: `__GP_VERSION__` → `__GOODPLAN_VERSION__`. Slice 01 explicitly kept this name; `cli-changes-api.md` was already correct.

## No Top-Level Architecture Changes
This slice adds a build script (`scripts/build-plugin.sh`) and plugin packaging output (`dist/gp-plugin/`). These are outside the 4-layer stack and do not affect any existing subsystem boundaries, APIs, or data flows. No changes to `.goodplan/architecture/` needed.

## Declined / Flagged as Tech Debt
None.
