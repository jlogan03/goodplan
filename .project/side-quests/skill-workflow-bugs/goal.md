# Side Quest: Skill Workflow Bugs

Fix accumulated bugs and inconsistencies across the goodplan skill workflow. This is an ongoing collection — new bugs get added as they're discovered.

## Bugs

### 1. Duplicate verification/success-criteria in slice definitions

**Skill**: `/create-slices` (and possibly `/refine-slices`)

When defining slices in an epic, the output includes both a "Verification" section and a "Success Criteria" section with heavy overlap. Either consolidate them into a single section or clearly differentiate their purposes so there's no repetition.

**Expected**: One clear section that captures what "done" looks like, or two sections with zero overlap and distinct purposes.

### 2. Unnecessary user confirmation prompts during workflow execution

**Skill**: Multiple (any skill that writes files as part of its workflow)

When running in dangerously-skip-permissions mode, Claude Code still asks the user "Can I go ahead and write this file?" at moments where the workflow clearly calls for writing the file. This isn't a harness permission issue — it's the skill/prompt behavior asking for unnecessary confirmation mid-workflow.

**Expected**: When following a defined workflow (e.g., writing a review file, creating a plan, saving research), proceed without asking. Only ask when the action is genuinely ambiguous or outside the workflow's scope.

### 3. Inconsistent iteration output across refine-* skills

**Skills**: `/refine-architecture`, `/refine-slices` vs `/refine-plan`

`/refine-plan` displays a well-structured iteration summary after each round: a table of issues (severity, description, reviewer source, resolution action) plus a structured completion summary. `/refine-architecture` and `/refine-slices` don't match this format.

**Expected**: All three refine-* skills produce identical iteration summary and completion summary formats — the same table structure, same severity/source/action columns, same end-of-refinement score progression table.

### 4. `/complete` asks user to confirm learnings instead of just saving them

**Skill**: `/complete`

During slice/quest completion, the skill presents the learnings it gathered during implementation and asks the user whether they're correct. The user doesn't have enough context to judge — these are the agent's own observations from implementation. If the agent thinks the learnings are useful enough to propose, it should just save them.

**Expected**: Present the learnings for visibility (showing what was learned is good), but don't ask for confirmation — just write them. The agent is the authority on what it learned during implementation.
