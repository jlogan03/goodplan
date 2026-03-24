# Codebase Context — Dogfood Harness

## Fresh Documentation
- `.project/conventions.md` — tech stack (TypeScript, Bun, citty, Zod 4, Vitest), repo structure, code style
- `.project/architecture/_overview.md` — 4-layer system architecture, subsystem maturity
- `.project/architecture/flows.md` — key workflows and state transition patterns
- `.project/architecture/transition-tables.md` — complete state transition spec
- `.project/quests/dogfood-harness/research/agent-sdk-harness.md` — Agent SDK v0.2.81 research: query(), canUseTool, message types, settingSources, bypassPermissions

## Active Epic Architecture
- Active epic: `__active__skills-cli-integration`
- Epic architecture at `.project/epics/__active__skills-cli-integration/architecture/`
- Includes CLI changes, interaction conventions, context API

## Existing Harness Code
- `tools/dogfood/harness.ts` — 449 lines, draft implementation with:
  - Phase 2 fully wired (explore → architecture → refine-architecture → slices → activate → slice cycles → epic complete)
  - Phase 3 and 4 are stubs ("not yet implemented")
  - Uses `bypassPermissions` + system prompt append (no `canUseTool` yet)
  - No `model` option (uses default model, not Haiku)
  - No `reset` command
  - Logs hardcoded to `.project/epics/__active__skills-cli-integration/slices/06-dogfooding/` (fragile path)

## Key Conventions
- `execFileSync` (not `execSync`) for CLI calls
- TypeScript strict mode: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- Bun as runtime and package manager
- No empty catch blocks; structured error handling

## Development Activity
- Recent commits focused on dogfooding slice (06-dogfooding)
- Plan was created alongside the harness draft
- Agent SDK research is comprehensive and current
