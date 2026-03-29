## Issues

**[IMPORTANT]** Phase 0 consolidation scope is incomplete — shared-preamble.md and codebase-context-discovery.md are also duplicated but excluded

Phase 0 consolidates `formats.md` (6 copies), `dependency-research.md` (2 copies), and `team-defaults.md` (2 copies). However, `codebase-context-discovery.md` is also duplicated identically across refine-plan and implement-plan. The plan's consolidation criterion is "will these stay unified long-term?" — codebase-context-discovery serves the same purpose in both skills and should stay unified. Meanwhile, `shared-preamble.md` is correctly excluded (the copies differ between refine-plan and implement-plan — different placeholder sets for plan review vs code review), but the plan doesn't explain why it's excluded, which will confuse the implementer.

Add `codebase-context-discovery.md` to the consolidation list. Add a brief note explaining why `shared-preamble.md` is NOT consolidated (the two copies serve different review contexts with different placeholders).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Decision readers list missing refine-plan and implement-plan

The overview states "Who reads: All interactive skills load active decisions as context alongside architecture files." Phase 3 lists 7 reader skills but excludes `refine-plan` and `implement-plan`. Both skills spawn reviewer sub-agents that evaluate plans/code against the project's architecture — decisions are equally relevant context for reviewers. The architecture-quality downstream quest explicitly mentions "Load context + decisions" for refine-architecture, which reuses the same reviewer infrastructure. If refine-plan and implement-plan don't load decisions, their reviewers will lack this context.

Add refine-plan and implement-plan to the reader list, or explicitly explain why they're excluded (e.g., decisions are passed through via the plan content rather than loaded directly).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No explicit contract for how downstream quests consume the conventions

The architecture-quality quest expects to reference `decisions-format.md` and `expertise-tracking.md` from `_shared/references/`. The slice-quality-and-health quest expects `system-profile.md` convention (a new file this plan doesn't create) and decision writing from `/complete-slice`. This plan creates the shared reference files and updates skills to use them, but doesn't define a stable contract — what constitutes a breaking change to these convention files? If the architecture-quality quest's `/refine-architecture` needs to extend `decisions-format.md` (e.g., adding a "category" field for architecture decisions), is that safe, or would it break the 7 skills already consuming it?

Add a brief "Extension policy" section to the two convention files (decisions-format.md and expertise-tracking.md): additive fields are safe, format changes require updating all consumers, which consumers exist (list the skills).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 creates a cross-skill coupling without an abstraction layer

Phase 3 adds decision-loading logic to 7 SKILL.md files independently: "Load all .md files from `.project/decisions/`, skip superseded, flag revisiting." This identical logic repeated across 7 skills is a maintenance burden — if the loading behavior changes (e.g., adding a "category" filter for the architecture-quality quest), all 7 files need updating. The plan already establishes `_shared/references/` as a consolidation point for shared knowledge. The loading behavior should be described once in `decisions-format.md` (which it partially is — "Who reads" section), and each SKILL.md should reference that file rather than duplicating the loading algorithm.

Restructure Phase 3: put the full loading algorithm (glob, skip superseded, flag revisiting) in `decisions-format.md` as a "Loading Protocol" section. Each SKILL.md adds a single instruction: "Read `~/.claude/skills/_shared/references/decisions-format.md` and follow the Loading Protocol to load `.project/decisions/`." This gives one place to update when loading behavior changes.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 expertise check placement conflicts with complete-slice's existing structure

Phase 4 says "add a final step before the state write-back step" for the expertise check. In complete-slice, the state write-back is Step 10, but Steps 7-9 (CLAUDE.md update, remaining slice review, cleanup check) happen after the core work. Adding an expertise check before Step 10 but after Step 9 creates an awkward ordering — the cleanup check (Step 9) is user-facing and interactive, while the expertise check is a silent observation step. It would be more natural to place the expertise check immediately after the core interactive work (after Step 6 in complete-slice, after the main interactive phase in other skills) rather than rigidly "before state write-back."

Soften the placement guidance: "add as a final step after the main interactive work completes, before state write-back" rather than literally "the step before state write-back." Let each skill place it where it fits naturally.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 0 verification doesn't check that SKILL.md files still function correctly after path changes

Phase 0's verification checks that grep patterns match (old paths gone, new paths present) and does a spot-check read of 2-3 SKILL.md files. But the real risk is that a skill's Read instruction resolves incorrectly at runtime — e.g., relative path resolution might differ between skill contexts. Consider adding a functional verification: actually invoke one skill (e.g., `/project-status`) after the migration to confirm it still loads its references correctly.

Resolution: MINOR — the spot-check read is adequate for catching path errors; functional testing is nice-to-have.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Expertise tracking auto memory path uses underscore inconsistently with kebab-case convention

The plan specifies `expertise_<domain>.md` with underscores (e.g., `expertise_event_driven.md`) but the domain portion uses underscores while the plan elsewhere uses kebab-case for slugs (decision files use `<slug>.md` in kebab-case). This inconsistency could cause confusion. The auto memory system may have its own conventions — if so, document that explicitly. If not, use kebab-case consistently: `expertise-event-driven.md`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing and good separation between convention definition (Phases 1-2) and skill integration (Phases 3-4). The consolidation-first approach (Phase 0) is architecturally sound. However, there are meaningful coupling and abstraction issues: duplicating decision-loading logic across 7 skills rather than abstracting it, missing an extension policy for convention files that downstream quests depend on, and an incomplete consolidation scope. These issues would create maintenance burden immediately and friction for the architecture-quality and slice-quality-and-health quests. Fixing the 4 IMPORTANT items would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
