# Epic Approved

## Decision
Approved for activation.

## Rationale
The architecture proposal is well-grounded in existing decisions (cli-as-workflow-engine, orchestrator-subagent-split, skill-cli-integration, entity-namespaced-commands) and the exploration research (skill state access audit, CLI coverage gap analysis). The keystone `goodplan state` command simplifies the design by providing universal data access through one command + jq, avoiding a proliferation of specialized query commands. Semantic versioning adds durability to the CLI-skill contract.

## Architecture Proposal Files
- `architecture-proposal/_overview.md` — what changes, why, approach
- `architecture-proposal/cli-changes.md` — 5 CLI enhancements (state dump, enriched show/status, --archive, semver)
- `architecture-proposal/cli-interaction-conventions.md` — how skills interact with the CLI

## Notes
- Top-level `.project/architecture/` is NOT updated at this point — it reflects current reality
- Epic architecture is the target state; top-level is updated incrementally by `/complete` as slices land
