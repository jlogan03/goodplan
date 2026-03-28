---
name: refine-architecture
description: >
  Iteratively review and improve architecture files using the reviewer infrastructure.
  When an active epic exists, operates on the epic's architecture directory.
  Evaluates module depth, subsystem boundaries, API surfaces, and alignment with decisions.
  Common triggers: 'refine my architecture', 'review the architecture', 'improve the
  architecture', 'the architecture needs work', 'architecture review', 'refine architecture',
  'make the architecture better', 'architecture could be improved', 'architecture needs
  refinement', 'let me refine the architecture'.
requires: goodplan >= 1.0.0
---

# Refine Architecture

Iteratively improve architecture files by spawning specialized review sub-agents in parallel, synthesizing their feedback, and repeating until the architecture meets quality thresholds. Operates on the active epic's architecture directory (epic-only after CLI migration — project-level fallback removed; future side quest if needed).

## Usage

```
/refine-architecture
```

No arguments — resolves architecture path automatically based on active epic.

## Decisions Context

Read `../_shared/references/decisions-format.md` for the decisions format and Loading Protocol. Load `.project/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for architecture review — reviewers check that the architecture respects existing decisions.

Note: sub-agents load decisions themselves via codebase exploration (`.project/decisions/` is a project directory accessible to all agents), so decisions do not need to be passed in bootstrap prompts.

## Reviewer Roles

Read `references/reviewer-registry.md` for the full list of reviewers, their domains, and which prompt file contains each reviewer's template.

Conditional multi-reviewer approach: Software Architecture and Holistic always run. Domain specialists are selected when the architecture content covers their domain — the orchestrator uses its judgment to decide which specialists are relevant. Re-evaluate specialist relevance when architecture edits introduce new content.

**Severity levels** for all reviewer issues:
- **CRITICAL**: Structural flaws, boundary violations, data integrity risks
- **IMPORTANT**: Coupling problems, shallow modules, missing abstractions
- **MINOR**: Nice to have, won't cause problems if skipped

## Loop Parameters

These fill in the skill-specific slots defined by `../_shared/references/iteration-loop.md`:

| Parameter | Value |
|---|---|
| **Reviewer list** | Software Architecture (always), Holistic (always), domain specialists (conditional — see `references/reviewer-registry.md`) |
| **Exit criteria** | All scores >= 9, no CRITICAL or IMPORTANT issues |
| **Early exit** | After 4+ iterations: all scores >= 8, no CRITICAL or IMPORTANT |
| **Max iterations** | 8 |
| **Editor prompt path** | `references/sub-agent-prompts.md` § "Architecture Editor Sub-Agent Prompt" |
| **Score thresholds** | Full pass: 9+, Early exit: 8+ after 4 iterations |
| **Scope constraints** | `$ARCH_DIR/` files only (resolved in Step 0) |
| **Working directory** | Edits in-place on `$ARCH_DIR/` |
| **Run directory** | `$SCOPE_ROOT/architecture-refining/` (see Step 0) |
| **Backup directory** | `$SCOPE_ROOT/architecture-backup-<timestamp>/` (see Step 0) |
| **review_context** | `project architecture files` |

## Workflow

### Step 0: Load and Prepare

**0a. Version check and path resolution**:

Read `../_shared/references/cli-interaction.md` for CLI interaction conventions and error handling patterns.

Verify CLI availability and compatibility:

```bash
goodplan --version --json
```

If the command fails, stop: "The `goodplan` CLI is required but not found." If the version doesn't satisfy `requires: goodplan >= 1.0.0`, stop with a version mismatch message.

Also load `../_shared/references/epic-conventions.md` for epic directory structure.

**Resolve architecture path via CLI**:

```bash
goodplan status --json
```

Check `.activeEpic` in the response:
- **Active epic found**: Begin the refine-architecture phase:

  ```bash
  stdin: "" | goodplan epic:refine-architecture --epic <name> --json
  ```

  The CLI returns `{ paths: { architecture: "<absolute-path>" } }`. Use `paths.architecture` as `$ARCH_DIR` and derive `$SCOPE_ROOT` by stripping `/architecture` from the path.

  If this returns `STATE_INVALID_TRANSITION` (exit 3), check `epic:show --json` for current status. If the epic is already in `refining-architecture`, this is a re-entry — proceed with the architecture path from `epic:show`.

- **No active epic**: Stop. "refine-architecture requires an active epic. Run `/create-epic` first." (Project-level architecture refinement has been removed — future side quest if needed.)

All subsequent references to architecture paths, run directories, and backup directories use these resolved values. Store the epic name for use in `submit-refine-architecture` at Step 4.

1. **Read architecture files**: Read all files in `$ARCH_DIR/`. If the directory does not exist or is empty, tell the user: "No architecture files found — run `/create-architecture` first." Then stop.

2. **Load decisions**: Load `.project/decisions/` following the Loading Protocol above.

3. **Load maturity conventions**: Read `../_shared/references/maturity-conventions.md` for maturity level definitions and promotion criteria. The maturity table itself is already in `_overview.md` which is loaded as part of the architecture files in sub-step 1.

4. **Prerequisite check**: Verify that `../_shared/references/reviewers-cross-cutting.md` contains criteria 8–11 (deep module criteria) in the Software Architecture Reviewer section. Check for these headings:
   - `8. **Module depth**`
   - `9. **Caller friction**`
   - `10. **Test boundary alignment**`
   - `11. **Deepening opportunities**`

   If any are missing, warn the user: "Deep module criteria (8-11) missing from reviewers-cross-cutting.md — architecture review quality will be degraded. Run the architecture-quality side quest Phase 1 first." Then stop.

5. **Resume detection** (dual detection):

   **Lifecycle status**: Check `epic:show --json` — if status is `refining-architecture`, the phase is in progress (possibly from a prior session).

   **Iteration progress**: Check for the `architecture-refining/` working directory at the scope root:
   ```bash
   ls -d $SCOPE_ROOT/architecture-refining/round-*/ 2>/dev/null
   ```
   If round directories exist, count them and read the last `merged.md` for iteration state. The round directory structure provides the same information as the eliminated skill-local activity-log.

   Note: `architecture-refining/` is a skill-owned working directory (like `completion/`), so `mkdir -p` is retained.

   - If a backup exists AND round directories show incomplete refinement: this is a resume. Present iteration history from the round directories and ask the user whether to resume or start fresh.
   - If resuming: continue from the last completed iteration.
   - If starting fresh: delete the old backup and refining directories.

6. **Create backup** (first run only — not on resume):
   ```bash
   ts=$(date -u +%Y%m%dT%H%M%S)
   cp -R "$ARCH_DIR/" "$SCOPE_ROOT/architecture-backup-${ts}/"
   mkdir -p "$SCOPE_ROOT/architecture-refining/"
   ```

7. **Read shared iteration loop reference**: Read `../_shared/references/iteration-loop.md` for the orchestration pattern. This skill's Loop Parameters (above) fill in the skill-specific slots.

### Step 1: Verify Goal

1. Read `.project/idea.md` and `.project/conventions.md` (if it exists).
2. State what "good architecture" means for this project — derived from the idea, conventions, and existing architecture files. Include: what the architecture should enable, what quality attributes matter most, and what constraints exist.
3. Use AskUserQuestion to confirm with the user.
4. Document the confirmed goal in `.project/architecture-refining/goal.md`.

### Step 2: Refinement Loop

Read `../_shared/references/iteration-loop.md` for the shared orchestration structure. This step fills in the architecture-specific parameters.

Enter the review loop (max 8 iterations):

   a. **Determine reviewer scope**:

      If the previous iteration's architecture-editor reported modifying files (Files Modified: YES), re-read the changed files before selecting reviewers. On the first iteration, always read all architecture files.

      Read `references/reviewer-registry.md`. Based on your understanding of the architecture content, select which specialist reviewers are relevant.

      **First iteration**: Spawn Software Architecture + Holistic (always) + all specialists whose domains are covered by the architecture.

      **Subsequent iterations**: Only re-spawn reviewers whose domain had unresolved CRITICAL or IMPORTANT issues. If a specialist's previous run found only MINOR issues, skip it. If architecture edits introduced content in a new domain, add the relevant specialist.

   b. **Create iteration directory**:
      ```bash
      mkdir -p ".project/architecture-refining/round-{iteration}/reviews"
      ```

   c. **Spawn reviewers in parallel**:

      Launch all reviewers concurrently. Include `model: "opus"`. For each reviewer, use the bootstrap prompt from the refine-plan shared preamble pattern, adapted for architecture context:
      - Set `{review_context}` to `project architecture files`
      - Set plan location placeholders to the architecture file paths
      - Read `references/sub-agent-prompts.md` for the reviewer weighting preamble — inject it into the Software Architecture reviewer's bootstrap context

      For subsequent iterations where all scores were 8+ and only MINOR issues remain, consider `model: "sonnet"`.

   d. **Collect and synthesize**: After all reviewers return, capture one-line summaries. Spawn a synthesis sub-agent (`model: "opus"`) to merge feedback into `.project/architecture-refining/round-{iteration}/merged.md`. Use the synthesis template from `references/sub-agent-prompts.md`.

   e. **Display iteration summary**: Use the same Iteration Summary Template as refine-plan (see "Output Templates" below).

   f. **Check for completion**:

      **Full pass** — exit when:
      - ALL reviewer scores >= 9, AND
      - No CRITICAL or IMPORTANT issues

      **Early exit** — after 4+ iterations:
      - No CRITICAL or IMPORTANT, AND
      - ALL scores >= 8 but some below 9

      On early exit, warn the user: report which reviewers scored below 9, their reasons, and whether the architecture may need restructuring.

      **Before exiting**: if DIRECTLY_ACTIONABLE items remain, spawn one final editor sub-agent.

   g. **Categorize feedback**: Sort merged feedback by Resolution tag:
      - **USER_INPUT**: Only the user can answer
      - **RESEARCH_NEEDED**: External docs needed
      - **CODEBASE_EXPLORATION**: Answer by reading the codebase
      - **DIRECTLY_ACTIONABLE**: Apply immediately

   h. **Handle USER_INPUT** (if any): Present all questions in a single batch via AskUserQuestion. Append answers to merged.md under `### USER_INPUT Resolved`.

   i. **Perform research** (if RESEARCH_NEEDED): Spawn research sub-agents in parallel. Write results to `.project/research/`. Append paths to merged.md under `### Available Research`.

   j. **Apply feedback**: Spawn an architecture-editor sub-agent (`model: "opus"`) using the template from `references/sub-agent-prompts.md`. The editor reads merged feedback and edits architecture files in-place. Read `references/sub-agent-prompts.md` for editor guardrails.

   k. **Increment and continue**: Return to step 2a.

   l. **Max iterations**: If 8 reached, present remaining issues to user.

