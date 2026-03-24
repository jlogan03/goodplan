## Issues

**[IMPORTANT] Phase 3 end-to-end smoke test verification is underspecified for "infeasible" fallback**
Phase 3 includes a good end-to-end smoke test task, but the fallback ("If full automation is infeasible, run the actual CLI commands manually and verify outputs match what the skill expects") is vague. What specific CLI commands should be run, and what outputs should be compared? The task should list the minimum sequence: `goodplan init --name test --json`, `echo '{"name":"smoke","goal":"test"}' | goodplan epic:create --json`, `echo '{"name":"smoke-slice","goal":"test"}' | goodplan slice:create --epic smoke --json`, then verify `goodplan status --json` shows the expected structure. For `complete`, at minimum verify `goodplan slice:show --slice smoke-slice --epic smoke --json` returns the expected artifact shape. This makes the fallback falsifiable rather than hand-wavy.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2 Step 6d signal tracking jq query is fragile and possibly wrong**
Step 6d replaces activity-log reads with `goodplan state --json --query '[.["activity-log.jsonl"][] | select(.phase == "complete")]'`. The `activity-log.jsonl` entries may not have a `.phase` field with value `"complete"` — the activity log records transitions, not phases. The implementer needs to know the actual activity-log entry schema to construct correct jq queries. Add a task to verify the activity-log entry shape via `goodplan state --json --query '.["activity-log.jsonl"][0]'` on a test project, or reference the data model documentation that specifies the schema.
Resolution: CODEBASE_EXPLORATION

**[MINOR] Phase 2 Step 0 retention of shell variables is unclear on CLI derivation**
Step 0 says "Keep the `$SCOPE_TYPE` / `$SLICES_DIR` / `$EPIC_DIR` variable resolution, but derive from CLI commands instead of filesystem scanning." This is vague about which CLI commands. Should be: derive `$EPIC_DIR` from `epic:show --json` (`.dir` field), `$SLICES_DIR` from the epic's slices directory convention, and `$SCOPE_TYPE` from `status --json` (`.activeSlice` vs `.activeEpic`). Adding these specific mappings would prevent implementer guessing.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 diff verification command may produce false negatives**
Phase 3 verification step 4 uses `diff -r skills/ ~/.claude/skills/ --exclude='*.pyc' --exclude='__pycache__'` to verify installation. This will show differences for ALL skills, not just the two being migrated. If other skills have diverged (e.g., local edits), the diff output will be noisy and hard to interpret. Use targeted diffs: `diff skills/create-epic/ ~/.claude/skills/create-epic/` and `diff skills/complete/ ~/.claude/skills/complete/`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 Mode A: `idea.md` write path hardcoded as `.project/idea.md`**
Phase 1 Mode A says "Write `idea.md` to `.project/idea.md` (LLM-owned markdown, path is deterministic after init)." While this path is indeed deterministic, it would be more consistent with the CLI-first philosophy to derive it from the `init` response's `paths` record (if `init` returns one). This avoids hardcoding filesystem conventions that could change. If `init` does not return a `paths` record, this is fine as-is but should note that assumption.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan has thoroughly addressed all round-1 feedback. All critical issues (archive retention, learning:rollup removal, epic:complete payload distinction) are cleanly resolved. The plan is well-structured with clear phasing, precise payload shapes, explicit filesystem accumulation paths, and good separation of decision:create vs architectureDelta. The remaining issues are minor clarity improvements and one query correctness concern (Step 6d jq filter). Fixing the Step 6d query specification and the smoke test fallback would bring this to 10.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
