# Agent Skill Review — Phase 1: Consolidate Output Templates

## Issues

**[IMPORTANT]** Ambiguous "omit" semantics for `{score_label}` in Completion Summary Template
The shared base template (line 97 of output-templates.md) renders `**Final {score_label}**: {min_score}/10` as a fixed line. implement-plan sets `{score_label}` to "omit" — but the template does not explain whether "omit" means remove the entire `**Final ...**` line or just leave the label blank. The original implement-plan template had no score line at all (it used Phase Summary instead). An agent following the shared template literally would render `**Final omit**: 8/10` or `**Final **: 8/10`. The substitution rules table says "omit (use Phase Summary table instead)" but this is guidance for the skill author, not a rendering instruction.
File: skills/_shared/references/output-templates.md:97
Resolution: DIRECTLY_ACTIONABLE

Fix: Add a display rule clarifying that when `{score_label}` is "omit", the entire `**Final {score_label}**: {min_score}/10` line should be removed from output. Alternatively, mark the line as conditional in the template with a note like `(omit this line if {score_label} is empty)`.

**[IMPORTANT]** Ambiguous "omit" semantics for `{issues_resolved_variant}` and `### Issues Resolved` section
Same pattern: the shared base always renders `### Issues Resolved {issues_resolved_variant}` and `{issues_resolved_content}`. implement-plan says both are "omit (covered by Phase Summary)" — but the template still renders the `### Issues Resolved` heading. The original implement-plan had no Issues Resolved section at all. An agent following the template literally would output an empty `### Issues Resolved` section. Similarly, refine-slices says to "omit variant label" but still uses the heading.
File: skills/_shared/references/output-templates.md:110
Resolution: DIRECTLY_ACTIONABLE

Fix: Add a display rule stating that when `{issues_resolved_variant}` and `{issues_resolved_content}` are both omitted, the entire `### Issues Resolved` section (heading + content) should be removed. The template could use a conditional marker like `(omit section if not applicable)`.

**[MINOR]** explore's Done Summary loses "All artifacts written" checklist item
Variant B's Loose Checklist specifies four items: artifacts written, decisions recorded, CLAUDE.md update, recommended next step. The explore skill's Done Summary only lists decisions and next steps — it omits "All artifacts written" and "CLAUDE.md update confirmation". The original explore skill didn't have these either, so this isn't a regression, but the consolidation creates a gap: the template says to include all four items, but explore only references two.
File: skills/explore/SKILL.md:235
Resolution: DIRECTLY_ACTIONABLE

Fix: Either add the missing items to explore's bullet list (artifacts written during the run, CLAUDE.md update if applicable), or add a note in the template's skill-specific guidance for explore that only decisions and next steps are relevant.

**[MINOR]** `{issues_resolved_content}` placeholder for implement-plan says "covered by Phase Summary" but Phase Summary is in extension sections
The substitution rules table says implement-plan's `{issues_resolved_content}` is "covered by Phase Summary" — but Phase Summary is defined under `{skill_specific_extension_sections}`, which appears after `### Remaining Issues` in the template. This creates a logical ordering issue: the Issues Resolved section references content that hasn't been rendered yet. This is tied to the IMPORTANT issue above — if the entire section is omitted, this becomes moot.
File: skills/_shared/references/output-templates.md:133
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** README.md description is very long for a table cell
The updated README entry for output-templates.md is a single long sentence listing all four template groups. While accurate, it's harder to scan than the original concise description.
File: skills/_shared/references/README.md:19
Resolution: DIRECTLY_ACTIONABLE

Fix: Shorten to something like: "Rigid templates for structured user-facing output: iteration summaries, context load, completion, and done summaries"

## Score: 7/10

The consolidation is well-structured and the template decomposition into shared base + skill-specific extensions is a sound approach. The "Used by" annotations and substitution rules tables are clear and helpful. However, the two IMPORTANT issues around "omit" semantics are significant for an LLM consumer — agents interpreting these templates will encounter genuine ambiguity about whether to render empty sections or skip them entirely. The original inline templates were unambiguous (each skill showed exactly what to render); the shared template introduces conditional rendering that isn't explicitly documented. Fixing the omit semantics and adding conditional rendering rules would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