### Step 3: Final Verification

After the review loop exits, check for goal drift:

1. Re-read the **backup** architecture files (from `$SCOPE_ROOT/architecture-backup-<timestamp>/`)
2. Re-read the **current** architecture files (`$ARCH_DIR/`)
3. Present a summary of what changed: added/removed/modified subsystems, boundary shifts, new patterns
4. Use AskUserQuestion to confirm the changes align with the original intent
5. If the user flags drift:
   - Apply corrections directly
   - One additional review iteration allowed (sanity check, not a new loop)

### Step 4: Finalize

1. Delete the backup directory:
   ```bash
   rm -rf $SCOPE_ROOT/architecture-backup-*/
   ```
2. Complete the refine-architecture phase via CLI. Submit with the final reviewer scores:

   ```bash
   echo '{"scores":{"<reviewer1>":<score>,"<reviewer2>":<score>,...}}' | goodplan submit-refine-architecture --epic <name> --json
   ```

   Scores must pass the threshold, or use `--override` if the user approves early exit with scores below threshold. This transitions the epic from `refining-architecture` to `architecture-refined` and records the activity.

3. Clean up: the `$SCOPE_ROOT/architecture-refining/` directory is retained as a record of the refinement process (round directories, merged feedback).

### Step 4b: Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise?

