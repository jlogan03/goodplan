---
name: refine-plan
description: >
  Use when the user invokes /refine-plan, or asks to review, improve, validate, or
  stress-test an implementation plan. Detects stale assumptions via git dates and loads
  two-layer architecture (current + epic target) for context-aware review. Applies
  to any domain: web dev, ML/data science, scientific computing, systems programming,
  CLI tools, agent skills, MCP servers. Accepts a path to a plan file or directory.
requires: gp >= 1.0.0
---

# Refine Plan

Iteratively improve a plan document by spawning specialized review sub-agents in parallel, synthesizing their feedback, performing research when needed, and repeating until the plan is ready for implementation.


## Usage

```
/refine-plan <path-to-plan>
```

Path can be a single markdown file or a directory containing `_overview.md` + phase files.

## Decisions Context

Read `../_shared/references/decisions-format.md` for the decisions format and Loading Protocol. Load `.goodplan/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for plan review — reviewers should check that the plan respects existing decisions.

Note: sub-agents load decisions themselves via codebase exploration (`.goodplan/decisions/` is a project directory accessible to all agents), so decisions do not need to be passed in bootstrap prompts.

## Reviewer Roles

Read `references/reviewer-registry.md` for the full list of reviewers, their domains, and which prompt file contains each reviewer's template.

Conditional multi-reviewer approach: Holistic and Software Architecture always run. Specialists are selected when the plan content covers their domain — the orchestrator uses its judgment to decide which specialists are relevant. Re-evaluate specialist relevance when plan edits introduce new content.

**Severity levels** for all reviewer issues:
- **CRITICAL**: Bugs, data loss, security issues, blocks implementation
- **IMPORTANT**: Maintenance/performance problems, harder to implement correctly
- **MINOR**: Nice to have, won't cause problems if skipped

## Loop Parameters

These fill in the skill-specific slots defined by `../_shared/references/iteration-loop.md`:

| Parameter | Value |
|---|---|
| **Reviewer list** | Holistic (always), Software Architecture (always), domain specialists (conditional — see `references/reviewer-registry.md`) |
| **Exit criteria** | All scores >= 9, no CRITICAL or IMPORTANT issues |
| **Early exit** | After 5+ iterations: all scores >= 8, no CRITICAL or IMPORTANT |
| **Max iterations** | 12 |
| **Editor prompt path** | `references/sub-agent-prompts.md` § "Plan Editor Sub-Agent Prompt" |
| **Score thresholds** | Full pass: 9+, Early exit: 8+ after 5 iterations |
| **Scope constraints** | `<plan-name>-refining.md` (single file) or `<plan-name>-refining/` (directory) — never the original (path determined at Step 0b) |
| **Working directory** | `<plan-name>-refining.md` or `<plan-name>-refining/` (whichever exists after Step 0b) |
| **Run directory** | `<scope_dir>/refinement/` (where `scope_dir = dirname(plan_path)`) |
| **Backup directory** | N/A (original plan is preserved as backup) |
| **review_context** | `an implementation plan` |

## Workflow

### Step 0: Version Check and Context Loading

Read `../_shared/references/cli-interaction.md` for CLI interaction conventions and error handling patterns.

Verify CLI availability and compatibility:

```bash
"${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp" --version --json
```

If the command fails (not found, non-zero exit), stop: "The `gp` CLI is required but not found. Ensure the goodplan plugin is installed and enabled — run `/plugin` to check."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop: "This skill requires gp >= 1.0.0 but found X.Y.Z. Upgrade the CLI."

### Step 0b: Load Plan and Prepare Working Copy

1. Detect plan type (file vs directory). For directories, read `_overview.md` and list phase files.
2. Duplicate to a `-refining` working copy:
   - Single file: `<plan-name>.md` -> `<plan-name>-refining.md`
   - Directory: `<plan-name>/` -> `<plan-name>-refining/`
   - If a `-refining` copy already exists (from an interrupted run), ask the user whether to resume from it or start fresh.
3. **Check if single-file plan should be split**: If the `-refining` copy is a single file over ~300 lines, convert it to a directory-based plan now — large single files are harder for reviewers to work with and tend to grow further during refinement. See "Converting to Directory-Based Format" below.
4. The original is never modified — it serves as the source of truth for final verification.
5. All subsequent steps operate on the `-refining` copy.
6. **Derive plan slug**: Kebab-case, 2-4 words from the plan name (e.g., `user-auth`, `api-refactor`). Used for the run directory.
7. **Derive scope directory**: `scope_dir=$(dirname "<plan_path>")` — the directory containing the plan file (or plan directory). All research and refinement artifacts are stored here.

### Step 1: Verify Plan Goal Clarity

Complete this before entering the refinement loop — it prevents wasted iterations on misunderstood goals.

1. Read the plan and identify its goal — what the plan is trying to accomplish when implemented (not the goal of the refinement process itself)
2. State the plan's goal as you understand it and what "done" looks like for implementation
3. Use AskUserQuestion to confirm with the user
4. Document the confirmed goal in the `-refining` plan

### Step 2: Pre-Review Research

Read and follow `../_shared/references/dependency-research.md` for what to research and how to structure the output. If the plan references no external libraries, frameworks, tools, or APIs, skip to Step 2b.

**Execution**: Spawn research agents in parallel — one sub-agent per library/tool (`model: "opus"`). Each agent uses Context7 MCP tools first (resolve library ID -> query docs for the specific version), falls back to WebSearch for APIs/tools not in Context7. When sub-agents are unavailable, perform research inline.

Re-run this step after each iteration if plan edits introduce new dependencies.

### Step 2b: Codebase Context Discovery

Read and follow `../_shared/references/codebase-context-discovery.md`. Delegate to a single sub-agent (`model: "opus"`) when available; otherwise perform inline.

**Stale assumption detection**: Follow the Stale Assumption Detection Algorithm in `../_shared/references/epic-conventions.md`. When staleness is detected in refine-plan: include in the codebase context summary: "Architecture file <file> has changed since this goal was written — reviewers should verify the plan still aligns with current architecture."

**Epic architecture awareness**: Query `gp status --json` and check `.activeEpic`. If an active epic exists, read `.goodplan/epics/<activeEpic.name>/architecture/` alongside top-level architecture. Flag any conflicts between the plan and the active epic's target architecture in the codebase context summary.

Also load `.goodplan/conventions.md` if it exists — project conventions provide context for reviewers evaluating the plan.

Also load `.goodplan/architecture/_overview.md` and extract the `## Subsystem Maturity` table. If no maturity table exists, set `{maturity_summary}` to empty. Also read `../_shared/references/maturity-legend.md` and store its content as `{maturity_legend}`. If maturity data was found, display: "**Maturity context**: [list of subsystems at Maturing or Foundational, or 'All subsystems at Developing or below']". When filling shared preamble placeholders for reviewer sub-agents, include `{maturity_summary}` and `{maturity_legend}`. When `{maturity_summary}` is empty, omit the `## Subsystem Maturity` section from the shared preamble entirely.

