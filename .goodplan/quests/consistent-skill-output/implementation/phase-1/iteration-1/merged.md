# Merged Review — Phase 1: Consolidate Output Templates

**Scores**: Generalist 9/10 | Agent-Skill 7/10
**Issues**: Critical: 0 | Important: 2 | Minor: 3

---

## Overall Assessment

The consolidation is well-structured and complete. All 3 template groups are properly extracted to `output-templates.md`, all 10 consumers updated, inline copies removed, and README updated. The diff is net -8 lines. The shared base + skill-specific extensions decomposition is a sound approach, and the "Used by" annotations and substitution rules tables are clear. The two IMPORTANT issues center on "omit" semantics — the original inline templates were unambiguous (each skill showed exactly what to render), but the shared template introduces conditional rendering that isn't explicitly documented.

---

## Issues

### IMPORTANT-1: Ambiguous "omit" semantics for `{score_label}` — entire line must be dropped

**Raised by**: Generalist (Minor), Agent-Skill (Important) — agent-skill correctly elevated this
**File**: `skills/_shared/references/output-templates.md:97`

The shared base template always renders `**Final {score_label}**: {min_score}/10`. implement-plan sets `{score_label}` to "omit (use Phase Summary table instead)" — but this is guidance for the skill author, not a rendering instruction. An agent following the template literally would output `**Final omit**: 8/10` or `**Final **: 8/10`. The original implement-plan template had no score line at all.

**Fix**: Add a display rule clarifying that when `{score_label}` is "omit" (or empty), the entire `**Final {score_label}**: {min_score}/10` line should be removed from output. A conditional marker in the template — e.g. `(omit this line if {score_label} is empty)` — would make this unambiguous for LLM consumers.

---

### IMPORTANT-2: Ambiguous "omit" semantics for `### Issues Resolved` section

**Raised by**: Agent-Skill (Important)
**File**: `skills/_shared/references/output-templates.md:110`

The shared base always renders the `### Issues Resolved {issues_resolved_variant}` heading and `{issues_resolved_content}`. implement-plan sets both to "omit (covered by Phase Summary)" — but the heading still renders, producing an empty `### Issues Resolved` section. refine-slices similarly says to "omit variant label" while still using the heading. The original implement-plan had no Issues Resolved section at all.

**Fix**: Add a display rule stating that when both `{issues_resolved_variant}` and `{issues_resolved_content}` are omitted, the entire `### Issues Resolved` section (heading + content) should be removed. A conditional marker like `(omit section if not applicable)` would make rendering behavior explicit.

---

### MINOR-1: explore's Done Summary is missing "All artifacts written" and "CLAUDE.md update" checklist items

**Raised by**: Generalist (Minor), Agent-Skill (Minor) — in agreement
**File**: `skills/explore/SKILL.md:235`

Variant B's Loose Checklist specifies four items: artifacts written, decisions recorded, CLAUDE.md update, recommended next step. The explore skill's Done Summary only lists decisions and next step — omitting "All artifacts written" and "CLAUDE.md update confirmation". This isn't a regression (the original also omitted them), but the consolidation creates a gap between what the shared template prescribes and what explore actually renders.

**Fix**: Either add the missing items to explore's bullet list, or add a note in the template's skill-specific guidance for explore stating that only decisions and next steps are relevant for this skill.

---

### MINOR-2: `{issues_resolved_content}` forward-reference issue for implement-plan

**Raised by**: Agent-Skill (Minor)
**File**: `skills/_shared/references/output-templates.md:133`

The substitution rules say implement-plan's `{issues_resolved_content}` is "covered by Phase Summary" — but Phase Summary is defined under `{skill_specific_extension_sections}`, which appears after `### Remaining Issues` in the template. This creates a logical ordering problem: the Issues Resolved section references content that hasn't been rendered yet. This becomes moot if IMPORTANT-2 is fixed (the entire section would be omitted for implement-plan).

**Fix**: Resolve via IMPORTANT-2. If the section is conditionally omitted, this ordering issue disappears.

---

### MINOR-3: README.md description is too long for a table cell

**Raised by**: Agent-Skill (Minor)
**File**: `skills/_shared/references/README.md:19`

The updated README entry for `output-templates.md` is a single long sentence listing all four template groups. Accurate but hard to scan.

**Fix**: Shorten to something concise, e.g.: "Rigid templates for structured user-facing output: iteration summaries, context load, completion, and done summaries."

---

## Deduplication Notes

- The `{score_label}` "omit" ambiguity was raised by both reviewers; agent-skill correctly identified it as Important (LLM consumer risk) while generalist rated it Minor. Merged at Important.
- The explore Done Summary gap was raised by both reviewers; aligned at Minor.
- The `{issues_resolved}` section ambiguity (IMPORTANT-2) and the forward-reference issue (MINOR-2) are related; MINOR-2 is subsumed by fixing IMPORTANT-2.
- README verbosity (MINOR-3) was only raised by agent-skill; included as is.
- No contradictions between reviewers.
