# Software Architecture Review — Plan-Slice PoC

## Issues

**[CRITICAL]** Reviewer shared reference files diverge from the established pattern

The plan proposes creating 3 new shared reference files in `skills/_shared/references/`: `review-holistic.md`, `review-software-architecture.md`, `review-agent-skill.md`. However, the existing repo already has `reviewers-cross-cutting.md` (31KB, containing holistic + software architecture + repo-tooling + API contract + TUI-CLI reviewer prompts) and the installed plugin has `reviewers-always.md` and `reviewers-ai-tooling.md`. The plan says it will "extract and restructure this content" but never specifies what happens to the existing files. This creates ambiguity:

1. Does `reviewers-cross-cutting.md` get deleted? Partially consumed? Left as-is alongside the new per-domain files?
2. The epic architecture's `_shared/references/ Migration Table` says reviewer domain prompts should be "split into per-domain files" — but the plan only creates 3 of potentially 20+ domain files. Is this intentional scoping (just enough for the PoC) or an oversight?
3. If the existing `reviewers-cross-cutting.md` remains, there will be two sources of truth for reviewer prompts — the monolithic file and the per-domain extracts.

The plan should explicitly state: (a) which existing files are the extraction sources, (b) whether existing files are left untouched for this slice (PoC scope), and (c) add a note that full migration of all reviewer domain files to per-domain format is deferred to a later slice.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Plan references `review_context` value `"implementation-plan"` but architecture specifies `"implementation_plan"` — inconsistent naming

Phase 3 task says the refinement-coordinator receives `review context "implementation-plan"`. The epic architecture conventions.md defines the closed set of `review_context` values as: `architecture-proposal`, `slice-definitions`, `implementation-plan`, `code-implementation`, `audit-findings` (using hyphens). This is actually consistent. However, the plan-phase task prompt (Phase 3, bullet 6) says: `Spawn refinement-coordinator agent with: draft plan path, review context "implementation-plan"`. The naming is fine but the coordinator agent definition (Phase 1) says it "selects relevant reviewers from the available set" — with only 3 reviewer agents defined in Phase 1 (holistic, software-architecture, agent-skill), there's no issue. But the coordinator agent definition doesn't specify what the "available set" is. The coordinator needs to know which reviewer agents exist to select from. The plan should specify: does the coordinator discover available reviewers by listing `agents/reviewer-*.md`, or does the orchestrator pass the available set in the task prompt?

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `verifyOrchestratorDiscipline()` scope is too narrow — only checks Read calls

Phase 4 defines `verifyOrchestratorDiscipline()` as filtering for "Read calls targeting known artifact paths." But the existing `checkViolation()` in `tools/dogfood/utils.ts` already detects Read/Write/Edit on `.goodplan/` structured state files and Bash manipulation patterns. The orchestrator discipline constraint from the architecture is broader: "orchestrator context should contain only CLI output, sub-agent return values, user Q&A, and lightweight summary files — no Read calls on full artifact files." This means `verifyOrchestratorDiscipline()` should detect Read calls on architecture files, plan drafts, source code, AND shared references — not just `.goodplan/` state files (which `checkViolation()` already handles).

The bigger issue: the plan says to "distinguish orchestrator-level reads from sub-agent reads (sub-agent reads are expected and allowed)." The Agent SDK `query()` stream yields flat messages — there's no built-in way to distinguish which tool calls came from the top-level orchestrator vs. a spawned sub-agent. The plan needs to specify HOW this distinction is made. Likely approach: track Agent tool spawns and attribute subsequent tool calls within that span to the sub-agent, but this requires analyzing the message stream topology.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Severity level mismatch between plan and architecture

