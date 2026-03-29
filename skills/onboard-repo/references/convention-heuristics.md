# Convention Detection Heuristics

Reference for Step 5 (Convention Detection). Provides a dispatch table for language-specific heuristics, then detection rules for each convention category.

## Dispatch Table — Project Type Detection

Scan the repo root for marker files. Multiple markers can match (multi-language project). Apply all matching rule sets.

| Marker File | Project Type | Rule Set |
|---|---|---|
| `tsconfig.json` | TypeScript | TypeScript-specific + general |
| `pyproject.toml` | Python | Python-specific + general |
| `Cargo.toml` | Rust | Rust-specific + general |
| `go.mod` | Go | Go-specific + general |
| `pom.xml` or `build.gradle` | Java | Java-specific + general |

If no markers match, apply general heuristics only and note the gap.

**Known limitation**: Non-TypeScript heuristics (Python, Rust, Go, Java) are included in the dispatch table but are unverified — the fixture and smoke test are both TypeScript projects. A future side quest should add multi-language fixture repos and tests.

---

## 1. Naming Conventions

Detect by sampling up to 20 files under `src/` (or equivalent source directory), prioritizing files with the most git commits.

### File selection

```bash
# Get top 20 most-committed source files
git log --format='' --name-only -- 'src/' | sort | uniq -c | sort -rn | head -20
```

If `src/` has fewer than 5 files, also sample from `lib/`, `app/`, `cmd/`, `internal/`, `packages/`.

### Detection rules

| Convention | Pattern | Detection |
|---|---|---|
| File naming | kebab-case | Files match `[a-z][a-z0-9]*(-[a-z0-9]+)*\.\w+` |
| File naming | camelCase | Files match `[a-z][a-zA-Z0-9]*\.\w+` (mixed case, starts lowercase) |
| File naming | PascalCase | Files match `[A-Z][a-zA-Z0-9]*\.\w+` (starts uppercase) |
| File naming | snake_case | Files match `[a-z][a-z0-9]*(_[a-z0-9]+)*\.\w+` |
| Export naming | Named exports | Grep for `export (function\|const\|class)` — count named vs default |
| Export naming | Default exports | Grep for `export default` — if >50% of files use default, report it |
| Variable naming | camelCase vs snake_case | Sample variable declarations from the top 10 files |

Report the dominant pattern (>60% of sampled files). If mixed, report both with percentages.

---

## 2. Code Structure

### Module organization

| Signal | Detection | Convention |
|---|---|---|
| Barrel exports | `index.ts`/`index.js` files that contain only `export` statements | Uses barrel re-exports |
| Flat structure | All source files directly in `src/` with no subdirectories | Flat module layout |
| Nested structure | `src/` has 2+ subdirectories with files | Nested module layout |
| Monorepo | `packages/` or `workspaces` in package.json | Monorepo with workspaces |

### Import patterns

```bash
# Sample 20 files for import style
# Absolute imports (path aliases or package self-reference)
grep -r "from ['\"]@" src/ --include="*.ts" --include="*.tsx" -l | head -20
# Relative imports
grep -r "from ['\"]\.\." src/ --include="*.ts" --include="*.tsx" -l | head -20
```

Report: primarily relative, primarily absolute (path aliases), or mixed.

---

## 3. Testing Conventions

### Test file location

| Pattern | Detection |
|---|---|
| Co-located | Test files (`*.test.*`, `*.spec.*`) found inside `src/` alongside source |
| Separate `tests/` | Test files found in top-level `tests/` or `test/` directory |
| `__tests__/` dirs | Test files found in `__tests__/` subdirectories within `src/` |

```bash
# Detect test file locations
find . -name "*.test.*" -o -name "*.spec.*" | head -30
```

### Test naming pattern

Count files matching `*.test.*` vs `*.spec.*`. Report the dominant pattern.

### Framework detection

Priority order (check config files first, then package.json):

