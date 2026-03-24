# Codebase Context: Planning & Execution Skills Migration

## Documentation Freshness

| Document | Last Modified | Status |
|---|---|---|
| `goal.md` (this slice) | 2026-03-24 10:36 | Fresh (today) |
| `cli-interaction-conventions.md` (epic arch) | 2026-03-24 10:28 | Fresh (today) |
| `_overview.md` (top-level arch) | 2026-03-23 21:01 | Fresh (yesterday) |
| `cli-changes.md` (epic arch) | 2026-03-23 21:01 | Fresh (yesterday) |
| `context-api.md` (epic arch) | 2026-03-23 21:01 | Fresh (yesterday) |
| `conventions.md` (project) | 2026-03-24 00:37 | Fresh (today) |
| `learnings.md` (project) | 2026-03-24 13:27 | Fresh (today) |

All architecture docs are current — no stale assumption risk. The epic architecture docs were last updated alongside slice 04 completion. The plan was authored today, after all architecture docs were finalized.

## Target Skills: Current State

### File inventory

| Skill | Files | Pattern hits (state.md/activity-log/__active__) |
|---|---|---|
| create-slices | SKILL.md, references/guidance.md | ~14 hits (heaviest) |
| create-plan | SKILL.md, references/guidance.md, references/plan-format.md | ~12 hits in SKILL.md, ~7 in guidance.md |
| refine-slices | SKILL.md, references/sub-agent-prompts.md, references/reviewer-registry.md, references/reviewers-slices.md | 4 hits in SKILL.md |
| refine-plan | SKILL.md, references/shared-preamble.md, references/sub-agent-prompts.md, + 5 reviewer files | 4 hits in SKILL.md, 1 in shared-preamble |
| implement-plan | SKILL.md, references/shared-preamble.md, references/sub-agent-prompts.md, + 4 reviewer files | 2 hits in SKILL.md, 1 each in shared-preamble + sub-agent-prompts |
| migrate | SKILL.md only | 0 hits (already clean, just needs `requires` frontmatter) |
| complete (fix only) | references/guidance.md line 180 | 1 hit: `mkdir -p .project/side-quests/` |

### No skills have `requires:` frontmatter yet (except `complete`, already migrated in slice 03)

## Established Migration Patterns (from slices 03-04)

### Pattern 1: Version check + `requires` frontmatter
Every migrated skill adds `requires: goodplan >= 1.0.0` to YAML frontmatter and a Step 0 that:
1. Reads `~/.claude/skills/_shared/references/cli-interaction.md`
2. Runs `goodplan --version --json`
3. Stops if CLI not found or version insufficient

Reference: `skills/explore/SKILL.md` lines 1-30, `skills/create-architecture/SKILL.md` lines 1-30

### Pattern 2: `__active__` glob replacement
Old: `ls -d .project/epics/__active__*/ 2>/dev/null`
New: `goodplan status --json` -> check `.activeEpic` field, then use unprefixed path `.project/epics/<name>/`

Key learning (slice 03): CLI creates directories at `epics/<name>/` without prefix. The `__active__` convention was managed by old skills manually.

### Pattern 3: state.md elimination
Old: read/write `.project/state.md` for active slice, current phase, next step
New: `goodplan status --json` for all orientation data. No state.md reads or writes.

### Pattern 4: activity-log.jsonl elimination
Old: manual `echo '...' >> .project/activity-log.jsonl`
New: CLI handles activity recording automatically on every mutation command. Skills don't touch activity-log.

### Pattern 5: Graceful stop simplification
Old: Complex state.md updates per scenario with different strings
New: Graceful stops produce no state record. On re-run, `status --json` and `show --json` detect current state. Resume from last completed transition.

Key learning (slice 04): Graceful stop scenarios are hidden complexity. The plan should inventory every stop scenario and map re-entry detection.