- **If yes**: Read `../_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently.

## Graceful Stop

If the user says "stop" or "that's enough" at any point, leave artifacts in place — no CLI state writes on graceful stop:

- **No iterations completed** (stopped before first review): Delete the backup directory. Tell the user nothing was changed.
- **Mid-iteration** (at least one round exists): Keep the backup directory and `architecture-refining/` round directories. Tell the user: "Architecture files have been partially refined. Backup available at `$SCOPE_ROOT/architecture-backup-<ts>/`. To restore: copy the backup over the architecture directory. Re-run `/refine-architecture` to resume — the skill will detect the prior progress via round directory structure."
- **Loop complete, pre-finalization**: Proceed to finalization (the architecture is in good shape).

## When to Ask the User

Only stop and ask when you encounter:
- Domain knowledge not available in the codebase
- Product/business decisions (not engineering decisions)
- Multiple valid approaches with significant trade-offs
- Need for external system access or credentials
- Architecture changes that would invalidate existing plans or decisions

Do NOT ask for permission to continue between iterations.

## Output Templates

### Iteration Summary Template

Use the shared Iteration Summary from `../_shared/references/output-templates.md` with `{scope_prefix}` = empty (omit).

### Completion Summary Template

Display at the end of Step 4. Use the Completion Summary Template from `../_shared/references/output-templates.md` with these skill-specific values:

- `{completion_heading}`: `Architecture Refinement Complete`
- `{score_label}`: `score`
- `{skill_specific_header_fields}`: `**Architecture files**: $ARCH_DIR/`
- `{issues_resolved_variant}`: `Per Iteration` — use per-iteration tables
- `{skill_specific_extension_sections}`: `### Changes Summary` — list substantive changes (added/removed/modified subsystems, boundary shifts, new patterns)

## References

- **CLI interaction**: `../_shared/references/cli-interaction.md` — CLI conventions, error handling, invocation patterns
- **Shared iteration loop**: `../_shared/references/iteration-loop.md` — orchestration pattern shared with refine-plan
- **Reviewer registry**: `references/reviewer-registry.md` — reviewer domains and prompt file locations
- **Sub-agent prompts**: `references/sub-agent-prompts.md` — reviewer weighting, editor prompt, editor guardrails
- **Guidance**: `references/guidance.md` — architecture-specific evaluation priorities
- **Team defaults**: `../_shared/references/team-defaults.md` (optional)
- **Cross-cutting reviewers**: `../_shared/references/reviewers-cross-cutting.md` — Software Architecture, UX & IA, etc.
- **Decisions format**: `../_shared/references/decisions-format.md`
- **Expertise tracking**: `../_shared/references/expertise-tracking.md`
