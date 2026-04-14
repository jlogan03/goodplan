# Architecture Delta: 07a-reviewer-registry-rubrics

## Alignment

The implementation matches the architecture overview's trust layer design. The Reviewer Registry (`RR`) subsystem at `src/trust/reviewers/` is now implemented with:
- Registry class, loader, routing function (as specified in the subsystem map)
- Rubric loader and validator (as specified in the plugin layer)
- 5 CLI commands in the command layer (as specified in dependency rules: commands may import trust)

The dependency direction is correct: `src/trust/reviewers/` imports from `src/schemas/trust/` (leaf layer) and nothing else. CLI commands import from trust and util layers.

## New Subsystems

| Subsystem | Location | Status |
|---|---|---|
| Reviewer Registry | `src/trust/reviewers/` | Implemented (experimental) |
| Rubric YAML definitions | `plugin/rubrics/` | 5 files created |
| Plugin dir resolver | `src/util/plugin-dir.ts` | New shared utility |

## Modifications

| Component | Change |
|---|---|
| `src/trust/index.ts` | Added ReviewerRegistry, routing, rubric exports |
| `src/schemas/trust/index.ts` | Added reviewer-frontmatter and rubric schema exports |
| `src/commands/main.ts` | Registered 5 new commands (reviewer:list, reviewer:show, rubric:list, rubric:show, rubric:validate) |
| `scripts/build-plugin.sh` | Added rubrics/ directory copy to plugin dist |
| 20 `plugin/agents/reviewer-*.md` files | Extended frontmatter with registry fields |

## Architecture Overview Accuracy

The `_overview.md` already listed `Reviewer Registry` as a trust layer subsystem and `Rubrics` in the plugin layer. Both are now realized. The overview's mermaid diagram includes `RR` (Reviewer Registry) and `RB` (Rubrics) nodes -- these are now concrete.

One gap: the overview lists `plugin/reviewers/` as a plugin component ("YAML-fronted reviewer definitions (moved from agents/_references/)"). The actual implementation keeps reviewers in `plugin/agents/reviewer-*.md` with enriched frontmatter, not in a separate `plugin/reviewers/` directory. The overview should be updated to reflect this.

## Gaps (Not Yet Realized)

1. **Project-level overrides** (`~/.goodplan/reviewers/`): Deferred per plan note. Architecture describes a two-tier layout.
2. **Additional specialized reviewers** (~10 more): `invariant-checker`, `context-transport`, etc. to be created in slices 08-11.
3. **Convergence evaluator integration**: The rubric YAML schema exists alongside the existing inline `Rubric` interface in `src/trust/convergence/`. These are not yet connected.
4. **`maxMaturity` parameter**: The routing function accepts it but ignores it (prefixed with `_`). Maturity-based filtering is deferred.
