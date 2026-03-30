## Issues

**[CRITICAL]** Missing `architecture/` directory creation from proposal upon approval

The `initiative-conventions.md` Consumer Guide (line 260) explicitly states: `architecture/ (subsequent init) | /start-initiative (from proposal upon approval)`. The directory structure comment on line 90 reinforces this: `architecture/ # target architecture (created by /start-initiative from proposal upon approval)`. The Two-Layer Architecture Model also describes initiative `architecture/` as the "target state" that downstream skills (`/define-slices`, `/create-plan`, `/refine-plan`, `/implement-plan`) read from.

However, the SKILL.md has no step that transforms `architecture-proposal/` into `architecture/`. After approval, the initiative will have `approved.md` and the `__active__` prefix, but no `architecture/` directory. This means `/define-slices` and all subsequent skills will find no target architecture to work against, breaking the two-layer architecture model.

Between Step 5b (write `approved.md`) and Step 6 (rename to `__active__`), the skill needs a step that creates the initiative's `architecture/` directory from the proposal files. The exact transformation depends on the proposal file naming convention (`_overview.md` stays, `<subsystem>-changes.md` maps to `<subsystem>-api.md`, `new-<subsystem>.md` maps to `<subsystem>-api.md`), but at minimum the proposal content must be copied/transformed into the `architecture/` structure that downstream consumers expect.

File: ~/.claude/skills/start-initiative/SKILL.md:193
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** State validation misses `needs-initiative-completion` state

The state machine in `initiative-conventions.md` defines a shared state (row 3): "vertical-slices/sequencing.md exists AND all slices complete, no completion/" = "Needs initiative completion". The SKILL.md's Step 3 lists invalid states but omits this one. An initiative in `needs-initiative-completion` state should not be startable (it is already past activation), but the skill does not check for it. Since shared states are checked before subsequent-initiative states (first-match-wins), this could lead to confusing behavior if a user somehow tries to start an initiative that has already completed all its slices.

File: ~/.claude/skills/start-initiative/SKILL.md:103
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Step 4 active-initiative check runs after state validation but before proposal presentation — ordering creates unnecessary work

Step 3 validates initiative state (potentially reading many files), and Step 5 presents the full architecture proposal. But Step 4 checks for an existing active initiative and hard-stops if one is found. This means the skill does significant work loading and validating the initiative, only to discover activation is blocked. Step 4's check should run earlier — ideally right after resolving the initiative in Step 1 — to fail fast.

File: ~/.claude/skills/start-initiative/SKILL.md:114
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `approved.md` template in Step 5b references "Architecture Proposal Files" but Step 4b skip path produces inconsistent content

When the user skips the architecture proposal (Step 4b), the skill writes `architecture-proposal-skipped.md` and proceeds to Step 5b. The `approved.md` template includes a section "## Architecture Proposal Files" with the instruction to write "N/A -- architecture proposal skipped" if skipped. This works, but the `approved.md` also says "## Rationale" should "draw from the user's confirmation and the proposal content" — there is no proposal content in the skip path. The template guidance should note that in the skip case, rationale draws only from the user's confirmation and the initiative goal.

File: ~/.claude/skills/start-initiative/SKILL.md:196
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No graceful stop / re-entry handling

Other skills in this codebase (e.g., `/define-architecture` Step 8e, `/complete-slice` Step 2) handle partial completion and re-entry. The `/start-initiative` skill has no re-entry detection. If the skill fails mid-execution (e.g., after writing `approved.md` but before renaming), there is no way to resume. The skill should detect partial state: if `approved.md` exists but no `__active__` prefix, offer to resume from the activation step.

File: ~/.claude/skills/start-initiative/SKILL.md:1
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The skill is well-structured for its core workflow (resolve initiative, validate state, present proposal, get approval, activate). However, it has a critical gap: it does not create the `architecture/` directory from the proposal, which is its documented responsibility in `initiative-conventions.md`. This breaks the two-layer architecture model that all downstream skills depend on. Fixing this single issue would bring the score to 7. Addressing the state validation gap and reordering the active-initiative check for fail-fast behavior would bring it to 9+.

## Summary
- Critical: 1
- Important: 2
- Minor: 2
