## Issues

**[MINOR]** Phase 3 refine-plan/implement-plan decisions loading reaches sub-agents indirectly — confirm propagation path

Phase 3 adds decisions loading to `refine-plan/SKILL.md` and `implement-plan/SKILL.md` context steps. These skills delegate to reviewer sub-agents via bootstrap prompts that assemble from `shared-preamble.md` + reviewer prompt files. Decisions loaded by the orchestrator are available in its context, but sub-agents spawned via the Agent tool don't automatically inherit that context — they only see what's passed in their bootstrap prompt. The plan says "decisions are essential context for plan review sub-agents" but doesn't specify how decisions reach the sub-agents. Two options: (1) the orchestrator includes loaded decisions in the sub-agent bootstrap prompt (higher token cost, but sub-agents see decisions directly), or (2) sub-agents are instructed to load decisions themselves (each sub-agent reads the files independently). The current reviewer preamble has a "Codebase Exploration Focus" section where sub-agents explore the repo — option (2) fits naturally here. Either way, the plan should be explicit about which path is intended so the implementing agent doesn't leave decisions stranded in the orchestrator's context.

Add a note to the refine-plan and implement-plan tasks in Phase 3 clarifying how decisions reach sub-agents — e.g., "Sub-agents load decisions themselves via codebase exploration (decisions/ is a project directory, not a skill reference)."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 0 consolidation creates a hard dependency on `~/.claude/skills/_shared/references/` existing — no graceful degradation

The plan moves 4 reference files to `_shared/references/` using absolute paths. If a user installs these skills on a new machine without the `_shared/` directory (e.g., partial skill sync, or a colleague cloning skill definitions), every skill will fail at its first Read instruction. The README.md in Phase 0 documents the convention, but skills don't have a fallback. This is minor because the current system has the same brittleness (skills reference `references/formats.md` which must exist), and the README mitigates it. But the consolidation increases the blast radius — one missing directory breaks all skills instead of one.

Consider adding a brief note to Phase 0's README.md task: document that if `_shared/references/` is missing, skills will fail with a clear Read error pointing to the missing path, and the fix is to re-create the directory.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All 5 round-2 issues are resolved cleanly: (1) complete-slice reconciliation now has specific replace-and-map instructions, (2) reference file context list verification is added to Phase 3, (3) calibration depth references the shared file instead of inlining, (4) decisions placement is specified as "after architecture/", (5) downstream quest dependency verification is in Phase 5. The architecture is sound — shared references in `_shared/` with absolute paths, decisions as a first-class `.project/` convention with clear reader/writer separation, expertise as a two-layer system (CLAUDE.md summary + auto memory detail). Module boundaries are clean: Phase 0 (infrastructure), Phases 1-2 (convention definitions), Phases 3-4 (skill integration), Phase 5 (documentation). Dependency direction flows correctly — skills depend on shared references, not the reverse. The two remaining MINOR items are about robustness and clarity, not structural problems.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
