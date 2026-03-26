# Agent Skill Review — Round 3

## Issues

**[IMPORTANT]** Phase 2 convention doc includes `start-complete` worked example from architecture source despite explicit exclusion note

The plan's Phase 2 task item 5 now correctly instructs verifying commands against `goodplan schema --json` or `src/commands/main.ts` before including them as worked examples. It also adds an explicit note: "`start-complete` does not exist as a command -- do not include it in examples." However, the architecture source document (`cli-interaction-conventions.md` lines 198-216) contains a detailed "Worked example: `complete` orchestrator pattern" that uses `start-complete --slice my-slice --inline --json`. Since the task instructs the implementer to adapt this architecture spec as source material, there is a risk that the implementer copies this worked example into the convention doc despite the exclusion note, especially since the exclusion note appears under task item 5 but the worked example in the source sits under the "Interactive Orchestrator Skills" section which the implementer may process separately.

Fix: Move or duplicate the `start-complete` exclusion note to task item 9 (Completion Command Payloads) as well, since that is where the implementer would most naturally reference the `complete` orchestrator pattern from the architecture spec. Alternatively, add a cross-reference in the task item 5 exclusion note: "This also applies to the `complete` orchestrator worked example in the architecture source -- do not include it as-is."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 `requires` frontmatter introduces a new convention with no enforcement mechanism in this slice

The plan adds `requires: goodplan >= 0.0.1` to the `project-status` SKILL.md frontmatter. This is good and addresses the round-1 critical issue. However, no existing skill uses `requires:` (confirmed by codebase search -- zero matches across all 14 skills). The convention doc (Phase 2, section 1) describes version checking behavior that depends on this field. But the actual enforcement is purely agent-behavioral -- there is no runtime validation or install-time check. If the agent reading the skill does not also read the convention doc (e.g., because it is a different agent, or context was compacted), the `requires` field is inert metadata.

This is acceptable for this tracer bullet slice since `project-status` is the first skill to use it. But the plan should note in Phase 2's convention doc section 1 that version enforcement relies on the agent loading `cli-interaction.md` and following the check procedure. The convention doc should explicitly state that `requires` is not machine-enforced -- it is a convention that skills follow by reading this document. This prevents future skill authors from assuming there is automated enforcement.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 skill rewrite Step 5 references `slice:list --json` without confirming it covers all Format B needs

Phase 3 Step 5 says: "For Format B (all slices/epics/quests with states), use `slice:list --json`, `quest:list --json`, `epic:list --json` if available." These commands do exist in `src/commands/main.ts`. However, the current `project-status` skill's Format B also needs per-slice state machine derivation (which slices are in-progress, which are completed, etc.). The plan should confirm that `slice:list --json` returns status information per slice. If it only returns names, the skill would need `slice:show --slice X --json` per slice, which could be many CLI calls.

This is minor because `slice:list` almost certainly returns statuses (that is its purpose), but the plan's assumption should be explicit since the tracer bullet is meant to validate the full pattern.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 3 verification does not test the "no project" path

The plan's Phase 3 verification (step 1) tests `/project-status` on the goodplan repo which has a `.project/` directory. But one of the key Phase 3 changes is the two-stage detection: (a) `goodplan --version --json` to confirm binary, (b) `goodplan status --json` to confirm project exists. The "no project" path -- where the binary exists but no `.project/` directory is found -- is not verified. This is the path that displays "No `.project/` directory found" to the user.

Fix: Add a verification step: run `/project-status` from a directory without `.project/` (e.g., `/tmp`) and confirm it reports the CLI is available but no project exists, with the expected user message.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan has substantially improved across three rounds. All critical and important issues from rounds 1 and 2 have been addressed: `requires` frontmatter is specified, Step 9 removal is explicit, convention doc reference is included, description update is present, `start-complete` exclusion is noted, activity-log access uses `.[-5:]`, Step 10 is kept with CLI-based retrieval, deprecation note targets the correct file, and `--inline` future form is documented. The remaining issues are lower severity: the `start-complete` exclusion could be reinforced in a second location, the `requires` convention should be documented as agent-behavioral rather than machine-enforced, and verification coverage could be slightly broader.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
