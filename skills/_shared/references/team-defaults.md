# CFS Scientific Software Team Defaults

Default preferences for the CFS Scientific Software team. Apply these based on codebase context:

1. **Codebase already follows a convention listed here** → **enforce it**. New code must be consistent. Flag deviations as IMPORTANT issues unless there is a clearly documented reason to diverge.
2. **Codebase has no established convention** → **use these as defaults**. Flag deviations as IMPORTANT unless the plan documents a justification for the alternative choice.
3. **Codebase uses a different convention** (e.g., black instead of Ruff, mypy instead of ty) → **defer to the existing convention**. Do not recommend switching if it would require significant refactoring.

Source: https://github.com/cfs-energy-internal/scisw-guidelines

## Language Preferences

- **Python** for scripting and interfaces for engineers/scientists
- **Rust** for compiled projects; C++ acceptable only when tightly coupled to a C++ team or dependent on a C++ library with no Rust/Python interface
- **TypeScript** for web projects (not JavaScript)
- **No proprietary languages** (no new MATLAB development)

## Python Tooling

| Category | Default |
|---|---|
| Package manager | uv |
| Linter & formatter | Ruff |
| Type checker | ty |
| Test framework | pytest |
| Test coverage | coverage / pytest-cov (fail CI if coverage decreases) |
| Docstring style | Google-style |
| Documentation site | MkDocs + Material for MkDocs |
| Data models | Pydantic (for validated, serializable data at interfaces) |
| Unit-aware objects | pint |
| Physical constants | scipy.constants (never hardcode) |
| Semver checking | Griffe |

## Web/JS Tooling

| Category | Default |
|---|---|
| Package manager | pnpm |
| Language | TypeScript (not JavaScript) |

## Rust Tooling

| Category | Default |
|---|---|
| Semver checking | cargo-semver-checks |

## Physical Units

- All function arguments and return values that are physical quantities **must have units in docstrings**
- Local variable declarations must have units in an inline comment
- Use SI base units by default
- Comment style: `# [units: meter second^-2]` or concise `# [m]` for obvious SI abbreviations
- Dimensionless quantities: annotate `# [dimensionless]` (not `# [-]` or `# [~]`)
- Non-SI variable names must include unit suffix (e.g., `length_ft`)
- Unit conversion: use `scipy.constants` at highest available precision
- For unit-aware objects: prefer pint

## Version Control & Workflow

- Git + GitHub
- Feature branch / rebase workflow — `main` is always vetted; rebase onto latest `main` before PRs
- Code review required before merging (GitHub branch protection)
  - One reviewer with language/codebase expertise
  - Scientific logic changes require subject-matter expertise reviewer
  - Complex/high-consequence: two reviewers
- Semantic versioning (semver)

## Project Structure

- Separate repositories per project (not monorepo)
- Separate one-off/prototype code into `scripts/`, `sandbox/`, or `workspaces/` directories
- Use uv's recommended directory structure for Python packages

## CI/CD

- GitHub Actions with RunsOn runners
- Every PR: installation/build, linting, type checking, tests — all must pass before merging

## Design Philosophy

- Complexity is the limiting resource — simplest approach that achieves required accuracy and runtime
- "Narrow interfaces, deep implementation" for module boundaries
- Prefer well-maintained open-source dependencies over home-grown solutions
- Separate problem setup from solver in numerics-heavy projects
- Use serializable, validated data models (Pydantic) at complex interfaces
- Save inputs/configuration for reproducibility of past runs
- No GUIs unless required for usability; if needed, decouple UI from physics logic
- Document design decisions with supporting evidence (sensitivity analyses, convergence studies)
