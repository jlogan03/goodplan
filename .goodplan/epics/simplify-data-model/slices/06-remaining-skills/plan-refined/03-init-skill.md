# Phase 3: init Skill

Build the `/gp:init` skill as a lightweight orchestrator that auto-detects mode (onboard existing repo vs new project). Replaces onboard-repo and subsumes create-epic "Mode A" (new empty project).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `ls skills/init/` — directory does not exist
- [x] `ls agents/onboard-phase.md` — file does not exist
- [x] `ls tools/dogfood/test-init.ts` — file does not exist; replaces `test-onboard.ts` functionality

**After implementation** (should pass / show presence):
- [x] `ls skills/init/SKILL.md` — file exists
- [x] `ls agents/onboard-phase.md` — file exists
- [ ] `bun tools/dogfood/test-init.ts` — init detects empty repo (new project) and repo with source (onboard) correctly

### Tasks

- [x] Create `skills/init/SKILL.md` as a lightweight orchestrator:
  1. **Re-entry handling**: Check if `.goodplan/` already exists and is initialized (via `gp status --json`). If already initialized, report current state and offer to re-run onboarding or skip. Do not overwrite existing state without confirmation.
  2. **Auto-detection**: Check for source code files (`src/`, `lib/`, `app/`, `*.ts`, `*.py`, `*.js`, `*.go`, `*.rs`, `*.java` at root or one level deep). Explicitly exclude `.goodplan/` from the scan to avoid false positives on managed state files. If source found → onboard mode. If empty → new project mode. Override: argument `--mode new` or `--mode onboard`. Note: `--mode` is parsed from the user's invocation text (e.g., `/gp:init --mode new`), not from formal CLI flags — skills receive context from natural language.
  3. **Error handling**: If any CLI command fails (`gp init`, `gp status`), report the error with a helpful message and stop gracefully. Do not leave partial state.
  5. **New project path** (inline in orchestrator):
     - Ask user for project name and brief description via AskUserQuestion
     - Run `gp init --name <name> --json`
     - Write `.goodplan/idea.md` from user's description
     - Present: "Project initialized. Next: `/gp:create-epic` to start building."
  6. **Onboard path** (delegated to agent):
     - Run `gp init --name <name> --json` first (needs project scaffolding before agent runs)
     - Spawn `onboard-phase` agent with repo root path, project name, and conventions context
     - Agent scans repo, extracts conventions, scaffolds architecture, populates `.goodplan/`
     - Present summary of what was detected and written
- [x] Frontmatter: `name: init`, `description:` must trigger for "init", "initialize", "onboard", "new repo", "set up project", "new project". Add `user-invocable: true`, `requires: gp >= 1.0.0`.
- [x] Create `agents/onboard-phase.md`:
  - Adapt content from `skills/onboard-repo/SKILL.md` (Steps 1-12: repo scanning, convention extraction, architecture scaffolding, subsystem detection, maturity assessment)
  - Agent has full tool access (Read, Grep, Glob, Write, WebSearch)
  - Writes conventions.md, architecture files, idea.md based on repo analysis
  - Returns structured JSON with summary of what was detected and written
  - Inject shared references: expertise-tracking, maturity-conventions, codebase-context-discovery
  - Keep under ~500 lines by moving stable reference content to shared files
- [x] Write `tools/dogfood/test-init.ts` to replace `test-onboard.ts` with equivalent functional coverage (not just discoverability). `test-onboard.ts` tests actual onboarding behavior with generated fixtures — `test-init.ts` must include these functional tests for both modes:
  - Test 1: Empty directory → new project mode → project initialized
  - Test 2: Directory with TypeScript source files → onboard mode → conventions and architecture extracted
  - Test 3: Override with `--mode new` on a repo with source → forces new project mode
  - Test 4: Invoke on an already-initialized project → detects existing state, does not overwrite
  - Test error path: invoke with missing permissions or broken CLI, verify graceful error message
  - Verify via `gp status --json` that project is initialized

### Verification

- `bun tools/dogfood/test-init.ts` passes for both modes
- onboard-phase agent body stays under ~500 lines
- Auto-detection correctly differentiates empty vs populated repos
