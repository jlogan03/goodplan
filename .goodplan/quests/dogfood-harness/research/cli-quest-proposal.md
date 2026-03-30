# CLI Quest & Architecture Proposal Research

Researched: 2026-03-24 | Source: codebase exploration

---

## 1. Architecture Proposal Path for Subsequent Epics

### How the proposal path works

For subsequent epics (non-empty-state projects), the architecture proposal path is:

1. `/create-architecture` skill writes files to `epics/<name>/architecture-proposal/` instead of directly to `epics/<name>/architecture/`. The `architecture-proposal/` directory is **invisible to the CLI** — the CLI only sees `COMPLETE_ARCHITECTURE` state transitions.
2. A human (or orchestrator) manually approves the proposal: copy `architecture-proposal/` → `architecture/` and write `approved.md` in the epic's architecture directory. The `approved.md` file is a human-readable marker only — it has no CLI state significance.
3. The skill calls `goodplan submit-architecture --epic <name> --json` to trigger `COMPLETE_ARCHITECTURE`, advancing the epic from `defining-architecture` → `architecture-defined`.

### No `start-epic` in the CLI path

`/start-epic` is a legacy, un-migrated skill. The plan-refined notes explicitly say: **do NOT exercise `/start-epic`** — it creates `__active__`-prefixed directories and writes `state.md` directly, which corrupts CLI state. It is logged as a friction gap (approval workflow needs CLI migration).

The current CLI-native path for architecture approval is purely manual copy + `submit-architecture`.

### Relevant commands

- `goodplan epic:define-architecture --epic <name>` — begin architecture definition phase (`explored` → `defining-architecture`)
- `goodplan epic:refine-architecture --epic <name>` — begin refinement (`architecture-defined` → `refining-architecture`)
- `goodplan submit-architecture --epic <name> --json` — complete architecture phase (`defining-architecture` → `architecture-defined`)
- `goodplan submit-refine-architecture --epic <name> [--override] --json` — complete refinement round; stdin: `{"scores": {...}}`; advances through `refining-architecture` or exits to `architecture-refined`

There is no CLI command that handles the copy of `architecture-proposal/` → `architecture/` or the writing of `approved.md`. Both are manual filesystem operations performed by the skill or user.

---

## 2. `/create-plan` and `/implement-plan` Skill Compatibility with Quests

Both skills fully support quests (they use "slice or side quest" / "quest" terminology throughout).

### `/create-plan` (SKILL.md Step 2)

Scope resolution explicitly handles quests:
- With no argument: queries `goodplan status --json`, checks `.activeSlice` first, then `.activeQuest`. If `.activeQuest` is present, uses `.project/side-quests/<activeQuest.name>/` (or `.project/quests/<activeQuest.name>/` for the new path).
- Architecture loading for side quests: uses `.project/architecture/` as primary; if an active epic exists, loads the epic's architecture and flags compatibility concerns.

Submit step (Step 7) uses the quest path:
```bash
stdin: "" | goodplan submit-plan --quest <name> --json
```

### `/implement-plan` (SKILL.md Step 4.2)

The finalization step explicitly handles both scopes. After all phases complete:
```bash
stdin: "" | goodplan submit-implementation --quest <name> --json
```

Both skills are fully quest-compatible. They detect the scope from the plan's directory path (`.project/quests/<name>/` or `.project/side-quests/<name>/`) and call the appropriate `--quest` flag on submit commands.

---

## 3. Quest Lifecycle Commands (Full Reference)

### Creation

```bash
echo '{"name":"<name>","goal":"<goal text>"}' | goodplan quest:create --json
```

Transition: none → `created`. Project-scoped (no `--epic` flag). Stored at `.project/quests/<name>/`.

### Planning

```bash
goodplan quest:plan --quest <name> --json
```

Transition: `created` → `planning`. Guard: `activeQuest == null` (only one quest can be active at a time).

Sub-agent writes `plan.md` to `.project/quests/<name>/plan.md`, then:
```bash
stdin: "" | goodplan submit-plan --quest <name> --json
```

Transition: `planning` → `plan-created`. Guard: `hasChild(state, "quests/<name>", "plan.md")`.

### Refinement

```bash
goodplan quest:refine-plan --quest <name> --json
```

Transition: `plan-created` → `refining`.

Sub-agent writes scores, then:
```bash
echo '{"scores":{"<criterion>": <number>}}' | goodplan submit-refinement --quest <name> --json
# --override flag available to bypass score threshold
```

Transitions: `refining` → `refining` (below threshold) or `refining` → `plan-refined` (threshold met or `--override`).

Skip path: first round can go `plan-created` → `plan-refined` directly if scores pass.

### Implementation

```bash
goodplan quest:implement --quest <name> --json
```

Transition: `plan-refined` → `implementing`. Guard: `hasChild(state, "quests/<name>", "plan-refined.md")`.

Sub-agent implements, then:
```bash
stdin: "" | goodplan submit-implementation --quest <name> --json
```

Transition: `implementing` → `implementation-complete`.

### Completion

```bash
echo '{"verificationPassed":true,"learnings":[...],"architectureDelta":[...]}' \
  | goodplan quest:complete --quest <name> --json
```

Transition: `implementation-complete` → `completed`. Guard: `verificationPassed == true`. Clears `project.json activeQuest`, rolls up learnings, applies architecture deltas.

`learnings` and `architectureDelta` are optional fields.

### Abandonment

```bash
echo '{"reason":"<reason>"}' | goodplan quest:abandon --quest <name> --json
```

Valid from any non-terminal state. Clears `activeQuest` if this was the active quest.

---

## Summary Table

| Question | Answer |
|---|---|
| Does `start-epic` handle proposal copy + `approved.md`? | Yes, the legacy `/start-epic` skill does — but it is un-migrated and **must not be used** (corrupts CLI state). The CLI-native path is manual copy + `submit-architecture`. |
| Does `submit-architecture` differ for proposals vs direct writes? | No — `submit-architecture --epic <name>` always triggers `COMPLETE_ARCHITECTURE`. The proposal/direct-write distinction is purely a filesystem concern managed by skills, invisible to the CLI. |
| Do `/create-plan` and `/implement-plan` work for quests? | Yes — fully supported. Both detect quest scope and call `--quest` variants of submit commands. |
| Quest submit commands | `submit-plan --quest <name>`, `submit-refinement --quest <name> [--override]`, `submit-implementation --quest <name>` |
| Quest lifecycle commands | `quest:create`, `quest:plan`, `quest:refine-plan`, `quest:implement`, `quest:complete`, `quest:abandon` |
