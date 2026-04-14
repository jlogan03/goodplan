# Implementation Plan: 08-core-skills-v2

## Goal

Incrementally update 5 core skills (`workflow-guide`, `status`, `init`, `task`, `upgrade`) to leverage CLI capabilities from slices 01-07b. Updates focus on: entity commands, improved state queries, and better recovery patterns.

> **Command availability note:** All entity commands referenced in this plan exist in the built binary (`dist/gp-plugin/binaries/*/gp`). They were added in slices 07a (reviewer:\*, rubric:\*) and 07b (subsystem:\*, project:\*, briefing:\*, finding:\*, invariant:\*, events:\*). The installed `gp` on PATH is an older version and may not have them — use `./dist/gp-plugin/binaries/macos-arm64/gp schema --json` to verify. The built binary has 90 commands total.

---

## Cross-Cutting: Pre-Implementation Command Verification

Before implementing any phase, run against the **built** binary (not the installed `gp`):
```bash
./dist/gp-plugin/binaries/macos-arm64/gp schema --json | python3 -c 'import sys,json; [print(c["name"]) for c in json.load(sys.stdin)["commands"]]'
```
Confirm all commands referenced in that phase actually exist. The built binary has 90 commands after slices 07a/07b.

---

## Phase 1: workflow-guide

### Objective

Update the workflow-guide skill to reflect the complete set of CLI commands available after slices 01-07b, including task management, decision tracking, and learning commands. Add missing skill entry points and recovery patterns.

### Expected Behavior

**RED (before)**: The workflow-guide skill entry point table has 13 entries. It does not mention `/gp:task` for quick capture, does not reference `decision:*` or `learning:*` commands in the CLI Basics section, and recovery patterns only cover 6 error codes.

**GREEN (after)**: Entry point table includes `/gp:task`. CLI Basics section references the full command surface (task, decision, learning commands). Recovery patterns cover additional state errors like `STATE_CONTENT_MISSING` and `STATE_MAX_ROUNDS_REACHED`. A new "CLI Command Categories" section provides a quick-reference grouping of all 90 commands.

### Tasks

1. **Update the `## CLI Basics` section**: Add examples showing task, decision, and learning commands:
   ```
   gp task:list --json            # open tasks
   gp decision:list --json        # active decisions
   gp learning:list --json        # accumulated learnings
   ```

2. **Add "CLI Command Categories" section** after "CLI Basics" (new section): Rather than a static enumeration, add a short reference note:
   > Run `gp schema --json` for the full command tree. Key new entity commands: `subsystem:*`, `project:*`, `briefing:*`, `finding:*`, `invariant:*`, `events:*`, `task:*`, `decision:*`, `learning:*`, `reviewer:*`, `rubric:*`.

3. **Verify the skill entry point table**: Confirm `/gp:task` is already listed (it is — "Quick capture (bug/idea)" row). No change needed here.

4. **Update the "Interrupted Flow Recovery" section**: See `cli-interaction.md` section 10 for full error recovery patterns. Add only the following v2 entity error patterns not already covered there:
   - `STATE_CONTENT_MISSING`: "Required file not found — copy or regenerate the file and retry."
   - `STATE_MAX_ROUNDS_REACHED`: "Refinement round limit exceeded — use `--override` to force, or improve review scores."
   - `STATE_SLICE_NOT_READY`: "Previous slices not in terminal status — complete or abandon them first."

5. **Add "Task & Decision Quick Reference" section** before "Error Handling Quick Reference": Show patterns for common cross-skill operations:
   ```bash
   # Capture a task during any workflow
   echo '{"name":"...","title":"...","description":"..."}' | gp task:create --json
   # Convert task to a quest
   gp task:convert --task <name> --json
   # Record a decision
   echo '{"title":"...","rationale":"...","alternatives":[...]}' | gp decision:create --json
   ```

### Verification

