# Merged Review — Phase 1: create-epic Migration

**Composite Score: 8/10**
Generalist: 9/10 | Agent-Skill Specialist: 7/10

---

## Overall Assessment

The migration is clean and well-executed. SKILL.md reduced from 280 to 190 lines (under 200 target). All targeted elimination patterns are confirmed absent (state.md, activity-log.jsonl, mkdir .project, epic-conventions, state-and-activity-formats). All required CLI commands are present and correctly formed with `--json` flags. Tests pass (941/0). Interactive dialogue quality and expertise calibration are preserved.

The specialist identified two functional gaps that need resolution before Phase 2.

---

## Issues

### Important (2)

**[IMPORTANT-1] Missing error handling guidance for CLI commands**
The skill invokes 5 CLI commands (`--version`, `status`, `init`, `epic:create`, `epic:show`) but only the version check has explicit error handling. The convention doc (`cli-interaction-conventions.md` lines 258-294) defines recovery patterns for exit codes 1/2/3, including idempotent re-entry. Without a reference to these patterns, an agent encountering a `STATE_INVALID_TRANSITION` on `epic:create` (e.g., duplicate name) or a validation error on `init` will not know how to recover. The already-migrated `project-status` skill references `cli-interaction.md` for this.

Resolution: Add a brief error handling section or a reference to `~/.claude/skills/_shared/references/cli-interaction.md` after the version check section. Minimum viable fix: "For all CLI commands below, follow error handling patterns in `~/.claude/skills/_shared/references/cli-interaction.md`."

**[IMPORTANT-2] `.activeEpic` checked but not acted upon in Mode B**
Step 2 instructs the agent to check `.activeEpic` in the `status` response for Mode B detection, but the skill never uses this value. The old skill (Step 13) informed the user when an active epic exists. The CLI's `epic:create` guard will reject a duplicate-name attempt, but it won't proactively warn the user that a different epic is already active before they begin the dialogue. This is a UX regression.

Resolution: After detecting Mode B and a non-null `.activeEpic`, add an informational note to the user about the currently active epic before proceeding to Step 10.

*Note: The generalist reviewer flagged this as a minor observation; the specialist flagged it as Important. Trusting the specialist on domain conventions — treating as Important.*

### Needs User Input (1)

**[USER-INPUT] Hardcoded goal.md path vs. `paths` from CLI response**
Steps 6-7 derive the goal.md path via hardcoded convention (`.project/epics/<entity>/goal.md`) rather than using the `paths` field from the `epic:create` mutation response. The convention doc (line 131) explicitly states mutation responses include `paths` and agents should write content into those paths. The plan consciously chose the hardcoded approach, but this contradicts the convention doc and couples the skill to directory structure the CLI is meant to abstract.

Resolution: Requires user decision — should this skill use `paths` from the `epic:create` response (consistent with convention doc), or is the hardcoded path approach acceptable here?

### USER_INPUT Resolved

**Hardcoded goal.md path**: Confirmed correct. `resolveForBeginPhase` in `src/core/rpc/paths.ts` line 120 shows `case "create":` returns `{}` (empty paths). The `epic:create` CLI response intentionally provides no `paths` for goal.md — the `create` phase is a lifecycle phase with no specific artifact paths. The hardcoded convention `.project/epics/<entity>/goal.md` is the correct approach. No change needed.

### Minor (2)

**[MINOR-1] Step numbering discontinuity between modes**
Mode A uses Steps 1-9, Mode B uses Steps 10-14. Since this is a full rewrite, renumbering Mode B as Steps 3-7 (to match Mode A's shared-steps offset) or using independent B1-B5 numbering would improve agent clarity.

**[MINOR-2] Stdin piping consistency for `init` command**
The convention doc broadly states "always pipe empty stdin," but `init` takes all input via flags (`--name`). Whether `goodplan init` actually reads stdin needs verification (check `src/commands/init.ts`). If it doesn't, the blanket warning in the convention doc is overstated for flag-only commands; if it does, the skill needs `stdin: ""` piping. Read-only commands (`status`, `epic:show`) clearly need no stdin.

---

## Points of Agreement

Both reviewers agree on:
- Zero occurrences of all eliminated patterns (confirmed by grep).
- CLI commands correctly formed with `--json` flags and proper stdin payload for `epic:create`.
- Line count 190, under 200 target.
- Templates reference file correctly left untouched.
- Tests: 941 pass, 0 fail.
- Plan task checkboxes correctly updated.
- Ready to unblock Phase 2 once Important issues are resolved.

---

## Recommended Next Steps

1. Resolve USER-INPUT: decide on `paths` vs. hardcoded convention.
2. Fix IMPORTANT-1: add `cli-interaction.md` error handling reference.
3. Fix IMPORTANT-2: surface `.activeEpic` warning in Mode B.
4. Address minors at discretion (step renumbering is low effort; stdin check requires codebase lookup).
