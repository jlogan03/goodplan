# Software Architecture Review — Plugin Scaffold (Round 1)

## Issues

**[IMPORTANT] Version define mismatch between architecture and plan**
The epic architecture (`plugin-api.md` line 144) specifies `--define __GP_VERSION__` while the plan uses `--define __GOODPLAN_VERSION__`. The codebase currently declares `__GOODPLAN_VERSION__` in `src/version.ts`. The plan is correct to use `__GOODPLAN_VERSION__` (matching the actual code), but this creates a divergence from the architecture doc. If slice 01 was supposed to rename this define and didn't, a future slice will need to reconcile. If the decision was to keep `__GOODPLAN_VERSION__`, the architecture doc needs updating. Either way, the plan should acknowledge this discrepancy so the implementer doesn't get confused by the architecture saying `__GP_VERSION__`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `__GP_HMAC_KEY__` define has no corresponding `declare const` in the codebase**
The plan includes `--define __GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-key}\"` in the build command, but there is no `declare const __GP_HMAC_KEY__` anywhere in `src/`. Bun's `--define` replaces identifiers at compile time — if nothing references `__GP_HMAC_KEY__`, this define is silently ignored. The plan says this is a "placeholder for future slice 03," but without a corresponding declaration, the define does literally nothing. Including it now risks the implementer thinking it's wired up when it isn't.

Two options: (a) Drop the `--define __GP_HMAC_KEY__` from the build command in this slice — slice 03 adds both the define and the declaration together, which is cleaner. (b) Keep it but add a note in the plan explicitly stating "this define is a no-op until slice 03 adds the corresponding `declare const` in `src/`." Option (a) is cleaner — it avoids dead code and reduces confusion.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Plugin CLAUDE.md template location diverges from architecture**
The plan creates the template at `docs/plugin-claude-md.md` and copies it to `dist/gp-plugin/CLAUDE.md`. The architecture doc (`plugin-api.md`) doesn't specify where the source template lives, but `docs/` currently contains only `primer.md` and `superpowers/`. A source template for plugin packaging content is more naturally a build artifact input — placing it alongside the build script or in a dedicated `plugin/` directory would be more cohesive. More importantly, the filename `plugin-claude-md.md` is awkward. Consider `scripts/plugin-claude-md-template.md` or `plugin/CLAUDE.md` to keep build inputs near the build script.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Build script doesn't generate `hooks/hooks.json` — but plan says `hooks: "hooks/hooks.json"` in plugin.json**
Phase 1 task 4 generates `plugin.json` with `hooks: "hooks/hooks.json"`, but the build script never creates a `hooks.json` file. The `hooks/` directory is an empty placeholder. The plan acknowledges this parenthetically — "hooks.json doesn't exist yet — that's fine, the manifest declares the path" — but `claude plugin validate` may fail if it tries to resolve the hooks path. The research doc shows hooks config is additive, but if the validator checks file existence for declared paths, this will break.
Resolution: CODEBASE_EXPLORATION
Research: Run `claude plugin validate` against a plugin directory where `plugin.json` declares a hooks path that doesn't exist. Check whether validation fails or passes. If it fails, the plan needs to either (a) omit the `hooks` field from `plugin.json` in this slice or (b) create an empty `hooks.json` (`{"hooks": {}}`) placeholder.

**[MINOR] `.gitignore` entry for `dist/` — should it be `dist/` or more specific?**
The plan says "Add `dist/` to `.gitignore`" but the existing `.gitignore` has specific entries (not broad directory ignores). The current `tsconfig.json` already specifies `outDir: "dist"` — if TypeScript type-checking ever writes to `dist/`, those would also be ignored. This is probably fine (both outputs are build artifacts), but the plan could be more specific with `dist/gp-plugin/` if there's concern about future `dist/` usage for other purposes.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No verification that the existing `build` script still works after adding `build:plugin`**
Phase 1 verification runs `bun run build:plugin` but doesn't verify that `bun run build` (the existing build script) is unaffected. Both scripts compile from `src/index.ts` with different output paths and flags. A regression in the existing build would be caught by `bun run check` or `bun run test`, but explicit verification would be more robust. Phase 2 mentions running `bun run test` and `bun run check` but not `bun run build`.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10
The plan is well-structured with clear phases, good expected-behavior checks, and sensible task ordering. The main issues are: (1) the `__GP_HMAC_KEY__` define being a no-op that creates confusion, (2) the version define name divergence from architecture that needs explicit acknowledgment, and (3) the hooks path in `plugin.json` potentially failing validation. To reach 9+: resolve the HMAC key define approach, add a note about the version define name, verify the hooks path behavior, and tighten the CLAUDE.md template location.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
