# Repo-Tooling-Docs Review — Round 3

## Issues

**[IMPORTANT] `.gitignore` `.project/` state entries should NOT be renamed to `.goodplan/` in Phase 2**
Phase 2 task says: "`.gitignore` — change specific `.project/` path entries (e.g., `.project/state.md`, `.project/activity-log.jsonl`, etc.) to `.goodplan/` equivalents." But the `.gitignore` entries for `.project/state.md` and `.project/epics/goodplan-cli/prototypes/...` exist to ignore files created by the **installed** CLI (#2 in the Three Separate Things model) managing **this repo's** `.project/` directory. The installed CLI still writes to `.project/`, not `.goodplan/`. Renaming these entries would cause previously-ignored installed-CLI artifacts to become visible to git, and the new `.goodplan/` entries would match nothing (since the installed CLI hasn't been updated yet).

The binary entry (`goodplan` -> `gp`) in Phase 1 is correct — that's a build output of the repo source code. But the `.project/` state entries are installed-CLI artifacts and should stay as `.project/` until the installed CLI is updated. This is exactly the same rationale as the scope decision for `.project/architecture/*.md`: "Managed by the installed CLI, not the repo source code. Will migrate when installed CLI updates."

Resolution: DIRECTLY_ACTIONABLE — Remove the `.gitignore` `.project/` path entry rename task from Phase 2. Add a comment noting these will be updated when the installed CLI is rebuilt with `.goodplan/` support.

**[IMPORTANT] `biome.json` ignore entry rename timing risk**
Phase 1 task says: "`biome.json` — change `".project"` in `files.ignore` to `".goodplan"`." The `biome.json` ignore entry for `.project` prevents biome from linting this repo's own `.project/` state directory (managed by the installed CLI). After the rename, `.project/` will still exist (installed CLI uses it), so biome will start linting `.project/` contents — which are JSON/JSONL/MD files not intended to be checked by biome. Meanwhile `.goodplan/` won't exist yet.

The entry should include **both** `.project` and `.goodplan` so that: (a) the existing installed-CLI state dir remains ignored, and (b) when the installed CLI is rebuilt, the new dir is also ignored.

Resolution: DIRECTLY_ACTIONABLE — Change the task from "change `.project` to `.goodplan`" to "add `.goodplan` alongside `.project`" (keep both entries).

**[MINOR] `install-skills.sh` installs binary as `goodplan` to PATH — old binary left behind after rename**
The plan correctly identifies that `install-skills.sh` should be updated (`--outfile gp`, copy target `gp`, echo messages). However, it does not mention that after running `bun run install:skills` with the new script, the old `~/.local/bin/goodplan` binary will remain on disk. Users who previously ran `install:skills` will have both `goodplan` and `gp` on PATH. Consider adding a cleanup step to remove `~/.local/bin/goodplan` if it exists, or at minimum an echo noting the old binary can be removed.

Resolution: DIRECTLY_ACTIONABLE — Add a line to `install-skills.sh` after the install: `rm -f "$INSTALL_DIR/goodplan" 2>/dev/null && echo "Removed old goodplan binary"` (or similar).

## Score: 8/10
The plan is thorough and well-structured. The two IMPORTANT issues both stem from the same root cause: the repo's own `.project/` directory is managed by the installed CLI, not the source being modified. The plan correctly identified this distinction for `.project/architecture/*.md` but missed applying the same logic to `.gitignore` state entries and the `biome.json` ignore. Fixing these (keeping both old and new entries where needed) would bring the score to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 1
