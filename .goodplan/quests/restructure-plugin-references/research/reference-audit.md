# Reference Audit — Complete Consumer Map

Generated: 2026-04-05
Source: `skills/_references/` (34 files), `skills/*/references/` (6 skill-local dirs), `agents/*.md` (34 files)

## 1. Per-File Consumer Map

### 1.1 `skills/_references/` Files (34 files)

#### `cli-interaction.md` (652 lines, 28KB)
| Consumer | Type | Mechanism |
|---|---|---|
| `skills/explore/SKILL.md` | Skill | `@` auto-include (Step 0) |
| `skills/status/SKILL.md` | Skill | `@` auto-include (Step 2) |
| `skills/upgrade/SKILL.md` | Skill | `@` auto-include (References section) |
| `skills/init/SKILL.md` | Skill | `@` auto-include (Step 0) |
| `skills/task/SKILL.md` | Skill | `@` auto-include (Step 1) |

**Consumer type**: Skills only (5 skills). No agents consume this directly.
**Content used**: All 5 skills use it for CLI detection, invocation patterns, error handling. `upgrade` narrows focus to Section 10. `status` uses Section 6 (State Orientation), Section 7 (Deriving Workflow Phase). `explore`, `init`, `task` use broadly.

---

#### `epic-conventions.md` (289 lines)
| Consumer | Type | Mechanism |
|---|---|---|
| `skills/explore/SKILL.md` | Skill | `@` auto-include (Step 0) |
| `skills/status/SKILL.md` | Skill | `@` auto-include (Step 2) |

**Consumer type**: Skills only (2 skills). No agents consume this directly.

---

#### `expertise-tracking.md` (76 lines)
| Consumer | Type | Mechanism |
|---|---|---|
| `skills/explore/SKILL.md` | Skill | `@` auto-include (Step 0) |
| `skills/status/SKILL.md` | Skill | `@` auto-include (Step 2) |
| `skills/create-epic/SKILL.md` | Skill | `@` auto-include |
| `skills/complete-epic/SKILL.md` | Skill | `@` auto-include |
| `agents/onboard-phase.md` | Agent | `@` auto-include |

**Consumer type**: Cross-consumer (4 skills + 1 agent).

---

#### `output-templates.md` (199 lines)
| Consumer | Type | Mechanism |
|---|---|---|
| `skills/explore/SKILL.md` | Skill | `@` auto-include (Step 0) |
| `skills/_references/iteration-loop.md` | Reference | `@` auto-include (line 3, nested) |

**Consumer type**: 1 skill + 1 reference (nested include). Transitive consumers via `iteration-loop.md`: `skills/implement/SKILL.md`.

---

#### `decisions-format.md` (80 lines)
| Consumer | Type | Mechanism |
|---|---|---|
| `skills/explore/SKILL.md` | Skill | `@` auto-include (Step 1) |
| `skills/status/SKILL.md` | Skill | `@` auto-include (Step 2) |

**Consumer type**: Skills only (2 skills).

---

#### `iteration-loop.md` (175 lines, 8.6KB)
| Consumer | Type | Mechanism |
|---|---|---|
| `skills/implement/SKILL.md` | Skill | `@` auto-include (inline reference at line 216, Loop Parameters at line 451) |

**Consumer type**: Skills only (1 skill — `implement`). **Not referenced by `plan-slice`, `create-epic`, or `create-side-quest`** — these three reimplement the iteration loop inline (see Section 7 below).

---

#### `sub-agent-return-format.md` (3KB)
| Consumer | Type | Mechanism |
|---|---|---|
| `agents/completion-epic.md` | Agent | `@` auto-include |
| `agents/slices-phase.md` | Agent | `@` auto-include |
| `agents/architecture-phase.md` | Agent | `@` auto-include |
| `agents/completion-slice.md` | Agent | `@` auto-include |
| `agents/implement-phase.md` | Agent | `@` auto-include |
| `agents/explore-phase.md` | Agent | `@` auto-include |
| `agents/onboard-phase.md` | Agent | `@` auto-include |

**Consumer type**: Agents only (7 agents).

---

