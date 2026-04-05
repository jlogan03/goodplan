# Merged Feedback — Slice 08 Documentation Plan (Round 1)

### CRITICAL Issues

**C1. Phase 1: `epic:activate` precondition handling is underspecified**
The plan's Step 2 says "verify status is `slices-refined`" but doesn't enumerate wrong-status cases or remedies. The rewrite must handle the main wrong-status paths explicitly: `created` -> run `/gp:create-epic`, `explored` -> run `/gp:create-epic` to continue, `slices-defined` -> run `/gp:plan-slice` to refine, `activated` -> already done. The plan says "tell user what's needed" which is too vague for a full skill rewrite.
Sources: software-architecture (CRITICAL — also flagged `slices-defined` acceptance), agent-skill (CRITICAL — enumeration of cases)
Note: software-architecture claims `epic:activate` accepts both `slices-defined` and `slices-refined`, while agent-skill says the state machine transition table only allows `slices-refined`. See Contradictions Resolved below.
Resolution: DIRECTLY_ACTIONABLE

**C2. Phase 2 Bug A: Learnings rollup missing schema format specification**
The plan says "include all learnings in the `epic:complete` payload" but does not specify the required `learningInputSchema` format: `{ category, summary, detail, tags, rollupTo }` with `category` being one of `"domain" | "worked" | "didnt-work" | "do-differently"`. Without this, the implementer will produce learnings that fail Zod validation at the CLI boundary. The plan must specify that Step 7 must parse `consolidated-learnings.md` and construct properly-typed learning objects matching this schema.
Sources: agent-skill (CRITICAL), software-architecture (CRITICAL — flagged missing `goal` field for quest creation, which is the Bug B variant of incomplete schema)
Resolution: DIRECTLY_ACTIONABLE

**C3. Phase 2 Bug B: Quest creation missing `goal` field source**
The plan replaces `--title "{description}"` with `echo '{"name":"<name>","goal":"<goal>"}' | $GP quest:create --json` but doesn't specify where the `goal` value comes from. The current recommendation structure only has `description` (maps to `name`), with no source for `goal`. Plan must specify: synthesize from the recommendation's `description` + `scope` fields, or use a fixed string like "Follow-up from epic completion."
Source: software-architecture (CRITICAL)
Resolution: DIRECTLY_ACTIONABLE

### IMPORTANT Issues

**I1. Phase 3: Stale reference sweep is incomplete — only 6 of 18 files enumerated**
The plan explicitly tasks 6 files but grep finds 18 files with stale references (75 total occurrences). The remaining 12 files are left to a vague catch-all. Fix: enumerate all 18 files with match counts, or at minimum list the remaining 12 as an explicit sub-task: `create-epic/SKILL.md` (10), `plan-slice/SKILL.md` (2), `audit/SKILL.md` (4), `create-side-quest/SKILL.md` (1), `_shared/references/cli-interaction.md` (2), `_shared/references/decisions-format.md` (1), `_shared/references/README.md` (1), `_shared/references/audit-conventions.md` (1), `init/references/expertise-profiling.md` (1), `init/references/repo-scanning.md` (1), `init/references/migration-detection.md` (1), `upgrade/references/migration-heuristics.md` (2).
Sources: holistic (IMPORTANT), repo-tooling-docs (IMPORTANT)
Resolution: DIRECTLY_ACTIONABLE

**I2. Phase 3: `agents/` directory stale references omitted**
4 stale references across 3 agent files: `agents/audit-architecture-phase.md` (2), `agents/audit-docs-phase.md` (1), `agents/audit-tests-phase.md` (1). These should be explicitly listed as tasks.
Source: holistic (IMPORTANT)
Resolution: DIRECTLY_ACTIONABLE

**I3. Phase 3: Grep patterns produce false positives against CLI command names**
The verification grep uses broad substrings like `refine-architecture` which match legitimate CLI sub-command patterns in `create-epic/SKILL.md` (e.g., `$GP epic:refine-architecture`). These 10 matches are valid CLI commands, not stale skill references. The "0 matches" assertion is unsatisfiable without a more precise pattern. Fix: update grep to match `/`-prefixed skill invocations only, or exclude lines containing `$GP` or `gp `.
Source: repo-tooling-docs (IMPORTANT)
Resolution: DIRECTLY_ACTIONABLE

