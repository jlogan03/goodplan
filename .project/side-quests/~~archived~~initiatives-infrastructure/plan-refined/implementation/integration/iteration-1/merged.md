# Merged Review Feedback — Integration Iteration 1

Reviewers: Software Architecture (6/10), Agent Skill (8/10)

## Important

**IMP-1: implement-plan has zero initiative architecture awareness**
Sources: Software Architecture, Agent Skill

`implement-plan/SKILL.md` contains no references to initiatives, `__active__`, or two-layer architecture. The consumer guide in `initiative-conventions.md` lists `/implement-plan` as reading both top-level (current state) and initiative (target) architecture, but the skill doesn't implement this. The sub-agent prompt in `references/sub-agent-prompts.md` hardcodes `.project/architecture/` only. By contrast, `refine-plan` handles this correctly with explicit initiative architecture awareness in Step 2b and `shared-preamble.md`.

Fix:
1. Add initiative architecture awareness to SKILL.md (matching refine-plan's approach)
2. Update `references/sub-agent-prompts.md` to check initiative architecture
3. Update `references/shared-preamble.md` to match refine-plan's version
4. Add initiative awareness to `codebase-context-discovery.md` (see IMP-2)

Files: `~/.claude/skills/implement-plan/SKILL.md`, `~/.claude/skills/implement-plan/references/sub-agent-prompts.md`, `~/.claude/skills/implement-plan/references/shared-preamble.md`

---

**IMP-2: codebase-context-discovery.md lacks initiative architecture awareness**
Source: Agent Skill

Shared reference used by both `/refine-plan` and `/implement-plan` for Step 2b. Has no mention of initiatives or two-layer architecture. Refine-plan compensates with inline checks; implement-plan does not. This should be the canonical location for this logic.

Fix: Add section to `codebase-context-discovery.md` checking for `initiatives/__active__*/architecture/`, reading `_overview.md`, and flagging conflicts with top-level architecture.

File: `~/.claude/skills/_shared/references/codebase-context-discovery.md`

---

**IMP-3: create-plan auto-detect does not scan initiative slice directories**
Source: Software Architecture

Step 2 sub-step 3 ("no argument and no active slice") only scans `.project/vertical-slices/` for auto-detection. Does not scan `.project/initiatives/__active__*/vertical-slices/*/`. The reference file `create-plan/references/guidance.md` has the same limitation (line 7).

Fix: Add initiative slice directories to auto-detect scan in both SKILL.md and guidance.md.

Files: `~/.claude/skills/create-plan/SKILL.md:31`, `~/.claude/skills/create-plan/references/guidance.md:7`

---

**IMP-4: create-plan name resolution does not search initiative slice directories**
Source: Software Architecture

Step 2 sub-step 1 resolves names via `.project/vertical-slices/` or `.project/side-quests/` but does not include `.project/initiatives/__active__*/vertical-slices/`.

Fix: Add initiative slice directories as a search location for named arguments.

File: `~/.claude/skills/create-plan/SKILL.md:27`

---

**IMP-5: create-plan loads sequencing.md from hardcoded top-level path**
Source: Software Architecture

Step 3 item 6 loads `.project/vertical-slices/sequencing.md` unconditionally. Should detect active initiative and load from `.project/initiatives/__active__<name>/vertical-slices/sequencing.md` when appropriate.

Fix: Resolve sequencing.md path using active initiative detection (like define-slices uses `$SLICES_DIR`).

File: `~/.claude/skills/create-plan/SKILL.md:49`

## Minor

**MIN-1: Consumer Guide omits /refine-slices as initiative architecture reader**
Source: Software Architecture

`refine-slices/SKILL.md` Step 0 loads initiative `goal.md` and `architecture/` when initiative-scoped, but the Consumer Guide table in `initiative-conventions.md` does not list it.

Fix: Add `/refine-slices` to the Consumer Guide table.

File: `~/.claude/skills/_shared/references/initiative-conventions.md:278`

---

**MIN-2: define-architecture uses $INITIATIVE_DIR without formal assignment**
Source: Software Architecture

Step 2 (line 82-83) references `$INITIATIVE_DIR` in bash but Step 0 only formally defines `$ARCH_DIR` and `$FLOW_SCOPE`. Compare with `define-slices` which formally defines `$INITIATIVE_DIR`.

Fix: Add explicit `$INITIATIVE_DIR` assignment in Step 0.

File: `~/.claude/skills/define-architecture/SKILL.md:82`

---

**MIN-3: refine-slices flow-log scope value format inconsistency**
Source: Software Architecture

Step 5 scope value uses `<slices-root relative to .project/>` with `__active__` prefix and `vertical-slices` suffix. Other skills use `$FLOW_SCOPE` stripped of `__active__` (e.g., `initiatives/<name>`).

Fix: Align scope format with other skills.

File: `~/.claude/skills/refine-slices/SKILL.md:115`

---

**MIN-4: Shared references README lists only 2 of 12 files**
Source: Agent Skill

README at `_shared/references/README.md` only lists `state-and-flow-formats.md` and `initiative-conventions.md`. Directory contains 12 files.

Fix: Update table to include all files.

File: `~/.claude/skills/_shared/references/README.md:11`

---

**MIN-5: explore-logic.md scope path table references only top-level vertical-slices**
Source: Software Architecture

Scope path mapping table lists `Slice` paths as `.project/vertical-slices/<name>/...` only. While `/explore` correctly redirects initiative slices, the table should document this.

Resolution: MINOR — document for clarity.

File: `~/.claude/skills/explore/references/explore-logic.md:11`

---

**MIN-6: project-status interrupted work scan misses non-active initiative slices**
Source: Software Architecture

Step 7 scans active initiative slices but not `initiatives/*/vertical-slices/*/` (non-active initiatives that may have interrupted slices from a previous run).

Resolution: MINOR — edge case, harmless in practice.

File: `~/.claude/skills/project-status/SKILL.md:114`

---

**MIN-7: define-architecture description mentions .project/conventions.md ambiguously**
Source: Agent Skill

Frontmatter description says "writing `.project/conventions.md` and architecture files" which could mislead users into thinking conventions.md is initiative-scoped. It is correctly always project-level. Noting for awareness only.

File: `~/.claude/skills/define-architecture/SKILL.md:5`
