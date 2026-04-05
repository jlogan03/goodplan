## Issues

**[MINOR]** Phase 3 expertise-profiling.md reference is descriptive, not an invocation

The plan lists `skills/init/references/expertise-profiling.md` (~1 stale match) for update. The actual reference at line 3 is `"Used by /onboard-repo Step 10"` — this is a descriptive comment about which skill uses this reference file, not a skill invocation. While it does reference the old name `/onboard-repo` (now `init`), the fix is straightforward: change to `"Used by /gp:init Step 10"`. The plan handles this correctly by listing it as a task item, but the `~1 stale match` note undersells the context — an implementer might not realize this is a documentation reference, not code. No action needed; the task as written will produce the correct fix.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 migration-heuristics.md has the same descriptive-reference pattern

`skills/upgrade/references/migration-heuristics.md` line 3 says `"Reference for the /migrate skill."` — same pattern as above. The old name `/migrate` should become `/gp:upgrade`. The plan lists this correctly. Same minor note: an implementer should update the description, not look for invocations.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 README verification check is weak

The Phase 4 verification says `grep -c '/gp:' README.md` returns at least 12 (one per skill). This is a loose check — it would pass if the README listed 12 `/gp:` references but some were wrong names or duplicates. A stronger check would be to verify the exact 12 skill names appear: `for s in init status upgrade create-epic start-epic explore plan-slice implement create-side-quest complete-epic audit task; do grep -q "/gp:$s" README.md || echo "MISSING: $s"; done`. However, since Phase 4 also includes a negative grep (ensuring old names are absent), the combined checks provide reasonable coverage. This is a nice-to-have improvement, not blocking.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is well-structured and implementation-ready from a repo, tooling, and documentation perspective. All affected files are correctly identified. The Phase 3 stale reference sweep is thorough — the grep pattern in the Before/After checks properly excludes CLI command references (`$GP`) and natural language ("completed"). The build verification (`bun run build:plugin`) is correctly placed after each phase. The Phase 5 E2E gate is the right capstone. Documentation updates in Phase 4 cover the three key files (README.md, architecture overview, conventions). The only issues are minor — descriptive notes for implementers and a slightly tighter verification check. After rounds 1-2 fixes, this plan is ready to execute.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
