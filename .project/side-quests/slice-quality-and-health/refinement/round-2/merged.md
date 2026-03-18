# Merged Feedback — Round 2

### CRITICAL Issues

None.

### IMPORTANT Issues

**IMP-1. Phase 2 multi-file working copy naming and paths are unspecified**
- Files: plan.md (Phase 2 tasks), future `refine-slices/SKILL.md`
- Flagged by: holistic, software-architecture, agent-skill
- The plan doesn't specify where working copies (`goal-refining.md`) live when there are N slices, how `{plan_file_paths}` handles a multi-file list, or whether the editor prompt needs a new variant. The shared preamble's `Plan location: {plan_file_paths}` and the editor prompt's `Plan path: {plan_path}` are both designed for single-file use.
- Resolution: DIRECTLY_ACTIONABLE

**IMP-2. Phase 2 run directory vs working copy distinction is conflated**
- Files: plan.md (Phase 2 tasks)
- Flagged by: software-architecture, agent-skill
- The plan names the run directory `slices-refining/` but also puts working copies alongside originals. The run directory (holding `round-N/reviews/`, `merged.md`) should follow the `refinement/` naming used by refine-plan (i.e., `.project/vertical-slices/slices-refinement/`), distinct from working copies which live alongside originals.
- Resolution: DIRECTLY_ACTIONABLE

**IMP-3. Phase 3 signal tracking — "last 3 completed slices" discovery logic is unspecified**
- Files: plan.md (Phase 3, Step 6d)
- Flagged by: holistic, agent-skill
- No specification for how to determine which slices are completed or their order. Need: scan for `completion/learnings.md`, determine order (flow-log.jsonl timestamps or file mod times), take last 3. Also ambiguous whether side quests are included.
- Resolution: DIRECTLY_ACTIONABLE

**IMP-4. Phase 3 signal tracking — merged.md parsing for "implementation deviations" is fragile**
- Files: plan.md (Phase 3, Step 6d)
- Flagged by: software-architecture
- Counting issues in `merged.md` requires parsing variable markdown formats, and the *final* `merged.md` reflects few remaining issues, not total issues found. Better metrics: count `round-N/` directories (more rounds = more issues) and count entries in `completion/architecture-updates.md` for architectural changes.
- Resolution: DIRECTLY_ACTIONABLE

**IMP-5. Phase 2 shared Software Architecture reviewer prompt lacks multi-file prefix instruction**
- Files: plan.md (Phase 2), `_shared/references/reviewers-cross-cutting.md`
- Flagged by: software-architecture
- The shared prompt has no "prefix issues with filename" instruction. Modifying the shared prompt affects all consumers. Handle via supplementary instruction injected by the refine-slices orchestrator when spawning this reviewer, not by modifying the shared prompt.
- Resolution: DIRECTLY_ACTIONABLE

**IMP-6. Missing SKILL.md frontmatter specification for `/refine-slices`**
- Files: plan.md (Phase 2)
- Flagged by: agent-skill
- No `name` or `description` frontmatter fields specified. These are the primary trigger mechanism. The plan should include the frontmatter text or at least trigger phrases.
- Resolution: DIRECTLY_ACTIONABLE

**IMP-7. Phase 2 `{review_context}` value not specified in reviewer-registry**
- Files: plan.md (Phase 2)
- Flagged by: agent-skill
- The plan sets `review_context` to `"slice goal definitions and sequencing"` but doesn't specify that the reviewer-registry.md must include a `## review_context Value` section (as refine-architecture's registry does). Without this, the orchestrator may not fill the placeholder.
- Resolution: DIRECTLY_ACTIONABLE

**IMP-8. Phase 1 three-lens evaluation adds too much detail inline in SKILL.md**
- Files: plan.md (Phase 1)
- Flagged by: agent-skill
- The plan's task description for Step 4b is very detailed (specific criteria, cap, conflict handling, output format). SKILL.md should be lean with progressive disclosure — reference guidance.md for the how.
- Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

**MIN-1. Phase 1 verification still includes hypothetical "5-slice case" trace**
- Files: plan.md (Phase 1 verification)
- Flagged by: holistic
- Move the 5-slice trace into guidance.md as an example scenario. Limit verification to checking the updated files contain the required sections.
- Resolution: DIRECTLY_ACTIONABLE

**MIN-2. Phase 3 system-profile-format.md lacks sub-structure detail**
- Files: plan.md (Phase 3)
- Flagged by: holistic
- Only lists section names, not sub-structures. Should specify: Health (Well-tested, Undertested, Known fragile), etc.
- Resolution: DIRECTLY_ACTIONABLE

