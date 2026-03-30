# Merged Review: Phase 2 (Skills and Documentation)

**Aggregate Score: 8.5/10** | Critical: 0, Important: 2, Minor: 2

Scores by reviewer: Generalist 8/10, Repo-Tooling-Docs 9/10, Agent-Skill 10/10

## Summary

Phase 2 is well-executed overall. ~76 files updated with consistent rename of CLI invocations (`goodplan` → `gp`) and path references (`.project/` → `.goodplan/`). Zero missed CLI invocations in skills, zero missed path references, all `requires:` frontmatter updated. The "Three Separate Things" section of CLAUDE.md is correctly preserved. The install script properly handles old binary cleanup. The `.gitignore` correctly adds `.goodplan/` entries alongside existing `.project/` entries. Tests pass, lint is clean (pre-existing only).

Two distinct bugs were found in `skills/migrate/SKILL.md` — one around input path scanning for legacy migrations, one around backup directory naming. Both are directly actionable.

---

## Important (2)

### IMP-1: Migrate skill over-replaced legacy `.project/` input path references

**File:** `skills/migrate/SKILL.md`, `skills/migrate/references/migration-heuristics.md`
**Reviewers:** Generalist

The migrate skill's primary use case is converting **legacy `.project/` directories** to CLI-managed state. The blanket replacement of `.project/` → `.goodplan/` in these files is semantically wrong for first-migration scenarios:

- `migration-heuristics.md` line 3: "pre-CLI `.goodplan/` filesystem artifacts" — pre-CLI projects use `.project/`, not `.goodplan/`
- `migration-heuristics.md` lines 28, 32: `Scan .goodplan/epics/` and `Scan .goodplan/side-quests/` — these describe legacy directory scanning and should reference `.project/`
- `SKILL.md` line 4–5: "import existing .goodplan/" — the import target for first migration is `.project/`
- `SKILL.md` lines 42–62: Pre-flight checks reference `.goodplan/` exclusively; for a first-time migration the user has `.project/`, not `.goodplan/`
- `SKILL.md` lines 90–157: Filesystem discovery commands (`ls -d .goodplan/epics/*/`, etc.) should use `.project/` for first migration

The CLI's `migrate.ts` command layer does dual-path resolution (`.goodplan/` first, then `.project/` fallback). The skill should mirror this: describe `.project/` as the legacy input and `.goodplan/` as the re-migration input.

**Fix:** Restore `.project/` references in `migration-heuristics.md`. In `SKILL.md`, update filesystem discovery commands and pre-flight checks to scan both paths (`.goodplan/` for re-migration, `.project/` for legacy migration), matching the dual-path resolution in the command layer.

---

### IMP-2: Migrate skill backup directory names still reference `.project-old` instead of `.goodplan-old`

**File:** `skills/migrate/SKILL.md`
**Reviewers:** Repo-Tooling-Docs

The source code in `src/core/rpc/migrate.ts:438` computes backup names as `${projectDir}-old-${timestamp}`. Since Phase 1 renamed `projectDir` to `.goodplan`, actual backup directories will be `.goodplan-old-<timestamp>/`. Four locations in `SKILL.md` still reference the old naming:

- Line 39: `ls -d .project-old/ .project-old-*/ 2>/dev/null` should be `ls -d .goodplan-old/ .goodplan-old-*/ 2>/dev/null`
- Line 42: prose references `.project-old/` and `.project-old-<timestamp>/`
- Line 204: `.project-old/` in post-migration instructions
- Line 253: `.project-old-YYYYMMDD-HHmmss/` in rename failure section

**Fix:** Update all four locations to `.goodplan-old` / `.goodplan-old-<timestamp>`.

---

## Minor (2)

### MIN-1: `.gitignore` has overly specific `.goodplan/` prototype entries

**File:** `.gitignore`
**Reviewers:** Generalist

Lines 7–8 add `.goodplan/epics/goodplan-cli/prototypes/jqjs-spike/jqjs-spike` and associated `node_modules/` entries. These mirror `.project/` equivalents but are extremely specific to a historical prototype. When the state directory actually moves to `.goodplan/`, these paths may not exist. Not wrong, just unnecessary clutter. Low priority.

---

### MIN-2: Plan file marked up during implementation

**File:** `plan-refined.md`
**Reviewers:** Generalist

The plan file was updated to mark Phase 2 tasks as `[x]` and add a lint note. Fine for tracking, but was not listed as an expected change in the plan's task list. Cosmetic only.
