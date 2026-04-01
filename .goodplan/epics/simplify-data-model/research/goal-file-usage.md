# Goal File Usage Audit

Researched: 2026-04-01 | Source: codebase analysis

---

## Summary

There are two distinct "goal" concepts in the codebase:

1. **`idea.md`** — project-level markdown file at `.goodplan/idea.md`. Written by skills (LLM-owned), not the CLI state machine.
2. **`goal.md`** — per-entity markdown file at `epics/<name>/goal.md`, `epics/<name>/slices/<name>/goal.md`, `quests/<name>/goal.md`. Written by skills (LLM-owned), not the CLI state machine.

Additionally, **all three entity types already store a `goal` field in their JSON** (`epic.json`, `slice.json`, `quest.json`). This creates a dual-storage situation where the JSON has a one-line goal and the `goal.md` has rich structured markdown.

---

## 1. `idea.md` Consumers

### Who writes it
| Writer | How |
|---|---|
| `/create-epic` (Mode A) | `skills/create-epic/SKILL.md` Step 5 — writes `.goodplan/idea.md` using a template from `references/templates.md` |
| `/onboard-repo` | `skills/onboard-repo/SKILL.md` Step 4 — generates from repo scan results |
| `/migrate` | `src/core/rpc/migrate.ts` — copies existing `idea.md` from old `.project/` directory (allowlisted in `PROJECT_MARKDOWN_FILES`) |

### Who reads it
| Consumer | File | How used | Needs full markdown? |
|---|---|---|---|
| `/create-plan` | `skills/create-plan/SKILL.md` | Loaded as context for plan generation (Step 2 item 1) | Yes — reads full file |
| `/create-slices` | `skills/create-slices/SKILL.md` | Step 1 — required precondition; grounding context when no architecture exists | Yes |
| `/create-architecture` | `skills/create-architecture/SKILL.md` | Step 1 — required precondition; informs subsystem identification, conventions drafting | Yes |
| `/refine-architecture` | `skills/refine-architecture/SKILL.md` | Step 2.1 — loaded alongside conventions for review context | Yes |
| `/refine-slices` | `skills/refine-slices/SKILL.md` | Loaded as context for slice refinement | Yes |
| `/audit-docs` | `skills/audit-docs/SKILL.md` | Listed as a project workflow doc to audit | Yes |
| `/onboard-repo` | `skills/onboard-repo/SKILL.md` | Re-entry check (if exists and has content, offer to keep or regenerate) | Existence + size check |
| `/project-status` | `skills/project-status/references/status-logic.md` | File-existence check: `idea.md` exists + no `architecture/` = "Explore or define architecture" | Existence only |
| CLAUDE.md | Root `CLAUDE.md` | Listed as pointer: "project goal, scope, constraints" | N/A (human reference) |
| `src/core/rpc/migrate.ts` | Migration Q&A | Hint text tells LLM to read `idea.md` for the project goal | Content extracted by LLM |

### Key finding
`idea.md` is purely LLM-owned markdown. The CLI never parses or validates it. It serves as rich context for skills. The project goal is also stored in the migrate schema's `projectGoal` field, but NOT in `project.json`.

---

## 2. `goal.md` Consumers (Epic/Slice/Quest)

### Who writes it
| Writer | Entity type | How |
|---|---|---|
| `/create-epic` | Epic | Steps 7/B4 — writes `goal.md` after `epic:create` CLI call. Uses Write tool directly. |
| `/create-slices` | Slice | Step 6 — writes `goal.md` per slice after defining sequencing. Uses Write tool directly. |
| `/refine-slices` | Slice | Creates `goal-refining.md` working copies, then renames to `goal.md` on completion |
| `/complete` | Quest (proposed) | Drafts side quest `goal.md` proposals for approval — does NOT auto-create |
| `/refine-architecture` | N/A | Writes `architecture-refining/goal.md` for refinement scope (different usage) |

**Important**: The CLI does NOT write `goal.md` files. `epic:create`, `slice:create`, and `quest:create` all accept a `goal` string in JSON stdin and store it in the entity JSON. The `goal.md` file is then written separately by the skill using the Write tool.

### Who reads it
| Consumer | Entity type | How used | Needs full markdown? |
|---|---|---|---|
| `/create-plan` | Slice | Step 2 item 4 — required precondition ("If absent, tell user and stop"). Also reads other slice `goal.md` files for dependency context. Checks for `## Maturity Note` section. | Yes — reads full file, inspects sections |
| `/create-slices` | Epic | Step 2 — reads epic's `goal.md` to inform slice decomposition | Yes |
| `/complete` | Epic, Slice | Reads epic `goal.md` for context; reads slice `goal.md` files for incomplete-work assessment | Yes |
| `/refine-slices` | Slice, Epic | Reads all `$SLICES_ROOT/*/goal.md`; reads epic `goal.md` when epic-scoped | Yes |
| `/start-epic` | Epic | Step 1 — reads epic `goal.md` for summary | Yes (extracts summary) |
| `/capture` | Slice, Quest, Epic | Reads active entity's `goal.md` for a one-line summary as `capturedDuring` context | No — only needs one-line summary |
| `/project-status` | Slice, Quest | File-existence state machine: `goal.md` existence determines state (rows 11-12) | Existence only |
| `/migrate` skill | All | `skills/migrate/SKILL.md` reads `goal.md` to extract goal string for CLI create commands | Extracts goal string |
| `/create-plan` guidance | Slice | Auto-detect logic scans for dirs with `goal.md` + explore markers | Existence only |
| Stale assumption detection | All | Compares git dates of architecture files vs `goal.md` | Metadata only |

