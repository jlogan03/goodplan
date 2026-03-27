## Issues

**[IMPORTANT]** Maturity legend text in plan does not match maturity-conventions.md for "Developing"

The plan's proposed legend text says: "Developing: changes expected, be deliberate." However, `maturity-conventions.md` defines Developing as "Changes expected but should be deliberate" and also defines an **Experimental** level ("Changes are free") which the legend omits entirely. The plan silently drops Experimental from the legend. Since the legend is meant to derive from `maturity-conventions.md`, it should either include all four levels or explicitly justify omitting Experimental. Given that all current subsystems are at Developing, omitting Experimental is reasonable — but the plan should state the rationale. More importantly, the Developing description should match the canonical source exactly.

Additionally, the plan proposes the same 3-line legend be added to three different files across Phase 1 (shared-preamble.md and sub-agent-prompts.md) and then duplicated identically in Phase 2 (refine-plan's shared-preamble.md). This is four copies of the same text with no single source of truth. If the legend text ever needs updating (e.g., when a subsystem reaches Maturing or Foundational), all four locations must be found and edited — violating DRY.

Fix: (1) Correct the legend wording to match `maturity-conventions.md` exactly. (2) Either extract the legend to a shared reference file under `skills/_shared/references/` (e.g., `maturity-legend.md`) that all skills reference, or accept the duplication with a comment noting where the canonical definitions live. Option 1 is preferable — it matches the existing pattern of `_shared/references/` for cross-skill content.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** refine-slices uses refine-plan's shared preamble — Phase 3 may create a conflicting preamble

The plan says in Phase 3 task 2: "If refine-slices uses a shared preamble, add the same `## Subsystem Maturity` section. If it uses a different mechanism, adapt accordingly." This hedging suggests the plan author wasn't sure of the actual mechanism. Codebase exploration confirms refine-slices reuses `../refine-plan/references/shared-preamble.md` (see `skills/refine-slices/SKILL.md` line 195 and `skills/refine-slices/references/reviewers-slices.md` line 5). Therefore, Phase 2's preamble change automatically flows to refine-slices — no separate preamble work is needed in Phase 3. Phase 3's task 2 should be simplified to: "Confirm refine-slices inherits the maturity section from refine-plan's shared preamble (already added in Phase 2). Verify the `{maturity_summary}` placeholder is filled when spawning reviewers."

Without this fix, an implementer might create a duplicate preamble file for refine-slices, violating the existing sharing pattern.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 adds a reviewer criterion without a maturity table in the preamble

Phase 3 task 3 adds a "Maturity Note completeness" criterion to the Architecture Alignment reviewer in `reviewers-slices.md`. This criterion says to check whether slices touch subsystems at Maturing or Foundational maturity "using the maturity table." But the reviewer can only use the maturity table if it's passed to them via the preamble's `{maturity_summary}` placeholder. Phase 3 task 2 handles the preamble, but the dependency between these tasks is implicit. If task 2 fails or is skipped, the reviewer criterion references data it doesn't have.

Fix: Make the dependency explicit in the plan. Task 3 should note: "This criterion depends on the `{maturity_summary}` being populated in the preamble (task 2). If maturity data is absent, this criterion is skipped." Also, the criterion text should include a conditional: "If no maturity table is available in the preamble, skip this criterion."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan doesn't address refine-slices' SKILL.md placeholder filling for `{maturity_summary}`

Phase 3 task 1 says to add maturity extraction to refine-slices SKILL.md, and task 2 says to add maturity to the reviewer preamble. But the plan doesn't explicitly describe where in refine-slices' SKILL.md the `{maturity_summary}` placeholder gets filled before spawning reviewers. Looking at the codebase, refine-slices delegates reviewer spawning to the iteration-loop pattern (Step 3, line 99-116 of SKILL.md) which fills placeholders when constructing the preamble. The plan should specify where in the workflow the placeholder is filled — likely in Step 0 (Load Context) where other architecture files are loaded, with the value carried to Step 3 when spawning reviewers.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Expected Behavior checks are shallow (grep counts) and don't verify behavior

All Expected Behavior checks across all three phases use `grep -c "maturity"` to verify presence/absence. This proves a string exists in a file but not that the maturity system is correctly wired. For example, Phase 1's "After" check `grep -c "maturity" skills/implement-plan/SKILL.md returns >= 1` would pass even if someone just added the word "maturity" in a comment. More meaningful checks would verify structural properties — e.g., that the `{maturity_summary}` placeholder appears in the preamble's conditional section, or that the extraction step references `_overview.md`.

This is minor because grep checks are the standard pattern used in this project's plans (pragmatic, fast, catches obvious regressions), and the Verification sections provide deeper structural checks. But the gap between Expected Behavior and actual correctness is worth noting.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 "user presentation" step isn't in other phases

Phase 2 task 4 adds a user-facing maturity summary ("**Maturity context**: [list of subsystems at Maturing or Foundational, or 'All subsystems at Developing or below']"). Phase 3 task 4 has a similar user presentation. But Phase 1 (implement-plan) has no equivalent user presentation step. For consistency, implement-plan should also present maturity context to the user during plan loading (Step 1), since the implementing user benefits from the same visibility as the refining user.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan has a clear, consistent structure and correctly identifies the three skills needing maturity threading. The phased approach with consistent patterns is sound. However, there are three IMPORTANT issues: (1) the legend text diverges from the canonical source and is duplicated without a single source of truth, (2) the Phase 3 preamble task misunderstands the existing architecture (refine-slices already shares refine-plan's preamble), and (3) the reviewer criterion in Phase 3 has an implicit dependency on preamble data without a conditional guard. Fixing these would bring the score to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
