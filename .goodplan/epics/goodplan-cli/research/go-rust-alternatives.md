# Go, Rust, and Other Non-Node Languages for the goodplan CLI

**Date**: 2026-03-20
**Status**: Research complete
**Goal**: Evaluate whether Go, Rust, or another compiled language would be better than TypeScript/Bun for the goodplan CLI binary, considering binary size, startup time, JSON handling, cross-compilation, and developer experience.
**Related**: [small-binary-alternatives.md](small-binary-alternatives.md) covers TypeScript-preserving approaches (QuickJS, txiki.js, etc.)

---

## Requirements Recap

The goodplan CLI needs to:
- Read/write JSON and JSONL files in `.project/`
- Validate state transitions (file-existence state machine)
- Bundle context from multiple files with progressive disclosure
- Support jq-style queries on JSON output
- Provide colored, human-readable terminal output
- Accept content via stdin (heredoc piping)
- Cross-compile for macOS (arm64, x64), Linux (x64), Windows (x64)
- Start up in <10 ms
- Be as small as possible (Bun baseline: 57 MB)

---

## Real-World CLI Binary Sizes (Reference)

Measured locally on macOS arm64 (Homebrew installs) and from release page data:

| Tool | Language | Binary Size | Notes |
|---|---|---|---|
| `gh` (GitHub CLI) | Go | **34 MB** | Large Go binary; many features, extensive API surface |
| `rg` (ripgrep) | Rust | **5.9 MB** | Complex regex engine + file traversal |
| `fd` | Rust | ~3.5 MB | Simpler than rg |
| `fzf` | Go | ~3.5 MB | Focused, single-purpose |
| `jq` | C | **1.4 MB** | Minimal, hand-written parser |
| `delta` (git-delta) | Rust | ~6 MB | Syntax highlighting, terminal rendering |
| `bat` | Rust | ~5.5 MB | Syntax highlighting, paging |
| `exa`/`eza` | Rust | ~1.5 MB | ls replacement |
| Bun (goodplan baseline) | Zig/C++ (runtime) | **57 MB** | Entire JS engine bundled |

**Takeaway**: Go CLIs range from 3-34 MB depending on complexity. Rust CLIs range from 1.5-6 MB. A goodplan-complexity CLI (JSON, file I/O, colored output, jq queries) would likely land at **8-15 MB in Go** or **3-6 MB in Rust** -- a 4-19x improvement over Bun.

---

## Go

### Binary Size

- Hello world: ~2 MB
- With Cobra (CLI framework): ~4-5 MB
- Real-world CLI with JSON, HTTP, terminal colors: 8-15 MB
- Stripped (`go build -ldflags="-s -w"`): reduces by ~25%
- UPX compression: can halve the result, but adds decompression startup time
- **Estimated for goodplan**: 8-12 MB stripped

### Startup Time

- Benchmarked at ~0.4-0.9 ms for trivial programs
- Real CLIs with initialization: 1-5 ms
- Well within our <10 ms requirement

### JSON Handling

- `encoding/json` (stdlib): solid, well-understood, handles all our needs
- Struct tags for mapping: `json:"fieldName,omitempty"` -- clean, declarative
- JSONL: trivially handled with `bufio.Scanner` + `json.Decoder`
- No generics-based JSON until recently; Go 1.24+ has improved type inference
- **Compared to TypeScript**: More verbose (explicit struct definitions), but type-safe. No equivalent of Zod for runtime validation -- you write validation functions manually or use struct tags with a validator library.

### jq-Style Queries: gojq