#### `audit-conventions.md` (3.4KB)
| Consumer | Type | Mechanism |
|---|---|---|
| `agents/audit-docs-phase.md` | Agent | `@` auto-include |
| `agents/audit-architecture-phase.md` | Agent | `@` auto-include |
| `agents/audit-tests-phase.md` | Agent | `@` auto-include |

**Consumer type**: Agents only (3 agents).

---

#### `codebase-context-discovery.md` (4.2KB)
| Consumer | Type | Mechanism |
|---|---|---|
| `agents/onboard-phase.md` | Agent | `@` auto-include |

**Consumer type**: Agents only (1 agent).

---

#### `maturity-conventions.md` (9.9KB)
| Consumer | Type | Mechanism |
|---|---|---|
| `agents/onboard-phase.md` | Agent | `@` auto-include |
| `agents/audit-architecture-phase.md` | Agent | `@` auto-include |

**Consumer type**: Agents only (2 agents).

---

#### `plan-format.md` (4.9KB)
| Consumer | Type | Mechanism |
|---|---|---|
| `agents/plan-phase.md` | Agent | `@` auto-include |

**Consumer type**: Agents only (1 agent).

---

#### `review-preamble.md` (4.2KB)
| Consumer | Type | Mechanism |
|---|---|---|
| All 20 `agents/reviewer-*.md` | Agent | `@` auto-include (each reviewer loads this) |

**Consumer type**: Agents only (20 agents).

---

#### `review-agent-skill.md` through `review-ux-ia.md` (20 files, ~3.5-5.3KB each)
Each consumed by its matching reviewer agent:

| Reference File | Agent Consumer | Mechanism |
|---|---|---|
| `review-agent-skill.md` | `agents/reviewer-agent-skill.md` | `@` auto-include |
| `review-algorithm-numerical.md` | `agents/reviewer-algorithm-numerical.md` | `@` auto-include |
| `review-api-contract.md` | `agents/reviewer-api-contract.md` | `@` auto-include |
| `review-backend.md` | `agents/reviewer-backend.md` | `@` auto-include |
| `review-ci-github-workflows.md` | `agents/reviewer-ci-github-workflows.md` | `@` auto-include |
| `review-data-io.md` | `agents/reviewer-data-io.md` | `@` auto-include |
| `review-data-layer.md` | `agents/reviewer-data-layer.md` | `@` auto-include |
| `review-devops.md` | `agents/reviewer-devops.md` | `@` auto-include |
| `review-frontend.md` | `agents/reviewer-frontend.md` | `@` auto-include |
| `review-holistic.md` | `agents/reviewer-holistic.md` | `@` auto-include |
| `review-mcp-server.md` | `agents/reviewer-mcp-server.md` | `@` auto-include |
| `review-ml-pipeline.md` | `agents/reviewer-ml-pipeline.md` | `@` auto-include |
| `review-performance.md` | `agents/reviewer-performance.md` | `@` auto-include |
| `review-python.md` | `agents/reviewer-python.md` | `@` auto-include |
| `review-repo-tooling.md` | `agents/reviewer-repo-tooling.md` | `@` auto-include |
| `review-rust.md` | `agents/reviewer-rust.md` | `@` auto-include |
| `review-software-architecture.md` | `agents/reviewer-software-architecture.md` | `@` auto-include |
| `review-tui-cli.md` | `agents/reviewer-tui-cli.md` | `@` auto-include |
| `review-typescript.md` | `agents/reviewer-typescript.md` | `@` auto-include |
| `review-ux-ia.md` | `agents/reviewer-ux-ia.md` | `@` auto-include |

**Consumer type**: Agents only. Each review criteria file has exactly 1 consumer (its reviewer agent).

---

#### `README.md` (31 lines)
**Consumer type**: Zero consumers. This is a developer-facing documentation file. No skill or agent references it via `@` or Read.

---

#### `state-and-activity-formats.md` (53 lines)
**Consumer type**: Zero consumers. The file itself declares "Deprecated -- do not follow" at line 1. No skill or agent references it via `@` or Read.

---

### 1.2 Skill-Local `references/` Directories (6 skills)

