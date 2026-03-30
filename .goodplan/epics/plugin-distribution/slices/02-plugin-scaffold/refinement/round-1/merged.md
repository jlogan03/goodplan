# Merged Feedback — Plugin Scaffold (Round 1)

### CRITICAL Issues

None.

### IMPORTANT Issues

**IMP-1: `__GP_HMAC_KEY__` define is a no-op — drop it from this slice**
*Flagged by: holistic, software-architecture, typescript-javascript, repo-tooling*

The build command includes `--define __GP_HMAC_KEY__="..."` but no `declare const __GP_HMAC_KEY__` exists in `src/`. The define is silently ignored by Bun. This belongs to slice 03. Drop it from the build script entirely (YAGNI) — slice 03 adds both the define and the declaration together. This is the cleanest approach and avoids confusion about what this slice owns.

Resolution: DIRECTLY_ACTIONABLE

**IMP-2: Plugin CLAUDE.md template location `docs/plugin-claude-md.md` is unconventional**
*Flagged by: holistic, software-architecture, typescript-javascript, repo-tooling*

The `docs/` directory contains reference documentation, not build inputs. A template that gets copied into the assembled plugin artifact should live closer to the build pipeline. Suggested alternatives: `plugin/CLAUDE.md` (creates a natural home for future plugin source assets) or `scripts/plugin-claude-md.md`. The `plugin/` directory at repo root is the strongest option since it can house other plugin-specific assets as the epic progresses.

Resolution: DIRECTLY_ACTIONABLE

**IMP-3: `dist/` must be added to `.gitignore` — make it a definitive task, not conditional**
*Flagged by: holistic, typescript-javascript, repo-tooling*

The plan says "add if not already present" but `dist/` is definitively absent from `.gitignore`. `biome.json` already ignores `dist` for linting (no action needed there). Make the `.gitignore` addition a definitive task, not conditional.

Resolution: DIRECTLY_ACTIONABLE

**IMP-4: Version define name divergence — plan uses `__GOODPLAN_VERSION__`, architecture says `__GP_VERSION__`**
*Flagged by: software-architecture*

The plan correctly uses `__GOODPLAN_VERSION__` (matching actual `src/version.ts`), but the epic architecture doc (`plugin-api.md` line 144) says `__GP_VERSION__`. The plan should acknowledge this discrepancy. If slice 01 was supposed to rename it and didn't, note that the architecture doc needs updating. Otherwise the implementer will be confused by the mismatch.

Resolution: DIRECTLY_ACTIONABLE

**IMP-5: `--target=bun-darwin-arm64` is explicit but undocumented rationale**
*Flagged by: repo-tooling, typescript-javascript*

The existing build scripts omit `--target` (build for host platform). The plugin build explicitly targets `bun-darwin-arm64`, which is correct for the "macOS arm64 only" v1 distribution model. The build script should include a comment explaining why the target is explicit, and the plan should note that `bun run build` (no target) is for local dev while `build:plugin` always targets arm64.

Resolution: DIRECTLY_ACTIONABLE

**IMP-6: `${CLAUDE_PLUGIN_ROOT}` substitution in plugin root CLAUDE.md — unverified**
*Flagged by: typescript-javascript*

The research docs list variable substitution in "skill content, agent content, hook commands, and MCP/LSP server configs" but do NOT explicitly list the plugin's root-level `CLAUDE.md`. If `${CLAUDE_PLUGIN_ROOT}` is not substituted there, the template will contain a literal string that Claude cannot resolve, breaking the binary path strategy entirely.

Resolution: RESEARCH_NEEDED
Research: Verify whether `${CLAUDE_PLUGIN_ROOT}` is substituted in a plugin's root-level `CLAUDE.md` (not just in SKILL.md, hooks, MCP configs). Test with `claude --plugin-dir` using a CLAUDE.md containing the variable, or check Claude Code docs on plugin variable substitution scope.

### MINOR Issues

**MIN-1: `.goodplan-dev` sentinel — committed or gitignored? Plan says both.**
*Flagged by: holistic*

Phase 2 adds `.goodplan-dev` to `.gitignore` AND creates the file. If gitignored, other developers must create it manually after clone (correct for a local dev sentinel). If committed, it shouldn't be gitignored. The plan should pick one and document the rationale.

Resolution: DIRECTLY_ACTIONABLE

**MIN-2: `hooks/hooks.json` path declared in plugin.json but file doesn't exist**
*Flagged by: software-architecture, typescript-javascript*

The plan acknowledges this is a forward-looking declaration. `claude plugin validate` may or may not accept a manifest pointing to a missing file. Phase 2 verification runs validate, which will catch it if it fails.

Resolution: DIRECTLY_ACTIONABLE (validate will surface the issue if real; add a fallback note to create an empty `{"hooks": {}}` if validate fails)

**MIN-3: Missing `--sourcemap` flag in build command**
*Flagged by: typescript-javascript, repo-tooling*

The research doc recommends `--minify --sourcemap`. Minification saves negligible size, but `--sourcemap` provides readable stack traces and is essentially free. Add `--sourcemap` to the build command.

