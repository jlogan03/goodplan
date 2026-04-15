# Implementation Plan: 07a-reviewer-registry-rubrics

**Goal**: Build the full reviewer registry (YAML frontmatter on 20 reviewer agent files, routing function with relevance weighting) and rubric set (5-8 shared YAML files), plus 5 CLI commands for querying and validating reviewers and rubrics.

**Scope**: ~15-20 new files, ~20 modified files (reviewer agent frontmatter), 5 new CLI commands (all read-only)

> **Reviewer count note**: This slice registers the ~20 currently-existing reviewer agents in `plugin/agents/`. The architecture's additional ~10 specialized reviewers (invariant-checker, context-transport, etc.) will be created as they are needed by skills in slices 08-11.

> **Project-level overrides**: The architecture's trust.md:162-168 defines a two-tier layout (plugin-level + project-level reviewer config). This slice implements plugin-level loading only. Project-level `.goodplan/reviewers/` overrides are deferred to a later slice.

---

## Phase 1: Schemas + ReviewerRegistry + Routing Function

### Objective

Build the ReviewerRegistry class (following InvariantRegistry pattern), Zod schemas for reviewer frontmatter and registry entries, and the routing function that maps (artifactType, affectedSubsystems, maxMaturity) to ReviewerRoute[] with relevance weights. Extend all 20 existing `plugin/agents/reviewer-*.md` files with structured frontmatter fields.

### Expected Behavior

**RED (before)**:
- No `src/trust/reviewers/` directory exists
- No `ReviewerRegistry` class exists
- `plugin/agents/reviewer-*.md` files have only `name`, `description`, `model` in frontmatter
- No `reviewerFrontmatterSchema` in `src/schemas/trust/`
- `import { ReviewerRegistry } from "./reviewers/index.js"` fails in `src/trust/`

**GREEN (after)**:
- `bun run build` succeeds with zero TypeScript errors
- `bun test tests/trust/reviewers/registry.test.ts` passes: registry loads all 20 reviewer agents, `getAll()` returns 20 entries, `getById("reviewer-holistic")` returns a valid entry
- `bun test tests/trust/reviewers/routing.test.ts` passes: routing function returns correct reviewer subsets for artifact types "plan", "architecture", "goal"; holistic reviewer always included; relevance weights are "high"/"medium"/"low" as expected
- Each `plugin/agents/reviewer-*.md` has `version`, `domains`, `applies_to`, `rubric_ref`, `score_range`, `passing_threshold_per_dimension` in frontmatter, validated by `reviewerFrontmatterSchema`

### Tasks

1. **Create reviewer frontmatter schema** at `src/schemas/trust/reviewer-frontmatter.ts`:
   - `reviewerFrontmatterSchema` (Zod): `id: z.string()`, `version: z.literal(1)`, `domains: z.array(z.string()).min(1)`, `applies_to: z.array(z.string()).min(1)`, `rubric_ref: z.string()`, `score_range: z.tuple([z.number(), z.number()])`, `passing_threshold_per_dimension: z.record(z.string(), z.number())`
   - `rubric_ref` is a bare ID (e.g., `"code-quality"`), not a file path. Phase 2 task 5 resolves it to `plugin/rubrics/{rubric_ref}.yaml`.
   - **`noUncheckedIndexedAccess` hazard**: `z.record()` means lookups on `passing_threshold_per_dimension` return `number | undefined`. All consumers (including the convergence evaluator) must handle `undefined` explicitly -- no `!` assertions.
   - Export `type ReviewerFrontmatter = z.infer<typeof reviewerFrontmatterSchema>`
   - Create barrel export at `src/schemas/trust/index.ts` with `export type` re-exports for `ReviewerFrontmatter` and the schema itself

2. **Create ReviewerRegistryEntry type** at `src/trust/reviewers/types.ts`:
   - `ReviewerRegistryEntry`: `{ id: string; frontmatter: ReviewerFrontmatter; filePath: string; promptContent: string }`
   - `ReviewerRoute`: `{ reviewerId: string; relevance: "high" | "medium" | "low" }`
   - `ArtifactType` union type: `"plan" | "architecture" | "goal" | "slice-set" | "pressure-test" | "code"` (use this union in all signatures, not bare `string`)

