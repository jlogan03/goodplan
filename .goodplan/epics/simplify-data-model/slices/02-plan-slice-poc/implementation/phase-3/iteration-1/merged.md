# Merged Review Feedback — Phase 3, Iteration 1

**Reviewers:** agent-skill (7/10), software-architecture (7/10)
**Merged score:** 7/10

## IMPORTANT Issues

### 1. Missing `reconsiderWhen`/`validUntil` condition evaluation
**Source:** software-architecture
Epic conventions require the orchestrator to load active conditions via `gp decision:list --json` and `gp learning:list --json` before spawning `plan-phase`, and include them in the task prompt. The skill omits this entirely.
**File:** skills/plan-slice/SKILL.md:168
**Fix:** Add a step before plan-phase spawning that loads conditions via CLI and passes them to the plan-phase agent's task prompt.

### 2. Description triggers overlap with existing create-plan and refine-plan skills
**Source:** agent-skill
The description includes "Combines the create-plan and refine-plan workflow" and a "create and refine plan" trigger, which will compete with existing `/gp:create-plan` and `/gp:refine-plan` for skill selection.
**File:** skills/plan-slice/SKILL.md:5
**Fix:** Remove the overlapping description sentence. Replace "create and refine plan" trigger with "pipeline plan slice" or similar. Keep "plan and refine a slice end-to-end" and "orchestrated plan slice" as differentiators.

### 3. Stagnation detection logic issues
**Source:** agent-skill + software-architecture (MERGED — both flagged this, different angles)
- agent-skill: The condition conflates "equal" and "less than" into one check, double-counting drops as both stagnation and reduction.
- software-architecture: Equal scores across 2 rounds is common and not necessarily stagnation. Should warn on first no-improvement round, exit only after 2 consecutive.
**File:** skills/plan-slice/SKILL.md:286
**Fix:** Split into two separate conditions:
- Stagnation: `score === previous` (exactly equal) -> increment stagnation counter. Warn on first occurrence, exit after 2 adjacent.
- Reduction: `score < previous` -> increment `reductionCount`. Exit after 2 total reduction rounds (any position).

### 4. `submit-refinement` scores format mismatch
**Source:** software-architecture
The skill passes `{"scores":{"overall":N}}` but the existing convention passes per-reviewer scores like `{"scores":{"holistic":N,"software-architecture":N,...}}`. Creates a data contract inconsistency.
**File:** skills/plan-slice/SKILL.md:311
**Fix:** Pass individual reviewer scores from the synthesis return instead of a single aggregate.

### 5. `submit-plan` receives unnecessary empty stdin
**Source:** agent-skill + software-architecture (MERGED — both flagged this)
- agent-skill flagged as MINOR (needs codebase exploration to confirm behavior)
- software-architecture flagged as IMPORTANT (confirmed `submit-plan` does not require stdin)
**Merged severity:** IMPORTANT (software-architecture confirmed the behavior)
**File:** skills/plan-slice/SKILL.md:206
**Fix:** Remove `echo '' |` prefix. Just call `$GP submit-plan --slice $SLICE_NAME --json` directly.

### 6. Reviewer output writing step is buried, easy to miss
**Source:** agent-skill
The instruction for the orchestrator to write reviewer output to `$TMPDIR/reviews/{domain}.md` is embedded in a sub-step description rather than being a discrete numbered step. An LLM orchestrator could miss this critical Write step between reviewer spawning and synthesis spawning.
**File:** skills/plan-slice/SKILL.md:258
**Fix:** Add an explicit numbered step between reviewer spawning and synthesis spawning: "Write each reviewer's return text to `$TMPDIR/reviews/{reviewer-name}.md` using the Write tool."

## MINOR Issues

### 7. Context discipline: orchestrator Q&A file read is a gray area
**Source:** software-architecture
The orchestrator writes the Q&A file then passes its path to the plan-phase agent. The context discipline section doesn't explicitly address orchestrator-generated files. Being explicit would prevent drift.
**File:** skills/plan-slice/SKILL.md:20
**Fix:** Clarify that orchestrator-generated files (Q&A output, re-entry summaries) are in-scope for orchestrator reads.

### 8. Context discipline missing lightweight summary files
**Source:** agent-skill
Epic conventions allow "lightweight summary files (re-entry summaries, error details from failed sub-agents)" but the SKILL.md's Context Discipline section omits them.
**File:** skills/plan-slice/SKILL.md:20
**Fix:** Add lightweight summary files to the allowed context sources list. (Overlaps with issue 7 — address together.)

### 9. Missing `--json` flag response handling on `gp slice:plan`
**Source:** software-architecture
Step 3b calls `$GP slice:plan --slice $SLICE_NAME --json` but doesn't specify what to do with the JSON response (verify success, check transition). Other CLI calls explicitly use the response.
**File:** skills/plan-slice/SKILL.md:97
**Fix:** Add instruction to verify the response indicates successful transition.

### 10. Reviewer tool restriction mechanism is pseudo-code
**Source:** software-architecture
The `allowedTools` / `disallowedTools` fields in spawn blocks don't map to actual Claude Code Agent tool parameters. Tool restrictions should be communicated via task prompt instructions.
**File:** skills/plan-slice/SKILL.md:344
**Resolution:** CODEBASE_EXPLORATION — verify how tool restrictions are actually enforced, then update spawn blocks to match.

### 11. Cleanup step is ambiguous
**Source:** agent-skill
"the temp directory may be cleaned up" is vague for an LLM orchestrator.
**File:** skills/plan-slice/SKILL.md:323
**Fix:** Replace with "Delete the temp directory using `rm -rf $TMPDIR`" on success. Keep preserve-on-error behavior.

### 12. No handling for `start-plan` references overflow
**Source:** software-architecture
No guidance on what to do if the ContextBundle `references` list is very large. Acceptable for PoC, worth noting for hardening.
**File:** skills/plan-slice/SKILL.md:148
**Fix:** Add a note or future TODO for reference list truncation/prioritization.

### 13. `user-invocable: true` frontmatter is redundant
**Source:** agent-skill
No other skill in the repo uses this field (default is `true`). Including it is harmless but inconsistent. However, it's intentional per epic conventions for the new pipeline skill pattern.
**Resolution:** No action needed — intentional per epic conventions.

### 14. No explicit model parameter in agent spawn instructions
**Source:** agent-skill
Epic conventions specify "Default model is `opus` for all agents." Agent definitions have `model: opus` frontmatter. But SKILL.md spawn instructions don't mention passing a model parameter.
**Resolution:** CODEBASE_EXPLORATION — verify whether the Agent tool respects agent definition frontmatter `model:` field automatically.

## Deduplication Notes

- **submit-plan stdin** (agent-skill MINOR + software-architecture IMPORTANT): Merged as IMPORTANT. software-architecture confirmed `submitPlanInputSchema` doesn't require stdin, resolving agent-skill's uncertainty.
- **Stagnation logic** (agent-skill IMPORTANT + software-architecture IMPORTANT): Merged — complementary angles. agent-skill focused on double-counting drops; software-architecture focused on premature exit from equal scores. Combined fix addresses both.
- **Context discipline** (agent-skill MINOR + software-architecture MINOR): Issues 7 and 8 overlap — both about what the orchestrator is allowed to read. Address together.

## Contradiction Resolution

No contradictions found between reviewers. All issues are complementary.
