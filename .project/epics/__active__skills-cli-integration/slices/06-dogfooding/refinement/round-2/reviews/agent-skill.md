## Issues

**[CRITICAL]** Phase 1 and Phase 4 call `epic:activate` at the wrong point in the epic lifecycle

Phase 1 expected behavior says `goodplan status --json` should return `activeEpic` present after `create-epic`. Phase 1 verification #1 repeats this: "`activeEpic` present and correct epic name." Phase 4 calls `goodplan epic:activate --epic llm-judge --json` immediately after `/create-architecture`, before slicing.

The state machine only allows `ACTIVATE_EPIC` from `slices-refined` status (line 34 of transition-tables.md, confirmed in `src/core/state/transitions/epic-lifecycle.ts:28` which guards on `"slices-refined"`). `CREATE_EPIC` sets status to `"created"` and does NOT set `activeEpic` (confirmed in `src/core/state/transitions/epic-create.ts`). The full lifecycle is: `created -> exploring -> explored -> defining-architecture -> architecture-defined -> ... -> slices-refined -> activated`.

In Phase 1: after `/create-epic`, `activeEpic` will be `null`. The expected behavior and verification checks will fail.

In Phase 4: calling `epic:activate` after architecture but before slicing will get exit code 3 (`STATE_INVALID_TRANSITION`) because the epic is in `architecture-defined` or `architecture-refined`, not `slices-refined`.

Fix for Phase 1: Change expected behavior to `activeEpic === null` (epic is created but not yet activated). Remove the "active epic" claim from verification. Activation happens later in Phase 2 after slicing is complete.

Fix for Phase 4: Move `epic:activate` to AFTER `/create-slices` and `/refine-slices` complete (i.e., into the "Slicing, Planning, Implementation" section, before the first slice cycle begins). The correct sequence is: create-epic -> explore -> create-architecture -> refine-architecture -> create-slices -> refine-slices -> epic:activate -> (slice cycles) -> complete.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 conflates `start-epic` approval workflow with `epic:activate` state transition

Phase 4 "Exploration & Architecture Proposal" section bundles three distinct operations into one confusing sequence:
1. Architecture proposal review/approval (skill-layer, `/start-epic` does this)
2. `epic:activate` CLI state transition (requires `slices-refined`)
3. Architecture directory setup (skill-layer)

The CLI's `epic:activate` has no concept of "architecture proposals" or "approval gates" — the CLI sees the same lifecycle for first and subsequent epics. The "architecture-proposal" directory is purely a skill-layer convention (confirmed: `grep -r "architecture-proposal" src/` returns zero matches).

The current task says "Activate epic via CLI" right after architecture creation, which is both wrong in sequencing (see critical above) and misleading about what `epic:activate` does. The approval/review workflow from `/start-epic` is entirely separate from the CLI transition.

Fix: Restructure Phase 4 "Exploration & Architecture Proposal" to clearly separate:
- Skill-layer work: `/create-architecture` creates proposal, manual or `/start-epic` review approves it, skill copies proposal to `architecture/`
- CLI transitions: The CLI tracks status through `defining-architecture -> architecture-defined -> ... -> slices-refined` via normal skill invocations, with `epic:activate` only at the end after slices are refined
- Explicitly note that `architecture-proposal` is invisible to the CLI — the CLI just sees `COMPLETE_ARCHITECTURE` transitions regardless of proposal workflow

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Skills reference `~/.claude/skills/_shared/references/` via absolute paths — in-project install does not change this

Phase 1 correctly installs skills both user-level (`bun run install:skills`) and in-project (`cp -r ...`). However, the plan does not clearly explain the implication: even when skills are loaded from `.claude/skills/` in the dogfood project, they will `Read` references from `~/.claude/skills/_shared/references/` (the user-level path), because all 21 reference path occurrences in skills are hardcoded absolute paths.

This means:
- The in-project `_shared/` copy is never actually read by skills
- The user-level install (`bun run install:skills`) is the critical step — it must happen BEFORE any skill invocation, and the content must be current
- If the user has old-format skills at `~/.claude/skills/`, `bun run install:skills` will overwrite them (which is intended per the plan), but this is a one-way operation

The plan's task "Verify skill reference paths" hints at this but does not explain the mechanics. This is a significant friction discovery vector that should be logged proactively, not just "logged if issues arise."

Fix: Add a note to the "Verify skill reference paths" task explaining that in-project skills still read `~/.claude/skills/_shared/references/` and that the user-level install is what matters for reference freshness. Add an explicit verification: after both installs, run a skill and confirm it successfully loads `~/.claude/skills/_shared/references/cli-interaction.md`. Log this as a known architectural friction point (skills cannot use project-relative reference paths).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 does not specify when `epic:activate` happens in the first epic lifecycle

Phase 2 runs the full lifecycle: explore -> architecture -> slices -> plan -> implement -> complete. But it never explicitly calls `epic:activate` between slicing and implementation. Looking at the transition table, the epic must be activated (status `slices-refined -> activated`) before slice implementation can proceed (since slice operations like `BEGIN_PLANNING` may check for an active epic context).

Fix: Add an explicit task in Phase 2 between "Slicing" and "Planning & Implementation" sections: "Run `goodplan epic:activate --epic core-provider --json` after slices are refined. Verify: `goodplan status --json` shows `activeEpic.name === 'core-provider'`."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 quest lifecycle does not specify quest state transitions via CLI

Phase 3 tasks say "Run `/create-plan` -> `/refine-plan` -> `/implement-plan` -> `/complete`" for quests, but quest state transitions use different CLI commands than slice transitions. The quest lifecycle uses `quest:plan`, `quest:refine-plan`, `quest:implement`, `quest:complete` (confirmed in `src/commands/global/schema.ts:242-274`). The skills internally invoke these commands, but the verification should check quest-specific status transitions (e.g., `quest:show --quest <name> --json` showing status progression through `created -> plan-created -> plan-refined -> implementation-complete -> completed`).

Fix: Add status verification between quest skill invocations using `goodplan quest:show --quest <name> --json` to confirm status transitions.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `cp -r` copies `migrate/` skill which is a stub — may confuse during dogfooding

The `migrate/` skill directory contains only a SKILL.md stub (no references). Copying it to the dogfood project is harmless but may cause confusion if it triggers during dogfooding. The plan does not mention this.

Fix: Add a note that `migrate/` is a stub skill and should be ignored if it triggers. Alternatively, exclude it from the in-project copy.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 1's critical issues (wrong quest paths, `__active__` prefix, `start-epic` vs `epic:activate`) are fixed. However, a new critical issue emerged: `epic:activate` is called at the wrong lifecycle stage in both Phase 1 (expected behavior claims `activeEpic` present after create) and Phase 4 (called before slicing). This stems from misunderstanding the state machine's activation precondition (`slices-refined` required). The important issues are about clarity rather than correctness — the plan knows the right pieces but sequences them wrong. Fixing the critical sequencing issue and the Phase 4 restructuring would bring this to 9+.

## Summary
- Critical: 1
- Important: 2
- Minor: 3