**MIN-3. Phase 1 three-lens criteria may over-constrain small projects**
- Files: plan.md (Phase 1)
- Flagged by: software-architecture
- Criteria calibrated for 4-8 slices. Should note that for 2-3 or 10+ slice projects, the agent should adapt thresholds.
- Resolution: DIRECTLY_ACTIONABLE

**MIN-4. Phase 3 "Recent Changes" rolling window has no cleanup mechanism**
- Files: plan.md (Phase 3)
- Flagged by: software-architecture
- "Drop off" mechanism unspecified. Should explicitly state: count existing entries, remove oldest if >= 3 before adding new one.
- Resolution: DIRECTLY_ACTIONABLE

**MIN-5. Phase 4 TODO removal uses truncated marker text**
- Files: plan.md (Phase 4)
- Flagged by: agent-skill
- Plan quotes shortened version of the TODO comment. Should quote the full marker text to avoid search miss.
- Resolution: DIRECTLY_ACTIONABLE

**MIN-6. Phase 2 "Confirm skill discoverability" task is a no-op**
- Files: plan.md (Phase 2)
- Flagged by: agent-skill
- If the SKILL.md file exists at the path, it's discoverable. Fold into verification rather than a separate task.
- Resolution: DIRECTLY_ACTIONABLE

**MIN-7. Phase 3 system-profile-format.md shared placement note**
- Files: plan.md (Phase 3)
- Flagged by: agent-skill
- Only two consumers. Minor — shared location is correct, but note that format changes require testing both skills.
- Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE (for loop exit)

**IMP-1. Multi-file working copy naming and template mapping**
- In plan.md Phase 2: Add specification that working copies are created in-place within each slice directory (e.g., `.project/vertical-slices/01-start-project/goal-refining.md`). The manifest lists full paths. Specify that `{plan_file_paths}` receives a newline-separated list of all working copy paths. The editor prompt is custom (already stated) and receives the full manifest. Reviewer bootstrap uses the existing shared preamble with `{plan_file_paths}` as a multi-line value.

**IMP-2. Run directory naming**
- In plan.md Phase 2: Rename run directory from `.project/vertical-slices/slices-refining/` to `.project/vertical-slices/slices-refinement/` to match the `refinement/` convention used by refine-plan. Update the verification section to match. Working copies remain alongside originals (separate concept from run directory).

**IMP-3. Signal tracking slice discovery**
- In plan.md Phase 3 Step 6d: Add explicit logic — "Scan `.project/vertical-slices/*/completion/learnings.md` and `.project/side-quests/*/completion/learnings.md`. Sort by the `complete` entry timestamp in `flow-log.jsonl`. Take the 3 most recent. Count `round-N/` directories in each scope's `refinement/` directory."

**IMP-4. Signal tracking metrics**
- In plan.md Phase 3 Step 6d: Replace "read merged.md for issue count" with: count `round-N/` directories as proxy for refinement effort (more rounds = more issues found). For architectural changes, count entries in `completion/architecture-updates.md`. Remove merged.md parsing requirement.

**IMP-5. Shared reviewer multi-file instruction**
- In plan.md Phase 2: Add instruction that when spawning the Software Architecture reviewer, the refine-slices orchestrator injects a supplementary instruction via the `{review_context}` or a dedicated placeholder: "This review covers multiple files. Prefix each issue with the filename it applies to." Do not modify the shared prompt.

**IMP-6. SKILL.md frontmatter**
- In plan.md Phase 2: Add the frontmatter specification including `name: refine-slices` and a `description` with trigger phrases (e.g., "Refine vertical slice definitions and sequencing. Use after /define-slices to improve slice quality, ordering, and goal clarity.").

**IMP-7. Reviewer registry review_context**
- In plan.md Phase 2: Add task to include a `## review_context Value` section in the refine-slices reviewer-registry.md, with value `"slice goal definitions and sequencing"`.

**IMP-8. Progressive disclosure for three-lens evaluation**
- In plan.md Phase 1: Keep Step 4b description in SKILL.md lean (what and why only). Move detailed criteria, iteration cap, conflict handling, and output format into the guidance.md "Three-Lens Evaluation" section.

**MIN-1 through MIN-7**: All directly actionable as described in the MINOR issues section above.

### RESEARCH_NEEDED

None.

### Contradictions Resolved

1. **Run directory naming**: holistic flagged it as minor ("oddly nested but consistent"), software-architecture flagged it as IMPORTANT (conflation of run directory and working copies), agent-skill flagged it as minor (naming convention deviation). Trusted software-architecture as the domain specialist on directory structure semantics — the run directory vs working copy distinction is an architectural concern. Elevated to IMPORTANT (IMP-2).

2. **Phase 2 verification section**: software-architecture noted the verification references the potentially-incorrect run directory path. This is a dependency of IMP-2 rather than a separate issue — folded into IMP-2's actionable fix.

### Unresolved (USER_INPUT required)

None.
