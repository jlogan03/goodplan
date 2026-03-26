# Epic Architecture Reconciliation — skills-cli-integration

## Target vs Reality

The epic's architecture proposed 4 changes:
1. **`goodplan state --json --query`** — expose full state tree with jq filtering → **Implemented** (slice 01)
2. **Enriched `show` commands** with artifact existence data → **Implemented** (slice 02)
3. **Enriched `status --json`** with file path arrays → **Implemented** (slice 02)
4. **Semantic versioning** with compatibility checking → **Implemented** (slice 02)

Additionally implemented beyond the original proposal:
- **Sub-agent commands** (`start-*`, `submit-*`) for skill phase orchestration (slice 05)
- **`--force` flag** for concurrent modification recovery (slice 06/dogfooding)
- **Skill path convention** changed from absolute to relative `_shared/references/` paths (slice 06)
- **`~~archived~~` directory rename convention removed** (slice 06)

## Divergences

None. The top-level architecture accurately reflects the current system. All epic-targeted changes landed and were reflected in top-level docs through per-slice updates.

## Incomplete Work

- **`start-epic` skill migration**: The only skill not migrated to CLI commands (9 violations). The CLI has `epic:activate` but the skill doesn't use it. This is a known item — not a scope reduction, just deferred to a future quest.

## Side Quest Candidates

1. **Migrate start-epic to CLI** — Replace direct file access with `epic:activate` and related CLI commands
2. **CLI project migration command** — Allow `goodplan init` on projects with existing `.project/` but no `project.json` (friction item #1 from dogfooding)