**I4. Phase 3: Before/After verification grep patterns are misaligned**
The Before check uses `grep -v 'SKILL.md:.*description'` to exclude false positives, but the After verification uses different patterns (`\b` word boundaries, different term sets). They should test the same thing so the implementer can confirm the Before count drops to zero.
Source: holistic (IMPORTANT)
Resolution: DIRECTLY_ACTIONABLE

**I5. Phase 3: Mapping table missing `/project-status` -> `/gp:status` rename**
This is one of the more visible renames (appears in `status-logic.md`, `cli-interaction.md`, `README.md`). Add to mapping table.
Source: repo-tooling-docs (IMPORTANT)
Resolution: DIRECTLY_ACTIONABLE

**I6. Phase 2 Bug C: Verification validation checks self-constructed data**
The plan says "check all `verificationResults` entries have `passed: true`" before `epic:complete`, but the orchestrator constructs these entries itself. The real validation should check the agent's analysis of the epic's actual verification criteria (from `gp epic:show --json`), not the payload the orchestrator is about to submit. Clarify that verification validation operates on the agent's assessment of epic verification criteria, then the orchestrator constructs the submission payload from that.
Sources: software-architecture (IMPORTANT — phrasing ambiguity), agent-skill (IMPORTANT — logical gap)
Resolution: DIRECTLY_ACTIONABLE

**I7. Phase 1: start-epic rewrite missing context discipline statement**
The existing complete-epic skill has an explicit "Context Discipline" section. The start-epic rewrite doesn't include one. Since it reads architecture files to present to the user (Step 4), a discipline statement should clarify this is a legitimate orchestrator exception.
Source: agent-skill (IMPORTANT)
Resolution: DIRECTLY_ACTIONABLE

**I8. Phase 3: Stale reference mapping for `status-logic.md` is incomplete**
The file has references in both Epic States and Slice/Quest States tables. Lines 108-114 have `/create-plan`, `/refine-plan`, `/implement-plan`, `/complete` in the slice state table that need mapping to `/gp:plan-slice`, `/gp:implement`, etc. Line 100 has three skill names needing `/gp:` prefix. The mapping should be comprehensive line-by-line, not estimated as "~20 old skill name references."
Source: software-architecture (IMPORTANT)
Resolution: DIRECTLY_ACTIONABLE

**I9. Phase 5: E2E validation needs harness-bug vs skill-bug distinction**
The plan says "diagnose and fix" but doesn't distinguish harness infrastructure bugs (out of scope, Experimental maturity) from skill/reference bugs (in scope). Fix: skill bugs are in scope; harness bugs should be captured as tasks via `/gp:task` and marked as "harness limitation."
Source: agent-skill (IMPORTANT)
Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

**M1. Phase 1: No functional smoke test before Phase 5 E2E**
Verification is limited to `bun run build:plugin` and grep checks. Consider adding a note that Phase 5's E2E covers start-epic, or add a targeted harness run.
Source: holistic (MINOR)
Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 2 Bug A: Payload format unspecified**
The plan says "Include all learnings in the `epic:complete` payload" without specifying whether it's stdin JSON with a `learnings` array, repeated flags, etc. Reference `gp schema` output or commands-api doc.
Source: holistic (MINOR) — partially subsumed by C2.
Resolution: CODEBASE_EXPLORATION

**M3. Phase 4: Success criteria are subjective**
"Read each doc and confirm accuracy" is human judgment, not runnable. Add grep-based counts: `grep -c '/gp:' README.md` should return at least 12, negative grep for old skill names should return 0.
Source: holistic (MINOR)
Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 4: `_overview.md` scope confusion**
The plan says update `.goodplan/architecture/_overview.md` with skill count, but the top-level overview describes CLI subsystems, not skills. Clarify which architecture overview is being updated to avoid leaking epic-level concerns.
Source: software-architecture (MINOR)
Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 4: `conventions.md` already has `agents/`**
The task says "Add `agents/` to repo structure" but it's already there. Change to "Verify `agents/` is present and agent count is accurate (currently 34)."
Source: repo-tooling-docs (MINOR)
Resolution: DIRECTLY_ACTIONABLE

