# Agent Skill Review — Phase 1: Consolidate Output Templates (Iteration 2)

## Issues

**[MINOR]** `{issues_resolved_variant}` for refine-slices: "omit variant label" vs. the conditional rendering rule
The Display Rules state: "When both `{issues_resolved_variant}` and `{issues_resolved_content}` are 'omit' (or empty), drop the entire `### Issues Resolved` and `### Remaining Issues` sections." For refine-slices, `{issues_resolved_variant}` is NOT "omit" — the skill says "omit variant label — use total count". The section is still rendered (heading + content), just without an inline variant label appended to the heading. However, the Substitution Rules table says for refine-slices: "omit variant label (use total count for content)" while the Display Rules trigger is keyed on both values being "omit". An agent reading the table row literally might confuse "omit variant label" with the Display Rules' "omit" condition and drop the whole section. The ambiguity is subtle but real: "omit" has two different meanings in the same table (drop the label vs. drop the section).
File: skills/_shared/references/output-templates.md:132
Resolution: DIRECTLY_ACTIONABLE

Fix: Distinguish the two uses of "omit" more clearly. For refine-slices in the substitution table, use a phrase like "empty string (no label appended)" rather than "omit variant label" so it cannot be confused with the skip-section sentinel.

**[MINOR]** `{issues_resolved_content}` description for implement-plan still says "omit — section dropped entirely" but the Display Rules trigger requires BOTH values to be omit
The Substitution Rules table says for implement-plan: `{issues_resolved_variant}` = "omit — drop the entire `### Issues Resolved` and `### Remaining Issues` sections (see Display Rules)" and `{issues_resolved_content}` = "omit — section dropped entirely (see Display Rules)". The Display Rules correctly describe the condition as "When both `{issues_resolved_variant}` and `{issues_resolved_content}` are 'omit' (or empty)". The fix from iteration 1 correctly added this Display Rule. However the Substitution Rules table still says "see Display Rules" from both rows redundantly — an agent reading only the table rows and missing the Display Rules section would still need to infer the drop-section behavior. This is low-risk but slightly redundant guidance. Not blocking, just a polish point.
File: skills/_shared/references/output-templates.md:132
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** explore's Done Summary still does not confirm CLAUDE.md update in the bullet list (explore/SKILL.md)
Variant B's Loose Checklist (output-templates.md line 186) lists four required checklist items: artifacts written, decisions recorded, CLAUDE.md update confirmation, recommended next step. The explore SKILL.md's "After completion — Done Summary" section (Step 6) now correctly includes "All artifacts written during this run", "All decisions written during this run", and the four scope-specific next steps. It also says "CLAUDE.md update confirmation (if applicable)" — which is present. On re-reading, this MINOR issue from iteration 1 appears to have been fully resolved. No issue here — confirming it is fixed.
File: skills/explore/SKILL.md:235
Resolution: DIRECTLY_ACTIONABLE

## Verification of Round 1 IMPORTANT Fixes

Both IMPORTANT issues from iteration 1 are correctly resolved:

1. **Conditional score line (score_label "omit")** — Display Rules now explicitly states: "When `{score_label}` is 'omit' (or empty), drop the entire `**Final {score_label}**: {min_score}/10` line from the output." This is clear and unambiguous.

2. **Conditional Issues Resolved section** — Display Rules now explicitly states: "When both `{issues_resolved_variant}` and `{issues_resolved_content}` are 'omit' (or empty), drop the entire `### Issues Resolved` and `### Remaining Issues` sections (headings + content) from the output." Correctly covers both heading and content.

The README.md description update (iteration 1 MINOR) is also correctly resolved: new description "Rigid templates for structured user-facing output: iteration summaries, context load, completion, and done summaries" is concise and scannable.

The explore skill bullet list fix (iteration 1 MINOR) is resolved — the skill now references the Variant B template and lists all four required items.

The `{issues_resolved_content}` / ordering issue (iteration 1 MINOR) is resolved by the Display Rules drop-section condition.

## Score: 9/10

Both IMPORTANT issues are cleanly resolved with explicit Display Rules that an LLM agent can follow unambiguously. The three MINORs from iteration 1 are resolved. Two new MINOR issues remain: the dual use of "omit" in the substitution table could cause confusion for refine-slices, and the "see Display Rules" redundancy in the implement-plan rows is slightly noisy. Neither is blocking. The template decomposition, conditional rendering rules, and skill-specific extension patterns are sound.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
