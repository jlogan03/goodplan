# Fix HOME leakage in dogfood harness — ~/.claude/CLAUDE.md bleeds into test sessions

## Problem

The dogfood test harness forwards `HOME` as-is in `createTestEnv()`. When the Agent SDK runs with `preset: "claude_code"`, it loads `~/.claude/CLAUDE.md` (the user's global instructions) into every skill session.

This means:
- Test results are influenced by the user's personal CLAUDE.md content (communication style, TypeScript preferences, tool usage patterns, etc.)
- Results are **not reproducible** for someone with different or no global CLAUDE.md
- The test doesn't reflect what a fresh user would experience with the plugin

Discovered during E2E validation run (2026-04-13).

## What Leaks

The user's `~/.claude/CLAUDE.md` contains:
- Communication style instructions ("Be extremely concise")
- TypeScript strictness rules (noUncheckedIndexedAccess, etc.)
- Anti-pattern lists (no `as any`, no empty catch)
- Push notification configuration
- Expertise declarations

All of these could change LLM behavior in non-obvious ways during the test.

## What's Already Isolated (working correctly)

- `settingSources: []` — prevents loading `~/.claude/settings.json` ✓
- `plugins: [{ type: "local", path: PLUGIN_DIR }]` — only test plugin loaded ✓
- PATH filtered to remove `~/.claude/plugins/` — no installed plugin binaries ✓
- `cwd` is `/tmp/gp-flashcard-...` — won't walk up to find repo CLAUDE.md ✓
- Fixture CLAUDE.md created by init skill — expected and correct ✓

## Fix Options

### Option A: Override HOME to a temp dir (strongest isolation)

In `createTestEnv()`, set HOME to a temp directory:
```typescript
const fakeHome = join(tmpdir(), `gp-test-home-${Date.now()}`);
mkdirSync(join(fakeHome, ".claude"), { recursive: true });
return {
  PATH: testPath,
  HOME: fakeHome,
  USER: user,
  ...overrides,
};
```

**Pros:** Complete isolation — no global config of any kind leaks.
**Cons:** May break things that depend on real HOME (git config, SSH keys for ContentRef blob operations). Need to copy minimal git config.

### Option B: Create empty ~/.claude/ in fake HOME

Same as A, but pre-populate with minimal required config:
```typescript
const fakeHome = join(tmpdir(), `gp-test-home-${Date.now()}`);
mkdirSync(join(fakeHome, ".claude"), { recursive: true });
// Copy git config so git operations work
const gitConfig = join(home, ".gitconfig");
if (existsSync(gitConfig)) {
  cpSync(gitConfig, join(fakeHome, ".gitconfig"));
}
```

### Option C: SDK-level CLAUDE.md suppression (if supported)

Check if the Agent SDK has an option to skip CLAUDE.md loading. If `settingSources: []` doesn't cover it, there may be another option like `claudeMdSources: []` or `skipClaudeMd: true`.

## Recommended Approach

Option B — fake HOME with minimal git config. This gives full isolation while keeping git operations functional (needed for ContentRef blob hashing).

## Files to Change

- `tools/dogfood/utils.ts` — `createTestEnv()` function
- Potentially `tools/dogfood/validate-consolidated.ts` — if any setup assumes real HOME
- Update `tools/dogfood/CLAUDE.md` to document the isolation model
