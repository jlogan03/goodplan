# Merged Review — Phase 1: Copy Skills & Install Script

## Scores

| Reviewer | Score |
|---|---|
| Generalist | 9/10 |
| Software Architecture | 9/10 |
| Repo, Tooling, & Docs | 9/10 |

**Overall: 9/10**

## Issues

### Important

**[IMPORTANT] Install script lacks error handling for missing source directories**

The install script iterates over a hardcoded list of 15 skill names and runs `rsync` for each. If a source directory is missing (e.g., `skills/migrate/` is deleted, or a new name is added to the list before the directory is created), `rsync` will fail with a non-obvious error. The script should validate that each source directory exists before attempting the copy and emit a clear, actionable error message naming the missing directory.

File: `scripts/install-skills.sh:31`
Resolution: DIRECTLY_ACTIONABLE
Raised by: Software Architecture

---

### Minor

**[MINOR] `.gitignore` missing trailing newline** *(raised by all three reviewers)*

The `.gitignore` file does not end with a newline character. POSIX text files must end with a newline; git shows `\ No newline at end of file` in diffs. The issue predates this phase (the original file also lacked it), but since the file was modified in this phase, it should be fixed here.

File: `.gitignore:8`
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `conventions.md` skill listing is unsorted**

The skill directories listed in `conventions.md` are in an ad-hoc order. Sorting alphabetically (consistent with the install script's hardcoded list) makes the listing self-verifying and easier to audit for missing or duplicate entries as the skill count grows.

File: `.project/conventions.md:18`
Resolution: DIRECTLY_ACTIONABLE
Raised by: Software Architecture

---

**[MINOR] Confirm `start-epic/` directory is complete**

All skill directories except the `migrate/` stub contain a `references/` subdirectory. `start-epic/` only contains `SKILL.md`. If the source at `~/.claude/skills/start-epic/` also has no `references/` directory this is correct, but the copy should be confirmed complete.

File: `skills/start-epic/`
Resolution: CODEBASE_EXPLORATION
Raised by: Repo, Tooling, & Docs

## What Went Well

- All 15 skill directories present and correct.
- Install script: shebang, `set -e`, path resolution via `SCRIPT_DIR`/`REPO_ROOT`, `mkdir -p`, `rm -rf` + `rsync -a --exclude='.DS_Store'`, per-skill progress and summary line — all correct.
- `package.json` invokes via `bash scripts/install-skills.sh` (no execute-bit dependency).
- `.gitignore` entry for `skills/**/.DS_Store` added.
- `conventions.md` updated with `start-epic`.
- `migrate/` stub present with placeholder `SKILL.md`.
- `_shared/references/` directory present (recursive copy worked).
- Hardcoded skill list is the right safety choice — no accidental overwrites of non-goodplan skills.
- Clean module boundary: install script is standalone shell, no TypeScript coupling.
- Build: PASS, Tests: PASS (702).
