# Repo-Tooling-Docs Review — Round 4

## Issues

**[MINOR] `.gitignore` binary entry `goodplan` should keep old entry alongside new `gp` entry**
Phase 1 task says: "`.gitignore` -- change `goodplan` binary entry to `gp`". This is a replace, not an add-alongside. The plan correctly uses add-alongside logic for `.project`/`.goodplan` entries in both `.gitignore` (Phase 2) and `biome.json` (Phase 1). But the binary entry has the same timing problem in miniature: if someone checks out an older branch or runs the old install script, a `goodplan` binary could appear and become tracked. Since the old binary entry costs nothing to keep, the safest approach is to add `gp` alongside `goodplan` rather than replacing it. This is a low-risk edge case, so MINOR.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 verification step says `grep -r '\.project/' skills/ CLAUDE.md` should return no results, but CLAUDE.md will still have `.project/` references**
The plan's Phase 2 Verification says: "Run `grep -r '\.project/' skills/ CLAUDE.md --include='*.md' -l` -- should return no results." But the user decision says `.project/architecture/*.md` references stay as-is, and CLAUDE.md's "Three Separate Things" table explicitly describes `.project/` as managed by the installed CLI. Those references are correct and intentional. The verification grep will return CLAUDE.md as a match. Either adjust the verification expectation to note that CLAUDE.md will have intentional `.project/` references (for the installed CLI / Three Separate Things documentation), or scope the grep to `skills/` only.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
The plan is thorough and well-structured at this point. All CRITICAL and IMPORTANT issues from round 3 have been addressed: the `.gitignore` state entries now correctly add `.goodplan` alongside `.project` rather than replacing; `biome.json` keeps both entries; `migrate.ts` has explicit dual-path resolution logic; the `PROJECT_DIR_NAME` export ordering constraint is documented; the catch-all task has migrate exclusions; and the `install-skills.sh` cleanup step is included. The two remaining MINOR items are edge-case polish. To reach 10/10: fix the verification expectation for CLAUDE.md and consider keeping the old binary gitignore entry.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
