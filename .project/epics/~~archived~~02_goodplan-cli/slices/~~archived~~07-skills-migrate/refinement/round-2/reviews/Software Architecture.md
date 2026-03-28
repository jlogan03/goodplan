# Software Architecture Review (Round 2)

## Issues

**[IMPORTANT]** Install script should enumerate skill directories explicitly, not derive from filesystem listing

The plan specifies the install script should iterate over each goodplan skill directory, but does not clarify whether the list is hardcoded in the script or dynamically derived (e.g., `ls skills/`). A dynamic listing would copy everything in `skills/`, which is correct today but fragile if non-skill artifacts (e.g., a future `README.md` or `scripts/` subdirectory) are placed there. Since the install script is the deployment boundary enforcing the "skills versioned in repo" architectural decision, it should either:
1. Hardcode the list of skill directory names in the script (matching the 15 in the plan), or
2. Use a convention-based filter (e.g., only directories, skip `_shared` for special handling or include it uniformly).

The plan currently says "for each goodplan skill directory" without specifying the enumeration mechanism. This should be explicit so the install script is deterministic and auditable.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `package.json` script update should use `bash` invocation for portability

The plan says to update `package.json`'s `install:skills` to point to `scripts/install-skills.sh`. It should specify the exact script value — e.g., `"bash scripts/install-skills.sh"` rather than `"./scripts/install-skills.sh"` — to avoid issues if the user's `bun run` doesn't respect the shebang or the file isn't executable in their clone. The plan already includes making the script executable (`test -x`), but the `package.json` invocation is not spelled out.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No symlink handling specified for install script's reverse direction

The plan correctly says "skip symlinks" when copying from `~/.claude/skills/` into the repo. The install script copies the other direction (repo to `~/.claude/skills/`), and the repo `skills/` should never contain symlinks since they were excluded. However, the install script's `rm -rf` on target dirs will remove whatever is there, including if a user has manually symlinked a skill directory at the destination. This is acceptable behavior (the script owns that directory), but worth a one-line comment in the script for clarity. Truly minor.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan comprehensively addresses all round-1 feedback. The `migrate/` stub approach satisfies the confirmed goal. Install script now has clean-install semantics (rm-before-copy, `set -e`, `mkdir -p`, user feedback). `conventions.md` update for `start-epic` is included. `.DS_Store` gitignore safety net is added. Audit report is explicitly described as ephemeral. The one remaining IMPORTANT issue is about making the skill enumeration mechanism explicit in the install script — a small but meaningful gap at the deployment boundary.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
