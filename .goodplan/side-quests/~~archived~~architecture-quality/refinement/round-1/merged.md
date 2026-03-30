# Merged Feedback — Round 1

## Scores
- Holistic: 6/10
- Software Architecture: 6/10
- Agent Skill: 6/10

## Merged Issues

### IMPORTANT

**I1. Reviewer file duplication — consolidate or sync `reviewers-cross-cutting.md`**
Phase 1 adds criteria 8-11 to two near-duplicate files (refine-plan and implement-plan). Every future change must be applied twice. Consolidate to `_shared/references/` with per-skill framing injected by bootstrap, or add a diff-based sync verification step.
Sources: Software Architecture (primary), Holistic (supporting)
Resolution: DIRECTLY_ACTIONABLE

**I2. Phase 4 refine-architecture duplicates the iteration loop without shared abstraction**
The plan says "same iteration loop as refine-plan" but doesn't specify what's shared vs copied. This creates two copies of ~100 lines of orchestration logic that must evolve together. Define which parts are shared (iteration loop, reviewer bootstrap, synthesis prompt) vs skill-specific (editor prompt, exit criteria, reviewer weighting), and decide on sharing mechanism (shared reference file vs explicit duplication with justification).
Sources: Software Architecture (primary), Holistic (supporting), Agent Skill (supporting — focuses on sub-agent prompt reuse clarity)
Resolution: DIRECTLY_ACTIONABLE

