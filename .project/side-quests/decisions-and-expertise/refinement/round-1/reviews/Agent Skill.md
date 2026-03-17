# Agent Skill Review

## Issues

**[IMPORTANT] Phase 0: `_shared/references/` path uses absolute home directory — breaks project-level installs**
The plan puts shared references at `~/.claude/skills/_shared/references/`. All SKILL.md Read instructions will use this absolute path. This works for user-level installs but fails for project-level installs (`.claude/skills/`) where the `_shared/` directory would be at `.claude/skills/_shared/references/`, not under `~/.claude/`. The plan should specify how skills resolve the `_shared/` path — either always absolute (user-level only, which is the current install model) or document that project-level installs are not supported for shared references. Given that all existing skills use `references/` relative to the skill directory, this is a meaningful change in path resolution strategy that should be explicitly addressed.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 0: refine-plan and implement-plan SKILL.md files reference `references/dependency-research.md` and `references/team-defaults.md` as relative paths — plan doesn't address that these are referenced in multiple places within each SKILL.md**
The plan says "Update `refine-plan/SKILL.md` — change Read paths for dependency-research.md and team-defaults.md" but the grep shows these are referenced in at least 3 places in each SKILL.md (the Read instruction, the team defaults section, and the reference file listing). The plan should enumerate these occurrences or at least say "all occurrences" to avoid partial updates. The `references/` relative path pattern is deeply embedded — `codebase-context-discovery.md`, `shared-preamble.md`, and `sub-agent-prompts.md` also exist as duplicates across refine-plan and implement-plan but are NOT called out for consolidation. The plan's consolidation criterion ("will these stay unified long-term?") should be explicitly applied to those files too, even if just to document why they're excluded.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3: Missing `refine-plan` and `implement-plan` from readers list**
The plan lists 7 reader skills: start-project, explore, define-architecture, define-slices, create-plan, complete-slice, project-status. But `refine-plan` and `implement-plan` also load context and could benefit from knowing about active decisions — especially `refine-plan`, whose reviewers evaluate plans against architecture. If a decision constrains implementation choices (e.g., "Use PostgreSQL"), reviewers should know. The overview says "Who reads: All interactive skills" but then only lists 7. Either add refine-plan/implement-plan as readers or document why they're excluded.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3: Decision writing guidance for `complete-slice` is vague — "add decision writing guidance to the architecture update step"**
`complete-slice` already has a decision file writing mechanism in its `references/guidance.md` (line 35: "Approved: edit arch file, write decision file"). The plan needs to reconcile with this existing behavior rather than just "add decision writing guidance." Is the plan updating the existing mechanism to use the new format, or adding a second one? This should explicitly say: "Update the existing decision file writing in `complete-slice/references/guidance.md` to use the format from `decisions-format.md`."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 4: Expertise check runs on EVERY interactive skill invocation — context cost concern**
Every interactive skill will now Read `expertise-tracking.md` AND check `~/.claude/CLAUDE.md` on every run. The plan says "Read `~/.claude/skills/_shared/references/expertise-tracking.md`" as Step 1 of the expertise check. But the agent already loads CLAUDE.md implicitly (it's in the system prompt). Reading expertise-tracking.md just to decide "did I learn something new about the user?" adds context for a step that will often result in "no, skip silently." Consider: the expertise check step should reference the format from memory rather than re-reading the file every time, or the skill should only Read the reference file when it detects new expertise to record.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1: Decision status `revisiting` has no defined entry/exit mechanism**
The format defines `revisiting` as a status but doesn't specify who sets it or how it gets resolved. Can any skill set a decision to `revisiting`? Does the user have to do it manually? What happens after revisiting — does it go back to `active` or get `superseded`? The downstream architecture-quality quest relies on decisions being reliable context; ambiguous status lifecycle undermines that.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2: Auto memory file naming uses underscores (`expertise_react.md`) while the plan uses kebab-case for everything else**
The convention says `expertise_<domain>.md` with underscore prefix but then shows `expertise_event_driven.md` mixing underscores for the domain too. Should be `expertise_event-driven.md` or consistently use underscores. Minor but will cause inconsistency when skills write these files.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5: No mention of `_shared/references/` in workflow.md update**
The plan says to add decisions/ and expertise to workflow.md but only mentions `_shared/references/` as a "maybe" ("Add `_shared/references/` to any relevant 'where things live' section, if workflow.md has one"). The workflow.md DOES have a File Structure section (confirmed by reading it). This should be a definite task, not conditional.
Resolution: DIRECTLY_ACTIONABLE

## Downstream Quest Readiness Assessment

**Architecture-quality quest**: Adequately teed up. The quest depends on decisions/ convention and expertise tracking — both are defined here. The quest references `.project/decisions/` loading in define-architecture, which Phase 3 implements. Expertise calibration for explanation depth is covered by Phase 4. One gap: the architecture-quality quest's refine-architecture skill will need decisions as reviewer context, but since refine-plan/implement-plan aren't listed as decision readers (see issue above), the pattern for "reviewer infrastructure loads decisions" isn't established here.

**Slice-quality-and-health quest**: Adequately teed up. The quest depends on decisions/ convention and expertise tracking. It adds system-profile.md (not in scope here, correct). The complete-slice upgrade in that quest builds on the complete-slice changes in Phase 3-4 here. One note: the slice quest's refine-slices skill will also need decisions as context, reinforcing the need to establish that pattern now.

## Score: 7/10

The plan is well-structured with clear phasing and good verification steps. The consolidation approach (Phase 0) is sound and the two new conventions (Phases 1-2) are well-specified. However, there are several important gaps: the reader list is incomplete (missing refine-plan/implement-plan), the complete-slice integration doesn't account for existing decision-writing behavior, the shared path resolution strategy needs explicit documentation, and the per-invocation context cost of expertise checking should be addressed. Fixing these would bring it to 9+.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
