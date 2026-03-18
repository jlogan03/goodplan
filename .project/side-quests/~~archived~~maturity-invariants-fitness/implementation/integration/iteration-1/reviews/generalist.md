# Integration Review — Generalist

## Scope

Cross-phase integration review of the Architectural Maturity, Invariants, and Fitness Functions implementation across all 4 phases.

---

## 1. Cross-Phase Consistency

### Reference Path Consistency

All skills reference `~/.claude/skills/_shared/references/maturity-conventions.md` consistently:
- **define-architecture** SKILL.md Steps 8f, 8g, 8h all reference the correct path
- **refine-architecture** SKILL.md Step 0.3 loads it correctly
- **audit-architecture** SKILL.md does NOT explicitly reference `maturity-conventions.md` — it reads the maturity table from `_overview.md` and fitness functions from `<subsystem>-api.md` files directly, relying on the format being correct from define-architecture. This is acceptable since audit reads the artifacts rather than producing them, but there's a subtle gap (see Issue 2 below).

### Consumer Guide vs Actual Implementation

The consumer guide in `maturity-conventions.md` states:

| Artifact | Created by | Evaluated by | Promotion suggested by | Audited by | Checked by reviewers |
|---|---|---|---|---|---|
| Maturity table | `/define-architecture` | `/refine-architecture` | `/complete`, `/audit-architecture` | `/audit-architecture` | SW Architecture reviewer |
| `invariants.md` | `/define-architecture` | `/refine-architecture` | — | `/audit-architecture` | Holistic reviewer |
| Fitness functions | `/define-architecture` (candidates) | `/refine-architecture` | — | `/audit-architecture` | SW Architecture reviewer, Holistic reviewer |

**Verified against actual implementations:**
- `/define-architecture` creates all three artifacts (Steps 8f, 8g, 8h) — **MATCHES**
- `/refine-architecture` evaluates maturity via SW Architecture reviewer with maturity evaluation criteria in guidance.md — **MATCHES**
- `/refine-architecture` evaluates invariants — the Holistic reviewer's criterion 12 covers invariant compliance, and the shared preamble instructs loading `invariants.md` — **MATCHES**
- `/refine-architecture` evaluates fitness functions — SW Architecture reviewer criterion 12 covers maturity awareness including fitness functions — **MATCHES**
- `/audit-architecture` audits all three (Steps 3b, 3c, 3d) — **MATCHES**
- `/audit-architecture` suggests promotions/demotions (Step 3d) — **MATCHES**
- Reviewers check plans — SW Architecture reviewer criterion 12, Holistic reviewer criteria 12 and 13 — **MATCHES**
- Consumer guide lists `/complete` as suggesting promotions — `/complete` is out of scope for this quest, so this is unverifiable but correctly noted as a future consumer.

### Artifact Location Consistency

All skills consistently use:
- Maturity table: `architecture/_overview.md` under `## Subsystem Maturity`
- Invariants: `architecture/invariants.md`
- Fitness functions: `## Fitness Functions` section in `<subsystem>-api.md` files

The template in `architecture-logic-templates.md` includes both `## Subsystem Maturity` in `_overview.md` and `## Fitness Functions` in `<subsystem>-api.md`, matching the convention file exactly.

---

## 2. Goal Completion — Success Criteria Check

### SC1: Maturity table format defined and documented
**PASS.** `maturity-conventions.md` § Maturity Table Format defines columns (Subsystem, Maturity, Dependents, Fitness Functions, Notes). The `architecture-logic-templates.md` template includes the table. Column definitions and rules are documented.

### SC2: `architecture/invariants.md` convention established
**PASS.** `maturity-conventions.md` § System Invariants Format defines the format (Statement, Rationale, Scope, Verification), provides examples, and documents the lifecycle (Add, Amend, Retire).

### SC3: Fitness function convention established
**PASS.** `maturity-conventions.md` § Fitness Function Convention defines how they're documented (Property, Test file, Verifies), where they live (subsystem API files), and the lifecycle (Identify candidates, Convert to real tests, Maintain).

### SC4: `/define-architecture` updated
**PASS.** Steps 8f (maturity table), 8g (invariants), 8h (fitness function candidates) are added. Step 8f sets all subsystems to Experimental. The skill writes to the active architecture directory. Graceful stop handling covers all three new steps.

### SC5: `/refine-architecture` updated to evaluate maturity levels
**PASS.** `guidance.md` § Maturity Evaluation provides evaluation questions per level and specifies what to check (evidence alignment, promotion/demotion candidates, maturity-fitness gaps). The SW Architecture reviewer in `reviewer-registry.md` explicitly notes it "also evaluates maturity levels." The `maturity-conventions.md` is loaded in Step 0.3. Conflict resolution in `guidance.md` includes a maturity assessment row.

