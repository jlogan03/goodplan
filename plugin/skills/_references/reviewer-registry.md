# Reviewer Registry

The orchestrator reads this file to understand the available reviewers and their domains. The orchestrator selects which specialists are relevant based on its understanding of the artifact content and changed files — no keyword matching required.

Each reviewer is defined as an agent in `agents/reviewer-*.md` with domain-specific criteria in `agents/_references/review-*.md`. The agent definition includes the shared review preamble and domain criteria via `@` references.

## Always-On

Select for every review round unless the artifact exclusively involves non-code changes (documentation, content, configuration).

| Reviewer | Focus | Agent | Criteria |
|---|---|---|---|
| Holistic | Goal alignment, completeness, coherence, phasing, verification-first, process quality | `agents/reviewer-holistic.md` | `agents/_references/review-holistic.md` |
| Software Architecture | Module boundaries, dependency direction, coupling/cohesion, layering, data flow, testability, module depth | `agents/reviewer-software-architecture.md` | `agents/_references/review-software-architecture.md` |

## Language Specialists

Select when the changed files or artifact involve that language's ecosystem.

| Reviewer | Focus | Agent | Criteria |
|---|---|---|---|
| TypeScript & JavaScript | Type safety, module design, runtime correctness, framework patterns, bundling, Node.js | `agents/reviewer-typescript.md` | `agents/_references/review-typescript.md` |
| Python | Type hints (mypy/pyright), packaging (pyproject.toml), async patterns, virtual environments, dependency management | `agents/reviewer-python.md` | `agents/_references/review-python.md` |
| Rust | Ownership/borrowing, error handling (Result/Option), unsafe blocks, Cargo patterns, trait design, concurrency | `agents/reviewer-rust.md` | `agents/_references/review-rust.md` |

## Web Specialists

Select when the changed files or artifact involve web applications, APIs, databases, or infrastructure.

| Reviewer | Focus | Agent | Criteria |
|---|---|---|---|
| Backend | API design (REST/GraphQL), auth patterns, database access, middleware, error handling, input validation | `agents/reviewer-backend.md` | `agents/_references/review-backend.md` |
| Frontend | Component patterns, state management, accessibility, performance (bundle size, rendering), responsive design | `agents/reviewer-frontend.md` | `agents/_references/review-frontend.md` |
| Data Layer | Schema design, migrations, query patterns, indexing, connection pooling, data integrity | `agents/reviewer-data-layer.md` | `agents/_references/review-data-layer.md` |
| DevOps & Infrastructure | Containerization, infrastructure-as-code, deployment strategies, secrets management, monitoring, scaling | `agents/reviewer-devops.md` | `agents/_references/review-devops.md` |

## AI Tooling Specialists

Select when the changed files or artifact involve agent skills or MCP servers.

| Reviewer | Focus | Agent | Criteria |
|---|---|---|---|
| Agent & Skill | SKILL.md structure, triggering, progressive disclosure, agent compatibility, prompt quality | `agents/reviewer-agent-skill.md` | `agents/_references/review-agent-skill.md` |
| MCP Server | MCP protocol compliance, tool definitions, resource handling, transport patterns, security | `agents/reviewer-mcp-server.md` | `agents/_references/review-mcp-server.md` |

## Cross-Cutting Specialists

Select when the changed files or artifact touch project-level concerns, user-facing interfaces, or CI/CD.

| Reviewer | Focus | Agent | Criteria |
|---|---|---|---|
| TUI & CLI | Terminal UI, CLI argument design, input handling, output formatting, cross-platform compatibility | `agents/reviewer-tui-cli.md` | `agents/_references/review-tui-cli.md` |
| Repo, Tooling, & Docs | Project structure, build config, linting, hooks, dependencies, documentation | `agents/reviewer-repo-tooling.md` | `agents/_references/review-repo-tooling.md` |
| CI & GitHub Workflows | Workflow structure, triggers, pinning, security, caching, artifacts, maintainability | `agents/reviewer-ci-github-workflows.md` | `agents/_references/review-ci-github-workflows.md` |
| UX & Information Architecture | Information architecture, user flows, navigation, content hierarchy, interaction patterns | `agents/reviewer-ux-ia.md` | `agents/_references/review-ux-ia.md` |
| API Contract | Public interfaces, backward compatibility, versioning, contract testing, error response standards | `agents/reviewer-api-contract.md` | `agents/_references/review-api-contract.md` |

## Scientific Specialists

Select when the changed files or artifact involve scientific computing, numerical methods, ML, or data processing.

| Reviewer | Focus | Agent | Criteria |
|---|---|---|---|
| Algorithm & Numerical | Algorithmic complexity, numerical stability, precision, edge cases, correctness | `agents/reviewer-algorithm-numerical.md` | `agents/_references/review-algorithm-numerical.md` |
| Performance | Profiling, memory allocation, concurrency, caching strategies, I/O optimization | `agents/reviewer-performance.md` | `agents/_references/review-performance.md` |
| ML Pipeline | Data preprocessing, feature engineering, model training, evaluation metrics, deployment, reproducibility | `agents/reviewer-ml-pipeline.md` | `agents/_references/review-ml-pipeline.md` |
| Data & I/O | Data format handling (CSV, JSON, Parquet), streaming, ETL patterns, data validation, schema evolution | `agents/reviewer-data-io.md` | `agents/_references/review-data-io.md` |
