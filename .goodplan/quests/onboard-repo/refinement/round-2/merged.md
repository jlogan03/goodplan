# Merged Feedback — onboard-repo Plan (Round 2)

### CRITICAL Issues

**C1. Step 3 (idea.md) runs before Step 4 (init) — `.project/` directory does not exist yet**
Sources: agent-skill (CRITICAL), software-architecture (IMPORTANT)

The plan puts "Step 3: Write `.project/idea.md`" before "Step 4: `goodplan init`". But `goodplan init` creates `.project/`. You cannot `mkdir -p` first because init guards against `.project/` already existing (exit 3). Fix: swap Steps 3 and 4 — init first, then write idea.md. This matches `/create-epic` (init at Step 4, idea.md at Step 5). Affects: Overview step map, Phase 1 SKILL.md skeleton, Phase 1 Expected Behavior.

Resolution: DIRECTLY_ACTIONABLE

---

### IMPORTANT Issues

**I1. Test harness approach lacks design specifics — no file location, framework, SDK setup, or mock strategy**
Sources: agent-skill (IMPORTANT), holistic (IMPORTANT)

The plan says "Automated test invokes the skill via Anthropic Claude SDK test harness" but the codebase has zero existing SDK-based skill tests. Unspecified: (1) test file location (e.g., `tests/integration/onboard-skill.test.ts`?), (2) framework (vitest or standalone script), (3) SDK session config (API key, model, system prompt, tool permissions), (4) how to handle interactive steps (user questions at Steps 7, 8, 12), (5) cost/time budget. Phase 1 says "create the test" and later phases say "extend" without defining extension pattern (new assertions? new test cases?). This is the highest-risk part of the plan because it establishes a pattern other skills will follow. Phase 1 should contain a dedicated task designing the test architecture.

Resolution: DIRECTLY_ACTIONABLE

**I2. Phase 4 quest creation uses `stdin:` notation instead of actual shell command syntax in SKILL.md**
Sources: holistic (IMPORTANT), software-architecture (IMPORTANT), agent-skill (IMPORTANT)

Step 9 says `stdin: '{"name":"<name>","goal":"<goal>"}'` passed to `goodplan quest:create --json`. The `stdin:` parameter is a Bash tool API concept, not shell syntax. SKILL.md is read by the LLM which then invokes the Bash tool — it should show `echo '...' | goodplan quest:create --json` since that is the actual command the LLM will execute. No existing SKILL.md uses `stdin:` notation. The plan should either show the shell command pattern or reference `cli-interaction.md` section 4.

Resolution: DIRECTLY_ACTIONABLE

**I3. Architecture extraction reference says "grep/AST" but no AST tooling is available in Claude Code**
Source: software-architecture (IMPORTANT)

Phase 3's reference describes "build import graph from grep/AST" with TypeScript-specific module semantics (distinguishing `import type` vs value imports, resolving path aliases, tracing barrel re-exports). Claude Code only has Bash, Read, Write, Edit, Grep, and Glob — no TypeScript AST parser. The plan should clarify import graph building uses Grep-based heuristics (regex matching import/export statements), not actual AST parsing. The TypeScript-specific heuristics (path alias resolution from tsconfig, barrel export tracing) are achievable via Grep + Read of tsconfig.json but should be described as such.

Resolution: DIRECTLY_ACTIONABLE

**I4. Phase 5 expertise profiling writes to `~/.claude/projects/<project>/memory/` without specifying project path derivation**
Source: software-architecture (IMPORTANT)

The `<project>` path component is derived from the repo's absolute path with slashes replaced by dashes (e.g., `/Users/iwhite/Repos/myapp` becomes `-Users-iwhite-Repos-myapp`). Since onboard-repo runs in an arbitrary repo, the implementer needs explicit guidance on constructing this path at runtime from `pwd`.

Resolution: DIRECTLY_ACTIONABLE

**I5. `gh pr list --json reviews` only contains top-level review verdicts, not inline code comments**
Source: typescript (IMPORTANT)

Phase 5 expertise profiling specifies `gh pr list --json reviews` for PR analysis. The `reviews` field does NOT contain inline code review comments — those require `gh api repos/{owner}/{repo}/pulls/{number}/comments`. The three-tier data access pattern (list -> view -> API) is mentioned in the task description but must be explicitly documented in `references/expertise-profiling.md` to prevent the LLM from assuming `reviews` is sufficient and producing shallow profiles.

Resolution: DIRECTLY_ACTIONABLE

**I6. Fixture generation script creates local git repo but `gh` CLI commands will fail with no GitHub remote**
Source: agent-skill (IMPORTANT)

The skill heavily uses `gh` CLI for PR data (Phase 2 PR conventions, Phase 5 PR comment analysis). The fixture has no GitHub remote, so `gh pr list` will fail. The plan mentions this briefly in Phase 2 but does not address it as a design decision. The plan should either: (a) explicitly accept this gap and document it as a known test limitation, or (b) design a mock strategy for `gh` responses.

Resolution: DIRECTLY_ACTIONABLE

**I7. Convention detection should detect test runner from config files, not just file patterns**
Source: typescript (IMPORTANT)

