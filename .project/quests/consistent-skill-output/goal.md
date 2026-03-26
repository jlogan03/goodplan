# Side Quest: Consistent Skill Output Templates

## What We're Building

Rigid, concrete output templates for all skills that present structured information to the user — replacing prose-described formats with exact markdown templates that leave no room for LLM interpretation variance.

## Why

Skills like `/project-status`, `/implement-plan`, `/refine-plan`, `/complete`, and `/create-slices` present structured reports to the user, but each run produces slightly different formatting (tables vs lists, different heading levels, inconsistent groupings). The templates exist as prose descriptions in SKILL.md files, which the LLM interprets loosely. Users should see the same visual structure every time they run the same skill.

## Scope

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