**M6. Phase 5: Hardcoded `--model claude-opus-4-6` is a runtime detail**
Consider using the harness default or noting as suggestion rather than requirement.
Sources: software-architecture (MINOR), repo-tooling-docs (MINOR)
Resolution: DIRECTLY_ACTIONABLE

**M7. Phase 3: `output-templates.md` "Used by" annotations need explicit replacement**
Line 9 says "Used by: refine-plan, refine-architecture, refine-slices, implement-plan" — should reference the skill names that invoke these templates: `plan-slice`, `create-epic`, `implement`.
Source: software-architecture (MINOR)
Resolution: DIRECTLY_ACTIONABLE

**M8. Phase 1: `grep -r` on single file is sloppy**
Drop the `-r` flag when targeting a single file.
Source: repo-tooling-docs (MINOR)
Resolution: DIRECTLY_ACTIONABLE

**M9. Phase 1 Step 6: Next-step guidance after activation is imprecise**
Should say "Run `/gp:plan-slice` to create a plan for the first slice, or `/gp:status` to see the full slice list" rather than assuming `/gp:plan-slice` is always the next step.
Source: agent-skill (MINOR)
Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE
C1, C2, C3, I1, I2, I3, I4, I5, I6, I7, I8, I9, M1, M3, M4, M5, M6, M7, M8, M9
Count: 20

### RESEARCH_NEEDED
- **R1.** Verify `gp epic:list` exists as a CLI command — if not, start-epic must use `gp status --json` for epic auto-detection. (agent-skill I — `epic:list` command existence)
- **R2.** Verify whether `epic:activate` CLI command handles `architecture-proposal/` to `architecture/` promotion. If not, start-epic rewrite is missing a critical step. (software-architecture I)
- **R3.** Check `skills/_shared/references/epic-conventions.md` and `state-and-activity-formats.md` for stale skill name references. (agent-skill M)
- **R4.** Determine `epic:complete` payload format — stdin JSON schema for learnings. (holistic M / subsumed by C2)
Count: 4

### Contradictions Resolved

1. **`epic:activate` precondition: `slices-defined` OR `slices-refined`?**
   software-architecture says the command description accepts both; agent-skill says the state machine transition table (`epic-lifecycle.ts` line 208) only allows `slices-refined`. **Resolution:** Trust agent-skill (domain specialist on state machine behavior) — the *command description* may be aspirational or outdated, but the transition table is the actual enforcement. The plan's `slices-refined` check is correct. However, the plan should handle `slices-defined` as a wrong-status case with a helpful remedy message, as agent-skill recommends. This resolves the apparent contradiction: both reviewers agree the skill should check for `slices-refined` and guide users in `slices-defined` state to refine first.

2. **Phase 3 file count: holistic says 18 files, repo-tooling-docs says 18 files but different breakdowns.**
   Both reviewers agree on the problem (incomplete enumeration) and largely overlap on the missing files. Merged into I1 with the complete list.

3. **Phase 2 Bug C verification: software-architecture says "actually fine" (in-memory data), agent-skill says "logical gap" (self-constructed data).**
   These aren't contradictory — software-architecture says it's fine that the orchestrator isn't reading files (no context discipline violation), while agent-skill says the *logic* of validating self-constructed data is pointless. Both are correct about their respective concerns. Merged into I6: no context discipline violation, but the validation logic needs to check the agent's assessment of actual epic verification criteria.

### Available Research

- `/Users/iwhite/Repos/goodplan/.goodplan/epics/simplify-data-model/slices/08-documentation/research/cli-commands-research.md` — epic:list existence (YES), epic:activate promotion (NO — skill must handle), epic-conventions.md stale refs (NONE), epic:complete payload format (learningInputSchema confirmed)
- `/Users/iwhite/Repos/goodplan/.goodplan/epics/simplify-data-model/slices/08-documentation/research/_codebase-context.md` — codebase context summary

### Unresolved (USER_INPUT required)

None.