1. `vitest.config.ts` or `vitest.config.js` exists → **Vitest**
2. `jest.config.*` exists → **Jest**
3. `.mocharc.*` exists → **Mocha**
4. `cypress.config.*` exists → **Cypress** (E2E)
5. `playwright.config.*` exists → **Playwright** (E2E)
6. Fall back to package.json `devDependencies` keys and `scripts` containing test commands

### Coverage configuration

Check for: `c8`, `istanbul`, `v8` coverage in vitest/jest config, `.nycrc`, coverage thresholds in config files.

### Native TypeScript test support

- Vitest or Bun test runner → tests run TypeScript natively (no compilation step)
- Jest with `ts-jest` or `@swc/jest` → TypeScript via transform
- Jest without transform config → likely JavaScript tests only

---

## 4. TypeScript-Specific Detection

Only applies when `tsconfig.json` marker is present.

### Strictness flags

Read `tsconfig.json` and report:

| Flag | Value | Significance |
|---|---|---|
| `strict` | true/false | Baseline strict mode |
| `noUncheckedIndexedAccess` | true/false | Array access returns `T \| undefined` |
| `exactOptionalPropertyTypes` | true/false | Distinguishes `undefined` from optional |
| `verbatimModuleSyntax` | true/false | Explicit import/export syntax |
| `noImplicitAny` | true/false | (Only if `strict` is false — otherwise implied) |

If `tsconfig.json` extends another config (e.g., `"extends": "@tsconfig/strictest"`), note the base and read it if local.

### Module system

| Signal | Detection |
|---|---|
| ESM | `"type": "module"` in package.json, `"module": "ESNext"` or `"NodeNext"` in tsconfig |
| CJS | `"type": "commonjs"` or absent in package.json, `"module": "CommonJS"` in tsconfig |
| Dual | Both `.mts`/`.cts` files present, or `main` + `exports` in package.json |

### Path aliases

Read `tsconfig.json` `compilerOptions.paths`. If aliases are defined (e.g., `"@/*": ["./src/*"]`):

```bash
# Check if aliases are actively used (need 3+ imports to report as convention)
grep -r "from ['\"]@/" src/ --include="*.ts" --include="*.tsx" | wc -l
```

Only report path aliases as a convention if 3+ import statements use them.

### Build tooling

| Tool | Detection |
|---|---|
| Vite | `vite.config.*` exists |
| Webpack | `webpack.config.*` exists |
| esbuild | `esbuild` in package.json scripts or deps |
| tsup | `tsup.config.*` or `tsup` in package.json |
| Bun | `bun build` in package.json scripts, or `bun.lockb` present |
| tsc only | None of the above; `tsc` in build script |

### Runtime detection

| Runtime | Detection |
|---|---|
| Bun | `bun.lockb` present |
| Node | `package-lock.json` or `yarn.lock` or `pnpm-lock.yaml` present (without `bun.lockb`) |
| Deno | `deno.json` or `deno.lock` present |

### Package manager detection (lockfile-based)

| Lockfile | Package Manager |
|---|---|
| `package-lock.json` | npm |
| `yarn.lock` | yarn |
| `pnpm-lock.yaml` | pnpm |
| `bun.lockb` or `bun.lock` | bun |

---

## 5. Python-Specific Detection

Only applies when `pyproject.toml` marker is present.

- **Type checking**: `mypy.ini`, `[tool.mypy]` in pyproject.toml, or `pyrightconfig.json`
- **Linter/formatter**: `[tool.ruff]` in pyproject.toml, `.flake8`, `setup.cfg` with `[flake8]`, `black` in deps
- **Test framework**: `pytest` in deps, `[tool.pytest]` section, `tox.ini`
- **Package manager**: `poetry.lock` → Poetry, `pdm.lock` → PDM, `uv.lock` → uv, `Pipfile.lock` → pipenv

**Known limitation**: Unverified — included for completeness.

---

## 6. Rust-Specific Detection

Only applies when `Cargo.toml` marker is present.

