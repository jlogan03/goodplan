# Slice 10: Slice Execution Skills

## Goal

Build the slice execution skills for v2: `plan-slice` (P7+P8+P9 with plan-shape checkpoint and refinement), `implement-slice` (P10+P11 with chunk events and code refinement), and `land-slice` (P12 with spine promotion and findings triage). The `complete-epic` logic is part of `land-slice` (detects final slice and runs epic completion) -- it is not a separate skill. Update agent contracts and reference documents.

## In Scope

- `plugin/skills/plan-slice/SKILL.md` -- extend for P7+P8+P9 (plan-shape checkpoint, `gp refine:*` commands)
- `plugin/skills/implement-slice/SKILL.md` -- split from implement, P10+P11 (chunk events, code refinement)
- `plugin/skills/land-slice/SKILL.md` -- new skill, P12 (spine promotion, findings triage, epic completion on final slice)
- Agent contract updates -- structured return format for all agents
- New agents: pressure-test, verifier, completion-side-quest
- Agent reference rewrites: review-preamble, plan-format, sub-agent-return-format
- Rubric YAML for slice-level refinement

## Out of Scope

- Supporting skills (slice 11)
- Epic creation skills (slice 09 -- already done)
- Migration (slice 12)

## Dependencies

- Slice 08 (core-skills) -- core skill patterns
- Slice 09 (epic-creation-skills) -- recommended order, not hard dependency (skills can be developed using CLI commands directly)

## Verification

1. `plan-slice` skill emits expected events for P7+P8+P9: draft -> shape checkpoint -> refinement loop -> commit
2. `implement-slice` skill emits chunk lifecycle events for P10+P11 and calls expected CLI commands
3. `land-slice` skill produces files at expected paths for P12: spine promotion, findings triage, epic completion detection
4. Agent contracts produce structured returns that skills can parse
5. Code refinement boundary event (`code-refinement-converged`) correctly triggers P11->P12 transition
6. Dogfood harness exercises the full slice pipeline (plan -> implement -> land)

## Estimated Sessions

2-3
