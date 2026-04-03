# Software Architecture Review — Plan-Slice PoC (Round 2)

## Issues

**[CRITICAL]** Re-entry transition `plan-refined` -> `planning` does not exist in the state machine

Phase 3 states: "Re-refine runs the refinement loop ... Status transitions `plan-refined` -> `planning` before re-refinement, back to `plan-refined` on completion." The state machine transition tables show the only valid transition from `plan-refined` is `BEGIN_IMPLEMENTATION` -> `implementing`. There is no event that moves a slice from `plan-refined` back to `planning` or any other earlier status. This means the re-refine feature as described is impossible without a state machine change.

Options: (a) Add a new `BEGIN_RE_REFINEMENT` event and transition `plan-refined` -> `refining` (requires state machine + commands layer changes -- adds scope to this slice). (b) Reuse `COMPLETE_REFINEMENT_ROUND` from `plan-refined` (would need a new transition row and guard change). (c) Drop re-refine from this PoC slice scope -- the user can manually re-refine by running the installed `/gp:refine-plan` skill (v1.0.3 still works). Option (c) is safest for a PoC.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Refinement-coordinator reviewer discovery mechanism unspecified

Round 1 flagged this and the plan now says the coordinator "selects relevant reviewers from the available set." But HOW the coordinator knows the available set is still unspecified. With only 3 reviewer agents in Phase 1 (`reviewer-holistic.md`, `reviewer-software-architecture.md`, `reviewer-agent-skill.md`), the coordinator must know these exist. Two viable approaches: (a) the orchestrator passes the available reviewer agent names in the coordinator's task prompt, or (b) the coordinator discovers them by convention (`agents/reviewer-*.md`). Option (a) is explicit and testable. The plan should specify which approach.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing `slice:refine-plan` call for multi-round refinement path

Phase 3 says: "After each refinement round: submit via `gp submit-refinement --slice <name> --json` (handles round tracking -> eventually `plan-refined`)." After codebase exploration, `submit-refinement` CAN be called from `plan-created` status (skip path in the state machine), and the state machine correctly transitions to `refining` when scores fail. So the plan's approach works WITHOUT needing an explicit `slice:refine-plan` call. However, the plan should acknowledge this implicit behavior and explain that `submit-refinement` handles both the skip path (`plan-created` -> `plan-refined` on pass) and the loop entry (`plan-created` -> `refining` on fail). As-is, implementers may be confused about how `plan-created` -> `refining` happens without an explicit BEGIN_REFINEMENT call.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Sub-agent return format schema location unclear

Phase 3 task says: "Define sub-agent return format as a Zod schema or TypeScript interface in a shared reference file, referenced by both agent definitions and test harness code." But agent definitions are markdown files loaded by Claude Code at spawn time -- they cannot import TypeScript types. A shared reference file (markdown) can document the format for agents, and a separate TypeScript schema can be used by the test harness for validation. The plan should clarify: (a) the markdown reference file path (likely `skills/_shared/references/sub-agent-return-format.md`), (b) the TypeScript schema file path (likely `tools/dogfood/schemas/` or in `utils.ts`), and (c) that these are two representations of the same contract maintained in sync.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan-phase agent scope crosses file boundaries without clear ownership

The plan-phase agent "Reads architecture files and Q&A output directly" and "Writes plan draft to `<tmpdir>/draft/plan.md`." Phase 3 correctly specifies the orchestrator passes architecture file paths in the task prompt. But the plan-phase agent definition (Phase 1) doesn't mention receiving paths via task prompt -- it says the agent "Reads architecture files and Q&A output directly (sub-agent has Read access)." These descriptions must be consistent: the agent definition should state it receives file paths in the task prompt (orchestrator's responsibility) and reads those specific files (not discovery-based).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `review-preamble.md` content scope overlap with existing `shared-preamble.md`

Phase 1 creates `skills/_shared/references/review-preamble.md` containing "output format, severity levels, score rubric." The installed plugin has `skills/refine-plan/references/shared-preamble.md` with similar content (this very review is using it). The plan correctly notes backward compatibility (existing files remain untouched) and that new files are "canonical for the agent-based pipeline." However, the plan should specify the content source for `review-preamble.md` -- is it a copy of `shared-preamble.md` adapted for `@`-injection, or written from scratch? Specifying the source prevents drift between the two during this transitional period.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `@` reference validation in Phase 2 may produce false negatives for `${CLAUDE_PLUGIN_ROOT}` paths

Phase 2 adds `@` reference path validation: "extract `@${CLAUDE_PLUGIN_ROOT}/...` references from agent `.md` bodies, verify each referenced file exists in `dist/`." The `${CLAUDE_PLUGIN_ROOT}` variable is resolved at runtime by Claude Code, not at build time. The build script would need to strip the `${CLAUDE_PLUGIN_ROOT}/` prefix and check the resulting relative path against `dist/gp-plugin/`. The plan should clarify the exact validation logic: extract the path after `@${CLAUDE_PLUGIN_ROOT}/`, resolve it relative to the dist plugin directory, and check file existence.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Verification sections use different verification strategies inconsistently

Phase 1 verification is manual ("Manually inspect each agent `.md`"). Phase 2 verification is automated ("Run `bun run build:plugin` end-to-end"). Phase 3 verification is manual ("Read through the SKILL.md and trace the orchestrator flow"). Phase 4 verification is automated ("Run `bun tools/dogfood/test-plan-slice.ts`"). For a PoC that establishes patterns, all phases should specify automated verification where possible. Phase 1 frontmatter validation could be covered by Phase 2's build script. Phase 3's orchestrator discipline check could be covered by Phase 4's `verifyOrchestratorDiscipline()`. This isn't blocking but weakens the "verify incrementally" principle.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 2 resolved the round 1 critical issues well (CLI commands are now correct, severity levels align with CRITICAL/IMPORTANT/MINOR). The `canUseTool` clarification for orchestrator discipline checking was a good simplification. However, a new critical issue emerged: the re-entry `plan-refined` -> `planning` transition doesn't exist in the state machine, making the re-refine feature as described impossible. The coordinator reviewer discovery mechanism is still unspecified (carried from round 1 as IMPORTANT). To reach 9+: resolve the re-entry transition issue (likely by deferring re-refine to a later slice), specify the coordinator's reviewer discovery approach, clarify the sub-agent return format dual representation (markdown for agents, TypeScript for tests), and tighten the plan-phase agent description for consistency.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
