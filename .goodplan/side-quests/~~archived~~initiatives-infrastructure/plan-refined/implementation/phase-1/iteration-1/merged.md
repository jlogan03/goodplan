# Phase 1 Merged Review: Initiative Conventions

**Reviewers**: Generalist (9/10), Software Architecture (7/10), Agent Skill (8/10)

---

## Important Issues

### 1. `status-logic.md` not updated to reference or delegate to `initiative-conventions.md`

**Sources**: Software Architecture, Agent Skill
**Resolution**: DIRECTLY_ACTIONABLE

`status-logic.md` is the authoritative state machine reference consumed by `/project-status`. The new `initiative-conventions.md` defines the initiative state machine, but `status-logic.md` has no mention of initiatives or cross-reference to the new file. This creates two disconnected sources of truth for state resolution. The Agent Skill reviewer notes the forward reference on line 95 of `initiative-conventions.md` ("same pattern as per-slice state machine in `status-logic.md`"), but the reverse link is missing.

**Recommended action**: Add a cross-reference from `status-logic.md` to `initiative-conventions.md` for initiative-level state. This is a small change that prevents the gap from becoming a problem if phases are implemented out of order. Phase 4 will do the full integration, but discoverability matters now.

### 2. No skills currently reference `initiative-conventions.md` — file is inert

**Sources**: Software Architecture, Agent Skill
**Resolution**: DIRECTLY_ACTIONABLE

Zero SKILL.md files reference the new convention file. The consumer guide lists 15+ skills as readers/writers, but none are wired up yet. This is expected for Phase 1 (later phases wire skills), so this is not a defect. However, the file should be discoverable.

**Recommended action**: Add an entry to `_shared/references/README.md` noting `initiative-conventions.md` and its purpose. No skill wiring needed now — each future phase must add the Read instruction. Confirm the plan's later phases track this.

---

## Minor Issues

### 3. Skill name inconsistency: `/start-project` vs `/create-initiative`

**Sources**: Generalist, Software Architecture
**Resolution**: DIRECTLY_ACTIONABLE

The directory structure section says "Created by `/start-project`" while the transition table uses `/create-initiative`. Phase 2 will rename the skill, but within the document itself the inconsistency could confuse implementers. The Generalist notes this is a judgment call; Software Architecture recommends using `/create-initiative` consistently with a parenthetical noting it replaces `/start-project`.

**Recommended action**: Use `/create-initiative` consistently throughout, with a parenthetical "(replaces `/start-project`)" on first mention. The consumer guide listing both names is fine as-is.

### 4. State machine row 3: "All slices complete" is underspecified

**Sources**: Generalist, Software Architecture
**Resolution**: DIRECTLY_ACTIONABLE

Row 3 condition "All slices complete, no `completion/`" is vacuously true when no slices exist. In practice this is avoided because row 4 checks for `vertical-slices/sequencing.md`, but the condition text should be explicit for implementers.

**Recommended action**: Tighten to "All slices in `vertical-slices/` complete AND `vertical-slices/sequencing.md` exists, no `completion/`" or similar.

### 5. Table of contents missing for 243-line reference file

**Sources**: Agent Skill
**Resolution**: DIRECTLY_ACTIONABLE

At 243 lines, `initiative-conventions.md` exceeds the progressive disclosure guideline threshold (~100 lines) for needing a TOC. `maturity-conventions.md` sets the pattern with an explicit TOC.

**Recommended action**: Add a TOC at the top of `initiative-conventions.md`.

### 6. `state-and-flow-formats.md` update is incomplete

**Sources**: Agent Skill, Software Architecture
**Resolution**: DIRECTLY_ACTIONABLE

The update covers initiative-scoped slice scope values but not: (a) initiative-level scope values themselves (e.g., `initiatives/<name>` for initiative-level events), and (b) `state.md` "Active Slice" field format for initiative-scoped slices. Phase 4+ will need both.

**Recommended action**: Add initiative-level scope value guidance and state.md path format for initiative-scoped slices.

### 7. Consumer guide missing `/project-status` as a reader

**Sources**: Agent Skill
**Resolution**: DIRECTLY_ACTIONABLE

`/project-status` will read initiative state to report status but is not listed in the consumer guide. Since Phase 4 updates `/project-status` for initiative awareness, listing it now makes the consumer map complete.

**Recommended action**: Add `/project-status` as a reader in the consumer guide table.

### 8. `architecture/` population timing for subsequent initiatives unclear

**Sources**: Generalist
**Resolution**: DIRECTLY_ACTIONABLE

The directory structure shows subsequent initiatives have an `architecture/` directory (populated after approval), but neither the convention file nor the transition table documents who creates it.

**Recommended action**: Add a note clarifying that Phase 3 (`/start-initiative`) is responsible for creating `architecture/` from the proposal upon approval.

---

## Items Requiring USER_INPUT

None. All issues are directly actionable or deferred to later phases by design.

---

## Contradiction Resolution

**No contradictions found.** All three reviewers agreed on the same core issues (naming inconsistency, row 3 underspecification, file discoverability). The Software Architecture reviewer scored lower (7/10) primarily due to weighting the discoverability/isolation concern more heavily, which is appropriate for the domain — trusted as the domain specialist on architectural concerns.