**I3. Phase 5 gap analysis sub-agent scope is unbounded — needs per-file parallelism or scoping**
A single sub-agent exploring the entire codebase against all architecture files will exceed context limits on non-trivial codebases. Split into per-architecture-file sub-agents (matching Phase 4's parallel reviewer pattern), or reuse `codebase-context-discovery.md` from refine-plan, or add explicit depth limits and priority ordering.
Sources: Holistic (primary), Software Architecture (primary), Agent Skill (supporting — flags as scaling concern)
Resolution: DIRECTLY_ACTIONABLE

**I4. Phase 3 design-it-twice sub-agent constraints are too prescriptive and domain-mismatched**
The fixed constraints ("Minimize API surface," "Maximize flexibility," "Optimize for the most common case") are generic software patterns but this project builds Claude Code skills. Replace with a meta-instruction: "derive 2-3 meaningfully different design philosophies from the project's domain and constraints." Also: these constraints should live in the `design-it-twice.md` reference file, not in SKILL.md.
Sources: Software Architecture (primary — domain mismatch), Holistic (supporting — hardcoded in plan text)
Resolution: DIRECTLY_ACTIONABLE

**I5. Phases 2 and 3 verification is too weak for the most complex changes**
These phases restructure define-architecture's interactive flow with a two-pass design tree and design-it-twice sandwiched between. Verification is "read SKILL.md, confirm steps exist" — this checks text was written, not that the flow works. Add a dry-run verification: walk through the updated SKILL.md as if executing on a test idea.md, confirming each step's inputs and outputs chain correctly.
Sources: Holistic (primary)
Resolution: DIRECTLY_ACTIONABLE

**I6. Phases 4 and 5 frontmatter descriptions under-specified — risk under-triggering**
Both new skills say "Create the skill's frontmatter" without draft description text. The plan should include draft descriptions with sufficient trigger phrases (8+ variants, matching define-architecture's pattern). Missing triggers like "improve the architecture," "architecture review," "the architecture needs work" will cause the skills not to activate.
Sources: Agent Skill (primary)
Resolution: DIRECTLY_ACTIONABLE

**I7. Phase 4 refine-architecture working copy path and resume behavior unspecified**
Step 0 says "Create a working copy directory (`architecture-refining/`)" but doesn't specify the full path or resume-vs-fresh behavior. Should follow refine-plan's Step 0.2 pattern explicitly.
Sources: Agent Skill (primary)
Resolution: DIRECTLY_ACTIONABLE

**I8. Phases 2-3 will push SKILL.md past 500-line progressive disclosure limit**
define-architecture is already 187 lines. Adding Steps 5, 6, and 7 (each with 7-8 substeps) will likely exceed 500 lines. The plan should specify what moves to reference files (candidates: design tree interaction protocol to `references/design-tree.md`, design-it-twice protocol to `references/design-it-twice.md`).
Sources: Agent Skill (primary)
Resolution: DIRECTLY_ACTIONABLE

**I9. Phase 3 design-it-twice sub-agent prompts need explicit self-containment requirement**
Sub-agent prompts must be self-contained per Agent Skill criterion 6. The plan should state that the prompt template must include project context, design constraint, output format, and enough framing that the sub-agent doesn't need to read SKILL.md.
Sources: Agent Skill (primary)
Resolution: DIRECTLY_ACTIONABLE

**I10. No task for updating decisions-format.md Writer/Reader lists**
Phase 4 and 5 create skills that read/write decisions. The `decisions-format.md` has explicit Writer and Reader lists that need updating.
Sources: Holistic (primary)
Resolution: DIRECTLY_ACTIONABLE

**I11. Phase 4 architecture editor sub-agent lacks guardrails specification**
The plan should specify what sections the editor can modify, what it must preserve (e.g., subsystem API contracts that downstream plans depend on), and guardrails preventing changes that invalidate existing plans or decisions.
Sources: Holistic (primary)
Resolution: DIRECTLY_ACTIONABLE

**I12. Phase 4 has no prerequisite check that Phase 1 criteria exist**
Phase 4 assumes criteria 8-11 are in place but doesn't verify. Add an explicit prerequisite check or verification task.
Sources: Software Architecture (primary)
Resolution: DIRECTLY_ACTIONABLE

### MINOR

**M1. Phase 1 verification grep is fragile and potentially non-portable**
Uses `grep -c` with `\|` alternation that breaks on title casing changes and may need `grep -E` on macOS. Use `grep -cE` or check criterion numbers instead.
Sources: Holistic, Agent Skill
Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 2 design tree in-memory tracking has no persistence for long conversations or re-entry**
Branch resolution state is lost on context compaction or fresh session. Consider writing intermediate state to `.project/architecture/.design-tree-state.md` or acknowledge as acceptable limitation. Also: specify the progress display format.
Sources: Software Architecture (primary — persistence), Agent Skill (supporting — format)
Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 5 audit report location pollutes canonical architecture/ directory**
Audit reports are operational artifacts, not canonical design. Write to `.project/audits/` or `flow-log/` instead.
Sources: Software Architecture (primary)
Resolution: DIRECTLY_ACTIONABLE

**M4. No documentation update tasks (idea.md skill inventory, workflow.md)**
Neither `idea.md` nor `workflow.md` are updated to reflect the two new skills.
Sources: Holistic (primary)
Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 5 integration with slice-quality-and-health system-profile.md needs explicit tracking**
The cross-quest dependency (audit-architecture refreshing system-profile.md) should be tracked as a TODO in SKILL.md or a decision, not just a task note.
Sources: Software Architecture (primary), Holistic (supporting — notes it may already be satisfied in goal.md)
Resolution: DIRECTLY_ACTIONABLE (verify existing goal.md first)

**M6. Phase 4 reviewer weighting guidance is vague — no injection mechanism specified**
"Weight deep module criteria more heavily" needs a concrete mechanism: bootstrap placeholder, shared preamble, or refine-architecture guidance.md.
Sources: Software Architecture (primary)
Resolution: DIRECTLY_ACTIONABLE

**M7. Phase 4 early exit thresholds copied from refine-plan without justification**
Architecture files are shorter/simpler than plans. Consider lower max iterations (e.g., 8 vs 12) or justify reuse.
Sources: Holistic (primary)
Resolution: DIRECTLY_ACTIONABLE

**M8. Phase 4 reviewer selection should reference reviewer-registry.md explicitly**
Ensures skill stays in sync as new reviewers are added.
Sources: Agent Skill (primary)
Resolution: DIRECTLY_ACTIONABLE

## Contradictions

None identified. All three reviewers converged on the same core issues (reviewer duplication, iteration loop sharing, sub-agent scoping, design-it-twice constraints) with complementary perspectives. The Agent Skill reviewer added domain-specific issues (frontmatter, progressive disclosure, self-containment) that the other reviewers didn't cover, which is expected given specialization.

## Resolution Categorization

- USER_INPUT: 0
- DIRECTLY_ACTIONABLE: 19 (12 IMPORTANT, 7 MINOR)
- RESEARCH_NEEDED: 0
- CODEBASE_EXPLORATION: 1 (M5 — verify existing goal.md content before acting; merged into DIRECTLY_ACTIONABLE with note)
