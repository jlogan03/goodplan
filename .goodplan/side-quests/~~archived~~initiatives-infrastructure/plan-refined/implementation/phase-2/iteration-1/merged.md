# Merged Review — Phase 2: Create Initiative Skill (Iteration 1)

**Consensus Score: 8.5/10** | Critical: 0 | Important: 2 | Minor: 3

## Important

### 1. `.project/idea.md` still references `/start-project`
Lines 19 and 67 of `idea.md` use the old skill name. This is a living project document loaded by `/project-status` — users will see stale naming.
- File: `/Users/iwhite/Repos/goodplan/.project/idea.md`
- Source: Agent Skill (Important)
- Resolution: DIRECTLY_ACTIONABLE — rename references to `/create-initiative`

### 2. Remove "(replaces `/start-project`)" from `initiative-conventions.md`
Line 30 retains a parenthetical referencing the old name. Now that the rename is complete across all active skills, the historical note is stale context in what should be the single source of truth for initiative structure.
- File: `~/.claude/skills/_shared/references/initiative-conventions.md:30`
- Source: Software Architecture (Important), Agent Skill (Minor — agreed on substance, differed on severity)
- Resolution: DIRECTLY_ACTIONABLE — remove the parenthetical

> **Generalist dissent resolved**: Generalist flagged the same two references as "acceptable." Architecture reviewer's reasoning is stronger — `initiative-conventions.md` is a normative reference doc, and `idea.md` is a living project doc. Both should use the current name. Trust domain specialists here.

> **`refine-slices` example path dropped**: Architecture reviewer flagged `.project/vertical-slices/01-start-project/...` in `refine-slices/SKILL.md:24` as IMPORTANT. However, this is a generic example illustrating the working-directory pattern, not a skill invocation reference. The string `start-project` here is a hypothetical slice name, not the renamed skill. Generalist correctly identified this as benign. Downgraded to no action.

## Minor

### 3. Top-level `architecture/` dir created eagerly in Mode A
Mode A Step 2 `mkdir -p` creates `.project/{...architecture...}`, but `initiative-conventions.md` says top-level architecture is populated by `/complete`. Harmless but slightly ahead of need.
- File: `~/.claude/skills/create-initiative/SKILL.md`
- Source: Generalist
- Resolution: DIRECTLY_ACTIONABLE — could defer to `/define-architecture`, but not blocking

### 4. `/start-initiative` forward reference in Mode B Step 14 could note "(future skill)"
Step 14 references `/start-initiative` which is Phase 3. Adding a brief note would prevent implementer confusion.
- File: `~/.claude/skills/create-initiative/SKILL.md:240`
- Source: Software Architecture
- Resolution: DIRECTLY_ACTIONABLE

### 5. `decisions-format.md` Reader/Writer list ambiguity for `/create-initiative`
`/create-initiative` is in the Readers list (correct) but not Writers. The skill loads decisions and flags `revisiting` status — if it can resolve decisions, it should be in Writers. If not, SKILL.md should clarify it only reads.
- File: `~/.claude/skills/_shared/references/decisions-format.md:78`
- Source: Software Architecture
- Resolution: USER_INPUT — clarify intent

## Withdrawn

- **Agent Skill false alarm on `/start-initiative`**: Reviewer initially flagged as missed rename, then self-corrected after confirming it is a distinct future skill. No action.
- **Agent Skill minor on Step 14 redundancy**: Inline repetition of conventions already loaded in Step 0. Not actionable — the repetition serves as a guard rail in a long file.
