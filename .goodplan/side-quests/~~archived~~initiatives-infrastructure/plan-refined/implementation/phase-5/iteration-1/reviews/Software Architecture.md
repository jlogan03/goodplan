# Software Architecture Review — Phase 5 (Explore + Define Architecture + Refine Architecture + Audit Architecture)

## Issues

**[IMPORTANT]** audit-architecture missing scaffold detection on top-level fallback
`/refine-architecture` correctly detects the `<!-- scaffold -->` marker when falling back to `.project/architecture/` (Step 0b) and stops with a warning. `/audit-architecture` has no equivalent check. When no active initiative exists but a scaffold `_overview.md` is present (e.g., after a first initiative was archived), `/audit-architecture` would glob `.project/architecture/**/*.md`, find the scaffold file, and attempt a full gap analysis against a file that is not real architecture. This would produce misleading findings.
File: ~/.claude/skills/audit-architecture/SKILL.md:36
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** explore-complete.md template scope options do not include initiative
The `explore-complete.md` template in `explore-logic.md` lists scope options as `<project-level | vertical-slices/<name> | side-quests/<name>>` but omits `initiatives/<name>`. When `/explore` writes the completion marker at initiative scope, the template provides no example format for that scope value. The executing agent must infer it from the scope value mapping section at the bottom of SKILL.md, but the template itself is inconsistent.
File: ~/.claude/skills/explore/references/explore-logic.md:22
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** define-architecture uses inline scope description while refine/audit use $FLOW_SCOPE variable
`/refine-architecture` and `/audit-architecture` both define a `$FLOW_SCOPE` variable in their path resolution step and reference it in the flow-log append command. `/define-architecture` instead uses an inline prose description: "Replace `<scope>` with the appropriate scope value (`"initiatives/<name>"` when operating on an initiative, `"project"` otherwise)." While functionally equivalent, the inconsistent pattern means a future editor might miss updating one skill if the scope value format changes. The variable approach in refine/audit is clearer.
File: ~/.claude/skills/define-architecture/SKILL.md:305
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** refine-architecture and audit-architecture do not handle architecture-proposal/ for subsequent initiatives
`/define-architecture` has explicit handling for subsequent initiatives (writing to `architecture-proposal/`), and the consumer guide in `initiative-conventions.md` shows `/refine-architecture` can read and update `architecture-proposal/`. However, both `/refine-architecture` and `/audit-architecture` only resolve `$ARCH_DIR` to `architecture/` when an active initiative is found — there is no path for operating on `architecture-proposal/` when a subsequent initiative exists but is not yet active. This is likely intentional for Phase 5 scope (the plan only requires active initiative support), but creates an inconsistency with the consumer guide. If a user runs `/refine-architecture` on a non-active initiative with a proposal, the skill would not find the proposal directory.
File: ~/.claude/skills/refine-architecture/SKILL.md:72
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** define-architecture Step 0 does not define $FLOW_SCOPE but Step 10 needs it
Step 0 stores the resolved `$ARCH_DIR` path but does not extract a `$FLOW_SCOPE` variable. Step 10 then requires the executing agent to derive the scope value from context. This is a missed opportunity to use the same pattern as refine/audit where both variables are resolved together at the top.
File: ~/.claude/skills/define-architecture/SKILL.md:51
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The four skills are well-aligned on the core initiative path resolution pattern: detect active initiative via `ls -d .project/initiatives/__active__*/`, resolve to initiative architecture directory, fall back to `.project/architecture/`. The explore skill correctly rejects initiative slice paths and redirects to initiative scope. The scope path mapping table in explore-logic.md is comprehensive. The scaffold creation in define-architecture and detection in refine-architecture are correctly paired. To reach 9+: add scaffold detection to audit-architecture (the missing IMPORTANT item) and fix the template gap in explore-logic.md.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
