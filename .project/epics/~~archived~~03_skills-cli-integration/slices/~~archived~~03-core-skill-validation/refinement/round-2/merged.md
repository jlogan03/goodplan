# Merged Feedback — Round 2

Reviewers: holistic (9/10), software-architecture (8/10), agent-skill (8/10)

---

### CRITICAL Issues

None.

---

### IMPORTANT Issues

**[IMPORTANT-1] Phase 3 smoke test: manual CLI execution must be the primary method, not the fallback**
Sources: holistic (IMPORTANT), agent-skill (IMPORTANT), software-architecture (MINOR — scope gap)

The smoke test task says "run `goodplan init`, `epic:create`, create a slice, advance through implementation, then invoke the migrated `/complete` skill" with a fallback of "run the actual CLI commands manually." Manual CLI command execution should be the *primary* verification approach, not the fallback. Skills are invoked by users typing natural language; this cannot be reliably automated in isolation. The task should list the minimum manual trace: `goodplan init --name test --json`, `goodplan epic:create --json` (pipe appropriate input), `goodplan slice:create --epic ... --json`, advance through implementation phases, then trace each step in `complete/SKILL.md` by running the corresponding CLI commands.

Additionally (from software-architecture): the smoke test must include a `decision:create` call to validate the new CLI interaction pattern introduced in Step 6 of `complete`, since this is a core architectural boundary being established in this slice.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2] Phase 2 Step 6d jq query is fragile and likely incorrect**
Sources: holistic (IMPORTANT), agent-skill (IMPORTANT)

Step 6d replaces direct `activity-log.jsonl` reads with `goodplan state --json --query '[.["activity-log.jsonl"][] | select(.phase == "complete")]'`. Two problems:
1. Activity-log entries record *transitions*, not phases — they may not have a `.phase` field with value `"complete"`.
2. The plan does not verify that the jq syntax is compatible with the `state --json --query` engine (added in slice 01).

Fix: Add an explicit verification task early in Phase 2: run `goodplan state --json --query '.["activity-log.jsonl"][0]'` on a test project to inspect the actual entry shape, then construct the correct filter based on observed fields. Document the verified query in the plan before implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-3] `slice:show --json` has no `dir` field**
Source: software-architecture (IMPORTANT)

Phase 2 Step 4 instructs: "derive `<slice-dir>` from `slice:show --json` field `dir`". The `slice:show --json` response is `{ name, epic, status, goal, deferred, refinement, created, updated, artifacts }` — there is no `dir` field. The `paths` record is only returned by mutation commands via `resolvePathReferences` in the RPC layer, not read-only `show` commands.

Fix: Replace all `slice:show --json` `dir` references with path construction from the `epic` and `name` fields using the deterministic convention: `.project/epics/__active__<epic>/slices/<name>/`. Document this derivation explicitly in the plan so the implementer does not guess.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4] Two different artifacts shapes conflated across steps**
Source: software-architecture (IMPORTANT)

Phase 2 Step 2 correctly notes "artifacts are `{ count: number, files: string[] }` objects — use `.count` for existence checks." However this shape applies only to `status --json` artifacts (architecture, research, brainstorm, prototypes). The plan also references `slice:show --json` artifacts in Step 3 — these have a completely different shape: `{ goal: boolean, exploreComplete: boolean, plan: boolean, planRefined: boolean, implementation: boolean, abandoned: boolean }` (boolean flags, not count/files). Using `.count` on `slice:show` artifacts will fail silently.

Fix: Annotate Step 2's `{ count, files }` note as applying only to `status --json`. Update Step 3 references to `slice:show --json` artifacts to use the correct boolean shape and boolean existence checks.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-5] Convention doc worked example audit should cover `start-explore`, not just `start-complete`**
Source: agent-skill (IMPORTANT)

Phase 3 includes a task to fix the `cli-interaction-conventions.md` worked example that references the non-existent `start-complete` command. However, the same file (line 184) shows `goodplan start-explore --epic my-epic --inline --json` in the explore orchestrator example. If `start-explore` also does not exist, that example also needs correction. The fix task should audit *all* worked examples in the convention doc for non-existent commands, not only the `start-complete` one.

Resolution: CODEBASE_EXPLORATION (verify whether `start-explore` exists before writing the fix)

---

### MINOR Issues

**[MINOR-1] Phase 2 Step 0 variable derivation is vague**
Source: holistic (MINOR)

Step 0 says "Keep `$SCOPE_TYPE` / `$SLICES_DIR` / `$EPIC_DIR` variable resolution, but derive from CLI commands instead of filesystem scanning." This does not say which CLI commands. Should specify: derive `$EPIC_DIR` from `epic:show --json` (`.dir` field if available, otherwise convention), `$SLICES_DIR` from the epic's slices directory using the deterministic convention, and `$SCOPE_TYPE` from `status --json` (`.activeSlice` vs `.activeEpic`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] Phase 3 diff verification produces noisy output for unrelated skills**
Source: holistic (MINOR)

