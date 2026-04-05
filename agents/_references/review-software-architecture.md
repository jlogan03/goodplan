# Software Architecture Review Criteria

Domain-specific evaluation criteria for the software architecture reviewer. Evaluates structural design: module boundaries, dependency relationships, layering, and how well the proposed architecture supports the system's requirements over time. Does NOT evaluate code quality within modules (language reviewers handle that) or infrastructure concerns. Focuses on the shape of the system — how the pieces fit together.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Module/package structure and dependency graph (imports, package.json workspaces)
- Public API surfaces of each module — what's exported vs internal
- Existing architectural patterns (layering, hexagonal/ports-and-adapters, event-driven, plugin systems)
- Dependency direction — do high-level modules depend on low-level modules or vice versa?
- Shared types, interfaces, and data transfer objects — where they live and who depends on them
- Configuration and dependency injection patterns
- Existing architectural documentation (ADRs, architecture diagrams, README sections)
- Maturity table in `architecture/_overview.md` under `## Subsystem Maturity`
- `architecture/invariants.md` if it exists

## Evaluation Criteria

1. **Module boundaries**: Are responsibilities clearly assigned and well-separated?
   Consider: each module should have a single, well-defined purpose. Boundaries should align with domain concepts, not implementation convenience. Signs of trouble: modules named "utils," "helpers," "common" that grow unbounded; modules that need to know about each other's internals. Narrow public APIs with deep implementations are preferable to broad, shallow modules.

2. **Dependency direction and leaky abstractions**: Do dependencies flow in the right direction, and do abstractions hide their implementation details?
   Consider: high-level policy modules should not depend on low-level detail modules — invert with interfaces where needed. Circular dependencies indicate unclear boundaries. The dependency graph should form a DAG. Core business logic should have zero dependencies on frameworks, databases, or I/O. Watch for leaky abstractions: implementation details bleeding through module interfaces.

3. **Coupling and cohesion**: Is related code together and unrelated code apart?
   Consider: high cohesion within modules, low coupling between modules. Watch for: data classes shared across many modules creating implicit coupling, shotgun surgery, feature envy.

4. **Layering and separation of concerns**: Are architectural layers clean?
   Consider: clear separation between domain logic, application/orchestration logic, and infrastructure/I/O. No business rules in controllers/handlers. No database queries in domain logic. Each layer should be independently testable.

5. **Extension points and flexibility**: Can the system evolve without major rewrites?
   Consider: clear seams where new behavior can be added. But also — is the architecture over-engineering? Premature abstractions and speculative generality are as harmful as rigid designs.

6. **Data flow and state management**: Is it clear how data moves through the system?
   Consider: data ownership, data transformation pipeline clarity, state mutation boundaries, event/message flow, caching strategy and cache invalidation boundaries.

7. **Testability**: Does the architecture support effective testing?
   Consider: can each module be tested in isolation? Are dependencies injectable? Does the architecture enable fast unit tests and focused integration tests?

8. **Module depth**: Are modules "deep" (small interface hiding significant complexity) or "shallow" (large interface with thin implementation)?
   Consider: count the public methods/exports vs the internal complexity they hide. Deep modules are easier to use correctly and harder to misuse.

9. **Caller friction**: Where do callers experience friction when using modules?
   Consider: do callers need to bounce between multiple files? Do they need to understand internal details to use the API correctly? High caller friction indicates a leaky or shallow abstraction.

10. **Test boundary alignment**: Are test boundaries aligned with module boundaries?
    Consider: tests that reach deep into module internals suggest the module boundary is in the wrong place. Good module boundaries enable testing through the public API.

11. **Deepening opportunities**: What would deepening specific modules enable?
    Consider: identify shallow modules that would benefit from absorbing related complexity. What error handling, retry logic, or coordination is duplicated by callers?

12. **Maturity awareness**: If the document under review modifies a developing, maturing, or foundational subsystem: is there justification? Is there a migration plan for dependents? Are fitness function updates included? Apply escalating scrutiny: light check for Developing, full justification required for Maturing and Foundational.

13. **Verification approach appropriateness**: Do the Expected Behavior items use the most direct verification method? (e.g., phases modifying module boundaries should verify through the public API of affected modules)
