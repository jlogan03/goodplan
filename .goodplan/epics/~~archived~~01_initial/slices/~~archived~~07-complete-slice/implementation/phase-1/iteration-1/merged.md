# Merged Review — Phase 1: Reference Files

## Scores

- Generalist: 9/10
- Agent Skill: 9/10

## Important Issues

1. **Implementation directory reading strategy too terse in guidance.md** — The Artifact Loading section says `implementation/ (last iteration's merged.md per phase)` but omits key plan detail: read result.md only if review references specific issues; skip earlier iterations unless investigating recurring problems. Add a 2-3 sentence "Implementation Reading Strategy" sub-section. *(Agent Skill)*

2. **Learnings idempotency check target ambiguous** — Guidance.md says "check for existing `_Source: <slice-name>_` before adding — offer replace if found" but doesn't clarify this applies to the **top-level** `.project/learnings.md`, not the per-slice `completion/learnings.md`. Add explicit file target. *(Generalist)*

## Minor Issues

1. **`sequencing.md` missing from Artifact Loading section** — Section 6 (Remaining Slice Review) references it, and plan Step 7 explicitly reads it, but Artifact Loading doesn't list it. Mention it there or note on-demand loading in Step 7. *(Generalist)*

2. **Decision file "Context" vs plan's "Context/Source"** — Plan says "Context/Source" as a section name; guidance.md uses "Context" with inline `(include Source: complete-slice for <scope>)`. Minor naming difference — SKILL.md can handle either way. *(Agent Skill)*

3. **CLAUDE.md Update section doesn't reference define-slices pattern** — Plan mentions "follow the pattern from define-slices" but guidance just says "no CLAUDE.md — skip". Not essential since SKILL.md Phase 2 will provide full detail. *(Generalist)*

4. **Decision file format missing example filename** — Plan gives example (`2026-03-17-adopt-event-sourcing.md`) but guidance only shows the pattern. Not essential but aids agent compliance. *(Generalist)*
