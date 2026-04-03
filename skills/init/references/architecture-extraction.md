# Architecture Extraction Reference

Rules for identifying subsystems, mapping dependencies, estimating maturity, and detecting deployment context from an existing codebase.

## 1. Subsystem Identification

A **subsystem** is a cohesive module with a clear boundary — it owns a domain concept and has identifiable entry points or consumers.

### Source directories

Scan for top-level source directories:

```bash
ls -d src/*/ lib/*/ app/*/ cmd/*/ internal/*/ packages/*/ 2>/dev/null
```

### Workspace detection

Check for monorepo workspaces:

```bash
# package.json workspaces field
cat package.json | grep -A 10 '"workspaces"' 2>/dev/null

# pnpm workspaces
cat pnpm-workspace.yaml 2>/dev/null

# Cargo workspaces
grep -A 10 '\[workspace\]' Cargo.toml 2>/dev/null

# Go workspaces
grep -A 10 'use' go.work 2>/dev/null
```

Each workspace member is a subsystem candidate.

### Candidate heuristics

A directory is a **candidate subsystem** when multiple signals converge. No single signal is sufficient — use a preponderance of evidence:

| Signal | Weight | Detection |
|---|---|---|
| Entry point file | Strong | Has `index.ts`, `mod.ts`, `mod.rs`, `__init__.py`, `main.go` |
| Cross-directory imports | Strong | Other directories import from this one (Grep for `from './<dir>/` or `from '@/<dir>/`) |
| Distinct domain naming | Medium | Directory name maps to a clear domain concept (api, auth, db, billing, scheduler) |
| File count ≥ 2 | Weak | At least 2 non-test source files (necessary but not sufficient) |
| Own test files | Medium | Has co-located `*.test.*` or `*.spec.*` files |
| Distinct dependencies | Medium | Imports external packages not used elsewhere |

**Threshold**: Require at least 2 signals, one of which must be Strong or Medium. This ensures small but well-structured subsystems (e.g., a 3-file `src/api/` with an index.ts and cross-imports) are detected, while stray utility directories are not promoted.

### Shared/utility directories

Directories named `shared`, `common`, `utils`, `lib`, `helpers`, or `types` are **not** subsystems — they are cross-cutting utilities. Note them as shared infrastructure in the overview but do not assign maturity or list as subsystems.

## 2. Dependency Mapping

Build an import graph showing which subsystems depend on which others.

### TypeScript module semantics

These rules apply when `tsconfig.json` is present:

#### 2a. Resolve path aliases first

