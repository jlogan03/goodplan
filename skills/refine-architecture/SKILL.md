---
name: refine-architecture
description: >
  Iteratively review and improve architecture files using the reviewer infrastructure.
  When an active epic exists, operates on the epic's architecture directory.
  Falls back to `.project/architecture/` for side quests and project-level work.
  Evaluates module depth, subsystem boundaries, API surfaces, and alignment with decisions.
  Common triggers: 'refine my architecture', 'review the architecture', 'improve the
  architecture', 'the architecture needs work', 'architecture review', 'refine architecture',
  'make the architecture better', 'architecture could be improved', 'architecture needs
  refinement', 'let me refine the architecture'.
---

# Refine Architecture

Iteratively improve architecture files by spawning specialized review sub-agents in parallel, synthesizing their feedback, and repeating until the architecture meets quality thresholds. When an active epic exists, operates on the epic's architecture directory; otherwise falls back to `.project/architecture/`.

## Usage

```
/refine-architecture
```

No arguments — resolves architecture path automatically based on active epic.

## Decisions Context

Read `~/.claude/skills/_shared/references/decisions-format.md` for the decisions format and Loading Protocol. Load `.project/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for architecture review — reviewers check that the architecture respects existing decisions.

Note: sub-agents load decisions themselves via codebase exploration (`.project/decisions/` is a project directory accessible to all agents), so decisions do not need to be passed in bootstrap prompts.

## Reviewer Roles

Read `references/reviewer-registry.md` for the full list of reviewers, their domains, and which prompt file contains each reviewer's template.

Conditional multi-reviewer approach: Software Architecture and Holistic always run. Domain specialists are selected when the architecture content covers their domain — the orchestrator uses its judgment to decide which specialists are relevant. Re-evaluate specialist relevance when architecture edits introduce new content.

**Severity levels** for all reviewer issues:
- **CRITICAL**: Structural flaws, boundary violations, data integrity risks
- **IMPORTANT**: Coupling problems, shallow modules, missing abstractions
- **MINOR**: Nice to have, won't cause problems if skipped

## Loop Parameters

These fill in the skill-specific slots defined by `~/.claude/skills/_shared/references/iteration-loop.md`:

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

**0a. Resolve architecture path**: Read `~/.claude/skills/_shared/references/epic-conventions.md` for epic directory structure. Detect the active epic:

```bash
ls -d .project/epics/__active__*/ 2>/dev/null
```

Resolve paths based on result:
- **Active epic found** (e.g., `__active__initial` or `__active__<name>`):
  - `$ARCH_DIR` = `.project/epics/__active__<name>/architecture/`
  - `$SCOPE_ROOT` = `.project/epics/__active__<name>`
  - `$FLOW_SCOPE` = `"epics/<name>"` (without `__active__` prefix)
- **No active epic**:
  - `$ARCH_DIR` = `.project/architecture/`
  - `$SCOPE_ROOT` = `.project`
  - `$FLOW_SCOPE` = `"project"`

All subsequent references to architecture paths, run directories, and backup directories use these resolved values.

**0b. Scaffold detection**: When falling back to `.project/architecture/` (no active epic), check whether `_overview.md` contains the `<!-- scaffold -->` marker:

```bash
head -5 .project/architecture/_overview.md 2>/dev/null
```

If the marker is present, warn the user: "Top-level architecture is a scaffold pointing to the active epic's architecture. Run `/create-architecture` first or operate on the epic architecture directly." Then stop. Do not treat the scaffold as real architecture.

1. **Read architecture files**: Read all files in `$ARCH_DIR/`. If the directory does not exist or is empty, tell the user: "No architecture files found — run `/create-architecture` first." Then stop.

2. **Load decisions**: Load `.project/decisions/` following the Loading Protocol above.

3. **Load maturity conventions**: Read `~/.claude/skills/_shared/references/maturity-conventions.md` for maturity level definitions and promotion criteria. The maturity table itself is already in `_overview.md` which is loaded as part of the architecture files in sub-step 1.

4. **Prerequisite check**: Verify that `~/.claude/skills/_shared/references/reviewers-cross-cutting.md` contains criteria 8–11 (deep module criteria) in the Software Architecture Reviewer section. Check for these headings:
   - `8. **Module depth**`
   - `9. **Caller friction**`
   - `10. **Test boundary alignment**`
   - `11. **Deepening opportunities**`

   If any are missing, warn the user: "Deep module criteria (8-11) missing from reviewers-cross-cutting.md — architecture review quality will be degraded. Run the architecture-quality side quest Phase 1 first." Then stop.

5. **Resume detection**: Check for existing `architecture-backup-*` directories at the scope root:
   ```bash
   ls -d $SCOPE_ROOT/architecture-backup-* 2>/dev/null
   ```
   - If a backup exists AND `$SCOPE_ROOT/architecture-refining/activity-log.jsonl` shows no `"status":"complete"` entry: this is a resume. Present iteration history from the activity-log and ask the user whether to resume or start fresh.
   - If resuming: continue from the last completed iteration.
   - If starting fresh: delete the old backup and refining directories.

6. **Create backup** (first run only — not on resume):
   ```bash
   ts=$(date -u +%Y%m%dT%H%M%S)
   cp -R "$ARCH_DIR/" "$SCOPE_ROOT/architecture-backup-${ts}/"
   mkdir -p "$SCOPE_ROOT/architecture-refining/"
   ```

7. **Read shared iteration loop reference**: Read `~/.claude/skills/_shared/references/iteration-loop.md` for the orchestration pattern. This skill's Loop Parameters (above) fill in the skill-specific slots.

### Step 1: Verify Goal

1. Read `.project/idea.md` and `.project/conventions.md` (if it exists).
2. State what "good architecture" means for this project — derived from the idea, conventions, and existing architecture files. Include: what the architecture should enable, what quality attributes matter most, and what constraints exist.
3. Use AskUserQuestion to confirm with the user.
4. Document the confirmed goal in `.project/architecture-refining/goal.md`.

### Step 2: Refinement Loop

Read `~/.claude/skills/_shared/references/iteration-loop.md` for the shared orchestration structure. This step fills in the architecture-specific parameters.

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
2. Write state:
   - Read `~/.claude/skills/_shared/references/state-and-activity-formats.md` for formats
   - Generate timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ`
   - Append to `.project/activity-log.jsonl`:
     ```bash
     echo '{"ts":"<timestamp>","phase":"refine-architecture","scope":"$FLOW_SCOPE","status":"complete","summary":"<one-sentence summary>"}' >> .project/activity-log.jsonl
     ```
   Use the `$FLOW_SCOPE` value resolved in Step 0 (`"epics/<name>"` when operating on epic architecture, `"project"` otherwise).
