# Phase 5: Reviewer Agents

Add the 14 remaining reviewer agent definitions to complete the 20-domain reviewer infrastructure specified in the architecture (6 existing + 14 new = 20 total). Each reviewer follows the established pattern: ~45-line agent `.md` + ~100-150 line domain criteria file in `skills/_shared/references/`.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls agents/reviewer-python.md agents/reviewer-backend.md agents/reviewer-frontend.md` — none exist
- [ ] `ls skills/_shared/references/review-python.md skills/_shared/references/review-backend.md` — none exist

**After implementation** (should pass / show presence):
- [ ] `ls agents/reviewer-*.md | wc -l` — returns 20 (6 existing + 14 new)
- [ ] `ls skills/_shared/references/review-*.md | wc -l` — returns 21 (20 domain criteria files + 1 preamble file `review-preamble.md`, which also matches the `review-*.md` glob)
- [ ] Each new agent `.md` has valid frontmatter (`name:`, `description:`, `model: opus`)
- [ ] Each new agent body contains `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-preamble.md` and `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-<domain>.md`

### Tasks

New reviewer agents to create (each needs an agent `.md` in `agents/` + a criteria `.md` in `skills/_shared/references/`):

**Language specialists:**
- [ ] `reviewer-python.md` + `review-python.md` — type hints (mypy/pyright), packaging (pyproject.toml), async patterns, virtual environments, dependency management
- [ ] `reviewer-rust.md` + `review-rust.md` — ownership/borrowing, error handling (Result/Option), unsafe blocks, Cargo patterns, trait design

**Web specialists:**
- [ ] `reviewer-backend.md` + `review-backend.md` — API design (REST/GraphQL), auth patterns, database access, middleware, error handling, input validation
- [ ] `reviewer-frontend.md` + `review-frontend.md` — component patterns, state management, accessibility, performance (bundle size, rendering), responsive design
- [ ] `reviewer-data-layer.md` + `review-data-layer.md` — schema design, migrations, query patterns, indexing, connection pooling, data integrity
- [ ] `reviewer-devops.md` + `review-devops.md` — containerization, infrastructure-as-code, deployment strategies, secrets management, monitoring, scaling

**Cross-cutting specialists:**
- [ ] `reviewer-ci-github-workflows.md` + `review-ci-github-workflows.md` — workflow correctness, caching, secrets, matrix strategies, job dependencies, artifact handling
- [ ] `reviewer-ux-ia.md` + `review-ux-ia.md` — information architecture, user flows, navigation, content hierarchy, interaction patterns
- [ ] `reviewer-api-contract.md` + `review-api-contract.md` — API contract design, versioning, backward compatibility, documentation, error response standards

**AI tooling specialists:**
- [ ] `reviewer-mcp-server.md` + `review-mcp-server.md` — MCP protocol compliance, tool definitions, resource handling, transport patterns

**Scientific specialists:**
- [ ] `reviewer-algorithm-numerical.md` + `review-algorithm-numerical.md` — algorithmic complexity, numerical stability, precision, edge cases, correctness proofs
- [ ] `reviewer-performance.md` + `review-performance.md` — profiling, memory allocation, concurrency, caching strategies, I/O optimization
- [ ] `reviewer-ml-pipeline.md` + `review-ml-pipeline.md` — data preprocessing, feature engineering, model training, evaluation metrics, deployment, reproducibility
- [ ] `reviewer-data-io.md` + `review-data-io.md` — data format handling (CSV, JSON, Parquet), streaming, ETL patterns, data validation, schema evolution

Each agent `.md` follows the exact template from existing reviewers:
```
---
name: reviewer-<domain>
description: Reviews artifacts for <domain focus>. Spawned by pipeline orchestrators during refinement loops when the artifact involves <trigger>.
model: opus
---
# <Domain> Reviewer Agent
<role description, NOT responsible for clause>
## Inputs (provided in task prompt)
<standard inputs block>
## Shared Review Standards
@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-preamble.md
## Domain-Specific Criteria
@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/review-<domain>.md
## Output
<standard output block with JSON>
```

Each criteria `.md` follows the template from existing criteria files:
```
# <Domain> Review Criteria
## Codebase Exploration Focus
<what to check in the repo before reviewing>
## Evaluation Criteria
1-6 numbered criteria with sub-items
## Scoring Guidelines
<domain-specific scoring adjustments>
```

- [ ] **Full rewrite** of the reviewer registry at `skills/implement/references/reviewer-registry.md`. This is NOT an incremental update — the current format (section-based lookups into monolithic files like `reviewers-language.md`) was never functional at runtime. Changes:
  1. Replace `Prompt File` + `Section` columns with `Agent` column referencing `agents/reviewer-*.md` + separate `Criteria` column referencing `skills/_shared/references/review-*.md`
  2. List exactly the 20 agent rows that will exist (6 existing + 14 new). Remove any aspirational entries (e.g., C++, Background Jobs) that don't have agent definitions.
  3. Only update `skills/implement/references/reviewer-registry.md` — the copies in `refine-plan/`, `refine-slices/`, and `refine-architecture/` directories are deleted in Phase 6 (dependency: Phase 6 cleanup must happen after this rewrite)

- [ ] **Update hardcoded reviewer lists in orchestrator skills** to include the full 20-reviewer set (or migrate to reference `reviewer-registry.md`). Three locations:
  1. `skills/create-epic/SKILL.md` — two places: the architecture refinement loop's `Available reviewers: [...]` list and the slices refinement loop's `Available reviewers: [...]` list
  2. `skills/plan-slice/SKILL.md` — one place: the refinement loop's `Available reviewers: [...]` list
  3. `skills/create-side-quest/SKILL.md` (from Phase 1) — ensure it references the full reviewer set from the start, ideally by deferring to `reviewer-registry.md` (following `implement`'s pattern)
  
  Preferred approach: migrate all three skills to reference `reviewer-registry.md` rather than hardcoding reviewer lists, so future reviewer additions propagate from one place.

- [ ] **Update `skills/_shared/references/iteration-loop.md`** to reflect the new agent-name-based spawn pattern. Specific changes:
  1. Replace the "Reviewer Spawn Pattern" section (lines ~46-52) which describes the old "Prompt File + Section" pattern — update to describe spawning reviewers by agent name from `reviewer-registry.md`'s `Agent` column
  2. Remove references to `sub-agent-prompts.md` as the bootstrap source (this file will be orphaned when Phase 6 deletes `refine-plan/`)

### Verification

- All 20 `agents/reviewer-*.md` files exist with valid frontmatter
- All 20 `skills/_shared/references/review-*.md` domain criteria files exist
- `@` references in all reviewer agents resolve to existing files (same check build-plugin.sh runs)
- `bun run build:plugin` passes — all reviewer agents validate
