# Merged Feedback — Plugin Scaffold (Round 2)

## Reviewer Scores
- holistic: 8/10
- software-architecture: 8/10
- typescript-javascript: 9/10
- repo-tooling: 9/10

### CRITICAL Issues

None.

### IMPORTANT Issues

**IMP-1: Phase 1 verification missing `claude --plugin-dir` load test**
(holistic)
The slice goal explicitly requires confirming the plugin loads without errors via `claude --plugin-dir dist/gp-plugin`. The plan verifies structure (`claude plugin validate`) but never actually load-tests. Add an Expected Behavior item like `claude --plugin-dir dist/gp-plugin --print-system-prompt 2>/dev/null | head -1`, conditionally skipped if `claude` is unavailable.

**IMP-2: `plugin/CLAUDE.md` may never be loaded for marketplace-installed plugins**
(holistic, software-architecture)
Research (`claude-plugin-root-scope.md`) concludes CLAUDE.md discovery walks up from user cwd, not from the plugin cache. The file likely serves no purpose in marketplace installs. Options: (a) verify it loads under `--plugin-dir` and note marketplace as a known limitation, (b) move universal instructions into `plugin/skills/_shared/cli-usage.md` and skip root CLAUDE.md, or (c) add a brief note that it exists for `--plugin-dir` dev/testing only.

**IMP-3: `plugin/skills/_shared/cli-usage.md` creates merge/overlap concern with repo `skills/_shared/`**
(holistic — dead file concern, software-architecture — merge concern, typescript-javascript — namespace concern)
Three reviewers flagged this from different angles:
- The file has no consumer until slice 06 copies skills into the plugin — it could drift if binary path patterns change in slices 03-05.
- `plugin/skills/_shared/` partially overlaps with the repo's existing `skills/_shared/references/`. Slice 06 must merge these directories — the plan should document this dependency.
- Whether these are intentionally separate namespaces or will merge needs clarification.

Options: (a) defer creation to slice 06 where it can be verified alongside consuming skills, or (b) keep it now but add a forward-looking note documenting the slice 06 merge requirement.

### MINOR Issues

**MIN-1: `.goodplan-dev` sentinel created but has no consumer until slice 04**
(holistic — no verification tests it, software-architecture — ordering concern, repo-tooling — premature artifact)
Three reviewers flagged this. The sentinel file is created and gitignored, but hooks that read it don't exist yet. Options: (a) defer file creation to slice 04, only add the `.gitignore` entry now, or (b) keep both but add verification: `ls .goodplan-dev` and `git status --porcelain .goodplan-dev` (confirms exists and is ignored).

**MIN-2: `--sourcemap` flag on `bun build --compile` — intent unclear and output unverified**
(holistic, typescript-javascript)
`--sourcemap` with `--compile` writes `.map` files alongside the binary. The plan's directory listing and verification don't mention these files. Clarify whether `.map` files should ship in the plugin distribution or be excluded. If intentional for debugging, add a comment; if not, drop the flag.

**MIN-3: Build script `--define` quoting should match existing pattern explicitly**
(typescript-javascript)
The plan shows `--define __GOODPLAN_VERSION__=\"$VERSION\"` but doesn't match the exact quoting from `install-skills.sh` (`--define "__GOODPLAN_VERSION__=\"$VERSION\""`). Misquoting produces an identifier instead of a string literal. Show the exact shell quoting in the plan.

**MIN-4: Build script validation fallback could silently pass with a broken plugin**
(repo-tooling)
When `claude` CLI is unavailable, fallback checks only file existence and execute permission. Add `jq . dist/gp-plugin/.claude-plugin/plugin.json > /dev/null` (validates JSON) and `dist/gp-plugin/binaries/macos-arm64/gp --version` (validates binary runs) to the fallback path.

**MIN-5: `plugin/skills/_shared/` auto-discovery behavior unverified**
(repo-tooling)
Claude Code plugin auto-discovery treats each `skills/` subdirectory with a `SKILL.md` as a skill. `_shared/` has no `SKILL.md` so it won't register as a skill, but cross-skill shared references via `${CLAUDE_PLUGIN_ROOT}/skills/_shared/cli-usage.md` may not be resolvable from skill content. Needs verification.

### DIRECTLY_ACTIONABLE

- **IMP-1**: Add `claude --plugin-dir` load test to Phase 1 Expected Behavior (conditional on `claude` availability)
- **IMP-2**: Add note that `plugin/CLAUDE.md` is for `--plugin-dir` dev/testing only, with known marketplace limitation
- **IMP-3**: Add forward-looking note documenting the `plugin/skills/_shared/` merge requirement for slice 06
- **MIN-1**: Add `.goodplan-dev` verification checks (existence + gitignore), or defer file creation to slice 04
- **MIN-2**: Clarify `--sourcemap` intent with a comment, or remove the flag
- **MIN-3**: Show exact shell quoting for `--define` matching `install-skills.sh` pattern
- **MIN-4**: Add JSON validation and binary smoke test to build script fallback path

### RESEARCH_NEEDED

- **MIN-5**: Verify that `${CLAUDE_PLUGIN_ROOT}/skills/_shared/cli-usage.md` is resolvable from skill content in Claude Code plugin auto-discovery (repo-tooling flagged as CODEBASE_EXPLORATION)

### Contradictions Resolved

**IMP-3 consolidation**: holistic said the `_shared/cli-usage.md` file is "dead" and should be deferred; software-architecture said it's "architecturally sound" but needs a merge note; typescript-javascript asked for namespace clarification. These aren't contradictory — the file's architecture is reasonable, but it currently has no consumer and creates a merge dependency. Resolved by presenting both options (defer vs. keep with documentation).

**MIN-1 consolidation**: holistic wanted verification added; repo-tooling wanted the file deferred entirely. Not contradictory — both are valid approaches. Presented as options.

### Unresolved (USER_INPUT required)

None. All issues have directly actionable or research-based resolutions.
