# Friction Log — Dogfooding

| # | Phase | Skill/CLI | Issue | Severity | Status | Fix commit |
|---|-------|-----------|-------|----------|--------|------------|
| 1 | 1 | CLI: `init` | `goodplan init` fails with `STATE_ALREADY_INITIALIZED` if `.project/` dir exists but has no `project.json`. Writing `idea.md` before init creates `.project/` and blocks init. Workaround: write idea.md after init. | MINOR | Logged | — |
| 2 | 1 | CLI: `init` | `/usr/local/bin` requires sudo for symlink. Had to use `~/bin` instead. Not a goodplan issue but worth noting for convention doc. | MINOR | Logged | — |
| 3 | 1 | Skills | All skills hardcoded `~/.claude/skills/_shared/references/` as absolute paths. When installed in-project, these pointed to user-level (old) versions instead of in-project copies. Fixed: replaced all 121 occurrences with relative paths (`../_shared/references/` from SKILL.md, `../../_shared/references/` from references/*.md). | CRITICAL | Fixed | pending |