- **Linting**: `clippy.toml` or `[lints.clippy]` in Cargo.toml
- **Formatting**: `rustfmt.toml` or `.rustfmt.toml`
- **Workspace**: `[workspace]` section in Cargo.toml
- **Edition**: `edition` field in `[package]` section

**Known limitation**: Unverified — included for completeness.

---

## 7. Go-Specific Detection

Only applies when `go.mod` marker is present.

- **Linting**: `.golangci.yml` or `.golangci.yaml`
- **Module path**: first line of `go.mod`
- **Project layout**: `cmd/`, `internal/`, `pkg/` directories

**Known limitation**: Unverified — included for completeness.

---

## 8. Java-Specific Detection

Only applies when `pom.xml` or `build.gradle` marker is present.

- **Build tool**: `pom.xml` → Maven, `build.gradle` → Gradle, `build.gradle.kts` → Gradle Kotlin DSL
- **Test framework**: JUnit version from dependencies, TestNG, Mockito
- **Code style**: `checkstyle.xml`, `.editorconfig`, Spotless config

**Known limitation**: Unverified — included for completeness.

---

## 9. Git Conventions

**Prerequisite**: Check the shallow-repo flag from Step 1 pre-flight. If shallow, skip commit message format analysis and note: "Shallow clone — insufficient history for git convention detection. Run `git fetch --unshallow` for full analysis."

### Commit message format

```bash
git log --oneline -50
```

Detect patterns:

| Pattern | Example | Convention |
|---|---|---|
| Conventional Commits | `feat: add login`, `fix(auth): token expiry` | `type(scope): message` |
| Prefix style | `[api] fix timeout`, `[docs] update readme` | `[scope] message` |
| Ticket references | `PROJ-123: fix bug`, `#456 add feature` | Issue/ticket prefix |
| No convention | Mixed formats, no consistent pattern | Freeform |

Report the dominant pattern. If conventional commits, note which types are used (feat, fix, chore, docs, etc.).

### Branch naming

```bash
git branch -r
```

Detect patterns: `feature/`, `fix/`, `feat/`, ticket numbers, kebab-case vs snake_case.

---

## 10. PR Conventions

**Prerequisite**: `{gh_available}` flag from Step 1 must be true. If false, skip entirely and note: "GitHub CLI not available — PR conventions not analyzed."

```bash
gh pr list --limit 20 --json number,title,labels,reviewDecision
```

Detect:

| Signal | Detection |
|---|---|
| PR title format | Same patterns as commit messages (conventional, prefix, ticket) |
| Label usage | Common labels across PRs |
| Review requirements | `reviewDecision` values — are reviews enforced? |
| PR template | `.github/pull_request_template.md` or `.github/PULL_REQUEST_TEMPLATE/` exists |

---

## Output Format

The detected conventions should be written to `.project/conventions.md` following this structure:

```markdown
# Project Conventions

## Tech Stack

- **Language:** <detected language and version>
- **Runtime/Compiler:** <detected runtime>
- **CLI Framework:** <if applicable>
- **Validation:** <if applicable>
- **Test Framework:** <detected test framework>
- <other significant dependencies>

## Repo Structure

```
<abbreviated directory tree showing key directories>
```

## Dependency Management

- **Package manager:** <detected from lockfile>
- **Lockfile:** <committed or not>
- <monorepo tooling if applicable>

## Code Style

- **Linter/Formatter:** <detected tools>
- **Naming:** <detected naming conventions>
- **Imports:** <import style>
- **Strict TypeScript:** <strictness flags if applicable>

## Testing

- **Framework:** <detected framework>
- **Test location:** <co-located / separate / __tests__>
- **Naming pattern:** <*.test.* / *.spec.*>
- <coverage config if detected>

## Other Conventions

- **Error handling:** <patterns detected>
- **Git commits:** <commit message format>
- **Branch naming:** <branch naming pattern>
- <PR conventions if detected>
```

Present each section to the user for confirmation before writing. Omit sections where no conventions were detected.
