# Reviewer Registry

The orchestrator reads this file to understand the available reviewers and their domains. The orchestrator selects which specialists are relevant based on its understanding of the plan phase content and changed files — no keyword matching required.

## Always-On

Select for every phase unless the phase exclusively involves non-code changes (documentation, content, configuration).

| Reviewer | Focus | Prompt File | Section | Context |
|---|---|---|---|---|
| Software Architecture | Module boundaries, dependency direction, coupling/cohesion, layering, data flow, testability, module depth | `../../_shared/references/reviewers-cross-cutting.md` | `## Software Architecture Reviewer` | `{review_context}` = `a code implementation` |

## Language Specialists

Select when the changed files or plan phase involve that language's ecosystem.

| Reviewer | Focus | Prompt File | Section |
|---|---|---|---|
| Python | Python idioms, type safety, packaging, testing, async patterns | `reviewers-language.md` | `## Python Reviewer` |
| Rust | Ownership, borrowing, error handling, trait design, unsafe usage, Cargo, concurrency | `reviewers-language.md` | `## Rust Reviewer` |
| C++ | Memory safety, modern C++ idioms, undefined behavior, build systems, templates, ABI | `reviewers-language.md` | `## C++ Reviewer` |
| TypeScript and JavaScript | Type safety, module design, runtime correctness, framework patterns, bundling, Node.js | `reviewers-language.md` | `## TypeScript and JavaScript Reviewer` |

## Scientific Specialists

Select when the changed files or plan phase involve scientific computing, numerical methods, ML, or data processing.

| Reviewer | Focus | Prompt File | Section |
|---|---|---|---|
| Algorithm, Numerical, & Validation | Mathematical correctness, numerical stability, precision, convergence, validation methodology | `reviewers-scientific.md` | `## Algorithm, Numerical, & Validation Reviewer` |
| Performance & Parallelism | Memory layout, parallelization, GPU utilization, benchmarking, cross-language boundaries | `reviewers-scientific.md` | `## Performance & Parallelism Reviewer` |
| ML Pipeline | Data leakage, reproducibility, training pipelines, evaluation methodology, experiment tracking | `reviewers-scientific.md` | `## ML Pipeline Reviewer` |
| Data & I/O | File formats, parsing robustness, serialization, API consumption, 3D data, I/O performance | `reviewers-scientific.md` | `## Data & I/O Reviewer` |

## Web Specialists

Select when the changed files or plan phase involve web applications, APIs, databases, or infrastructure.

| Reviewer | Focus | Prompt File | Section |
|---|---|---|---|
| Backend | Route/service patterns, error handling, security, observability, API performance | `reviewers-web.md` | `## 1. Backend Reviewer` |
| Frontend | Component design, state management, accessibility, visual stability, responsive design | `reviewers-web.md` | `## 2. Frontend Reviewer` |
| Data Layer | Migration safety, schema design, query performance, data integrity, caching | `reviewers-web.md` | `## 3. Data Layer Reviewer` |
| DevOps and Infra | Deployment pipelines, containers, infrastructure as code, secrets, monitoring | `reviewers-web.md` | `## 4. DevOps and Infra Reviewer` |
| Background Jobs & Task Processing | Idempotency, retry, concurrency, scheduling, long-running tasks, queues, observability | `reviewers-web.md` | `## 5. Background Jobs & Task Processing Reviewer` |

## AI Tooling Specialists

Select when the changed files or plan phase involve agent skills or MCP servers.

| Reviewer | Focus | Prompt File | Section |
|---|---|---|---|
| Agent Skill | SKILL.md structure, triggering, progressive disclosure, agent compatibility, prompt quality | `reviewers-ai-tooling.md` | `## Agent Skill Reviewer` |
| MCP Server | Tool schemas, protocol compliance, security, error handling, resource management | `reviewers-ai-tooling.md` | `## MCP Server Reviewer` |

## Cross-Cutting Specialists

Select when the changed files or plan phase touch project-level concerns that span domains, include any user-facing interface (web, mobile, desktop, or terminal), or include CLI/TUI interfaces.

| Reviewer | Focus | Prompt File | Section | Context |
|---|---|---|---|---|
| UX & Information Architecture | Information architecture, task flow, visual hierarchy, accessibility, feedback, consistency, edge cases | `../../_shared/references/reviewers-cross-cutting.md` | `## UX & Information Architecture Reviewer` | `{review_context}` = `a code implementation` |
| TUI and CLI | Terminal UI, CLI argument design, input handling, output formatting, cross-platform compatibility | `../../_shared/references/reviewers-cross-cutting.md` | `## TUI and CLI Reviewer` | `{review_context}` = `a code implementation` |
| Repo, Tooling, & Docs | Project structure, build config, linting, hooks, dependencies, documentation | `../../_shared/references/reviewers-cross-cutting.md` | `## Repo, Tooling, & Docs Reviewer` | `{review_context}` = `a code implementation` |
| CI & GitHub Workflows | Workflow structure, triggers, pinning, security, caching, artifacts, maintainability | `../../_shared/references/reviewers-cross-cutting.md` | `## CI & GitHub Workflows Reviewer` | `{review_context}` = `a code implementation` |
| API Contract | Public interfaces, backwards compatibility, versioning, contract testing | `../../_shared/references/reviewers-cross-cutting.md` | `## API Contract Reviewer` | `{review_context}` = `a code implementation` |
