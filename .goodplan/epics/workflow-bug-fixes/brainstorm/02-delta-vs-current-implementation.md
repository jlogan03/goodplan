# Arc 2 — Delta Analysis: Ideal vs Current

Compares the Arc 1 ideal against `plugin/skills/`, `src/core/state/`, `src/core/context/`, and the Vision doc. Grouped by where the change lives: **Skill changes**, **CLI changes**, or **Both**.

For each delta: what's currently there → what's needed → severity (S = small tweak, M = medium quest, L = large epic-scale).

---

## Mapping the eight phases to current skills

| Ideal phase | Current home | Fit |
|---|---|---|
| Spark | `create-epic` (early Q&A) | Buried; not a distinct phase |
| Sharpen | `create-epic` (mid) and `plan-slice` (interview) | Split across two skills, neither does it as a structured protocol |
| Survey | `explore` (standalone) and `create-epic` (inline) | Two parallel implementations of the same idea |
| Shape | `create-epic` (architecture step) and `start-epic` (review) | Split into draft+review across two skills |
| Slice | `create-epic` (slice definition) and `start-epic` (approval) | Same split as Shape |
| Build | `implement` | Single skill, matches ideal shape closely |
| Reflect | `complete-epic` (epic) and `implement`'s Step 6 (slice) | Split between two skills with different shapes |
| Repeat | `status` skill suggests next | Indirect — user has to ask |

**Headline observation**: the current 13-skill set is largely *correct* in coverage but mis-cut along the seams. The seams follow CLI verbs (`create-epic`, `start-epic`, `complete-epic`) instead of user phases (Spark, Sharpen, Shape...). Same content, wrong joints.

---

## Skill changes

### S1. Auto-advance between conversational phases [Skill, M]

**Current**: Each skill ends with "next: run /gp:start-epic" or similar. User must manually fire the next slash command. This is the #1 transition pain.

**Needed**: At the end of each skill that exits into a known-next phase, the skill itself offers `AskUserQuestion("Continue to <next phase>? Yes / Pause here / Branch into ...")`. On Yes, the orchestrator either invokes the next skill in-process (if the harness allows) or surfaces a one-keystroke continuation token.

**Constraint**: Claude Code skills can't directly invoke other skills. The realistic shape is: skill ends with a clear, copy-pasteable next step *and* the system writes a "next intent" marker that `/gp:status` reads on next session, so re-entry says "you were about to start-epic, run it now?"

### S2. Replace skill seams with phase seams [Skill, L]

**Current**: `create-epic` does Spark+Sharpen+Survey+Shape+Slice in one 408-line orchestrator. `start-epic` does a final review of Shape+Slice. `plan-slice` does per-slice Sharpen+Shape. `implement` does Build+partial Reflect. `complete-epic` does cross-slice Reflect+Repeat.

**Needed**: Refactor to phase-shaped skills:
- `spark` (tiny — capture goal blurb)
- `sharpen` (structured pre-planning interview, reusable for epics and slices)
- `survey` (existing `explore`, slightly retargeted)
- `shape` (architecture draft + pre-mortem)
- `slice` (slice menu definition)
- `build` (existing `implement`)
- `reflect` (slice or epic — same skill, different scope)
- `next` (existing `status` retargeted toward "what's the next steering moment")

This collapses 13 skills to ~8 and aligns each skill with one user phase. Big lift but it directly fixes the "clunky transitions" pain because each skill now has exactly one entry and one exit.

### S3. Pre-flight checkpoint at every autonomy window [Skill, M]

**Current**: `implement` skill is "fully autonomous" with no pre-flight. `explore` runs research cycles without first declaring what it will produce.

**Needed**: Both autonomy-window skills (`survey`/`explore` and `build`/`implement`) start with a structured pre-flight:
```
I will:
- <bullet list of what I'll touch>
- <bullet list of what I'll produce>
- I'll pause and ask if I hit: <list of triggers>
- Expected return: <minutes / iterations>
```
User confirms once. This is the moment to migrate runtime questions to pre-flight.

### S4. Discovery checkpoint surfacing [Skill, M]

**Current**: Vision doc specifies discovery checkpoints with `info / tradeoff-change / blocking` severity. Not implemented anywhere.

