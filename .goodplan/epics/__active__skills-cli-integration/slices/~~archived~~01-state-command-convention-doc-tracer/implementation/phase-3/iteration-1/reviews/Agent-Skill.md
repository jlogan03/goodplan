# Agent Skill Review: Phase 3 — Project-Status Tracer Bullet

## Issues

**[IMPORTANT]** Step 4 fallback takes first 5 entries instead of last 5
The primary query in Step 4 uses `.[-5:]` to get the *last* 5 activity entries (most recent). The fallback query uses `--limit 5` without `--offset`, which takes the *first* 5 entries (oldest). This is a semantic mismatch — the fallback should produce the same result as the primary query. Either use a jq expression that reverses first (`goodplan state --json --query '.["activity-log.jsonl"] | reverse' --limit 5`) or use `.["activity-log.jsonl"] | .[-5:]` in both cases and drop the `--limit` variant. Given that the primary query is simple jq, the fallback scenario (jq slice failing but full array fetch succeeding) is unlikely — consider removing the fallback entirely.
File: skills/project-status/SKILL.md:81
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** File-existence state machine in status-logic.md is partially obsolete but still referenced
The SKILL.md Step 6 says "Use `status --json` for phase derivation and entity status" and uses `show --json` and `state --json --query` for details. But `status-logic.md` still contains the full file-existence state machine (conditions 1-12) with instructions like "List directories under `implementation/`" and "check if `review.md` exists." The SKILL.md Step 6 explicitly uses `state --json --query` for implementation progress, which is the correct CLI-based approach. However, the state machine table in status-logic.md remains valuable as *domain logic* (what conditions map to what states). The issue is that the "Checking Implementation Progress" subsection (lines 45-51) still reads as imperative instructions for direct filesystem operations. Since the SKILL.md body takes precedence over the reference for *how* to check, and `show --json` with `artifacts` is deferred to slice 02, this is acceptable for now. However, the reference should note that the *mechanism* for checking these conditions is via CLI commands (as described in the SKILL.md), not direct filesystem access. A one-line note at the top of the "File-Existence State Machine" section would suffice — e.g., "These rules define state semantics. Use CLI commands (status --json, state --json --query, show --json) to evaluate conditions — see the SKILL.md steps for mechanism."
File: skills/project-status/references/status-logic.md:19
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Step 5 interrupted work query uses `.. | .["interrupted.md"]?` which is fragile with recursive descent
The jq expression `.epics | .. | .["interrupted.md"]? // empty` uses recursive descent (`..`) which traverses all values including strings and arrays. While `?` suppresses errors on non-object values, this pattern can produce unexpected results or be slow on large state trees. The Step 7 version `[.. | .["interrupted.md"]? | select(. != null)]` is slightly better but has the same recursive descent concern. Consider a more targeted query like `.epics[][].slices[][] | select(has("interrupted.md")) | .["interrupted.md"]` or accept that these patterns are good enough for the read-only status use case.
File: skills/project-status/SKILL.md:113
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Description field change is good but could push harder for triggering
The description was updated from "Read .project/ state" to "Query project state via the goodplan CLI." This is accurate. However, per triggering accuracy guidance, descriptions should be "pushy" to avoid under-triggering. The description already lists several trigger scenarios ("at the start of any session, after context compaction, or whenever you need to re-orient") which is good. One common trigger scenario that is missing: "after completing a slice or epic" — users often want a status check after finishing work. This is minor since the existing triggers are adequate.
File: skills/project-status/SKILL.md:4
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The rewrite is well-structured and correctly replaces all direct filesystem access with CLI commands. The two-stage detection pattern (binary + project) is clean and matches the cli-interaction.md conventions exactly. The elimination of state.md write-back (old Step 9) is correct per the epic architecture. The reference file update in status-logic.md correctly replaces scope resolution with CLI fields and removes the state.md write-back format.

To reach 9+: fix the Step 4 fallback semantic mismatch (first-5 vs last-5) and add a brief mechanism note to the file-existence state machine section in status-logic.md.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
