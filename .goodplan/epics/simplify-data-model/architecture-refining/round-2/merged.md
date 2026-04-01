# Merged Review Feedback — Simplify Data Model Epic (Round 2)

All three reviewers scored 8/10 (up from 6-7 in R1). All R1 critical issues are resolved. No critical issues remain.

---

## IMPORTANT Issues (4 deduplicated)

### 1. `reconsiderWhen` / `validUntil` evaluation lacks integration spec and ownership

**Sources:** software-architecture, holistic, agent-skill (raised independently by all three)

The `reconsiderWhen` (decisions) and `validUntil` (learnings) evaluation mechanism is described at the data-model level but has no integration spec connecting it to the agent architecture. All three reviewers converge on the same gaps:

- **Which agents** evaluate conditions? Not specified. Software-architecture suggests a dedicated "decision-review" step or assigning it to the refinement-coordinator. Agent-skill recommends architecture-phase, plan-phase, and completion-phase agents (not reviewers or coordinators).
- **How conditions are passed** to sub-agents: the orchestrator must load conditions via CLI (`decision:list --json`, `learning:list --json`) and include them in the task prompt. This is a non-trivial orchestrator responsibility not reflected in the phase tables.
- **Return format**: no field for triggered conditions in the sub-agent return format. Agent-skill proposes `triggeredConditions: [{ entityType, title, condition }]`.
- **Ownership**: software-architecture warns that without consolidation into a single owner, checking will be implemented inconsistently across agents.

**Recommendation:** Add to conventions.md or data-model-changes.md: (a) assign evaluation to specific phase agents (architecture-phase, plan-phase, completion-phase) OR add a single-purpose "decision-review" step, (b) document orchestrator responsibility to load and pass conditions, (c) add `triggeredConditions` to the sub-agent return format.

Resolution: DIRECTLY_ACTIONABLE

---

### 2. Overview consolidation migration needs crash-safe ordering

**Sources:** software-architecture, holistic (same issue, complementary detail)

The migration steps in `data-model-changes.md` section 3 are: read old files, merge, write new, remove old, update HMAC. Both reviewers flag the crash-safety problem: if the process crashes between removing old files and updating HMAC, state is unrecoverable. Holistic adds that a partial failure (e.g., permission error on remove) leaves both old and new files present, creating schema registry ambiguity.

**Recommendation:** Reorder to: write new file, update HMAC, verify, then remove old files. This aligns with the existing `commitState` atomic write pattern. Add a note about rollback behavior (if new file write fails, old files remain untouched).

Resolution: DIRECTLY_ACTIONABLE

---

### 3. Learning schema in architecture doc diverges from actual codebase

**Source:** holistic (unique to this reviewer)

`data-model-changes.md` section 2 shows a learning schema with `title`, `category`, `summary`, `detail`, `tags`, `source`, `rollupTo`. The actual schema in `src/schemas/records/learning.ts` uses `file` (not `detail`), `rollup: boolean` (not in the doc), and has no `title` field. The `learningInputSchema` has yet another shape (`detail` in input, mapped to `file` by the RPC layer). The `validUntil` addition is described against the wrong base schema.

**Recommendation:** Update the "Current Schema" in `data-model-changes.md` to match the actual Zod definitions, or note explicitly that it is simplified and implementers must verify against the real schemas.

Resolution: DIRECTLY_ACTIONABLE

---

### 4. Agent definitions plugin loading mechanism is unverified

**Source:** agent-skill (unique to this reviewer)

The architecture adds `"agents"` to `plugin.json` and assumes Claude Code's plugin loader can discover and spawn `.md` agent definitions from a plugin's `agents/` directory. There is no evidence Claude Code supports this. If it doesn't, the entire orchestrator distribution pattern needs a different mechanism (e.g., project-level `.claude/agents/` populated by install script).

**Recommendation:** Research whether Claude Code plugins support an `"agents"` field and whether the Agent tool can spawn named agents from plugin directories. Test empirically via the dogfood harness.

Resolution: RESEARCH_NEEDED

---

## MINOR Issues (7 deduplicated)

### 5. `complete-epic` classification and spawning pattern unclear

**Sources:** software-architecture, holistic, agent-skill (all three, slightly different angles)

All reviewers note the standalone vs. pipeline distinction for `complete-epic` is fuzzy. Software-architecture and holistic point out the classification rationale ("no interactive phases") also applies to pipeline skills. Agent-skill additionally notes the spawning pattern is undocumented (what sub-agents, does it use the refinement loop?).

