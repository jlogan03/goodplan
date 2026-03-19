# Merged Feedback — Initiatives Infrastructure (Round 3)

Reviewers: Holistic (9/10), Software Architecture (9/10), Agent Skill (9/10)
Issues: Critical 0 · Important 2 · Minor 6 (after dedup)

---

## Important

**[IMPORTANT-1] `/refine-architecture` and `/audit-architecture` are missing from plan scope**

Both skills hardcode reads/writes to `.project/architecture/`. When initiative architecture lives at `initiatives/__active__<name>/architecture/`, both skills will operate on the wrong path.

- `/refine-architecture`: "No arguments — always operates on `.project/architecture/`"
- `/audit-architecture` Step 1: globs `.project/architecture/**/*.md`
- `maturity-conventions.md` line 81 already references `/audit-architecture` in an initiatives context, making the gap visible

The plan updates 7 skills but omits these two without acknowledgment. Decision required: add lightweight tasks to Phase 5 or 8 to update their path resolution (detect active initiative, resolve architecture path accordingly), or explicitly document them as a follow-up side quest.

Sources: Holistic [IMPORTANT], Software Architecture [IMPORTANT]
Resolution: USER_INPUT — decision needed on in-scope vs. explicit deferral

---

**[IMPORTANT-2] Phase 5 `/define-architecture` state.md path resolution has a gap for the first initiative**

Phase 5 says the skill reads `state.md` to detect the active initiative and derives the output path via `initiative-conventions.md`. But the plan does not specify what `/create-initiative` Mode A writes to the Active Slice field in `state.md`. If it writes `"none"` or leaves it blank, `/define-architecture`'s lookup finds no initiative context and falls back to `.project/architecture/` — the wrong path.

Two missing specifications:
1. What does `/create-initiative` Mode A write to Active Slice in `state.md`? (Expected: `initiatives/__active__initial` or equivalent)
2. How does `/define-architecture` resolve that value to the correct output path?

Without this, the path derivation chain has a gap at the first initiative's first architecture run.

Source: Software Architecture [IMPORTANT]
Resolution: DIRECTLY_ACTIONABLE

---

## Minor

**[MINOR-1] Phase 4 scope resolution: precedence between step 2 (file-existence) and step 4 (state.md Active Slice) is unspecified**

The expanded 5-step scope resolution has both: (2) Active initiative's active slice (file-existence scan) and (4) Active Slice from state.md. These can disagree (stale state.md vs. actual file state). The existing convention in `status-logic.md` line 16 is "file-existence overrides state.md." The plan should explicitly state that step 2 takes precedence over step 4, and that step 4 is a fallback only when no active initiative exists.

Source: Software Architecture [MINOR]
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] Phase 5 and 6: no task to reject initiative slice paths in `/explore` scope validation**

Phase 5 adds an "Initiative" row to `explore-logic.md`. Phase 6 removes per-slice explore for initiative slices. But neither phase updates `/explore`'s scope validation to handle paths like `initiatives/__active__foo/vertical-slices/02-bar`. If a user passes an initiative slice path directly, the existing "Slice" row in `explore-logic.md` may still match it. Add a task (Phase 5 or 6) to update `/explore` scope validation: reject paths matching `initiatives/*/vertical-slices/*` with a message directing the user to explore at the initiative level instead.

Source: Agent Skill [MINOR]
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] Phase 2 Mode A: exact `state.md` Next Step format not specified**

Phase 2 says state.md Next Step should be `/explore` scoped to the initiative, but doesn't specify the exact string. Current `/start-project` writes `"/explore or /define-architecture"`. For Mode A the value should be one of: `/explore` (relying on scope resolution) or `/explore initiatives/__active__initial` (explicit path). `/project-status` reads this field to suggest next actions, so the format matters. Specify the exact value.

Source: Agent Skill [MINOR]
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4] Phase 5 scaffold content description should explicitly include the `<!-- scaffold -->` marker**

Phase 5 describes the scaffold `_overview.md` content (pointer to initiative architecture, `## Subsystem Maturity` header with empty table) but does not list the `<!-- scaffold -->` marker. Phase 7's stale detection relies on this marker. The marker is implied but not stated in Phase 5's content list, creating a gap an implementer could miss. Add `<!-- scaffold -->` to the scaffold content description in Phase 5 explicitly.

Source: Agent Skill [MINOR] — Note: Phase 7 marker spec was fixed in Round 2 (Holistic confirmed); this is a complementary forward-reference in Phase 5 only.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5] Phase 1 consumer guide should list `/refine-architecture` and `/audit-architecture` as architecture readers**

Phase 1's consumer guide ("Which skills create/read/update initiative artifacts") should include `/refine-architecture` (reads and updates `architecture/` files) and `/audit-architecture` (reads them, proposes side quests) even if their initiative-awareness updates are deferred. Future implementers need to know these skills exist and require eventual updates. This is distinct from IMPORTANT-1 (which is about whether to update them now); this minor applies regardless of that decision.

Source: Holistic [MINOR]
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-6] Phase 8 manifest construction path update for `/refine-slices` should be called out explicitly**

Phase 8 changes the run directory to `initiatives/__active__<name>/vertical-slices/slices-refining/` and updates the Scope Exclusion clause. But the manifest construction logic — which globs for `goal.md` files and creates `goal-refining.md` working copies — is a separate code path that also needs path updates. This is implicit in the scope resolution task but should be an explicit task to avoid an implementer missing it.

Source: Holistic [MINOR]
Resolution: DIRECTLY_ACTIONABLE

---

## Dedup Notes

- `/refine-architecture` + `/audit-architecture` gap: raised by both Holistic [IMPORTANT] and Software Architecture [IMPORTANT] — merged into IMPORTANT-1. Holistic frames it as a USER_INPUT scope decision; Software Architecture frames it as DIRECTLY_ACTIONABLE. Merged resolution preserves USER_INPUT since whether to include or defer is genuinely a scope call.
- Phase 5 scaffold marker: Agent Skill [MINOR-3] flags Phase 5 doesn't list the marker; Holistic's Round 2 verification confirms Phase 7's marker spec was fixed. These are complementary (Phase 7 fixed, Phase 5 not yet explicit) — kept as MINOR-4.
- No contradictions between reviewers.

---

## Round 2 Verification

All three reviewers confirm all Round 2 issues are resolved. No Round 2 regressions.


### USER_INPUT Resolved

1. **refine-architecture and audit-architecture paths**: User chose "Add to this plan" — add tasks to update both skills for initiative-scoped architecture path resolution. They should detect the active initiative and read architecture from the initiative directory when initiative-scoped, falling back to top-level for side quests and project-level work.