```bash
bun run build
# Verify the skill file is valid markdown with correct frontmatter
head -6 plugin/skills/workflow-guide/SKILL.md
# Check all referenced commands exist in schema
gp schema --json | jq '[.commands[].name]' | grep -c "task:create"
```

---

## Phase 2: status

### Objective

Update the status skill to show task counts (already partially supported via `openTasks` in status response), decision counts with revisiting status, and learning counts. Add `task:list` and `decision:list` queries where appropriate.

### Expected Behavior

**RED (before)**: The status skill shows "Tasks: N open" and "Decisions: N active" but only when the status response includes those fields. It does not show learning counts or offer to show task details.

**GREEN (after)**: The status skill uses `status --json` → `.artifacts.learnings` for learning counts (already available in the response), shows them in the report. Step 9 "Offer Detail" includes task listing as an option. Format A and B templates include a "Learnings" line when non-zero.

### Tasks

1. **Extract learning count from existing `status --json` response** (Step 4): Use `.artifacts.learnings` from the status response already being queried — no additional CLI call needed. Only use `learning:list --json` as a detail drill-down in the presentation step when the user asks for more info.

2. **Update the "Format A" template section**: Add a `**Learnings**: <N total>` line after the Decisions line. Omit if count is 0.

3. **Update the "Format B" template sections**: Add `**Learnings**: <N total>` line in both "with Active Epic" and "without Epics" variants. Omit if count is 0.

4. **Update the "Step 9: Offer Detail" section**: Expand the offer to include:
   > Want me to show the full activity-log, all slice statuses, open tasks, or recent learnings?

   Add handling for each option:
   - "open tasks": `$GP task:list --json` — show title, status, context
   - "recent learnings": `$GP learning:list --json` — show category, summary, source

5. **Add task detail rendering**: When user asks for task details, format output as:
   ```
   ## Open Tasks
   - **<title>** (<name>) — captured during <capturedDuring>
   ```

### Verification

```bash
bun run build
# Verify skill file parses correctly (no broken markdown)
wc -l plugin/skills/status/SKILL.md
# Run the status skill against this repo to check it works
gp status --json | jq '.openTasks'
gp learning:list --json | jq '.items | length'
```

---

## Phase 3: init

### Objective

Update the init skill to mention task capture and decision recording as available capabilities after initialization. No subsystem or steering commands exist, so those aspirational features are out of scope.

### Expected Behavior

**RED (before)**: Init's post-onboard summary (Step 5) and new-project summary (Step 3d) only suggest `/gp:create-epic` as the next step.

**GREEN (after)**: Summaries mention additional available workflows: `/gp:task` for quick capture, `/gp:explore` for research. The "Scope & Intentional Omissions" section is updated to note that task capture is immediately available post-init.

### Tasks

1. **Update the "Step 3d" summary section**: Expand the "Next step" recommendation:
   ```markdown
   > **Next step:** `/gp:create-epic` to define the first development direction.
   >
   > **Also available:**
   > - `/gp:task` — quickly capture bugs, ideas, or improvements
   > - `/gp:explore` — research a specific area before committing to a plan (after creating an epic)
   ```

2. **Update the "Step 5" summary section**: Similarly expand:
   ```markdown
   > **Recommended next step:** `/gp:create-epic` to define the first development direction, or `/gp:explore` (after creating an epic) to investigate a specific area first.
   >
   > **Also available:**
   > - `/gp:task` — quickly capture bugs, ideas, or improvements as you notice them
   ```

3. **Update the "Scope & Intentional Omissions" section**: Add a note that task capture is available immediately:
   - Add bullet: "**Task capture** — available immediately via `/gp:task` after init completes"

### Verification

```bash
bun run build
# Check the skill file is well-formed
grep -c "gp:task" plugin/skills/init/SKILL.md
# Ensure frontmatter is intact
head -6 plugin/skills/init/SKILL.md
```

---

## Phase 4: task

### Objective

Update the task skill to mention `task:convert` as a path to promote tasks to quests, and note that tasks can be dropped via `task:drop`. These commands exist in the CLI but aren't referenced in the skill.