### Pattern 6: `state-and-activity-formats.md` reference removal
All `Load ~/.claude/skills/_shared/references/state-and-activity-formats.md` lines are removed (the file is eliminated). State writes are replaced by CLI submit commands.

### Pattern 7: Sub-agent `__active__` replacement in preambles
`shared-preamble.md` and `sub-agent-prompts.md` files reference `epics/__active__*/architecture/`. Replace with instruction to use `goodplan status --json` -> `.activeEpic` and then read `epics/<name>/architecture/`.

### Pattern 8: jq key references are expected false positives
Grep verification for `activity-log.jsonl` will catch legitimate jq queries like `.["activity-log.jsonl"]`. These are expected and acceptable (slice 04 learning).

## Key CLI Commands for This Slice

### Orchestrator commands (used by create-slices, create-plan)
- `goodplan epic:define-slices --epic <name> --json` — begin slice definition
- `echo '{"name":"...","goal":"..."}' | goodplan slice:create --epic <name> --json` — create slice
- `goodplan submit-slices --epic <name> --json` — complete slice definition
- `stdin: "" | goodplan slice:plan --slice <name> --json` — begin planning
- `stdin: "" | goodplan submit-plan --slice <name> --json` — complete planning
- `stdin: "" | goodplan slice:refine-plan --slice <name> --json` — begin refinement
- `stdin: "" | goodplan slice:implement --slice <name> --json` — begin implementation

### Sub-agent commands (used by refine-plan, implement-plan, refine-slices)
- `goodplan start-plan --slice <name> --inline --json` — context bundle for planning
- `goodplan start-refinement --slice <name> --inline --json` — context for refinement
- `goodplan start-implementation --slice <name> --inline --json` — context for implementation
- `goodplan start-refine-slices --epic <name> --inline --json` — context for slice refinement
- `echo '{"scores":{...}}' | goodplan submit-refinement --slice <name> --json` — submit scores
- `stdin: "" | goodplan submit-implementation --slice <name> --json` — submit implementation
- `echo '{"scores":{...}}' | goodplan submit-refine-slices --epic <name> --json` — submit scores

### Quest command (for complete fix)
- `echo '{"name":"...","goal":"..."}' | goodplan quest:create --json` — replaces `mkdir -p .project/side-quests/`

## Areas of Stability vs Churn

### Stable (no recent changes)
- All 6 target skill files: last modified at initial copy (2026-03-20) or during the `skills-migrate` epic
- CLI subagent commands: stable since 2026-03-23
- Epic architecture docs: finalized at slice 02-03 timeframe

### Recent churn
- `learnings.md`: updated today (slice 04 completion added entries)
- Slice 04 just completed today — its patterns are the freshest reference
- `conventions.md`: updated today (minor)

## Risks and Considerations

1. **create-slices and create-plan are the most complex** — 14 and 19 hits respectively, with reference file updates. Plan correctly groups these in Phase 2.

2. **Flat entity paths**: Slices live at `.project/slices/<name>/`, not under `epics/<epic>/slices/`. This is a persistent confusion source (slice 03 learning). The plan's CLI commands use `--slice <name>` and `--epic <name>` flags which abstract this away.

3. **Sub-agent prompts in refine-plan and implement-plan**: Both have `shared-preamble.md` and `sub-agent-prompts.md` with `__active__` references. These need the Pattern 7 replacement.

4. **Quest scope in create-plan**: The skill handles side quests (`quest:plan`, `quest:refine-plan`) alongside slices. Ensure quest variants of CLI commands are covered.

5. **`stdin: ""` requirement**: The compiled binary reads stdin and blocks if nothing is piped. Every mutation command without a payload needs `stdin: ""` (slice 08 learning).

6. **No formal review needed**: Slice 04 learning confirms skill-only slices pass first iteration. Grep + smoke test is sufficient verification.

7. **decision:create in create-plan**: Phase 2 task mentions replacing `mkdir -p .project/decisions/` with `decision:create --json`. This follows the same pattern as the complete skill's quest:create fix.
