# CLI Framework Research for Bun-Compiled TypeScript CLI

## Context

Building `goodplan` CLI with noun-verb subcommands (`goodplan epic list|show|create|...`), global flags (`--json`, `--query`, `--depth`, `--quiet`), per-command flags, stdin piping, and colored human-friendly output. Compiled to standalone binary via `bun build --compile`.

---

## 1. CLI Framework Options

### Commander.js

- **Size**: ~7 kB min+gzip, zero dependencies
- **Downloads**: ~182M/week -- the dominant CLI library
- **Maintenance**: Active, v14.0.3 (Feb 2026)
- **Bun compile**: Works. Pure JS, no native deps. Widely tested with Bun.
- **Nested subcommands**: Supported via `.command().command()` chaining. The noun-verb pattern (`epic list`, `slice create`) maps cleanly -- create a parent command per noun, attach verb actions.
- **Global flags**: Parent command options propagate to subcommands via `opts()` on parent. Requires manual wiring -- call `program.opts()` from within subcommand handlers.
- **Help generation**: Good automatic help. Customizable with `.addHelpText()`. Shows options, arguments, and subcommand list.
- **TypeScript**: Types included. Not deeply typed (options come back as `Record<string, any>` unless you cast).
- **Stdin**: No built-in support; use `process.stdin` manually.
- **Verdict**: Proven, huge ecosystem, easy to learn. Slightly verbose for our noun-verb pattern but workable. Type safety is bolted on, not native.

### CAC (Command And Conquer)

- **Size**: ~5 kB min+gzip, zero dependencies
- **Downloads**: ~12M/week (used by Vite, Vitest)
- **Maintenance**: Stable but low activity. v6.7.14, last meaningful update 2023.
- **Bun compile**: Works. Pure JS, no native deps.
- **Nested subcommands**: Flat command model only. No built-in nesting -- `cac.command('epic list')` treats the whole string as the command name. Would require manual dispatch for the noun-verb pattern.
- **Global flags**: `.option()` on the cac instance applies globally. Clean separation.
- **Help generation**: Auto-generated, basic but functional.
- **TypeScript**: Written in TypeScript. Decent inference.
- **Verdict**: Excellent for flat CLIs. The lack of nested subcommand support is a dealbreaker for our noun-verb pattern unless we build our own dispatch layer on top.

### Citty (unjs)

- **Size**: ~3 kB min+gzip, zero dependencies
- **Downloads**: ~7M/week (used by Nuxi/Nitro ecosystem)
- **Maintenance**: Active, v0.2.1 (Mar 2026). Part of UnJS ecosystem.
- **Bun compile**: Works. Runtime-agnostic design (Node, Deno, Bun).
- **Nested subcommands**: Supported via `subCommands` map. Clean noun-verb mapping.
- **Global flags**: Defined on parent command, available in subcommand context.
- **Help generation**: Auto-generated, minimal but clean.
- **TypeScript**: Written in TypeScript. Type-safe args with inference.
- **Verdict**: Modern, tiny, good TypeScript DX. Still v0.x but backed by UnJS (Nuxt team). Strong candidate. API is declarative (object-based) rather than builder-pattern.

### Clipanion

- **Size**: ~15 kB min+gzip, zero dependencies
- **Downloads**: ~5M/week (powers Yarn Berry)
- **Maintenance**: Active, maintained by Yarn team.
- **Bun compile**: Should work (pure JS). Uses TypeScript decorators for command definition which requires `experimentalDecorators`.
- **Nested subcommands**: First-class. Commands are classes with `paths` arrays -- `static paths = [['epic', 'list']]`. The noun-verb pattern is a natural fit.
- **Global flags**: Via base command class inheritance.
- **Help generation**: Good, automatic.
- **TypeScript**: Excellent -- class-based with decorators. Very type-safe.
- **Verdict**: Powerful, well-designed. The decorator/class pattern adds ceremony. Heavier than citty/cac. The Yarn pedigree is confidence-inspiring but the API style may be over-engineered for our needs.

### Gunshi

- **Size**: Small (comparable to citty)
- **Downloads**: New, low adoption
- **Maintenance**: Active development, 2025-2026.
- **Bun compile**: Works. Designed for Node/Deno/Bun.
- **Nested subcommands**: Composable sub-commands with lazy loading.
- **Global flags**: Supported via context sharing.
- **TypeScript**: Type-safe API with full inference.
- **Verdict**: Promising newcomer with modern design. Very low adoption -- risk of abandonment. Not enough production track record yet.

