# Agent Skill Review: start-epic SKILL.md Rewrite

## Issues

**[IMPORTANT]** `$GP` used in code blocks without definition
The skill uses `$GP` in all bash code blocks (Step 0, Step 1, Step 2, Step 6) but never defines `GP="gp"`. Other non-orchestrator skills (explore, task, status, upgrade) use bare `gp` directly. Orchestrator skills (create-epic, plan-slice, complete-epic, implement, etc.) define `GP="gp"` in their Step 0 and then use `$GP`. Start-epic is not an orchestrator (no sub-agents, no context discipline section), so it should either: (a) use bare `gp` like other non-orchestrator skills, or (b) add `GP="gp"` assignment in Step 0 like orchestrators do. Option (a) is more consistent with this skill's category.
File: skills/start-epic/SKILL.md:22
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `test -f` for architecture file contradicts stated goal of "no direct filesystem reads"
The skill intro states "All state checks and mutations go through the CLI -- no direct filesystem reads of state files or directory manipulation." However, Step 3 uses `test -f <epic-path>/architecture/_overview.md` which is a direct filesystem check. The skill itself acknowledges this is a "belt-and-suspenders" guard since `epic:activate` already validates `slices-refined` status. Given the stated principle and that the CLI guards this transition, this step could be removed entirely. Alternatively, if kept for UX, the intro should not claim "no direct filesystem reads" -- it should say "no direct state mutations" instead, which is the actual invariant (INV-001).
File: skills/start-epic/SKILL.md:83
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Missing version compatibility check logic
Step 0 checks CLI availability but does not check the version against `requires: gp >= 1.0.0` from the frontmatter. Other skills (explore, task, status) include explicit version comparison logic after the `--version --json` call: "If the version doesn't satisfy `requires: gp >= 1.0.0`, stop with version mismatch message." The current wording only says "If the command fails or the CLI is not available" -- it should also handle the case where the CLI is present but too old.
File: skills/start-epic/SKILL.md:25
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 4 architecture loading source is ambiguous
Step 4 says "Load architecture file paths from the `epic:show` JSON response (epic-scoped architecture, not `gp status` which returns all architecture files)." This is good guidance, but `epic:show --json` output structure is not documented here. Since this is a non-orchestrator skill, the agent executing it may not know what field to look for. A hint like "use the `architectureFiles` field from the response" or similar would reduce ambiguity.
File: skills/start-epic/SKILL.md:92
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Duplicate trigger phrase in description
The description frontmatter includes 'start epic' twice in the triggers list.
File: skills/start-epic/SKILL.md:5
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The rewrite is a major improvement over the old version -- it eliminates all direct state mutations, removes the `__active__` prefix convention, `approved.md` writes, `activity-log.jsonl` writes, and `state.md` updates. The workflow is clear, well-sequenced, and handles all epic status cases comprehensively. The two IMPORTANT issues (undefined `$GP` variable and `test -f` contradicting the stated principle) prevent a 9. Fixing those plus the three MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