#### `skills/explore/references/explore-logic.md` (4.7KB)
- **Loading**: `explore/SKILL.md` Step 1 says "Use the Read tool to load `references/explore-logic.md`"
- **Note**: This is a **Read tool instruction** (permission prompt risk), but it is conditional/deferred — loaded in Step 1 only, not auto-included at skill load time
- **Content relied on**: scope path mapping, output templates, mode behaviors

#### `skills/status/references/status-logic.md` (6.8KB)
- **Loading**: `status/SKILL.md` Step 2 says "Use the Read tool to load `references/status-logic.md`"
- **Note**: **Read tool instruction** (permission prompt risk). Loaded after CLI detection passes.
- **Content relied on**: display formatting rules, state-to-next-skill mapping, scope resolution, archive conventions

#### `skills/upgrade/references/migration-heuristics.md` (3.6KB)
- **Loading**: `upgrade/SKILL.md` Step 4 says "Use the Read tool to load `references/migration-heuristics.md`"
- **Note**: **Read tool instruction**, but deferred — only loaded in Step 4 when answering migration questions
- **Content relied on**: heuristics for answering CLI migration questions

#### `skills/init/references/` (5 files, ~44KB total)
- Files: `architecture-extraction.md`, `convention-heuristics.md`, `expertise-profiling.md`, `migration-detection.md`, `repo-scanning.md`
- **Loading**: Not directly referenced in `init/SKILL.md` — these appear to be passed to the `onboard-phase` agent via context bundles
- **Note**: No Read tool instructions found in `init/SKILL.md` for these files

#### `skills/implement/references/reviewer-registry.md` (5.5KB)
- **Loading**: Referenced by text instruction (not `@` include) in multiple consumers:
  - `skills/implement/SKILL.md` — "see references/reviewer-registry.md"
  - `skills/plan-slice/SKILL.md` — "Reviewer registry: skills/implement/references/reviewer-registry.md"
  - `skills/create-epic/SKILL.md` — "read `skills/implement/references/reviewer-registry.md`" (3 references)
  - `skills/create-side-quest/SKILL.md` — "Reviewer registry: skills/implement/references/reviewer-registry.md"
  - `skills/_references/iteration-loop.md` — "Read `skills/implement/references/reviewer-registry.md`"
- **Note**: **Cross-skill Read instruction** (permission prompt risk). 4 skills + 1 shared reference all instruct the LLM to Read this file from `implement`'s local directory. This is a significant permission prompt risk.

#### `skills/create-epic/references/templates.md` (817 bytes)
- **Loading**: Not found in `create-epic/SKILL.md` via grep — may be referenced indirectly or passed to agents
- **Note**: Very small file, unclear if actively used

---

## 2. Files with Zero Consumers (Deletion Candidates)

| File | Size | Reason |
|---|---|---|
| `skills/_references/README.md` | 2.4KB | Developer documentation only — no skill or agent references it |
| `skills/_references/state-and-activity-formats.md` | 2.3KB | Self-declared deprecated ("Deprecated -- do not follow"). Zero consumers. |

---

## 3. Skills Using Read Tool to Load References (Permission Prompt Risk)

### Direct Read tool instructions in SKILL.md files:

| Skill | File Loaded | Step | Risk Level |
|---|---|---|---|
| `explore` | `references/explore-logic.md` (local) | Step 1 | Low — skill-local, deferred/conditional |
| `status` | `references/status-logic.md` (local) | Step 2 | Medium — always loaded, triggers permission prompt |
| `upgrade` | `references/migration-heuristics.md` (local) | Step 4 | Low — conditional, only when answering questions |

### Cross-skill Read instructions (text-based, not `@`):

| Consumer | File Loaded | Risk Level |
|---|---|---|
| `plan-slice` | `skills/implement/references/reviewer-registry.md` | **High** — cross-skill path, always needed during refinement |
| `create-epic` | `skills/implement/references/reviewer-registry.md` (3x) | **High** — cross-skill path, needed for both arch and slices refinement |
| `create-side-quest` | `skills/implement/references/reviewer-registry.md` | **High** — cross-skill path, always needed during refinement |
| `_references/iteration-loop.md` | `skills/implement/references/reviewer-registry.md` | **High** — shared reference instructs Read of cross-skill file |

