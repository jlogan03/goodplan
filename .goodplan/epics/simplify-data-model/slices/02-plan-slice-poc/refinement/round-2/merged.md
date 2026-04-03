# Merged Review Feedback — Plan-Slice PoC (Round 2)

## CRITICAL Issues

**[CRITICAL-1] Re-entry transition `plan-refined` -> `planning` does not exist in the state machine**
Sources: software-architecture (CRITICAL), holistic (IMPORTANT), agent-skill (IMPORTANT), typescript (IMPORTANT)

The plan (line 113) states re-refinement transitions `plan-refined` -> `planning`, but this transition does not exist. The only valid transition from `plan-refined` is `BEGIN_IMPLEMENTATION` -> `implementing`. No event moves a slice backward from `plan-refined`.

Fix: Remove re-refinement from this PoC slice scope. The orchestrator should offer "view existing plan" or "proceed to implementation" when status is `plan-refined`. Re-refinement can be deferred to a later slice that adds the necessary state machine event (e.g., `BEGIN_RE_REFINEMENT`: `plan-refined` -> `refining`). Users can still manually re-refine via the installed `/gp:refine-plan` skill (v1.0.3).

Resolution: DIRECTLY_ACTIONABLE

---

## IMPORTANT Issues

**[IMPORTANT-1] Missing `slice:refine-plan` transition before refinement loop**
Sources: holistic (IMPORTANT), typescript (IMPORTANT), software-architecture (IMPORTANT — nuanced)

The plan shows `submit-plan` (planning -> plan-created) then immediately `submit-refinement` per round. The software-architecture reviewer notes that `submit-refinement` CAN be called from `plan-created` via a skip path (scores meet threshold on first round), but if scores fail, there is no transition row from `plan-created` to handle it — the state machine will error with `STATE_INVALID_TRANSITION`.

Fix: After `submit-plan` produces `plan-created`, add `gp slice:refine-plan --slice <name> --json` (emits `BEGIN_REFINEMENT`: plan-created -> refining) before calling `submit-refinement`. Update Phase 3 lines 141-142 to include this transition step. Add a note explaining that this handles both pass and fail cases for `COMPLETE_REFINEMENT_ROUND`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2] `submit-refinement` requires scores via stdin but plan doesn't specify it**
Sources: holistic (IMPORTANT), typescript (MINOR)

`submit-refinement` requires `{ "scores": { "<criterion>": <number> } }` via stdin (from `submitRefinementInputSchema`). The plan never mentions piping scores into the command.

Fix: Update Phase 3 line 142 to show: `echo '{"scores": {...}}' | gp submit-refinement --slice <name> --json` where scores are extracted from the synthesis agent's return value. Add a task specifying the orchestrator must map the synthesis aggregate score into the `Record<string, number>` format.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-3] Refinement-coordinator reviewer discovery mechanism unspecified**
Source: software-architecture (IMPORTANT)

The coordinator "selects relevant reviewers from the available set" but HOW it knows the available set is unspecified. Two approaches: (a) orchestrator passes available reviewer agent names in the coordinator's task prompt, or (b) coordinator discovers by convention (`agents/reviewer-*.md`). Option (a) is explicit and testable.

Fix: Specify that the orchestrator passes the list of reviewer agent names in the coordinator's task prompt.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-4] Reviewer agent output handoff mechanism unspecified**
Source: agent-skill (IMPORTANT)

Reviewer agents return text (Agent tool returns a string), but the plan says synthesis receives "all reviewer output paths" (line 134) suggesting file-based handoff. Nowhere do reviewer agent tasks specify writing output to files.

Fix: Specify that each reviewer writes its review to `<tmpdir>/reviews/<domain>.json` (or `.md`) and the orchestrator passes those paths to the synthesis agent.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-5] Sub-agent return format schema — dual representation needed**
Sources: software-architecture (IMPORTANT), repo-tooling (MINOR)

Agent definitions are markdown (cannot import TypeScript). The plan says "define as Zod schema or TypeScript interface in a shared reference file" but doesn't specify the dual representation needed: (a) a markdown reference file for agent `@` injection, and (b) a TypeScript schema for test harness validation.

Fix: Specify two files: a markdown reference at `skills/_shared/references/sub-agent-return-format.md` (for agent `@` injection) and a TypeScript schema (e.g., in `tools/dogfood/schemas/` or `utils.ts`) for test validation. Note these are two representations of the same contract maintained in sync.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-6] Plan-phase agent description inconsistent with orchestrator flow**
Source: software-architecture (IMPORTANT)

Phase 1 agent definition says the plan-phase agent "reads architecture files and Q&A output directly" (discovery-based). Phase 3 orchestrator correctly specifies passing architecture file paths in the task prompt. These must be consistent: the agent definition should state it receives paths via task prompt.

Fix: Update Phase 1 plan-phase agent description to say it receives file paths in the task prompt (orchestrator's responsibility) and reads those specific files.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-7] Plan-slice SKILL.md trigger phrases will conflict with existing skills**
Source: agent-skill (IMPORTANT)

During the transition period, both `/gp:create-plan` and `/gp:refine-plan` remain installed. Trigger phrases like "create plan" and "refine plan" will match the existing skills, not the new `plan-slice`.

Fix: Use differentiating trigger language (e.g., "plan and refine a slice in one step", "end-to-end plan creation and refinement") OR add a task to update existing skill descriptions to defer to `plan-slice` when available.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-8] Architecture `_overview.md` stale `skills:` references at two locations**
Source: agent-skill (IMPORTANT)

