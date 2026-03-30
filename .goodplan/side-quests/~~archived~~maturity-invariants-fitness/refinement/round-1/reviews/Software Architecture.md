# Software Architecture Review — Maturity, Invariants, Fitness Functions Plan

## Issues

**[CRITICAL]** Step numbering collision in Phase 2 will break define-architecture
The plan introduces Steps 9b, 9c, 9d in `/define-architecture`, but Step 9b already exists (Expertise Check). Implementing as written would either overwrite the expertise check or create ambiguous step references. The plan acknowledges this in the overview ("After architecture files are written (Step 9)") but the phase file does not contain a resolution — it still says "Add Step 9b — Create Maturity Table." The implementer will be forced to make an ad-hoc numbering decision, risking inconsistency.

Fix: Phase 2 tasks must explicitly state the renumbering scheme. Recommended: insert the new steps as 9a, 9b, 9c (maturity, invariants, fitness) and renumber the existing "Step 9b — Expertise Check" to "Step 9d — Expertise Check." Update `_overview.md` phase description and all cross-references. Alternatively, renumber existing Steps 9b/10/11 to 10/11/12 and use 9a/9b/9c for the new steps.
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Maturity table creation sequenced after CLAUDE.md update — new artifacts omitted from Project Context
Phase 2 places maturity table creation (Step 9b), invariants (Step 9c), and fitness candidates (Step 9d) after Step 9 (CLAUDE.md Update). Step 9 builds the Project Context section by listing architecture files that exist. Since `invariants.md` is created in Step 9c (after CLAUDE.md update), it won't appear in CLAUDE.md's "Also check" entries. Future sessions won't automatically load `invariants.md` until the next skill run updates CLAUDE.md. The maturity table is in `_overview.md` (already written in Step 8b), so it's fine — but `invariants.md` is a new standalone file.

Fix: Either (a) move Steps 9a-9c before Step 9 (CLAUDE.md Update), so all architecture artifacts exist when CLAUDE.md is built, or (b) add an explicit task in Phase 2 to re-update CLAUDE.md after Step 9c to include `invariants.md`. Option (a) is cleaner — the maturity/invariants/fitness steps are logically part of the architecture phase (Step 8), not post-architecture.
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Fitness function candidate location left ambiguous — violates "narrow interfaces, deep implementation"
Phase 1 task says fitness functions are "Documented in architecture files alongside the subsystem they protect." Phase 2 Step 9d says "Add these as 'candidate' entries in the relevant architecture file or as a section in `_overview.md` — whichever is simpler." The research file flags this: "This leaves format ambiguous." Two consuming skills (refine-architecture, audit-architecture) need to reliably find these entries — ambiguous placement creates caller friction.

The maturity table's "Fitness Functions" column is a pointer (test file path or "candidate"). But what it points to differs based on whichever choice the implementer made. The audit-architecture fitness function audit (Phase 3 Step 3b) checks "for each subsystem with documented fitness functions" — it needs a deterministic location to find them.

Fix: Phase 1's convention file must specify a single canonical location. Recommendation: document fitness function entries in the subsystem's `<subsystem>-api.md` file under a `## Fitness Functions` section. The maturity table column contains a summary reference. Phase 2 Step 9d should reference this convention, not offer alternatives. Update the `maturity-conventions.md` Fitness Function Convention section to specify the exact heading name and format.
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No finding category for fitness/invariant audit results in audit-architecture
Phase 3 adds Steps 3b (fitness function audit) and 3c (invariant compliance check) to audit-architecture. These produce findings that don't fit existing categories (gap or improvement). A stale fitness function is neither a gap (code matches architecture, but the test is stale) nor an improvement (architecture doesn't need to change). An invariant violation might be a gap, but might also be a convention enforcement issue.

The plan's Phase 3 tasks say "Update `references/guidance.md` — Add sections for fitness function audit strategy, invariant compliance checking approach, maturity promotion/demotion criteria." But it doesn't specify how these findings feed into the existing severity levels and side quest proposal pipeline. The guidance update task is too vague — it should explicitly define finding types and their mapping to side quest types.

Fix: Add a task in Phase 3 to define new finding categories in `references/guidance.md`: (a) "stale-fitness-function" — maps to gap quest (bring test in line with current subsystem), (b) "missing-fitness-function" — maps to improvement quest (subsystem matured past its documentation), (c) "invariant-violation" — maps to gap quest (code violates documented constraint), (d) "invariant-amendment-needed" — maps to improvement quest (invariant itself needs updating). Include these in the severity assignment rules table.
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 refine-architecture changes don't update the editor guardrails
Phase 3 adds maturity evaluation to `references/guidance.md` for refine-architecture. Reviewers will now flag maturity-related issues (e.g., "subsystem X claims Maturing but lacks fitness functions"). These issues flow to the architecture-editor sub-agent for resolution. But the editor guardrails in `references/sub-agent-prompts.md` have no guidance on how to handle maturity-related feedback — the editor might update maturity levels without proper justification, or add fitness function placeholders without the right format.

Fix: Add a task in Phase 3 (refine-architecture section) to update `references/sub-agent-prompts.md` editor guardrails with: (a) maturity level changes require evidence annotation, (b) fitness function entries must follow the format in `maturity-conventions.md`, (c) invariant changes must be flagged as requiring user confirmation (editors should not silently amend invariants).
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 doesn't specify criterion numbering for Holistic reviewer additions
Phase 4 adds "invariant compliance" and "fitness function awareness" to the Holistic reviewer. The SW Architecture reviewer addition is explicitly numbered (criterion 12). But the Holistic reviewer additions have no numbers specified. The Holistic reviewer currently has 11 criteria. The plan should specify these as criteria 12 and 13 to maintain the sequential numbering convention used consistently across all reviewer prompts.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** maturity-conventions.md Consumer Guide maps fitness functions to "SW Architecture reviewer" in the "Checked by reviewers" column, but Phase 4 also adds fitness function awareness to the Holistic reviewer
The consumer guide table in Phase 1 shows fitness functions checked only by the SW Architecture reviewer. Phase 4 adds fitness function awareness to the Holistic reviewer as well. The consumer guide will be stale on creation. Either update the Phase 1 table to include both reviewers, or add a task in Phase 4 to update the consumer guide after the reviewer changes.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 invariant creation task says "Run `mkdir -p .project/architecture/`" but architecture/ already exists at this point
Step 9c runs after Step 8 (architecture phase), which already runs `mkdir -p .project/architecture/`. The redundant mkdir is harmless but misleading — it implies invariants.md might be created before architecture files, which isn't the case. Remove the mkdir instruction or clarify it's a safety check.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan's high-level approach is sound: a shared convention file consumed by multiple skills, with additive steps that don't modify existing behavior. The module boundaries are clean (Phase 1 creates the shared reference, Phases 2-4 consume it). However, five IMPORTANT issues need resolution before implementation: the step numbering collision would create ambiguity during implementation, the CLAUDE.md sequencing gap means `invariants.md` won't be auto-loaded, the ambiguous fitness function location creates caller friction across multiple consuming skills, the missing finding categories leave audit-architecture's output pipeline incomplete, and the editor guardrails gap means maturity feedback can't be reliably applied. Fixing these would bring the score to 8+. Addressing the fitness function location ambiguity (making it a deep, narrow convention rather than an implementer choice) would be the single highest-impact improvement.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
