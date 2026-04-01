# Merged Feedback — Round 1

### CRITICAL Issues

1. **[CRITICAL]** `goal-refining.md [02-plan-slice-poc]`: Orchestrator context discipline verification is manual-only with no concrete criteria
   - Source: tracer-bullet-quality
   - The verification says "Inspect orchestrator log -- no Read calls" but provides no regex, tool-call filter, or automated check. The existing `validate.ts` harness has `checkViolation()` that pattern-matches tool calls -- this slice should produce an equivalent automated check rather than relying on manual log inspection.
   - Resolution: DIRECTLY_ACTIONABLE
   - Fix: Add an automated context discipline check to the test harness (slice 01 or 02). Define a `verifyOrchestratorDiscipline()` function that filters tool calls for `Read` on architecture/plan/source files and fails if any are found. Add this as an explicit verification checkbox in slice 02.

---

### IMPORTANT Issues

1. **[IMPORTANT]** `goal-refining.md [03-data-model]`: Overview consolidation scope is underspecified and underestimated
   - Source: software-architecture, architecture-alignment, risk-dependency-analysis (3 reviewers converged)
   - Three separate overview paths with two distinct schemas (`epicOverviewSchema`, `overviewSchema`) must merge into one. The slice says "~10-15 test files" but source files alone are ~16 across schema-registry, 6 transition files, 4 list commands, status, context/priorities, migrate, and complete. The slice goal should: (a) name the new unified schema, (b) note that `schemaRegistry` entries for `quests/overview.json` and `tasks/overview.json` are replaced by a single `overview.json` entry, (c) acknowledge ~30 total files affected (source + test), (d) list the subsystem surface area (Data Layer, State Machine, Commands, RPC Layer).
   - Resolution: DIRECTLY_ACTIONABLE
   - Fix: Expand slice 03 scope description. Name the unified schema. Update file count estimate. Add subsystem surface area list.

2. **[IMPORTANT]** `sequencing-refining.md`: Slice 04 depends on slice 03 but dependency is not declared
   - Source: software-architecture, risk-dependency-analysis (2 reviewers converged)
   - Slice 04 behavior point 7 evaluates `reconsiderWhen` and `validUntil` -- fields added by slice 03. Slice 04 currently depends only on 02. Additionally, slices 04-06 all build skills that invoke CLI commands whose path expectations change in slice 03.
   - Resolution: DIRECTLY_ACTIONABLE
   - Fix: Add 03 as a dependency of 04 in sequencing table. Add a note that slices 04-06 build against the post-slice-03 CLI API surface.

3. **[IMPORTANT]** `goal-refining.md [06-remaining-skills]`: Mega-slice with 9+ deliverables and high blast radius
   - Source: software-architecture, risk-dependency-analysis (2 reviewers converged)
   - Builds 7 skills, deletes 15 old skill directories, updates build/install scripts. No intermediate verification gates. Old skill deletion before full validation is high-risk.
   - Resolution: DIRECTLY_ACTIONABLE
   - Fix: Split slice 06 into two: (a) build remaining skills + verify, (b) delete old skills + update build/install scripts + verify counts. At minimum, add sub-ordering: build -> test -> rename -> delete.

4. **[IMPORTANT]** `goal-refining.md [04-create-epic-pipeline]`: `reconsiderWhen`/`validUntil` evaluation introduced without test coverage
   - Source: software-architecture
   - This is the first slice where these data model fields are consumed by agents. No verification checkbox for validating correct evaluation. Need at least one fixture-based test case.
   - Resolution: DIRECTLY_ACTIONABLE
   - Fix: Add a verification step with a fixture decision containing a `reconsiderWhen` condition that matches the test epic's goal. Assert the agent output mentions it.

5. **[IMPORTANT]** `goal-refining.md [05-implement-pipeline]`: Completion-phase agent serves dual scope without clear interface
   - Source: software-architecture
   - One agent handles slice-level AND epic-level completion based on implicit task prompt mode selection. This is a shallow module risk.
   - Resolution: DIRECTLY_ACTIONABLE
   - Fix: Document the explicit task prompt contract for each mode in the agent definition, specifying what inputs/outputs differ between slice-completion and epic-completion modes.

6. **[IMPORTANT]** `goal-refining.md [02-plan-slice-poc]`: `skills:` frontmatter contradiction in architecture
   - Source: software-architecture
   - Architecture doc contradicts itself (lines 42 vs 69) about `skills:` frontmatter injection. Slice correctly uses `@` references but should add explicit scope boundary note.
   - Resolution: DIRECTLY_ACTIONABLE
   - Fix: Add scope boundary note to slice 02: "Do NOT use `skills:` frontmatter for shared content injection -- use `@` references per verified prototype."

