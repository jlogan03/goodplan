# Merged Feedback — Round 3

Reviewers: Holistic (9/10), Software Architecture (9/10), Agent Skill (9/10)

All R2 issues confirmed resolved across all three reviewers.

---

## IMPORTANT

### I1. iteration-loop.md parameter interface contract unspecified
*Sources: Holistic, Software Architecture*

The content outline for `iteration-loop.md` lists six shared topics and six skill-specific parameters — a significant R2 improvement. However, the **binding mechanism** between the shared file and consuming skills is undefined. Holistic notes the codebase precedent is "read and follow" references (like decisions-format.md), not placeholder substitution, and suggests one sentence would suffice. Software Architecture goes further: without specifying the binding mechanism, a future third skill (e.g., refine-decisions) risks inventing an incompatible interface. Both converge on the same fix.

**Resolution:** Add to the iteration-loop.md task: "iteration-loop.md is a structural reference document (like decisions-format.md) that skills read for the orchestration pattern; each skill's SKILL.md specifies its own concrete parameter values in a 'Loop Parameters' section listing: reviewer list, exit criteria, editor prompt path, score thresholds, max iterations, scope constraints, and working directory path."

### I2. refine-architecture run directory for review artifacts unspecified
*Source: Agent Skill*

Phase 4 Step 0 defines in-place editing on `.project/architecture/` with a backup at `.project/architecture-backup-<timestamp>/`. But the refinement loop (Step 2) spawns reviewers and produces per-iteration round directories — where do these go? The shared `iteration-loop.md` defines run directory naming convention (`<thing>-refining/`), but no concrete path is given for refine-architecture. The implementer must guess.

**Resolution:** Specify in Phase 4 Step 0 or Step 2: "Review artifacts (round directories, merged.md, flow-log) go in `.project/architecture-refining/`. This is distinct from the backup directory (which is for rollback only)."

---

## MINOR

### M1. Phase 1 include mechanism for consolidated cross-cutting reviewers is underspecified
*Sources: Holistic, Agent Skill*

Phase 1 replaces each skill's `reviewers-cross-cutting.md` with a one-line include instruction pointing to the shared file with `{review_context}` substitution. This is a new pattern — no other reference file uses it. The reviewer bootstrap reads prompt content from a file path; if that path now contains an include instruction instead of actual content, the resolution mechanism is unclear. Does the sub-agent follow the include? Does the orchestrator resolve it? Agent Skill notes this could cause a retry loop during implementation if the agent picks the wrong interpretation.

**Resolution:** Specify: the orchestrator resolves the indirection before passing to the sub-agent (i.e., the reviewer-registry.md points directly to the shared file path with the `{review_context}` value, not to the include stub). This is simplest and consistent with the existing bootstrap pattern.

### M2. Phase 4 refine-plan refactoring deferred with no tracking mechanism
*Source: Software Architecture*

Phase 4 notes refine-plan's SKILL.md should be refactored to reference iteration-loop.md "in a follow-up task (tracked as a note in verification)." A verification note is read once and forgotten. If this never happens, two skills use different loop implementations, defeating the shared file purpose.

**Resolution:** Track in a concrete artifact: a TODO in the side quest's goal.md, or propose as a new side quest.

### M3. Phase 5 gap-analysis sub-agents may produce contradictory findings across overlapping architecture files
*Source: Software Architecture*

Architecture files often describe overlapping concerns (e.g., `_overview.md` and `data-model.md` both touch subsystem boundaries). Parallel sub-agents scoped to different files may produce contradictory findings on the same codebase area. Phase 5 has no reconciliation step between gap analysis (Step 2) and reassessment (Step 3).

**Resolution:** Add a brief deduplication/reconciliation step between Steps 2 and 3 that merges findings, resolves contradictions, and deduplicates overlapping observations.

### M4. Phase 4 prerequisite check doesn't validate include resolution after Phase 1 consolidation
*Source: Software Architecture*

Phase 4 verifies "the Software Architecture reviewer contains criteria 8-11." After Phase 1 consolidation, these live in the shared file behind an include instruction. A broken include would silently drop the criteria, wasting a full iteration before detection.

**Resolution:** Prerequisite check should verify the shared file contains criteria 8-11 and that include instructions resolve correctly.

### M5. Phase 5 audit report directory lifecycle undefined
*Source: Holistic*

Phase 5 writes to `.project/audits/architecture-<date>.md` — a new directory with no specified lifecycle. Are old reports cleaned up? Does any skill read them? If not, they're write-only clutter.

**Resolution:** Add a note: either old reports are deleted after N audits, or they serve as historical record and are explicitly excluded from skill context loading.

### M6. Backup restore path on abandoned refinement not documented
*Source: Holistic*

Phase 4 Step 4 deletes backup on success. Graceful stop mentions "user can restore from backup" but doesn't include a restore instruction. The user would need to identify the right timestamped backup and manually move it.

**Resolution:** On abandon, inform the user of the backup path and suggest `mv .project/architecture-backup-<ts>/ .project/architecture/`.

### M7. Phase 5 gap-analysis sub-agent prompt lacks self-containment requirement
*Source: Agent Skill*

Phase 3 explicitly requires sub-agent self-containment; Phase 5 does not. Gap analysis sub-agents need: architecture file path, codebase exploration scope, comparison dimensions (aligned with criteria 1-11), and output format.

**Resolution:** Add self-containment note to Phase 5's sub-agent-prompts.md task: include all inputs so the sub-agent can execute without reading SKILL.md.

### M8. Phase 2 dry-run verification lacks specificity
*Source: Agent Skill*

Phase 2 verification says "flag any broken chains" without pass/fail criteria or concrete examples. Phase 3's dry-run is clearer by comparison.

**Resolution:** Tighten to match Phase 3's style: "Confirm: Step 4 produces conventions.md. Step 5 consumes idea.md + conventions.md and produces subsystem map + constraints summary. Step 6 consumes Step 5 output and produces a chosen design. Step 7 consumes the chosen design and produces fully specified architecture. No step assumes inputs not produced by a prior step."

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Important | 2 |
| Minor | 8 |

All three reviewers scored 9/10. R2 issues fully resolved. The two IMPORTANT items are small specification gaps (iteration-loop parameter interface, refine-architecture run directory) — each fixable with 1-2 sentences. The 8 MINOR items are clarification and robustness improvements that reduce implementer ambiguity but don't block correctness.
