# Architecture Updates: 02-show-status-enrichment

## Changes Made

1. **INV-001 Known Exceptions** — Added documented exception for `project.json.version` stamping in `.project/architecture/invariants.md`. Version stamping is post-reduce in the RPC layer; this is infrastructure metadata, not workflow state.

2. **Stale references cleaned** — Removed `countFiles` reference from `.project/conventions.md` (file deleted). Removed stale "Coming in Future Slices" entry from `cli-interaction-conventions.md`.

## Divergences Assessed

- **`PathReferences` as `Record<string, string>`**: The type is shallower than ideal (no per-phase key guarantees at compile time), but matches the epic architecture spec. TODO comment added. Acceptable for current consumers (LLM skills parsing JSON dynamically).
- **`context?` fields deferred**: The epic spec includes `context?` on `BeginResult`/`SubmitResult`, but the plan explicitly deferred this to a later slice. No divergence — intentional scoping.

## No Updates Needed

Architecture files (`rpc-layer-api.md`, `commands-api.md`, `data-model.md`) already describe the `paths?` field, semver checking, and artifact enrichment. The implementation aligns with the target architecture.
