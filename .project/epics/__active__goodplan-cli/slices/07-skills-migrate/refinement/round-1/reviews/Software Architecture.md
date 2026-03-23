# Software Architecture Review

## Issues

**[IMPORTANT]** Plan lists 14 skill directories but confirmed goal specifies 15 (including `migrate`)

The confirmed goal explicitly names 15 skill directories to copy, including `migrate`. The plan only lists 14 and omits `migrate` because it doesn't exist at `~/.claude/skills/` yet. However, the goal says "Note: `migrate` doesn't exist at `~/.claude/skills/` yet — the plan should account for this." The plan does not account for it. It should either:
1. Add a task to create a stub `migrate/` skill directory (with at minimum a `skill.md`) in `skills/` so `conventions.md` stays accurate, or
2. Add a task to update `conventions.md` to remove `migrate/` until it exists, with a note that it will be created in a future slice.

Either way, the plan must explicitly address this gap rather than silently ignoring it. The expected-behavior check `ls skills/ | wc -l` returning 14 contradicts `conventions.md` which lists `migrate/`.

Resolution: USER_INPUT

**[IMPORTANT]** `start-epic` skill exists at `~/.claude/skills/` but is missing from `conventions.md` repo structure

The plan copies `start-epic` (correctly — it exists at the source), but `conventions.md` does not list `start-epic` in the `skills/` directory tree. After this slice, the repo will contain `skills/start-epic/` but the conventions doc won't mention it. The plan should include a task to update `conventions.md` to add `start-epic` to the skills list. This is the same class of issue as the `migrate` gap but in the opposite direction.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Install script lacks idempotency and error handling specification

The plan says `cp -R` to copy each skill directory, overwriting existing. However, it doesn't specify:
1. What happens if `~/.claude/skills/` doesn't exist (first-time install) — the script should `mkdir -p` the target.
2. Whether existing files in a destination skill dir that are NOT in the source should be removed. `cp -R` only overwrites matching files — if a skill previously had `extra.md` and the source no longer has it, it will linger. The script should use `rm -rf` on each target skill dir before copying, or use `rsync --delete`.
3. Error handling — if a copy fails partway through, the destination is in a partial state. At minimum the script should `set -e` and report which skill failed.

These are not architectural concerns per se, but the install script is a deployment boundary between the repo (source of truth) and the runtime location. A leaky deployment mechanism undermines the "skills versioned in repo" invariant.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 audit report location is ephemeral

The command audit report is written to `.project/epics/__active__goodplan-cli/slices/07-skills-migrate/command-audit.md` — inside the slice directory. When the epic is archived, this report goes with it. If the audit is meant to be a living reference for future skill consolidation work, it should be placed somewhere more persistent (e.g., `docs/` or `.project/`). If it's intentionally a one-time snapshot, that's fine, but the plan should state that explicitly.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No `.gitignore` consideration for skill artifacts

Skills contain markdown files that will be committed to the repo. This is fine. However, the plan doesn't mention ensuring `.DS_Store` files (common on macOS, present at `~/.claude/skills/.DS_Store`) are excluded. The plan does say "skip `.DS_Store` files" in the copy task, but doesn't mention adding `skills/**/.DS_Store` to `.gitignore` as a safety net for future manual edits in `skills/`. Worth adding as a minor hardening task.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is structurally sound for a copy-and-script task — it correctly identifies the two phases, the source/destination boundaries, and the audit cross-reference approach. However, it has a gap between the confirmed goal (15 dirs including `migrate`) and the plan (14 dirs), a missing `conventions.md` update for `start-epic`, and underspecified install script behavior at the deployment boundary. Addressing the two IMPORTANT issues around directory list accuracy and the install script robustness would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
