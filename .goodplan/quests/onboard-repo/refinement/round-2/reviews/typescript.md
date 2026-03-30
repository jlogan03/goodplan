## Issues

**[IMPORTANT]** PR comment analysis uses incorrect `gh pr list --json` fields for author filtering

Phase 5's expertise profiling task specifies `gh pr list --author <user> --limit 20 --json number,title,labels,reviews,reviewDecision` for overview. The `reviews` field in `gh pr list` output includes review objects but not inline code review comments. Per the research (`gh-pr-json-fields.md`), inline review comments require `gh api repos/{owner}/{repo}/pulls/{number}/comments`. The plan correctly documents the three-tier approach (list -> view -> API) in the task description, but the reference file spec (`references/expertise-profiling.md`) should explicitly document this three-tier approach and warn that `reviews` only contains top-level review verdicts, not inline code comments. Without this, the LLM executing the skill may assume `reviews` contains all review detail and skip the API call, producing shallow expertise profiles.

Fix: In Phase 5 Task 1 (expertise-profiling.md spec), add explicit documentation of the three-tier data access pattern: (1) `gh pr list` for overview, (2) `gh pr view {number} --json reviews,comments,body` for per-PR detail, (3) `gh api repos/{owner}/{repo}/pulls/{number}/comments` for inline review comments. Note that the `reviews` field contains review-level data (state, author, body) but NOT inline code comments.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Convention detection Phase 2 should detect test runner from config files, not just file patterns

Phase 2 Task 1 lists "framework detection (vitest, jest, mocha)" under testing conventions but doesn't specify how. The fixture has `vitest.config.ts` and the goodplan project uses vitest with a custom config. Detection should prioritize config file presence (`vitest.config.ts` > `jest.config.*` > `.mocharc.*` > `karma.conf.*`) over package.json script inspection, since config files indicate deliberate setup. Additionally, the heuristics should detect test-adjacent tooling: coverage configuration (`c8`, `istanbul`, `@vitest/coverage-v8` in devDependencies), and whether tests use TypeScript directly (via vitest/bun) or require compilation.

Fix: In Phase 2 Task 1, under the testing conventions category, specify detection priority: (1) config file presence (`vitest.config.ts`, `jest.config.*`, etc.), (2) devDependencies in package.json, (3) test script in package.json. Note that vitest and bun test run TypeScript natively without a separate compile step, which is itself a convention signal.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fixture generation script should set `"type": "module"` in package.json

Phase 1 Task 1 specifies the fixture should have `tsconfig.json` with ESM module resolution and `verbatimModuleSyntax`. For this configuration to be coherent, the fixture's `package.json` must also have `"type": "module"`. Without it, Node.js treats `.js` files as CJS by default, which contradicts the ESM tsconfig settings. This matters because convention detection in Phase 2 should verify `"type": "module"` alignment with the tsconfig module settings — a misalignment is itself a convention finding (possible migration in progress).

Fix: Explicitly include `"type": "module"` in the fixture's `package.json` specification in Phase 1 Task 1.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Hot spot complexity proxy (lines of code) is weak for TypeScript

Phase 5 Task 1 defines hot spots as `churn x complexity` where complexity = lines of code (proxy). For TypeScript, lines of code is a particularly weak proxy because type declarations, interface definitions, and generic signatures inflate line counts without adding behavioral complexity. A file with 200 lines of type definitions has different maintenance characteristics than a file with 200 lines of business logic. A better proxy for TypeScript would be to weight by excluding `import type` lines, `.d.ts` files, and lines that are purely type annotations. However, since this runs in an LLM context where precision is less critical than directional accuracy, this is minor.

Fix: Add a note in Phase 5 Task 1 that for TypeScript projects, the LLM should deprioritize `.d.ts` files and heavily-typed interface files when presenting hot spots, since line count overstates their maintenance burden.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Migration detection should check for dual module system markers beyond code patterns

Phase 4 Task 2's migration detection rules focus on code-level pattern coexistence (CJS `require()` vs ESM `import`). For TypeScript projects, there are additional module system migration signals at the config level: mixed `.mts`/`.cts` file extensions, `tsconfig.json` with `module: "nodenext"` but some files still using CJS patterns, presence of both `main` and `exports` fields in `package.json` (dual package publishing). These config-level signals can indicate a more deliberate, planned migration vs accidental code-level coexistence.

Fix: In Phase 4 Task 2, add config-level migration signals to the detection rules: `.mts`/`.cts` file extensions, dual `main`+`exports` in package.json, and `module: "nodenext"` in tsconfig with CJS code still present.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1's three IMPORTANT TypeScript issues (fixture tsconfig strictness, convention heuristics missing TS detection, import graph lacking TS module semantics) have all been addressed in the current plan. The fixture now specifies full strict settings, convention heuristics include TypeScript-specific detection categories, and architecture extraction documents `import type` handling, path alias resolution, and barrel re-export tracing. The remaining issues are refinements rather than gaps: the PR comment data access pattern needs explicit documentation to prevent shallow expertise analysis, and test runner detection needs a concrete priority order. Addressing the two IMPORTANT items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
