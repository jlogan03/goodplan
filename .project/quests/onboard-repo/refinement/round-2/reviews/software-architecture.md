# Software Architecture Review — onboard-repo Plan (Round 2)

## Issues

**[IMPORTANT]** Step 3 writes idea.md before Step 4 runs `goodplan init` — the `.project/` directory may not exist yet
The plan's Overview says "Step 3: idea.md, Step 4: init" — the skill writes `.project/idea.md` before `goodplan init` creates the `.project/` directory. The skill must either: (a) create `.project/` via `mkdir -p .project/` before Step 3, (b) reorder so `goodplan init` runs before idea.md is written, or (c) have Step 3 write idea.md to a temp location and move it after init. Option (b) is cleanest — it matches the pattern in `/create-epic` where `goodplan init` (Step 4) runs before `idea.md` is written (Step 5). The current ordering will cause a Write tool failure because the target directory does not exist.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 quest creation uses incorrect stdin piping syntax
Phase 4 Step 9 specifies: `stdin: '{"name":"<name>","goal":"<goal>"}' passed to goodplan quest:create --json`. This notation (`stdin:`) is not valid shell syntax — it is an internal SKILL.md convention used in skills to indicate data piped to stdin. However, the plan text doesn't show the actual Bash tool invocation pattern. Existing skills use `echo '...' | goodplan quest:create --json` for the actual command. More critically, the plan should specify the exact Bash tool call pattern since the implementer will need to construct it. Looking at how `/create-plan` and `/complete` invoke CLI commands with stdin, they use the Bash tool's stdin approach: `echo '{"name":"...","goal":"..."}' | goodplan quest:create --json`. The plan should match this pattern for clarity.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Architecture extraction reference proposes TypeScript-specific AST analysis without specifying tooling
Phase 3's `references/architecture-extraction.md` task says to "build import graph from grep/AST" and describes TypeScript-specific module semantics (distinguishing `import type` vs value imports, resolving path aliases, tracing barrel re-exports). The grep approach is feasible but the "AST" part is unspecified — what AST tooling? The skill runs inside Claude Code where the available tools are Bash, Read, Write, Edit, Grep, and Glob. There is no TypeScript AST parser available. The plan should clarify that import graph building uses Grep-based heuristics (regex matching `import` and `export` statements), not actual AST parsing. The current wording "grep/AST" is ambiguous and an implementer might waste time trying to set up AST tooling. The TypeScript-specific heuristics (path alias resolution from tsconfig, barrel export tracing) are achievable via Grep + Read of tsconfig.json but should be described as such.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 expertise profiling writes to `~/.claude/projects/<project>/memory/` without specifying how to derive the project path
The two-layer expertise protocol requires writing to `~/.claude/projects/<project>/memory/expertise_<domain>.md`. The `<project>` path component is derived from the repo's absolute path with slashes replaced by dashes (e.g., `/Users/iwhite/Repos/myapp` becomes `-Users-iwhite-Repos-myapp`). The plan references `expertise-tracking.md` correctly but doesn't mention this path derivation. Since the onboard-repo skill runs in an arbitrary repo, the implementer needs explicit guidance on constructing this path. The expertise-tracking.md reference file itself may cover this, but the plan should at minimum note that the project memory path must be derived from `pwd` at runtime.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 architecture interview uses `AskUserQuestion` which is not a real tool
Steps 7 says "Present findings to user via AskUserQuestion." Claude Code does not have an `AskUserQuestion` tool — communication with users is done by outputting text directly and waiting for a response. Several existing skills (e.g., `/create-architecture`, `/create-epic`) simply present information and ask questions as regular conversational output. The plan should say "present to the user and ask for corrections" without referencing a nonexistent tool name.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 migration detection fixture plants CJS-to-ESM coexistence but the fixture in Phase 1 already specifies ESM-only configuration
Phase 1's fixture generation script creates a repo with `tsconfig.json` using ESM module resolution and `verbatimModuleSyntax`. Phase 4 then adds "some files using `require()`/`module.exports` (CJS) and some using `import`/`export` (ESM)". With `verbatimModuleSyntax` enabled in tsconfig, CJS-style `require()` calls in `.ts` files would be a TypeScript compilation error. The fixture should either: (a) use `.cjs`/`.mjs` file extensions for the coexistence pattern, (b) have the CJS files be `.js` files outside the TypeScript compilation, or (c) plant a different migration pattern that is compatible with the strict tsconfig (e.g., old-style namespace imports vs named imports, or class-based vs functional patterns). This is a test fidelity issue — the planted migration should be realistic.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No explicit error recovery between steps — if Step 6 fails, does Step 7 still run?
The plan describes re-entry detection (check if artifacts exist and skip) but does not describe what happens when a step fails mid-execution (not on re-entry, but during the first run). For a 13-step skill, the plan should specify the error propagation policy: does the skill stop on any step failure, or does it continue with degraded output? For example, if git history analysis fails (Step 6 maturity estimation), can the skill still proceed to architecture interview (Step 7) with "unknown" maturity? Existing skills like `/create-architecture` specify per-step error handling ("retry once, then inform user and continue"). The plan should adopt the same pattern.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan has addressed all critical issues from round 1: `goodplan init` vs Write tool responsibilities are now clear, the fixture uses a script-generated temp directory instead of a checked-in nested repo, CLAUDE.md update is included (Step 12), quest creation constraints are correctly handled (multiple quests in `created` status), expertise-tracking.md is explicitly referenced, shallow-clone detection is present, step numbering is locked at 0-12, and re-entry handling is present throughout. The remaining issues are important but not structural — they concern step ordering (init before idea.md), implementation specificity (grep vs AST, stdin syntax, project path derivation), and test fidelity (CJS in a strict ESM fixture). To reach 9+: fix the Step 3/4 ordering, clarify grep-only import analysis, specify the Bash invocation pattern for quest creation, add project memory path derivation guidance, fix the CJS/ESM fixture incompatibility, and add per-step error handling policy.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
