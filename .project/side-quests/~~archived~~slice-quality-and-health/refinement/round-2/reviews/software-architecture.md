## Issues

**[IMPORTANT]** Phase 2 run directory is mislocated — should be co-located with the files being refined, not in a fixed path

The plan specifies `run_dir = .project/vertical-slices/slices-refining/` as the run directory. The iteration-loop.md convention says: "The run directory is named `<thing>-refining/` — e.g., `plan-refining/`, `architecture-refining/`. It is co-located with the files being refined." The files being refined are `sequencing.md` and `*/goal.md` inside `.project/vertical-slices/`. So `slices-refining/` co-located in `.project/vertical-slices/slices-refining/` is correct in that sense.

However, the naming convention `<thing>-refining/` is used for both the working copies and the run directory in refine-plan. In refine-plan, the working copy is `plan-refining.md` and the run directory is `<scope>/refinement/`. These are separate concepts: working copies are the editable files, the run directory holds review artifacts. The plan conflates them by calling the run directory `slices-refining/` but also putting working copies (`sequencing-refining.md`, `goal-refining.md`) alongside the originals.

The plan should clarify: working copies live alongside originals in `.project/vertical-slices/` (e.g., `sequencing-refining.md`, `01-slice/goal-refining.md`), and the run directory (holding `round-N/reviews/`, `merged.md`, `flow-log.jsonl`) lives at `.project/vertical-slices/slices-refinement/` — matching the `refinement/` naming used by refine-plan's run directory (`<scope>/refinement/`). This avoids confusion between working copies and review artifacts.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 Step 6d signal tracking reads `merged.md` from refinement directories but the metric extraction logic is underspecified

The round-1 review flagged coupling to flow-log prose, and the plan was updated to read artifact directories directly (count `round-N/` directories for iteration counts). This is an improvement. However, the second metric — "Implementation deviations from plans: Read the last `merged.md` in each slice's refinement directory for issue count and severity breakdown" — still has an extraction problem.

`merged.md` is a synthesis document with sections like `### CRITICAL Issues`, `### IMPORTANT Issues`, `### MINOR Issues`. Counting issues in these sections requires parsing markdown with varying formats (numbered lists, bullet lists, sub-headers). The plan doesn't specify the parsing strategy. More importantly, the "last" `merged.md` in a refinement directory reflects the *final* state (ideally few issues remaining), not the total issues found. A slice that required many fixes will have a clean final `merged.md` — the metric doesn't capture what it claims to measure.

**Recommendation**: For "implementation deviations," count the number of `round-N/` directories (same as refinement iterations — more rounds = more issues found). For "architectural changes during completion," count entries in `completion/architecture-updates.md` (which the plan already writes with structured content: "changes made, declined, and flagged as tech debt"). This eliminates `merged.md` parsing entirely and uses metrics that are structurally reliable.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 multi-file editing strategy requires reviewer prompts to prefix issues with filenames, but the shared Software Architecture reviewer prompt has no such instruction

The plan says: "Reviewer prompts must prefix each issue with the target filename." This works for the three custom slice-specific reviewers defined in `reviewers-slices.md` — their prompts can include this instruction. But the fourth reviewer is Software Architecture from `_shared/references/reviewers-cross-cutting.md`, a shared prompt used by multiple skills (refine-plan, refine-architecture, and now refine-slices). Adding a "prefix with filename" instruction to the shared prompt would affect all consumers.

The shared preamble already has a `{plan_file_paths}` placeholder that receives file paths, but the shared Software Architecture reviewer prompt has no instruction to prefix issues with specific file paths — it evaluates the plan holistically.

**Recommendation**: Handle this in the refine-slices SKILL.md orchestrator instructions rather than modifying the shared prompt. When spawning the Software Architecture reviewer for refine-slices, add a supplementary instruction in the bootstrap placeholder values: "This review covers multiple files. Prefix each issue with the filename it applies to (from the file list in the preamble)." The `{review_context}` or an additional `{supplementary_instructions}` placeholder could carry this. This keeps the shared prompt clean while enabling multi-file targeting.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 three-lens evaluation concrete criteria may over-constrain small projects

The concrete criteria are: "Risk: first 50% of slices cover all high-risk architecture items" and "Observability: at least one of the first 2 slices includes logging/debug infrastructure." For a 2-slice project, "first 50%" means 1 slice must cover all risks, and "first 2 slices" means observability must be in one of all slices — these become trivially true or impossibly strict depending on the project. The criteria are well-calibrated for 4-8 slice projects but should note that for very small (2-3 slices) or very large (10+) projects, the agent should adapt thresholds rather than applying them literally.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 system-profile.md "Recent Changes" rolling window has no cleanup mechanism

The plan says "keep last 3 slices; older entries drop off." But the mechanism for "drop off" isn't specified. Does `/complete-slice` count existing entries and remove the oldest? What if entries were added by `/audit-architecture` (Phase 4 says "Recent Changes: Not updated by audit")? The cleanup is straightforward but should be explicit: "When adding a new entry to Recent Changes, count existing entries. If there are 3 or more, remove the oldest (by slice sequence number or date) before adding the new one."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 verification section asks to confirm run directory is `.project/vertical-slices/slices-refining/` but this may change per the first issue above

If the run directory naming is corrected to `slices-refinement/`, the verification section should be updated to match. This is a consistency item that follows from resolving the first issue.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has addressed all round-1 CRITICAL and IMPORTANT issues well. The shared-preamble duplication is eliminated, system-profile.md has a designated owner with a shared format file, signal tracking reads artifact directories instead of flow-log prose, the multi-file editing strategy is defined, and the three-lens evaluation has concrete criteria with an iteration cap. The remaining issues are refinements: clarifying the run directory vs working copy distinction, making signal tracking metrics structurally reliable (avoiding merged.md parsing), and handling the shared reviewer prompt in a multi-file context. Addressing the three IMPORTANT items would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
