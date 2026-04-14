# Plan Review Criteria

Domain-specific evaluation criteria for the plan reviewer. Evaluates the structural quality of implementation plans — sequencing, completeness, falsifiability, and dependency correctness. Does NOT evaluate technical approach soundness (architecture reviewers) or goal alignment (holistic reviewer).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Files the plan says to create or modify — do they exist? Is the plan's understanding of their current state accurate?
- Dependencies between phases — are prerequisite files/modules actually available at the point where the plan assumes them?
- Test infrastructure — does the project have the test framework and patterns the plan assumes?
- Build and verification tooling — can the plan's verification steps actually run?

## Evaluation Criteria

1. **Phase sequencing**: Are phases ordered so each phase's prerequisites are satisfied by prior phases?
   Consider: a phase that modifies a module should come after the phase that creates it. A phase that writes tests should come after (or within) the phase that creates the code under test. Look for hidden ordering dependencies that the plan doesn't make explicit.

2. **Task completeness**: Does each phase contain all tasks needed to achieve its stated objective?
   Consider: a phase that says "add auth middleware" but only has tasks for the middleware code and no task for wiring it into the router. A phase that creates a new module but doesn't update the barrel export. Missing tasks cause implementation to stall mid-phase.

3. **Expected behavior falsifiability**: Can each expected behavior check actually fail?
   Consider: "the module should work correctly" is not falsifiable. "Running `bun test auth.test.ts` should produce 0 failures" is falsifiable. Each expected behavior should describe a specific observable outcome that can be verified by a concrete action. If a check can't fail, it can't catch regressions.

4. **Chunk definitions**: Are implementation chunks well-scoped and independently verifiable?
   Consider: chunks should be small enough to review in isolation but large enough to be meaningful. A chunk that touches 15 files across 4 subsystems is too large. A chunk that changes one import statement is too small (unless it's a critical change). Each chunk should have its own verification criteria.

5. **Dependency graph validity**: Are inter-phase and inter-chunk dependencies acyclic and correctly declared?
   Consider: circular dependencies between phases make the plan unimplementable. Missing dependency declarations cause phases to fail when prerequisites aren't met. Overly conservative dependencies (everything depends on everything) eliminate parallelism opportunities.

6. **Verification step runnability**: Can the verification steps actually be executed?
   Consider: "run `bun test`" assumes bun is available and tests exist. "Check the UI" assumes a running dev server. Verification steps should be concrete commands or inspections that the implementer can perform. Abstract verification ("ensure quality") is not useful.

7. **Rollback safety**: If a phase fails, can the implementer recover without undoing other phases?
   Consider: phases that make irreversible changes (database migrations, file deletions) should be sequenced carefully. Plans should note when a phase modifies shared state that other phases depend on.

## Examples

**Good (no issues):**
- Each phase has a clear objective, concrete tasks, and falsifiable expected behaviors
- Phase ordering follows a logical dependency chain with no cycles
- Verification steps are concrete commands that can be copy-pasted and run
- Chunks are independently reviewable with their own success criteria

**Bad (CRITICAL):**
- Phase 3 depends on output from Phase 4 (circular or out-of-order dependency)
- A phase references files that don't exist and no prior phase creates them
- Expected behavior says "verify it works" with no concrete check

**Bad (IMPORTANT):**
- Phase has tasks but no expected behavior checks — no way to verify it succeeded
- Chunk scope is too large — modifies 10+ files across multiple subsystems
- Verification step references a test file that doesn't exist and the plan doesn't create it

**Bad (MINOR):**
- Phase naming is inconsistent (some use numbers, some use names)
- Expected behavior is falsifiable but could be more specific
- Dependencies are correct but overly conservative
