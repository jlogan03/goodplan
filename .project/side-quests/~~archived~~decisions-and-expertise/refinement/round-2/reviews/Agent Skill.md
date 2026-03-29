# Agent Skill Review — Round 2

## Issues

**[MINOR] Phase 3: create-plan `references/guidance.md` context loading task is isolated from the main SKILL.md update**
Phase 3 has a separate task "Update `create-plan/references/guidance.md` — add `.project/decisions/` to the Context Loading list" in addition to "Update `create-plan/SKILL.md` — add decisions/ loading to context step." The current `create-plan/references/guidance.md` Context Loading section (line 13) lists the files to read. The SKILL.md itself does not duplicate this list — it delegates to the guidance file. So the main SKILL.md task should clarify that the context loading change for create-plan is primarily in the guidance file, with the SKILL.md update being the decisions-format.md Read instruction only. As written, an implementer might add decisions loading in both places or miss that the guidance file is the canonical context loading list for create-plan. This is minor because the verification step would catch it, but clarity upfront saves a round-trip.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: calibration depth note added to 6 skills as inline text — could reference expertise-tracking.md instead**
Phase 4 adds a calibration depth note to each of the 6 interactive skills' SKILL.md files. The `expertise-tracking.md` reference file already contains "Calibration depth" guidance. Adding a separate inline note to each SKILL.md creates a second source of truth for the same concept. If the calibration guidance evolves (which is likely — the architecture-quality quest adds design-tree interrogation that calibrates to expertise), all 6 SKILL.md files need updating. Consider having the calibration note say "Follow calibration depth guidance in `expertise-tracking.md`" rather than repeating the substance. However, the plan already made the expertise check conditional (only read reference file when new expertise detected), so the calibration note is the only place some skills would see this guidance — the inline approach is defensible. This is a maintenance trade-off, not a correctness issue.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 0: No README content specified for `_shared/references/`**
The plan says "The `_shared/references/` directory itself should include a brief README noting this convention" but doesn't specify what the README should contain or provide a template. An implementer would need to guess at the content. Should specify: purpose of the directory, path convention (absolute `~/.claude/skills/_shared/references/`), that project-level installs are not supported, and how to add new shared references (consolidation criterion).
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All IMPORTANT issues from round 1 have been resolved well. The plan now correctly includes refine-plan and implement-plan as decision readers, abstracts the loading protocol into decisions-format.md, adds codebase-context-discovery.md to the consolidation, documents the path resolution strategy, reconciles complete-slice's existing decision writing, makes the expertise check conditional, and adds expertise to project-status. The extension policies future-proof the convention files for downstream quests. The remaining issues are all minor — maintenance and clarity improvements that won't block implementation or downstream quests. To reach 10: resolve the create-plan guidance/SKILL.md overlap and specify the README content.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
