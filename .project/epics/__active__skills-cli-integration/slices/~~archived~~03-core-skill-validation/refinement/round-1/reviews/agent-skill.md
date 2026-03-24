## Issues

**[CRITICAL]** Plan instructs `complete` to use `start-complete` for context loading, but this command does not exist
The epic architecture convention doc (`cli-interaction-conventions.md` line 206) shows `goodplan start-complete --slice my-slice --inline --json` in the "worked example" for the complete orchestrator pattern. The plan's Phase 2 Step 3 references loading artifacts via CLI commands. However, `start-complete` does not exist — this is documented in the shared `cli-interaction.md` (section 9: "There is no `start-complete` command"), in project learnings, and was flagged during slice definition review. The plan's Phase 2 should explicitly state that `complete` loads artifacts via `slice:show --json` / `epic:show --json` (for artifact existence booleans) and `state --json --query` (for activity-log and JSONL data), plus direct Read for LLM-owned markdown. The plan currently says "Replace entity JSON reads with `slice:show --json` / `epic:show --json`" and "Replace `activity-log.jsonl` reads with `goodplan state --json --query`" but does not call out the non-existence of `start-complete` as a constraint, which risks the implementer looking for it. The epic convention doc's worked example also needs correction as part of Phase 3 validation.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `epic:complete` payload shape differs from `slice:complete` but plan treats them interchangeably
The plan's Phase 2, Step 10 says "construct the `slice:complete` / `epic:complete` / `quest:complete` stdin payload" as if they share a shape. Per `commands-api.md`, `epic:complete` takes `{"verificationResults": [{"index": N, "passed": bool, "notes": "..."}]}` — an array of per-verification results with index fields. This is fundamentally different from `slice:complete` which takes `{"verificationPassed": true, "learnings": [...], "architectureDelta": [...]}`. The plan must specify how the `complete` skill constructs the `epic:complete` payload: it needs to reference epic-level verifications (added via `epic:add-verification`), evaluate each one, and build the `verificationResults` array. The current plan's description of "read back filesystem-accumulated results and construct the payload" only works for `slice:complete`/`quest:complete` — not `epic:complete`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan says "No CLI code changes expected" but `learning:rollup` and `decision:create` command stdin shapes are not verified
Phase 2 instructs the migrated `complete` to use `goodplan learning:rollup --json` and `goodplan decision:create --json` with stdin payloads. The plan does not specify what these payloads look like, nor does it instruct the implementer to verify them against `goodplan schema --command learning:rollup --json` and `goodplan schema --command decision:create --json`. The convention doc shows `decision:create` takes `{"id": "...", "domain": "...", "title": "...", "summary": "..."}` but the current `complete` skill writes a full markdown decision file — the mapping from markdown fields to JSON payload fields needs to be specified. Similarly, `learning:rollup` takes `--from <source> --to <target>` flags but the plan says "with stdin payload" without specifying the shape. Add a task in Phase 2 to verify these command schemas at the start and document the payload shapes.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 Step 2 auto-detect logic needs CLI-only approach but plan partially retains filesystem scanning
The plan says "Replace directory scanning with `goodplan slice:list --json` + check `status` and `artifacts` fields" but also retains "Keep re-entry check logic (reads `completion/learnings.md` — LLM-owned, allowed)". This is correct for re-entry detection. However, the auto-detect for "implementation-complete-but-not-completed" requires checking if `completion/learnings.md` does NOT exist — a filesystem-absence check. The `slice:list --json` response with `artifacts` can tell you if implementation exists (`artifacts.implementation: true`) but does not expose `completion/learnings.md` existence. The plan should note this gap explicitly: either (a) the `artifacts` object already includes a `completion` field (verify against `goodplan schema`), (b) the skill uses `stat completion/learnings.md` as a legitimate directory-structure read (the convention doc allows "reading directory structure"), or (c) this is a CLI gap to document.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Phase 2 eliminates Step 10b (archive) but does not verify the CLI actually does archiving
The plan says "The CLI's `slice:complete` / `epic:complete` handles the `~~archived~~` rename." This is a critical assumption. If the CLI does not perform archiving, the migrated skill will silently drop this step. Phase 3's manual validation should explicitly trace the archive behavior by checking the CLI source code or running `slice:complete` and confirming the rename happened. Add a verification step to Phase 3: "Confirm `slice:complete` response includes archive path or run `ls` after completion to verify `~~archived~~` rename."
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Verification approach uses grep checks rather than end-to-end skill invocation
All three phases use `grep` and `wc -l` as primary verification. For a skill migration, the most direct verification is invoking the skill and confirming it works end-to-end — or at minimum, tracing through the skill manually with real CLI commands in a test project. Phase 3 has "Manual validation" tasks but they are described as "trace the flow" (a read-through exercise), not "run these commands and check results." The Phase 3 verification should include at least one concrete end-to-end test: create a temp project with `goodplan init`, create an epic, create and complete a slice through the full lifecycle, then run the migrated `/complete` skill. If full automation is infeasible, at minimum the manual validation tasks should specify running the actual CLI commands (not just reading the SKILL.md and mentally tracing).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan does not address how `complete` handles the new `status --json` artifact shape change
The convention doc notes that `status --json` artifacts changed in 1.0.0 from plain numbers to `{ count, files }` objects. The plan instructs using `status --json` for scope detection but does not mention this shape. The implementer may assume the old shape if they reference the current skill. Add a note in Phase 2 Step 2 referencing the artifact shape from the convention doc.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 create-epic Mode A flow references `goodplan epic:show --epic initial --json` but `initial` is the epic name with `__active__` prefix
The plan says: "`goodplan epic:show --epic initial --json` to confirm". The CLI uses the epic name without the `__active__` prefix (per INV-004, target flags use the entity name). This is likely correct but worth making explicit — the name is `initial`, not `__active__initial`. Already clear from the `epic:create` call that passes `"name":"initial"`, but the relationship between filesystem prefix and CLI entity name should be noted for the implementer.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 convention doc task lists "Migration Patterns" to go in `skills/_shared/references/cli-interaction.md` but the authoritative doc is the epic's `cli-interaction-conventions.md`
The research file notes the epic-specific convention doc at `.project/epics/__active__skills-cli-integration/architecture/cli-interaction-conventions.md` is "authoritative (newer)". The shared `skills/_shared/references/cli-interaction.md` already has a "Migration Example" section (section 12). Phase 3 should clarify which file gets the "Migration Patterns" section and ensure they stay consistent. If both files exist post-epic, the shared one should be the surviving artifact.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

Two critical issues (wrong payload shape for `epic:complete`, reliance on non-existent `start-complete`) would cause implementation failures. Three important issues affect correctness of auto-detection, archive handling, and payload construction for `learning:rollup`/`decision:create`. The verification approach is weak for a skill migration — grep checks confirm text patterns but not behavioral correctness. To reach 9+: fix the two critical issues with explicit payload shapes and context-loading strategy, add schema verification tasks, strengthen Phase 3 verification to include at least one end-to-end CLI trace with real commands, and resolve the auto-detect gap.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