### Step 3: Refinement Loop

Read `../_shared/references/iteration-loop.md` for the shared orchestration structure. This step fills in the plan-specific parameters.

**Run directory setup** (once at skill start, before the first iteration):
```bash
run_dir="<scope_dir>/refinement"
mkdir -p "$run_dir" "<scope_dir>/research"
```

Enter a review loop (max 12 iterations):

   a. **Determine reviewer scope**:

      If the previous iteration's plan-editor reported modifying the plan (Plan Modified: YES), re-read it before selecting reviewers. On the first iteration, always read the plan.

      Read `references/reviewer-registry.md`. Based on your understanding of the plan content, select which specialist reviewers are relevant to the domains covered.

      **First iteration**: Spawn holistic + software architecture (always) + all specialists whose domains are relevant to the plan.

      **Subsequent iterations**: Only re-spawn reviewers whose domain had unresolved CRITICAL or IMPORTANT issues. If a specialist's previous run found only MINOR issues, skip it. If plan edits introduced content in a new domain, add the relevant specialist.

   b. **Create iteration directory**:
      ```bash
      mkdir -p "$run_dir/round-{iteration}/reviews"
      ```

   c. **Spawn reviewers in parallel**: Follow iteration-loop.md § Reviewer Spawn Pattern. The sub-agent reads its own instructions — do NOT read the reviewer prompt files yourself.

   d. **Collect and synthesize feedback**: Follow iteration-loop.md § Synthesis Prompt Skeleton. Do NOT read `merged.md` yourself — pass its path to the next agent.

      **Model selection policy** (refine-plan-specific rows):

      | Sub-agent | Default model | Cost-reduction condition | Reduced model |
      |---|---|---|---|
      | Synthesis | opus | All reviewer scores 8+, no CRITICAL/IMPORTANT | sonnet |
      | Plan editor | opus | Only MINOR DIRECTLY_ACTIONABLE items | sonnet |

   e. **Display iteration summary**: After synthesizing feedback, display the iteration results to the user using the Iteration Summary Template (see "Output Templates" below). This must be shown every iteration, not just every 3.

   f. **Check for completion**: Follow iteration-loop.md § Exit Criteria Evaluation. On early exit, warn the user: report which reviewers scored below 9, their reasons, and whether the plan may need to be restructured, split into smaller plans, or have its scope reconsidered.

   g. **Categorize feedback**: Each reviewer issue includes a `Resolution` tag. Use these to sort the merged feedback:
      - **USER_INPUT**: Only the user can answer
      - **RESEARCH_NEEDED**: External API/library docs needed
      - **CODEBASE_EXPLORATION**: Can be answered by reading the codebase
      - **DIRECTLY_ACTIONABLE**: Can be applied immediately

      If a reviewer didn't include a Resolution tag, categorize manually.

   h. **Handle user input needs**: Follow iteration-loop.md § Handling USER_INPUT.

   i. **Perform research** (if RESEARCH_NEEDED count > 0): Follow iteration-loop.md § Handling RESEARCH_NEEDED. Each research agent uses Context7 MCP tools first, falls back to WebSearch. Writes results to `<scope_dir>/research/<topic>.md` with version and fetch date header.

   j. **Apply feedback**: Follow iteration-loop.md § Editor Sub-Agent Pattern.

   k. **Check plan size**: If the `-refining` plan is a single file and has grown past ~300 lines, convert it to directory-based format. See "Converting to Directory-Based Format" below.

   l. **Increment and continue**: Return to step 3a.

   m. **Max iterations**: If 12 reached, present remaining issues to user.

