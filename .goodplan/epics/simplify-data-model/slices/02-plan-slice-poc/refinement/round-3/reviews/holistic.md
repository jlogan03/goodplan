# Holistic Review — Plan-Slice PoC (Round 3)

## Round 2 Issue Verification

All 3 IMPORTANT issues from round 2 have been addressed:

1. **Re-entry from `plan-refined` proposes invalid transition** — Fixed. Line 113 now correctly states: "No re-refinement in this PoC — the `plan-refined` -> `planning` transition does not exist in the state machine." Offers view existing plan or proceed to `/gp:implement`. Defers re-refinement to a later slice that introduces a `BEGIN_RE_REFINEMENT` event. This aligns with the transition tables (confirmed: no `plan-refined` -> `planning` transition exists).

2. **Missing `slice:refine-plan` transition between plan submission and refinement** — Fixed. Lines 112 and 142 now include `gp slice:refine-plan --slice <name> --json` (`plan-created` -> `refining` via `BEGIN_REFINEMENT`) explicitly before the refinement loop. The comment at line 142 correctly notes this is required before `submit-refinement` to avoid `STATE_INVALID_TRANSITION`.

3. **`submit-refinement` requires scores stdin** — Fixed. Line 112 and 143 now show `echo '{"scores":{"overall":<score>}}' | gp submit-refinement --slice <name> --json` with the synthesis agent's aggregate score mapped to `Record<string, number>` format. Matches the actual `stdinSchema` confirmed via `gp schema --command submit-refinement` (requires `scores` as `Record<string, number>`).

Both MINOR issues from round 2 also addressed:
- Documentation update task added in Phase 4 (line 197)
- Phase 3 verification now includes executable checks: `bun run build:plugin`, `ls dist/gp-plugin/skills/plan-slice/SKILL.md`, `grep 'name: plan-slice'` (lines 155-157)

## Issues

**[MINOR]** Phase 2 task for `@` reference path validation could silently miss non-`${CLAUDE_PLUGIN_ROOT}` relative references

The plan (line 85) specifies extracting `@${CLAUDE_PLUGIN_ROOT}/...` references and validating them. However, if an agent definition uses a bare relative `@` reference (e.g., `@./path/to/file.md` without the `${CLAUDE_PLUGIN_ROOT}` prefix), the extraction regex would miss it. This is unlikely given the clear convention established in Phase 1, but the validation would be more robust if it also checked for any `@` references that don't use the `${CLAUDE_PLUGIN_ROOT}` prefix and warned about them (they won't resolve correctly in the plugin context).

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a secondary check in the build-plugin.sh `@` reference validation (Phase 2, line 85): after validating `@${CLAUDE_PLUGIN_ROOT}/...` references, warn on any remaining `@` references that don't use the prefix pattern. This catches accidental relative references that would silently fail at runtime.

---

**[MINOR]** `start-plan` vs `slice:plan` naming could confuse implementers

The plan uses both `gp slice:plan --slice <name>` (line 112, for the status transition `created` -> `planning`) and `gp start-plan --slice <name> --json` (line 129, for assembling planning context). These are different commands serving different purposes, but their names are similar enough that an implementer might confuse them. The plan correctly distinguishes them in usage — `slice:plan` for status transition, `start-plan` for context assembly — but a brief clarifying note would help.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a parenthetical note at first usage of `start-plan` (line 129) clarifying: "`start-plan` assembles context for planning (file paths, architecture refs) — distinct from `slice:plan` which transitions status." This is cosmetic but reduces implementer confusion.

## Score: 9/10

All round 1 and round 2 issues have been resolved. The plan now correctly handles: (1) the full CLI transition chain (`slice:plan` -> `submit-plan` -> `slice:refine-plan` -> `submit-refinement`), (2) re-entry from `plan-refined` without proposing impossible transitions, (3) scores stdin for `submit-refinement`, (4) temp directory lifecycle, (5) Phase 3 executable verification, and (6) CLAUDE.md documentation update. The two remaining MINOR items are cosmetic improvements that would not block implementation. The plan is clear, complete, well-phased, and aligned with the confirmed goal. No invariant violations detected.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
