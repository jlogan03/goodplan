# Generalist Review — Phase 4: Project Status Update

## Plan Adherence

All six plan tasks completed:

- [x] `status-logic.md` updated with initiative state machine reference, `__active__` detection, scope resolution, stale path handling
- [x] SKILL.md Step 5 expanded to 4-step scope resolution (Work Stack -> active initiative slice -> active initiative -> state.md fallback -> project level)
- [x] SKILL.md Step 6 gains initiative directory scanning block
- [x] Format B split into "with active initiative" and "without initiatives" variants
- [x] State-to-next-skill mappings added for all initiative states
- [x] Description frontmatter updated

## Findings

### Critical

None.

### Important

1. **Scope resolution step count mismatch with plan**: The plan specifies 5 steps (1-5) for scope resolution. SKILL.md Step 5 implements 4 numbered steps (1-4), collapsing active initiative slice detection and active initiative itself into sub-bullets of step 2 rather than separate numbered steps. `status-logic.md` lists 5 numbered items matching the plan. The two files are structurally inconsistent with each other — SKILL.md has 4 steps while status-logic.md has 5. Both reach the same outcome, but an implementor following SKILL.md sees a different structure than one following status-logic.md.

2. **`/complete-slice` in status-logic.md mapping but plan says `/complete`**: The state-to-next-skill mapping in `status-logic.md` line 110 uses `/complete-slice <path>` for "Slice: needs completion". The plan (task 4) says to add "initiative state mappings" and update `/start-project` to `/create-initiative`, but the convention file and other skills reference `/complete` (not `/complete-slice`). Verify `/complete-slice` is the intended skill name — if not, this is a wrong mapping that will confuse users.

3. **Initiative state naming drift between status-logic.md and initiative-conventions.md**: `status-logic.md` line 89 uses "Initiative: ready for exploration" while `initiative-conventions.md` uses "Ready for exploration" (no "Initiative:" prefix). The "Initiative:" prefix is a display convention added by status-logic.md — this is fine for display purposes, but the mapping table should document that these are display names corresponding to the canonical states in initiative-conventions.md, or match exactly.

### Minor

1. **Format B "Active Initiative" template shows `State: <state> | Next: /<skill>`**: The backtick formatting for the skill command is inconsistent — some template lines use backtick-wrapped commands, others don't. Line 175 has `` Next: `/<skill>` `` with backticks, line 179 has `` → `/<skill> <args>` `` with backticks, but the State line on 175 mixes both. Nitpick but worth standardizing.

2. **Interrupted work check in Step 7 — three separate `ls` commands**: The plan mentions adding `initiatives/__active__*/vertical-slices/*/interrupted.md` to the interrupted work check, which was done (line 115). The three separate `ls` commands could be a single glob, but this is purely stylistic and the current form is clearer.

3. **Format B "without initiatives" still references `/create-initiative` indirectly**: The "No `.project/` directory" message (Step 1, line 24) correctly says `/create-initiative`. But the Format B without-initiatives variant (lines 200-228) doesn't mention how to create an initiative if the user wants to adopt the initiative model for a legacy project. Low priority — `/project-status` reports what exists, not what could exist.

## Score

8/10 — Solid implementation. The scope resolution structural inconsistency between SKILL.md and status-logic.md (important #1) is the main concern — both files are authoritative references and should present the same structure. The `/complete-slice` naming question (important #2) needs verification.
