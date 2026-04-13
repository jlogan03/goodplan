# Context Transport Review Criteria

Domain-specific evaluation criteria for the context transport reviewer. Evaluates whether artifacts are self-contained for downstream consumption. Does NOT evaluate technical correctness — domain and holistic reviewers handle that.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Every file path referenced in the artifact — verify each one exists at the stated path
- Cross-references to other artifacts (e.g., "see the architecture doc", "as defined in the goal") — verify they resolve
- Terms, acronyms, and project-specific vocabulary used without definition
- The downstream consumer of this artifact type — what context do they need to do their job?

## Evaluation Criteria

1. **File reference validity**: Do all referenced file paths exist?
   Consider: artifacts often reference source files, config files, other artifacts, or documentation. Every path must resolve. A plan that says "modify `src/auth/middleware.ts`" when that file doesn't exist is a CRITICAL issue — the implementer will be confused immediately.

2. **Cross-reference completeness**: Can all cross-references to other artifacts be followed?
   Consider: "as described in the architecture" without a path. "See slice 3 for details" without indicating where slice 3 is defined. "Per the decision in the exploration phase" without a link. Each dangling reference forces the downstream consumer to search for context.

3. **Terminology clarity**: Are domain terms, acronyms, and project-specific vocabulary defined or obvious from context?
   Consider: first use of an acronym should expand it. Project-specific terms (subsystem names, pattern names, tool names) should be explained unless they're standard in the technology domain. A new contributor should be able to read the artifact without prior project knowledge.

4. **Assumption surfacing**: Are implicit assumptions made explicit?
   Consider: "the database supports JSON columns" — is that documented? "We'll use the existing auth middleware" — is there confirmation it exists and does what's assumed? Assumptions that turn out to be wrong at implementation time are expensive.

5. **Downstream actionability**: Can the next phase act on this artifact without asking questions?
   Consider: a plan should be implementable. A goal should be plannable. A slice set should be sequenceable. If a downstream consumer would need to ask "what did you mean by X?" or "where is Y?", that's a context transport failure.

6. **Scope boundary clarity**: Are the boundaries of what's included and excluded clear?
   Consider: non-goals, out-of-scope items, and explicit exclusions help downstream consumers avoid scope creep. Missing scope boundaries lead to ambiguity about what "done" means.

## Examples

**Good (no issues):**
- All file paths verified to exist in the codebase
- Acronyms expanded on first use
- Cross-references include full paths (e.g., "see `.goodplan/epics/auth-epic/architecture.md`")
- Assumptions listed explicitly with verification status
- Non-goals and scope exclusions stated

**Bad (CRITICAL):**
- References a file path that doesn't exist in the codebase
- Depends on an artifact that hasn't been created yet with no indication it's pending
- Uses a project-specific term that's never defined and isn't discoverable

**Bad (IMPORTANT):**
- Cross-references another artifact by name but not by path ("see the architecture doc")
- Makes assumptions about codebase state without verification ("the existing middleware handles this")
- Scope boundaries are vague — downstream consumer can't tell what's in vs. out

**Bad (MINOR):**
- Acronym used without expansion but meaning is clear from context
- Slightly ambiguous phrasing that a careful reader could resolve
