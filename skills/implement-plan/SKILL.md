---
name: implement-plan
description: >
  Use when the user wants to execute or implement a plan, invokes /implement-plan, or
  has a plan file/directory ready for implementation. Applies to any domain: web dev,
  ML/data science, scientific computing, systems programming, CLI tools, agent skills,
  MCP servers. Accepts a path to a plan file or directory.
---

# Implement Plan

Orchestrate the implementation of an entire plan by executing each phase with an implement-review-iterate loop, performing research as needed, and adapting the plan based on learnings.

**CRITICAL: This skill runs until ALL phases are complete.** Do not stop after completing a single phase.

## Usage

```
/implement-plan <path-to-plan>
```

Path can be a single markdown file or a directory containing `_overview.md` + phase files.

## Architecture

This skill is the **orchestrator**. It spawns sub-agents for implementation, generalist review, and domain specialist review, then coordinates the iteration loop. Sub-agents cannot spawn other sub-agents.

```
implement-plan (orchestrator)
  ├── spawns -> implementation sub-agent (pure implementation)
  ├── spawns -> generalist review sub-agent (code review)
  ├── spawns -> domain specialist reviewers (in parallel with generalist)
  ├── spawns -> synthesis sub-agent (merges reviewer output files)
  └── iterates between impl/review until all scores pass
      then IMMEDIATELY proceeds to the next phase
```

## Decisions Context

Read `~/.claude/skills/_shared/references/decisions-format.md` for the decisions format and Loading Protocol. Load `.project/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for implementation — the implementing agent should respect existing decisions.

Note: sub-agents load decisions themselves via codebase exploration (`.project/decisions/` is a project directory accessible to all agents), so decisions do not need to be passed in bootstrap prompts.

## Domain Specialist Reviewers

Read `references/reviewer-registry.md` for the list of domain specialist reviewers and their domains. These specialists are spawned alongside the generalist review agent during Step 3.2 to provide deeper domain-specific code review.

## Workflow

### Step 1: Load and Parse the Plan

1. **Detect plan type**: Check if the path is a file or directory.
2. **Load content**:
   - **Single-file**: Read the file, identify phases by markdown headings.
   - **Directory**: Read `_overview.md` for context, list `.md` files (excluding `_overview.md`), sort alphanumerically.
3. **Build phase list**: Each entry has name, path, and section (for single-file plans).
4. **Detect completion status**: Check for `[x]` checkboxes, "Complete", or "[DONE]" markers. Partially complete phases (some boxes checked) are included and resumed.
5. **Prepare for implementation**:
   - Build `phases_to_implement[]` with only incomplete phases.
   - **Derive plan slug**: Kebab-case, 2-4 words (e.g., `user-auth`, `api-refactor`). **CRITICAL: Use this exact slug for ALL commits throughout the plan.**
   - **Derive scope directory**: `scope_dir=$(dirname "<plan_path>")` — the directory containing the plan file (or plan directory). All research and implementation artifacts are stored here.
   - **Derive plan URL**: GitHub URL if remote exists, otherwise absolute local path.
   - Present summary: plan type, slug, total phases, completed vs remaining.

### Step 2: Pre-Implementation Research

Read and follow `~/.claude/skills/_shared/references/dependency-research.md` for what to research and how to structure the output. If the plan references no external libraries, frameworks, tools, or APIs, skip to Step 2b.

**Execution**: Spawn research agents in parallel — one per library/tool (`model: "opus"`). Each agent uses Context7 MCP tools first, falls back to WebSearch. When sub-agents are unavailable, perform research inline.

Re-scan before each phase — phases may reference different libraries. Only fetch what's new or changed. If documentation can't be found or is ambiguous, note the gap and proceed — the implementation agent can investigate further. Update the plan if research reveals issues (deprecated APIs, version incompatibilities, or libraries that should replace custom work).

### Step 2b: Codebase Context Discovery

Read and follow `~/.claude/skills/_shared/references/codebase-context-discovery.md`. Delegate to a single sub-agent (`model: "opus"`) when available; otherwise perform inline.

### Step 2.5: Ensure Clean Git State (MANDATORY)

Before starting the first phase, check `git status --porcelain`. Exclude the plan file/directory being implemented from the check. If ANY other uncommitted changes exist, stop and ask the user what they want to do with them (e.g., commit, stash, discard). Do NOT auto-commit pre-existing changes — they may be unrelated work-in-progress. Implementation must start from a clean git state (aside from the plan itself).

### Step 3: Main Execution Loop

**Run directory setup** (once at skill start, before the first iteration):
```bash
run_dir="<scope_dir>/implementation"
mkdir -p "$run_dir" "<scope_dir>/research"
```

**LOOP while phases remain to implement:**

#### 3.1: Pre-Phase Check

1. Re-read the plan only if the previous implementation agent reported modifying it (check its changed files list). Always re-read on the first iteration of each phase.
2. Verify dependencies on earlier phases are met.
3. **Database backup**: If the phase includes database changes (migrations, schema changes, data manipulation), ensure a backup exists before proceeding. Ask the user for their backup procedure if one isn't documented in the project.

#### 3.2: Implementation-Review Cycle (max 12 iterations)

Read the sub-agent prompt templates from `references/sub-agent-prompts.md` and fill in the `{placeholders}` with actual values.

**Every sub-agent Task tool call MUST include `model: "opus"`.**

**Inner loop:**

1. **Spawn implementation sub-agent** (`model: "opus"`) using the implementation prompt template. Pass the path to the merged feedback file (`{run_dir}/phase-{phase}/iteration-{iteration-1}/merged.md`), or `None` for the first iteration.

2. **Parse result**: Extract status (SUCCESS, PARTIAL, BLOCKED), changed files, and notes. Check for `## Architectural Changes` and `## Technical Debt` sections in the implementation report.