3. **Create ReviewerRegistry class** at `src/trust/reviewers/registry.ts`:
   - Follow `InvariantRegistry` pattern (private `Map<string, ReviewerRegistryEntry>`)
   - Methods: `register(entry: ReviewerRegistryEntry): void` (throws on duplicate ID), `getAll(): ReviewerRegistryEntry[]`, `getById(id: string): ReviewerRegistryEntry | undefined`, `getByDomain(domain: string): ReviewerRegistryEntry[]`, `getByArtifactType(artifactType: string): ReviewerRegistryEntry[]`

4. **Create registry loader** at `src/trust/reviewers/loader.ts`:
   - `loadReviewerAgents(pluginDir: string): ReviewerRegistryEntry[]` — globs `pluginDir/agents/reviewer-*.md`, parses YAML frontmatter via `gray-matter`, validates against `reviewerFrontmatterSchema`, returns array
   - `createReviewerRegistry(pluginDir: string): ReviewerRegistry` — calls `loadReviewerAgents`, registers each entry, returns populated registry
   - Reuse existing `gray-matter` dependency (already used by extractors)

5. **Create routing function** at `src/trust/reviewers/routing.ts`:
   - `routeReviewers(registry: ReviewerRegistry, artifactType: ArtifactType, affectedSubsystems: string[], maxMaturity: string): ReviewerRoute[]`
   - Note: architecture trust.md:200-208 omits the `registry` parameter; this plan adds it as required for implementation.
   - Always-on reviewers (holistic, invariant-checker, context-transport) always included at "high" relevance
   - Artifact-specific reviewers matched via `applies_to` field; relevance based on match specificity
   - Subsystem-specific reviewers matched via `domains` overlap with `affectedSubsystems`; relevance = "medium" for partial overlap, "high" for direct match
   - Returns deduplicated array sorted by relevance (high first)

6. **Create barrel export** at `src/trust/reviewers/index.ts`:
   - Export `ReviewerRegistry`, `createReviewerRegistry`, `loadReviewerAgents`, `routeReviewers`
   - Export types: `ReviewerRegistryEntry`, `ReviewerRoute`, `ArtifactType`

7. **Update trust layer barrel** in `src/trust/index.ts`:
   - Add exports from `./reviewers/index.js`

8. **Extend all 20 reviewer agent frontmatter** in `plugin/agents/reviewer-*.md`:
   - Add `version: 1`, `domains`, `applies_to`, `rubric_ref`, `score_range: [1, 5]`, `passing_threshold_per_dimension` to each file
   - Map each reviewer to appropriate domains and artifact types based on its existing description and `_references/review-*.md` criteria
   - Example for `reviewer-holistic.md`: `domains: [alignment, completeness, coherence]`, `applies_to: [plan, architecture, goal, slice-set, pressure-test]`, `rubric_ref: holistic`, `passing_threshold_per_dimension: { alignment: 4, completeness: 4, coherence: 4 }`
   - Example for `reviewer-typescript.md`: `domains: [typescript, type-safety, module-design]`, `applies_to: [code]`, `rubric_ref: code-quality`, `passing_threshold_per_dimension: { type-safety: 4, module-design: 3, runtime-correctness: 4 }`

9. **Write unit tests** at `tests/trust/reviewers/registry.test.ts`:
   - Test: `createReviewerRegistry` loads all 20 reviewers from `plugin/agents/`
   - Test: `getById("reviewer-holistic")` returns entry with expected domains
   - Test: `getByArtifactType("plan")` includes holistic, excludes typescript-only reviewers
   - Test: duplicate registration throws

10. **Write unit tests** at `tests/trust/reviewers/routing.test.ts`:
    - Test: `routeReviewers` for artifact type "plan" returns always-on trio + plan-specific reviewers
    - Test: `routeReviewers` for artifact type "code" returns always-on trio + code-quality reviewers + subsystem-specific based on affectedSubsystems
    - Test: holistic reviewer always present regardless of artifact type
    - Test: relevance weights assigned correctly (always-on = "high", artifact-specific = "medium" or "high")