Read `tsconfig.json` (and any `extends` base configs) to extract `compilerOptions.paths`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@api/*": ["./src/api/*"]
    }
  }
}
```

When scanning imports, expand aliases before determining the target subsystem. For example, `import { handler } from '@api/routes'` resolves to `src/api/routes`.

#### 2b. Distinguish import types

| Import form | Meaning | Graph edge type |
|---|---|---|
| `import { Foo } from './bar'` | Value import — runtime dependency | **Runtime** |
| `import type { Foo } from './bar'` | Type-only import — design coupling only | **Type-only** |
| `import { type Foo, bar } from './bar'` | Mixed — has at least one value import | **Runtime** |

Type-only edges indicate design coupling but not runtime dependency. Report both in the graph but visually distinguish them (e.g., dashed vs solid arrows in text representation, or separate columns in a table).

#### 2c. Trace barrel re-exports

Index files often re-export from internal modules:

```typescript
// src/api/index.ts
export * from './routes'
export * from './middleware'
export { createServer } from './server'
```

When an import targets a barrel (index file), trace through to the actual source modules using Grep:

```
Grep pattern: "export \* from|export \{[^}]+\} from" in <subsystem>/index.ts
```

This reveals the true internal structure behind the public API surface.

#### 2d. Dynamic imports

Scan for dynamic `import()` expressions:

```
Grep pattern: "import\(['\"]" or "await import\("
```

Dynamic imports indicate:
- Runtime dependencies (must be in the graph)
- Potential code-splitting boundaries
- Lazy-loaded subsystems (note in the overview)

### General import scanning (non-TypeScript)

For other languages, use equivalent Grep patterns:
- **Python**: `from <pkg> import` and `import <pkg>`
- **Go**: `import "<module>/<pkg>"`
- **Rust**: `use <crate>::<module>` and `mod <name>`

### Building the graph

For each subsystem, Grep its source files for imports pointing to other subsystems:

```
Grep pattern: "from ['\"]\.\./" or "from ['\"]@/" (after alias resolution)
```

Record edges as: `source_subsystem → target_subsystem (runtime|type-only)`.

Present as a dependency table:

| From | To | Type | Key imports |
|---|---|---|---|
| api | db | Runtime | `DbClient`, `query` |
| api | auth | Runtime | `validateToken` |
| api | shared | Runtime | `AppError`, `logger` |
| auth | db | Type-only | `UserRecord` type |

Flag **circular dependencies** — bidirectional runtime edges between subsystems are a code smell worth noting.

## 3. Shallow Clone Detection

Before any git-based analysis, check:

```bash
git rev-parse --is-shallow-repository
```

If `true`:
- Warn: "This is a shallow clone — git history analysis will be limited. Run `git fetch --unshallow` for more accurate maturity estimates."
- Still proceed with available history — partial data is better than none
- Note the limitation in the output (e.g., "Maturity estimates based on limited git history")

This check is also performed in Step 1 pre-flight. Repeat it here as a guard in case Step 6 is invoked independently.

## 4. Maturity Estimation from Git

Maturity levels (matching goodplan convention):

| Level | Description |
|---|---|
| **Mature** | Stable, rarely changes except for maintenance. Low churn, high contributor count, mostly fix commits. |
| **Developing** | Active development, regular changes. Moderate churn, mix of feature and fix commits. |
| **Nascent** | Recently created or very early stage. High churn, few contributors, mostly feature commits. |
| **Unknown** | Insufficient git history to estimate (e.g., shallow clone, new files). |

### 4a. File churn rate

```bash
git log --format='' --name-only -- '<subsystem_path>/' | sort | uniq -c | sort -rn | head -20
```

High total churn across a subsystem suggests active development (Developing) or instability (check commit patterns). Low churn suggests Mature or abandoned.

### 4b. Recency of changes

```bash
git log -1 --format=%ci -- '<subsystem_path>/'
```

- Last change within 30 days → likely Developing
- Last change 30-180 days ago → could be Mature (stable) or stale
- Last change >180 days ago → likely Mature or abandoned (check if still imported)

### 4c. Contributor count

```bash
git log --format='%aN' -- '<subsystem_path>/' | sort -u | wc -l
```

- 3+ contributors → more established, likely Developing or Mature
- 1-2 contributors → could be any maturity; use other signals
- Single contributor + recent + high churn → likely Nascent

### 4d. Commit message patterns

```bash
git log --oneline -50 -- '<subsystem_path>/'
```

Classify commits by prefix/keyword:

| Pattern | Keywords | Signal |
|---|---|---|
| Bug fixes | `fix`, `bug`, `patch`, `hotfix`, `resolve` | High fix ratio → stability issues |
| Features | `feat`, `add`, `implement`, `introduce`, `new` | Active development |
| Refactoring | `refactor`, `restructure`, `reorganize`, `clean` | Maturing codebase |
| Maintenance | `chore`, `deps`, `update`, `bump`, `ci` | Stable maintenance mode |

Compute the fix-to-feature ratio:
- >2:1 fix:feat → lower maturity (stability issues)
- ~1:1 → actively developing
- <1:2 fix:feat → feature-driven growth (Developing or Nascent)

### 4e. Combining signals

Use a weighted combination:

| Signal | Mature | Developing | Nascent |
|---|---|---|---|
| Churn (last 6mo) | Low (<10 commits) | Moderate (10-50) | High (>50) |
| Recency | >90 days ago | 7-90 days ago | <7 days ago |
| Contributors | 3+ | 2+ | 1 |
| Fix:feat ratio | >2:1 | ~1:1 | <1:2 |
| Refactor commits | Present | Some | Rare |

No single signal determines maturity. Use the preponderance of evidence. When signals conflict, lean toward the middle (Developing) and note the ambiguity.

## 5. Deployment Context

Scan for deployment and infrastructure files to understand how the project is deployed:

### Container-based

```bash
ls Dockerfile docker-compose.yml docker-compose.yaml .dockerignore 2>/dev/null
```

If found, read Dockerfile for: base image, exposed ports, build stages, entry point command.

### Kubernetes

```bash
ls -d k8s/ kubernetes/ deploy/ manifests/ charts/ 2>/dev/null
```

If found, note Kubernetes deployment. Scan for service definitions, deployment configs, ingress rules.

### Serverless

```bash
ls serverless.yml serverless.yaml sam.yaml template.yaml netlify.toml vercel.json fly.toml render.yaml 2>/dev/null
```

Note the serverless platform and any function definitions.

### CI/CD

Already scanned in Step 2e. Reference those findings here for the deployment pipeline: build steps, test steps, deploy targets, environment stages (dev/staging/prod).

### Process management

```bash
ls Procfile ecosystem.config.js pm2.config.js 2>/dev/null
```

### Summary

Include deployment context in the architecture overview under a "Deployment Model" section. If no deployment files are found, note: "No deployment configuration detected — deployment model unknown."

## 6. Output Format

The output is `.goodplan/architecture/_overview.md`. Follow this structure:

```markdown
# Architecture Overview

## System Summary

<2-3 paragraph description of the system architecture: what it does, how it's organized, key design decisions visible from the code.>

## Subsystems

### <Subsystem Name>

<1-2 paragraph description: what it does, key files/modules, public API surface.>

**Dependencies:** <comma-separated list of other subsystems it depends on>

### <Next Subsystem>

...

## Key Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| <package> | <version> | <what it's used for> |

<List significant external dependencies from package manifest. Focus on architectural dependencies (frameworks, databases, ORMs, auth libraries), not utilities.>

## Deployment Model

<Deployment context from section 5. Platform, infrastructure, CI/CD pipeline summary.>

## Subsystem Maturity

| Subsystem | Maturity | Dependents | Notes |
|---|---|---|---|
| <name> | <Mature/Developing/Nascent/Unknown> | <which subsystems depend on this one> | <brief justification> |
```

The "Fitness Functions" column from the goodplan project's own overview is project-specific — omit it for onboarded repos unless test infrastructure is detected that maps to specific subsystems.