**Key finding**: `reviewer-registry.md` is the most problematic file. It lives under `implement/references/` but is consumed by 4 skills and 1 shared reference, all via text-based Read instructions (not `@` auto-includes). This means every refinement loop triggers a permission prompt for cross-skill file access.

---

## 4. Contradictions

### 4.1 `state-and-activity-formats.md` vs `cli-interaction.md`
- `state-and-activity-formats.md` documents the `state.md` format and `activity-log.jsonl` entry format
- `state-and-activity-formats.md` line 3: "Deprecated -- do not follow"
- `cli-interaction.md` Section 6 provides the replacement (State Orientation with CLI equivalents)
- **Contradiction**: The deprecated file still exists and its README entry describes it without noting deprecation
- **Resolution**: Delete the file (zero consumers confirms safety)

### 4.2 `plugin/CLAUDE.md` vs `cli-interaction.md`
- `plugin/CLAUDE.md` covers CLI-first discovery, hands-off policy, CLI on PATH, expertise tracking
- `cli-interaction.md` covers the same topics in much greater depth (652 lines vs ~30 lines)
- **Not a contradiction** but significant overlap. `plugin/CLAUDE.md` is a lightweight orientation that supplements `cli-interaction.md`. The plugin CLAUDE.md is auto-loaded by Claude Code for all sessions (not just skill invocations), while `cli-interaction.md` is only loaded by the 5 skills that `@`-include it.

---

## 5. Redundancies

### 5.1 CLI detection pattern
- `cli-interaction.md` Section 1 defines the CLI detection pattern in full
- Every skill's SKILL.md Step 0 re-states a version of the same pattern ("If the command fails... stop")
- **Redundancy level**: Moderate — the SKILL.md versions are abbreviated and consistent, acting as reinforcement rather than duplication

### 5.2 Error handling
- `cli-interaction.md` Section 10 covers error handling comprehensively
- `upgrade/SKILL.md` narrows focus to Section 10 only (good — targeted loading)
- Other skills don't reference specific sections, loading the full 28KB file

### 5.3 `plugin/CLAUDE.md` vs `cli-interaction.md`
- CLI on PATH instructions duplicated
- Data ownership / hands-off policy duplicated
- `plugin/CLAUDE.md` is ~30 lines; `cli-interaction.md` is 652 lines
- **Overlap content**: Binary detection, data ownership, CLI invocation basics

### 5.4 `epic-conventions.md` references `status-logic.md`
- `epic-conventions.md` line 123/134 references `status-logic.md` conventions
- This creates an implicit dependency between a shared reference and a skill-local reference

---

## 6. Consumer Classification Summary

### Agent-only files (candidates for `agents/_references/`):

| File | Agent Consumers | Skill Consumers |
|---|---|---|
| `sub-agent-return-format.md` | 7 agents | 0 skills |
| `audit-conventions.md` | 3 agents | 0 skills |
| `codebase-context-discovery.md` | 1 agent | 0 skills |
| `maturity-conventions.md` | 2 agents | 0 skills |
| `plan-format.md` | 1 agent | 0 skills |
| `review-preamble.md` | 20 agents | 0 skills |
| `review-*.md` (20 files) | 1 agent each | 0 skills |

**Total agent-only**: 26 files (sub-agent-return-format, audit-conventions, codebase-context-discovery, maturity-conventions, plan-format, review-preamble, 20 review-*.md)

### Cross-consumer files (stay in `skills/_references/`):

| File | Agent Consumers | Skill Consumers |
|---|---|---|
| `expertise-tracking.md` | 1 agent (onboard-phase) | 4 skills (explore, status, create-epic, complete-epic) |

### Skill-only files (stay in `skills/_references/`):

| File | Skill Consumers |
|---|---|
| `cli-interaction.md` | 5 skills |
| `epic-conventions.md` | 2 skills |
| `output-templates.md` | 1 skill + 1 ref (nested) |
| `decisions-format.md` | 2 skills |
| `iteration-loop.md` | 1 skill (implement) |

---

## 7. Iteration Loop Fragmentation Analysis

### Current state:

