# Software Architecture Review

## Issues

**[IMPORTANT]** Initiative scope type not consistently threaded through existing steps

The plan extends Steps 0, 2, 3, 4, 5, 6, 8, and 10b for initiative scope, but several intermediate steps are left unaddressed. Specifically:

- **Step 6b (system-profile.md update)**: The recency marker template is `complete-slice for <scope>`. For initiative completion, this needs to be updated to `complete for <initiative>`. The plan's Phase 1 rename handles the `complete-slice` -> `complete` part, but the guidance.md template for system-profile update still only contemplates slice-level scopes. Should initiative completion write a system-profile entry at all? If yes, what goes in Health/Performance/Extensibility for an initiative-level completion (which is a meta-operation, not a code change)?

- **Step 6c (debt evaluation)**: The plan doesn't mention whether initiative completion should run debt evaluation. An initiative-level completion is a reconciliation step, not an implementation step — running the standard debt evaluation protocol seems misaligned. Clarify: skip for initiatives, or adapt the protocol.

- **Step 6d (signal tracking)**: The plan extends the flow-log phase filter to match both `"complete-slice"` and `"complete"` (good), but doesn't address what happens when initiative completions are in the flow-log. The signal tracking algorithm counts refinement rounds and architecture changes per completed scope. Initiative completions don't have `refinement/` directories or per-scope `completion/architecture-updates.md` in the same way slices do. Should initiative-level completions be excluded from the signal tracking window?

- **Step 7 (CLAUDE.md update)**: The plan doesn't specify whether initiative completion should check for CLAUDE.md updates. The reconciliation step in Step 6 might update architecture files, which would trigger the CLAUDE.md update logic. This should be explicitly stated.

- **Step 9 (cleanup check)**: Asking "do you want a cleanup pass before moving to the next slice?" makes no sense at initiative scope. Should be skipped or adapted.

- **Step 9b (expertise check)**: Likely fine as-is, but worth a note confirming it applies to initiative scope too.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Flow-log scope value for initiative completion is underspecified

The plan's Phase 2 extends Step 10b for archiving but doesn't specify what scope value to write in the flow-log entry (Step 10). The `state-and-flow-formats.md` defines `initiatives/<name>` for "initiative-level events (e.g., initiative approval, initiative completion)" — so the scope should be `initiatives/<name>`, not `initiatives/__active__<name>`. But the plan's Step 10 template still shows `"phase":"complete-slice"` — after rename it should be `"phase":"complete"`, and for initiative scope the `scope` field needs to use the canonical form without `__active__`. The plan should explicitly specify the flow-log entry format for initiative completion.

Also: Step 10 sets `Current Phase: complete-slice complete` — after rename this becomes `complete complete`, which reads awkwardly. Consider `complete done` or restructure the state string for initiative scope (e.g., `initiative-complete done — learnings and reconciliation done for <initiative>`).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Archive-then-reference ordering risk in Step 10b

The plan archives the initiative directory (renames `__active__<name>/` to `~~archived~~NN_<name>/`) as the final step. But Step 10 (state write-back) happens before Step 10b (archive). The state.md written in Step 10 will reference `initiatives/__active__<name>` as the Active Slice — but immediately after, Step 10b renames that directory. This creates a brief window where state.md points at a nonexistent path.

For slice/quest completion this isn't an issue because the state.md Next Step points to the *next* slice. But the plan should confirm: does Step 10 for initiative scope set Active Slice to the initiative path (which is about to be archived), or to "none"? If the initiative is the last thing being worked on, Active Slice should probably be "none (working at project level)" and Next Step should point to whatever comes after.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Artifact promotion step numbering creates a gap in the existing step sequence

The plan inserts artifact promotion as "new Step 6e, after debt evaluation." The existing steps go: 6, 6b, 6c, 6d, 7, 8, 9, 9b, 10, 10b, 11. Adding 6e fits the naming scheme, but the plan should clarify exactly where in the flow it goes. "After debt evaluation" means after Step 6c, but the plan says "6e" which implies after 6d (signal tracking). Signal tracking before artifact promotion makes more sense (tracking informs the broader picture), so 6e after 6d is correct — but the description says "after debt evaluation" which is 6c. Resolve the contradiction.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Missing backward compatibility for flow-log phase filter in signal tracking

The plan mentions that signal tracking in Step 6d filters on `phase: "complete-slice"` and that after rename, the skill must query both `"complete-slice"` and `"complete"`. However, this is only called out in the research file, not as an explicit task in the plan. Phase 2 doesn't include a task for updating the signal tracking algorithm's flow-log filter. Without this, the renamed skill would lose visibility into all historical completions, breaking trend detection.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 task for `initiative-conventions.md` may be unnecessary

The research file explicitly notes: "`_shared/references/initiative-conventions.md` already uses `/complete` (no `complete-slice` references). It does NOT have parenthetical annotations to clean up." Yet Phase 3 includes tasks to update `initiative-conventions.md` transition tables and Consumer Guide for `complete-slice` -> `/complete`. If the research is accurate, these tasks are no-ops. The plan should either reconcile this (perhaps re-verify via grep) or remove the redundant tasks to avoid confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Historical references in `.project/learnings.md` and `.project/system-profile.md` lack a clear decision

The research file identifies `_Source: 07-complete-slice_` tags in learnings.md and recency markers in system-profile.md containing `complete-slice`. The plan's Phase 1 task says "Update repo files: Grep for `complete-slice`" but the research notes these are "historical records — the plan should decide whether to update or leave as-is." The plan doesn't make this decision explicitly. Source tags in learnings.md are identity markers for *when the learning was created* — updating them retroactively would be revisionist. The plan should state: "Leave historical `_Source:` tags and recency markers unchanged — they reflect the skill name at time of writing."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `$SLICES_DIR` variable not set for initiative scope

Step 0 defines `$SLICES_DIR` as N/A for side-quests. For initiative scope, `$SLICES_DIR` isn't mentioned in the plan's extension of Step 0. While it may not be needed (initiative completion doesn't iterate over slices in the same way), the plan references "Validate all slices under `$INITIATIVE_DIR/vertical-slices/`" in Step 2 — so it implicitly derives the slices path from `$INITIATIVE_DIR`. This is fine but should be explicit: either set `$SLICES_DIR = $INITIATIVE_DIR/vertical-slices/` or note it's derived.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has a sound high-level structure — the three-phase approach (rename, extend, cleanup) is logical, and the initiative completion workflow captures the right concerns (slice validation, learnings synthesis, architecture reconciliation, artifact promotion, archive numbering). However, the plan only addresses the "new" initiative-specific steps while leaving significant gaps in how existing intermediate steps (6b, 6c, 6d, 7, 9, 9b) interact with initiative scope. This is a structural issue: the skill has 11+ steps, and the plan explicitly extends ~8 of them while silently assuming the others either work as-is or should be skipped. Each skipped step needs an explicit decision. The flow-log backward compatibility issue is critical — without it, signal tracking breaks for all historical data after the rename.

To reach 9+: (1) Address every existing step for initiative scope (even if just "skip — not applicable"), (2) specify flow-log entry format for initiative completion, (3) add the flow-log phase filter backward compatibility as an explicit task, (4) resolve the Step 6e ordering contradiction, (5) make explicit decisions about historical references.

## Summary
- Critical: 1
- Important: 3
- Minor: 3
