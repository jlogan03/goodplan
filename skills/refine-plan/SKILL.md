---
name: refine-plan
description: >
  Use when the user invokes /refine-plan, or asks to review, improve, validate, or
  stress-test an implementation plan. Applies to any domain: web dev, ML/data science,
  scientific computing, systems programming, CLI tools, agent skills, MCP servers.
  Accepts a path to a plan file or directory.
---

# Refine Plan

Iteratively improve a plan document by spawning specialized review sub-agents in parallel, synthesizing their feedback, performing research when needed, and repeating until the plan is ready for implementation.


## Usage

```
/refine-plan <path-to-plan>
```

Path can be a single markdown file or a directory containing `_overview.md` + phase files.

## Decisions Context

Read `~/.claude/skills/_shared/references/decisions-format.md` for the decisions format and Loading Protocol. Load `.project/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for plan review — reviewers should check that the plan respects existing decisions.

Note: sub-agents load decisions themselves via codebase exploration (`.project/decisions/` is a project directory accessible to all agents), so decisions do not need to be passed in bootstrap prompts.

## Reviewer Roles

Read `references/reviewer-registry.md` for the full list of reviewers, their domains, and which prompt file contains each reviewer's template.

Conditional multi-reviewer approach: Holistic and Software Architecture always run. Specialists are selected when the plan content covers their domain — the orchestrator uses its judgment to decide which specialists are relevant. Re-evaluate specialist relevance when plan edits introduce new content.

**Severity levels** for all reviewer issues:
- **CRITICAL**: Bugs, data loss, security issues, blocks implementation
- **IMPORTANT**: Maintenance/performance problems, harder to implement correctly
- **MINOR**: Nice to have, won't cause problems if skipped

## Workflow

### Step 0: Load Plan and Prepare Working Copy

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

Read and follow `~/.claude/skills/_shared/references/dependency-research.md` for what to research and how to structure the output. If the plan references no external libraries, frameworks, tools, or APIs, skip to Step 2b.

**Execution**: Spawn research agents in parallel — one sub-agent per library/tool (`model: "opus"`). Each agent uses Context7 MCP tools first (resolve library ID -> query docs for the specific version), falls back to WebSearch for APIs/tools not in Context7. When sub-agents are unavailable, perform research inline.

Re-run this step after each iteration if plan edits introduce new dependencies.

### Step 2b: Codebase Context Discovery

Read and follow `~/.claude/skills/_shared/references/codebase-context-discovery.md`. Delegate to a single sub-agent (`model: "opus"`) when available; otherwise perform inline.

### Step 3: Refinement Loop

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

   c. **Spawn reviewers in parallel**:

      Launch all reviewers in a single message so they run concurrently — sequential launches would multiply wait time by the number of reviewers. Include `model: "opus"` so reviewers have the same reasoning capability as the orchestrator.

      For each reviewer, spawn a sub-agent using the reviewer bootstrap prompt from `references/sub-agent-prompts.md`. Pass the shared preamble path, prompt file path, and section heading (from reviewer-registry.md) along with placeholder values. The sub-agent reads its own instructions — do NOT read the reviewer prompt files yourself.

      For subsequent iterations where all reviewers' previous scores were 8+ and only MINOR issues remain, consider using `model: "sonnet"` to reduce cost.

   d. **Collect reviewer summaries**: After all reviewer sub-agents return, capture each sub-agent's one-line return value. Concatenate these into a newline-separated list.

      **Synthesize feedback**: Spawn a synthesis sub-agent (`model: "opus"`) using the template from `references/sub-agent-prompts.md`. Pass the concatenated reviewer summaries as `{reviewer_summaries}`. The synthesis agent reads reviewer files from `{run_dir}/round-{iteration}/reviews/`, writes merged feedback to `{run_dir}/round-{iteration}/merged.md`, and returns a compact summary. Use the summary for loop decisions (scores, severity, stall detection). Do NOT read `merged.md` yourself — pass its path to the next agent.

      **Model selection policy**:

      | Sub-agent | Default model | Cost-reduction condition | Reduced model |
      |---|---|---|---|
      | Domain reviewer | opus | All previous scores 8+, only MINOR issues | sonnet |
      | Synthesis | opus | All reviewer scores 8+, no CRITICAL/IMPORTANT | sonnet |
      | Plan editor | opus | Only MINOR DIRECTLY_ACTIONABLE items | sonnet |

   e. **Display iteration summary**: After synthesizing feedback, display the iteration results to the user using the Iteration Summary Template (see "Output Templates" below). This must be shown every iteration, not just every 3.

   f. **Check for completion**: The orchestrator (you) is the sole authority on plan readiness.

      **Full pass** — exit the loop and proceed to Step 4 when:
      - ALL reviewer scores are 9 or higher, AND
      - No reviewer flagged any CRITICAL or IMPORTANT issues

      **Early exit** — also exit if after 5+ iterations:
      - No CRITICAL or IMPORTANT issues remain, AND
      - ALL scores are 8 or higher, but some are below 9

      On early exit, warn the user: report which reviewers scored below 9, their reasons, and whether the plan may need to be restructured, split into smaller plans, or have its scope reconsidered. The `-refined` output is still produced, but the user should review the flagged areas before implementing.

      **Before exiting the loop**: if the synthesis summary reports DIRECTLY_ACTIONABLE items, spawn one final plan-editor sub-agent with the merged feedback file path to apply fixes. No re-review needed.

      Otherwise, continue iterating.

   g. **Categorize feedback**: Each reviewer issue includes a `Resolution` tag. Use these to sort the merged feedback:
      - **USER_INPUT**: Only the user can answer
      - **RESEARCH_NEEDED**: External API/library docs needed
      - **CODEBASE_EXPLORATION**: Can be answered by reading the codebase
      - **DIRECTLY_ACTIONABLE**: Can be applied immediately

      If a reviewer didn't include a Resolution tag, categorize manually.

   h. **Handle user input needs** (if USER_INPUT count > 0): Read the `### Unresolved (USER_INPUT required)` section of merged.md. Present all questions to the user in a single batch using AskUserQuestion. After receiving answers, append a `### USER_INPUT Resolved` section to merged.md with each question and the user's answer. This makes answers available to both the plan editor (this iteration) and reviewers (next cycle).

   i. **Perform research** (if RESEARCH_NEEDED count > 0): Read the `### RESEARCH_NEEDED` section of `{run_dir}/round-{iteration}/merged.md`. Spawn one research sub-agent per topic (`model: "opus"`) in parallel. Each agent:
      - Uses Context7 MCP tools first, falls back to WebSearch
      - Writes results to `<scope_dir>/research/<topic>.md` with version and fetch date header
      - For CODEBASE_EXPLORATION items, use Grep/Glob/Read instead of external search

      After all research agents return, append a `### Available Research` section to the merged feedback file listing the paths of newly created research files. This makes them available to both the plan-editor (this iteration) and reviewers (next iteration).

   j. **Apply feedback**: Spawn a plan-editor sub-agent (`model: "opus"`) using the template from `references/sub-agent-prompts.md`. Pass the merged feedback file path and plan path. The editor reads feedback and applies edits, consulting research files listed in `### Available Research` as needed.

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