**Needed**: `implement` (and `explore`) must call a CLI verb during phase loops that records discoveries. `tradeoff-change` and `blocking` interrupt at the next safe boundary (between phases of the implement loop, not mid-phase). `info` queues for the recap.

### S5. Recap discipline at every reflect [Skill, S]

**Current**: `implement` Step 8 does a completion summary, but it's templated and easy to skim. `complete-epic` is more thorough.

**Needed**: Recap at slice-end and epic-end follows a fixed shape: *what got built / what changed in the architecture / what surprised us / what's queued / what needs your decision*. The "what needs your decision" section is a numbered list the user can answer in one message.

### S6. Sharpen as a structured protocol, not freeform Q&A [Skill, S]

**Current**: `create-epic` and `plan-slice` both do interactive Q&A but each invents its own question set.

**Needed**: A shared "pre-planning interview" reference (already partially at `_references/`) with the protocol from Vision doc §Pre-Planning Interview:
- acceptance criteria
- known constraints
- priority ordering on tradeoffs
- related past work the user knows about
- "what could go wrong"
- "show me an example" for ambiguous bits

Both `sharpen-epic` and `sharpen-slice` invoke it. Telemetry tracks which questions surface useful info.

---

## CLI changes

### C1. Snapshot model for state [CLI, L]

**Current**: 23 forward-only transitions in `src/core/state/transitions/`. Each entity has one current status. No history of prior attempts. `replan` is a counter.

**Needed**: Each entity gets a `snapshots[]` array. Each snapshot is `{phase, status, ts, reason, ref}`. The "current state" is just the latest snapshot per phase per entity. Going "back" creates a new snapshot for an earlier phase, doesn't delete old ones.

This is the foundational change that unlocks back-transitions, phase-skipping, lightweight paths, and clean re-entry. Big lift but everything else gets simpler.

**Smaller alternative**: Add reverse transitions to the existing machine (`implementing → planning` with reason). Less elegant but ships in a quest, not an epic.

### C2. Import graph for context bundling [CLI, M]

**Current**: `src/core/context/priorities.ts` (9k bytes) is a hand-curated priority table per phase. No import graph anywhere.

**Needed**: Lightweight TS import parser → adjacency list → updated on each `submit-implementation`. Build context bundles ask: "given files X to be modified, return one-level dependency cone." Source code outside the cone is excluded from inline.

This single addition probably resolves 60% of the "wrong context" pain.

### C3. Two-pass relevance scoring [CLI, M]

**Current**: One-pass priority filling.

**Needed**: When Pass 1 results overflow budget, Pass 2 spawns a tiny LLM call to score each candidate 1-5 against the specific task. Scores drive inline/reference/exclude decisions. Already specified in Vision doc.

### C4. ExcludedReason in context bundles [CLI, S]

**Current**: `ContextBundle` type has `inline | references | decisions | learnings`. No record of what was filtered out.

**Needed**: Add `excludedReason: { sourceCode?, learnings?, architecture?, decisions? }` map with counts and reasons. When a sub-agent struggles, the orchestrator can present "here's what wasn't shown" to the user. Tiny CLI change, large debugging payoff.

### C5. Tech debt entity [CLI, M]

**Current**: Not present.

**Needed**: `techdebt:create | list | resolve | drop` per Vision doc. Auto-evaluation at slice/quest completion. Storage parallel to learnings.

### C6. Intervention entity + telemetry [CLI, M]

**Current**: Activity log exists; no intervention concept.

**Needed**: `intervention:record` verb. CLI tracks category, signals, human action. Cross-pattern detection at epic completion proposes workflow changes. Without this, the system can't migrate runtime questions to pre-flight (the loop doesn't close).

### C7. Discovery flag verb [CLI, S]

**Current**: Not present.

**Needed**: `discovery:flag --scope <slice> --severity <info|tradeoff-change|blocking> --description "..."`. Already in Vision doc. Tiny CLI change unblocks S4.

### C8. Next-intent marker for re-entry [CLI, S]

**Current**: `gp status --json` reports current state but doesn't say "you were about to do X."

**Needed**: Each skill, on exit, writes a `nextIntent` field via a CLI verb. `status` reads it and surfaces "your last session ended ready for `<phase>`, run `<command>` to resume." This is the cheapest possible fix for re-entry awkwardness.