### Step 4: Final Verification

After the review loop exits (score 9+, no critical/important issues), perform a final sanity check before finishing. This catches goal drift — subtle shifts in scope or approach that accumulate across iterations.

1. Re-read the **original** plan (the unmodified source of truth)
2. Re-read the **-refining** plan (current state after all iterations)
3. Verify:
   - All original goals are still fully addressed — none diluted, dropped, or subtly shifted during refinement
   - The implementation approach in the refined plan makes sense given the codebase and the confirmed goal
4. If issues are found:
   - Apply fixes directly to the `-refining` plan
   - Re-spawn reviewers for one final review pass
   - Only ONE additional iteration is allowed here — this is a sanity check, not a new refinement loop
5. If everything checks out (or after the correction iteration passes):
   - Rename `-refining` to `-refined`:
     - Single file: `mv <plan-name>-refining.md <plan-name>-refined.md`
     - Directory: `mv <plan-name>-refining/ <plan-name>-refined/`

### Step 5: Completion

1. **Submit refinement via CLI**: If the plan is under `.goodplan/` and belongs to a slice or quest scope, use the appropriate CLI submit command. The CLI handles activity recording and state transitions.

   For slice scope:
   ```bash
   echo '{"scores":{"overall":<min_score>}}' | gp submit-refinement --slice <name> --json
   ```

   For quest scope:
   ```bash
   echo '{"scores":{"overall":<min_score>}}' | gp submit-refinement --quest <name> --json
   ```

   If the plan is standalone (not under `.goodplan/`), skip CLI mutation.

2. **Display summary**: Display the Completion Summary Template (see "Output Templates" below).


## Important Behaviors

- **Progress updates**: Display the Iteration Summary Template after every iteration (not just every 3). The user needs to see what was found and what's being fixed.
- **Track changes**: Note what feedback was addressed and from which reviewer(s).
- **Research first**: Do research before modifying the plan, not after.
- **Prioritize severity**: CRITICAL -> IMPORTANT -> MINOR.
- **Don't chase perfection**: If only MINOR issues remain after 5+ iterations, use the early exit path rather than burning iterations trying to push scores from 8 to 9.
- **Resolve contradictions**: Trust domain specialist on domain-specific conflicts; flag cross-domain contradictions for user input.

## When to Ask the User

