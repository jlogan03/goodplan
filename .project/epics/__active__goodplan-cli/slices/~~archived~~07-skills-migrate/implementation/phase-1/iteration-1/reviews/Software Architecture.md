# Software Architecture Review — Phase 1: Copy Skills & Install Script

## Issues

**[IMPORTANT]** Install script lacks error handling for missing source directories

The install script iterates over a hardcoded list of 15 skill directories and runs `rsync` for each. If a skill directory is missing from `skills/` (e.g., someone deletes `skills/migrate/` or a new entry is added to the list before the directory exists), `rsync` will fail with a non-obvious error. The script should validate that each source directory exists before attempting the copy, and produce a clear error message identifying the missing directory.

File: scripts/install-skills.sh:31
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `.gitignore` missing trailing newline

The `.gitignore` file does not end with a trailing newline. POSIX text files should end with a newline. Some tools may not correctly parse the last line without one. This predates this phase (the original file already lacked it), but the diff compounds it by appending another line without fixing the existing issue.

File: .gitignore:8
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `conventions.md` skill listing is unsorted

The skill directories in `conventions.md` are listed in an ad-hoc order that doesn't match the alphabetical order on disk or any obvious workflow sequence. This makes it harder to spot missing or duplicate entries as the list grows. Sorting alphabetically (as the install script does) would make the list self-verifying.

File: .project/conventions.md:18
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The implementation is architecturally sound. It correctly establishes `skills/` as the source-of-truth with a one-way install flow, preserves non-goodplan skills at the destination, uses clean-install semantics (rm + rsync), and keeps the skill list hardcoded rather than using a fragile glob. The module boundary is clean: the install script is a standalone shell script invoked via `package.json`, with no coupling to the TypeScript codebase. The one IMPORTANT issue (missing source directory validation) is a robustness gap rather than an architectural flaw. To reach 10: add the source-directory check.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
