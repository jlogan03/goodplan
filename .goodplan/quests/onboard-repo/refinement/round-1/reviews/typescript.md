## Issues

**[IMPORTANT]** Fixture repo tsconfig.json must match project strictness settings

Phase 1 Task 1 creates a synthetic fixture repo with `tsconfig.json` but does not specify which compiler options to include. The goodplan project uses `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, and `verbatimModuleSyntax: true` — all non-default strict settings. The fixture should use these same settings so the convention detection heuristics in Phase 2 have realistic TypeScript strictness signals to detect. Without this, the convention detection logic cannot be verified against a repo that actually exercises those patterns.

Fix: In Phase 1 Task 1 ("Create synthetic fixture repo"), explicitly specify that the fixture's `tsconfig.json` should include the full strict mode settings (`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) and ESM module resolution, matching a realistic modern TypeScript project.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Convention heuristics reference file missing tsconfig strictness detection

Phase 2 Task 1 ("Create references/convention-heuristics.md") lists naming, structure, testing, git, and PR convention categories. It omits TypeScript-specific convention detection that is critical for onboarding TS projects: `tsconfig.json` strictness level, module system (ESM vs CJS via `"type": "module"` in package.json + module/moduleResolution in tsconfig), path aliases, and build tooling (bundler vs tsc vs bun build). These are the first things a developer checks when joining a TypeScript project and are directly relevant to the conventions.md output.

Fix: Add a "TypeScript configuration" category to the convention heuristics covering: tsconfig strictness flags, module system detection (`"type": "module"`, `module`/`moduleResolution` in tsconfig, file extensions), path aliases (`paths` in tsconfig), build tooling (presence of vite/webpack/esbuild/tsup/bun build config), and runtime (Node vs Bun vs Deno detection from lockfiles and config). This should generalize — for Python projects, detect pyproject.toml/mypy/ruff; for Rust, Cargo.toml/clippy. The heuristics doc already covers 5 project types so the pattern is there, but TypeScript-specific signals within those types need explicit enumeration.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Module system detection missing from architecture extraction

Phase 3's architecture extraction (`references/architecture-extraction.md`) describes subsystem identification via directory structure and import graphs. For TypeScript projects, the import graph analysis needs to account for: barrel exports (`index.ts`), path aliases (e.g., `@/lib/...`), and the distinction between `import type` (type-only, no runtime dependency) and regular imports. Treating `import type` as a dependency edge would overstate coupling between subsystems. The plan's "build import graph from grep/AST" note is too vague for TypeScript's module semantics.

Fix: In Phase 3 Task 1, specify that import graph construction for TypeScript projects should: (1) distinguish `import type` from value imports — type-only imports indicate design coupling but not runtime dependency, (2) resolve path aliases from tsconfig `paths` before mapping to subsystems, (3) handle barrel re-exports (`export * from` in index.ts) by tracing through to actual source modules. Note this as a heuristic refinement in the reference file, not a hard requirement — the skill runs in an LLM context where grep-based approximation is acceptable, but the reference should document what to look for.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fixture repo testing setup should use vitest to match goodplan conventions

Phase 1 Task 1 mentions the fixture should have "a test directory with vitest." This is correct but should also specify that tests use the `*.test.ts` naming convention (matching the goodplan project pattern visible in `tests/`), and that there's a `vitest.config.ts` present. This allows Phase 2's testing convention detection to have concrete signals to find.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Package manager detection heuristic should include bun

Phase 2's convention heuristics cover "package.json/pyproject.toml/Cargo.toml" but the plan doesn't specifically mention detecting the package manager from lockfiles. This project uses Bun (visible from `bun-types` in devDependencies and `bun build` in scripts). The heuristics should detect package manager from lockfile presence: `bun.lockb`/`bun.lock` = Bun, `pnpm-lock.yaml` = pnpm, `yarn.lock` = Yarn, `package-lock.json` = npm. This is a standard onboarding signal and easy to detect.

Fix: Add lockfile-based package manager detection to the scanning heuristics reference (Phase 1 Task 3, `references/repo-scanning.md`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Half-done migration fixture should use a TypeScript-native pattern

Phase 4 Task 1 suggests planting "some files using class components and some using function components, or some files using CommonJS and some using ESM." Since the fixture is a TypeScript project (not React), the CJS-to-ESM migration is the better choice — but should be made more specific. Use `require()`/`module.exports` in some files and `import`/`export` in others, with git history showing the ESM files were added more recently. This is a realistic TypeScript migration pattern and directly testable.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured and covers the right high-level flow. The main gap is insufficient TypeScript-specific detail in the convention and architecture detection heuristics. For a skill whose primary job is scanning and understanding repos, the detection rules need to be concrete enough for an LLM to execute reliably. The three IMPORTANT issues address: (1) the fixture not being realistic enough to test TS detection, (2) missing TypeScript configuration convention detection, and (3) import graph analysis lacking TS module semantics. Addressing these would bring the score to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
