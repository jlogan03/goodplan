# Agent Skill Reviewer — Round 4

Focused review of Phase 5 only. Prior round issues addressed: pre-flight check for partial migration added (now Step 2), trigger phrases front-loaded in description, cli-interaction.md scoped to Section 10, prefix mutual exclusivity documented.

## Issues

**[MINOR]** Skill body does not instruct the agent to read `references/migration-heuristics.md` on-demand

Phase 5 correctly splits detailed heuristics into `references/migration-heuristics.md` (keeping SKILL.md under 500 lines). However, the step-by-step workflow in SKILL.md never includes an explicit instruction like "Read `references/migration-heuristics.md` using the Read tool." Other skills in this repo follow a consistent pattern — e.g., `/explore` Step 1 says "Use the Read tool to load `references/explore-logic.md`", `/create-architecture` Step 0 loads `references/architecture-logic.md`. Without this explicit read instruction, an implementing agent may not load the heuristics file and instead rely on the abbreviated heuristic list in the SKILL.md body, which is intentionally incomplete (it says "see `references/migration-heuristics.md` for detailed heuristics").

Add an explicit step (e.g., at the start of Step 4 or as a sub-step): "Read `references/migration-heuristics.md` using the Read tool before answering inventory questions."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Quest slice discovery not addressed — quests can have their own slices-like structure

The plan's Step 5 says "For each epic detail question: read the epic's directory for slices, architecture, sequencing." But the actual `.project/side-quests/` directories in this repo show that some quests (e.g., `migrate-to-cli`) have their own internal structure with `plan-refining/` subdirectories containing phase files. The skill's heuristics mention slice discovery for epics but not how to handle quest internal structure. Phase 1 schemas show quests only have `name, goal, status, sourcePath` — no slice-level detail. This is correct since the CLI treats quests as flat entities without sub-slices, but the skill should note that quest subdirectories (like `plan-refining/`) are not migrated as slices — they are markdown artifacts copied wholesale during artifact copy.

Add a note to Step 4 or the heuristics file: "Quests do not have slices in the CLI model. Any subdirectories within a quest (e.g., `plan-refining/`, `refinement/`) are treated as markdown artifacts and copied during the artifact-copy step, not as separate entities."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No guidance on handling `echo` with large JSON payloads

Step 4 says `echo '<json>' | goodplan migrate --json` for piping answers. For projects with many epics/quests, the inventory answer JSON could exceed shell argument limits (ARG_MAX, typically ~256KB on macOS). The existing `cli-interaction.md` Section 4 documents the `stdin: ""` syntax as Claude Code's Bash tool API, where `stdin` is a named parameter (not shell). The skill should prefer the `stdin:` parameter syntax over `echo` for answer payloads, since this avoids shell argument length limits and special character escaping issues.

The plan's verification section says "Verify all `goodplan migrate` invocations use correct `echo '...' | goodplan migrate --json` stdin piping syntax" — but the `stdin:` parameter form is equally valid and more robust per `cli-interaction.md` Section 4. Update the skill to use `stdin:` syntax for answer submissions (keeping `echo` examples only for simple cases).

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 4 improvements addressed all prior IMPORTANT issues and the structural MINOR issues from Round 3. Phase 5 is now well-specified: trigger accuracy is good (front-loaded phrases, error-condition trigger moved to body), workflow steps are clear and sequenced logically, the pre-flight partial-migration check is properly positioned, and the cli-interaction.md reference is correctly scoped. The three remaining MINOR issues are: missing explicit Read instruction for the heuristics reference file (pattern mismatch with other skills), quest sub-structure clarification (prevents implementer confusion), and stdin syntax preference for robustness. None block implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