Only stop and ask when you encounter:
- Domain knowledge not available in the codebase
- Product/business decisions (not engineering decisions)
- Multiple valid approaches with significant trade-offs
- Need for external system access or credentials
- Architecture decisions that significantly affect future scalability, reliability, or extensibility — where the best path isn't obvious from the codebase or plan

Do NOT ask for permission to continue between iterations. The review loop runs unattended unless one of the above applies.

## Common Mistakes

- Forgetting to re-evaluate specialist relevance after plan edits introduce new domains
- Not deduplicating research files when existing versions match the current lockfile
- Failing to fill all `{placeholders}` in reviewer prompts before spawning
- Running specialists sequentially when parallel execution is available
- Letting minor issues block progress — exit when only MINOR findings remain

## Output Templates

Display these templates exactly as shown (with actual values substituted). These are displayed to the user as text output, not written to files.

### Iteration Summary Template

Read `../_shared/references/output-templates.md` for the shared Iteration Summary template, substitution rules, and display rules. Use `{scope_prefix}` = empty (omit the Phase prefix). Display after every iteration.

### Completion Summary Template

Display at the end of Step 5, after renaming to `-refined`. Use the Completion Summary Template from `../_shared/references/output-templates.md` with these skill-specific values:

- `{completion_heading}`: `Refinement Complete`
- `{score_label}`: `plan score`
- `{skill_specific_header_fields}`: `**Path**: {path to -refined file or directory}`
- `{issues_resolved_variant}`: `Per Iteration` — use per-iteration tables with `# | Severity | Issue | Source | Status` columns
- `{skill_specific_extension_sections}`: none

## Converting to Directory-Based Format

When a single-file plan exceeds ~300 lines, split it into a directory for better reviewer focus and maintainability. Large plans only get larger during refinement, so convert early.

1. Create directory: `<plan-name>-refining/`
2. Extract the preamble (title, goal, architecture, tech stack, constraints, and any non-phase content) into `_overview.md`
3. Split each top-level phase/section into its own file, named with numeric prefix for ordering: `01-<phase-name>.md`, `02-<phase-name>.md`, etc.
4. Each phase file should start with a heading and be self-contained — a reviewer reading just that file (plus the overview) should understand the phase without reading other phase files
5. Remove the original single file: `rm <plan-name>-refining.md`
6. Update internal cross-references (e.g., "see Phase 3" becomes "see `03-<phase-name>.md`")

After conversion, all subsequent steps operate on the directory. The `-refined` output will also be a directory.

## References

- **Shared iteration loop**: `../_shared/references/iteration-loop.md` — orchestration pattern shared with refine-architecture and refine-slices
- **Team defaults**: `../_shared/references/team-defaults.md` (optional) — Team-specific tool and process preferences. If this file exists, read it and fill in the `{team_defaults}` placeholder in every reviewer's shared preamble. If absent, set `{team_defaults}` to empty. The file uses a 3-tier enforcement model: enforce conventions the codebase already follows, suggest defaults when no convention exists, defer when the codebase uses a different approach.
- **Shared preamble**: `references/shared-preamble.md` — read by each reviewer sub-agent directly via bootstrap
- **Reviewer registry**: `references/reviewer-registry.md` — reviewer domains and prompt file locations
- **Sub-agent prompt templates**: `references/sub-agent-prompts.md` — reviewer bootstrap prompt template
- **Dependency research**: `../_shared/references/dependency-research.md` — research targets, version detection, output format, and reviewer mapping
- **Codebase context discovery**: `../_shared/references/codebase-context-discovery.md` — in-repo documentation, freshness assessment, PR history, and git activity analysis
- **Reviewer prompts** (read only the files for spawned reviewers):
  - `references/reviewers-always.md` — Holistic
  - `references/reviewers-language.md` — Python, Rust, C++, TypeScript and JavaScript
  - `references/reviewers-scientific.md` — Algorithm/Numerical/Validation, Performance/Parallelism, ML, Data I/O
  - `references/reviewers-web.md` — Backend, Frontend, Data Layer, DevOps and Infra, Background Jobs & Task Processing
  - `references/reviewers-ai-tooling.md` — Agent Skill, MCP Server
  - `../../_shared/references/reviewers-cross-cutting.md` — UX & Information Architecture, Software Architecture, TUI and CLI, Repo, Tooling, & Docs, CI & GitHub Workflows, API Contract