3. Clean up: the `$SCOPE_ROOT/architecture-refining/` directory is retained as a record of the refinement process (round directories, merged feedback, activity-log).

### Step 4b: Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise?

- **If yes**: Read `~/.claude/skills/_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently.

## Graceful Stop

If the user says "stop" or "that's enough" at any point:

- **No iterations completed** (stopped before first review): Delete the backup directory. Do not update state or activity-log. Tell the user nothing was changed.
- **Mid-iteration** (at least one round exists): Keep the backup directory. Write to activity-log with `"status":"abandoned"`. Tell the user: "Architecture files have been partially refined. Backup available at `.project/architecture-backup-<ts>/`. To restore: `mv .project/architecture-backup-<ts>/ .project/architecture/`"
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

Display after every iteration.

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
**RESEARCH_NEEDED**: {brief list — or "None"}

**Actions**: {what will be done next}

---
```

### Completion Summary Template

Display at the end of Step 4.

```
---

## Architecture Refinement Complete

**Final score**: {min score across all reviewers}/10
**Iterations**: {N}
**Architecture files**: $ARCH_DIR/

### Score Progression

| Iteration | {Reviewer1} | {Reviewer2} | ... |
|-----------|-------------|-------------|-----|
| 1         | {score}     | {score}     |     |
| ...       |             |             |     |

### Changes Summary

{List of substantive changes: added/removed/modified subsystems, boundary shifts, new patterns}

### Issues Resolved Per Iteration

**Iteration 1** ({N} issues: {breakdown by severity})
...

### Remaining Issues

{List any unresolved MINOR issues, or "None — all issues resolved."}

---
```

## References

- **Shared iteration loop**: `~/.claude/skills/_shared/references/iteration-loop.md` — orchestration pattern shared with refine-plan
- **Reviewer registry**: `references/reviewer-registry.md` — reviewer domains and prompt file locations
- **Sub-agent prompts**: `references/sub-agent-prompts.md` — reviewer weighting, editor prompt, editor guardrails
- **Guidance**: `references/guidance.md` — architecture-specific evaluation priorities
- **Team defaults**: `~/.claude/skills/_shared/references/team-defaults.md` (optional)
- **Cross-cutting reviewers**: `~/.claude/skills/_shared/references/reviewers-cross-cutting.md` — Software Architecture, UX & IA, etc.
- **Decisions format**: `~/.claude/skills/_shared/references/decisions-format.md`
- **State formats**: `~/.claude/skills/_shared/references/state-and-activity-formats.md`
- **Expertise tracking**: `~/.claude/skills/_shared/references/expertise-tracking.md`
