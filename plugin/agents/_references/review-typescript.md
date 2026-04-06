# TypeScript & JavaScript Review Criteria

<!-- Canonical reference for TypeScript/JavaScript reviewer agents -->

Domain-specific evaluation criteria for the TypeScript and JavaScript reviewer. Evaluates type safety, module patterns, tooling, and runtime correctness. Does NOT evaluate general plan structure (the holistic reviewer handles that) or non-TypeScript/JavaScript concerns. For new web projects, TypeScript should be used instead of JavaScript unless there is a specific reason not to.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:

- tsconfig.json strictness settings (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax)
- Package manager (npm, pnpm, yarn, bun) and lockfile strategy — for new projects where no package manager is already established, prefer pnpm unless otherwise specified
- Module system (ESM vs CJS, "type": "module" in package.json, file extensions)
- Framework patterns (React hooks/components, Next.js app router, Express middleware, etc.)
- Existing type patterns (utility types, branded types, discriminated unions, generics usage)
- Testing framework (vitest, jest, playwright, cypress) and test conventions
- Bundler configuration (vite, webpack, esbuild, tsup, rollup) and output targets

## Evaluation Criteria

1. **Type safety**: Does the plan maintain strong typing throughout?
   Consider: strict mode compliance, generic types over any/unknown escape hatches, discriminated unions for state modeling, avoiding type assertions (as) where type guards or narrowing work, branded/opaque types for domain identifiers, template literal types for string patterns, satisfies operator for type checking without widening, conditional types and mapped types for derived types, noUncheckedIndexedAccess handling for array/object access. Use a schema validation library (e.g., Zod) to validate data at runtime in two cases: (1) at complex module or service boundaries, where TypeScript types alone disappear at runtime and cannot catch malformed API responses or inter-service data; (2) for all user-provided input (form data, URL parameters, request bodies, file uploads, CLI arguments) to ensure validity and safety. When Zod schemas exist, infer TypeScript types from them (`z.infer<typeof schema>`) rather than maintaining separate type definitions — a single source of truth prevents schema/type drift.

2. **Module design**: Does the plan structure modules for maintainability and performance?
   Consider: barrel exports (index.ts) and their tree-shaking implications, circular dependency risks between modules, tree-shakeability of exported APIs, ESM/CJS interop issues (default vs named exports, __dirname alternatives), import type for type-only imports with verbatimModuleSyntax, module boundary design and public API surface, path aliases and their build tool support.

3. **Runtime correctness**: Does the plan avoid JavaScript runtime pitfalls?
   Consider: type coercion traps (== vs ===, falsy values, Number/parseInt edge cases), async/await error handling (unhandled rejections, missing try/catch), Promise patterns (Promise.all vs Promise.allSettled, sequential vs parallel), event loop blocking (CPU-intensive sync operations), closure and this binding issues, prototype chain surprises, generator and iterator protocol correctness.

4. **Framework patterns**: Does the plan follow framework conventions correctly?
   Consider: component lifecycle and cleanup (useEffect dependencies, cleanup functions), rendering performance (unnecessary re-renders, memo/useMemo/useCallback usage), state management approach (local state vs context vs external stores), SSR/SSG implications (hydration mismatches, server-only code, client-only APIs), routing patterns, data fetching and caching (SWR, React Query, server components).

5. **Package and bundling**: Does the plan handle dependencies and build output correctly?
   Consider: dependency types (dependencies vs devDependencies vs peerDependencies), bundle size impact of new dependencies, tree-shaking compatibility (sideEffects field, pure annotations), code splitting and lazy loading boundaries, polyfill requirements for target environments, dual CJS/ESM package publishing, declaration file (.d.ts) generation.

6. **Node.js patterns**: If the plan involves server-side code, does it follow Node.js best practices?
   Consider: streams for large data processing (readable, writable, transform, pipeline), worker threads for CPU-intensive operations, graceful shutdown handling (SIGTERM, SIGINT, connection draining), signal handling and process lifecycle, environment variable validation at startup, health check endpoints, clustering and horizontal scaling considerations.

7. **Build and tooling**: Does the plan align with the project's build and quality tooling?
   Consider: tsconfig strictness matching project standards (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes), linter configuration (eslint, biome) and rule alignment, formatting consistency (prettier, biome), build pipeline stages and output targets, source map configuration, watch mode and development server setup, monorepo tooling (turborepo, nx) if applicable. Focus on language-specific correctness of tool configuration — repo-level tooling setup, CI pipeline structure, and cross-language consistency are handled by the Repo, Tooling, & Docs Reviewer.

8. **Verification approach appropriateness**: Do the Expected Behavior items in this domain use the most direct verification method? (e.g., Library/module phases should exercise functions through their public interface, not just check they compile)

9. **Simplicity**: Flag over-engineered abstractions, premature generalization, unnecessary indirection, or custom implementations where well-maintained libraries exist. Plans should use the simplest approach that achieves the requirement.