| Skill | Loop Implementation | References `iteration-loop.md`? | Max Iterations | Stagnation Window | Reduction Threshold |
|---|---|---|---|---|---|
| `implement` | References shared `iteration-loop.md` via `@` include | **Yes** — `@` auto-include + Loop Parameters section | 12 | 2 | 2 |
| `plan-slice` | **Inline** (~100 lines, Steps 4f-4g) | No | 10 (env override) | 2 | 2 |
| `create-epic` (arch) | **Inline** (~90 lines, Steps 6d) | No | 3 (env override) | 2 | 2 |
| `create-epic` (slices) | **Inline** (~60 lines, Step 8f, "same pattern as architecture") | No | 3 (env override) | 2 | 2 |
| `create-side-quest` | **Inline** (~80 lines, Steps 6e-6f) | No | 10 (env override) | 2 | 2 |

### Key differences between inline implementations and the shared loop:

1. **Exit conditions are identical** across all 5: stagnation >= 2, reduction >= 2, pass >= 9, hard cap at max_iterations
2. **`--override` flag**: `create-epic` and `create-side-quest` use `--override` for stagnation/reduction/cap exits; `plan-slice` and `implement` do not
3. **Context bundle loading**: Each skill has a different CLI command (`start-refine-architecture`, `start-refine-slices`, `start-refinement`, etc.)
4. **Submit commands**: Each skill has a different submit command
5. **Reviewer selection**: All reference `reviewer-registry.md` via text Read instruction (except `implement` which uses local relative path)

### Fragmentation cost:
- ~330 lines of near-identical loop logic duplicated across 4 skills (plan-slice, create-epic 2x, create-side-quest)
- Each copy must be updated independently when loop behavior changes
- The shared `iteration-loop.md` already defines the parameterizable pattern — the 3 non-implement skills simply don't use it

---

## 8. Content Candidates for Always-On Orientation Skill (`workflow-guide`)

Content from `cli-interaction.md` that would benefit from being always-on (not just loaded by the 5 skills that `@`-include it):

1. **CLI query/mutation patterns** (Sections 4-5): How to invoke `gp` commands, `--json` flag convention
2. **`.goodplan/` write restrictions** (Section 2-3): Data ownership model, what skills must NOT do
3. **Skill entry points per flow** (Section 7): Deriving workflow phase, which skill to invoke when
4. **Flow recovery** (Section 10): Error handling, state machine error recovery patterns
5. **Self-discovery** (Section 11): How to discover available CLI commands

Content that should NOT move to workflow-guide (must stay in `cli-interaction.md`):
- Detailed invocation patterns (Section 4) — too verbose for always-on
- Completion command payloads (Section 9) — specific to completion skills
- Migration example (Section 12) — specific to upgrade skill
- Full state orientation (Section 6) — needed by status/explore but too detailed for always-on

### `plugin/CLAUDE.md` overlap:
- `plugin/CLAUDE.md` already serves a similar purpose (always-on orientation for the plugin)
- A `workflow-guide` skill would need to be evaluated against `plugin/CLAUDE.md` to avoid duplication
- Key difference: `plugin/CLAUDE.md` is loaded for ALL sessions; `workflow-guide` would be loaded only when Claude's description-matching triggers it

---

## 9. Size Summary

| Category | Files | Total Size |
|---|---|---|
| Agent-only references | 26 | ~100KB |
| Skill-only references | 5 | ~50KB |
| Cross-consumer references | 1 | ~3.5KB |
| Zero-consumer (delete) | 2 | ~4.7KB |
| Skill-local references | 10 | ~55KB |
| **Total** | **44** | **~213KB** |

## 10. Verification Cross-Reference

All 34 files in `skills/_references/` are accounted for:
- 5 skill-only files (cli-interaction, epic-conventions, output-templates, decisions-format, iteration-loop)
- 1 cross-consumer file (expertise-tracking)
- 26 agent-only files (sub-agent-return-format, audit-conventions, codebase-context-discovery, maturity-conventions, plan-format, review-preamble, 20 review-*.md)
- 2 zero-consumer files (README.md, state-and-activity-formats.md)

Total: 5 + 1 + 26 + 2 = 34. Matches directory listing.
