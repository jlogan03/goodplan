# API Contract Review Criteria

Domain-specific evaluation criteria for the API contract reviewer. Evaluates public API surface design: contract stability, versioning, backward compatibility, documentation, and error response standards. Does NOT evaluate implementation details behind the API (the backend reviewer handles that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- API surface definitions — OpenAPI specs, GraphQL schemas, protobuf files, TypeScript interfaces
- Versioning strategy — URL path versioning, header versioning, content negotiation
- Existing consumers — who calls these APIs? (internal services, external clients, SDKs)
- Error response format — error codes, error messages, error detail structure
- Breaking change history — changelogs, deprecation notices, migration guides
- Contract tests — consumer-driven contracts, schema validation tests
- SDK generation — auto-generated clients, type definitions

## Evaluation Criteria

1. **Contract stability**: Are API contracts stable and reliable?
   - Changes are additive (new fields, new endpoints) not breaking
   - Removed or renamed fields go through deprecation cycle
   - Optional fields have documented default behavior
   - Nullable vs absent fields distinguished in the contract
   - Response envelope consistent across all endpoints

2. **Versioning**: Is the versioning strategy sound?
   - Versioning strategy chosen and documented (URL, header, or content-type)
   - Version bump criteria defined (what constitutes a breaking change)
   - Multiple versions can coexist during transition periods
   - Sunset policy for deprecated versions
   - Version negotiation handles unknown versions gracefully

3. **Backward compatibility**: Are changes backward-compatible?
   - New required fields not added to existing endpoints
   - Enum values only added (never removed or renamed)
   - Response shape changes are additive
   - Query parameter behavior preserved (new params are optional)
   - Error codes stable (new codes added, existing codes never change meaning)

4. **Documentation**: Is the API well-documented?
   - Every endpoint documented with description, parameters, responses
   - Request and response examples provided
   - Error responses documented with all possible error codes
   - Authentication requirements specified per endpoint
   - Rate limits and quotas documented

5. **Error responses**: Are errors consistent and actionable?
   - Consistent error response structure across all endpoints
   - Machine-readable error codes (not just HTTP status codes)
   - Human-readable error messages for debugging
   - Validation errors identify the specific field and constraint
   - Error responses include request ID for support correlation

6. **Contract testing**: Are contracts verified?
   - Schema validation tests for request and response shapes
   - Consumer-driven contract tests where consumers are known
   - Breaking change detection in CI (schema diff tools)
   - Generated SDKs or type definitions stay in sync
   - Integration tests verify actual API behavior matches contract

## Scoring Guidelines

- Score 9-10: Stable contracts, clear versioning, comprehensive docs, contract tests, backward-compatible changes
- Score 7-8: Good contract stability, documented versioning, minor documentation gaps
- Score 5-6: Some breaking changes without versioning, incomplete documentation, no contract tests
- Score 3-4: Frequent breaking changes, no versioning strategy, poor documentation
- Score 1-2: No API contract definition, undocumented breaking changes, no error standards
