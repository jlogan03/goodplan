## Issues

**[IMPORTANT]** Migrate skill references `.project-old` backup directories instead of `.goodplan-old`
The migrate skill's pre-flight checks and post-migration messaging still reference `.project-old` and `.project-old-*` as the backup directory names. The source code in `src/core/rpc/migrate.ts:438` computes backup names as `${projectDir}-old-${timestamp}`, and since Phase 1 renamed `projectDir` to `.goodplan`, the actual backup directories will be `.goodplan-old-<timestamp>/`. Four locations need updating:
- Line 39: `ls -d .project-old/ .project-old-*/ 2>/dev/null` should be `ls -d .goodplan-old/ .goodplan-old-*/ 2>/dev/null`
- Line 42: prose references `.project-old/` and `.project-old-<timestamp>/`
- Line 204: `.project-old/` in post-migration instructions
- Line 253: `.project-old-YYYYMMDD-HHmmss/` in rename failure section
File: skills/migrate/SKILL.md:39
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
Thorough, consistent rename across ~53 files. All CLI invocations (`goodplan` -> `gp`) and path references (`.project/` -> `.goodplan/`) are correctly updated in skills, shared references, CLAUDE.md, install script, and `.gitignore`. Prose product name "goodplan" is correctly preserved. The "Three Separate Things" section in CLAUDE.md is correctly left as-is per scope decision. The install script properly handles cleanup of the old binary name. The one issue (migrate skill backup directory naming) prevents a 10.

## Summary
- Critical: 0
- Important: 1
- Minor: 0