- [gojq](https://github.com/itchyny/gojq): Pure Go implementation of jq, embeddable as a library
- Performance comparable to C jq after stack-machine rewrite + tail call optimization
- `range(10000)` executes in <0.2s
- Supports arbitrary-precision integers (better than jq)
- **Can embed directly** -- no subprocess, no C dependency
- Minor limitation: does not preserve object key order (fine for our use case since we control key ordering in our JSON output)

### CLI Framework: Cobra

- De facto standard for Go CLIs (used by `gh`, `kubectl`, Docker CLI, Hugo, etc.)
- Subcommands, flags, completions, help generation
- ~4-5 MB binary overhead for a basic Cobra app
- Lighter alternative: `urfave/cli` or stdlib `flag` for simpler needs

### Terminal Output: Charm Libraries

- [lipgloss](https://github.com/charmbracelet/lipgloss): CSS-like styling for terminal output (colors, borders, padding)
- [bubbletea](https://github.com/charmbracelet/bubbletea): Full TUI framework (Elm Architecture)
- For goodplan, lipgloss alone covers colored output needs without bubbletea's weight
- Alternative: `fatih/color` for simpler ANSI color needs

### Stdin / Heredoc Handling

- `os.Stdin` + `bufio.Scanner` or `io.ReadAll` -- straightforward
- Pipe detection: `os.Stdin.Stat()` to check if stdin is a pipe or terminal
- No issues with heredoc input

### Cross-Compilation

- **Gold standard.** Single command, no external tools:
  ```
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build
  CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build
  CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build
  ```
- No Docker, no C toolchain, no special setup
- Works perfectly as long as you avoid CGO (our case: pure Go, no C deps)
- gojq is pure Go, lipgloss is pure Go -- no CGO needed

### File Embedding

- `//go:embed` directive bundles files into the binary at compile time
- Useful for: prompt templates, default configs, schema definitions
- Virtual filesystem API (`embed.FS`) integrates with stdlib

### Developer Experience (from TypeScript)

- **Easier than Rust**: Go is explicitly designed for simplicity. 25 keywords vs TypeScript's 60+.
- **Conceptual shifts**: package-based organization (capitalized = exported), no classes, interfaces are implicit (structural typing), error handling via return values (no try/catch)
- **Familiar aspects**: structural typing, garbage collection, first-class functions, closures
- **Go's type system is simpler**: no union types, no generics until recently (and limited). This means less expressive types but simpler code.
- **Tooling**: `go fmt`, `go vet`, `go test` -- all built-in. No eslint/prettier/jest to configure.
- **Learning curve**: 1-2 weeks to be productive for a TypeScript developer. The language is intentionally small.
- **Microsoft chose Go** for the TypeScript compiler rewrite (tsgo), specifically citing Go's simplicity, fast compilation, and excellent cross-compilation.

### Go Summary

| Dimension | Rating | Notes |
|---|---|---|
| Binary size | Good (8-12 MB) | 5-7x smaller than Bun |
| Startup time | Excellent (<5 ms) | |
| JSON handling | Good | Verbose but correct; gojq for queries |
| Cross-compilation | Excellent | Best-in-class, zero setup |
| Terminal output | Excellent | Charm ecosystem is best-in-class |
| Developer experience | Good | Simple language, fast iteration |
| Learning curve | Low-Medium | 1-2 weeks from TypeScript |

---

## Rust

### Binary Size

- Hello world (release, stripped): ~300 KB - 1 MB
- With clap + serde: ~2-3 MB
- Real-world CLI with JSON, file I/O, colored output: 3-6 MB
- Optimization flags (`opt-level = "z"`, `lto = true`, `strip = true`, `panic = "abort"`): reduces by 25-43%
- **Estimated for goodplan**: 3-5 MB stripped and optimized

### Startup Time

- Benchmarked at ~0.5-0.7 ms for trivial programs
- Real CLIs: 1-3 ms
- Well within <10 ms requirement

### JSON Handling: serde

- [serde](https://serde.rs) + serde_json: the gold standard for JSON in any language
- Zero-copy deserialization available for performance-critical paths
- Derive macros for struct serialization: `#[derive(Serialize, Deserialize)]`
- JSONL: trivially handled with `BufReader::lines()` + `serde_json::from_str`
- **Compared to TypeScript**: More verbose struct definitions, but compile-time guaranteed correctness. Serde is arguably better than Zod -- it catches errors at compile time rather than runtime.

### jq-Style Queries: jaq

- [jaq](https://github.com/01mf02/jaq): Pure Rust jq clone, embeddable as a library
- **Fastest jq implementation**: faster than both C jq and gojq on 23/29 benchmarks
- Thread-safe, supports arbitrary data types beyond JSON
- Can be embedded via `jaq-core` crate
- Alternative: `jq-rs` (FFI wrapper around C jq -- adds C dependency, not ideal)

### CLI Framework: clap

- [clap](https://docs.rs/clap): derive-macro based argument parsing
- Subcommands, flags, completions, help generation
- Type-safe: invalid argument combinations caught at compile time
- Widely used (ripgrep, fd, bat, delta, etc.)

### Terminal Output

- `colored` crate: simple ANSI color output
- `termcolor`: cross-platform terminal colors
- `ratatui`: full TUI framework (if needed later)
- `indicatif`: progress bars and spinners
- No single dominant ecosystem like Go's Charm, but individual crates are solid

### Stdin / Heredoc Handling

- `std::io::stdin()` + `BufRead` trait -- clean, composable
- `atty` or `is-terminal` crate for pipe detection
- No issues with heredoc input

### Cross-Compilation

- **More complex than Go, but workable:**
  - `rustup target add` for adding target triples
  - [cross](https://github.com/cross-rs/cross): Docker-based cross-compilation tool
  - Pure-Rust dependencies (no C deps) simplify things significantly
  - **macOS targets from Linux**: requires macOS SDK packaging due to Apple licensing (osxcross)
  - **Linux/Windows from macOS**: works well with cross or manual target setup
- CI-based cross-compilation (GitHub Actions matrix) is the standard approach
- **Compared to Go**: significantly more friction. Go's cross-compilation is a single env var; Rust requires toolchain setup, Docker images, or CI matrix builds.

### Developer Experience (from TypeScript)

- **Steep learning curve**: ownership, borrowing, lifetimes are fundamentally new concepts
- **Learning curve**: 1-3 months to be comfortable. Expect to "fight the borrow checker" initially.
- **Payoff**: once past the learning curve, the compiler catches entire classes of bugs at compile time
- **Familiar aspects**: pattern matching (like TS discriminated unions), traits (like interfaces), generics, closures, iterators
- **Unfamiliar**: no garbage collection, explicit memory management, lifetime annotations, macro system
- **Compile times**: significantly slower than Go. A clean build of a CLI with clap + serde + jaq might take 30-60 seconds. Incremental builds are faster (5-15 seconds).
- **Ecosystem**: crates.io has excellent libraries, but dependency management can be complex

### Rust Summary

| Dimension | Rating | Notes |
|---|---|---|
| Binary size | Excellent (3-5 MB) | 11-19x smaller than Bun |
| Startup time | Excellent (<3 ms) | |
| JSON handling | Excellent | serde is best-in-class; jaq for queries |
| Cross-compilation | Adequate | Works but more friction than Go |
| Terminal output | Good | Good crates but no unified ecosystem |
| Developer experience | Mixed | Powerful but slow iteration, long compile |
| Learning curve | High | 1-3 months from TypeScript |

---

## Dark Horses: Zig, Nim, Crystal

### Zig

| Dimension | Assessment |
|---|---|
| Binary size | **Excellent**: ~2-300 KB for hello world. A CLI tool could be 1-3 MB. |
| Startup | Sub-millisecond |
| JSON | `std.json` in stdlib, but less ergonomic than serde or encoding/json |
| jq library | None. Would need to implement or embed C jq. |
| CLI framework | No mature CLI framework. Manual argument parsing. |
| Cross-compilation | Excellent (Zig is also used as a C/C++ cross-compiler) |
| Terminal colors | Manual ANSI codes; no rich library ecosystem |
| Maturity | Pre-1.0. Language and stdlib are still changing. |
| Learning curve | High. Manual memory management, comptime metaprogramming. |

**Verdict**: Produces the tiniest binaries but the ecosystem is too immature. No jq library, no CLI framework, no terminal styling library. You'd be writing everything from scratch. Not practical for a project tool.

### Nim

| Dimension | Assessment |
|---|---|
| Binary size | Good: ~200 KB - 2 MB depending on features |
| Startup | Sub-millisecond |
| JSON | `json` module in stdlib; adequate |
| jq library | None mature |
| CLI framework | `cligen` -- automatic CLI from function signatures. Clever. |
| Cross-compilation | Works but requires per-target C compiler setup |
| Maturity | 2.0 released, stable, but very small community |
| Learning curve | Low-Medium (Python-like syntax compiling to C) |

**Verdict**: Interesting language with Python-like ergonomics and small binaries. However, tiny community means fewer libraries, less ecosystem support, and harder to find contributors. `cligen` is clever but niche.

### Crystal

| Dimension | Assessment |
|---|---|
| Binary size | Moderate: 3-8 MB (statically linked with LLVM) |
| Startup | Fast |
| JSON | `JSON.mapping` -- similar to serde derive macros |
| jq library | None |
| CLI framework | `commander`, `clim` -- adequate |
| Cross-compilation | Limited. Requires LLVM target setup. macOS-to-Linux is painful. |
| Maturity | 1.x, stable, but small community |
| Learning curve | Low (Ruby-like syntax, type inference) |

**Verdict**: Ruby-like ergonomics with compiled performance. Cross-compilation story is weak. Small community.

### Dark Horse Summary

None of these are practical choices for goodplan. The ecosystems are too thin -- you'd spend more time building infrastructure (jq implementation, CLI frameworks, terminal rendering) than building the actual tool. Go and Rust have mature ecosystems that cover all our requirements out of the box.

---

## The Tradeoff: What Do We Lose by Leaving TypeScript?

### What we lose

1. **Shared types with skills**: The Claude Code skills are TypeScript/prompt hybrids. With a Go/Rust CLI, the skill prompts can still invoke the CLI, but there's no shared type system. The CLI's JSON schema becomes the contract instead of shared TypeScript interfaces.

2. **Development speed**: TypeScript iteration is faster. No compile step (Bun runs .ts directly), instant feedback, familiar patterns. Go is close; Rust is significantly slower due to compile times.

3. **npm ecosystem access**: Can't use `chalk`, `zod`, `inquirer`, `commander`, etc. Must use Go/Rust equivalents. The equivalents exist and are good, but it's a different ecosystem to learn.

4. **Contributor accessibility**: TypeScript developers are more numerous. A Go CLI narrows the contributor pool; Rust narrows it further.

5. **Prototyping speed**: TypeScript excels at rapid prototyping. Go is close. Rust requires more upfront design due to the type system's strictness.

### What we gain

1. **10-19x smaller binaries**: 3-12 MB vs 57 MB. This matters for distribution, download time, and perception.

2. **True single binary**: No runtime bundled. The binary IS the program.

3. **Predictable performance**: No JIT warmup, no GC pauses (Rust), consistent startup.

4. **Better CLI tooling ecosystem**: Go's Charm libraries and Cobra are purpose-built for CLIs. Rust's clap is extremely well-designed.

5. **Forced API discipline**: The CLI becomes a proper tool with a stable JSON interface. Skills communicate via structured output, not shared memory.

### Assessment

The shared-types concern is largely mitigated by the fact that skills already communicate with the CLI via its command-line interface and JSON output. There are no in-process function calls between skills and the CLI -- it's already an IPC boundary. A Go or Rust CLI with well-defined JSON schemas would work identically from the skills' perspective.

---

## Hybrid Approach: Go/Rust Core + TypeScript Shell

### Option A: TypeScript calls Go/Rust binary as subprocess

```
skill (prompt) -> CLI (TypeScript wrapper) -> goodplan-core (Go/Rust binary)
```

- TypeScript thin wrapper handles: argument parsing, environment setup
- Go/Rust binary handles: JSON manipulation, jq queries, state validation, context bundling
- Communication: JSON over stdout, or temp files

**Problems**:
- Two binaries to distribute (or embed the Go/Rust binary in the TS one -- negating size savings)
- Subprocess overhead per call (~5-10 ms)
- More complex build/release pipeline
- Worst of both worlds: still need Bun for the wrapper, still need Go/Rust toolchain

### Option B: Go/Rust library via FFI (Napi-RS, cgo)

- Write core logic in Rust, expose via napi-rs as a Node native addon
- Bundle with Bun

**Problems**:
- Bun still bundles its runtime (57 MB base)
- CGO/napi adds complexity
- Doesn't solve the binary size problem

### Option C: Go/Rust CLI with TypeScript as "business logic" scripts

- Go/Rust CLI is the distributed binary
- Skills remain as TypeScript/prompt files (they already are)
- No TypeScript in the CLI at all

**This is actually the cleanest architecture.** The CLI is a tool. Skills are prompts that invoke the tool. They don't need to share a language.

### Hybrid Verdict

The hybrid approach doesn't help. Either commit to Go/Rust for the CLI binary, or stay with TypeScript/Bun. Mixing adds complexity without solving the core problem.

---

## Recommendation

### Go is the sweet spot for this project.

| Factor | Go | Rust | Stay with Bun |
|---|---|---|---|
| Binary size | 8-12 MB | 3-5 MB | 57 MB |
| Startup time | <5 ms | <3 ms | <10 ms |
| Cross-compilation | Trivial | Requires tooling | Built-in |
| Learning curve | 1-2 weeks | 1-3 months | None |
| Development speed | Fast | Slower (compile times) | Fastest |
| jq support | gojq (excellent) | jaq (excellent) | citty + custom |
| CLI framework | Cobra (industry standard) | clap (excellent) | citty |
| Terminal styling | Charm/lipgloss (best-in-class) | Good crates | chalk |
| JSON handling | encoding/json (solid) | serde (best-in-class) | native |
| Contributor pool | Large | Medium | Largest |

**Why Go over Rust**:
- Cross-compilation is a single env var, not a Docker-based workflow
- 1-2 week learning curve vs 1-3 months
- Faster iteration (compile times are negligible)
- `gh` CLI proves Go handles complex CLI tools well at scale
- gojq embeds cleanly as a library
- Charm/lipgloss is the best terminal styling ecosystem in any language
- 8-12 MB is still a 5-7x improvement over 57 MB
- Microsoft chose Go for the TypeScript compiler rewrite (tsgo) for similar reasons

**Why Go over staying with Bun**:
- 5-7x smaller binaries (meaningful for distribution)
- Forced clean architecture (CLI as tool with JSON contract)
- Better CLI ecosystem (Cobra + lipgloss vs citty + chalk)
- Embedded jq via gojq (vs external dependency or custom implementation)

**When Rust would be the better choice**:
- If binary size must be under 5 MB (Rust: 3-5 MB vs Go: 8-12 MB)
- If the team already knows Rust
- If CPU-intensive processing is needed (not our case)

**When staying with Bun would be the better choice**:
- If development velocity is the overriding concern
- If the 57 MB binary size is acceptable
- If we want to maximize contributor accessibility

---

## If We Choose Go: Suggested Stack

| Concern | Library | Notes |
|---|---|---|
| CLI framework | [cobra](https://github.com/spf13/cobra) | Subcommands, flags, completions |
| jq queries | [gojq](https://github.com/itchyny/gojq) | Embeddable, pure Go |
| JSON | `encoding/json` (stdlib) | Or `json/v2` when stable |
| JSONL | `bufio.Scanner` + `json.Decoder` | Stdlib, trivial |
| Terminal colors | [lipgloss](https://github.com/charmbracelet/lipgloss) | CSS-like terminal styling |
| File embedding | `//go:embed` (stdlib) | Bundle templates/schemas |
| State validation | Custom | Simple file-existence checks + JSON schema |
| Testing | `testing` (stdlib) | Built-in, no framework needed |
| Build | `go build` | Cross-compile with GOOS/GOARCH |
| Release | [goreleaser](https://goreleaser.com/) | Automates cross-compilation + release artifacts |

### Estimated binary sizes

| Configuration | Size |
|---|---|
| Cobra + gojq + lipgloss + serde (baseline) | ~10-14 MB |
| With `-ldflags="-s -w"` (strip debug info) | ~8-10 MB |
| With UPX compression (optional) | ~4-5 MB |

---

## Sources

- [Cobra CLI framework](https://github.com/spf13/cobra)
- [gojq - Pure Go jq implementation](https://github.com/itchyny/gojq)
- [jaq - Rust jq clone](https://github.com/01mf02/jaq)
- [Charm lipgloss](https://github.com/charmbracelet/lipgloss)
- [Go embed directive](https://pkg.go.dev/embed)
- [Reducing Go binary size](https://oneuptime.com/blog/post/2026-01-07-go-reduce-binary-size/view)
- [Reducing Rust binary size by 43%](https://markaicode.com/binary-size-optimization-techniques/)
- [6 Proven Techniques to Reduce Rust Binary Size](https://elitedev.in/rust/6-proven-techniques-to-reduce-rust-binary-size/)
- [Rust vs Go comparison (JetBrains)](https://blog.jetbrains.com/rust/2025/06/12/rust-vs-go/)
- [TypeScript to Go: Why does it really matter?](https://dev.to/kresohr/typescript-to-go-why-does-it-really-matter-10da)
- [Go guide for JavaScript developers](https://prateeksurana.me/blog/guide-to-go-for-javascript-developers/)
- [Startup time benchmarks](https://github.com/bdrung/startup-time)
- [Rust cross-compilation guide](https://fpira.com/blog/2025/01/cross-compilation-in-rust)
- [Cross-compilation in Rust (2026)](https://oneuptime.com/blog/post/2026-03-02-how-to-cross-compile-rust-applications-on-ubuntu/view)
- [Rust CLI patterns with clap](https://dasroot.net/posts/2026/02/rust-cli-patterns-clap-cargo-configuration/)
- [Zig build optimizations](https://medium.com/@kaushalsinh73/5-zig-build-optimizations-for-tiny-fast-binaries-7fbf4dcb9079)
- [Bun single-file executables](https://bun.com/docs/bundler/executables)
- [Bun binary size issue](https://github.com/oven-sh/bun/issues/5854)