Phase 2 Task 1 lists "framework detection (vitest, jest, mocha)" but doesn't specify how. Detection should prioritize config file presence (`vitest.config.ts` > `jest.config.*` > `.mocharc.*`) over package.json script inspection. Additionally detect test-adjacent tooling: coverage configuration, and whether tests use TypeScript natively (via vitest/bun) vs requiring compilation.

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR Issues

**M1. Phase 1 "Before" checks are trivially true and add no signal**
Source: holistic (MINOR-level concern within IMPORTANT issue)

"Before: `skills/onboard-repo/` directory does not exist" tests nothing meaningful for any new file creation. Remove or replace with a substantive check.

Resolution: DIRECTLY_ACTIONABLE

**M2. Architecture interview (Step 7) lacks iteration limits**
Sources: holistic (MINOR), agent-skill (MINOR)

"Iterate until user approves" has no bound. Should be a single confirmation round (present findings, ask for corrections) with a max of 3 exchanges, matching `/create-epic` Step 3's wrap-up heuristic.

Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 5 CLAUDE.md update doesn't specify placement within existing file**
Source: holistic (MINOR)

The `## Project Context` section should go near the top (after any existing frontmatter/title). Reference `/create-epic` Step 9 pattern for placement logic.

Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 5 smoke test has no success criterion for expertise profiling output**
Source: holistic (MINOR)

Expertise profiling is a key differentiator of this skill vs `/create-epic` Mode A but has no smoke test criteria. Add: "expertise memory file exists in `~/.claude/projects/<project>/memory/`".

Resolution: DIRECTLY_ACTIONABLE

**M5. Fixture CJS/ESM incompatibility — CJS `require()` in `.ts` files would be a TypeScript error with `verbatimModuleSyntax`**
Sources: software-architecture (MINOR), typescript (MINOR)

Phase 4 plants CJS `require()` files but Phase 1's fixture uses strict ESM tsconfig. Fix: use `.cjs`/`.mjs` extensions, or `.js` files outside TS compilation. Also ensure fixture `package.json` has `"type": "module"` for coherent ESM configuration.

Resolution: DIRECTLY_ACTIONABLE

**M6. No explicit error recovery policy between steps**
Source: software-architecture (MINOR)

Plan describes re-entry detection but not mid-execution step failure behavior. Should specify: does the skill stop on failure or continue with degraded output? Add per-step error handling like `/create-architecture`'s "retry once, then inform user and continue" pattern.

Resolution: DIRECTLY_ACTIONABLE

**M7. Plan does not specify how to derive project name for `goodplan init --name`**
Source: agent-skill (MINOR)

Should infer from repo (directory name, package.json `name`, or README title) without asking the user.

Resolution: DIRECTLY_ACTIONABLE

**M8. Phase 5 "Update `.project/conventions.md`" task could be confused with skill runtime behavior**
Source: agent-skill (MINOR)

Adding `onboard-repo/` to the goodplan repo's conventions is repo housekeeping, not skill logic. Should be clearly labeled as separate from skill implementation.

Resolution: DIRECTLY_ACTIONABLE

**M9. Overview Step 12 combines CLAUDE.md update and summary as one step but Phase 5 treats them as two concerns**
Source: holistic (MINOR)

Clarify they are two sub-activities of one step, not candidates for separate steps.

Resolution: DIRECTLY_ACTIONABLE

**M10. Hot spot complexity proxy (LOC) is weak for TypeScript**
Source: typescript (MINOR)

Lines of code inflated by type declarations. Add note to deprioritize `.d.ts` files and heavily-typed interface files when presenting hot spots.

Resolution: DIRECTLY_ACTIONABLE

**M11. Migration detection should check config-level signals beyond code patterns**
Source: typescript (MINOR)

Add detection for: `.mts`/`.cts` file extensions, dual `main`+`exports` in package.json, `module: "nodenext"` in tsconfig with CJS code present.

Resolution: DIRECTLY_ACTIONABLE

**M12. `AskUserQuestion` is not a real tool**
Source: software-architecture (MINOR)

Step 7 references `AskUserQuestion` — Claude Code has no such tool. Replace with "present to the user and ask for corrections" as regular conversational output.

Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE

All 20 issues (1 critical, 7 important, 12 minor) are directly actionable.

Count: 20

### RESEARCH_NEEDED

None — all issues have clear fixes based on existing patterns.

Count: 0

### Contradictions Resolved

**1. Step 3/4 ordering severity: CRITICAL vs IMPORTANT**
agent-skill rated this CRITICAL; software-architecture rated it IMPORTANT. Resolved as CRITICAL — agent-skill is the domain specialist for skill execution ordering, and the issue causes a guaranteed Write tool failure (not a quality concern but a hard runtime error). The fix is trivial (swap steps) but the impact of not fixing is a broken skill.

**2. `stdin:` notation fix direction**
Round 1 flagged using `echo` as wrong, pushing toward `stdin:`. Round 2 now flags `stdin:` as wrong, pushing back toward `echo`. agent-skill's analysis is correct: SKILL.md is read by the LLM which executes shell commands via Bash tool, so `echo '...' | goodplan ...` is the correct syntax for SKILL.md regardless of how the Bash tool internally handles stdin.

### Unresolved (USER_INPUT required)

None — all issues are directly actionable with clear resolution paths.
