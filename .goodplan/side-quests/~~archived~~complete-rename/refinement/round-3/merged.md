# Round 3 — Merged Feedback

## CRITICAL Issues

None.

## IMPORTANT Issues

1. **Phase 1 repo-files task misses two non-archived files containing `complete-slice`** [Holistic]
   - `.project/side-quests/upgrade-workflow/goal.md` (out-of-scope note, should be updated like other goal files)
   - `.project/vertical-slices/sequencing.md` (historical slice name `07-complete-slice` — should be listed under "Leave historical provenance markers unchanged" as an explicit exclusion)
   - Also: `docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md` line 255 says "renamed from `/complete-slice`" — add to historical exclusions list
   - Resolution: DIRECTLY_ACTIONABLE

2. **SKILL.md description character limit** [Agent Skill]
   - The proposed description may approach the 1024-character limit. Plan should note the constraint and verify final character count.
   - Resolution: DIRECTLY_ACTIONABLE

3. **Missing directory-name/`name`-field consistency verification** [Agent Skill]
   - Phase 1 verification checks `name: complete` in frontmatter but does not verify the directory is also named `complete/`. Add explicit check.
   - Resolution: DIRECTLY_ACTIONABLE

4. **Graceful stop naming consistency across phases** [Agent Skill]
   - Phase 2 adds cases (e)/(f) with new `complete` naming, but does not cross-reference that Phase 1 already renamed (a)-(d). Someone implementing Phase 2 in isolation could miss this. Add a cross-reference note.
   - Resolution: DIRECTLY_ACTIONABLE

5. **Initiative auto-detect ordering guardrail prominence** [Agent Skill]
   - The key guardrail (only offer initiative completion when ALL slices archived/abandoned AND no `completion/learnings.md` exists) is buried in the last sentence. Elevate it for visibility.
   - Resolution: MINOR (the logic is correct, just needs repositioning)

## MINOR Issues

1. **Phase 1 verification grep false positives from quest's own files** [Holistic]
   - Verification grep will match 15+ times in `.project/side-quests/complete-rename/`. Exclude the quest directory or note these matches are expected.
   - Resolution: DIRECTLY_ACTIONABLE

2. **Archive numbering off-by-one ambiguity** [Software Architecture]
   - "Count existing `~~archived~~` directories" is ambiguous (zero-indexed vs one-indexed). Convention examples start at `01`. Plan should say "NN = count + 1" explicitly.
   - Resolution: DIRECTLY_ACTIONABLE

3. **Artifact promotion flat-file naming inconsistency** [Software Architecture, Agent Skill]
   - Prefix strategy (`<initiative-name>_topic.md`) creates mixed naming in `.project/research/`. Subdirectory isolation would be cleaner. Also: no handling for double-collision (prefixed name already exists).
   - Resolution: DIRECTLY_ACTIONABLE

4. **Step 6b/6c skip rationale missing from guidance.md update task** [Agent Skill]
   - The skip logic is in the plan but not listed under the guidance.md "Initiative Completion Protocol" update task. Add it.
   - Resolution: DIRECTLY_ACTIONABLE

5. **Re-entry detection scope-directory subtlety** [Agent Skill]
   - `completion/architecture-updates.md` exists at both slice and initiative levels. The scope resolution handles this, but making it explicit prevents confusion.
   - Resolution: MINOR

## DIRECTLY_ACTIONABLE

1. Add `upgrade-workflow/goal.md` to repo-files update list; add `sequencing.md` and `docs/superpowers/specs/...design.md` to historical exclusions
2. Note SKILL.md 1024-char limit and verify count
3. Add directory-name = `name`-field verification to Phase 1 checks
4. Cross-reference Phase 1 rename of graceful stop (a)-(d) from Phase 2's (e)/(f) task
5. Exclude quest directory from Phase 1 verification grep (or note expected matches)
6. Specify archive numbering as `count + 1` (one-indexed)
7. Add 6b/6c skip rationale to guidance.md update task
8. Handle artifact promotion double-collision edge case

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **Auto-detect ordering severity**: Agent Skill flagged as IMPORTANT; the issue is that the guardrail text is correct but not prominent enough. Downgraded to MINOR since the logic itself is sound — only the presentation needs adjustment. Trusted Agent Skill's domain knowledge that this is a real concern, but severity aligns with it being a readability issue, not a correctness issue.

2. **Artifact promotion strategy**: Software Architecture suggested subdirectory isolation as superior; Agent Skill flagged the double-collision edge case. These are complementary, not contradictory. Merged into a single MINOR item — the flat-file approach works but has known rough edges.

## Unresolved (USER_INPUT required)

None.
