## Issues

**[CRITICAL]** Goal says 15 directories including `migrate`, but plan only copies 14
The confirmed goal explicitly lists 15 skill directories to copy, including `migrate`. The plan's Phase 1 only copies 14 directories and does not mention `migrate` at all. The research file correctly flags that `migrate/` doesn't exist at `~/.claude/skills/`, but the plan doesn't address this gap. The plan must either: (a) create the `migrate/` skill directory as part of this slice (even if just a stub `skill.md`), or (b) explicitly call out that `migrate/` is deferred with a task to update `conventions.md` to remove it until it exists. The current plan silently ignores a goal requirement.
Resolution: USER_INPUT

**[IMPORTANT]** Phase 1 Expected Behavior "before" check is not falsifiable enough
The before check `ls skills/` says "directory does not exist (exit 1)". This is fine but `ls` on a non-existent directory outputs to stderr — the check should use `test -d skills/` for a clean boolean or note that exit code 2 (not 1) is what `ls` returns for missing directories.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** No task to handle `.gitignore` or large binary exclusions for `skills/`
Copying 14 skill directories with their references could include files that shouldn't be tracked (e.g., `.DS_Store` files are mentioned as needing to be skipped, but the plan doesn't mention adding a `.gitignore` entry for `skills/**/.DS_Store` or similar patterns to prevent future accidental commits). A `.gitignore` rule would be more robust than relying on the copy command to skip them.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Install script lacks error handling and idempotency verification
The install script task says "copy each with `cp -R`, overwriting existing" but doesn't mention: (a) error handling if a copy fails (should the script `set -e`?), (b) feedback to the user about what was copied, (c) what happens if `~/.claude/skills/` doesn't exist yet. These are important for a script that will be run regularly by developers.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 grep pattern may miss command references
The grep pattern `goodplan [a-z:_-]*` will miss references that use backtick-wrapped commands (e.g., `` `goodplan slice:plan` ``), references with uppercase letters, or multi-word subcommands. The task should note that skill files likely wrap commands in backticks and the pattern should account for this (e.g., grepping for the pattern with optional surrounding backticks).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No documentation update task
The plan doesn't include a task to update any documentation (e.g., a developer setup guide or contributing guide) to mention `bun run install:skills` as a required post-clone step. If no such docs exist yet, this is fine to defer, but it should be noted.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Verification sections duplicate Expected Behavior
Both Phase 1 and Phase 2 have an "Expected Behavior" section with concrete checks AND a separate "Verification" section that restates them in prose. The "Verification" sections add no new information and could be removed to reduce noise, or they could add checks that Expected Behavior doesn't cover.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10
The plan covers the core work well and is clearly structured with two logical phases. However, the mismatch between the confirmed goal (15 dirs including `migrate`) and the plan (14 dirs, `migrate` not mentioned) is a critical gap that must be resolved. The install script lacks robustness details, and several minor polish items would improve implementability. To reach 9+: resolve the `migrate` directory question, add error handling to the install script spec, and tighten the grep pattern for the audit.

## Summary
- Critical: 1
- Important: 3
- Minor: 3
