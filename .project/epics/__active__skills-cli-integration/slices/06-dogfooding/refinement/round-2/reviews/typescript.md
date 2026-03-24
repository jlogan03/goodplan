## Issues

**[IMPORTANT]** Phase 1 does not specify `"type": "module"` in package.json for ESM compatibility
Phase 1 task "Initialize TypeScript project" says `bun init` or equivalent and mentions `tsconfig.json` strict settings, but does not specify that `package.json` should include `"type": "module"`. The goodplan project itself uses `"type": "module"` with `verbatimModuleSyntax`, and this is effectively required for the tsconfig setting to work correctly with Node/Bun module resolution. Without it, `.ts` files using `import`/`export` syntax may behave unexpectedly depending on the bundler/runtime context. The `tsconfig.json` task mentions `verbatimModuleSyntax` but the package.json setup task does not mention ESM. Add to the "Initialize TypeScript project" task: ensure `package.json` includes `"type": "module"`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 does not specify Promptfoo as a dependency or how to add it
The target project is described as "a TypeScript eval framework built on Promptfoo." Phase 2 will run `/implement-plan` which writes real TypeScript code importing from Promptfoo. But Phase 1 (bootstrap) does not include a task to `bun add promptfoo` or any other dependency setup. If dependencies are missing when Phase 2's `/implement-plan` runs, `bun tsc --noEmit` will fail with unresolved module errors, and the friction log entry will be about missing dependencies rather than real CLI/skill friction. Either add a task in Phase 1 to install known dependencies (at minimum `promptfoo`, `@anthropic-ai/sdk`), or add a note in Phase 2 that dependency installation is expected as part of `/implement-plan` execution and should not be logged as friction.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 deliberate quest example "add type-check CI step" may be out of scope
Phase 3 suggests "add type-check CI step" as a deliberate quest example. This is a fine quest idea, but it would require CI infrastructure (GitHub Actions or similar) that the nondet-eval repo may not have. A simpler quest that stays within the TypeScript domain — e.g., "add Zod schemas for eval config validation" or "add a test harness" — would exercise the same quest lifecycle without introducing infrastructure concerns unrelated to the dogfooding goal. This is minor since the text says "or similar" and execution will adapt.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 `bun tsc --noEmit` verification does not account for Promptfoo type stubs
If Promptfoo does not ship comprehensive TypeScript declarations (or if the project uses Promptfoo APIs that are loosely typed), `bun tsc --noEmit` may produce type errors that are Promptfoo-specific rather than goodplan-skill-specific. The plan should note that type errors from third-party library declarations should be distinguished from type errors in generated code when logging friction. This ensures friction entries are actionable for goodplan improvements rather than upstream library issues.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 1 issues are well addressed. The plan now includes strict TypeScript configuration (Phase 1), `bun tsc --noEmit` verification after implementation (Phases 2 and 4), correct quest paths, proper skill-vs-CLI annotation for `~~archived~~` paths, user-level skill install before in-project copy, and refined grep patterns. The two IMPORTANT items are genuine gaps — ESM module type and dependency bootstrapping — but they are straightforward to fix. The plan is solid for its purpose: exercising CLI-integrated skills on a real TypeScript project.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
