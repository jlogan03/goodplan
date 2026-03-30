# Round 1 — Merged Feedback

## CRITICAL Issues

**C1. Plan lists 14 skill directories but confirmed goal specifies 15 (including `migrate`)**
*Flagged by: Holistic, Software Architecture, Repo/Tooling/Docs*

The confirmed goal explicitly names 15 directories including `migrate`. The plan copies only 14 and silently omits `migrate` because it doesn't exist at `~/.claude/skills/` yet. The goal explicitly says "the plan should account for this," but the plan does not. Additionally, `conventions.md` lists `skills/migrate/` in the repo structure, so ignoring it leaves conventions out of sync.

The plan must either:
1. Create a stub `migrate/` skill directory (with at minimum a `skill.md`) so the repo matches conventions and the confirmed goal, OR
2. Explicitly exclude `migrate/` from this slice and add a task to update `conventions.md` to remove it until it's created in a future slice.

Resolution: USER_INPUT

---

## IMPORTANT Issues

**I1. Install script lacks clean-install semantics — `cp -R` leaves stale files**
*Flagged by: Software Architecture, Repo/Tooling/Docs*

`cp -R` only overwrites matching files. If a skill file is deleted from the repo, it persists at `~/.claude/skills/` after reinstall. The plan should specify either `rm -rf` on each target skill dir before copying, or use `rsync --delete`. This matters especially for `_shared/references/` which has many files and is most likely to see removals.

Additionally missing:
- `mkdir -p` for first-time install when `~/.claude/skills/` doesn't exist
- `set -e` for error handling
- User feedback about what was copied
- Reporting which skill failed if a copy fails partway

Resolution: DIRECTLY_ACTIONABLE

**I2. `start-epic` exists at source but is missing from `conventions.md` repo structure**
*Flagged by: Software Architecture*

The plan copies `start-epic` (correctly), but `conventions.md` does not list it in the `skills/` directory tree. After this slice, the repo will contain `skills/start-epic/` but conventions won't mention it. Add a task to update `conventions.md`.

Resolution: DIRECTLY_ACTIONABLE

**I3. `.DS_Store` handling needs `.gitignore` safety net**
*Flagged by: Holistic, Software Architecture, Repo/Tooling/Docs*

The plan says "skip `.DS_Store` files" during copy, and `.gitignore` has a top-level `.DS_Store` entry. However, `cp -R` will copy `.DS_Store` files from `~/.claude/skills/` unless explicitly excluded. The plan should either use `rsync --exclude='.DS_Store'` instead of `cp -R`, or add a post-copy cleanup step. Adding `skills/**/.DS_Store` to `.gitignore` as a safety net is also prudent for future manual edits.

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

**M1. Phase 1 "before" check should use `test -d` not `ls`**
*Flagged by: Holistic*

`ls` on a non-existent directory returns exit code 2 (not 1) and outputs to stderr. Use `test -d skills/` for a clean boolean check.

Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 2 grep pattern may miss backtick-wrapped or line-wrapped command references**
*Flagged by: Holistic, Repo/Tooling/Docs*

`grep -roh 'goodplan [a-z:_-]*'` will miss references in backtick-wrapped inline code, uppercase variants, or line-wrapped commands. The pattern should account for optional surrounding backticks. Minor since the audit is informational, not blocking.

Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 2 audit report location is ephemeral**
*Flagged by: Software Architecture*

The command audit report is placed inside the slice directory, which gets archived with the epic. If intended as a living reference, it should go somewhere more persistent. If it's a one-time snapshot, state that explicitly.

Resolution: DIRECTLY_ACTIONABLE

**M4. Verification sections duplicate Expected Behavior**
*Flagged by: Holistic*

Both phases have "Expected Behavior" with concrete checks AND a separate "Verification" section restating them in prose. The Verification sections add no new information and could be removed or could add checks not covered by Expected Behavior.

Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 1 verification lacks specificity on install script test**
*Flagged by: Repo/Tooling/Docs*

"Compare a sample skill file" is ambiguous. Should specify a concrete check, e.g., `diff skills/start-epic/SKILL.md ~/.claude/skills/start-epic/SKILL.md` returning no differences.

Resolution: DIRECTLY_ACTIONABLE

**M6. No documentation update task for `bun run install:skills`**
*Flagged by: Holistic*

No task to update developer docs (setup guide, contributing guide) to mention `bun run install:skills` as a post-clone step. Fine to defer if no such docs exist yet, but should be noted.

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE

1. **I1** — Specify clean-install semantics for install script (rm-before-copy or rsync --delete, mkdir -p, set -e, user feedback)
2. **I2** — Add task to update `conventions.md` to include `start-epic` in skills list
3. **I3** — Use rsync with --exclude or add .gitignore safety net for .DS_Store
4. **M1** — Use `test -d` instead of `ls` for before-check
5. **M2** — Broaden grep pattern to handle backtick-wrapped references
6. **M3** — State whether audit report is ephemeral or persistent; move if persistent
7. **M4** — Remove or differentiate Verification sections from Expected Behavior
8. **M5** — Add concrete diff command for install script verification
9. **M6** — Note documentation update for `bun run install:skills` (defer if no docs exist)

## RESEARCH_NEEDED

None.

## Contradictions Resolved

**Severity of `migrate/` gap**: Holistic and Repo/Tooling/Docs rated this CRITICAL; Software Architecture rated it IMPORTANT. Resolved as CRITICAL because it represents a direct contradiction between the confirmed goal and the plan, and silently dropping a goal requirement is a critical omission regardless of the technical triviality of the fix.

## Unresolved (USER_INPUT required)

1. **C1** — The `migrate/` directory: should the plan (a) create a stub `migrate/` skill directory, or (b) explicitly exclude it and update conventions? User must decide which path.