Resolution: DIRECTLY_ACTIONABLE

**MIN-4: Marketplace manifest `source.source` field structure looks unusual**
*Flagged by: repo-tooling*

The plan uses `.plugins[0].source.source` (nested `source` inside `source`) for the `git-subdir` type. This could be a schema error. The exact marketplace manifest format should be verified.

Resolution: RESEARCH_NEEDED
Research: Verify the exact schema for `marketplace.json` plugin entries — specifically the field structure for declaring a `git-subdir` source. Check Claude Code marketplace docs or official marketplace repo examples.

**MIN-5: Phase 2 `plugins/gp/` path in marketplace.json — plan doesn't create it**
*Flagged by: holistic*

The marketplace manifest points to `"path": "plugins/gp"` on the release branch. The plan correctly does NOT create this path (CI's job in slice 07). Add a brief note so the implementer doesn't try to create it.

Resolution: DIRECTLY_ACTIONABLE

**MIN-6: Missing `bun run test` / `bun run check` in Phase 1 verification**
*Flagged by: software-architecture, repo-tooling*

Phase 1 verification only runs the build. Phase 2 includes `bun run test` and `bun run check`, but Phase 1 should also verify that adding `build:plugin` to package.json doesn't break existing tooling. Also verify `bun run build` (existing build script) still works.

Resolution: DIRECTLY_ACTIONABLE

**MIN-7: `--version --json` flag order in verification command**
*Flagged by: holistic*

Both flags work (confirmed via `src/index.ts` — checked via `rawArgs.includes()`). No action needed, just noting for awareness.

Resolution: DIRECTLY_ACTIONABLE (no change needed)

### DIRECTLY_ACTIONABLE

1. **IMP-1**: Remove `__GP_HMAC_KEY__` define from the build command. Slice 03 adds it.
2. **IMP-2**: Move CLAUDE.md template from `docs/plugin-claude-md.md` to `plugin/CLAUDE.md`.
3. **IMP-3**: Make `.gitignore` `dist/` addition a definitive task (not conditional).
4. **IMP-4**: Add note acknowledging `__GOODPLAN_VERSION__` vs `__GP_VERSION__` discrepancy with architecture doc.
5. **IMP-5**: Add comment in build script explaining why `--target` is explicit; note `bun run build` for local dev.
6. **MIN-1**: Decide: `.goodplan-dev` committed or gitignored? Document rationale.
7. **MIN-2**: Add fallback note: create empty `hooks.json` if `claude plugin validate` fails on missing file.
8. **MIN-3**: Add `--sourcemap` to the build command.
9. **MIN-5**: Add note that `plugins/gp/` path is created by CI in slice 07.
10. **MIN-6**: Add `bun run test`, `bun run check`, and `bun run build` verification to Phase 1.

### RESEARCH_NEEDED

1. **IMP-6**: Verify `${CLAUDE_PLUGIN_ROOT}` substitution works in a plugin's root-level `CLAUDE.md` file. If it doesn't, the binary path strategy in the template is broken and needs a different approach.
2. **MIN-4**: Verify the exact `marketplace.json` schema for `git-subdir` source type field structure.

### Contradictions Resolved

1. **HMAC key handling**: All four reviewers flagged `__GP_HMAC_KEY__`. Holistic offered two options (omit or annotate); software-architecture and typescript-javascript both recommended option (a) — omit entirely. Repo-tooling said annotate is fine. **Resolution**: Trusting the architecture and TS specialists — omit the define (option a). Cleaner, avoids dead code.

2. **CLAUDE.md template location**: All four reviewers flagged this. Software-architecture suggested `scripts/` or `plugin/`; repo-tooling suggested `plugin/` or `scripts/`; holistic was open-ended. **Resolution**: `plugin/CLAUDE.md` is the strongest consensus — creates a dedicated home for plugin build inputs.

3. **`--target` flag**: Repo-tooling flagged as IMPORTANT (needs documentation); typescript-javascript flagged as MINOR (acceptable for v1). **Resolution**: Elevated to IMPORTANT per repo-tooling (domain specialist for build tooling). The fix is lightweight (add a comment).

### Available Research

- `../../research/claude-plugin-root-scope.md` — `${CLAUDE_PLUGIN_ROOT}` does NOT work in plugin root CLAUDE.md. Substitution only works in skill content, agent content, hooks, MCP/LSP configs. GitHub issue #9354 confirms commands/*.md also don't get substitution. **Action**: Move binary path reference from CLAUDE.md to a shared skill reference file (`skills/_shared/cli-usage.md`). CLAUDE.md should contain generic instructions only. IMP-6 is now DIRECTLY_ACTIONABLE.
- `../../research/marketplace-json-schema.md` — `source.source` is the canonical field structure for `git-subdir` source type. `{ "source": { "source": "git-subdir", "url": "...", "path": "...", "ref": "..." } }` is correct per official docs. MIN-4 is resolved — no change needed.

### Unresolved (USER_INPUT required)

None. All contradictions were resolvable via domain-specialist trust. Both RESEARCH_NEEDED items resolved via research.
