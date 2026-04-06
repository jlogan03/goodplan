# Output Templates

Shared rigid templates for structured output displayed to users. Skills reference these templates to ensure consistent formatting across runs.

## Iteration Summary Template

Display after every review iteration, immediately after synthesizing feedback and before applying fixes.

**Used by**: plan-slice, create-epic, create-side-quest, implement

```
---

### {scope_prefix}Iteration {N} Review

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

### Substitution Rules

| Placeholder | Description |
|---|---|
| `{scope_prefix}` | **Conditional.** implement: `Phase {X} — `. All other skills: omit (empty string). |
| `{N}` | Iteration number within the current scope (phase for implement, full loop for refinement skills). |
| `{reviewer1}`, `{reviewer2}`, ... | Reviewer names and scores, comma-separated. Include all reviewers active in this iteration. |
| `{brief issue description}` | One-line summary — enough to identify the issue, not the full explanation. |
| `{Reviewer name(s)}` | Source reviewer(s). If deduplicated across reviewers, list all (e.g., "Holistic, Backend"). |
| `{resolution}` | One of: `DIRECTLY_ACTIONABLE`, `USER_INPUT`, `RESEARCH_NEEDED`, `CODEBASE_EXPLORATION`. |

### Display Rules

- List ALL issues, not just a summary count. Users want to see what was found.
- Order by severity: CRITICAL first, then IMPORTANT, then MINOR.
- Keep issue descriptions to one line.
- The "Actions" line previews what happens next before the orchestrator proceeds.
- Display every iteration, not just every N iterations.

## Context Load Summary Template

Display after loading project context at skill start. Gives the user visibility into what the skill found.

**Used by**: create-epic, plan-slice, complete-epic

```
**Loaded**: {files_loaded}
**Context**: {context_summary}
**Missing**: {missing_files}
```

### Substitution Rules

| Placeholder | Description |
|---|---|
| `{files_loaded}` | Comma-separated list of files/directories successfully loaded (e.g., "idea.md, conventions.md, architecture/"). |
| `{context_summary}` | One-line summary of what was found. **Skill-specific** — see Display Rules below. |
| `{missing_files}` | Comma-separated list of expected but missing files, or "None". |

### Display Rules

- The `**Context**` line content varies by skill:
  - **create-epic** (slice definition phase): Brief summary of epic/project scope and architecture state (e.g., "Epic initial: 4 subsystems defined, 2 active decisions").
  - **plan-slice**: Brief summary of slice goal, architecture, and conventions (e.g., "Slice 02-data-layer: schema + seed data, 3 architecture files loaded").
  - **complete-epic**: Scope-dependent format strings:
    - Epic scope: "Epic [name]: {N} slices completed, {M} research files, {K} brainstorm files, {J} prototypes."
    - Slice/quest scope: "Plan ({N} phases), {M} implementation reviews, {K} research files, architecture ({N} files)."
- Keep the summary to one line — details are available in the loaded files.

## Completion Summary Template

Display at the end of iterative review/implementation skills after all iterations complete. Shows the full review history.

**Used by**: plan-slice, create-epic, create-side-quest, implement

The shared base contains the intersection of all consumers. Each skill extends with its own sections.

### Shared Base

```
---

## {completion_heading}

**Final {score_label}**: {min_score}/10
**Iterations**: {N}
{skill_specific_header_fields}

### Score Progression

| Iteration | {Reviewer1} | {Reviewer2} | ... |
|-----------|-------------|-------------|-----|
| 1         | {score}     | {score}     |     |
| ...       |             |             |     |

(Use — for reviewers not active in that iteration)

### Issues Resolved {issues_resolved_variant}

{issues_resolved_content}

### Remaining Issues

{List any unresolved MINOR issues, or "None — all issues resolved."}

{skill_specific_extension_sections}