### Oclif

- **Size**: Large (~200+ kB with @oclif/core). Many transitive dependencies.
- **Downloads**: ~2M/week
- **Maintenance**: Active, backed by Salesforce.
- **Bun compile**: Partial. Bun supported as dev runtime, but oclif's plugin system and dynamic loading may conflict with `bun build --compile` bundling. Not a natural fit for single-binary distribution.
- **Nested subcommands**: Topic-based hierarchy. Good for noun-verb.
- **Help generation**: Excellent, best in class. Auto-generated man pages.
- **Verdict**: Over-engineered for our use case. The plugin system, code generation, and heavy dependency tree work against single-binary compilation. Designed for large enterprise CLIs like Heroku/Salesforce.

### Yargs

- **Size**: ~34 kB gzip, several dependencies (cliui, string-width, etc.)
- **Downloads**: ~90M/week
- **Maintenance**: Active.
- **Bun compile**: Works but requires care -- dynamic `require()` patterns can break bundling. Tigris Data documented workarounds (static imports, inlined command specs).
- **Nested subcommands**: `.command('epic', ..., (yargs) => yargs.command('list', ...))`. Verbose but works.
- **Global flags**: Via `.global()` method or middleware.
- **Help generation**: Excellent, comprehensive.
- **Verdict**: Battle-tested but heavy. The dependency chain (string-width, strip-ansi, etc.) adds complexity. Dynamic patterns require workarounds for Bun compilation.

### Crust

- **Size**: Small (alpha)
- **Downloads**: Very low, alpha stage (v0.0.x)
- **Maintenance**: New project, 2026.
- **Bun compile**: Bun-native, designed specifically for it.
- **Verdict**: Too immature. Alpha quality, 187 GitHub stars. Interesting to watch but not production-ready.

---

## 2. Framework-less (process.argv)

**What you get for free**: Zero dependencies, smallest binary, full control, no framework churn risk.

**What you'd need to build**:
- Argv tokenizer (split flags, positional args, `--` separator)
- Subcommand dispatch (noun-verb routing)
- Flag parsing (boolean, string, array flags; `--flag=value` and `--flag value`)
- Help text generation (formatted, per-command)
- Validation and error messages
- `--` to separate flags from positional args

**Effort estimate**: ~300-500 lines for a solid parser + dispatcher. Not trivial but not huge.

**Assessment**: Viable if we want maximum control and smallest binary. The risk is subtle bugs in flag parsing edge cases (negation, repeated flags, `=` syntax). The main benefit of a framework is that these edge cases are already handled. For our command surface (~30 commands), hand-rolling the dispatcher is reasonable but the flag parsing is where bugs hide.

**Recommendation**: Use a minimal framework (citty or commander) rather than going fully frameworkless. The parsing is the hard part, not the dispatch.

---

## 3. Colored Output Libraries

| Library | Size (min+gzip) | Deps | Bun | Notes |
|---|---|---|---|---|
| **picocolors** | ~0.4 kB | 0 | Yes | Fastest for single styles. No chaining. Used by PostCSS, Vite. |
| **ansis** | ~1.5 kB | 0 | Yes | Chaining, 256-color, truecolor. Handles multi-line correctly. |
| **kleur** | ~1 kB | 0 | Yes | Chaining API. Middle ground. |
| **chalk** | ~5 kB | 0 (v5+) | Yes | Feature-rich, large community. Overkill for basic coloring. |

**Recommendation**: **picocolors** for minimal needs (bold, dim, red, green, yellow, cyan -- sufficient for CLI status output). If we need chained styles (e.g., `bold.red.bgWhite`), use **ansis** instead -- it's still tiny and explicitly Bun-compatible.

---

## 4. Table / Formatted Output Libraries

| Library | Size | Deps | Notes |
|---|---|---|---|
| **cli-table3** | ~10 kB | 1 (string-width) | Unicode borders, col/row spans. Mature. |
| **console-table-printer** | ~15 kB | minimal | Color support built in. Bun install supported. |
| **columnify** | ~5 kB | 2 | Simple columnar output. No borders. |
| **text-table** | ~1 kB | 0 | Minimal aligned text. No colors/borders. |

