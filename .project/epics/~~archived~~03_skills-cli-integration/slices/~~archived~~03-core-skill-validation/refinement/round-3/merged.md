# Round 3 Merged Feedback

Reviewers: software-architecture (8/10), agent-skill (9/10)

---

### CRITICAL Issues

None.

---

### IMPORTANT Issues

**[IMPORTANT-1]** Phase 1 Mode A and Mode B: `goal.md` write path must use fixed convention, not `epic:create` response
*(software-architecture; subsumes implicit assumption in agent-skill)*

The plan says "Write `goal.md` to path from `epic:create` response." Codebase inspection confirms `epic:create` returns `paths: {}` — there is no path for `goal.md`. The skill must derive the path from the fixed convention: `.project/epics/<name>/goal.md`, using the `entity` field from the response. Mode B has the same issue.

Fix: Replace "Write `goal.md` to path from `epic:create` response" with "Write `goal.md` to `.project/epics/<name>/goal.md` (LLM-owned markdown; path is a known fixed convention using the `entity` field from the `epic:create` response, not derived from `paths`)." Apply to both Mode A and Mode B.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2]** Phase 2 Step 5: learnings rollup ambiguity — LLM-owned `.project/learnings.md` synthesis must be retained
*(software-architecture)*

The plan's Step 5 says "Eliminate as a separate CLI call" and "Keep idempotency check (read `.project/learnings.md`)." This is ambiguous. Two distinct operations must be distinguished:

(a) **JSONL learnings rollup** — eliminate the `learning:rollup` CLI call; handled atomically by `slice:complete` payload.
(b) **LLM-owned `.project/learnings.md` synthesis** — retain as a content authoring step where the skill reads accumulated learnings and edits the human-readable markdown.

Fix: Clarify Step 5 to explicitly call out (a) and (b) separately.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-3]** Phase 3 smoke test Step 3 missing stdin payload for `slice:create`
*(agent-skill)*

The smoke test says `goodplan slice:create --epic smoke --json` but `slice:create` requires a stdin payload. Without it the binary blocks on stdin.

Fix: `echo '{"name":"smoke-slice","goal":"test"}' | goodplan slice:create --epic smoke --json`

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4]** Phase 2 Step 2 re-entry detection via `stat` still lacks explicit error handling spec
*(agent-skill; flagged in round 2, not yet incorporated)*

The plan mentions `stat <slice-dir>/completion/learnings.md` but does not specify behavior on failure.

Fix: Add: "If `stat` fails (file not found), proceed with fresh completion; if it succeeds, offer to resume from the last completed step."

Resolution: DIRECTLY_ACTIONABLE

---

### MINOR Issues

**[MINOR-1]** `__active__` prefix incorrect in all derived paths — CLI creates directories without it
*(software-architecture)*

Step 0 derives `$EPIC_DIR` as `.project/epics/__active__<epic>/` and Step 4 derives `<slice-dir>` as `.project/epics/__active__<epic>/slices/<name>/`. Codebase inspection shows the `CREATE_EPIC` handler creates `epics/<name>/epic.json` — no `__active__` prefix. The plan already notes "CLI entity names omit the `__active__` filesystem prefix (per INV-004)" but this is not extended to path derivations.

Fix: Remove `__active__` from all derived directory paths. Use `.project/epics/<epic>/` and `.project/epics/<epic>/slices/<name>/`.

Note: agent-skill [MINOR] about `__active__` in Step 4 is the same underlying issue — deduplicated here.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2]** Phase 3 convention doc update — no insertion point specified for 563-line file
*(software-architecture)*

"Add Migration Patterns section to `skills/_shared/references/cli-interaction.md`" but no location guidance given.

Fix: Add "Append the Migration Patterns section at the end of the file, after the existing content."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3]** Phase 2 Step 4 `__active__` prefix exception should be made explicit
*(agent-skill)*

The plan notes derivation uses `__active__` prefix but does not call out that this is for LLM-owned content writes only, not for reading entity state. This exception should be documented in the plan.

Note: With MINOR-1 resolved (removing `__active__` entirely), this issue is superseded. If MINOR-1 is applied, MINOR-3 is automatically resolved.

Resolution: DIRECTLY_ACTIONABLE (resolved by MINOR-1)

---

**[MINOR-4]** Phase 1 Mode A Step 2: expected `epic:show` response shape not specified
*(agent-skill)*

The plan uses `epic:show --epic initial --json` for confirmation but doesn't document which fields to check. Suggested minimum: `{ name, status, goal, ... }` with `status === "created"`.

Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE

Total: 7 items (IMPORTANT-1 through IMPORTANT-4, MINOR-1, MINOR-2, MINOR-4; MINOR-3 auto-resolved by MINOR-1)

All issues are directly actionable — no external research or user decisions required.

---

### RESEARCH_NEEDED

None.

---

### Contradictions Resolved

**Contradiction 1: `__active__` prefix usage**

- agent-skill [MINOR]: `__active__` prefix is acceptable for LLM-owned content writes (Step 4), should just be documented as an explicit exception.
- software-architecture [MINOR]: `__active__` prefix is outright incorrect — CLI creates directories without it.

Resolution: Trust software-architecture (domain-specific codebase evidence from `epic-create.ts` line 32 and `commitState` path mapping). The `__active__` prefix is a legacy skill convention, not the CLI's filesystem behavior. Remove it from all derived paths. MINOR-3 is superseded.

**Contradiction 2: `learning:rollup` elimination**

- agent-skill: `slice:complete` payload handles learnings rollup atomically — Step 5 elimination is correct.
- software-architecture: elimination is only partially correct — JSONL rollup is handled by the state machine, but LLM-owned `.project/learnings.md` synthesis is a content authoring step that must be retained.

Resolution: Trust software-architecture (architectural boundary expertise). Both reviewers are correct on their respective aspects. Merged into IMPORTANT-2: eliminate the CLI call, retain the LLM content step.

---

### Unresolved (USER_INPUT required)

None.