### Verification

```bash
bun run build
bun test tests/trust/reviewers/
```

Both commands must pass with zero failures. Build must have zero TypeScript errors.

---

## Phase 2: Rubric YAML Files + Parsing/Validation

### Objective

Create 5-8 shared rubric YAML files at `plugin/rubrics/`, a Zod schema for rubric YAML, a rubric parser/loader, and a validation function that checks rubric schema correctness and cross-references against the reviewer registry (every `rubric_ref` in a reviewer must resolve to an actual rubric file).

### Expected Behavior

**RED (before)**:
- No `plugin/rubrics/` directory exists
- No rubric schema in `src/schemas/trust/`
- No rubric loader or validator in `src/trust/reviewers/`
- Convergence evaluator uses inline `Rubric` interface, not loaded from YAML

**GREEN (after)**:
- `bun run build` succeeds
- `bun test tests/trust/reviewers/rubric.test.ts` passes: all rubric YAML files parse and validate, intentionally broken fixture fails validation, cross-reference check detects missing rubric refs
- `plugin/rubrics/` contains 5-8 YAML files (holistic, code-quality, architecture-design, type-safety, data-integrity, process-holistic, etc.)
- Each rubric YAML has `id`, `version`, `dimensions[]` (name, description, scoring, threshold), `convergence` (max_rounds, zero_blocking_required, zero_critical_required)

### Tasks

1. **Create rubric schema** at `src/schemas/trust/rubric.ts`:
   - `rubricDimensionYamlSchema`: `{ name: z.string(), description: z.string(), scoring: z.string(), threshold: z.number() }`
   - `rubricYamlSchema`: `{ id: z.string(), version: z.literal(1), dimensions: z.array(rubricDimensionYamlSchema).min(1), convergence: z.object({ max_rounds: z.number().min(1), zero_blocking_required: z.boolean(), zero_critical_required: z.boolean() }) }`
   - Export `type RubricYaml = z.infer<typeof rubricYamlSchema>`
   - Add barrel export to `src/schemas/trust/`

2. **Create rubric loader** at `src/trust/reviewers/rubric-loader.ts`:
   - `loadRubric(filePath: string): { success: true; rubric: RubricYaml } | { success: false; errors: string[] }` — reads YAML, validates against `rubricYamlSchema`
   - `loadAllRubrics(rubricDir: string): Map<string, RubricYaml>` — globs `rubricDir/*.yaml`, loads each, throws on any parse failure with aggregated error messages
   - Use `yaml` package (already a dependency via extractors) or `js-yaml` for YAML parsing

3. **Create rubric validator** at `src/trust/reviewers/rubric-validator.ts`:
   - `validateRubrics(registry: ReviewerRegistry, rubrics: Map<string, RubricYaml>): ValidationResult`
   - `ValidationResult`: `{ valid: boolean; errors: string[]; warnings: string[] }`
   - Checks: (a) every `rubric_ref` in reviewer frontmatter resolves to a loaded rubric, (b) every rubric dimension referenced in `passing_threshold_per_dimension` exists in the rubric's `dimensions`, (c) no orphaned rubrics (rubric exists but no reviewer references it) -- this is a warning, not an error
   - Each error includes the reviewer ID or rubric ID for traceability

4. **Create rubric YAML files** at `plugin/rubrics/`:
   - `holistic.yaml` — dimensions: alignment, completeness, coherence; max_rounds: 3
   - `code-quality.yaml` — dimensions: type-safety, module-design, runtime-correctness, test-quality; max_rounds: 5
   - `architecture-design.yaml` — dimensions: boundaries, dependency-direction, layering, coupling-cohesion; max_rounds: 5
   - `data-integrity.yaml` — dimensions: schema-correctness, migration-safety, query-efficiency; max_rounds: 3
   - `process-holistic.yaml` — dimensions: invariant-compliance, context-transport, verification-plausibility; max_rounds: 3
   - Additional rubrics as needed to cover all reviewer domains (one rubric may serve multiple reviewers)
   - Each rubric must match the `rubricYamlSchema` exactly

