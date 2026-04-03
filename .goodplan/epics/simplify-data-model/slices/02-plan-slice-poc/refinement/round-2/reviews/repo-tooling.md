# Repo, Tooling, & Docs Review — Plan-Slice PoC (Round 2)

## Issues

**[MINOR] Phase 2 Expected Behavior still uses `cat ... | jq` pattern**
Lines 72 and 76 use `cat dist/gp-plugin/.claude-plugin/plugin.json | jq '.agents'`. While `jq` is a big improvement over the round 1 `grep`, the `cat` is still a UUOC — `jq '.agents' dist/gp-plugin/.claude-plugin/plugin.json` is the idiomatic form. Trivial, but Expected Behavior items are copy-paste targets for verification.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 `@` reference validation task lacks specificity on failure behavior**
Line 85 says "Add `@` reference path validation: extract `@${CLAUDE_PLUGIN_ROOT}/...` references from agent `.md` bodies, verify each referenced file exists in `dist/`." This is a good addition, but the task does not specify what happens on failure — should the build hard-fail (like frontmatter validation) or warn? Given that broken `@` references would cause silent agent prompt corruption at runtime, this should explicitly specify hard-fail with a clear error message naming the agent file and the missing reference path.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 sub-agent return format schema location not specified**
Line 143 says "Define sub-agent return format as a Zod schema or TypeScript interface in a shared reference file" but does not specify where this file lives. It could be `skills/_shared/references/`, `agents/`, or a new location. Since it is referenced by both agent definitions (markdown) and test harness code (TypeScript), the plan should clarify: (a) the TypeScript schema in a `.ts` file importable by the test harness, and (b) a markdown representation or `@` reference for agent definitions. The dual-format requirement should be explicit.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All 3 IMPORTANT and 5 MINOR issues from round 1 have been correctly addressed. The reviewer content coexistence strategy is now explicit (new files canonical for agents, old files untouched for v1.0.3 backward compatibility, migration deferred). The `plan-format.md` lifecycle is clear (copy, keep original, future slice migrates). Severity levels now match the existing convention (CRITICAL, IMPORTANT, MINOR). The `verifyEntityStatus` signature is correct. The `createMinimalFixture` backward compatibility verification task is present. The `model:` frontmatter field is clarified as functional. Three minor items remain — all cosmetic or specificity improvements that would not block implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
