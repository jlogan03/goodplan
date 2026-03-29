# Migration Detection & Tech Debt Heuristics

Reference for onboard-repo Step 8. Provides detection rules for in-flight migrations and accumulated tech debt.

## 1. Pattern Coexistence Detection

In-flight migrations manifest as the **same conceptual operation done two different ways** in the same codebase. Scan for these coexistence pairs:

### Module System: CJS vs ESM

| Signal | Old Pattern (CJS) | New Pattern (ESM) |
|---|---|---|
| Import syntax | `require()`, `module.exports` | `import`/`export` statements |
| File extensions | `.cjs`, `.js` (without `"type": "module"`) | `.mjs`, `.ts`, `.js` (with `"type": "module"`) |
| Config | `"main"` only in package.json | `"exports"` field in package.json |
| tsconfig | `"module": "commonjs"` | `"module": "nodenext"` / `"esnext"` |

**Detection**: Grep for `require(` and `module.exports` across all `.js`, `.cjs`, `.mjs` files. If found alongside ESM `import`/`export` in `.ts`/`.mts` files, and `package.json` has `"type": "module"`, this is a CJS-to-ESM migration in progress.

### Component Style: Class vs Function

| Signal | Old Pattern | New Pattern |
|---|---|---|
| React | `class X extends Component` | `function X()` / arrow with hooks |
| Services | `class FooService` with methods | Standalone exported functions |

**Detection**: Grep for `class .* extends (Component|React\.Component)` and `useState\|useEffect`. If both exist, class-to-function migration likely in progress.

### Async Style: Callbacks vs Promises vs Async/Await

| Signal | Old Pattern | New Pattern |
|---|---|---|
| Error handling | `callback(err, result)` | `try/catch` with `await` |
| Function signature | `function foo(cb: (err, res) => void)` | `async function foo(): Promise<T>` |

**Detection**: Grep for callback patterns (`(err,` or `callback(`) alongside `async function` or `await`. Check if callback-style code is concentrated in older files.

### API Versions

| Signal | Old Pattern | New Pattern |
|---|---|---|
| Route prefixes | `/api/v1/` | `/api/v2/` |
| Client imports | `import { oldClient }` | `import { newClient }` |

**Detection**: Grep for versioned API paths or deprecated import aliases.

## 2. Git Timeline Correlation

For each detected coexistence pair, determine migration direction and progress:

### Timeline Analysis

```bash
# When did the new pattern first appear?
git log --all --diff-filter=A --format='%ci %s' -- '*.mjs' '*.mts'

# Is old pattern still being added to? (regression signal)
git log --all --format='%ci %s' -20 -- '*.cjs'

# Ratio: recent commits touching old vs new pattern files
git log --since='3 months ago' --format='' --name-only | sort | uniq -c | sort -rn
```

### Direction Signals

- **Clear migration**: New pattern appears at a point in time; old pattern receives no new additions after that point — only modifications to existing files.
- **Regression**: Old pattern still receiving new files/functions after new pattern appeared — migration stalled or convention not enforced.
- **Unclear**: Both patterns have been present since early in history — may be intentional (e.g., scripts in CJS, source in ESM).

## 3. Config-Level Migration Signals

These configuration states suggest a migration is in flight:

| Signal | Interpretation |
|---|---|
| `.mts` / `.cts` file extensions present | Explicit module-type disambiguation — CJS/ESM coexistence |
| `package.json` has both `"main"` and `"exports"` | Dual CJS/ESM publishing — transition period |
| `"module": "nodenext"` in tsconfig with `.cjs` files | ESM-first config but CJS legacy remains |
| `"type": "module"` in package.json with `require()` calls | ESM declared but CJS code not fully migrated |
| `esModuleInterop: true` with `verbatimModuleSyntax: true` | Interop bridge alongside strict module syntax |
| Both `.eslintrc` and `biome.json` present | Linter migration in progress |
| Both `jest.config.*` and `vitest.config.*` present | Test framework migration |

