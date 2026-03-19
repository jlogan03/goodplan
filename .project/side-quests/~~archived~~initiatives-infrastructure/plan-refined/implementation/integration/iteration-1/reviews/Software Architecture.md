# Software Architecture Review — Final Integration (Iteration 1)

## Issues

**[IMPORTANT]** create-plan scope resolution does not scan initiative slices for auto-detect
Description: In Step 2, sub-step 3 ("No argument and no active slice"), `create-plan/SKILL.md` only scans `.project/vertical-slices/` for auto-detection. It does not scan `.project/initiatives/__active__*/vertical-slices/*/` which is where slices live when an initiative is active. The guidance reference (`create-plan/references/guidance.md` line 7) has the same limitation. This means `/create-plan` with no argument will fail to find the next slice in an active initiative.
File: ~/.claude/skills/create-plan/SKILL.md:31
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** create-plan scope resolution by name does not search initiative slice directories
Description: In Step 2, sub-step 1, when a name is passed as argument, it resolves "via `.project/vertical-slices/` or `.project/side-quests/`" but does not include `.project/initiatives/__active__*/vertical-slices/` as a search location. A user running `/create-plan 02-auth` with an active initiative would fail to find the slice.
File: ~/.claude/skills/create-plan/SKILL.md:27
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** create-plan loads sequencing.md from hardcoded top-level path
Description: Step 3, item 6 loads `.project/vertical-slices/sequencing.md` unconditionally. When an active initiative exists, `sequencing.md` lives at `.project/initiatives/__active__<name>/vertical-slices/sequencing.md`. The skill should detect the active initiative and load from the correct location, similar to how `define-slices` resolves `$SLICES_DIR`.
File: ~/.claude/skills/create-plan/SKILL.md:49
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** implement-plan has zero initiative awareness
Description: `implement-plan/SKILL.md` contains no references to initiatives, `__active__`, `INITIATIVE_DIR`, or `ARCH_DIR`. While it receives a plan path as an argument (so scope resolution isn't its concern), it does not load initiative architecture as context. The Consumer Guide in `initiative-conventions.md` states `/implement-plan` reads both top-level (current state) and initiative architecture (target). This is documented but not implemented in the skill. The implementing agent would miss the two-layer architecture context, potentially building against the wrong architectural target.
File: ~/.claude/skills/implement-plan/SKILL.md:1
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** project-status interrupted work scan misses top-level vertical-slices when initiative is active
Description: Step 7 scans for `interrupted.md` in `.project/vertical-slices/*/` AND `.project/initiatives/__active__*/vertical-slices/*/`, which is correct. However, the scan is done with three separate `ls` commands where the first one (`ls .project/vertical-slices/*/interrupted.md`) would produce a harmless "no matches" on initiative-first projects. This is a minor consistency issue but more importantly, the scan does NOT check for `interrupted.md` inside `initiatives/*/vertical-slices/*/` (non-active initiatives). A non-active initiative could have interrupted slices from a previous run.
File: ~/.claude/skills/project-status/SKILL.md:114
Resolution: MINOR

**[MINOR]** Consumer Guide does not list /refine-slices as a reader of initiative architecture
Description: The Consumer Guide table in `initiative-conventions.md` lists which skills read initiative architecture but omits `/refine-slices`. The `refine-slices/SKILL.md` Step 0 explicitly loads initiative `goal.md` and `architecture/` when initiative-scoped (line 65). The Consumer Guide should include `/refine-slices` as a reader.
File: ~/.claude/skills/_shared/references/initiative-conventions.md:278
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** create-plan/references/guidance.md scope resolution is stale
Description: The guidance.md reference for create-plan still says "scan `.project/vertical-slices/`" without mentioning initiative-scoped slices. This duplicates the issue from the SKILL.md but in the reference file that gets re-loaded during long sessions.
File: ~/.claude/skills/create-plan/references/guidance.md:7
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Variable naming inconsistency: define-architecture uses $INITIATIVE_DIR in bash but only defines $ARCH_DIR and $FLOW_SCOPE formally
Description: In `define-architecture/SKILL.md` Step 2 (line 82-83), the skill references `$INITIATIVE_DIR` in bash commands, but Step 0 only formally defines `$ARCH_DIR` and `$FLOW_SCOPE`. The `$INITIATIVE_DIR` variable is used but never explicitly assigned. Compare with `define-slices` which formally defines `$INITIATIVE_DIR` in Step 0. This inconsistency could confuse an implementing agent.
File: ~/.claude/skills/define-architecture/SKILL.md:82
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** explore-logic.md scope path table references only top-level vertical-slices
Description: The scope path mapping table in `explore-logic.md` lists `Slice` paths as `.project/vertical-slices/<name>/...` only. While `/explore` correctly rejects initiative slice paths (redirecting to initiative scope), the reference table should document this for clarity.
File: ~/.claude/skills/explore/references/explore-logic.md:11
Resolution: MINOR

**[MINOR]** refine-slices flow-log scope value format inconsistency
Description: In `refine-slices/SKILL.md` Step 5, the scope value is described as `<slices-root relative to .project/>` (e.g., `vertical-slices` or `initiatives/__active__<name>/vertical-slices`). Other skills use a `$FLOW_SCOPE` variable stripped of the `__active__` prefix (e.g., `initiatives/<name>`). The refine-slices scope includes `vertical-slices` at the end and retains the `__active__` prefix, which is inconsistent with other skills.
File: ~/.claude/skills/refine-slices/SKILL.md:115
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

Four IMPORTANT issues significantly impact the integration. The `create-plan` scope resolution gaps (3 issues) mean the most frequently used skill in the initiative workflow cannot auto-detect slices within initiatives. The `implement-plan` initiative-blindness means the two-layer architecture model documented in the Consumer Guide is not actually delivered to the implementing agent. These are not edge cases -- they are the primary path through an active initiative. To reach 9+: fix the four IMPORTANT issues and the flow-log scope inconsistency.

## Summary
- Critical: 0
- Important: 4
- Minor: 6
