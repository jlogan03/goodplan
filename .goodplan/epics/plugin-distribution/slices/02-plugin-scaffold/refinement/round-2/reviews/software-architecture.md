# Software Architecture Review — Plugin Scaffold (Round 2)

## Issues

**[IMPORTANT] `plugin/skills/_shared/cli-usage.md` creates a source directory that shadows the repo's `skills/_shared/`**
The plan creates `plugin/skills/_shared/cli-usage.md` as a shared skill reference for the binary path. This is architecturally sound — putting `${CLAUDE_PLUGIN_ROOT}` references in skill content where substitution actually works. However, the `plugin/skills/_shared/` directory is a new source-of-truth location that partially overlaps with the repo's existing `skills/_shared/references/`. When slice 06 (skill-packaging) copies repo skills into the plugin, it will need to merge these two `_shared/` directories. The plan should document this merge requirement as a forward-looking note so the slice 06 implementer knows about it — otherwise they may overwrite `plugin/skills/_shared/cli-usage.md` when copying `skills/_shared/` from the repo, or create a confusing dual-source arrangement.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `plugin/CLAUDE.md` may never be loaded for marketplace-installed plugins**
The plan creates `plugin/CLAUDE.md` and copies it to `dist/gp-plugin/CLAUDE.md`. The research (`claude-plugin-root-scope.md`) explicitly concludes that a plugin's root-level CLAUDE.md is "most likely never loaded into context for marketplace-installed plugins" because CLAUDE.md discovery walks up from the user's cwd, not from the plugin cache directory. The plan acknowledges `${CLAUDE_PLUGIN_ROOT}` doesn't work there (good — that was a round 1 fix), but doesn't address the more fundamental question: will this file be loaded at all? If it isn't, the effort to create and maintain it is wasted, and the "universal goodplan instructions" it contains won't reach users. The plan should either: (a) add a verification step that confirms the CLAUDE.md is loaded when using `claude --plugin-dir dist/gp-plugin` (which may work for local dev but not marketplace), (b) note this as a known limitation and plan to move these instructions into skill content if marketplace testing confirms the file isn't loaded, or (c) move the instructions entirely into `plugin/skills/_shared/cli-usage.md` now and skip the root CLAUDE.md.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `.goodplan-dev` sentinel creates a two-step setup burden without enforcement**
Phase 2 creates `.goodplan-dev` at the repo root (gitignored) and also adds it to `.gitignore`. The `.gitignore` entry documents its existence, but new developers won't know to create it after clone — there's no error, just silently missing dev-mode behavior (hook scripts won't skip bash warnings). The `plugin/CLAUDE.md` or a contributing guide should mention this, or the build script should create it automatically when run from the repo. This is minor because the sentinel only affects hook behavior in the dev repo, and hooks aren't implemented until slice 04.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 task ordering: `.goodplan-dev` created but hooks don't exist yet**
Phase 2 creates the `.goodplan-dev` sentinel file and documents that it "marks this as the dev repo so hook scripts skip the bash-warning during development." But hooks are slice 04 — the sentinel serves no purpose until then. Creating it now is harmless but creates a file whose purpose can't be verified. This is acceptable as forward-looking preparation, but the verification section for Phase 2 should not attempt to verify sentinel-related hook behavior (it doesn't currently, so this is just a confirmation that the plan is correct here).
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
The plan addresses all round 1 software architecture issues well: HMAC define removed, CLAUDE.md template moved to `plugin/`, shared skill reference for binary path added, version define discrepancy acknowledged, regression tests added to Phase 1 verification. The remaining issues are: (1) the `plugin/skills/_shared/` merge concern for slice 06, which is a real dependency gap, and (2) the CLAUDE.md loading question, which the research itself flagged but the plan hasn't resolved. To reach 9+: add a forward-looking note about the `_shared/` merge in slice 06, and either verify CLAUDE.md loading or pivot the instructions into skill content.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