Phase 3 verification Step 4 uses `diff -r skills/ ~/.claude/skills/ --exclude='*.pyc' --exclude='__pycache__'` to verify installation. This diffs *all* skills, not just the two being migrated, so local edits to other skills will produce noise. Use targeted diffs: `diff skills/create-epic/ ~/.claude/skills/create-epic/` and `diff skills/complete/ ~/.claude/skills/complete/`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] `idea.md` path hardcoded without explanation; `init` response shape not noted**
Sources: holistic (MINOR), agent-skill (MINOR), software-architecture (MINOR) — merged

Phase 1 Mode A writes `idea.md` to `.project/idea.md` described as "deterministic after init", while `goal.md` is written "to path from `epic:create` response." The inconsistency is correct behavior (`.project/idea.md` truly is always fixed), but the plan should explain why: `goodplan init --json` returns `{ name, version, projectDir }` — there is no `paths` record. The `idea.md` path is a known fixed convention, not derived from the CLI response. Noting this prevents implementers from searching for a `paths` field that does not exist.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4] Phase 3 convention doc fix targets two different files; explicit paths needed**
Source: software-architecture (MINOR)

Phase 3 has two convention doc tasks that could be confused:
- "Fix convention doc worked example" — targets the epic architecture doc at `.project/epics/__active__skills-cli-integration/architecture/cli-interaction-conventions.md` (non-existent `start-complete` reference at line 206).
- "Add Migration Patterns section" — targets the shared reference at `skills/_shared/references/cli-interaction.md`.

Add explicit absolute file paths to both tasks to prevent the implementer from editing the wrong file.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5] Phase 2 re-entry detection via `stat` missing error handling spec**
Source: agent-skill (MINOR)

The plan says "re-entry detection must use `stat <slice-dir>/completion/learnings.md`" but does not specify how to handle `stat` failure. If the file does not exist, `stat` exits non-zero. The skill should treat this as "no prior completion attempt" (fresh run). Specify: "If `stat` fails (file not found), proceed with fresh completion. If it succeeds, offer to resume from the last completed step."

Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE

Items that can be addressed without additional research:

1. IMPORTANT-1 — Reword smoke test: make manual CLI trace the primary method; add `decision:create` step
2. IMPORTANT-2 — Add early Phase 2 verification task: inspect activity-log entry shape before writing jq filter
3. IMPORTANT-3 — Replace `slice:show --json` `.dir` references with deterministic path construction from `.epic` + `.name`
4. IMPORTANT-4 — Annotate artifacts shape: `{ count, files }` for `status --json`, boolean flags for `slice:show --json`
5. MINOR-1 — Specify which CLI commands derive each shell variable in Step 0
6. MINOR-2 — Replace broad `diff -r` with targeted per-skill diffs
7. MINOR-3 — Note `init` returns `{ name, version, projectDir }` (no `paths`); `idea.md` path is a fixed convention
8. MINOR-4 — Add explicit file paths to both convention doc tasks in Phase 3
9. MINOR-5 — Specify `stat` failure handling for re-entry detection

Total DIRECTLY_ACTIONABLE: 9

---

### RESEARCH_NEEDED

**[RESEARCH-1] Verify whether `start-explore` exists in the CLI** (for IMPORTANT-5)
Run `goodplan start-explore --help` or inspect the CLI command registry. If it does not exist, expand the Phase 3 worked example fix to cover both `start-complete` and `start-explore`. If it does exist, the Phase 3 task scope is correct as written.

Total RESEARCH_NEEDED: 1

---

### Contradictions Resolved

**Step 6d resolution (CODEBASE_EXPLORATION vs DIRECTLY_ACTIONABLE):**
Holistic classified Step 6d as CODEBASE_EXPLORATION (activity-log schema unknown). Agent-skill classified it DIRECTLY_ACTIONABLE (add a verification task). Resolved in favor of agent-skill (domain specialist on skill implementation): the fix is to add an in-plan verification task that surfaces the schema during implementation, making the overall issue DIRECTLY_ACTIONABLE. The schema gap is addressed by the task, not by blocking research.

**Smoke test severity (IMPORTANT vs MINOR):**
Holistic and agent-skill flagged the smoke test as IMPORTANT; software-architecture flagged it as MINOR (narrower scope gap). Resolved as IMPORTANT — the primary vs fallback framing is a meaningful methodological gap for skill verification, not just a minor wording issue.

Total contradictions resolved: 2

---

### Unresolved (USER_INPUT required)

None.