Phase 1 task says "remove stale `skills:` frontmatter paragraph (~line 69)" but line 135 also references `skills:` frontmatter ("Agent definitions solve the plugin file permission issue: shared references are injected via `skills:` frontmatter, not Read tool calls") which directly contradicts the `@` reference mechanism.

Fix: Enumerate both locations (lines 69 and 135) in the Phase 1 task to avoid a partial fix.

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

**[MINOR-1] Phase 3 verification is manual-only (weakest of all phases)**
Sources: holistic (MINOR), software-architecture (MINOR)

Phase 3 has only manual verification ("Read through the SKILL.md"), unlike Phases 1/2/4 which have runnable commands.

Fix: Add: `bun run build:plugin` succeeds with new skill, `ls dist/gp-plugin/skills/plan-slice/SKILL.md` exists, `grep 'name: gp:plan-slice' dist/gp-plugin/skills/plan-slice/SKILL.md` matches.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] CLAUDE.md Agent SDK Test Harness table not updated**
Source: holistic (MINOR)

The test harness table should include a row for `test-plan-slice.ts`.

Fix: Add Phase 4 task to update the table.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] `review-preamble.md` content source unspecified**
Source: software-architecture (MINOR)

Is it a copy of `shared-preamble.md` adapted for `@`-injection, or written from scratch? Specifying prevents drift.

Fix: Note the source (adapted from existing `shared-preamble.md`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4] `@` reference validation needs path resolution logic and failure behavior specified**
Sources: software-architecture (MINOR), repo-tooling (MINOR)

The `${CLAUDE_PLUGIN_ROOT}` variable is resolved at runtime. Build validation must strip the prefix and check relative to `dist/gp-plugin/`. Also, failure behavior is unspecified — should hard-fail (broken `@` references cause silent prompt corruption).

Fix: Specify: strip `${CLAUDE_PLUGIN_ROOT}/` prefix, resolve relative to dist plugin directory, hard-fail with error naming the agent file and missing reference path.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5] `cat ... | jq` pattern in Phase 2 Expected Behavior**
Source: repo-tooling (MINOR)

Lines 72 and 76 use UUOC. Should be `jq '.agents' dist/gp-plugin/.claude-plugin/plugin.json`.

Fix: Remove `cat` pipe.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-6] Agent model override precedence not verified in test harness**
Source: agent-skill (MINOR)

Agent frontmatter says `model: opus`, test harness defaults to `haiku`. The plan should verify the `--model` override takes precedence, otherwise tests will use opus (expensive).

Fix: Add Phase 4 verification note confirming `--model` override precedence.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-7] `verifyOrchestratorDiscipline` name implies broader scope than implementation**
Source: agent-skill (MINOR)

Only checks Read calls, but orchestrator discipline also prohibits content-level decisions.

Fix: Rename to `verifyNoArtifactReads()` or add doc comment noting scope limitation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-8] Temp directory cleanup timing ambiguous on partial refinement success**
Source: agent-skill (MINOR)

If cleanup happens at `submit-plan`, refinement artifacts are lost. If only at final submission, partial failure leaves temp dir permanently.

Fix: Clarify: temp dir cleaned up only after orchestrator exits successfully (all rounds complete or early-stop), preserved on any error.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-9] `start-plan` context command not used**
Source: typescript (MINOR)

The CLI provides `gp start-plan --slice <name> --json` which assembles context specifically for planning. The plan manually constructs paths from `gp status --json`. Using `start-plan` would be more robust.

Fix: Consider using `start-plan` output to populate the plan-phase agent's task prompt.

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE

All issues above are directly actionable. Total: 18 (1 CRITICAL, 8 IMPORTANT, 9 MINOR).

## RESEARCH_NEEDED

None.

## Contradictions Resolved

**Contradiction 1: Is `slice:refine-plan` needed before `submit-refinement`?**
- holistic + typescript say YES, it's required — `submit-refinement` from `plan-created` will fail if scores don't meet threshold.
- software-architecture says there IS a skip path where `COMPLETE_REFINEMENT_ROUND` works from `plan-created` on pass, but acknowledges the fail case is unhandled.
- Resolution: Trust the domain specialists (holistic + typescript verified the transition table). The skip path only works on pass; the fail path needs `refining` status. **Add `slice:refine-plan` call.**

**Contradiction 2: Agent-skill flags re-entry as CODEBASE_EXPLORATION, others say DIRECTLY_ACTIONABLE**
- agent-skill marks the re-entry issue as `CODEBASE_EXPLORATION` (needs verification of transition table).
- holistic, software-architecture, typescript all confirm the transition doesn't exist after codebase exploration.
- Resolution: Trust the reviewers who already explored. **DIRECTLY_ACTIONABLE — remove re-refinement from PoC scope.**

## Unresolved (USER_INPUT required)

None.
