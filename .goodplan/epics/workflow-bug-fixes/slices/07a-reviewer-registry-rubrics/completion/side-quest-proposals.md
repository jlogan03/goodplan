# Side Quest Proposals: 07a-reviewer-registry-rubrics

## 1. Reconcile Rubric Types (convergence vs. registry)

- **Rationale**: `src/trust/convergence/` defines an inline `Rubric` / `RubricDimension` interface. The new `src/schemas/trust/rubric.ts` defines `RubricYaml` / `RubricDimensionYaml`. These represent the same concept in different shapes. The convergence evaluator should consume rubrics loaded from YAML rather than using its own inline type.
- **Scope**: Medium -- requires updating convergence evaluator to accept `RubricYaml`, mapping dimension schemas, updating tests.
- **Priority**: High -- this is the primary integration point for rubrics and will block rubric-driven convergence.

## 2. Update Architecture Overview: Reviewer Location

- **Rationale**: `_overview.md` lists `plugin/reviewers/` as a component, but reviewers actually live in `plugin/agents/reviewer-*.md`. The overview should reflect the actual location.
- **Scope**: Small -- one-line change in the overview.
- **Priority**: Low -- documentation accuracy.

## 3. Implement maxMaturity Routing Filter

- **Rationale**: The `routeReviewers` function accepts `maxMaturity` but ignores it. Some reviewers should only activate at certain maturity levels (e.g., performance reviewers only at `production` maturity).
- **Scope**: Small -- add maturity field to frontmatter schema, filter in routing function.
- **Priority**: Medium -- useful for reducing reviewer noise on early-stage artifacts.

## 4. Dual Score Scale Documentation

- **Rationale**: Rubric YAML uses 1-10 thresholds, reviewer frontmatter uses `score_range: [1, 5]` with separate thresholds. The relationship between these scales is not documented anywhere. Future implementers need clarity on which scale applies where.
- **Scope**: Small -- add a section to trust.md architecture doc.
- **Priority**: Medium -- prevents confusion in convergence evaluator integration.