## 4. Confidence Scoring

Assign confidence to each detected migration:

### High Confidence

- Clear old/new pattern with git timeline showing transition point
- Config explicitly supports both modes (dual `main`+`exports`, `.mts`/`.cts` extensions)
- README or PR history mentions migration/upgrade

### Medium Confidence

- Coexistence detected but timeline is ambiguous (both patterns present from early history)
- Config suggests transition but no git evidence of deliberate migration
- Only partial pattern match (e.g., one `require()` in a sea of `import`)

### Low Confidence

- Might be intentional stylistic variation rather than migration
- Isolated instances (single file with different pattern)
- Pattern difference is in non-source files (scripts, config, tooling) where coexistence is normal

**Threshold**: Only present High and Medium confidence findings to the user. Log Low confidence findings but do not suggest quest creation.

## 5. Tech Debt Heuristics

Scan for these accumulated debt signals:

### Code-Level Debt

| Signal | Detection | Severity |
|---|---|---|
| TODO/FIXME/HACK comments | Grep for `TODO\|FIXME\|HACK\|XXX\|WORKAROUND` (case-insensitive) | Medium per occurrence; count total |
| Long files | Files over 500 lines (`wc -l`). **Exclude**: `.d.ts` files, files that are >60% type declarations, generated files, lock files | Medium |
| Circular imports | From dependency graph in Step 6 — bidirectional runtime edges | High |

### Test Debt

| Signal | Detection | Severity |
|---|---|---|
| Untested source files | Source files in `src/` with no corresponding test file (check `tests/`, `__tests__/`, co-located `.test.*`, `.spec.*`) | Medium |
| Skeleton tests | Test files where all assertions are `expect(true).toBe(true)` or similar placeholders | High |

### Dependency Debt

| Signal | Detection | Severity |
|---|---|---|
| Unused dependencies | Listed in `package.json` but not imported anywhere in source (Grep for package name in `src/`) | Low |
| Outdated dependencies | Major version behind latest — check if `npm outdated` or `bun outdated` available | Low |
| Duplicate purpose | Multiple packages for the same thing (e.g., `lodash` + `ramda`, `moment` + `dayjs`) | Medium |

### Structural Debt

| Signal | Detection | Severity |
|---|---|---|
| Missing barrel exports | Subsystem directory without `index.ts`/`index.js` entry point | Low |
| Inconsistent error handling | Mix of throw/return patterns, empty catch blocks | Medium |
| Dead code | Exported functions with zero internal importers (not in index files) | Low |

## 6. Presentation Format

Present findings to the user in two categories:

### Migrations (In-Flight Transitions)

```
I detected these potential in-flight migrations:

1. **CJS → ESM migration** (High confidence)
   - Old pattern: `require()`/`module.exports` in scripts/*.cjs
   - New pattern: ESM `import`/`export` in src/**/*.ts
   - Timeline: CJS files committed 60 days ago, ESM files from 50 days onward
   - Scope: 3 CJS files remaining
   → Create side quest / Acknowledge and defer / Skip
```

### Tech Debt

```
I found these tech debt signals:

1. **TODO comments** — 5 occurrences across 3 files
   - src/db/queries.ts:42 — "TODO: add pagination"
   - src/api/handlers.ts:15 — "FIXME: validate auth header"
   → Create side quest / Acknowledge and defer / Skip

2. **Skeleton tests** — 2 test files with placeholder assertions
   → Create side quest / Acknowledge and defer / Skip
```

## 7. Re-Entry

Before running detection, check if quests already exist that match detected items:

```bash
goodplan quest:list --json
```

Parse quest names and goals. If a quest already covers a detected migration or debt item (fuzzy match on name keywords like "esm", "cjs", "migration", "todo", "test"), skip that item and note: "Quest already exists: `<quest-name>`".
