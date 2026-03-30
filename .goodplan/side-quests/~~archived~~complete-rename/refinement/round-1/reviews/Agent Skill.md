# Agent Skill Review

## Issues

**[IMPORTANT]** SKILL.md description does not mention initiative-level completion
The plan says to "update description to mention slices, side quests, and initiatives" and add trigger phrases. But the current description (1024 char max) already covers slices and side quests. The plan should specify the exact new description text, because adding "initiative completion" as a concept is meaningfully different from "initiative-scoped slices" (which the skill already handles). The description must clearly distinguish completing an initiative-scoped *slice* (existing) from completing an entire *initiative* (new). Without this, users saying "complete this initiative" might get unexpected behavior, or the skill might under-trigger for initiative completion.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Flow-log backward compatibility not addressed in Phase 2
The research file explicitly calls out that the flow-log contains 12+ entries with `"phase":"complete-slice"` and that signal tracking filters on this value. The plan's Phase 2 tasks update graceful stop states and guidance.md but never mention updating the signal tracking algorithm (Step 6d) to query both `"phase":"complete-slice"` AND `"phase":"complete"`. The Phase 1 rename will change the SKILL.md to write `"phase":"complete"` in new entries, but historical entries remain as `"complete-slice"`. Without dual-query, signal tracking will lose all historical data after rename. Add a task to Phase 2 (or Phase 1) that updates Step 6d's flow-log filter to match both phase values.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Initiative completion needs its own flow-log scope format
The plan says to extend Step 10 (Write Back State) for initiative completion but doesn't specify the flow-log entry format. For initiative-scoped slices, the scope is `initiatives/<name>/vertical-slices/<name>`. For initiative-level completion, the scope should be `initiatives/<name>` per `state-and-flow-formats.md`. The plan should explicitly state the flow-log entry for initiative completion uses `"phase":"complete"` and `"scope":"initiatives/<name>"` with `"status":"complete"`. Without this, the implementer must guess the scope format.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Step 6 Context field still says "complete-slice"
Step 6 of the current SKILL.md says `Context: complete-slice for <scope>` when writing decision files. The plan's Phase 1 task "Update references/guidance.md" covers self-references, and the research notes `~5` occurrences in guidance.md. But the plan doesn't explicitly call out updating the decision Context field in SKILL.md Step 6 itself (line 106: `Use Context: complete-slice for <scope>`). This is separate from the guidance.md task. Ensure Phase 1's rename task covers this string in SKILL.md body, not just frontmatter.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing state.md update specification for initiative completion
The plan extends Step 10b for archive numbering but doesn't specify what Step 10 (state.md update) should write for initiative completion. The current Step 10 writes `Current Phase: complete-slice complete -- learnings and review done for <scope>`. For initiative completion, this should be `complete complete -- initiative <name> completed and archived` or similar. The Active Slice and Next Step fields also need initiative-specific values (e.g., Next Step might be `/create-initiative` or `/project-status` rather than `/create-plan` for the next slice). Add explicit state.md field values for the initiative completion case.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 task to clean initiative-conventions.md parentheticals is unnecessary
The research file explicitly states: "`_shared/references/initiative-conventions.md` already uses `/complete` (no `complete-slice` references). It does NOT have parenthetical annotations to clean up." Yet Phase 3 includes two tasks updating initiative-conventions.md transition tables and Consumer Guide. The Consumer Guide task may still be valid if new initiative-completion entries need adding, but the transition table cleanup task is a no-op. Remove or conditionalize.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Historical references in `.project/learnings.md` and `.project/system-profile.md` need explicit decision
The research file identifies `_Source: 07-complete-slice_` tags in learnings.md and recency markers in system-profile.md. The plan's Phase 1 repo-files task says to grep and update, but the research notes "These are historical records -- the plan should decide whether to update or leave as-is." The plan doesn't make this decision. These are historical provenance markers; updating them would falsify history (similar to why archived dirs are left alone). The plan should explicitly state: leave historical `_Source:` tags and recency markers unchanged, as they record which skill version produced the output.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No regression safeguard for existing scope types
Phase 2 verification says "Check that existing slice and side quest completion behavior is unchanged" but doesn't specify how. Since this is a skill (not code with tests), the verification should be more concrete: re-read the final SKILL.md and confirm that Steps 0-11 still work for `top-level-slice`, `initiative-slice`, and `side-quest` scope types without requiring initiative-specific paths or artifacts. Consider adding a verification step that traces through each scope type's path in the updated SKILL.md.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has a solid phased structure and correctly identifies the mechanical rename work. However, it has significant gaps in the initiative completion workflow: missing flow-log backward compatibility, unspecified state.md formats for initiative completion, and no flow-log scope format for initiative-level events. These would force the implementer to make design decisions that should be in the plan. The Phase 3 cleanup includes unnecessary work based on stale assumptions about initiative-conventions.md. To reach 9+: address the five IMPORTANT issues (flow-log dual-query, initiative flow-log scope, state.md initiative values, decision Context field, SKILL.md description text) and resolve the historical-reference decision.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
