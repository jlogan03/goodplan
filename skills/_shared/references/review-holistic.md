# Holistic Review Criteria

Domain-specific evaluation criteria for the holistic reviewer. Evaluates overall plan structure, completeness, and process quality. Does NOT deeply evaluate technical approach within specific domains — specialist reviewers handle that.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- That files/functions/components referenced in the artifact actually exist
- That phasing makes sense given the current codebase structure
- That code the artifact will make obsolete is identified for cleanup
- `architecture/invariants.md` — documented system constraints that the document under review must respect
- `architecture/_overview.md` — maturity table with Fitness Functions column, needed for fitness function awareness

## Evaluation Criteria

1. **Goal alignment**: Does every task and phase directly serve the confirmed goal? Flag tangential or scope-creeping tasks.

2. **Clarity**: Are tasks well-defined and unambiguous? Could an implementer follow them without guessing?

3. **Completeness**: Does the artifact cover all aspects needed to achieve the goal? Are there gaps?

4. **Phase ordering and dependencies**: Are phases ordered logically? Are dependencies clear? Could any be parallelized?

5. **Success criteria**: Does each phase have clear, objective success criteria for determining when the phase is complete?

6. **Verification-first completeness**: Does every phase have an Expected Behavior section with concrete, runnable before/after checks?
   a. **Concrete and falsifiable** — Both before and after halves present with specific expected outputs. Before checks must test something that doesn't exist yet. Before and after should test the same thing with opposite expectations (exception: refactoring phases use structural assertions).
   b. **Runnable and appropriate** — Each check is an executable command/action, not "confirm it works." Verification method matches what's being built (API -> curl, UI -> browser, CLI -> run with args).
   c. **State-aware** — If verification depends on state (database content, input files, queue messages), test data/fixture setup is included.
   d. **Test-inclusive** — When the project has test infrastructure, Expected Behavior items include formal test assertions alongside live verifications.

7. **Documentation**: Does the artifact include tasks for updating documentation?

8. **Code cleanup**: Does the artifact include tasks for removing code that becomes unused? Unused code accumulates silently. IMPORTANT EXCEPTIONS — do NOT recommend removing without flagging for user confirmation: base components, API endpoints (may have external consumers), jobs (may have timing dependencies).

9. **Database backup**: If the artifact modifies a production database with user data, it should include a backup step BEFORE those changes. Flag as CRITICAL only when there is real risk of data loss. For development databases or fresh schemas, a backup note is sufficient as MINOR.

10. **Simplicity and design**: Complexity is the limiting resource. Flag unnecessary complexity:
    - Over-engineered abstractions, premature generalization, or unnecessary indirection
    - Custom implementations where well-maintained open-source libraries exist
    - Module boundaries that are too wide or too shallow
    - GUIs where a CLI, API, or script would suffice
    - Unnecessary new dependencies

11. **Invariant compliance**: If `architecture/invariants.md` exists, check that the artifact doesn't violate any documented invariant. If an invariant must be amended, flag it as requiring explicit justification and an invariant update step.

12. **Fitness function awareness**: If the document under review changes a subsystem with documented fitness functions, check that it includes steps to update or verify those tests. Flag proposed changes that silently break existing fitness functions.

13. **Risk identification**: Are there risks, assumptions, or external dependencies that could derail the plan? Are mitigations documented?

14. **Coherence**: Do all parts of the artifact tell a consistent story? Are there contradictions between phases, between goals and tasks, or between the overview and the details?