3. **Handle status**:
   - **BLOCKED**: Surface the blocker to the user using AskUserQuestion. After receiving their answer, provide it as feedback and restart from step 1.
   - **SUCCESS or PARTIAL**: Continue to step 4.

4. **Handle architectural changes**: If the implementation report's `## Architectural Changes` section contains anything other than "None", present the changes to the user via AskUserQuestion before proceeding to review: "Implementation required these architectural changes: [list]. Approve / Discuss / Revert and try different approach". If the user chooses to revert, provide that as feedback and restart from step 1. If the report includes a `## Technical Debt` section, present it to the user as informational (no approval gate needed).

5. **Gather git diff summary** for review:
   ```bash
   git diff --name-only HEAD
   git diff --stat HEAD
   ```
   Compare the changed file list with the implementation report — note discrepancies. Reviewers will fetch the full diff themselves via `git diff HEAD`.

6. **Determine domain reviewers**: Read `references/reviewer-registry.md`. Based on your understanding of the plan phase content and the changed files, select which specialist reviewers are relevant.

7. **Create iteration directory**:
   ```bash
   mkdir -p "$run_dir/phase-{phase}/iteration-{iteration}/reviews"
   ```

8. **Spawn generalist reviewer + matching domain specialists in parallel**: All receive the same git diff data. The generalist uses the template from `references/sub-agent-prompts.md`. Domain specialists use templates from the appropriate `references/reviewers-*.md` file. Software Architecture is always spawned (skip only for phases that exclusively involve non-code changes). Add any other domain-relevant specialists based on the phase content and changed files.

   For each domain specialist, spawn a sub-agent using the reviewer bootstrap prompt from `references/sub-agent-prompts.md`. Pass the shared preamble path, prompt file path, and section heading (from reviewer-registry.md) along with placeholder values. The sub-agent reads its own instructions — do NOT read the reviewer prompt files yourself.

   The generalist reviewer uses its self-contained template from `references/sub-agent-prompts.md` directly — no bootstrap needed.

   Launch all reviewers in a single message so they run concurrently. Include `model: "opus"` so reviewers have the same reasoning capability as the orchestrator.

   For subsequent iterations where all reviewers' previous scores were 8+ and only MINOR issues remain, consider using `model: "sonnet"` to reduce cost.