Display the Completion Summary Template (see "Output Templates" below).


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

Display after every iteration, immediately after synthesizing feedback and before applying fixes.

```
---

### Iteration {N} Review

**Reviewers**: {reviewer1} ({score}/10), {reviewer2} ({score}/10), ...

| # | Severity | Issue | Source | Resolution |
|---|----------|-------|--------|------------|
| 1 | CRITICAL | {brief issue description} | {Reviewer name(s)} | {DIRECTLY_ACTIONABLE / USER_INPUT / RESEARCH_NEEDED / CODEBASE_EXPLORATION} |
| 2 | IMPORTANT | {brief issue description} | {Reviewer} | {resolution} |
| ... | ... | ... | ... | ... |

**Contradictions**: {N resolved, N unresolved — or "None"}
**USER_INPUT needed**: {brief list — or "None"}
**RESEARCH_NEEDED**: {brief list of topics to research — or "None"}

**Actions**: {what will be done — e.g., "Researching 2 topics, then applying 4 IMPORTANT and 3 MINOR fixes. Asking user about 1 item."}

---
```

Notes:
- List ALL issues, not just a summary count. Users want to see what was found.
- Order by severity (CRITICAL first, then IMPORTANT, then MINOR).
- Keep issue descriptions to one line — enough to identify the issue, not the full explanation.
- The "Source" column shows which reviewer(s) flagged the issue. If multiple reviewers flagged the same issue (deduplicated), list all of them (e.g., "Holistic, Backend").
- The "Actions" line previews what happens next before the orchestrator proceeds.