**Recommendation:** (a) Add a one-sentence pipeline vs. standalone definition to conventions.md: "pipeline = sequential phases with status transitions; standalone = single logical step, possibly with parallel sub-agents." (b) Add an "Agent Usage" note to `complete-epic` in skill-model-api.md describing its expected spawning pattern.

Resolution: DIRECTLY_ACTIONABLE

---

### 6. `_shared/references/` migration table missing reviewer domain prompt disposition

**Source:** software-architecture

The migration table in `skill-model-api.md` doesn't address reviewer domain prompts (e.g., `reviewers-cross-cutting.md`). These should become the markdown body of each `agents/reviewer-*.md` file, not a separate `_shared/references/` concern.

**Recommendation:** Add a row to the migration table: "Reviewer domain prompts -> become markdown body of `agents/reviewer-*.md` files."

Resolution: DIRECTLY_ACTIONABLE

---

### 7. `verifyPhaseStatus` vs `verifyEntityStatus` naming inconsistency

**Source:** software-architecture

`conventions.md` and `test-harness-api.md` use different names and signatures for the same concept. The test harness version is more general.

**Recommendation:** Align conventions.md to use the test harness name, or remove the duplicate.

Resolution: DIRECTLY_ACTIONABLE

---

### 8. Budget estimate may undercount reviewer agent spawn overhead

**Source:** software-architecture

The ~96K max estimate covers orchestrator context only. With 20+ agent spawns in a full pipeline, spawn overhead alone could be 40-60K. The estimate should note this scope or be revised.

Resolution: DIRECTLY_ACTIONABLE

---

### 9. `plugin.json` `"agents"` field format unspecified

**Source:** software-architecture

The `"agents"` field is referenced but no schema or format is given (list of paths? glob? directory?).

**Recommendation:** Specify the expected format, even briefly. (Note: this is partially subsumed by issue 4 -- if the field isn't supported by Claude Code, the format question is moot.)

Resolution: DIRECTLY_ACTIONABLE (contingent on issue 4 resolution)

---

### 10. Quest status-to-phase table missing

**Source:** holistic

`create-side-quest` uses statuses like `created`, `exploring`, `plan-created`, but the phase detection table in conventions.md only covers epic statuses. Either add a quest table or note that quests share the epic vocabulary.

Resolution: DIRECTLY_ACTIONABLE

---

### 11. Orchestrator fitness function not connected to test harness

**Source:** holistic

The orchestrator context discipline fitness function is defined but not wired into the test harness API. The dogfood harness already checks for `.project/` violations and could verify this too.

Resolution: DIRECTLY_ACTIONABLE

---

### 12. `plan-slice` re-entry for `plan-refined` status unaddressed

**Source:** holistic

No spec for what happens when `/gp:plan-slice` is invoked on an already-refined slice.

Resolution: DIRECTLY_ACTIONABLE

---

### 13. Reviewer agent tool restriction minimum set incomplete

**Source:** agent-skill

The tool restriction note lists Read/Grep/Glob/Write but omits Bash, which reviewers need for `gp status --json` queries.

Resolution: DIRECTLY_ACTIONABLE

---

### 14. `init` skill mode detection heuristic undocumented

**Source:** agent-skill

`/gp:init` absorbs onboard-repo and create-epic Mode A but doesn't describe how it detects which flow to run.

**Recommendation:** Add a brief detection heuristic (check for existing source code) and `--mode` override flag.

Resolution: DIRECTLY_ACTIONABLE

---

## Contradiction Resolution

No contradictions found between reviewers. The `reconsiderWhen`/`validUntil` issue was raised by all three with complementary rather than conflicting recommendations. Software-architecture favors a single dedicated step; agent-skill favors assigning to specific phase agents. Both are valid approaches -- the key agreement is that the current "every agent checks" approach is under-specified and risks inconsistency.

## Score Summary

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| software-architecture | 8/10 | 0 | 3 | 4 |
| holistic | 8/10 | 0 | 3 | 5 |
| agent-skill | 8/10 | 0 | 2 | 3 |
| **Merged (deduplicated)** | **8/10** | **0** | **4** | **10** |

## Path to 9+

1. Specify integration point and ownership for `reconsiderWhen`/`validUntil` evaluation (issue 1)
2. Fix migration ordering for crash safety (issue 2)
3. Align learning schema docs with actual codebase (issue 3)
4. Research-validate agent definitions plugin loading (issue 4)
