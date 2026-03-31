# Architecture Reconciliation — plugin-distribution epic

## Updates Applied to Top-Level Architecture

All divergences classified as **(c) evolved understanding** — the epic built what was intended, the top-level docs just hadn't been updated.

1. **System Summary**: `.project/` → `.goodplan/`, added plugin distribution paragraph
2. **RPC Layer**: Added `nextCommands` computation responsibility
3. **Data Layer**: Added HMAC-SHA256 `stateSignature` description
4. **Deployment Model**: Replaced `install:skills` with plugin marketplace distribution model, added platform constraint note
5. **Maturity Table**: Added Plugin subsystem at Experimental

## Intentional Scope Reductions

None — all epic goals were achieved.

## Incomplete Work

None — all 7 slices completed as planned.

## Epic Architecture Stale Fields (not updated per protocol)

- Epic `_overview.md` says plugin name is `"gp"` — actual is `"goodplan"` with `gp:` skill prefix. Epic architecture is frozen per completion protocol.
