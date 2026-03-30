# Holistic Review — Plugin Scaffold (Round 1)

## Issues

**[IMPORTANT] Build script uses `__GP_HMAC_KEY__` define but no source code consumes it**
The plan's Phase 1 task includes `--define __GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-key}\"` in the `bun build --compile` command. However, there is no `declare const __GP_HMAC_KEY__` in the current source code (grep confirms zero matches in `src/`). The HMAC signature feature is slice 03's scope, not slice 02's. Including this define in the build script is harmless at compile time (unused defines are ignored), but it creates confusion about what this slice owns. The architecture doc (`plugin-api.md`) does show this define, but it describes the full build pipeline across all slices. The plan should either (a) omit the `__GP_HMAC_KEY__` define entirely and note it will be added in slice 03, or (b) explicitly state it's a no-op placeholder that slice 03 will wire up. Option (a) is cleaner — YAGNI until slice 03.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Plugin CLAUDE.md template location is non-standard**
The plan puts the CLAUDE.md template at `docs/plugin-claude-md.md`, but the `docs/` directory currently contains only `primer.md` and `superpowers/`. This template is a build artifact source — it's copied into `dist/gp-plugin/CLAUDE.md` by the build script. It would be more consistent to place it alongside other plugin build sources. Consider `plugin-claude-md.md` at repo root or in a new `plugin/` or `templates/` directory. Alternatively, the build script could generate it inline (it's described as minimal content). Either way, the plan should justify the location choice or align with the architecture doc which doesn't specify a source location.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Missing `dist/` in .gitignore — plan says "if not already present" but it is NOT present**
The plan task says "Add `dist/` to `.gitignore` (if not already present)". Codebase verification confirms `dist/` is NOT in `.gitignore`. This should be a definitive task, not conditional. The current `.gitignore` has `gp` (the local binary) but not `dist/`. This is required for the build output to not be accidentally committed.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Verification command `dist/gp-plugin/binaries/macos-arm64/gp --version --json` — flag order**
The Expected Behavior section uses `--version --json` which does work (confirmed in `src/index.ts` — both flags are checked via `rawArgs.includes()`). This is fine, but worth noting that `--version` is handled pre-dispatch as a special case, so this verification is valid.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 marketplace.json references `plugins/gp/` path on release branch but plan doesn't create this path**
The marketplace manifest points to `"path": "plugins/gp"` on the `release` branch. The plan correctly does NOT create this path (it's CI's job in slice 07), but the plan should add a brief note explaining this so the implementer doesn't try to create it. The marketplace.json will be "forward-looking" until CI is set up.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `.goodplan-dev` sentinel added to .gitignore but also created as a committed file**
Phase 2 adds `.goodplan-dev` to `.gitignore` AND creates the `.goodplan-dev` sentinel file. If it's gitignored, it won't be committed, which means other developers cloning the repo won't have it. This is the correct behavior for a local dev sentinel (each developer creates it locally), but the plan should clarify: is this file committed or gitignored? The architecture says it marks "this is the dev repo" — if it's gitignored, the implementer needs to know to create it manually after clone. If committed, it shouldn't be in `.gitignore`. The plan should pick one and document the rationale.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear two-phase ordering, good Expected Behavior sections with concrete before/after checks, and appropriate scope for a scaffold slice. The main issues are: (1) including a define (`__GP_HMAC_KEY__`) that belongs to a future slice, which muddies scope boundaries; (2) the CLAUDE.md template location choice isn't justified; and (3) the `.goodplan-dev` sentinel has contradictory treatment (gitignored yet created as if committed). To reach 9+: resolve the HMAC define scope question, pick a clear location for the template, and clarify the sentinel file's git status.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
