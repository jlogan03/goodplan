# Phase 1: Software Architecture Reviewer Enhancement

Add deep module evaluation criteria to the Software Architecture reviewer prompt. Consolidate the two copies of `reviewers-cross-cutting.md` (refine-plan and implement-plan) into a single shared file at `~/.claude/skills/_shared/references/reviewers-cross-cutting.md`, then symlink or reference from each skill.

### Context

The Software Architecture reviewer currently has 7 evaluation criteria focused on boundaries, dependencies, coupling, layering, extension, data flow, and testability. These criteria touch on module quality but don't explicitly frame evaluation through the deep module lens (small interface hiding significant complexity = good; large interface with thin implementation = shallow/bad). Adding this as criteria 8-11 makes the principle available to every skill that uses the reviewer infrastructure: refine-plan, implement-plan, and the new refine-architecture and audit-architecture skills.

### Tasks

- [x] Verify prerequisite: both `~/.claude/skills/refine-plan/references/reviewers-cross-cutting.md` and `~/.claude/skills/implement-plan/references/reviewers-cross-cutting.md` exist and contain the Software Architecture reviewer section with criteria 1-7
- [x] Consolidate using partial consolidation strategy: The two `reviewers-cross-cutting.md` files differ intentionally in framing — refine-plan's says "for an implementation plan" while implement-plan's says "for a code implementation." To consolidate the criteria without losing skill-specific framing:
  - Create `~/.claude/skills/_shared/references/reviewers-cross-cutting.md` containing the shared evaluation criteria text (items 1-11) with a `{review_context}` placeholder in the framing preamble (e.g., "You are reviewing {review_context}.")
  - The orchestrator resolves the indirection before passing to the sub-agent: each skill's `reviewer-registry.md` points directly to the shared file path with the appropriate `{review_context}` value (e.g., `../../_shared/references/reviewers-cross-cutting.md` with `{review_context}` = `an implementation plan`). The sub-agent receives the fully resolved prompt content — no include stubs or indirection visible to reviewers
  - This keeps criteria in one place (avoiding drift) while preserving the skill-specific framing that makes each reviewer effective in its context
- [x] Read the current Software Architecture reviewer section in the now-shared `reviewers-cross-cutting.md` (lines 57-95)
- [x] Add four new evaluation criteria after the existing 7:

  **8. Module depth**: Are modules "deep" (small interface hiding significant complexity) or "shallow" (large interface with thin implementation)?
  Consider: count the public methods/exports vs the internal complexity they hide. A module with 2-3 public methods that internally manages connection pooling, retry logic, caching, and error recovery is deep. A module with 20 public methods that each do one trivial thing is shallow. Deep modules are easier to use correctly and harder to misuse. When evaluating, look at the ratio of what callers need to know (interface surface) vs what the module handles internally (hidden complexity).

  **9. Caller friction**: Where do callers experience friction when using modules?
  Consider: do callers need to bounce between multiple files to accomplish one task? Do they need to understand internal implementation details to use the API correctly? Do they need to call methods in a specific order that isn't enforced by the interface? High caller friction indicates a leaky or shallow abstraction. The ideal module lets callers accomplish their task with a single, obvious call.

  **10. Test boundary alignment**: Are test boundaries aligned with module boundaries?
  Consider: tests that reach deep into module internals (testing private methods, mocking internal collaborators) suggest the module boundary is in the wrong place. Good module boundaries enable testing through the public API. If you can't test a module without mocking its internals, the module is either too large (split it) or its interface doesn't expose enough to verify behavior (deepen it). Tests coupled to implementation rather than behavior are a red flag.

  **11. Deepening opportunities**: What would deepening specific modules enable?
  Consider: identify modules that are currently shallow and would benefit from absorbing related complexity. What functionality is scattered across callers that could be pulled into the module? What error handling, retry logic, or coordination is duplicated by callers? Deepening a module often eliminates an entire category of bugs by centralizing logic that was previously the caller's responsibility.

- [x] Verify the criteria are correctly placed after criterion 7 and before the closing ``` delimiter
- [x] Update each skill's `reviewer-registry.md` to change the Software Architecture reviewer's Prompt File from `reviewers-cross-cutting.md` to `../../_shared/references/reviewers-cross-cutting.md`. Add a Context column (or metadata block) specifying the `{review_context}` value for that skill (e.g., `an implementation plan` for refine-plan, `a code implementation` for implement-plan). This is the concrete binding mechanism between the registry and the shared file's `{review_context}` placeholder.
- [x] Verify both refine-plan and implement-plan resolve to the shared file (read from each skill's updated registry path, confirm criteria 8-11 appear and `{review_context}` is correctly substituted)

### Verification

- `ls ~/.claude/skills/_shared/references/reviewers-cross-cutting.md` — shared file exists
- Read the shared `reviewers-cross-cutting.md` — confirm criteria 8-11 exist with deep module focus
- `grep -cE "Module depth|Caller friction|Test boundary alignment|Deepening opportunities" ~/.claude/skills/_shared/references/reviewers-cross-cutting.md` returns 4
- Both refine-plan and implement-plan resolve to the shared file (read from each skill's reference path, confirm criteria 8-11 appear)
- Shared file is syntactically valid (opening and closing ``` delimiters match)
