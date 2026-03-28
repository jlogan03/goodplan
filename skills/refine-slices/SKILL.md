---
name: refine-slices
description: >
  Refines slice definitions, sequencing, and goal clarity. When an active
  epic exists, operates on the epic's slices/ directory. Falls
  back to .project/slices/ when no active epic. Runs after /create-slices
  to iteratively improve slice quality. Triggers include: 'review slices', 'improve
  slice goals', 'slice quality', 'are these slices good', 'refine slices', 'are my
  slices well-ordered', 'check slice dependencies', 'slice ordering review', 'improve
  slice sequencing', 'reorder slices'.
requires: goodplan >= 1.0.0
---

# Refine Slices

Iteratively improve slice goal definitions and sequencing by spawning specialized review sub-agents in parallel, synthesizing their feedback, and repeating until slice quality is high. Uses the shared iteration loop (`../_shared/references/iteration-loop.md`).

## Loop Parameters

| Parameter | Value |
|---|---|
| **Reviewer list** | Software Architecture (always-on), Architecture Alignment (always-on), Tracer Bullet Quality (always-on), Risk/Dependency Analysis (always-on) |
| **Exit criteria** | All reviewers >= 9 |
| **Early exit** | All reviewers >= 8 after minimum 3 iterations |
| **Max iterations** | 4 (expect 2-3 typically) |
| **Sub-agent prompts** | Bootstrap and synthesis: `../refine-plan/references/sub-agent-prompts.md`. Editor only: `references/sub-agent-prompts.md` (local) |
| **Working directory** | In-place working copies alongside originals (e.g., `$SLICES_ROOT/01-user-auth/goal-refining.md`) plus `sequencing-refining.md` alongside `sequencing.md`. A manifest lists all working copy full paths. `$SLICES_ROOT` is `.project/slices/` (top-level) or `.project/epics/<name>/slices/` (epic-scoped, where `<name>` comes from `goodplan status --json` → `.activeEpic.name`). |
| **Run directory** | `$SLICES_ROOT/slices-refining/` (holding `round-N/reviews/`, `merged.md`) |
| **review_context** | `"slice goal definitions and sequencing"` |

## Scope Resolution

**Epic detection**: Before beginning, load `../_shared/references/epic-conventions.md` for epic directory structure and conventions. Query `goodplan status --json` and check `.activeEpic`. If an active epic exists, set `$SLICES_ROOT` to `.project/epics/<activeEpic.name>/slices/`. If no active epic, use `.project/slices/`. All paths below use `$SLICES_ROOT` as the base. When epic-scoped, also load the epic's `goal.md` and `architecture/` as additional context for refinement.

## Scope Exclusion

**IMPORTANT**: Side quest `goal.md` files (`.project/side-quests/*/goal.md`) are explicitly excluded from this skill. Only slice goal files under `.project/slices/` or `epics/<name>/slices/` (where `<name>` is the active epic name from `goodplan status --json`) are in scope. When discovering files, filter these out before creating working copies.

## Decisions Context

