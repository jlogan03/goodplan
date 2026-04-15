# Trust Layer

Depends on the Engine Layer. Three subsystems: Convergence Evaluator, Extractor Framework, Reviewer Registry. Together they form the "trust substrate" — the mechanical system that determines when artifacts are good enough to proceed.

## Convergence Evaluator (`src/trust/convergence/`)

### Purpose

Pure function that reads `reviewer-scored` events + rubric YAML and returns a convergence verdict. Invoked by `gp refine:evaluate` (read-only — does not emit events itself).

### Interface

```typescript
type ConvergenceState = "CONVERGED" | "CONTINUE" | "CIRCUIT-BROKEN";

interface ConvergenceResult {
  state: ConvergenceState;
  // CONVERGED: all dimensions pass, zero BLOCKING/CRITICAL
  // CONTINUE: not yet converged, edit and re-review
  // CIRCUIT-BROKEN: one of three triggers fired
  reason?: CircuitBreakerReason;
  dimensions: DimensionResult[];
  blockingFindings: Finding[];
}

interface DimensionResult {
  name: string;
  score: number;
  threshold: number;
  passed: boolean;
  reviewerId: string;
  relevance: "high" | "medium" | "low";
}

type CircuitBreakerReason =
  | { type: "stuck-finding"; findingId: string; persistedRounds: number }
  | { type: "reviewer-disagreement"; dimension: string; reviewerScores: Array<{ reviewerId: string; score: number }> }
  | { type: "round-budget-exceeded"; rounds: number; maxRounds: number };

function evaluateConvergence(
  scoredEvents: ReviewerScoredEvent[],
  rubric: Rubric,
  relevanceWeights: Map<string, "high" | "medium" | "low">,
  maxRounds: number
): ConvergenceResult;
```

### Convergence Rules

Convergence requires ALL of:
1. Every dimension at or above its threshold (per rubric)
2. Zero findings with severity `BLOCKING` or `CRITICAL`

### Relevance Weighting

The reviewer routing function assigns a relevance weight to each reviewer for a given artifact:

| Relevance | Dimension below threshold | BLOCKING finding | CRITICAL finding | IMPORTANT finding |
|---|---|---|---|---|
| `high` | Blocks convergence | Blocks | Blocks | Warns |
| `medium` | Blocks convergence | Blocks | Blocks | Warns |
| `low` | Warns only | Warns | Warns | Warns |

Key distinction: `low`-relevance reviewers can never block convergence. They produce advisory warnings only.

### Circuit Breaker

Three triggers, any of which produces `CIRCUIT-BROKEN`:

1. **`stuck-finding`** — The same finding (matched by description similarity) persists across 2+ refinement rounds. The editor failed to address it or the fix was insufficient.

2. **`reviewer-disagreement`** — Two reviewers produce contradictory scores on the same dimension (e.g., one scores 5/5, another scores 1/5). Synthesis cannot resolve this mechanically.

3. **`round-budget-exceeded`** — Maximum refinement rounds reached (configurable per artifact type in rubric YAML). Default: 3 for plans, 5 for architecture.

### Override Mechanism

When circuit breaker trips or convergence seems unreachable:

```bash
gp refine:override --override="Reviewer X is miscalibrated on dimension Y"
```

Emits `convergence-overridden` event recording the override reason. Never silent — the override is permanently recorded in the event log.

---

## Extractor Framework (`src/trust/extractors/`)

### Purpose

Pure CLI functions (not LLM) that parse embedded structured sections from markdown artifacts. Run at commit time after refinement converges. The CLI reads the artifact, extracts structured data, and produces a typed payload for the commit event.

### Approach: Embedded Structured Sections

Artifacts are markdown-first (preserving "artifacts are context transport"). Each artifact template includes structured data in:
- **YAML frontmatter** (via `gray-matter`) for top-level metadata
- **Fenced `yaml extract` code blocks** for structured sections within the body

The extractor parses these known-format sections — not arbitrary prose.

### Libraries

| Library | Size | Purpose |
|---|---|---|
| `gray-matter` | ~3KB | YAML frontmatter parsing |
| `remark` + `remark-gfm` + `remark-frontmatter` | ~15KB | Markdown AST |
| `unist-util-select` | ~5KB | AST node queries |
| `yaml` | ~13KB | Fenced YAML block parsing |

All Bun-compatible. Total ~35KB added.

### Interface

```typescript
// Discriminated union on `success` (not an interface — interfaces cannot be unions)
type ExtractResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: "SCHEMA_INVALID";
        message: string;
        // Note: with exactOptionalPropertyTypes, `location` is either present
        // with both fields or absent entirely (not `undefined`).
        location?: { line: number; column: number };
      };
    };

// Generic extractor function signature
type Extractor<T> = (markdownContent: string) => ExtractResult<T>;
```

### Extractor Types (10)

| Extractor | Input Artifact | Key Output Fields |
|---|---|---|
| `ArchitectureExtract` | `architecture-current.md` | Subsystems (id, maturity, owns, dependsOn), communication patterns, proposed invariants |
| `ArchitectureTargetExtract` | `architecture-target.md` | Same fields, for target state |
| `PlanExtract` | `plan.md` | Chunks (id, description, expectation, redTest, verificationType), chunk dependencies, affected subsystems, rollback path |
| `SliceGoalExtract` | slice `goal.md` | Description, acceptance criteria, affected subsystems, dependencies, scope exclusions |
| `EpicGoalExtract` | epic `goal.md` | Description, scope, non-goals, success criteria, initial subsystems |
| `SideQuestGoalExtract` | side-quest `goal.md` | Description, scope, verification method, parent epic ref |
| `BriefingExtract` | `briefing.md` | Time context, current position, last action, where stopped, next action, attention items, deep links |
| `PressureTestExtract` | `pressure-test.md` | Failure modes, scaling cliffs, optionality ledger, error classes, locked-in assumptions, findings |
| `FindingExtract` | `finding.md` | Classification (blocking/non-blocking x in-scope/out-of-scope), reshape option, related subsystems |
| `SubsystemExtract` | `subsystem.md` | Id, name, maturity, description, owns, dependsOn, dependentCount |

