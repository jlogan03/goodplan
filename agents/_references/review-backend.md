# Backend Review Criteria

Domain-specific evaluation criteria for the backend reviewer. Evaluates backend service design: API patterns, authentication, database access, middleware, error handling, and input validation. Does NOT evaluate frontend concerns (the frontend reviewer handles that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Route/handler definitions — organization, middleware chains, request/response patterns
- Authentication and authorization — JWT, session management, RBAC, middleware guards
- Database access patterns — ORM usage, raw queries, connection management
- Input validation — schema validation (Zod, Joi, Pydantic), sanitization
- Error handling — error middleware, error response format, status code usage
- Logging and observability — structured logging, request tracing, metrics
- API documentation — OpenAPI/Swagger specs, inline documentation

## Evaluation Criteria

1. **API design**: Are endpoints well-designed and consistent?
   - RESTful conventions followed (or GraphQL schema well-structured)
   - Consistent naming, versioning, and URL patterns
   - Appropriate HTTP methods and status codes
   - Pagination, filtering, and sorting for collection endpoints
   - HATEOAS or resource linking where appropriate

2. **Authentication and authorization**: Is the security model sound?
   - Authentication mechanism appropriate for the use case
   - Authorization checks at every protected endpoint (not just at the router level)
   - Token management — expiry, refresh, revocation
   - Secrets never logged, returned in responses, or stored in plaintext
   - CORS, CSRF, and rate limiting configured appropriately

3. **Input validation**: Is all input validated before use?
   - Schema validation at the boundary (request body, query params, path params)
   - Type coercion handled explicitly (not silently)
   - Validation errors return structured, actionable error responses
   - File uploads validated (size, type, content)
   - No SQL injection, XSS, or command injection vectors

4. **Database access**: Are data access patterns safe and efficient?
   - Parameterized queries or ORM methods (no string concatenation)
   - Transactions used for multi-step operations
   - Connection pooling configured and sized appropriately
   - N+1 query patterns detected and resolved
   - Migrations versioned and reversible

5. **Error handling**: Are errors handled consistently?
   - Global error middleware catches unhandled errors
   - Structured error response format with error codes
   - Internal errors never leaked to clients (stack traces, SQL errors)
   - Retryable vs non-retryable errors distinguished
   - Health check endpoints present and meaningful

6. **Observability**: Can the service be monitored and debugged?
   - Structured logging with request correlation IDs
   - Request/response logging at appropriate verbosity
   - Metrics for latency, error rates, throughput
   - Graceful shutdown handling
   - Dependency health checks (database, external services)

## Scoring Guidelines

- Score 9-10: Robust security, comprehensive validation, excellent observability, clean API design
- Score 7-8: Good security and validation, minor observability gaps, consistent API patterns
- Score 5-6: Some security gaps, incomplete validation, limited observability
- Score 3-4: Significant security issues, missing validation, poor error handling
- Score 1-2: No authentication, SQL injection vectors, no error handling