Phase 1 task for `review-preamble.md` says severity levels are "CRITICAL, IMPORTANT, SUGGESTION, NITPICK." But the shared preamble from the installed plugin (which this plan's own review is using right now) defines severity levels as "CRITICAL, IMPORTANT, MINOR." The epic architecture conventions.md says "Resolution must be: DIRECTLY_ACTIONABLE, RESEARCH_NEEDED, CODEBASE_EXPLORATION, or USER_INPUT" (these are resolution tags, not severity levels). The plan conflates two different taxonomies and introduces new terms (SUGGESTION, NITPICK) that don't match the established system. Align with the existing severity levels: CRITICAL, IMPORTANT, MINOR.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing status transition for `plan-created` to `plan-refined`

The plan's Phase 3 says `gp submit-plan --slice <name>` is called "after final plan." Looking at the epic architecture's status table for `plan-slice`, the transitions are `created` -> `planning` -> `plan-created` -> `plan-refined`. The `start-plan` command handles `created` -> `planning`. But what triggers `planning` -> `plan-created`? The plan doesn't specify a CLI command for this transition. Looking at the `submit-plan` schema, it submits a "completed plan" — this likely handles `plan-created` -> `plan-refined`. But then what moves the status from `planning` to `plan-created`? The plan says the plan-phase agent "writes plan draft to `<tmpdir>/draft/plan.md`" — but a draft written to a temp dir doesn't trigger a status transition.

The plan should clarify: is there a `create-plan` or intermediate CLI command that transitions `planning` -> `plan-created`, or does `submit-plan` handle the full `planning` -> `plan-refined` transition in one step? This is critical for phase detection/re-entry logic.

Resolution: CODEBASE_EXPLORATION

Research: Check `src/commands/subagent/submit-plan.ts` and the state machine transition tables to determine which status transitions `submit-plan` triggers. Also check if there's a separate command or event for `planning` -> `plan-created`.

---

**[IMPORTANT]** Agent frontmatter specifies `model: opus` but architecture says start with opus for baseline, may downgrade later

Phase 1 agent definitions all specify `model: opus` in frontmatter. The epic conventions say "Default model is opus for all agents. We may downgrade specific agents to sonnet or haiku later." This is fine for production, but Phase 4's test harness defaults to `claude-haiku-4-5` via `--model` flag. The plan doesn't clarify: does the `--model` flag override the frontmatter `model:` field? If not, the test will use opus regardless of the flag, making haiku-tier testing impossible and significantly increasing test costs. The plan should specify whether the test harness passes the model to the Agent tool's spawn options, or relies on the agent frontmatter.

Resolution: CODEBASE_EXPLORATION

Research: Check Agent SDK documentation or existing agent spawn patterns to determine if the `model` specified in agent frontmatter can be overridden at spawn time via the Agent tool's options parameter.

---

**[IMPORTANT]** Temp directory pattern creates cleanup gap

The plan specifies working artifacts go to `/tmp/gp-plan-slice-<name>-<ts>/` and only the final plan is written via `gp submit-plan`. But the plan never addresses temp directory cleanup. Over time, failed or interrupted runs accumulate temp directories. The plan should specify: (a) cleanup on success (rm -rf after submit-plan), (b) cleanup policy for failures (leave for debugging, log the path), and (c) consider using `os.tmpdir()` instead of hardcoded `/tmp/` for cross-platform safety (relevant for future Linux support per the build script's platform handling).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan-phase agent's file reading pattern may violate agent conventions

Phase 1 says the plan-phase agent "Reads architecture files and Q&A output directly (sub-agent has Read access)." This is correct — sub-agents CAN read files. But the architecture overview says `@${CLAUDE_PLUGIN_ROOT}/path` references are used for content injection "bypassing Read permission issues." The plan correctly uses `@` references for shared content (review preamble, plan format) but has the plan-phase agent Read architecture files directly. This is fine architecturally (sub-agents are allowed to Read), but the plan should clarify which architecture files the plan-phase agent reads — are the paths passed in the task prompt (preferred, explicit) or does the agent discover them (implicit, fragile)?

Looking at Phase 3 task bullet 1: "Q&A output path, architecture file paths (from `gp status --json` -> `.artifacts.architecture.files`), slice goal, conventions path" — this is the explicit path passing pattern. Good. But Phase 1's agent description doesn't mention receiving paths via task prompt. The agent definition (Phase 1) and the orchestrator's spawn instruction (Phase 3) should be consistent about this.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `createMinimalFixture()` extension backward compatibility claim needs verification

Phase 4 says extending `createMinimalFixture()` with `sliceGoal`, `numSlices`, `architectureFiles` is backward compatible "all new params optional with sensible defaults." The research file confirms the current signature is `{ dir?, epicName?, sliceName?, withSource? }`. The extension is indeed safe (adding optional properties to an existing optional object). But `numSlices` implies creating multiple slices — the existing fixture creates exactly one. If a test needs 2+ slices, the fixture function's loop must also generate unique names and goals. This is implementation detail, not an architectural issue, but the plan should note that multi-slice fixtures require unique names.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Refinement loop exit condition ambiguity

Phase 3 specifies: "2 adjacent rounds with no improvement -> stop" AND "2 rounds (any position) with net score reduction -> stop." These conditions overlap. If rounds 1 and 2 both show score reduction, that's simultaneously "2 adjacent no-improvement rounds" and "2 rounds with net score reduction." The behavior is the same (stop), so this isn't a bug, but the condition checking code could be simplified. More importantly: "net score" is undefined — is it the synthesis aggregate score, the average of individual reviewer scores, or the minimum? The architecture says "all reviewers >= 9/10" for exit, but doesn't define "net score" for the stagnation check. The plan should specify: net score = synthesis aggregate score (single number from synthesis agent return).

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan is a well-structured tracer bullet for the orchestrator pattern with good phase decomposition and clear expected behavior checks. However, several critical gaps need addressing: the relationship between new per-domain reviewer files and existing monolithic reviewer files is unspecified, the orchestrator-vs-sub-agent tool call attribution in the test harness lacks a feasibility design, severity levels don't match the established taxonomy, and the status transition path through `planning` -> `plan-created` -> `plan-refined` has an unexplained gap. To reach 9+: resolve the 2 critical issues (reviewer file migration scope, coordinator reviewer discovery), clarify the 4 important issues (discipline verification feasibility, severity levels, status transitions, model override mechanism), and tighten the 3 minor specification gaps.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
