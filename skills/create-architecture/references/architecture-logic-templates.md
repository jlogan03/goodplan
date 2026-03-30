# Architecture File Templates

## conventions.md

```markdown
# Project Conventions

## Tech Stack
<Language, frameworks, runtimes — specific versions if known>

## Repo Structure
<Directory layout and what goes where>

## Dependency Management
<Package manager, lockfile policy, monorepo tooling if any>

## Code Style
<Linter, formatter, naming conventions, file naming>

## Testing
<Test framework, test types (unit/integration/e2e), coverage expectations>

## Other Conventions
<Logging, error handling, environment variables, other cross-cutting conventions>
```

## architecture/_overview.md

```markdown
# Architecture Overview

## System Summary
<One paragraph: what the system does, main subsystems, and how they relate>

## Subsystems
<Named subsystems and their responsibilities>

## Key Dependencies
<External services, libraries, or systems the product depends on>

## Deployment Model
<How the system is deployed and run>

## Subsystem Maturity

| Subsystem | Maturity | Dependents | Fitness Functions | Notes |
|---|---|---|---|---|
| <subsystem> | Experimental | — | — | <brief description> |
```

## architecture/conventions.md

```markdown
# Architectural Conventions
<!-- This file references and builds on decisions from .goodplan/conventions.md. Synthesize project-level conventions into architectural patterns. -->

## Patterns and Abstractions
<Key patterns: layered architecture, event-driven, CQRS, etc.>

## Module and Boundary Rules
<How subsystems are separated; what can depend on what>

## Cross-Cutting Concerns
<Error handling strategy, logging, observability, auth, config injection>
```

## architecture/data-model.md

```markdown
# Data Model

## Entities
<Core entities and key fields>

## Relationships
<How entities relate>

## Storage
<Database(s), schema migration approach, caching layer if any>
```

## architecture/flows.md

```markdown
# Key Flows

## <Flow Name>
<Step-by-step description: actors, systems, data>

## <Flow Name>
...
```

## architecture/information-architecture.md

```markdown
# Information Architecture

## Content Model
<Types of content and how they are structured>

## Navigation Structure
<Primary and secondary navigation patterns>

## Route Structure
<How routes are organized>
```

## architecture/ui-ux.md

```markdown
# UI/UX Direction

## Design Philosophy
<Guiding principles: minimal, data-dense, opinionated, etc.>

## Layout Patterns
<Key layout choices and recurring UI patterns>

## Component Model
<How UI is decomposed; shared component library if any>

## Interaction Patterns
<Navigation, forms, feedback patterns>
```

## architecture/\<subsystem\>-api.md

```markdown
# <Subsystem> API

## Purpose
<What this subsystem does and who consumes it>

## Interface
<Key types, functions, or endpoints exposed>

## Contracts
<Invariants, preconditions, error conditions>

## Dependencies
<What this subsystem depends on>

## Fitness Functions

<!-- Candidate fitness functions identified during architecture definition. Full entries added as the subsystem matures. Populated by Step 8h. -->
```
