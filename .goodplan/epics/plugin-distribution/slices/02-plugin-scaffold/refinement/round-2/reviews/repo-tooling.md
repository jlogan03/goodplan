# Repo & Tooling Review — Plugin Scaffold Plan (Round 2)

## Issues

**[MINOR]** `.goodplan-dev` sentinel created but not consumed in this slice

Phase 2 creates a `.goodplan-dev` sentinel file and adds it to `.gitignore`. The plan explains it is used by hook scripts to skip bash-warnings during development, but no hook scripts exist yet (slice 4). Creating the file now is harmless, but the `.gitignore` entry alone is sufficient to document its future existence. Creating an actual file that has no consumer yet adds a stray artifact. Consider deferring the file creation to the slice that introduces the hook scripts that read it, and only adding the `.gitignore` entry now.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `plugin/skills/_shared/cli-usage.md` path may conflict with plugin auto-discovery

The plan creates `plugin/skills/_shared/cli-usage.md` as a shared reference file. In a Claude Code plugin, `skills/` is auto-discovered and each subdirectory with a `SKILL.md` is treated as a skill. The `_shared/` directory has no `SKILL.md`, so it won't be treated as a skill itself. However, the research doc (section 5) says "Skills can include supporting files alongside `SKILL.md`" — shared references across skills are typically co-located with the skill that uses them. The `_shared/` convention works in the current installed-skills layout (`~/.claude/skills/_shared/`), but Claude Code plugin auto-discovery may not support cross-skill shared references the same way. Verify that `${CLAUDE_PLUGIN_ROOT}/skills/_shared/cli-usage.md` is actually resolvable from a skill's content via relative path. If not, the reference may need to live inside each skill that uses it, or in a non-skills directory.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Build script validation fallback could silently pass with a broken plugin

Phase 1 task item 6 says: "if `claude` CLI available, else fallback assertions (plugin.json exists, binary is executable)." The fallback only checks file existence and execute permission — it would pass even if `plugin.json` has invalid JSON or the wrong schema, or if the binary segfaults on launch. Consider adding `jq . dist/gp-plugin/.claude-plugin/plugin.json > /dev/null` (validates JSON syntax) and `dist/gp-plugin/binaries/macos-arm64/gp --version` (validates binary actually runs) to the fallback path. Both are already in the Expected Behavior checks, so this is about ensuring the build script itself catches issues rather than relying on manual verification.

Resolution: DIRECTLY_ACTIONABLE

---

No additional issues found. All 6 IMPORTANT and 7 MINOR issues from round 1 have been addressed:
- `dist/` in `.gitignore` is now a definitive addition (not conditional)
- CLAUDE.md template moved to `plugin/CLAUDE.md`
- `--target` flag is documented with a comment explaining v1 platform constraint
- `--sourcemap` added to the compile command
- `__GP_HMAC_KEY__` removed entirely (deferred to slice 03)
- `source.source` marketplace schema validated via dedicated research
- Phase 1 verification now includes `bun run build`, `bun run test`, and `bun run check`

## Score: 9/10

The plan is well-structured with clear two-phase organization, concrete before/after Expected Behavior checks, and good alignment with both the plugin format research and the epic architecture. Round 1 issues have been thoroughly addressed. The remaining minors are edge cases: a premature sentinel file, a potential plugin auto-discovery question for the `_shared/` pattern, and a build-script fallback that could be more robust. None block implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