**Recommendation**: For `--json` mode we just `JSON.stringify`. For human mode, **cli-table3** is the safe choice for bordered tables. But consider whether we even need a table library -- simple `padEnd()`-aligned columns with picocolors may suffice and avoid the dependency entirely. Start with hand-rolled columnar output; add cli-table3 only if we need borders or wrapping.

---

## 5. Ranking for Our Use Case

Requirements weighted: Bun compile compatibility, noun-verb subcommands, small size, TypeScript DX, maintenance health.

| Rank | Framework | Why |
|---|---|---|
| 1 | **citty** | Tiny, TypeScript-native, declarative subcommands, Bun-tested, active UnJS maintenance. The v0.x status is the only concern -- but UnJS has strong track record of maintaining infra libs. |
| 2 | **commander** | Proven, zero-dep, huge ecosystem. Slightly verbose for noun-verb but well-documented patterns exist. Less TypeScript-native than citty. |
| 3 | **clipanion** | Best subcommand model for noun-verb. Class/decorator pattern adds ceremony. Heavier than needed. |
| 4 | **cac** | Great for flat CLIs but lacks nested subcommand support. Would need custom dispatch. |
| 5 | **framework-less** | Maximum control but re-inventing flag parsing is a bug magnet. |

---

## 6. Recommended Stack

| Concern | Choice | Rationale |
|---|---|---|
| **Arg parsing + subcommands** | **citty** (primary) or **commander** (fallback) | citty: smallest, best TS DX, Bun-native. Commander if citty's v0.x status is a concern. |
| **Colors** | **picocolors** | 0.4 kB, zero deps, covers our needs (status colors, emphasis). |
| **Table output** | **Hand-rolled** (start), cli-table3 (if needed) | `padEnd()` alignment + picocolors is enough for `list` output. Add cli-table3 only for complex tables. |
| **JSON output** | `JSON.stringify(data, null, 2)` | Built-in, no dependency needed. |
| **Stdin reading** | `Bun.stdin` / `process.stdin` | Built-in, no dependency needed. |

### Total added dependency weight: ~3.5 kB (citty + picocolors)

---

## 7. Open Questions

1. **citty v0.x stability**: Should we pin to a specific version and vendor it, or trust UnJS semver?
2. **Commander as safer bet**: Is the slightly worse DX worth the stability of a v14.x library?
3. **Global flag propagation**: Need to prototype how citty handles `--json` and `--quiet` flowing into subcommand handlers -- is it automatic or manual?
4. **Help customization**: Can citty's help output be customized enough for our needs, or will we need to override it?

---

## Sources

- [Building CLI apps with TypeScript in 2026](https://hackers.pub/@hongminhee/2026/typescript-cli-2026)
- [My JS CLI Stack 2025](https://ryoppippi.com/blog/2025-08-12-my-js-cli-stack-2025-en)
- [How to Build CLI Applications with Bun](https://oneuptime.com/blog/post/2026-01-31-bun-cli-applications/view)
- [Bun Single-file Executables](https://bun.com/docs/bundler/executables)
- [From npm to a Single Binary: Tigris CLI](https://www.tigrisdata.com/blog/using-bun-and-benchmark/)
- [Commander.js Nested Subcommands](https://maxschmitt.me/posts/nested-subcommands-commander-node-js)
- [citty GitHub](https://github.com/unjs/citty)
- [Clipanion GitHub](https://github.com/arcanis/clipanion)
- [CAC GitHub](https://github.com/cacjs/cac)
- [Gunshi](https://gunshi.dev/)
- [CrustJS](https://crustjs.com/)
- [Ansis - ANSI color library](https://github.com/webdiscus/ansis)
- [Picocolors GitHub](https://github.com/alexeyraspopov/picocolors)
- [Comparison of terminal color libraries](https://dev.to/webdiscus/comparison-of-nodejs-libraries-to-colorize-text-in-terminal-4j3a)
- [cli-table3 npm](https://www.npmjs.com/package/cli-table3)
- [console-table-printer](https://console-table.netlify.app/)
- [Show HN: Crust - CLI framework for Bun](https://news.ycombinator.com/item?id=47408727)