### Error Handling

If a fenced block is malformed (missing closing fence, bad YAML, fails Zod validation):
1. CLI returns `SCHEMA_INVALID` structured error
2. Calling skill receives the error with location info
3. Skill asks the drafting agent to fix the specific block
4. Retry extraction — cheap because it's parsing, not LLM inference

---

## Reviewer Registry (`src/trust/reviewers/`)

### Physical Layout

```
plugin/reviewers/<id>.md       — default set shipped with plugin
.goodplan/reviewers/<id>.md    — project-level overrides (optional)
```

Project-level files override plugin defaults for the same `id`, allowing per-project threshold tuning.

### Reviewer File Format

YAML-fronted markdown. Frontmatter contains structured metadata; body contains the reviewer prompt.

**Version field:** The `version: 1` field tracks the reviewer's own schema version. When the reviewer frontmatter schema evolves (e.g., adding new required fields), the version is incremented. The reviewer registry validates against the expected schema for each version and rejects unknown versions with a clear error. This is separate from `schemaVersion` on event envelopes.

```yaml
---
id: reviewer-holistic
version: 1
domains: [alignment, completeness, coherence]
applies_to: [plan, architecture, goal, slice-set, pressure-test]
rubric_ref: rubrics/holistic.yaml
score_range: [1, 5]
passing_threshold_per_dimension:
  alignment: 4
  completeness: 4
  coherence: 4
---

# Holistic Reviewer

You are reviewing an artifact for goal alignment, completeness, and coherence...
```

### Routing Function

Given artifact type + affected subsystems + maturity level, returns the set of reviewers to dispatch with relevance weights.

```typescript
interface ReviewerRoute {
  reviewerId: string;
  relevance: "high" | "medium" | "low";
}

function routeReviewers(
  artifactType: string,           // "plan" | "architecture" | "goal" | ...
  affectedSubsystems: string[],   // subsystem IDs
  maxMaturity: string             // highest maturity among affected subsystems
): ReviewerRoute[];
```

### Reviewer Categories

**Always-on trio** (every artifact):
- `reviewer-holistic` — goal alignment, completeness, coherence
- `reviewer-invariant-checker` (new) — checks artifact against active invariants
- `reviewer-context-transport` (new) — ensures artifact is self-contained context for downstream phases

**Artifact-specific:**
- `reviewer-plan` (new), `reviewer-verification-plausibility` (new, BLOCKING relevance), `reviewer-goal` (new), `reviewer-slice-set` (new), `reviewer-software-architecture`

**Code-quality** (P11 code refinement):
- `reviewer-performance`, `reviewer-reliability` (new), `reviewer-security` (new), `reviewer-domain-correctness` (new), `reviewer-test-meaningfulness` (new), `reviewer-code-style` (new)

**Subsystem-specific** (routed by affected subsystems):
- `reviewer-typescript`, `reviewer-data-layer`, `reviewer-tui-cli`, `reviewer-agent-skill`, `reviewer-api-contract`, `reviewer-verification-spot-check` (new)

### Rubric Format

YAML artifacts at `plugin/rubrics/<name>.yaml`:

```yaml
id: holistic
version: 1
dimensions:
  - name: alignment
    description: "Does the artifact serve the stated goal?"
    scoring: 1-5
    threshold: 4
  - name: completeness
    description: "Are all required sections present and non-trivial?"
    scoring: 1-5
    threshold: 4
  - name: coherence
    description: "Do the parts fit together without contradiction?"
    scoring: 1-5
    threshold: 4
convergence:
  max_rounds: 3
  zero_blocking_required: true
  zero_critical_required: true
```

### Structured Reviewer Output

All reviewer agents must produce output matching:

```typescript
interface ReviewerPayload {
  dimensions: Array<{
    name: string;
    score: number;
    threshold: number;
    passed: boolean;
  }>;
  findings: Array<{
    severity: "BLOCKING" | "CRITICAL" | "IMPORTANT" | "MINOR";
    description: string;
    location?: string;
  }>;
  rationale: string;
}
```

This payload is recorded in `reviewer-scored` events and consumed by the convergence evaluator.

### CLI Commands

```bash
gp reviewer:list                    # list all registered reviewers
gp reviewer:show <id>               # show reviewer details + rubric
gp rubric:list                      # list all rubrics
gp rubric:show <name>               # show rubric dimensions
gp rubric:validate <name>           # validate rubric YAML schema
```

## Cross-References

- Engine layer (event envelope, derived state): [engine.md](./engine.md)
- Trust projection types (ConvergenceSnapshot, DimensionScore): defined in `src/schemas/` shared layer, imported by both engine and trust
- ContentRef SHA verification: trust-on-write; verification deferred to `gp verify` -- see [engine.md](./engine.md#data-integrity-verification-gp-verify)
- Command layer (refinement commands): [commands.md](./commands.md#refinement-commands-gp-refine)
- Context layer (trust data access via DerivedState projections): [context.md](./context.md#trust-data-access)
- Plugin architecture (reviewer files, rubric files): [plugin.md](./plugin.md)
- Extractor dependency tree: ~35KB (gray-matter ~3KB, remark+plugins ~15KB, unist-util-select ~5KB, yaml ~13KB) -- verify during implementation