### SC6: `/audit-architecture` updated
**PASS.** Step 3b (fitness function audit with classify logic), Step 3c (invariant compliance check with spot-check strategy), Step 3d (maturity promotion suggestions). The `guidance.md` for audit includes detailed sections on fitness function audit strategy, invariant compliance checking approach, and maturity promotion/demotion criteria with evidence thresholds.

### SC7: Plan refinement reviewers updated
**PASS.**
- Holistic reviewer (in `reviewers-always.md`): criterion 12 (invariant compliance) and criterion 13 (fitness function awareness) added. Codebase Exploration Focus includes reading `invariants.md` and checking the maturity table.
- SW Architecture reviewer (in `reviewers-cross-cutting.md`): criterion 12 (maturity awareness) added. Codebase Exploration Focus includes reading the maturity table and `invariants.md`.
- Both `shared-preamble.md` files (refine-plan and implement-plan) include instructions to read `invariants.md`.

### SC8: Shared reference file(s) created
**PASS.** `~/.claude/skills/_shared/references/maturity-conventions.md` is the shared reference, consumed by define-architecture, refine-architecture, and (implicitly) audit-architecture.

---

## 3. Integration Correctness — Pipeline Check

### define-architecture creates -> refine-architecture evaluates

**PASS.** define-architecture writes the maturity table to `_overview.md`, invariants to `invariants.md`, and fitness function candidates to `<subsystem>-api.md`. refine-architecture reads all architecture files (Step 0.1) and loads maturity conventions (Step 0.3). The SW Architecture reviewer evaluates maturity evidence and proposes promotions/demotions. The editor sub-agent has maturity guardrails (maturity level changes require annotation, invariant changes need confirmation).

### refine-architecture evaluates -> audit-architecture audits

**PASS.** audit-architecture reads architecture files (Step 1.1), then performs fitness function audit (Step 3b), invariant compliance (Step 3c), and maturity suggestions (Step 3d). The audit reads the maturity table from `_overview.md` and fitness functions from `<subsystem>-api.md` — the same locations where define-architecture writes and refine-architecture evaluates them.

### audit-architecture -> reviewers check

**PASS.** The reviewers operate on plans/code, checking against the architecture artifacts that define-architecture created and refine/audit-architecture maintained. The shared preamble instructs invariant loading. Reviewer criteria 12 (both SW Architecture and Holistic) and 13 (Holistic) check against maturity, invariants, and fitness functions.

### No broken links detected.

---

## 4. Format Consistency

### Maturity Table Format
- Convention file defines: `| Subsystem | Maturity | Dependents | Fitness Functions | Notes |`
- Template in `architecture-logic-templates.md` uses the same format
- define-architecture Step 8f references the convention file for format
- refine-architecture guidance uses the maturity table from `_overview.md`
- audit-architecture reads the maturity table from `_overview.md`
- **CONSISTENT**

### Invariants Format
- Convention file defines: Statement (as heading), Rationale, Scope, Verification
- define-architecture Step 8g references the convention file for format
- audit-architecture Step 3c reads `invariants.md` and checks compliance by invariant ID
- Holistic reviewer criterion 12 loads and checks invariants
- **CONSISTENT**

### Fitness Function Format
- Convention file defines: Property (as heading), Test file, Verifies — in `<subsystem>-api.md`
- Template in `architecture-logic-templates.md` includes `## Fitness Functions` section with comment
- define-architecture Step 8h uses the convention format
- audit-architecture Step 3b reads from `## Fitness Functions` in `<subsystem>-api.md`
- audit-architecture guidance § Fitness Function Audit Strategy aligns with the format
- **CONSISTENT**

---

## 5. No Regressions

### define-architecture
- Steps 1-8d unchanged in structure. New steps 8f, 8g, 8h are additive and occur after all architecture files are written. The graceful stop handler in Step 8e is extended with cases (d), (e), (f) for the new steps. The guidance.md Early Stop section matches with cases (d), (e), (f). **NO REGRESSION.**

### refine-architecture
- Step 0 adds sub-step 3 (load maturity conventions) and sub-step 4 (prerequisite check for deep module criteria 8-11) — both additive. The reviewer registry adds maturity evaluation to the SW Architecture reviewer description but doesn't remove existing behavior. Conflict resolution table adds a maturity row. **NO REGRESSION.**

