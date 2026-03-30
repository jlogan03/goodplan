# Merged Feedback — Rename to gp (Round 4)

## CRITICAL Issues

None.

## IMPORTANT Issues

### IMP-1: `schema.ts` blanket-update task contradicts `migrate.ts` "mention both" instruction [TUI-and-CLI]

The Phase 1 task for `schema.ts` says "update `.project/` references in command descriptions to `.goodplan/`" — a blanket replace. But the `migrate.ts` task correctly says to update the `migrate` registry entry at `schema.ts` ~line 127 to mention **both** `.project/` and `.goodplan/`. These two tasks contradict each other for that specific line: the blanket `schema.ts` task would overwrite the `migrate` entry to only mention `.goodplan/`, losing the legacy `.project/` reference.

**Fix:** Add an explicit carve-out to the `schema.ts` task: "except the `migrate` command entry at ~line 127, which should mention both `.project/` and `.goodplan/` per the `migrate.ts` task."

Resolution: DIRECTLY_ACTIONABLE

---

### IMP-2: `withFixture` / `withTempDir` atomicity constraint confirmed sound — clarify `resolveProjectDir` trust model [Software-Architecture]

The plan requires `GOODPLAN_DIR` updates in `helpers.ts` to be in the same commit as fixture directory renames. This is correct. For completeness, the plan should note that `resolveProjectDir()` does NOT validate that the directory name matches `PROJECT_DIR_NAME` — it trusts whatever path `GOODPLAN_DIR` provides (env var is an explicit override). A stale `GOODPLAN_DIR` pointing to `.project` when fixtures have been renamed to `.goodplan` would produce `DATA_NO_PROJECT` rather than an obvious mismatch error. The atomicity constraint is the correct mitigation; this note makes the reasoning visible to implementers.

Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

### MIN-1: `project.test.ts` should be explicitly listed in the per-file test task [Software-Architecture]

`tests/unit/data/project.test.ts` has at least 8 references to `.project` including an error message assertion `"No .project/ directory found"`. This file directly tests the walk-up logic being modified and is more architecturally significant than generic integration test path assertions. It is covered by the catch-all task but should be called out explicitly alongside `state.test.ts` and `runner-modes.test.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-2: `workflow-init.test.ts` should be explicitly listed in the per-file test task [TypeScript]

`workflow-init.test.ts` has 5 hardcoded `.project` assertions at lines 24-29, 59, and 65, with a notable `GOODPLAN_DIR` interaction: `withTempDir` sets `GOODPLAN_DIR` to `.project`, but `init.ts` checks `cwd` directly. After the rename, subsequent commands in these tests going through `resolveProjectDir` would use `GOODPLAN_DIR` and look at `.project/`, which won't exist. Covered by the catch-all + `helpers.ts` task, but worth naming explicitly given the nuance.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-3: `migrate` RPC layer error message should be path-agnostic [Software-Architecture]

`src/core/rpc/migrate.ts` ~line 1339 has the error message `"No .project/ directory found"`. The plan's catch-all covers this, but since the RPC layer receives a resolved path (either `.goodplan/` or `.project/`) and doesn't know which variant was passed, the message should be generic: `"No project directory found"`. The command layer knows which path it resolved; the RPC layer should not bake in either name.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-4: `runner-modes.test.ts` `toContain("gp")` assertion is fragile [TUI-and-CLI]

The plan changes `expect(result.stdout).toContain("goodplan")` to `toContain("gp")`. `"gp"` is a two-character substring that could match words like "helping". `state.test.ts` correctly uses `/^gp /` (anchored regex). Use a regex here too, e.g., `/\bgp\b/` or an anchored pattern matching the `--version` output line specifically.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-5: Install script should print notice when removing old `goodplan` binary [Software-Architecture]

`scripts/install-skills.sh` adds `rm -f "$INSTALL_DIR/goodplan"` to clean up the old binary. Shell aliases, completions, and other tooling referencing `goodplan` will silently break. Add a print statement: `"Removed old 'goodplan' binary. Update any shell aliases or completions to use 'gp'."` Consistent with "clean break, no backward compat" scope decision.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-6: `.gitignore` binary entry — add `gp` alongside `goodplan` rather than replacing [Repo-Tooling-Docs]

The plan replaces the `goodplan` binary entry in `.gitignore` with `gp`. This differs from the correct add-alongside pattern used for `.project`/`.goodplan` state directory entries. If someone checks out an older branch or runs the old install script, a `goodplan` binary could reappear and become tracked. Add `gp` alongside `goodplan` for safety.

Resolution: DIRECTLY_ACTIONABLE

---

### MIN-7: Phase 2 verification grep will match CLAUDE.md — adjust expectation or scope [TUI-and-CLI, Repo-Tooling-Docs — same issue]

The Phase 2 verification step runs `grep -r '\.project/' skills/ CLAUDE.md --include="*.md" -l` and expects no results. But CLAUDE.md's "Three Separate Things" table intentionally uses `.project/` to describe the installed CLI's current state directory — these references are correct and should not be changed. The verification will return CLAUDE.md as a false failure. Fix: either scope the grep to `skills/` only, or add a note that CLAUDE.md will have intentional `.project/` references exempt from the rename.

Resolution: DIRECTLY_ACTIONABLE

## Contradictions Resolved

**1. `schema.ts` blanket update vs. `migrate.ts` "mention both" (IMP-1):** TUI-and-CLI reviewer identified the contradiction. The `migrate.ts` task's "mention both" instruction is authoritative since `migrate` inherently supports legacy paths. The `schema.ts` task needs a carve-out.

**2. `.gitignore` binary entry: replace vs. add-alongside (MIN-6):** Repo-Tooling-Docs reviewer flagged this inconsistency against the correct add-alongside pattern used for the state directory entries. Add-alongside is correct for binary entry too.

## Unresolved (USER_INPUT Required)

None.

## DIRECTLY_ACTIONABLE

All 7 issues (IMP-1, IMP-2, MIN-1 through MIN-7) are directly actionable — no research required.

## RESEARCH_NEEDED

None.
