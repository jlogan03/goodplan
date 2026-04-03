# MCP Server Review Criteria

Domain-specific evaluation criteria for the MCP server reviewer. Evaluates MCP (Model Context Protocol) server implementations: protocol compliance, tool schemas, resource handling, and transport patterns. Does NOT evaluate general application architecture (the software architecture reviewer handles that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- MCP server initialization — transport selection, capability negotiation
- Tool definitions — names, descriptions, input schemas (JSON Schema)
- Resource definitions — URIs, MIME types, templates
- Prompt definitions — names, arguments, message templates
- Error handling — MCP error codes, error data, transport errors
- Security boundaries — what the server can access, permission model
- Testing — tool invocation tests, protocol compliance tests

## Evaluation Criteria

1. **Protocol compliance**: Does the server follow the MCP specification?
   - Capability negotiation during initialization is correct
   - Request/response format matches the MCP schema
   - Notification handling follows the protocol
   - Transport layer (stdio, SSE, HTTP) implemented correctly
   - Protocol version compatibility handled

2. **Tool definitions**: Are tools well-designed?
   - Tool names are clear, descriptive, and follow naming conventions
   - Descriptions are actionable (tell the model when and how to use the tool)
   - Input schemas use JSON Schema correctly (types, required fields, descriptions)
   - Output format is consistent and well-structured
   - Tools are atomic (single clear action, not multi-purpose)

3. **Resource handling**: Are resources properly managed?
   - Resource URIs are stable and follow URI template patterns
   - MIME types are correct for the content served
   - Resource listing is efficient (pagination for large sets)
   - Resource subscriptions notify on changes
   - Resource content encoding is appropriate (text vs binary)

4. **Security**: Are security boundaries appropriate?
   - Server access scoped to minimum necessary filesystem/network access
   - User input validated before use in system operations
   - No path traversal, command injection, or SSRF vectors
   - Secrets not exposed through tool outputs or resource content
   - Rate limiting or resource limits for expensive operations

5. **Error handling**: Are errors informative and correct?
   - MCP error codes used correctly (InvalidRequest, MethodNotFound, InternalError)
   - Error messages describe the problem and suggest resolution
   - Partial failures handled gracefully (some tools succeed, others fail)
   - Transport disconnection handled with cleanup
   - Timeout handling for long-running operations

6. **Testing and reliability**: Is the server tested and reliable?
   - Tool invocations tested with valid and invalid inputs
   - Edge cases tested (empty inputs, large inputs, concurrent calls)
   - Protocol-level tests verify MCP compliance
   - Integration tests with a real MCP client
   - Graceful degradation when dependencies are unavailable

## Scoring Guidelines

- Score 9-10: Full protocol compliance, well-designed tools, proper security, comprehensive tests
- Score 7-8: Good compliance, clear tool definitions, minor security or testing gaps
- Score 5-6: Some protocol issues, tool design could improve, limited testing
- Score 3-4: Protocol violations, confusing tool definitions, security concerns
- Score 1-2: Non-compliant, broken tool definitions, no security consideration