7. **[IMPORTANT]** Slices 03-06 missing Maturity Notes for affected subsystems
   - Source: architecture-alignment (4 instances)
   - Slice 03: State Machine + Commands at "Developing (modified)". Slice 04: State Machine. Slice 05: State Machine. Slice 06: Commands.
   - Resolution: DIRECTLY_ACTIONABLE
   - Fix: Add Maturity Note section to each of slices 03-06 naming affected subsystems and their maturity levels.

8. **[IMPORTANT]** `goal-refining.md [01-test-harness]`: `verifyEntityStatus()` verification step is vague
   - Source: tracer-bullet-quality
   - Does not specify what entity, what skill, what status to expect, or what failure looks like.
   - Resolution: DIRECTLY_ACTIONABLE
   - Fix: Specify: run `test-plugin-skills.ts`, invoke `/gp:project-status`, assert status field equals a specific value.

9. **[IMPORTANT]** `goal-refining.md [03-data-model]`: Overview consolidation verification only exercises `quest:list`/`task:list`
   - Source: tracer-bullet-quality
   - Does not exercise `quest:create`, `task:create`, `quest:show`, `task:show`, or full `assembleState` -> `reduce` -> `commitState` roundtrip. Should name specific integration test files.
   - Resolution: DIRECTLY_ACTIONABLE
   - Fix: Add verification steps for create/show commands and name the specific integration test files that exercise the new overview path.

10. **[IMPORTANT]** `goal-refining.md [04-create-epic-pipeline]` and `[05-implement-pipeline]`: Re-entry testing has no implementable mechanism
    - Source: tracer-bullet-quality (2 instances, same pattern)
    - Agent SDK `query()` runs to completion; no way to interrupt mid-run. Tests are aspirational.
    - Resolution: DIRECTLY_ACTIONABLE
    - Fix: Specify pre-populated fixture approach: create a fixture at "explore-complete" status, invoke skill, verify it picks up at the next phase. Document this pattern in slice 04 and reuse in slice 05.

11. **[IMPORTANT]** `goal-refining.md [07-quality-validation]`: Quality assertions are subjective with no measurable thresholds
    - Source: tracer-bullet-quality
    - "Substantive content", "real issues", "meaningful learnings" are not automatable.
    - Resolution: DIRECTLY_ACTIONABLE
    - Fix: Define concrete proxy metrics: minimum character count, presence of specific structural elements, review outputs containing at least one IMPORTANT/CRITICAL issue.

12. **[IMPORTANT]** `goal-refining.md [05-implement-pipeline]`: Dependency rationale on slice 04 is inaccurate
    - Source: risk-dependency-analysis
    - Rationale says "shares completion-phase agent with complete-epic" but both are built in slice 05. Real dependency is pattern validation (04 proves multi-phase spawning works). Also `review_context: "code-implementation"` is a new context type first exercised here.
    - Resolution: DIRECTLY_ACTIONABLE
    - Fix: Correct the dependency rationale. Note that `review_context: "code-implementation"` is new and reviewer agents need to handle it.

---

### MINOR Issues

1. **[MINOR]** `goal-refining.md [01-test-harness]`: `verifyEntityStatus()` doesn't specify which CLI binary to use
   - Source: software-architecture
   - Fix: Specify installed CLI or configurable CLI path.

2. **[MINOR]** `goal-refining.md [07-quality-validation]`: No rollback/isolation strategy for bug fixes
   - Source: software-architecture
   - Fix: Note that fixes commit to same branch with clear messages referencing originating slice; significant fixes captured as learnings.

3. **[MINOR]** `goal-refining.md [08-documentation]`: Stale reference grep misses renamed skills
   - Source: software-architecture
   - Fix: Add `capture`, `migrate`, `onboard-repo` to the stale reference check.

4. **[MINOR]** `goal-refining.md [02-plan-slice-poc]`: `plugin.json` agents field may not be needed
   - Source: software-architecture
   - Fix: Add verification note: check whether `plugin.json` requires explicit `agents` field or Claude Code auto-discovers.

5. **[MINOR]** `goal-refining.md [02-plan-slice-poc]`: Slice scope bundles agent infrastructure AND plan-slice orchestrator
   - Source: architecture-alignment
   - Acceptable (tracer bullet rationale) but note: if too large during implementation, agent infrastructure could split out.

