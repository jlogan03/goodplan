# Reviewer Registry

The orchestrator reads this file to understand the available reviewers and their domains. The orchestrator selects which specialists are relevant based on its understanding of the plan content — no keyword matching required.

## Always-On

Always selected. Skip Software Architecture only for plans that exclusively involve non-code changes (documentation, content, configuration).

| Reviewer | Focus | Prompt File | Section | Context |
|---|---|---|---|---|
| Holistic | Overall plan structure, goal alignment, completeness, success criteria, verification, cleanup, documentation, tests, simplicity | `reviewers-always.md` | `## Holistic Reviewer` | |
| Software Architecture | Module boundaries, dependency direction, coupling/cohesion, layering, data flow, testability, module depth | `../../_shared/references/reviewers-cross-cutting.md` | `## Software Architecture Reviewer` | `{review_context}` = `an implementation plan` |

## Language Specialists

Select when the plan involves that language's ecosystem — build tools, package managers, testing frameworks, or language-specific patterns.

| Reviewer | Focus | Prompt File | Section |
|---|---|---|---|
| Python | Python idioms, type safety, packaging (pyproject.toml, pip, poetry, uv), testing (pytest), async patterns | `reviewers-language.md` | `## Python Reviewer` |
| Rust | Ownership, borrowing, error handling, trait design, unsafe usage, Cargo ecosystem, concurrency | `reviewers-language.md` | `## Rust Reviewer` |
| C++ | Memory safety, modern C++ idioms, undefined behavior, CMake/build systems, templates, ABI | `reviewers-language.md` | `## C++ Reviewer` |
| TypeScript and JavaScript | Type safety, module design, runtime correctness, framework patterns, bundling, Node.js | `reviewers-language.md` | `## TypeScript and JavaScript Reviewer` |

## Scientific Specialists

Select when the plan involves scientific computing, numerical methods, ML, or data processing.

| Reviewer | Focus | Prompt File | Section |
|---|---|---|---|
| Algorithm, Numerical, & Validation | Mathematical correctness, numerical stability, precision, convergence, ground truth validation, regression testing | `reviewers-scientific.md` | `## Algorithm, Numerical, & Validation Reviewer` |
| Performance & Parallelism | Memory layout, parallelization strategy, GPU utilization, benchmarking, cross-language boundaries | `reviewers-scientific.md` | `## Performance & Parallelism Reviewer` |
| ML Pipeline | Data leakage, reproducibility, training pipelines, evaluation methodology, experiment tracking | `reviewers-scientific.md` | `## ML Pipeline Reviewer` |
| Data & I/O | File format choices, parsing robustness, serialization, API data consumption, 3D model handling, I/O performance | `reviewers-scientific.md` | `## Data & I/O Reviewer` |

## Web Specialists

Select when the plan involves web applications, APIs, databases, or infrastructure.

| Reviewer | Focus | Prompt File | Section |
|---|---|---|---|
| Backend | Route/controller/service patterns, error handling, security, observability, API performance | `reviewers-web.md` | `## Backend Reviewer` |
| Frontend | Component design, state management, accessibility, visual stability, responsive design | `reviewers-web.md` | `## Frontend Reviewer` |
| Data Layer | Migration safety, schema design, query performance, data integrity, caching strategy | `reviewers-web.md` | `## Data Layer Reviewer` |
| DevOps and Infra | Deployment pipelines, containerization, infrastructure as code, secrets, monitoring | `reviewers-web.md` | `## DevOps and Infra Reviewer` |
| Background Jobs & Task Processing | Idempotency, retry logic, concurrency control, scheduling, long-running tasks, queue management, job observability | `reviewers-web.md` | `## Background Jobs & Task Processing Reviewer` |

## AI Tooling Specialists

Select when the plan involves agent skills or MCP servers.

| Reviewer | Focus | Prompt File | Section |
|---|---|---|---|
| Agent Skill | SKILL.md structure, triggering accuracy, progressive disclosure, agent compatibility, prompt quality | `reviewers-ai-tooling.md` | `## Agent Skill Reviewer` |
| MCP Server | Tool schema design, protocol compliance, security, error handling, resource management | `reviewers-ai-tooling.md` | `## MCP Server Reviewer` |

## Cross-Cutting Specialists

Select when the plan touches project-level concerns that span domains, includes any user-facing interface (web, mobile, desktop, or terminal), or includes CLI/TUI interfaces.

| Reviewer | Focus | Prompt File | Section | Context |
|---|---|---|---|---|
| UX & Information Architecture | Information architecture, task flow, visual hierarchy, accessibility, feedback, consistency, edge cases | `../../_shared/references/reviewers-cross-cutting.md` | `## UX & Information Architecture Reviewer` | `{review_context}` = `an implementation plan` |
| TUI and CLI | Terminal UI layout, CLI argument design, input handling, output formatting, cross-platform compatibility | `../../_shared/references/reviewers-cross-cutting.md` | `## TUI and CLI Reviewer` | `{review_context}` = `an implementation plan` |
| Repo, Tooling, & Docs | Project structure, build configuration, linting, hooks, dependency management, documentation | `../../_shared/references/reviewers-cross-cutting.md` | `## Repo, Tooling, & Docs Reviewer` | `{review_context}` = `an implementation plan` |
| CI & GitHub Workflows | Workflow structure, triggers, action pinning, CI security, caching, artifacts, maintainability, testing | `../../_shared/references/reviewers-cross-cutting.md` | `## CI & GitHub Workflows Reviewer` | `{review_context}` = `an implementation plan` |
| API Contract | Public interface design, backwards compatibility, versioning, documentation, contract testing | `../../_shared/references/reviewers-cross-cutting.md` | `## API Contract Reviewer` | `{review_context}` = `an implementation plan` |