9. **Collect reviewer summaries**: After all reviewer sub-agents return, capture each sub-agent's one-line return value. Concatenate these into a newline-separated list.

   **Synthesize feedback**: Spawn a synthesis sub-agent (`model: "opus"`) using the template from `references/sub-agent-prompts.md`. Pass the concatenated reviewer summaries as `{reviewer_summaries}`. The synthesis agent reads reviewer files from `{run_dir}/phase-{phase}/iteration-{iteration}/reviews/`, writes merged feedback to `{run_dir}/phase-{phase}/iteration-{iteration}/merged.md`, and returns a compact summary. Use the summary for loop decisions (scores, severity, stall detection). Do NOT read `merged.md` yourself — pass its path to the next agent.

   **Model selection policy**:

   | Sub-agent | Default model | Cost-reduction condition | Reduced model |
   |---|---|---|---|
   | Domain reviewer | opus | All previous scores 8+, only MINOR issues | sonnet |
   | Synthesis | opus | All reviewer scores 8+, no CRITICAL/IMPORTANT | sonnet |

10. **Display iteration summary**: After synthesizing feedback, display the iteration results to the user using the Iteration Summary Template (see "Output Templates" below). This must be shown every iteration, not just every 3.

11. **Handle user input needs** (if USER_INPUT count > 0 in synthesis summary): Read the `### Unresolved (USER_INPUT required)` section of merged.md. Present all questions to the user in a single batch using AskUserQuestion. After receiving answers, append a `### USER_INPUT Resolved` section to merged.md with each question and the user's answer. This makes answers available to both the implementation agent (next iteration) and reviewers (next cycle).

12. **Handle scores**: Proceed to 3.3 only when:
   - ALL reviewer scores are 9 or higher
   - AND no reviewer flagged any CRITICAL or IMPORTANT issues

   **Early exit** — also proceed to 3.3 if after 5+ iterations:
   - No CRITICAL or IMPORTANT issues remain, AND
   - ALL scores are 8 or higher, but some are below 9

   On early exit, warn the user: report which reviewers scored below 9 and their reasons. The phase is committed, but the user should be aware of the flagged areas.

   **Before exiting the loop**: if the synthesis summary reports DIRECTLY_ACTIONABLE items, spawn one final implementation sub-agent with the merged feedback file path to apply fixes. No re-review needed. Skip remaining steps (research is not needed when all scores pass).

   Otherwise, continue to step 13 (perform research) and then iterate. Only re-spawn specialists whose domain had unresolved issues or whose domain was touched by new changes.

13. **Perform research** (if RESEARCH_NEEDED count > 0 in synthesis summary): Read the `### RESEARCH_NEEDED` section of `{run_dir}/phase-{phase}/iteration-{iteration}/merged.md`. Spawn one research sub-agent per topic (`model: "opus"`) in parallel. Each agent:
   - Uses Context7 MCP tools first, falls back to WebSearch
   - Writes results to `<scope_dir>/research/<topic>.md` with version and fetch date header
   - For CODEBASE_EXPLORATION items, use Grep/Glob/Read instead of external search

   After all research agents return, append a `### Available Research` section to the merged feedback file listing paths of newly created research files. This makes them available to both the implementation agent (next iteration) and reviewers (next review cycle).

14. **Stall detection**: If iteration >= 3 and no reviewer scores improved since the previous iteration, surface the situation to the user — the implementation may be stuck on an issue that needs a different approach.

15. **Max iterations**: If iteration >= 12, present remaining issues to user and ask whether to continue, accept current state, or stop.

#### 3.3: Post-Phase Completion

1. **Verify plan checkboxes**: Confirm the implementation agent marked completed tasks (`[x]`). Fix any it missed.
2. **Review learnings**: Better approaches discovered? Intentional deviations? Issues affecting later phases?
3. **Update remaining phases** if needed (changed assumptions, better approaches, reordering).
4. **Run verification**: Run the project's lint, build, and test commands (detect from project files: package.json, pyproject.toml, Cargo.toml, CMakeLists.txt, Makefile, etc.). Fix failures before proceeding.
5. **Direct verification** — automated tests are necessary but not sufficient:
   - Check the plan for explicit verification tasks and execute them.
   - If none, verify based on change type: browser for UI, curl for API, trigger for jobs, execute for scripts.
   - **Never block on a command that might not return**: Start dev servers, watch modes, and any persistent process in background. Verify with separate foreground commands (e.g., curl), then stop the process. If unsure whether a command will return promptly, run it in background — you'll be notified when it completes.
   - Fix and re-verify if verification fails.

#### 3.4: Git Commit (MANDATORY)

Stage and commit all changes before proceeding. Stage only the files reported as changed by the implementation sub-agent — do not use `git add -A` or `git add .`, which can accidentally include sensitive files (.env, credentials) or unrelated changes.