---

## 3. CLI `goal` Field in JSON Entities

All three entity create commands already accept and store `goal`:

| Command | Stdin schema | Storage |
|---|---|---|
| `gp epic:create --json` | `{"name":"...","goal":"..."}` | `epic.json` → `goal` field |
| `gp slice:create --json` | `{"name":"...","goal":"...","epic":"..."}` | `slice.json` → `goal` field |
| `gp quest:create --json` | `{"name":"...","goal":"..."}` | `quest.json` → `goal` field |

The `goal` field is required for all three (enforced in `src/core/rpc/begin.ts`).

### How the JSON goal is used
| Consumer | File | Usage |
|---|---|---|
| `epic:show` / `quest:show` / `slice:show` | `src/commands/*/show.ts` | Displays `Goal: <goal>` in CLI output |
| `detectArtifacts()` | `src/core/artifacts.ts` | Checks `goal` field exists and is non-empty string to set `hasGoal` flag |
| `resolveContentSource()` | `src/core/context/collect.ts` | When resolving a JSON file as a content source, extracts the `goal` string field |
| Migration | `src/core/rpc/migrate.ts` | Passes goal into entity create events during migration |

---

## 4. The Dual-Storage Problem

For epics, slices, and quests, goals exist in **two places**:
1. **JSON entity** (`epic.json`, `slice.json`, `quest.json`) — one-line summary, managed by CLI
2. **`goal.md`** — rich structured markdown with sections (Objective, Success Criteria, Verification, Subsystems, Dependencies, Maturity Notes), managed by skills

The JSON goal is a brief string (typically one sentence). The `goal.md` is a full document (often 50-200 lines) with structured sections.

These are created at different times by different actors:
- JSON `goal` is written by the CLI during `*:create`
- `goal.md` is written by the skill immediately after the CLI call

---

## 5. Migration Impact Assessment

If `goal.md` content moved into JSON entities (e.g., a `goalMarkdown` field or replacing `goal.md` with a `goal` field in the JSON):

### Skills that would need updating (read `goal.md`)
| Skill | Change needed | Effort |
|---|---|---|
| `/create-plan` | Read goal from JSON or new field instead of `goal.md` file | Medium — multiple references, section inspection |
| `/create-slices` | Read epic goal from JSON instead of `goal.md` | Low |
| `/create-epic` | Stop writing `goal.md`, write goal content to JSON field | Low-Medium |
| `/complete` | Read goals from JSON instead of `goal.md` files | Medium |
| `/refine-slices` | Read/write goal content via JSON instead of `goal.md`/`goal-refining.md` | High — working-copy pattern relies on file rename |
| `/start-epic` | Read from JSON | Low |
| `/capture` | Read from JSON (only needs one-line — already in JSON `goal` field) | Trivial — could use existing JSON goal today |
| `/project-status` | Update file-existence checks (rows 11-12 in status-logic) | Low |
| `/migrate` | Update to not look for `goal.md` files | Medium |
| `/audit-docs` | Remove `goal.md` from audit scope | Low |

### CLI source changes
| File | Change needed |
|---|---|
| `src/core/artifacts.ts` | Already checks JSON `goal` — no change needed |
| `src/core/context/collect.ts` | Already extracts `goal` from JSON — no change needed |
| Entity schemas | Add optional `goalMarkdown` field (or similar) |
| State transitions | Accept and store extended goal content |
| `show` commands | Potentially display richer goal info |

### Tests
| File | Change needed |
|---|---|
| `tests/integration/state.test.ts` | Updates to check for goal in JSON instead of `goal.md` |
| `tests/integration/migrate.test.ts` | Update migration assertions |
| `tests/fitness/state-integrity.test.ts` | Minor — already deals with `idea.md` |

### Shared references
| File | Change needed |
|---|---|
| `skills/_shared/references/epic-conventions.md` | Update directory structure docs, status logic table |
| `skills/_shared/references/cli-interaction.md` | Update "Goals" reference |
| `skills/project-status/references/status-logic.md` | Update file-existence state machine |
| `skills/migrate/references/migration-heuristics.md` | Update heuristics referencing `goal.md` |

---

## 6. Key Observations

1. **`/capture` already could use the JSON `goal` field** — it only needs a one-line summary, which is exactly what the JSON stores. This is the simplest win.

2. **`/refine-slices` is the hardest to migrate** — its working-copy pattern (`goal.md` -> `goal-refining.md` -> `goal.md`) relies on filesystem operations. Moving to JSON would require a different refinement pattern.

3. **`idea.md` is a separate concern** — it's project-level, not entity-level, and has no JSON equivalent today. It could become a `projectGoal` field in `project.json`, but many skills read it as rich markdown context, so a summary field alone wouldn't suffice.

4. **The `goal.md` file-existence check in status-logic is the only place where `goal.md` presence determines workflow state** (rows 11-12). If goals moved to JSON, a `hasGoalMarkdown` artifact flag could replace this.

5. **Most consumers need the full markdown** — only `/capture` and `/project-status` could work with just the JSON goal string. All planning and refinement skills need the structured sections.