### Completion Summary Template

Display at the end of Step 5, after renaming to `-refined`.

```
---

## Refinement Complete

**Final plan score**: {min score across all reviewers in final iteration}/10
**Path**: {path to -refined file or directory}
**Iterations**: {N}

### Score Progression

| Iteration | {Reviewer1} | {Reviewer2} | {Reviewer3} | ... |
|-----------|-------------|-------------|-------------|-----|
| 1         | {score}     | {score}     | {score}     |     |
| 2         | —           | {score}     | {score}     |     |
| ...       |             |             |             |     |

(Use — for reviewers not active in that iteration)

### Issues Resolved Per Iteration

**Iteration 1** ({N} issues: {breakdown by severity})

| # | Severity | Issue | Source | Status |
|---|----------|-------|--------|--------|
| 1 | IMPORTANT | {brief description} | {Reviewer} | Fixed |
| 2 | MINOR | {brief description} | {Reviewer} | Fixed |
| 3 | MINOR | {brief description} | {Reviewer} | Skipped — stylistic |

**Iteration 2** ({N} issues: ...)

| # | Severity | Issue | Source | Status |
|---|----------|-------|--------|--------|
| ... | ... | ... | ... | ... |

### Remaining Issues

{List any unresolved MINOR issues, or "None — all issues resolved."}

---
```

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

- **Team defaults**: `~/.claude/skills/_shared/references/team-defaults.md` (optional) — Team-specific tool and process preferences. If this file exists, read it and fill in the `{team_defaults}` placeholder in every reviewer's shared preamble. If absent, set `{team_defaults}` to empty. The file uses a 3-tier enforcement model: enforce conventions the codebase already follows, suggest defaults when no convention exists, defer when the codebase uses a different approach.
- **Shared preamble**: `references/shared-preamble.md` — read by each reviewer sub-agent directly via bootstrap
- **Reviewer registry**: `references/reviewer-registry.md` — reviewer domains and prompt file locations
- **Sub-agent prompt templates**: `references/sub-agent-prompts.md` — reviewer bootstrap prompt template
- **Dependency research**: `~/.claude/skills/_shared/references/dependency-research.md` — research targets, version detection, output format, and reviewer mapping
- **Codebase context discovery**: `~/.claude/skills/_shared/references/codebase-context-discovery.md` — in-repo documentation, freshness assessment, PR history, and git activity analysis
- **Reviewer prompts** (read only the files for spawned reviewers):
  - `references/reviewers-always.md` — Holistic
  - `references/reviewers-language.md` — Python, Rust, C++, TypeScript and JavaScript
  - `references/reviewers-scientific.md` — Algorithm/Numerical/Validation, Performance/Parallelism, ML, Data I/O
  - `references/reviewers-web.md` — Backend, Frontend, Data Layer, DevOps and Infra, Background Jobs & Task Processing
  - `references/reviewers-ai-tooling.md` — Agent Skill, MCP Server
  - `references/reviewers-cross-cutting.md` — UX & Information Architecture, Software Architecture, TUI and CLI, Repo, Tooling, & Docs, CI & GitHub Workflows, API Contract
