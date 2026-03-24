---
name: audit-architecture
description: >
  Compare intended architecture against actual code, evaluate whether the target
  architecture should evolve, and propose side quests for gaps and improvements.
  When an active epic exists, audits the epic's architecture directory.
  Falls back to `.project/architecture/` for side quests and project-level work.
  Common triggers: 'audit the architecture', 'check for architecture drift',
  'compare architecture vs code', 'is the code matching the architecture',
  'architecture audit', 'audit architecture', 'how does the code compare to the
  architecture', 'check architecture alignment', 'has the code drifted from the
  architecture', 'architecture gap analysis'.
requires: goodplan >= 1.0.0
---

# Audit Architecture

Compare architecture files against the actual codebase. When an active epic exists, audits the epic's architecture; otherwise falls back to `.project/architecture/`. Two functions:

1. **Gap analysis** — where does code not match architecture? (implementation drift)
2. **Architecture reassessment** — given what we've learned from building, should the target architecture itself change?

Both produce actionable output: side quest proposals with specific scope.

**Does NOT use `iteration-loop.md`** — the pattern here (parallel exploration, reconciliation, reassessment) is structurally distinct from the review-iterate loop.

**Sequencing with refine-architecture**: Run `/audit-architecture` first, then `/refine-architecture` on updated files. Auditing first prevents optimizing files about to be invalidated.

## Step 0 — Version Check

Read `../_shared/references/cli-interaction.md` for CLI interaction conventions and error handling patterns.

Verify CLI availability and compatibility:

```bash
goodplan --version --json
```

If the command fails (not found, non-zero exit), stop: "The `goodplan` CLI is required but not found. Install it with `bun run build` in the goodplan repo, or ensure it's on your PATH."

If the version doesn't satisfy `requires: goodplan >= 1.0.0`, stop: "This skill requires goodplan >= 1.0.0 but found X.Y.Z. Upgrade the CLI."

## Step 1 — Load Context

**1a. Resolve architecture path**: Read `../_shared/references/epic-conventions.md` for epic directory structure. Detect the active epic via CLI:

```bash
goodplan status --json
```

Check the `.activeEpic` field in the response. Resolve paths based on result:
- **Active epic found** (`.activeEpic` is not null): `$ARCH_DIR` = `.project/epics/<activeEpic.name>/architecture/`, `$FLOW_SCOPE` = `"epics/<activeEpic.name>"`
- **No active epic** (`.activeEpic` is null): `$ARCH_DIR` = `.project/architecture/`, `$FLOW_SCOPE` = `"project"`

**1b. Scaffold detection**: When falling back to `.project/architecture/` (no active epic), check whether `_overview.md` contains the `<!-- scaffold -->` marker:

```bash
head -5 .project/architecture/_overview.md 2>/dev/null
```

If the marker is present, warn the user: "Top-level architecture is a scaffold pointing to the active epic's architecture. Run `/create-architecture` first or operate on the epic architecture directly." Then stop. Do not treat the scaffold as real architecture — auditing it would produce misleading gap analysis.

1. **Read architecture files**: Glob `$ARCH_DIR/**/*.md`. If the directory does not exist or is empty, tell the user: "No architecture files found — run `/create-architecture` first." Then stop.

2. **Load decisions**: Read `../_shared/references/decisions-format.md` for the Loading Protocol. Glob `.project/decisions/*.md`, skip superseded, flag any `revisiting` to the user.

3. **Load maturity conventions**: Read `../_shared/references/maturity-conventions.md` for maturity level definitions, promotion criteria, invariant format, and fitness function format. This is the authoritative source — audit-architecture's `references/guidance.md` provides audit-specific strategies that build on these conventions.

4. **Load learnings and conventions**: Read `.project/learnings.md` and `.project/conventions.md` (if they exist).

