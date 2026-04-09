# Slice 07a: Reviewer Registry + Rubrics

## Goal

Build the full reviewer registry (YAML frontmatter, routing function, relevance weighting) and full rubric set (extracted from prose to YAML), plus commands for querying and validating reviewers and rubrics.

## In Scope

- `src/trust/reviewers/` -- full reviewer registry (all reviewers registered, YAML frontmatter, routing function, relevance weighting)
- Full rubric set (extracted from prose to YAML)
- `gp reviewer:list`, `gp reviewer:show` -- query registered reviewers
- `gp rubric:list`, `gp rubric:show`, `gp rubric:validate` -- query and validate rubrics
- Integration tests in `tests/trust/`

## Out of Scope

- Entity commands for other namespaces (slice 07b)
- Skills (slices 08-11)
- Migration (slice 12)

## Dependencies

- Slice 01-04 (engine + trust foundation) -- event log, invariants, derived state, refinement loop with bootstrap rubric

## Verification

1. Full reviewer registry loads all reviewers with valid YAML frontmatter
2. Reviewer routing function dispatches correctly by artifact type
3. Relevance weighting produces expected reviewer subsets for each artifact type
4. `gp reviewer:list` shows all registered reviewers with metadata
5. `gp reviewer:show <id>` displays full reviewer details including rubric assignments
6. `gp rubric:list` shows all rubrics with coverage summary
7. `gp rubric:show <id>` displays rubric criteria and scoring dimensions
8. `gp rubric:validate` detects missing rubrics, orphaned references, and schema errors

## Estimated Sessions

1-2
