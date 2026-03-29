# Software Architecture Review — onboard-repo Plan (Round 3)

## Issues

**[IMPORTANT]** Phase 3 Step 6 uses `mkdir -p .project/architecture/` — inconsistent with cli-interaction.md section 3, though consistent with existing skill practice
Section 3 of `cli-interaction.md` says skills must NOT "Use `mkdir` to create `.project/` subdirectories (CLI creates them via mutations)." However, `/create-architecture` SKILL.md (line 62) does exactly this: `mkdir -p .project/architecture/` and calls it a "skill-owned LLM artifact directory." The plan follows `/create-architecture`'s precedent, which is the correct behavior — `architecture/` is an LLM-owned content directory, not an entity directory managed by the state machine. But the plan should explicitly note this distinction in Step 6 to prevent the implementer from second-guessing themselves. Add a comment like: "`architecture/` is an LLM-owned content directory (per cli-interaction.md section 2), so `mkdir -p` is appropriate here — the 'no mkdir' rule applies to entity directories managed by the state machine."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 CLAUDE.md update placement logic ("near the top, after frontmatter/title") conflicts with `/create-epic` Step 9 which appends at the end
The plan's Phase 5 Step 12 says: "Place the section near the top, after any existing frontmatter/title (reference `/create-epic` Step 9 pattern for placement logic)." But `/create-epic` Step 9 has three cases: (1) no CLAUDE.md — create with section, (2) CLAUDE.md exists but no section — "Append the section at the end with a blank line before the header," (3) section exists — check and add references. Case 2 explicitly appends at the end, not "near the top." The plan contradicts the existing pattern it claims to follow. This matters because other skills may add sections to CLAUDE.md, and if onboard-repo inserts near the top while create-epic appends at the end, the placement becomes unpredictable. The plan should match `/create-epic`'s exact logic: append at end for new sections, leave existing sections in place.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Test architecture proposes scripting interactive steps via "pre-seeded approval messages" — this mechanism is unspecified
Phase 1's test architecture task says: "Interactive steps (Steps 7, 8, 12) handled by scripting user responses into the session (pre-seeded approval messages)." The Anthropic Claude SDK session API has no documented "pre-seeded approval" mechanism. When the LLM asks a question, the test harness needs to either: (a) provide a `human` turn in the conversation with the approval text, (b) use a tool-use mock that returns approval, or (c) instruct the LLM in the system prompt to auto-approve all confirmations during testing. The plan should specify which approach is used. Option (c) is simplest and matches the pattern other Claude SDK test harnesses use — add a system prompt line like "This is an automated test run. For all user confirmation prompts, proceed as if the user approved." The current wording leaves the implementer guessing about a critical test infrastructure decision.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 convention heuristics duplicate shallow-clone detection already done in Step 1
Phase 3's architecture-extraction.md mentions "check `git rev-parse --is-shallow-repository` before running git-based analysis" and notes "(also checked in Step 1 pre-flight)." Phase 2's convention heuristics (git conventions from `git log --oneline -50`) also depend on git history depth, but Phase 2 doesn't mention shallow-clone awareness. Since Step 1 already checks and warns, the plan should have Steps 5 and 6 both reference the flag set in Step 1 rather than re-checking. Add a note in Phase 2 that git convention detection should check the `gh_available` / shallow-repo flag from Step 1 and degrade gracefully (skip commit message format analysis if shallow).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 migration detection references "files over 500 lines" as a debt heuristic but doesn't account for TypeScript declaration files
The tech debt heuristic "files over 500 lines" is a reasonable proxy for complexity, but `.d.ts` files and type-heavy interface files in TypeScript projects routinely exceed 500 lines without being problematic. Phase 5 already notes "Deprioritize `.d.ts` files and heavily-typed interface files when presenting hot spots" for the churn x complexity analysis. The same exclusion logic should apply to the Phase 4 debt heuristic to avoid false positives. Add `.d.ts` exclusion to the "files over 500 lines" heuristic in `references/migration-detection.md`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan does not specify what happens if `goodplan init --name` receives an inferred name that conflicts with naming conventions
Phase 1 Step 3 says: "Infer project name from repo directory name, package.json `name` field, or README title (in that priority order) without asking the user." But `goodplan init --name` expects kebab-case names. If the repo directory is `MyProject` or the package.json name is `@scope/my-package`, the inferred name may need sanitization. The plan should specify the transformation: lowercase, replace spaces/underscores with hyphens, strip scope prefixes, truncate to reasonable length. Existing `/create-epic` Step 4 says "kebab-case, 2-4 words" and asks if unclear. Since onboard-repo explicitly avoids asking, the sanitization must be deterministic.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has addressed all critical and most important issues from rounds 1 and 2. Step ordering is now correct (init at Step 3, idea.md at Step 4). The fixture uses a script-generated temp directory. CLAUDE.md update is included. Quest creation correctly uses `created` status. Expertise-tracking.md is explicitly referenced with the two-layer protocol. Shallow-clone detection is present. Step numbering is locked at 0-12. Re-entry handling is present throughout. The CJS/ESM fixture incompatibility is addressed (`.cjs`/`.mjs` extensions). Import graph building is clarified as Grep-based. The project memory path derivation is specified. The remaining issues are: CLAUDE.md placement logic contradicts the pattern it claims to follow, mkdir justification needs explicit documentation, test harness interactive step handling is unspecified, and several minor consistency/robustness gaps. To reach 9+: align CLAUDE.md placement with `/create-epic` Step 9's actual logic, specify the test harness approach for interactive steps, and address the minor items.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
