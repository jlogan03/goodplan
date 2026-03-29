## Issues

**[MINOR]** Fixture CJS files should use `.cjs`/`.mjs` extensions or plain `.js` outside TypeScript compilation to avoid `verbatimModuleSyntax` errors

Phase 4 Task 1 specifies planting a half-done CJS-to-ESM migration with "some `.cjs` or `.js` files (outside TS compilation) using `require()`/`module.exports` (CJS) and TypeScript files using `import`/`export` (ESM)." This is correct and well-thought-out. However, the fixture generation script (Phase 1 Task 1) should ensure these CJS files are explicitly excluded from the TypeScript compilation scope (not under `src/` or not matched by `include` in tsconfig). If a `.js` file with `require()` ends up in the tsconfig `include` pattern while `verbatimModuleSyntax` is enabled, TypeScript will error on the CJS syntax. The current plan text says "outside TS compilation" which is the right intent, but this should be reinforced in the fixture generation task as well — the script should place CJS files in a location like `scripts/` or `config/` that falls outside the `src/` tsconfig include.

Fix: In Phase 1 Task 1 (fixture generation script), add a note that CJS files planted for the Phase 4 migration test should be placed outside the `src/` directory (e.g., `scripts/` or project root) to avoid tsconfig `include` conflicts, or use `.cjs` extensions explicitly. Phase 4 Task 1 already handles this well — this is about ensuring Phase 1's fixture structure anticipates it.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Convention detection should detect path alias usage and report it as a convention signal

Phase 2 Task 1 lists "TypeScript-specific detection: tsconfig strictness flags, module system, path aliases from tsconfig `paths`, build tooling, runtime detection, lockfile-based package manager detection." The tsconfig `paths` entry is listed but the heuristic should also verify whether the codebase actually uses those aliases in import statements — a configured-but-unused path alias is noise, while actively used aliases are a strong convention signal. This is a minor refinement since the plan already mentions detecting `paths` in tsconfig.

Fix: In Phase 2 Task 1, under TypeScript-specific detection, add: "Verify alias usage by grepping for alias prefixes (e.g., `@/`) in import statements — report as a convention only if actively used in 3+ files."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Architecture extraction import graph should handle dynamic imports

Phase 3 Task 1 specifies import graph construction with regex matching `import`/`export` statements, `import type` distinction, path alias resolution, and barrel re-export tracing. This covers the common static import patterns well. However, TypeScript projects also use dynamic `import()` expressions for code splitting and lazy loading (e.g., `const mod = await import('./module')`). These are runtime dependency edges that a static regex scan might miss. For the LLM-based grep heuristic approach, a note to also scan for `import(` patterns would improve coverage without adding significant complexity.

Fix: In Phase 3 Task 1, in the import graph heuristics, add: "Also scan for dynamic `import()` expressions (e.g., `await import('./path')`) — these indicate runtime dependencies and potential code-splitting boundaries."

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All IMPORTANT issues from rounds 1 and 2 have been addressed. The fixture now specifies full strict tsconfig settings (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, ESM module resolution). Convention heuristics include comprehensive TypeScript-specific detection categories (tsconfig strictness, module system, path aliases, build tooling, runtime/lockfile detection). Architecture extraction documents `import type` handling, path alias resolution via Read tool, and barrel re-export tracing. The three-tier `gh` API pattern for PR review comments is explicitly documented. Test runner detection has a concrete priority order (config files > devDependencies > scripts). Hot spot analysis notes deprioritizing `.d.ts` and heavily-typed files. Migration detection includes config-level signals. The fixture has `"type": "module"` in package.json. The remaining items are polish-level refinements that would improve robustness but do not represent gaps in the plan's TypeScript coverage.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
