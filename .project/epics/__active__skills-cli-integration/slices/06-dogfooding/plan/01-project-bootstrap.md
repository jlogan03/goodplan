# Phase 1: Project Bootstrap & First Epic Creation

Set up the nondet-eval repo, install CLI-integrated skills locally, initialize via goodplan CLI, and create the first epic — exercising empty-state entity creation.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls ~/Repos/nondet-eval` — directory does not exist
- [ ] `ls ~/Repos/nondet-eval/.claude/skills/` — does not exist

**After implementation** (should pass / show presence):
- [ ] `ls ~/Repos/nondet-eval/.project/` — contains `project.json` (CLI-managed state)
- [ ] `ls ~/Repos/nondet-eval/.claude/skills/` — contains all 15 skills from goodplan repo
- [ ] `cd ~/Repos/nondet-eval && goodplan status --json` — returns valid status with `activeEpic`
- [ ] `cd ~/Repos/nondet-eval && goodplan epic:show --epic initial --json` — returns epic details

### Tasks

- [ ] **Create repo**: `mkdir ~/Repos/nondet-eval && cd ~/Repos/nondet-eval && git init`
- [ ] **Initialize TypeScript project**: `bun init` or equivalent, set up `package.json` with TypeScript
- [ ] **Write `.project/idea.md`**: Paste the nondeterministic eval library idea (provided during planning)
- [ ] **Build goodplan binary**: In the goodplan repo, `bun run build`. Copy binary to a PATH-accessible location or use absolute path
- [ ] **Initialize goodplan**: `goodplan init --name nondet-eval --json`
- [ ] **Install skills in-project**: `cp -r ~/Repos/goodplan/skills/ ~/Repos/nondet-eval/.claude/skills/`
- [ ] **Set up CLAUDE.md**: Create initial CLAUDE.md pointing to `.project/idea.md` and conventions
- [ ] **Create first epic**: Run `/create-epic` skill in the nondet-eval repo — this creates `__active__initial/` with `goal.md` for "Core Provider & Basic Execution"
- [ ] **Verify CLI state**: `goodplan status --json` shows active epic, `goodplan epic:show --epic initial --json` returns correct details
- [ ] **Log friction**: Record any issues in friction-log.md

### Verification

1. `goodplan status --json` returns valid JSON with `activeEpic.name === "initial"`
2. Skills directory contains all expected skills
3. Git has initial commit with project structure