5. **Load recent activity-log**: Query recent activity filtered to the scope being audited:

   ```bash
   goodplan state --json --query '[.["activity-log.jsonl"][] | select(.scope | startswith("'"$FLOW_SCOPE"'"))] | .[-20:]'
   ```

   (Where `$FLOW_SCOPE` is the scope resolved in Step 1a, e.g., `"epics/my-epic"` or `"project"`.)

6. **Expertise check (load)**: Read `## Expertise` section from `~/.claude/CLAUDE.md` to calibrate communication depth.

7. **Resume detection**: Glob `.project/audits/architecture-*.md` and read the most recent. If it contains a `<!-- partial — interrupted` marker, present the partial report and ask: resume from where it left off, or start fresh?

8. **Read guidance**: Read `references/guidance.md` for exploration strategy, severity levels, and side quest proposal format.

## Step 2 — Gap Analysis

Spawn **one exploration sub-agent per architecture file** (model: `"opus"`), running in parallel. Each sub-agent is scoped to a single architecture file and the codebase areas it describes.

Read `references/sub-agent-prompts.md` for the self-contained exploration agent prompt template. For each architecture file, fill in the template with:
- The architecture file path
- A brief description of the codebase areas it covers (derived from reading the file)

Each sub-agent:
- Reads its assigned architecture file to understand intended structure
- Explores **only** the codebase areas described by that file: file structure, imports, module boundaries, API surfaces
- Compares intended vs actual using these dimensions (aligned with Software Architecture reviewer criteria 1-11):
  - **Coupling between subsystems**: imports crossing documented boundaries (criterion 2: dependency direction)
  - **Interface depth**: are modules deep or shallow in practice? (criteria 8-11: deep module evaluation)
  - **Pattern divergence**: code uses patterns not described in architecture
  - **Missing subsystems**: code exists that no architecture file describes
  - **Dead architecture**: architecture describes subsystems that don't exist in code
- Returns structured findings with evidence (specific files, import paths, pattern examples)

## Step 2b — Reconcile Findings

After all sub-agents return, reconcile:

1. **Deduplicate**: Same boundary violation reported from both sides collapses to one finding.
2. **Resolve contradictions**: When sub-agents scoped to different architecture files reach conflicting conclusions about the same codebase area, use the architecture file with more specific ownership as authority.
3. **Merge**: Combine into a single reconciled findings list with severity levels (from `references/guidance.md`).

Present the reconciled findings to the user before proceeding.

## Step 3 — Architecture Reassessment

Based on reconciled gap findings + `learnings.md` + decisions + the conversation, evaluate:

- **Boundary placement**: Are any architectural boundaries in the wrong place? (evidence: high cross-boundary coupling, frequent violations in the same direction)
- **Missing abstractions**: Are there abstractions that implementation revealed? (evidence: duplicated patterns across modules that should be centralized)
- **Goal/constraint shifts**: Have project goals or constraints shifted in ways the architecture should reflect?
- **Deep module opportunities**: Are there shallow modules with many callers that could absorb related complexity?

For each finding, present with recommendation:
> "I recommend changing X because [evidence]. This would require [scope of change]."

Use AskUserQuestion to confirm which findings to act on.

## Step 3b — Fitness Function Audit

For each subsystem with documented fitness functions (identify subsystems with fitness functions from the maturity table in `_overview.md`, then read the full entries from the `## Fitness Functions` sections in their `<subsystem>-api.md` files):

1. **Check test file existence**: Does the test file exist at the documented path?
2. **Verify test content** (if file exists): Read the test file and heuristically verify it tests the documented property — check test names, assertions, and imports for alignment with the stated architectural property.
3. **Classify each fitness function**:
   - **documented-and-present** — test file exists and appears to test the documented property
   - **documented-but-missing** — test file path is specified but the file does not exist
   - **test-exists-but-subsystem-changed** (stale) — test file exists but the subsystem's architecture has changed in ways that make the test potentially invalid (e.g., subsystem boundary moved, API surface changed)

