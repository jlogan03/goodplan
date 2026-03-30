# Round 2 Merged Feedback

## CRITICAL Issues

None.

## IMPORTANT Issues

**[IMPORTANT] Install script enumeration mechanism must be explicit, and script must be robust for invocation from any working directory**

Two reviewers flagged related gaps at the install script boundary, merged here:

- Software Architecture flags that the plan does not specify whether the skill directory list is hardcoded or dynamically derived. A dynamic `ls skills/` would silently copy non-skill artifacts (e.g., a future `README.md` or `scripts/` subdirectory) placed in `skills/`. The install script is the deployment boundary enforcing "skills versioned in repo", so enumeration must be deterministic and auditable. Resolution: either hardcode the 15 skill directory names, or use a convention-based filter (directories only, with a defined handling for `_shared`).

- Repo/Tooling/Docs flags that the plan says "determine repo root via `dirname` of the script path" without specifying a shebang or the exact path-resolution idiom. `bun run` executes the script directly, so `#!/usr/bin/env bash` is required. The `dirname` approach must use `SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"` (or equivalent) to produce an absolute path when invoked from any working directory.

Both also agree the `package.json` `install:skills` value should be `"bash scripts/install-skills.sh"` for portability (avoids dependence on execute bit in some clone environments), not `"./scripts/install-skills.sh"`.

Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**[MINOR-1] Phase 1 "after" verification should confirm recursive copy, not just one file**

Holistic: the current verification `diff skills/start-epic/SKILL.md ~/.claude/skills/start-epic/SKILL.md` confirms a single file. A more robust check would also diff a subdirectory with multiple files (e.g., `diff -r skills/_shared/references/ ~/.claude/skills/_shared/references/`) to confirm recursive copy and clean-install semantics (`rm -rf` + rsync).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR-2] Grep audit output requires backtick-stripping step — specify the mechanism**

Repo/Tooling/Docs: the plan specifies `` grep -roEh '`?goodplan [a-z:_-]+`?' skills/ `` and mentions "stripping backticks from results" as correct intent, but does not specify how. Since `grep -o` includes the surrounding backticks in output, the implementer should add a concrete step (e.g., pipe through `tr -d '`'` or `sed "s/\`//g"`). Minor since the audit is informational and the implementer will naturally handle it.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR-3] Install script: add one-line comment about `rm -rf` overwriting manually-symlinked destinations**

Software Architecture: the install script's `rm -rf` on target dirs will remove whatever is there, including if a user has manually symlinked a skill directory at `~/.claude/skills/<name>`. This is acceptable ownership semantics, but worth a brief comment in the script for future maintainers.

Resolution: DIRECTLY_ACTIONABLE

## Contradictions Resolved

**Hardcode vs. dynamic enumeration:** Holistic suggested dynamic enumeration (auto-picks up new skills, no maintenance burden). Software Architecture argued for explicit enumeration (avoids copying non-skill artifacts at the deployment boundary). Domain specialist (Software Architecture) wins on this architectural question: use explicit enumeration (hardcoded list or convention-based filter), not a bare filesystem listing. Holistic's maintenance concern is valid but secondary to correctness of the deployment boundary.

## Unresolved (USER_INPUT required)

None.
