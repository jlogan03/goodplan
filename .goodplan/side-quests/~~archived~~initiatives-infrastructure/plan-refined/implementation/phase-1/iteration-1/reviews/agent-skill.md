# Phase 1 Review: Initiative Conventions

**Reviewer**: Agent Skill
**Phase**: Initiative Conventions — Create initiative-conventions.md, update state-and-flow-formats.md

## Issues

**[IMPORTANT]** No skills currently reference initiative-conventions.md
The consumer guide (lines 229-243) documents which skills create/read/update initiative artifacts, but a codebase search for `initiative-conventions` across all skill files found zero references. No SKILL.md file loads this reference document. Meanwhile, `state-and-flow-formats.md` is referenced by 9 skills and `status-logic.md` by 1 skill. The convention file exists but has no consumers yet — skills that should read it (e.g., `/project-status`, `/define-architecture`, `/define-slices`, `/create-plan`, `/complete`) don't reference it.

This is likely intentional: Phase 4 (project-status), Phase 5 (explore/define-architecture), Phase 6 (define-slices), etc. will wire up the references. But the convention file should be designed to be easy to consume — and it is. The consumer guide table at the bottom provides a clear map for future phases. This is not a defect, but worth flagging: the document is inert until later phases connect it.

File: ~/.claude/skills/_shared/references/initiative-conventions.md:229
Resolution: DIRECTLY_ACTIONABLE

Recommended action: No code change needed now. Confirm this is tracked — each future phase that touches an initiative-aware skill must add a Read instruction for `~/.claude/skills/_shared/references/initiative-conventions.md`. The plan phases 2-8 should each verify they wire up the reference.

**[IMPORTANT]** State machine in initiative-conventions.md partially duplicates status-logic.md without cross-reference
`status-logic.md` (the project-status skill's reference) contains the per-slice/quest state machine. `initiative-conventions.md` now adds the per-initiative state machine. These are different state machines for different scopes (initiative vs slice), which is correct. However, the two files share structural conventions (first-match-wins, numbered rows, `abandoned.md` precedence) without referencing each other. When Phase 4 updates `/project-status`, both files will need to be loaded. There's a risk of the two state machines drifting in convention if someone updates one but not the other.

The initiative-conventions.md file does reference `status-logic.md` in its note on line 95 ("same pattern as per-slice state machine in `status-logic.md`"), which is good. But `status-logic.md` has no awareness of initiatives at all — it only covers per-slice/quest and project-level states. Phase 4 will need to reconcile these.

File: ~/.claude/skills/project-status/references/status-logic.md
Resolution: DIRECTLY_ACTIONABLE

Recommended action: This is a Phase 4 concern. No change needed now, but flag for Phase 4: `status-logic.md` needs either a reference to `initiative-conventions.md` for initiative-level state resolution, or the initiative state machine needs to be incorporated into `status-logic.md` directly.

**[MINOR]** Consumer guide could include `/project-status` as a reader
The consumer guide table lists skills that create/read/update each artifact. `/project-status` will need to read initiative state to report status (determining which initiative is active, what state it's in). It's not listed as a reader of `goal.md`, `vertical-slices/`, or most artifacts. This is likely because `/project-status` reads indirectly via the state machine rather than directly consuming artifacts — but since Phase 4 explicitly updates `/project-status` for initiative awareness, listing it as a reader would make the consumer map complete.

File: ~/.claude/skills/_shared/references/initiative-conventions.md:229
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Table of contents missing for a 243-line reference file
The progressive disclosure guideline says large reference files (>100 lines) should have a table of contents. At 243 lines, `initiative-conventions.md` qualifies. The file has clear `---` separators and descriptive section headers, which helps, but a TOC at the top would let skills jump to the specific section they need without loading the entire mental model. Compare with `maturity-conventions.md` which has an explicit TOC.

File: ~/.claude/skills/_shared/references/initiative-conventions.md:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** state-and-flow-formats.md scope addition is terse
The added line on line 44 (`For initiative-scoped slices, use initiatives/<name>/vertical-slices/<name> as the scope value.`) covers initiative-scoped slices but doesn't address initiative-level scope values themselves. When `/project-status` or other skills log initiative-level events (e.g., "initiative approved", "initiative completed"), what scope value should they use? Presumably `initiatives/<name>`, but this isn't documented. Phase 4+ will need this.

File: ~/.claude/skills/_shared/references/state-and-flow-formats.md:44
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The convention file is well-structured, comprehensive, and follows the shared reference patterns established by `maturity-conventions.md`. The content is accurate against `workflow.md`. The state machine design is clean with clear first-match-wins semantics. The two-layer architecture model table and consumer guide are excellent additions that will make future phase implementation straightforward.

What would bring it to 9+: (1) Add a table of contents for this 243-line file, matching the pattern set by `maturity-conventions.md`. (2) Add `/project-status` to the consumer guide. (3) Add initiative-level scope values to `state-and-flow-formats.md` (not just initiative-scoped slices).

## Summary
- Critical: 0
- Important: 2
- Minor: 3
