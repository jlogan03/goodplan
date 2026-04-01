# Skill Usage Patterns

Researched: 2026-04-01 | Source: codebase analysis

---

## Skill Inventory (19 skills + _shared)

| # | Skill | Phase | Description |
|---|---|---|---|
| 1 | `project-status` | Any | Read-only status query, session orientation |
| 2 | `capture` | Any | Quick task capture without breaking flow |
| 3 | `onboard-repo` | Setup | Scaffold .goodplan/ from existing codebase |
| 4 | `migrate` | Setup | Convert pre-CLI or restructure existing .goodplan/ |
| 5 | `create-epic` | Explore | Initialize project + first epic, or add new epic |
| 6 | `start-epic` | Explore | Review architecture proposal, activate subsequent epic |
| 7 | `explore` | Explore | Research/brainstorm/prototype loop |
| 8 | `create-architecture` | Plan | Structured Q&A to define architecture + conventions |
| 9 | `refine-architecture` | Plan | Iterative reviewer loop on architecture files |
| 10 | `create-slices` | Plan | Define ordered slices with success criteria |
| 11 | `refine-slices` | Plan | Iterative reviewer loop on slice definitions |
| 12 | `create-plan` | Plan | Produce plan.md for a slice or side quest |
| 13 | `refine-plan` | Plan | Iterative reviewer loop on plan document |
| 14 | `implement-plan` | Implement | Execute plan phases with implement-review-iterate |
| 15 | `audit-architecture` | Review | Compare architecture intent vs actual code |
| 16 | `audit-docs` | Review | Find stale docs, undocumented APIs, inconsistencies |
| 17 | `audit-tests` | Review | Find coverage gaps, stale tests, fragile patterns |
| 18 | `complete` | Complete | Synthesize learnings, archive scope, promote artifacts |
| 19 | `start-epic` | Gate | Approval gate for subsequent epics |

## Workflow Phase Mapping

```
Setup:     onboard-repo, migrate
Explore:   create-epic, start-epic, explore
Plan:      create-architecture, refine-architecture, create-slices, refine-slices, create-plan, refine-plan
Implement: implement-plan
Review:    audit-architecture, audit-docs, audit-tests
Complete:  complete
Always:    project-status, capture
```

**Plan phase is bloated** — 6 of 19 skills (32%) serve planning. The next largest phase (Review) has 3.

## Sequential Pairs (Always Used Together)

| Create | Refine | Notes |
|---|---|---|
| `create-architecture` | `refine-architecture` | Architecture always gets refined after creation |
| `create-slices` | `refine-slices` | Slices always get refined after creation |
| `create-plan` | `refine-plan` | Plans always get refined after creation |

These 6 skills form 3 create-then-refine pairs. The "refine" step is never skipped in practice — you always review what you just created.

## Shared Infrastructure Analysis

### Iteration Loop Users

The `_shared/references/iteration-loop.md` defines the shared review-and-edit orchestration skeleton. Skills that consume it:

- `refine-architecture` — reviewer loop on architecture files
- `refine-slices` — reviewer loop on slice definitions
- `refine-plan` — reviewer loop on plan document
- `implement-plan` — implement-review-iterate loop on code

All four share the same loop structure (reviewer list, exit criteria, max iterations, score thresholds, run directory).

### Reviewer Infrastructure Users

Skills with `sub-agent-prompts.md` (spawn parallel reviewers):

- `refine-architecture` — architecture-specific reviewers
- `refine-slices` — slice-specific reviewers
- `refine-plan` — domain-specific reviewers (web, language, scientific, AI tooling, always)
- `implement-plan` — domain-specific reviewers (web, language, scientific, AI tooling)
- `audit-architecture` — architecture drift reviewers
- `audit-docs` — documentation reviewers
- `audit-tests` — test quality reviewers

7 of 19 skills (37%) use the parallel reviewer pattern.

### Reviewer Registry Duplication

`refine-plan` and `implement-plan` share nearly identical reviewer registries:
- Both have: `reviewers-web.md`, `reviewers-language.md`, `reviewers-scientific.md`, `reviewers-ai-tooling.md`
- Both have: `shared-preamble.md`, `sub-agent-prompts.md`
- Both have: `reviewer-registry.md`

These are duplicated files, not shared references.

## Audit Skills Merge Analysis