5. **Update reviewer agent frontmatter** `rubric_ref` fields to match actual rubric IDs created in task 4 (adjust if initial assignments in Phase 1 were placeholder estimates). The loader resolves `rubric_ref` to `plugin/rubrics/{rubric_ref}.yaml`.

6. **Add barrel exports** for rubric loader/validator in `src/trust/reviewers/index.ts`

   > **Location note**: `src/trust/reviewers/` is acceptable for the rubric loader now. If rubrics grow significantly (e.g., project-level rubrics, rubric composition), consider promoting to `src/trust/rubrics/`.

7. **Update build script** `scripts/build-plugin.sh`: Add an `rsync` line to copy `plugin/rubrics/` into the plugin dist at `$PLUGIN_DIR/rubrics/`. The current build script does not copy this directory. Also add a verification assertion (similar to the existing agents/skills checks) that confirms at least 5 rubric YAML files are present in the dist.

8. **Write unit tests** at `tests/trust/reviewers/rubric.test.ts`:
   - Test: `loadAllRubrics("plugin/rubrics")` loads all rubric files successfully
   - Test: `loadRubric` with intentionally malformed YAML fixture returns `{ success: false, errors: [...] }`
   - Test: `validateRubrics` with valid registry + rubrics returns `{ valid: true }`
   - Test: `validateRubrics` detects missing `rubric_ref` (reviewer references nonexistent rubric)
   - Test: `validateRubrics` detects dimension mismatch (reviewer threshold references dimension not in rubric)

9. **Create test fixtures** at `tests/trust/fixtures/rubrics/`:
   - `valid.yaml` — minimal valid rubric
   - `invalid-schema.yaml` — missing required field
   - `invalid-dimensions.yaml` — empty dimensions array

### Verification

```bash
bun run build
bun test tests/trust/reviewers/rubric.test.ts
```

Both commands must pass. Rubric validation must detect all three fixture error types.

---

## Phase 3: CLI Commands + Integration Tests

### Objective

Implement 5 read-only CLI commands (`reviewer:list`, `reviewer:show`, `rubric:list`, `rubric:show`, `rubric:validate`) using the same `defineCommand`/`citty` pattern as existing commands. Write integration tests that exercise these commands via `Bun.spawnSync` against the built binary.

### Expected Behavior

**RED (before)**:
- `gp reviewer:list` returns "Unknown command"
- `gp rubric:validate` returns "Unknown command"
- No `src/commands/reviewer/` or `src/commands/rubric/` directories exist

**GREEN (after)**:
- `bun run build && ./gp reviewer:list --json` returns `{ ok: true, items: [...] }` with all 20 reviewers
- `./gp reviewer:show reviewer-holistic --json` returns `{ ok: true, id: "reviewer-holistic", domains: [...], rubric_ref: "...", ... }`
- `./gp rubric:list --json` returns `{ ok: true, items: [...] }` with all rubric files
- `./gp rubric:show holistic --json` returns `{ ok: true, id: "holistic", dimensions: [...], convergence: {...} }`
- `./gp rubric:validate --json` returns `{ ok: true, valid: true, ... }` when all rubrics are correct
- `bun test tests/trust/reviewers/cli.test.ts` passes all integration tests
- All 5 commands registered in `src/commands/main.ts`

### Tasks

1. **Create `src/commands/reviewer/list.ts`** — `reviewerListCommand`:
   - `defineCommand` with `meta: { name: "reviewer:list" }`
   - Args: `...globalArgs`, `...listArgs`
   - Resolves plugin dir, calls `createReviewerRegistry(pluginDir)`, returns `getAll()` mapped to summary objects
   - JSON output: `{ ok: true, total: N, items: [{ id, domains, applies_to, rubric_ref }] }`
   - Human output: formatted table with id, domains, artifact types