6. **[MINOR]** `goal-refining.md [03-data-model]`: Three independent changes bundled
   - Source: architecture-alignment
   - Decision provenance, learning validity, overview consolidation are independent. Pragmatic to bundle but risk if overview consolidation is complex.

7. **[MINOR]** `sequencing-refining.md`: Slice 05->04 dependency may be overstated
   - Source: architecture-alignment
   - Implement pipeline's core mechanism was proven in slice 02. Dependency on 04 is soft.

8. **[MINOR]** `sequencing-refining.md`: Slice 07 dependency listed as "01-06" informally
   - Source: risk-dependency-analysis
   - Fix: Change to "01-06 (all prior)" or list explicitly.

9. **[MINOR]** `goal-refining.md [06-remaining-skills]`: Deleted skill name collision test not in verification checklist
   - Source: tracer-bullet-quality
   - Fix: Add explicit checkbox for verifying deleted skill names don't match.

10. **[MINOR]** `goal-refining.md [08-documentation]`: Verification uses raw `grep` instead of test infrastructure
    - Source: tracer-bullet-quality
    - Fix: Add as fitness test `tests/fitness/stale-skill-references.test.ts`.

11. **[MINOR]** `goal-refining.md [01-test-harness]`: Network disconnection test not practically executable
    - Source: tracer-bullet-quality
    - Fix: Mock API client to throw connection error instead of physical network manipulation.

---

### DIRECTLY_ACTIONABLE

1. **Slice 03 scope expansion**: Expand goal to name unified schema, acknowledge ~30 files affected, list all 4 subsystems touched (Data Layer, State Machine, Commands, RPC Layer). Add Maturity Note.

2. **Add 03 as dependency of 04**: Update sequencing table. Add note that slices 04-06 target post-slice-03 CLI API surface.

3. **Split slice 06**: Into (a) build remaining skills + verify, (b) delete old skills + update scripts. Or at minimum add sub-ordering with intermediate gates.

4. **Add Maturity Notes**: To slices 03 (State Machine, Commands), 04 (State Machine), 05 (State Machine), 06 (Commands).

5. **Automate orchestrator discipline check**: Add `verifyOrchestratorDiscipline()` to test harness. Filter tool calls for `Read` on architecture/plan/source files. Add as verification checkbox in slice 02.

6. **Concrete `verifyEntityStatus()` spec**: Specify entity, skill, expected status value, and failure criteria in slice 01.

7. **`reconsiderWhen`/`validUntil` test case**: Add fixture-based verification to slice 04.

8. **Document completion-phase agent modes**: Specify task prompt contract for slice-level vs epic-level in slice 05.

9. **`@` reference scope boundary note**: Add to slice 02: "Do NOT use `skills:` frontmatter."

10. **Re-entry test mechanism**: Specify pre-populated fixture approach for slices 04 and 05.

11. **Quality validation thresholds**: Define measurable proxy metrics for slice 07.

12. **Fix slice 05 dependency rationale**: Correct from "shares completion-phase agent" to "pattern validation." Note new `review_context` type.

13. **Overview consolidation verification**: Add create/show command tests, name specific integration test files in slice 03.

14. **Stale reference grep**: Add `capture`, `migrate`, `onboard-repo` to slice 08 check. Consider making it a fitness test.

---

### RESEARCH_NEEDED

1. **`plugin.json` agents field**: Verify whether Claude Code requires an explicit `agents` field in `plugin.json` or auto-discovers `agents/` directories. Check with `claude plugin validate`. (Source: software-architecture)

2. **`build-plugin.sh` and `plugin.json` existence**: Clarify whether these files need to be created in slice 02 or are expected to exist from the plugin-distribution epic. (Source: architecture-alignment)

---

### Contradictions Resolved

1. **Slice 05->04 dependency strength**: architecture-alignment says the dependency "may be overstated" (soft dependency); risk-dependency-analysis says the dependency rationale "is inaccurate" but the dependency itself is valid (pattern validation). Resolution: trust risk-dependency-analysis on the dependency being valid but for the wrong stated reason. The dependency stays but the rationale needs correction.

2. **Slice 03 file count**: software-architecture says "~10-15 test files feels low"; architecture-alignment says "~20 source files"; risk-dependency-analysis says "~16 source files alone." Resolution: all agree the estimate is too low. Merged to "~30 total files (source + test)."

---

### Unresolved (USER_INPUT required)

None. All issues are resolvable from codebase exploration or direct slice edits.