Present findings grouped by status. Candidate fitness functions (not yet written) are noted but not audited.

## Step 3c — Invariant Compliance Check

Read `$ARCH_DIR/invariants.md`. If the file does not exist, log "no invariants.md found — skipping compliance check" and proceed to Step 3d.

For each invariant, use codebase exploration (Grep/Read) to spot-check compliance. This is heuristic, not exhaustive — look for obvious violations. Examples:

- If invariant says "no direct DB queries outside repository layer", grep for raw SQL outside the repository directory
- If invariant says "all user-facing errors include actionable message", check error handling patterns in API handlers
- If invariant says "sensitive data is never logged", grep for log statements near sensitive data fields

Present findings with evidence (specific files and lines). Each finding should reference the invariant ID (e.g., INV-001) and state whether compliance was confirmed, a violation was found, or the invariant needs amendment.

## Step 3d — Maturity Promotion Suggestions

Based on all findings (gap analysis from Step 2, reassessment from Step 3, fitness audit from Step 3b, invariant check from Step 3c), suggest maturity changes where evidence supports:

- **Promotions** — subsystem stable over recent slices, fitness functions in place and passing, multiple dependents, no significant gaps or violations
- **Demotions** — subsystem has new gaps, broken or missing fitness functions, reduced confidence, invariant violations

Present as recommendations with evidence — the user decides. If approved:

1. Update the maturity table in `$ARCH_DIR/_overview.md`
2. Write a decision record to `.project/decisions/` using the format from `../_shared/references/decisions-format.md`, documenting the maturity change with rationale

## Step 4 — Propose Side Quests

For each finding the user wants to address:

### For gaps (code doesn't match architecture)

Draft a side quest `goal.md` with `type: gap`:
- Which files/modules need changing
- What the target state looks like (reference the architecture file)
- Estimated scope (number of files, complexity)
- Gap quests go straight to `/create-plan` (no architecture changes needed)

### For architecture improvements (target should change)

1. Propose specific architecture file edits. Get user approval.
2. Write a decision to `.project/decisions/` (with user confirmation — see decisions format reference).
3. Apply approved edits to `$ARCH_DIR/` files.
4. Draft a side quest `goal.md` with `type: improvement`:
   - What changed in the architecture
   - Which code needs to follow
   - Estimated scope
   - Improvement quests should run `/refine-architecture` first, then `/create-plan`

Write approved side quests to `.project/side-quests/<name>/goal.md`:
```bash
mkdir -p ".project/side-quests/<name>"
```

## Step 5 — Write Audit Report

Write findings to `.project/audits/architecture-<date>.md`:
```bash
mkdir -p .project/audits
```

Report format:
```markdown
# Architecture Audit — <YYYY-MM-DD>

## Findings Summary
| # | Severity | Type | Finding | Action |
|---|----------|------|---------|--------|
| 1 | ... | gap/improvement/stale-fitness-function/missing-fitness-function/invariant-violation/invariant-amendment-needed | ... | side-quest-name / deferred / architecture-updated |

## Gap Analysis
<reconciled findings with evidence>

## Architecture Reassessment
<reassessment findings with recommendations>

## Fitness Function Audit
<fitness function status by subsystem: documented-and-present, documented-but-missing, stale>

## Invariant Compliance
<invariant compliance spot-check results with evidence>

## Maturity Changes
<promotions/demotions applied with rationale, or "No maturity changes">

## Side Quests Created
<list with paths>

## Architecture Files Updated
<list of files changed, with summary of changes>

## Deferred Findings
<findings user chose not to address now, with rationale>
```

Audit reports are operational artifacts — NOT canonical design. They live in `.project/audits/`, not `architecture/`. Old reports accumulate as historical record. Skills read `architecture/`, not `audits/`.

## Step 5b — Refresh Project Health

Update `.project/project-health.md` with findings from this audit.