```bash
git add <changed-file-1> <changed-file-2> ...
git diff --cached --name-only  # verify only expected files are staged
git commit -m "$(cat <<'EOF'
[<plan-slug>] Phase <X>: <phase-name>

<Brief description of what was implemented>

Plan: <plan-url>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Verify the commit exists with `git log --oneline -1`.

#### 3.5: Progress Report

Output:
- `"Phase {X} of {Y} complete: {phase_name}"`
- Brief summary, iteration count, plan modifications, commit hash

Every 3 phases: overall progress, completed summary, upcoming preview.

#### 3.6: Continue to Next Phase

**Checkpoint** — verify before proceeding:
- Phase changes committed to git
- Progress report output

Increment `current_phase_index` and **immediately return to Step 3.1**. Do NOT stop to ask if the user wants to continue.

### Step 4: Plan Complete

Complete ALL steps in order:

1. **Final verification**: Run the project's lint, build, and test commands.
2. **End-to-end verification**: Verify the integrated whole works (full user flow in browser for UI, complete request/response cycle for API, etc.). Start long-running processes in background; verify with separate commands.
3. **Verify all tasks checked**: Scan ALL phases for unchecked tasks (`[ ]`). If any remain, complete them or follow incomplete exit process.

#### 4.1: Final Integration Review (max 5 iterations)

Run a holistic review covering all phases together. This catches integration issues, goal drift, and cross-phase inconsistencies that per-phase reviews miss.

1. **Gather full diff**: `git diff <base-commit>...HEAD` where `<base-commit>` is the commit before the first phase. Also `git log --oneline <base-commit>..HEAD` for the commit summary.
2. **Re-read the plan** (original, not the working copy) to refresh the intended goals and approach.
3. **Spawn reviewers**: Use the same reviewer infrastructure as per-phase reviews (generalist + relevant domain specialists). Pass the full diff (not per-phase) and the plan path. Reviewers evaluate:
   - Does the implementation match the plan's goals and intended approach?
   - Do the phases integrate correctly — no orphaned code, missing glue, or contradictory patterns?
   - Are there regressions from earlier phases caused by later phases?
   - Overall code quality across the combined changes
4. **Synthesize feedback** using the standard synthesis flow. Display the iteration summary.
5. **Handle USER_INPUT and RESEARCH_NEEDED** using the same flow as per-phase iterations.
6. **If all scores are 9+ with no CRITICAL or IMPORTANT issues**: exit the loop.
7. **Otherwise**: spawn an implementation sub-agent with the merged feedback to make targeted fixes. Commit fixes with `[<plan-slug>] Integration review fixes (iteration N)`. Re-review.
8. **Early exit after 3+ iterations**: if all scores are 8+ with no CRITICAL or IMPORTANT issues, exit with a warning about remaining concerns.

#### 4.2: Finalize

1. **Update plan status**: Add `Status: COMPLETE` and `Completed: YYYY-MM-DD` to the plan file (or `_overview.md`).
2. **Move plan to completed**: If the project uses a `planning/active/` directory, move the plan to `planning/completed/`. Otherwise, leave it in place — the status marker is sufficient.
3. **Final git commit**: If any uncommitted changes remain, commit with `[<plan-slug>] Complete implementation`.
4. **Present summary**: Display the Completion Summary Template (see "Output Templates" below).

### Handling Incomplete Exits

If the skill exits before all phases are complete (blocked, max iterations + user stop, or critical error):

1. Do NOT mark the plan as complete or move it
2. Do NOT check off incomplete tasks
3. Add a note: `<!-- Implementation paused at Phase X due to: [reason]. Resume with /implement-plan -->`
4. Clearly state which phases are done, which remain, and why implementation stopped

### Handling User Input

Only stop and ask when you encounter:
- Domain knowledge not available in the codebase
- Product/business decisions (not engineering decisions)
- Multiple valid approaches with significant trade-offs
- Need for external system access or credentials
- Architecture decisions that significantly affect future scalability, reliability, or extensibility — where the best path isn't obvious from the codebase or plan

Do NOT ask for permission to continue between phases.

## Common Mistakes

- Forgetting to re-evaluate specialist relevance when new phases touch different domains
- Not deduplicating research files when existing versions match the current lockfile
- Failing to fill all `{placeholders}` in reviewer prompts before spawning
- Running specialists sequentially when parallel execution is available
- Letting minor issues block progress — exit when only MINOR findings remain

## Output Templates

Display these templates exactly as shown (with actual values substituted). These are displayed to the user as text output, not written to files.

### Iteration Summary Template

Display after every review iteration within a phase, immediately after synthesizing feedback and before applying fixes.

```
---