### C9. Per-phase context priority tables become per-task [CLI, M]

**Current**: `priorities.ts` keys context priority by phase only.

**Needed**: Priority tables key by `(phase × scope × touched-subsystems)`. When a build phase touches the auth subsystem, the priority bumps auth learnings to mandatory. Mostly mechanical refactor of `priorities.ts`.

---

## Both (changes that span skill + CLI)

### B1. Steering-mode tagging on every prompt [Both, M]

Every user-facing message in every skill should declare its mode in a one-line header: `[conversation]`, `[review]`, `[soft interrupt]`, `[background — will return at <event>]`. This is half a CLI change (status verb reports current mode) and half a skill discipline change (skills emit the header).

Cheap to implement, huge clarity payoff. The user always knows whether they're being asked to think hard, review, glance, or wait.

### B2. Atomic phase boundaries [Both, M]

The current "implementation-complete" status is an awkward intermediate state — slice is built but not yet completed, easy to lose track of. The snapshot model (C1) fixes this structurally; until then, both `implement` and the CLI need explicit "I am between phase N and phase N+1" handling so re-entry is unambiguous.

### B3. Lightweight path for trivial work [Both, M]

Vision doc §State Machine Flexibility specifies skipping refinement and formal QA for trivial quests. Needs:
- CLI: `slice:skip-to <phase> --reason "..."` verb
- Skill: scope assessment at the start of each phase that auto-routes trivial cases

### B4. Always-on workflow guide → mode-aware orientation [Both, S]

`workflow-guide` skill exists (82 lines, always-on). Currently a static reference. Should become mode-aware: when the user is mid-build, it surfaces "you're in a background autonomy window, expected return in N rounds." When mid-spark, it surfaces "you're in conversation, here are good questions to surface constraints."

---

## Severity rollup and execution shape

| Tier | Items | Why |
|---|---|---|
| **Quick wins (S, ship as quests)** | C4, C7, C8, S5, S6, B4 | Tiny code surface, immediate pain relief, no architectural risk |
| **Medium (M, ship as quests in 1-2 epics)** | S1, S3, S4, C2, C3, C5, C6, C9, B1, B2, B3 | Each is a focused 1-3 day quest |
| **Large (L, full epic-scale)** | S2 (skill recut), C1 (snapshot model) | Foundational changes the rest of the system benefits from |

**Suggested execution order:**
1. **Quick wins first** (C4, C7, C8, S5, S6, B4): immediate relief on transitions and re-entry, no foundation needed.
2. **Context retrieval epic** (C2, C3, C9): fixes "wrong context" pain. Medium-sized, self-contained.
3. **Steering checkpoint epic** (S3, S4, C5, C6, C7+, S1, B1): the meat of the steering vs autonomy redesign.
4. **Snapshot model epic** (C1, B2, B3): the foundational state-machine change. Do after the steering work because steering work surfaces what the snapshot model needs to support.
5. **Skill recut epic** (S2): only attempt after snapshot model is in place — otherwise you'd recut on top of the wrong foundation.

That's roughly four epics and ~15 quests. Maps cleanly onto the Vision doc and the existing Workflow Improvements - Work Items doc.

## Surprises from doing the delta

1. **The Vision doc is mostly already right.** The user's pain isn't "we don't know what to build," it's "we haven't built it yet." Arc 1 mostly re-derived what `Target Workflow Vision.md` already says. The new contribution is the *seam realignment* (S2) and the *snapshot model* (C1), neither of which is in the Vision doc explicitly.
2. **Re-entry pain has a one-day fix.** C8 (next-intent marker) is trivially small and fixes the highest-frequency complaint. Should ship immediately.
3. **The implement skill is closer to ideal than the create-epic skill.** Implement matches "Build" almost exactly. Create-epic crams Spark+Sharpen+Survey+Shape+Slice into one orchestrator and that's where most steering pain lives.
4. **Telemetry/intervention is on the critical path, not optional.** Without it, the system has no mechanism to learn which questions to migrate from runtime to pre-flight. The Vision doc tags telemetry as "additive, not in the critical path" — that's wrong for the *intervention* part, even if it's right for cross-user analytics. Worth flagging to the user.