Read `../_shared/references/decisions-format.md` for the decisions format and Loading Protocol. Load `.project/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for slice review.

## Reviewer Roles

Read `references/reviewer-registry.md` for the full list of reviewers, their domains, and which prompt file contains each reviewer's template.

All four reviewers are always-on for this skill. All run every iteration (no conditional selection needed).

**Reviewer spawn supplementary instruction**: When spawning reviewers, inject a supplementary block after bootstrap for all 4 reviewers:

> This review covers multiple files. Prefix each issue with the filename it applies to (e.g., `goal-refining.md [03-my-slice]`: ...).

For Software Architecture (shared prompt from `../../_shared/references/reviewers-cross-cutting.md`), inject this as an additional block appended to bootstrap. For the 3 slice-specific reviewers, this instruction is already embedded in their prompt templates in `references/reviewers-slices.md`.

**Filename prefix fallback**: If a reviewer issue lacks a filename prefix, the editor should try to infer from context. If not possible, skip and log as unresolvable. Synthesis should note unresolvable issues.

## Workflow

### Step 0: Load Context

Read `../_shared/references/cli-interaction.md` for CLI interaction conventions and error handling patterns.

Verify CLI availability and compatibility:

```bash
goodplan --version --json
```

If the command fails, stop: "The `goodplan` CLI is required but not found. Install it with `bun run build` in the goodplan repo, or ensure it's on your PATH."

If the version doesn't satisfy `requires: goodplan >= 1.0.0`, stop: "This skill requires goodplan >= 1.0.0 but found X.Y.Z. Upgrade the CLI."

Resolve `$SLICES_ROOT` per the Scope Resolution section above.

Read all relevant project state:
- `.project/idea.md`
- `.project/architecture/` (all files)
- For epic-scoped: the epic's `goal.md` and `architecture/` (target architecture)
- `.project/conventions.md`
- `.project/decisions/` (following Loading Protocol)
- Learnings via `goodplan learning:list --json`
- `$SLICES_ROOT/sequencing.md`
- All `$SLICES_ROOT/*/goal.md` files (excluding side quests)

Also load `.project/architecture/_overview.md` and extract the `## Subsystem Maturity` table. If no maturity table exists, set `{maturity_summary}` to empty. Also read `../_shared/references/maturity-legend.md` and store its content as `{maturity_legend}`. If maturity data was found, display which slices have `## Maturity Note` sections in their goal.md and which may be missing them — this gives the user early visibility before the review loop starts. When filling shared preamble placeholders for reviewer sub-agents (Step 3), include `{maturity_summary}` and `{maturity_legend}`. When `{maturity_summary}` is empty, omit the `## Subsystem Maturity` section from the shared preamble entirely.

### Step 1: Verify Goal Clarity

1. Read the slice definitions and sequencing
2. State the overall goal as you understand it: what these slices collectively accomplish and what "good" looks like for the slice definitions
3. Use AskUserQuestion to confirm with the user
4. Document the confirmed goal in the run directory

### Step 2: Create Working Copies

1. For each `goal.md` under `$SLICES_ROOT/NN-*/`, create `goal-refining.md` alongside it
2. Create `sequencing-refining.md` alongside `$SLICES_ROOT/sequencing.md`
3. Write a manifest file at `$SLICES_ROOT/slices-refining/manifest.md` listing all working copy full paths
4. Set up the run directory: `mkdir -p $SLICES_ROOT/slices-refining/`

### Step 3: Refinement Loop

Enter the shared iteration loop (read `../_shared/references/iteration-loop.md` for the full mechanics). Skill-specific details:

- **`{plan_file_paths}`**: Newline-separated list of all working copy paths (from manifest)
- **Plan type**: `directory-based` — `sequencing-refining.md` as "overview", `goal-refining.md` files in slice order as "phase files"
- **All 4 reviewers run every iteration** (all always-on)
- **Subsequent iterations**: Only re-spawn reviewers whose previous round had unresolved CRITICAL or IMPORTANT issues. If a reviewer found only MINOR issues, skip it.

For each iteration:
1. Create iteration directory: `$SLICES_ROOT/slices-refining/round-{N}/reviews/`
2. Spawn all active reviewers in parallel (`model: "opus"`)
3. Collect reviewer summaries, spawn synthesis sub-agent
4. Display iteration summary to user
5. Check exit criteria (see Loop Parameters)
6. Handle USER_INPUT and RESEARCH_NEEDED if present
7. Spawn editor sub-agent using `references/sub-agent-prompts.md` editor template
8. Continue or exit

### Step 4: Finalize

On loop exit:
1. Rename each `goal-refining.md` to `goal.md` (overwriting original)
2. Rename `sequencing-refining.md` to `sequencing.md` (overwriting original)
3. Leave the run directory (`$SLICES_ROOT/slices-refining/`) in place for audit

### Step 5: Submit via CLI

For epic-scoped refinement, submit the completed refinement via CLI. The CLI handles state transitions and activity recording:

```bash
echo '{"scores":{"overall":<min_score>}}' | goodplan submit-refine-slices --epic <name> --json
```

For non-epic scopes, no CLI mutation is needed — the renamed artifacts serve as the completion record.

## Cleanup on Interruption

- **Before any iteration** (no `round-1/` exists): Delete all working copies using manifest (or glob `*-refining.md` under `$SLICES_ROOT` if no manifest). Remove the run directory.
- **Mid-iteration** (at least one `round-N/` exists): Leave working copies in place for resume. No state writes needed — the CLI status stays at the current phase, and re-running the skill detects progress via existing working copies.

## When to Ask the User

Only stop and ask when you encounter:
- Slice scope ambiguity that requires product/business judgment
- Conflicting reviewer feedback that can't be resolved by domain expertise
- Fundamental sequencing questions (e.g., "should we build X before Y?") where the trade-off isn't clear

Do NOT ask for permission to continue between iterations.

## Output Templates

### Iteration Summary Template

Use the shared Iteration Summary from `../_shared/references/output-templates.md` with `{scope_prefix}` = empty (omit).

### Completion Summary Template

Display at the end of Step 5 when the refinement loop exits. Use the Completion Summary Template from `../_shared/references/output-templates.md` with these skill-specific values:

- `{completion_heading}`: `Refinement Complete`
- `{score_label}`: `score`
- `{skill_specific_header_fields}`: none
- `{issues_resolved_variant}`: omit variant label — use total count: `**Total**: {N} issues ({breakdown by severity})`
- `{skill_specific_extension_sections}`: `### Slices Modified` table (`Slice | Change`)

## References

- **Shared iteration loop**: `../_shared/references/iteration-loop.md`
- **Reviewer registry**: `references/reviewer-registry.md`
- **Slice reviewer prompts**: `references/reviewers-slices.md`
- **Software Architecture prompt**: `../_shared/references/reviewers-cross-cutting.md` (section `## Software Architecture Reviewer`)
- **Sub-agent prompts (bootstrap + synthesis)**: `../refine-plan/references/sub-agent-prompts.md`
- **Sub-agent prompts (editor)**: `references/sub-agent-prompts.md`
- **Shared preamble**: `../refine-plan/references/shared-preamble.md`
- **Team defaults**: `../_shared/references/team-defaults.md` (optional)