### Phase {X} — Iteration {N} Review

**Reviewers**: {reviewer1} ({score}/10), {reviewer2} ({score}/10), ...

| # | Severity | Issue | Source | Resolution |
|---|----------|-------|--------|------------|
| 1 | CRITICAL | {brief issue description} | {Reviewer name(s)} | {DIRECTLY_ACTIONABLE / USER_INPUT / RESEARCH_NEEDED / CODEBASE_EXPLORATION} |
| 2 | IMPORTANT | {brief issue description} | {Reviewer} | {resolution} |
| ... | ... | ... | ... | ... |

**Contradictions**: {N resolved, N unresolved — or "None"}
**USER_INPUT needed**: {brief list — or "None"}
**RESEARCH_NEEDED**: {brief list of topics to research — or "None"}

**Actions**: {what will be done — e.g., "Researching 2 topics, then passing 4 IMPORTANT and 3 MINOR issues as feedback to next implementation iteration."}

---
```

Notes:
- List ALL issues, not just a summary count. Users want to see what was found.
- Order by severity (CRITICAL first, then IMPORTANT, then MINOR).
- Keep issue descriptions to one line — enough to identify the issue, not the full explanation.
- The "Source" column shows which reviewer(s) flagged the issue. If multiple reviewers flagged the same issue (deduplicated), list all of them (e.g., "Generalist, Backend").

### Completion Summary Template

Display at the end of Step 4 when all phases are complete.

```
---

## Implementation Complete

**Plan**: {plan name}
**Phases completed**: {N}
**Total iterations**: {sum across all phases}

### Phase Summary

| Phase | Name | Iterations | Final Score | Commit |
|-------|------|------------|-------------|--------|
| 1 | {name} | {N} | {min score}/10 | {short hash} |
| 2 | {name} | {N} | {min score}/10 | {short hash} |
| ... | | | | |

### Key Decisions

- {Any deviations from the plan, significant choices made, or plan modifications}

### Follow-up Recommendations

- {Any remaining MINOR issues, areas flagged during early exit, or suggestions for future work — or "None"}

---
```

## References

- **Team defaults**: `~/.claude/skills/_shared/references/team-defaults.md` (optional) — Team-specific tool and process preferences. If this file exists, read it and fill in the `{team_defaults}` placeholder in every reviewer's shared preamble. If absent, set `{team_defaults}` to empty. The file uses a 3-tier enforcement model: enforce conventions the codebase already follows, suggest defaults when no convention exists, defer when the codebase uses a different approach.
- **Shared preamble**: `references/shared-preamble.md` — read by each reviewer sub-agent directly via bootstrap
- **Reviewer registry**: `references/reviewer-registry.md` — reviewer domains and prompt file locations
- **Sub-agent prompt templates**: `references/sub-agent-prompts.md` — generalist implementation and review agents
- **Dependency research**: `~/.claude/skills/_shared/references/dependency-research.md` — research targets, version detection, output format, and reviewer mapping
- **Codebase context discovery**: `~/.claude/skills/_shared/references/codebase-context-discovery.md` — in-repo documentation, freshness assessment, PR history, and git activity analysis
- **Domain reviewer prompts** (read only the files for spawned reviewers):
  - `references/reviewers-language.md` — Python, Rust, C++, TypeScript and JavaScript
  - `references/reviewers-scientific.md` — Algorithm/Numerical/Validation, Performance/Parallelism, ML, Data I/O
  - `references/reviewers-web.md` — Backend, Frontend, Data Layer, DevOps and Infra, Background Jobs & Task Processing
  - `references/reviewers-ai-tooling.md` — Agent Skill, MCP Server
  - `references/reviewers-cross-cutting.md` — UX & Information Architecture, Software Architecture, TUI and CLI, Repo, Tooling, & Docs, CI & GitHub Workflows, API Contract
