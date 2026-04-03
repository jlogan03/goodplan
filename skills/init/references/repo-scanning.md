# Repo Scanning Heuristics

Reference for Step 2 of the onboard-repo skill. Defines priority order, per-file extraction rules, and fallback strategies for different project types.

## Scanning Priority Order

Scan in this order — each layer adds context that refines the next:

1. **README** — high-level intent, project name, description, tech mentions
2. **Package manifest** — authoritative name, dependencies, scripts, language version
3. **Directory structure** — subsystem boundaries, code organization patterns
4. **Config files** — compiler options, linting rules, formatting, test config
5. **CI files** — build pipeline, deployment targets, environment requirements

## Per-File Extraction Rules

### README (README.md, README.rst, README, readme.md)

| Field | Where to look |
|---|---|
| Project name | First `#` heading, or filename-derived if no heading |
| Description | First paragraph after the heading |
| Tech stack | Look for badges, "Built with", "Tech stack", "Requirements" sections |
| Setup instructions | "Getting started", "Installation", "Setup" sections |
| Architecture clues | "Architecture", "Structure", "How it works" sections |

### package.json (Node/TypeScript)

| Field | Key |
|---|---|
| Project name | `name` (strip `@scope/` prefix) |
| Description | `description` |
| Entry point | `main`, `module`, `exports` |
| Module system | `type` (`"module"` = ESM, absent = CJS) |
| Dependencies | `dependencies` — identify frameworks (express, next, react, etc.) |
| Dev dependencies | `devDependencies` — identify build/test tools (typescript, vitest, jest, eslint, biome) |
| Scripts | `scripts` — identify build (`build`, `compile`), test (`test`, `test:unit`), lint (`lint`, `check`), dev (`dev`, `start`) commands |
| Engine constraints | `engines` — Node version requirements |

### pyproject.toml (Python)

| Field | Where |
|---|---|
| Project name | `[project].name` or `[tool.poetry].name` |
| Description | `[project].description` |
| Python version | `[project].requires-python` |
| Dependencies | `[project].dependencies` or `[tool.poetry].dependencies` |
| Build system | `[build-system].requires` (setuptools, hatch, poetry, flit) |
| Scripts/entry points | `[project.scripts]` |
| Test config | `[tool.pytest]`, `[tool.mypy]`, `[tool.ruff]` |

### Cargo.toml (Rust)

| Field | Where |
|---|---|
| Project name | `[package].name` |
| Description | `[package].description` |
| Rust edition | `[package].edition` |
| Dependencies | `[dependencies]` — identify frameworks (actix, tokio, serde, etc.) |
| Workspace members | `[workspace].members` — multi-crate structure |

### go.mod (Go)

| Field | Where |
|---|---|
| Module path | `module` directive — derive project name from last path segment |
| Go version | `go` directive |
| Dependencies | `require` block — identify frameworks (gin, echo, cobra, etc.) |

### pom.xml / build.gradle (Java/JVM)

| Field | Where |
|---|---|
| Project name | `<artifactId>` (Maven) or root project name (Gradle) |
| Group | `<groupId>` (Maven) |
| Java version | `<maven.compiler.source>` or `sourceCompatibility` |
| Dependencies | `<dependencies>` — identify Spring Boot, Jakarta, etc. |
| Build plugins | `<plugins>` — identify build tooling |

### tsconfig.json (TypeScript)

| Field | Key |
|---|---|
| Strictness | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Module system | `module`, `moduleResolution` |
| Target | `target` — ES version |
| Paths | `paths` — module aliases indicate subsystem boundaries |
| Project references | `references` — multi-project structure |

### Linting/Formatting Config

Files: `.eslintrc*`, `eslint.config.*`, `biome.json`, `.prettierrc*`, `ruff.toml`, `.flake8`

Extract: rule overrides, ignored patterns, custom plugins (indicate project-specific conventions).

### CI Config (.github/workflows/*.yml, .gitlab-ci.yml, etc.)

| Field | What to look for |
|---|---|
| Build steps | Language version, install commands, build commands |
| Test steps | Test runner, coverage thresholds |
| Deploy targets | Cloud provider, deployment method |
| Matrix builds | Multiple OS/version support |
| Secrets/env | Required environment variables (names only, not values) |

## Project Type Fallback Strategies

When the primary manifest is missing, fall back through these chains:

### Node/TypeScript

```
package.json → tsconfig.json → src/ → index.ts/index.js
```

If `package.json` is missing but `tsconfig.json` exists, this is still a TypeScript project. If neither exists but `src/` has `.ts` files, infer TypeScript. If `.js` only, infer JavaScript.

### Python

```
pyproject.toml → setup.py → setup.cfg → requirements.txt → src/ or <package-name>/
```

If `pyproject.toml` is missing, check `setup.py` for `install_requires` and `name`. If only `requirements.txt` exists, parse it for dependencies but note that project metadata is missing.

### Rust

```
Cargo.toml → src/main.rs (binary) or src/lib.rs (library)
```

Check for workspace `Cargo.toml` at root with `[workspace]` section — indicates multi-crate project.

### Go

```
go.mod → cmd/ (binary entry points) → internal/ (private packages) → pkg/ (public packages)
```

Multiple directories under `cmd/` indicate a multi-binary project.

### Java/JVM

```
pom.xml → build.gradle → build.gradle.kts → src/main/java/
```

Maven wrapper (`mvnw`) or Gradle wrapper (`gradlew`) indicate the expected build tool.

## Directory Structure Mapping

Map top-level source directories to subsystem candidates:

| Pattern | Likely role |
|---|---|
| `src/api/`, `src/routes/`, `src/handlers/` | API layer |
| `src/db/`, `src/data/`, `src/models/` | Data layer |
| `src/auth/`, `src/security/` | Auth subsystem |
| `src/shared/`, `src/common/`, `src/utils/` | Shared utilities |
| `src/core/`, `src/domain/` | Core business logic |
| `src/cli/`, `src/commands/` | CLI interface |
| `src/ui/`, `src/components/`, `src/pages/` | Frontend |
| `lib/` | Library code (language-dependent) |
| `cmd/` | Go binary entry points |
| `internal/` | Go private packages |
| `packages/`, `crates/` | Monorepo workspace members |
| `tests/`, `test/`, `__tests__/` | Test directory (not a subsystem) |
| `scripts/`, `tools/` | Build/dev tooling (not a subsystem) |
| `docs/` | Documentation (not a subsystem) |
