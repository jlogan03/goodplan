# CI & GitHub Workflows Review Criteria

Domain-specific evaluation criteria for the CI and GitHub workflows reviewer. Evaluates CI/CD pipeline design: workflow structure, trigger configuration, secrets handling, caching, matrix strategies, and artifact management. Does NOT evaluate application code quality (language reviewers handle that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- `.github/workflows/` — all workflow files, reusable workflows, composite actions
- Action versions — pinned to SHA vs tag vs branch
- Secret and environment variable usage — `secrets.*`, `vars.*`
- Cache configuration — dependency caching, build artifact caching
- Matrix strategies — OS, language version, feature combinations
- Job dependencies — `needs`, conditional execution, concurrency groups
- Workflow dispatch inputs — manual triggers, repository dispatch

## Evaluation Criteria

1. **Workflow structure**: Are workflows well-organized?
   - One workflow per concern (CI, deploy, release) not monolithic
   - Reusable workflows and composite actions for shared logic
   - Job names descriptive and consistent
   - Workflow file naming follows conventions
   - `workflow_dispatch` inputs for manual triggers where appropriate

2. **Security**: Are workflows secure?
   - Actions pinned to full SHA (not tags or branches)
   - `permissions` explicitly scoped (not default `write-all`)
   - Secrets not exposed in logs (`add-mask`, no `echo $SECRET`)
   - `pull_request_target` used carefully (no checkout of PR head with write permissions)
   - Third-party actions audited for supply chain risk
   - OIDC used for cloud provider authentication where possible

3. **Caching**: Is caching effective?
   - Dependency caches configured (npm, pip, cargo, etc.)
   - Cache keys include lockfile hash
   - Build artifact caching for multi-job workflows
   - Cache size monitored (10GB limit per repo)
   - Restore keys provide fallback hierarchy

4. **Matrix strategies**: Are matrix builds efficient?
   - Matrix covers required OS/version combinations
   - `fail-fast` configured appropriately (true for quick feedback, false for full coverage)
   - Exclude/include used to customize specific combinations
   - Matrix size balanced against runner costs
   - Required checks aligned with matrix dimensions

5. **Job dependencies**: Are job relationships correct?
   - `needs` graph is acyclic and minimal
   - Conditional jobs use `if` with appropriate context expressions
   - Artifacts passed between jobs with `upload-artifact`/`download-artifact`
   - Concurrency groups prevent redundant runs
   - Status checks required for merge are reliable (not flaky)

6. **Artifact and output management**: Are build outputs handled correctly?
   - Artifacts have appropriate retention periods
   - Outputs passed between jobs via `outputs` (not artifacts for small values)
   - Release assets attached correctly
   - Test reports published (JUnit, coverage)
   - Artifact naming prevents collisions in matrix builds

## Scoring Guidelines

- Score 9-10: Secure, well-structured workflows with proper caching, clear job dependencies, pinned actions
- Score 7-8: Good security practices, effective caching, minor structural improvements possible
- Score 5-6: Some security gaps (unpinned actions), incomplete caching, workflow organization issues
- Score 3-4: Security issues, no caching, monolithic workflows, flaky checks
- Score 1-2: Actions on `main`/`master` branch, secrets in logs, no CI structure