| Aspect | audit-architecture | audit-docs | audit-tests |
|---|---|---|---|
| Pattern | Spawn parallel reviewers, propose side quests | Same | Same |
| References | guidance.md + sub-agent-prompts.md | Same structure | Same structure |
| Scope | Architecture files vs code | Docs vs code | Tests vs code |
| Output | Gap list + side quest proposals | Same pattern | Same pattern |

**Strong merge candidate.** All three:
1. Spawn parallel domain-specific reviewers
2. Collect findings into categories (CRITICAL, IMPORTANT, NICE-TO-HAVE)
3. Propose side quests for gaps
4. Share the same orchestration pattern

Could merge into a single `audit` skill with a `--focus` flag (architecture, docs, tests, all).

## Create/Refine Merge Analysis

| Pair | Create Size | Refine Size | Shared Context |
|---|---|---|---|
| architecture | 6 refs (20KB) | 3 refs (17KB) | Epic context, conventions, decisions |
| slices | 1 ref (4KB) | 3 refs (12KB) | Epic context, architecture |
| plan | 2 refs (13KB) | 8 refs (85KB) | Slice goal, architecture, conventions |

**Moderate merge candidate.** The create step is interactive Q&A; the refine step is an iteration loop. They share context loading but have different orchestration patterns. Merging would mean one skill does "create then optionally refine" — which matches actual usage.

The `plan` pair is hardest to merge because `refine-plan` has significantly more reference material (85KB of domain-specific reviewers).

## Minimum Viable Skill Set

Reducing from 19 to a minimum set that covers the full workflow:

| Merged Skill | Replaces | Rationale |
|---|---|---|
| `project-status` | (keep) | Unique read-only query role |
| `capture` | (keep) | Unique lightweight capture role |
| `onboard` | onboard-repo, migrate | Both scaffold/restructure .goodplan/ state |
| `epic` | create-epic, start-epic | Both manage epic lifecycle (create + activate) |
| `explore` | (keep) | Unique research/brainstorm role |
| `architecture` | create-architecture, refine-architecture | Create-then-refine pair |
| `slices` | create-slices, refine-slices | Create-then-refine pair |
| `plan` | create-plan, refine-plan | Create-then-refine pair |
| `implement` | implement-plan | Unique implementation role |
| `audit` | audit-architecture, audit-docs, audit-tests | Same pattern, different focus |
| `complete` | (keep) | Unique completion/archival role |

**Result: 11 skills (down from 19).** 42% reduction.

### Confidence Levels

| Merge | Confidence | Risk |
|---|---|---|
| 3 audit -> 1 audit | High | Low — same orchestration pattern, just different reviewer prompts |
| create-epic + start-epic -> epic | High | Low — sequential lifecycle stages of same entity |
| onboard-repo + migrate -> onboard | Medium | Medium — different input formats but similar output |
| create-arch + refine-arch -> architecture | Medium | Low — different orchestration (Q&A vs loop) but always sequential |
| create-slices + refine-slices -> slices | Medium | Low — same reasoning as architecture |
| create-plan + refine-plan -> plan | Low-Medium | Medium — refine-plan has 85KB of domain reviewers, significantly larger |

### Aggressive Minimum (7 skills)

If we also merge the plan/implement pair and fold audits into complete:

| Skill | Covers |
|---|---|
| `status` | project-status, capture |
| `onboard` | onboard-repo, migrate |
| `epic` | create-epic, start-epic |
| `explore` | explore |
| `design` | architecture + slices (both are "design the what and how") |
| `build` | plan + implement (create plan, refine plan, execute plan) |
| `complete` | complete + all audits (run audits as part of completion) |

This is likely too aggressive — the `build` skill would be enormous, and the `design` skill conflates structure (slices) with technical decisions (architecture).

## Key Finding: Reviewer Duplication

The most actionable finding is the reviewer infrastructure duplication between `refine-plan` and `implement-plan`. They share 4 identical reviewer prompt files (~70KB total duplicated). This could be extracted to `_shared/references/` without any skill merging.

## Recommendations

1. **Quick win: Merge 3 audit skills into 1** — same pattern, different prompts, high confidence
2. **Quick win: Extract shared reviewers** — `reviewers-web.md`, `reviewers-language.md`, etc. to `_shared/references/`
3. **Medium effort: Merge create/refine pairs** — architecture, slices, plan (3 merges)
4. **Medium effort: Merge epic lifecycle** — create-epic + start-epic
5. **Defer: onboard-repo + migrate merge** — different enough to warrant separate skills for now
6. **Avoid: plan + implement merge** — too different in orchestration; plan is interactive Q&A + review loop, implement is phase-by-phase code execution