1. **Read**: Read `.project/project-health.md` (if it exists) and `../_shared/references/project-health-format.md` for the canonical format.

2. **If missing**: Create `.project/project-health.md` using the format from `project-health-format.md`, populating initial content derived from audit findings:
   - **Health**: Areas where code drifts from architecture indicate fragility
   - **Technical Debt**: Gap findings (drift = debt) and reassessment findings (architecture needing change = design debt)
   - **Extensibility**: Reassessment findings about module depth and boundary quality

3. **If exists**: Update relevant sections, writing `<!-- Last updated by: audit-architecture, <date> -->` at the end of each updated section (per convention in `project-health-format.md`):
   - **Health**: Incorporate gap analysis findings — areas where code drifts from architecture indicate fragile zones
   - **Technical Debt**: Incorporate gap findings (drift = debt) and reassessment findings (architecture needing change = design debt)
   - **Extensibility**: Incorporate reassessment findings about module depth and boundary quality
   - **Recent Changes**: Not updated by audit (this is slice-driven)

4. **Confirm before writing**: Present a brief summary of proposed changes before writing. Proceed unless the user objects.

## Step 6 — Graceful Stop

If the user says "stop" or "that's enough" at any point:

- **During gap analysis (Step 2)**: Write partial findings to audit report with marker:
  ```
  <!-- partial — interrupted during gap analysis. Completed: [list of architecture files analyzed]. Remaining: [list not yet analyzed]. -->
  ```
- **During reassessment (Step 3)**: Write completed gap findings + note that reassessment was not reached:
  ```
  <!-- partial — interrupted during architecture reassessment. Gap analysis complete. Reassessment and quest proposals not reached. -->
  ```
- **During fitness function audit (Step 3b)**: Write completed gap findings + reassessment + partial fitness audit:
  ```
  <!-- partial — interrupted during fitness function audit — checked: [list of subsystems checked] -->
  ```
- **During invariant compliance check (Step 3c)**: Write completed gap findings + reassessment + fitness audit + partial invariant check:
  ```
  <!-- partial — interrupted during invariant compliance check — checked: [list of invariants checked] -->
  ```
- **During maturity promotion review (Step 3d)**: Write completed gap findings + reassessment + fitness audit + invariant check + partial maturity review:
  ```
  <!-- partial — interrupted during maturity promotion review — completed: [list of subsystems evaluated] -->
  ```
- **During quest proposal (Step 4)**: Write all findings + note which quests were not yet created:
  ```
  <!-- partial — interrupted during quest proposal. Findings complete. Quests created: [list]. Quests not created: [list]. -->
  ```
- **During project-health refresh (Step 5b)**: Write all findings to audit report (complete). Note project-health was not refreshed:
  ```
  <!-- partial — interrupted during project-health refresh. Audit report complete. Project-health.md not updated. -->
  ```

On resume (detected in Step 1): read the partial report and continue from where it left off.

## Step 7 — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise?

- **If yes**: Read `../_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently.

> **Note:** Audit is a read-only analysis skill — it does not trigger CLI state mutations. The audit report files in `.project/audits/` serve as the provenance record.

## When to Ask the User

Only stop and ask when you encounter:
- Ambiguity about whether a gap is intentional (code diverged deliberately)
- Architecture changes that would invalidate existing plans or active side quests
- Multiple valid interpretations of how architecture maps to code
- Contradiction between a decision and an architecture file

Do NOT ask for permission to continue between analysis steps.

## References

- **CLI interaction**: `../_shared/references/cli-interaction.md` — CLI conventions, error handling, invocation patterns
- **Guidance**: `references/guidance.md` — exploration strategy, severity levels, side quest format
- **Sub-agent prompts**: `references/sub-agent-prompts.md` — self-contained exploration agent prompt
- **Decisions format**: `../_shared/references/decisions-format.md`
- **Expertise tracking**: `../_shared/references/expertise-tracking.md`
