# Holistic Review — Plugin Scaffold (Round 2)

## Issues

**[IMPORTANT] Phase 1 verification missing `claude --plugin-dir` load test**
The slice goal (in `goal.md`) explicitly states: "Start Claude Code with `claude --plugin-dir dist/gp-plugin` and confirm it loads without errors." The Phase 1 Expected Behavior section has `claude plugin validate` but does not include a load test. The plan's Overview also claims the plugin "can be loaded with `claude --plugin-dir dist/gp-plugin`" but no verification step actually tests this. This is the highest-confidence validation — it exercises the real plugin loader, not just structural checks. Add an Expected Behavior item: `claude --plugin-dir dist/gp-plugin --print-system-prompt 2>/dev/null | head -1` (or similar lightweight command) to confirm the plugin loads without errors. If `claude` is unavailable, skip with the same conditional used for `validate`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `plugin/skills/_shared/cli-usage.md` is a dead file in this slice**
Phase 1 creates `plugin/skills/_shared/cli-usage.md` containing the binary path. However, no skill exists in the plugin yet (skills are "empty placeholders" per the plan, and slice 06 handles skill packaging). This file will sit unreferenced until slice 06 copies skills into the plugin. Creating it now means: (a) it could drift if the binary path pattern changes in slices 03-05, and (b) there is no way to verify it actually works (no skill imports it). Consider deferring this file to slice 06 where it can be created alongside the skills that consume it, or add an explicit note that this is a forward-looking placeholder that slice 06 will wire up and verify.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 creates `.goodplan-dev` but no verification tests it**
The sentinel file is created and gitignored, but no Expected Behavior item checks that the file exists or that the `.gitignore` entry works correctly. Phase 2's "After implementation" checks verify `.gitignore` has the entry (`cat .gitignore | grep '.goodplan-dev'`) but do not verify the file itself exists. Add: `ls .goodplan-dev` to confirm it was created, and `git status --porcelain .goodplan-dev` to confirm it is properly ignored (should produce no output).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 `plugin/CLAUDE.md` content scope is vague**
The task says "generic goodplan instructions only" and lists a few rules (never manually edit state files, CLI owns JSON/JSONL, use `--json`, pipe stdin). The research (`claude-plugin-root-scope.md`) concludes this CLAUDE.md "may not even be loaded into context for marketplace-installed plugins." The plan acknowledges this indirectly by moving the binary path to skill content, but does not address the elephant in the room: if the file is likely never loaded for marketplace installs, why create it at all? The plan should either (a) add a brief note acknowledging this is for `--plugin-dir` dev/testing use only, or (b) defer CLAUDE.md creation to a later slice when the loading behavior is confirmed. As written, an implementer might spend time crafting content for a file that serves no purpose in production.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Build command uses `--sourcemap` but no verification checks sourcemap output**
The build task includes `--sourcemap` in the `bun build --compile` command. This is harmless but unusual for compiled binaries — sourcemaps are typically used with JS bundles, not standalone executables. Bun does support `--sourcemap` with `--compile` (it embeds source locations for stack traces), so this is valid. However, the verification section doesn't check that sourcemaps are embedded or that stack traces are improved. If this flag is intentional for debugging, add a brief comment in the build script explaining why. If it was copied from the JS build pattern without consideration, it can be dropped to keep the build command simple.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 2 is a clear improvement over round 1. All 6 round-1 issues were addressed: the HMAC define was removed, CLAUDE.md template moved to `plugin/`, `.gitignore` additions are definitive, architecture doc discrepancy is noted, `--target` rationale is documented, and binary path was moved to shared skill reference. The plan is well-structured with two logical phases, clear before/after checks, and appropriate scope for a scaffold slice.

To reach 9+: add the `--plugin-dir` load test to close the gap between what the plan claims and what it verifies, and resolve the `plugin/skills/_shared/cli-usage.md` timing question (create now vs. defer to slice 06).

## Summary
- Critical: 0
- Important: 2
- Minor: 3