2. **Create `src/commands/reviewer/show.ts`** — `reviewerShowCommand`:
   - `defineCommand` with `meta: { name: "reviewer:show" }`
   - Args: `...globalArgs`, positional `id` (required string)
   - Calls `registry.getById(id)`, returns full entry details including rubric ref and thresholds
   - JSON output: `{ ok: true, id, version, domains, applies_to, rubric_ref, score_range, passing_threshold_per_dimension, prompt_length }`
   - Error if ID not found: `{ ok: false, error: "Reviewer 'X' not found", code: "ENTITY_NOT_FOUND" }`

3. **Create `src/commands/rubric/list.ts`** — `rubricListCommand`:
   - `defineCommand` with `meta: { name: "rubric:list" }`
   - Args: `...globalArgs`, `...listArgs`
   - Resolves plugin dir, calls `loadAllRubrics(rubricDir)`, returns summary list
   - JSON output: `{ ok: true, total: N, items: [{ id, dimension_count, max_rounds }] }`

4. **Create `src/commands/rubric/show.ts`** — `rubricShowCommand`:
   - `defineCommand` with `meta: { name: "rubric:show" }`
   - Args: `...globalArgs`, positional `name` (required string)
   - Loads specific rubric, returns full dimension details
   - JSON output: `{ ok: true, id, version, dimensions: [...], convergence: {...} }`
   - Error if not found: `{ ok: false, error: "Rubric 'X' not found", code: "ENTITY_NOT_FOUND" }`

5. **Create `src/commands/rubric/validate.ts`** — `rubricValidateCommand`:
   - `defineCommand` with `meta: { name: "rubric:validate" }`
   - Args: `...globalArgs`, optional `name` (validates specific rubric if provided, all rubrics if omitted)
   - Loads registry + rubrics, calls `validateRubrics()`, returns validation result
   - JSON output: `{ ok: true, valid: boolean, errors: string[], warnings: string[] }`
   - Exit code 1 if `valid: false`

6. **Create plugin dir resolver** utility at `src/util/plugin-dir.ts`:
   - `resolvePluginDir(): string` -- returns the path to the `plugin/` directory relative to the repo root
   - No existing utility covers this: `resolveProjectDir` resolves `.goodplan/` project directories, not the plugin source directory
   - Needed by reviewer/rubric commands to find `plugin/agents/` and `plugin/rubrics/`

7. **Register all 5 commands** in `src/commands/main.ts`:
   - Import `reviewerListCommand`, `reviewerShowCommand`, `rubricListCommand`, `rubricShowCommand`, `rubricValidateCommand`
   - Add to `subCommands`: `"reviewer:list"`, `"reviewer:show"`, `"rubric:list"`, `"rubric:show"`, `"rubric:validate"`

8. **Write CLI integration tests** at `tests/trust/reviewers/cli.test.ts`:
   - Build binary first: `Bun.spawnSync(["bun", "run", "build"])` in `beforeAll`
   - Test: `./gp reviewer:list --json` returns `ok: true` with `items.length === 20`
   - Test: `./gp reviewer:show reviewer-holistic --json` returns `ok: true` with `id === "reviewer-holistic"` and `domains` array
   - Test: `./gp reviewer:show nonexistent --json` returns `ok: false` with `code === "ENTITY_NOT_FOUND"`
   - Test: `./gp rubric:list --json` returns `ok: true` with items
   - Test: `./gp rubric:show holistic --json` returns `ok: true` with `id === "holistic"` and `dimensions` array
   - Test: `./gp rubric:validate --json` returns `ok: true, valid: true` (all production rubrics should be valid)
   - Note: CLI tests run against the built binary, not imported modules. They do NOT need a `.goodplan/` directory — reviewer/rubric commands read from plugin dir, not project state.

### Verification

```bash
bun run build
./gp reviewer:list --json | head -5
./gp reviewer:show reviewer-holistic --json
./gp rubric:list --json
./gp rubric:show holistic --json
./gp rubric:validate --json
bun test tests/trust/reviewers/cli.test.ts
```

All commands must return valid JSON with `ok: true`. Validate must report `valid: true`. All integration tests must pass.
