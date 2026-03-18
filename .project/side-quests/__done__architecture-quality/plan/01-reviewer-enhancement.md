# Phase 1: Software Architecture Reviewer Enhancement

Add deep module evaluation criteria to the Software Architecture reviewer prompt in both refine-plan and implement-plan copies of `reviewers-cross-cutting.md`.

### Context

The Software Architecture reviewer currently has 7 evaluation criteria focused on boundaries, dependencies, coupling, layering, extension, data flow, and testability. These criteria touch on module quality but don't explicitly frame evaluation through the deep module lens (small interface hiding significant complexity = good; large interface with thin implementation = shallow/bad). Adding this as criteria 8-11 makes the principle available to every skill that uses the reviewer infrastructure: refine-plan, implement-plan, and the new refine-architecture and audit-architecture skills.

### Tasks

- [ ] Read the current Software Architecture reviewer section in `~/.claude/skills/refine-plan/references/reviewers-cross-cutting.md` (lines 57-95)
- [ ] Add four new evaluation criteria after the existing 7:

  **8. Module depth**: Are modules "deep" (small interface hiding significant complexity) or "shallow" (large interface with thin implementation)?
  Consider: count the public methods/exports vs the internal complexity they hide. A module with 2-3 public methods that internally manages connection pooling, retry logic, caching, and error recovery is deep. A module with 20 public methods that each do one trivial thing is shallow. Deep modules are easier to use correctly and harder to misuse. When evaluating, look at the ratio of what callers need to know (interface surface) vs what the module handles internally (hidden complexity).

  **9. Caller friction**: Where do callers experience friction when using modules?
  Consider: do callers need to bounce between multiple files to accomplish one task? Do they need to understand internal implementation details to use the API correctly? Do they need to call methods in a specific order that isn't enforced by the interface? High caller friction indicates a leaky or shallow abstraction. The ideal module lets callers accomplish their task with a single, obvious call.

  **10. Test boundary alignment**: Are test boundaries aligned with module boundaries?
  Consider: tests that reach deep into module internals (testing private methods, mocking internal collaborators) suggest the module boundary is in the wrong place. Good module boundaries enable testing through the public API. If you can't test a module without mocking its internals, the module is either too large (split it) or its interface doesn't expose enough to verify behavior (deepen it). Tests coupled to implementation rather than behavior are a red flag.

  **11. Deepening opportunities**: What would deepening specific modules enable?
  Consider: identify modules that are currently shallow and would benefit from absorbing related complexity. What functionality is scattered across callers that could be pulled into the module? What error handling, retry logic, or coordination is duplicated by callers? Deepening a module often eliminates an entire category of bugs by centralizing logic that was previously the caller's responsibility.

- [ ] Apply the same 4 criteria to `~/.claude/skills/implement-plan/references/reviewers-cross-cutting.md`
- [ ] Verify the criteria are correctly placed after criterion 7 and before the closing ``` delimiter

### Verification

- Read both `reviewers-cross-cutting.md` files — confirm criteria 8-11 exist with deep module focus
- `grep -c "Module depth\|Caller friction\|Test boundary alignment\|Deepening opportunities" ~/.claude/skills/refine-plan/references/reviewers-cross-cutting.md` returns 4
- Same grep on implement-plan copy returns 4
- Both files are syntactically valid (opening and closing ``` delimiters match)
