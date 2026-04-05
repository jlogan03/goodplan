# Rust Review Criteria

Domain-specific evaluation criteria for the Rust reviewer. Evaluates Rust-specific technical soundness: ownership, error handling, unsafe usage, Cargo patterns, and trait design. Does NOT evaluate general plan structure (the holistic reviewer handles that) or non-Rust concerns.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- `Cargo.toml` and `Cargo.lock` — workspace structure, dependency versions, features
- `unsafe` blocks — justification comments, soundness reasoning
- Error types — custom error enums, `thiserror`/`anyhow` usage
- Trait definitions — public API surfaces, trait objects vs generics
- Module structure — `mod.rs` vs file-based modules, visibility (`pub`, `pub(crate)`)
- `clippy.toml` and `rustfmt.toml` — lint and format configuration
- Test organization — unit tests in modules, integration tests in `tests/`

## Evaluation Criteria

1. **Ownership and borrowing**: Are ownership patterns correct and efficient?
   - No unnecessary cloning — borrow where possible
   - Lifetimes explicit only when needed (elision preferred)
   - `Cow<'_, T>` used for conditional ownership
   - Move semantics understood and leveraged
   - No dangling references or use-after-move patterns in the design

2. **Error handling**: Is error handling robust and ergonomic?
   - `Result<T, E>` used for fallible operations (not panics)
   - Custom error types with `thiserror` for libraries, `anyhow` for applications
   - Error context added at each level (`with_context`, `map_err`)
   - `unwrap()`/`expect()` only in tests or with documented invariants
   - `?` operator used for propagation, not manual matching

3. **Unsafe usage**: Are unsafe blocks minimal and justified?
   - Each `unsafe` block has a `// SAFETY:` comment explaining the invariant
   - Unsafe abstracted behind safe interfaces
   - No undefined behavior (aliased mutable references, invalid values, data races)
   - FFI boundaries properly wrapped with safe Rust types
   - Unsafe code isolated in dedicated modules

4. **Cargo and dependency management**: Is the project structure sound?
   - Workspace structure for multi-crate projects
   - Features used for conditional compilation (not cfg hacks)
   - Dependency versions appropriate (exact for binaries, semver for libraries)
   - No unnecessary dependencies — standard library preferred
   - Build scripts (`build.rs`) minimal and well-documented

5. **Trait design**: Are abstractions well-designed?
   - Traits represent coherent behaviors (not grab-bags)
   - Generic bounds minimal and precise (`where` clauses over inline bounds for readability)
   - Associated types preferred over generic parameters when there's one natural choice
   - Blanket implementations justified and documented
   - Object safety considered when trait objects are needed

6. **Concurrency**: Are concurrent patterns safe?
   - `Send` and `Sync` bounds correct
   - No data races (enforced by type system, but verify in unsafe code)
   - Lock ordering documented to prevent deadlocks
   - `Arc<Mutex<T>>` vs channels — appropriate choice for the use case
   - Async runtimes (tokio, async-std) used consistently

## Scoring Guidelines

- Score 9-10: Zero unnecessary unsafe, robust error handling, idiomatic ownership patterns
- Score 7-8: Sound ownership, minor error handling gaps, well-structured Cargo project
- Score 5-6: Some ownership confusion, inconsistent error handling, cargo structure issues
- Score 3-4: Ownership anti-patterns, excessive unsafe, poor error handling
- Score 1-2: Fundamentally unsound ownership or pervasive unsafe without justification