---
```

### Substitution Rules

| Placeholder | Description |
|---|---|
| `{completion_heading}` | **Skill-specific.** plan-slice (refinement phase): `Refinement Complete`. create-epic (architecture refinement phase): `Architecture Refinement Complete`. create-epic (slice refinement phase): `Refinement Complete`. implement: `Implementation Complete`. |
| `{score_label}` | **Skill-specific.** plan-slice (refinement phase): `plan score`. create-epic (architecture refinement phase): `score`. create-epic (slice refinement phase): `score`. implement: omit — drop the entire `**Final ...**` line (see Display Rules). |
| `{min_score}` | Minimum score across all reviewers in the final iteration. |
| `{N}` | Total iteration count. |
| `{skill_specific_header_fields}` | **Skill-specific.** plan-slice (refinement phase): `**Path**: {path to -refined file or directory}`. create-epic (architecture refinement phase): `**Architecture files**: $ARCH_DIR/`. create-epic (slice refinement phase): omit. implement: `**Plan**: {plan name}` + `**Phases completed**: {N}` + `**Total iterations**: {sum across all phases}`. |
| `{issues_resolved_variant}` | **Skill-specific.** plan-slice (refinement phase): `Per Iteration` (full per-iteration tables). create-epic (architecture refinement phase): `Per Iteration` (full per-iteration tables). create-epic (slice refinement phase): empty string (use total count for content). implement: omit — drop the entire `### Issues Resolved` and `### Remaining Issues` sections (see Display Rules). |
| `{issues_resolved_content}` | **Skill-specific.** plan-slice/create-epic (architecture refinement phase): per-iteration severity tables. create-epic (slice refinement phase): `**Total**: {N} issues ({breakdown by severity})`. implement: omit — section dropped entirely (see Display Rules). |
| `{skill_specific_extension_sections}` | **Skill-specific.** See each skill's SKILL.md for extension sections. |

### Display Rules

- **Conditional score line**: When `{score_label}` is "omit" (or empty), drop the entire `**Final {score_label}**: {min_score}/10` line from the output.
- **Conditional issues sections**: When both `{issues_resolved_variant}` and `{issues_resolved_content}` are "omit" (or empty), drop the entire `### Issues Resolved` and `### Remaining Issues` sections (headings + content) from the output.
- Always include Score Progression — this is part of the shared base.
- Extension sections are appended after Remaining Issues (or after Score Progression if issues sections are omitted) but before the closing `---`.
- Skill-specific extensions:
  - **plan-slice (refinement phase)**: `**Path**` header field. Issues Resolved uses per-iteration tables with `# | Severity | Issue | Source | Status` columns.
  - **create-epic (architecture refinement phase)**: `**Architecture files**` header field. Adds `### Changes Summary` section (substantive changes: added/removed/modified subsystems, boundary shifts, new patterns). Issues Resolved uses per-iteration tables.
  - **create-epic (slice refinement phase)**: Issues Resolved uses total count. Adds `### Slices Modified` table (`Slice | Change`).
  - **implement**: Replaces score/iterations header fields with Plan/Phases/Total iterations. Adds `### Phase Summary` table (`Phase | Name | Iterations | Final Score | Commit`), `### Verification Evidence`, `### Key Decisions`, `### Follow-up Recommendations`.

## Done Summary Template

Display at the very end of a skill run to confirm what was produced and recommend next steps.

**Used by**: create-epic, plan-slice, complete-epic, explore

Two variants exist based on skill output style:

### Variant A — Strict Fenced Template

For skills that produce structured, predictable output (create-epic slices phase, plan-slice, complete-epic).

```
---

## {done_heading}

{done_fields}
**Recommended next step**: {next_step}

---
```

#### Substitution Rules

| Placeholder | Description |
|---|---|
| `{done_heading}` | **Skill-specific.** create-epic (slices phase): `Slices Defined`. plan-slice: `Plan Created`. complete-epic: `Completion Summary`. |
| `{done_fields}` | **Skill-specific.** See each skill's SKILL.md for the exact fields. |
| `{next_step}` | **Skill-specific.** create-epic (slices phase): `` `/gp:plan-slice` for {first unplanned slice name} ``. plan-slice: `` `/gp:implement` ``. complete-epic: context-dependent (next slice, next epic phase, etc.). |

#### Skill-Specific Fields

- **create-epic (slices phase)**: `**Total**: {N} slices`, `**Output**: {path to slices directory}`, `**Slices**: {numbered list of slice names}`
- **plan-slice**: `**Plan**: {path to plan file}`, `**Phases**: {N}`, `**Research files written**: {list or "None"}`
- **complete-epic**: `**Scope**: {slice/quest/epic name}`, `**Artifacts written**: {list of files written during completion}`, `**Architecture updates**: {count} proposed`, `**Learnings**: {count} recorded`

### Variant B — Loose Checklist

For skills whose output is more prose-oriented and variable (create-epic architecture phase, explore).

These skills should display a closing summary that includes the following information (format is flexible — not a rigid fenced block):

- **All artifacts written** during the run (file paths)
- **Decisions recorded** during the run (if any — list each decision title)
- **CLAUDE.md update** confirmation (if applicable)
- **Recommended next step**

#### Skill-Specific Guidance

- **create-epic (architecture phase)**: List all files written (conventions.md + each architecture file), all decisions, CLAUDE.md update confirmation. Recommend continuing to slices phase.
- **explore**: Summarize all decisions written during this run. Recommend next step based on scope (epic: `/gp:create-epic`, slice: `/gp:plan-slice`, side quest: `/gp:plan-slice`).