### audit-architecture
- Steps 3b, 3c, 3d are new steps inserted between existing Steps 3 and 4. The graceful stop handler (Step 6) adds new partial markers for Steps 3b, 3c, 3d. The audit report format adds new sections (Fitness Function Audit, Invariant Compliance, Maturity Changes). The guidance.md adds new sections for fitness function audit strategy, invariant compliance checking, and maturity criteria. The side quest format adds 4 new finding categories. **NO REGRESSION.**

### reviewers-cross-cutting.md
- SW Architecture reviewer: criterion 12 (maturity awareness) added after criterion 11. Codebase Exploration Focus adds two bullet points for maturity table and invariants. **NO REGRESSION** — existing criteria 1-11 preserved exactly.

### reviewers-always.md (Holistic)
- Criteria 12 (invariant compliance) and 13 (fitness function awareness) added. Codebase Exploration Focus adds two bullet points. **NO REGRESSION** — existing criteria 1-11 preserved exactly.

### shared-preamble.md (refine-plan)
- Adds `If architecture/invariants.md exists, read it...` instruction in Codebase Exploration section. **NO REGRESSION.**

### shared-preamble.md (implement-plan)
- Adds `If architecture/invariants.md exists, read it...` with CRITICAL severity for implementation violations. **NO REGRESSION.**

---

## Issues

### IMPORTANT

**1. audit-architecture does not explicitly load `maturity-conventions.md`**

audit-architecture's Step 1 (Load Context) does not include loading `~/.claude/skills/_shared/references/maturity-conventions.md`. It relies on knowing the format implicitly. While the audit reads artifacts that are already formatted (created by define-architecture), it needs to know:
- The maturity level definitions and change protocol to properly evaluate promotions/demotions in Step 3d
- The fitness function entry format to properly classify entries in Step 3b

The audit-architecture `guidance.md` duplicates some of this knowledge (maturity promotion criteria table, fitness function audit strategy) rather than referencing the shared convention file. This creates a maintenance risk — if `maturity-conventions.md` is updated, the duplicated content in audit's `guidance.md` could drift.

**Recommendation:** Add a sub-step to audit-architecture Step 1 to load `maturity-conventions.md`, and add a cross-reference note in audit's guidance.md pointing to the convention file as authoritative.

**2. Consumer guide lists `/complete` as suggesting promotions, but `/complete` is out of scope**

The consumer guide in `maturity-conventions.md` states: "Promotion suggested by: `/complete`, `/audit-architecture`" and the Maturity Promotion Criteria section says "Who suggests promotions: `/complete` (for slices and initiatives) and `/audit-architecture`."

The `/complete` skill is not part of this quest's scope and presumably hasn't been updated. This creates a forward dependency — if someone reads the convention file, they'll expect `/complete` to suggest promotions, but it won't until separately updated.

**Recommendation:** This is acceptable as a documented forward dependency, but should be tracked. Consider adding a note or comment in the convention file: `<!-- /complete not yet updated — tracked in maturity-context-loading quest -->` or verifying that the maturity-context-loading quest covers this.

### MINOR

**3. Duplicated promotion criteria between `maturity-conventions.md` and audit-architecture `guidance.md`**

The promotion criteria appear in both:
- `maturity-conventions.md` § Maturity Promotion Criteria (general evidence list)
- audit-architecture `guidance.md` § Maturity Promotion and Demotion Criteria (specific evidence table by level)

The audit version is more detailed (with from/to evidence requirements), which is appropriate for an audit context. But the general criteria in the convention file could drift from the audit-specific criteria. Not a current problem — the content is compatible — but a maintenance consideration.

**4. refine-architecture guidance.md references `/complete` in demotion criteria**

In the Maturity Evaluation section: "Who suggests promotions: `/complete` (for slices and initiatives) and `/audit-architecture`" — this is actually in `maturity-conventions.md`, not `guidance.md`. The refine-architecture `guidance.md` correctly scopes itself to just evaluation questions and does not reference `/complete`. No issue here on reflection — disregard.

**5. The `maturity-conventions.md` Promotion Criteria section mentions `/complete` suggesting demotions**

"Who suggests demotions: `/complete` and `/audit-architecture`" — same forward dependency as Issue 2. `/complete` is not yet updated.

---

## Score: 9/10

The implementation is thorough, consistent, and well-integrated across all 4 phases. All 8 success criteria are met. Artifact formats and locations are consistent across all consuming skills. The pipeline (create -> evaluate -> audit -> review) has no broken links. Existing behavior is preserved in all modified skills.

The one IMPORTANT issue (audit-architecture not explicitly loading the shared convention file, creating duplication risk) prevents a perfect score. The `/complete` forward dependency (Issue 2) is acceptable given the documented out-of-scope boundary.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
