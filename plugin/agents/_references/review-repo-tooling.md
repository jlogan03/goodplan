# Repo, Tooling, & Docs Review Criteria

<!-- Canonical reference for repo, tooling, and docs reviewer agents -->

Domain-specific evaluation criteria for the repo and tooling reviewer. Evaluates project structure, build configuration, developer tooling, and repository setup. Focuses on repo-level concerns — language-specific build details (compiler flags, language idioms, dependency version choices) are handled by language reviewers.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:

- Repo structure and organization (directory layout, naming conventions, monorepo vs single-package)
- Build system and configuration files (Makefiles, build scripts, task runners)
- Linting, formatting, and code quality tools (ESLint, Prettier, Ruff, Clippy, etc.)
- Pre-commit hooks and git configuration (.husky, .pre-commit-config.yaml, .gitignore, .gitattributes)
- CI/CD pipeline configuration (GitHub Actions, GitLab CI, etc.) — for GitHub Actions workflow-specific review, see the CI & GitHub Workflows Reviewer
- Documentation structure (README placement, docs directories, generated API docs)
- Dependency management approach (lockfiles, workspaces, update strategy)

## Evaluation Criteria

1. **Project structure**: Is the proposed structure clean and maintainable?
    Consider: directory naming conventions, separation of concerns across directories, monorepo workspace configuration if applicable, consistent structure across packages/modules, appropriate use of shared directories vs co-location. One-off/prototype code should be separated into `scripts/`, `sandbox/`, or `workspaces/` directories. For new Python projects, prefer uv's recommended directory structure.

2. **Build configuration**: Is the build setup reproducible and efficient?
    Consider: deterministic builds, dependency resolution strategy, workspace/package relationships in monorepos, build caching and incremental build support, cross-platform compatibility, build script clarity and documentation.

3. **Linting and formatting**: Are code quality tools properly configured?
    Consider: rule selection appropriate for the project, consistency across all packages/languages in the repo, auto-fix capability enabled where safe, IDE integration (settings files, recommended extensions), no conflicting rules between tools.

4. **Pre-commit and git hooks**: Are commit-time checks appropriate?
    Consider: hook selection (lint, format, test, commit message), commit message conventions enforced, staged-only checking (not entire repo), performance impact on commit workflow, easy bypass for exceptional cases.

5. **Dependency management**: Are dependencies well-managed?
    Consider: lockfile presence and currency, update strategy (automated PRs, scheduled reviews), security scanning (Dependabot, Snyk, audit commands), license compliance checking, unused dependency detection, pinning strategy (exact vs range), semantic versioning compliance (use Griffe for Python, cargo-semver-checks for Rust to automate semver checks).
    Note: GitHub Actions dependency automation is handled by the CI & GitHub Workflows Reviewer.

6. **Documentation structure**: Is documentation organized and discoverable?
    Consider: README completeness (setup, usage, contributing, architecture overview), contributing guide with conventions and workflow, architecture documentation for complex systems, API documentation generation if applicable (prefer MkDocs + Material for MkDocs for Python projects), changelog maintenance strategy. Design decisions should be documented with supporting evidence (sensitivity analyses, convergence studies); use GitHub issues/PR descriptions or Architecture Decision Records.

7. **Developer experience**: Can a new developer get productive quickly?
    Consider: one-command setup (bootstrap scripts, dev containers), consistent development environment (nvm/pyenv/rustup version files, .tool-versions), useful error messages from build/lint tools, debugging configuration (launch.json, debug scripts), test convenience (watch mode, filtering, parallelism).

8. **License compliance**: Are new dependencies license-compatible with the project?
    Consider: GPL contamination in MIT/Apache projects, LGPL dynamic vs static linking requirements, license compatibility matrix for the full dependency tree, SBOM generation for compliance auditing.

9. **Verification approach appropriateness**: Do the Expected Behavior items / implementation verification evidence in this domain use the most direct verification method? (e.g., Tooling phases should run the tool and verify it produces correct output)
