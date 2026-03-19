## Issues

**[IMPORTANT]** Archive step (Step 10b) missing initiative slice example
The archive examples in SKILL.md only show `vertical-slices/` and `side-quests/` paths. Initiative slices (`initiatives/__active__<name>/vertical-slices/<slice>`) are a valid scope but have no archive example. The skill executor may not know the correct `mv` path for initiative slices — the parent directory is different from the two examples shown. Add a third example:
```bash
# For initiative slices:
mv .project/initiatives/__active__<name>/vertical-slices/<slice> '.project/initiatives/__active__<name>/vertical-slices/~~archived~~<slice>'
```
File: ~/.claude/skills/complete-slice/SKILL.md:189
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Scope resolution pattern inconsistency between complete-slice and define-slices
`define-slices` uses an explicit Step 0 with `$SLICES_DIR` / `$INITIATIVE_DIR` / `$FLOW_SCOPE` variable resolution, bash detection command, and clear fallback logic. `complete-slice` instead inlines initiative path patterns across Steps 2, 3, 6, 6d, 8, and 10b without a single resolution step. This means every new step that touches initiative paths must independently know about the `initiatives/__active__*/vertical-slices/` pattern — a classic shotgun surgery smell. Consider consolidating initiative detection into a Step 0 (matching define-slices) or at minimum a "Scope Resolution" preamble section that sets a single variable used throughout. `refine-slices` already does this well with `<slices-root>`.
File: ~/.claude/skills/complete-slice/SKILL.md:26
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Signal tracking glob for initiative slices only covers active initiatives
Step 6d (line 122) globs `.project/initiatives/__active__*/vertical-slices/*/completion/learnings.md`. But completed initiative slices get archived with `~~archived~~` prefix, and completed *initiatives* get archived as `~~archived~~NN_<name>/`. This means signal tracking will miss completed slices from archived initiatives — the glob `__active__*` won't match `~~archived~~01_initial`. The guidance.md line 95 has the same pattern. Either the glob needs to also cover `~~archived~~*/vertical-slices/*/` or the comment should acknowledge this is intentional (only tracking signals from the current initiative).
File: ~/.claude/skills/complete-slice/SKILL.md:122
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** refine-slices does not load initiative-conventions.md
`define-slices` explicitly reads `~/.claude/skills/_shared/references/initiative-conventions.md` in Step 0 before doing initiative detection. `refine-slices` performs initiative detection in its Scope Resolution section but never instructs the executor to load the conventions file. Since `refine-slices` needs to understand the `__active__` prefix convention and directory structure, it should load the same reference for consistency and to avoid drift if the convention changes.
File: ~/.claude/skills/refine-slices/SKILL.md:32
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The initiative-scoping additions to both skills are structurally sound. `refine-slices` uses a clean `<slices-root>` parameterization that eliminates hardcoded paths well. `complete-slice` correctly implements the two-layer architecture model for initiative slices and extends auto-detect and signal tracking. The main gap is `complete-slice` spreading initiative path knowledge across many steps rather than resolving once (contrast with `define-slices` Step 0 and `refine-slices` Scope Resolution). The archive step omission and signal tracking glob limitation are smaller but real gaps. Fixing the scope resolution pattern and adding the missing archive example would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