### Expected Behavior

**RED (before)**: The task skill only covers `task:create`. It does not mention that tasks can be converted to quests or dropped.

**GREEN (after)**: The skill includes a "Task Lifecycle" section explaining that tasks can be converted (`task:convert`) to quests for structured follow-up, or dropped (`task:drop`) if no longer relevant. The result presentation (Step 2, Path A, item 5) mentions these options.

### Tasks

1. **Add "Task Lifecycle" section** after the "Important Behaviors" section: New section explaining the full task lifecycle. Keep the narrative about the task-to-quest promotion path and the drop option, but reference `cli-interaction.md` for exact command syntax rather than duplicating examples:
   ```markdown
   ## Task Lifecycle

   Tasks are lightweight captures. After creation, they have two paths:

   - **Convert to quest**: When a task needs structured follow-up (research, planning, implementation), use `task:convert`. This creates a quest with the task's title as the goal and marks the task as converted.
   - **Drop**: When a task is no longer relevant, use `task:drop`.
   - **List open tasks**: Use `task:list --json`.

   See `cli-interaction.md` for full command syntax and examples.

   Tasks remain open until explicitly converted or dropped. The `/gp:status` skill shows open task count.
   ```

2. **Update result presentation** (Path A, step 5 in the "Capture" section): After the "Captured:" confirmation, add a brief note:
   ```markdown
   > Captured: **<title>** (while working on <active entity>, branch: <branch>)
   >
   > _Later: `/gp:task` to list, or convert to a quest with `task:convert`._
   ```

### Verification

```bash
bun run build
# Check references to new commands
grep -c "task:convert" plugin/skills/task/SKILL.md
grep -c "task:drop" plugin/skills/task/SKILL.md
# Verify frontmatter
head -6 plugin/skills/task/SKILL.md
```

---

## Phase 5: upgrade

### Objective

Update the upgrade skill to handle task migration awareness and mention that `learning:list` and `decision:list` are available for post-migration verification. Since `task:list` exists, the skill should suggest it as a post-migration check.

### Expected Behavior

**RED (before)**: The upgrade skill's Step 7 completion report only suggests `gp status --json` for verification. It has no awareness of tasks, decisions, or learnings as entities that might need attention post-migration.

**GREEN (after)**: Step 7 suggests additional post-migration verification commands (`task:list`, `decision:list`, `learning:list`). Step 8 (CLAUDE.md path audit) also checks for stale task/decision references.

### Tasks

1. **Update the "Step 7: Report Completion" section**: Expand the verification suggestions:
   ```markdown
   3. Suggest running verification commands:
      - `gp status --json` — overall project state
      - `gp task:list --json` — any open tasks that carried over
      - `gp decision:list --json` — active decisions
      - `gp learning:list --json` — accumulated learnings
   ```

2. **Update the "Step 8: CLAUDE.md Path Audit" section**: Check for stale references to task/decision paths. Do NOT add `.goodplan/tasks/` or `.goodplan/decisions/` to directory-based checks — tasks, decisions, and learnings are JSONL-managed, not directory-based entities.

3. **Add note to the "Migration Heuristics" section**: Add a note that tasks, decisions, and learnings are managed as JSONL entries — they are not directory-based entities and do not need entity-level migration. The `gp migrate` command handles them internally.

### Verification

```bash
bun run build
# Check references to new commands
grep -c "task:list" plugin/skills/upgrade/SKILL.md
grep -c "decision:list" plugin/skills/upgrade/SKILL.md
# Verify frontmatter
head -6 plugin/skills/upgrade/SKILL.md
```

---

## Final Verification

After all 5 phases:

```bash
# Full plugin build
bun run build

# Verify all 5 skill files exist and have valid frontmatter
for skill in workflow-guide status init task upgrade; do
  echo "=== $skill ==="
  head -6 plugin/skills/$skill/SKILL.md
done

# Run dogfood harness to validate skills load correctly
bun tools/dogfood/test-plugin-skills.ts
```
