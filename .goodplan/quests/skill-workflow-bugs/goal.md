# Side Quest: Skill Workflow Bugs & Output Consistency

Fix accumulated bugs and inconsistencies across the goodplan skill workflow, and standardize output templates for consistent user-facing presentation.

## Part A: Bugs

### 1. Duplicate verification/success-criteria in slice definitions

**Skill**: `/create-slices` (and possibly `/refine-slices`)

When defining slices in an epic, the output includes both a "Verification" section and a "Success Criteria" section with heavy overlap. Either consolidate them into a single section or clearly differentiate their purposes so there's no repetition.

**Expected**: One clear section that captures what "done" looks like, or two sections with zero overlap and distinct purposes.

### 2. Unnecessary user confirmation prompts during workflow execution

**Skill**: Multiple (any skill that writes files as part of its workflow)

When running in dangerously-skip-permissions mode, Claude Code still asks the user "Can I go ahead and write this file?" at moments where the workflow clearly calls for writing the file. This isn't a harness permission issue — it's the skill/prompt behavior asking for unnecessary confirmation mid-workflow.

**Expected**: When following a defined workflow (e.g., writing a review file, creating a plan, saving research), proceed without asking. Only ask when the action is genuinely ambiguous or outside the workflow's scope.

### 3. `/complete` asks user to confirm learnings instead of just saving them

**Skill**: `/complete`

During slice/quest completion, the skill presents the learnings it gathered during implementation and asks the user whether they're correct. The user doesn't have enough context to judge — these are the agent's own observations from implementation. If the agent thinks the learnings are useful enough to propose, it should just save them.

**Expected**: Present the learnings for visibility (showing what was learned is good), but don't ask for confirmation — just write them. The agent is the authority on what it learned during implementation.

### 4. Migration doesn't detect missed LLM-generated files

**Skill**: `/migrate` (and `goodplan migrate` CLI command)

When the LLM provides `sourcePath` entries during migration, the CLI validates those paths exist but doesn't check for sibling files/directories the LLM didn't mention. If the LLM misses a research file or brainstorm directory, it gets silently dropped from the migration. The CLI should scan for siblings at each sourcePath and ask the LLM about any it didn't include.

**Expected**: After the LLM provides entity answers with sourcePaths, the CLI scans each source directory for files/subdirectories not covered by the answers and emits a follow-up question asking if they should be included.

## Part B: Consistent Output Templates

Rigid, concrete output templates for all skills that present structured information to the user — replacing prose-described formats with exact markdown templates that leave no room for LLM interpretation variance.

### Why

Skills like `/project-status`, `/implement-plan`, `/refine-plan`, `/complete`, and `/create-slices` present structured reports to the user, but each run produces slightly different formatting (tables vs lists, different heading levels, inconsistent groupings). The templates exist as prose descriptions in SKILL.md files, which the LLM interprets loosely. Users should see the same visual structure every time they run the same skill.

### Skills to audit and fix

| Skill | Output types |
|---|---|
| `/project-status` | Format A (active slice/quest), Format B (between work items) |
| `/implement-plan` | Iteration summary, completion summary, phase progress |
| `/refine-plan` | Iteration summary, completion summary |
| `/refine-architecture` | Iteration summary, completion summary |
| `/refine-slices` | Iteration summary, completion summary |
| `/complete` | Completion report, learnings summary |
| `/create-slices` | Slice list summary |
| `/create-plan` | Phase breakdown, done summary |

### Approach

1. **Audit** each skill's output templates — identify where prose descriptions allow variance
2. **Create concrete templates** — exact markdown with `{placeholders}`, no prose alternatives. Use fenced code blocks or heredoc-style templates that the LLM copies verbatim and fills in
3. **Extract shared templates** to `_shared/references/output-templates.md` where multiple skills use the same pattern (e.g., iteration summaries shared by refine-plan and implement-plan)
4. **Test** by running each skill twice and comparing output structure (not content)

### Out of scope

- Changing what information is presented (content decisions)
- Adding new output types
- Interactive/conversational output (only structured reports)
