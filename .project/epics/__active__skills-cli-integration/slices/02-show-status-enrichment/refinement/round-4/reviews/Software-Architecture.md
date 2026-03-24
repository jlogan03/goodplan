## Issues

**[IMPORTANT]** Phase 4 version stamping modifies state after `reduce()` but before `commitState()` — breaks the reducer-is-sole-state-mutator invariant (INV-001)

The plan specifies `stampVersionIfNeeded()` as a post-`reduce()` transformation applied in `begin()`, `submit()`, and `complete()` before `commitState()`. This means the RPC layer is mutating the state tree outside the state machine's `reduce()` function. While version stamping is framed as "RPC-layer policy," it modifies `project.json` content — the same entity JSON that INV-001 says must go through the state machine. The state machine would not be aware of the version field change, so `reduce()` output and what gets committed would diverge.

Two options: (a) Add a `STAMP_VERSION` event to the state machine so the version update flows through `reduce()` — this preserves INV-001 strictly but adds complexity. (b) Document this as an intentional INV-001 exception: version stamping is metadata maintenance, not a workflow state mutation, and the state machine does not need to validate it. The plan should be explicit about which approach it takes and why. Option (b) is pragmatic — version is not workflow state — but it should be called out as a conscious exception, not a silent violation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `paths` always populated vs type-level optional — document the design intent

The plan says `resolvePathReferences` "always returns an object (never `undefined`)" and "always include `paths` in results — no conditional spread needed." Yet the type addition is `paths?: PathReferences`. The research context notes the epic spec says "always included" with comment on `BeginResult`. The plan is internally consistent (populate always, type as optional for backward compat), but this intent should be documented in a JSDoc comment on the `paths?` field — e.g., "Always populated by the RPC layer; optional at type level for backward compatibility with consumers that don't expect it." Without this, a future reader may assume `paths` can be absent and add unnecessary guards.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `detectArtifacts` location rationale could be stronger

The plan places `detectArtifacts()` in `src/core/artifacts.ts` as a peer to `src/core/tree.ts`, with the rationale "not in `src/core/data/` — it's a pure function interpreting the tree, not I/O." This is correct. However, `src/core/tree.ts` is shared across layers (state machine + data layer), while `detectArtifacts()` is only consumed by the Commands layer (show commands). A comment in the new file clarifying this consumption boundary would prevent future callers from importing it into the state machine (which should remain unaware of artifact concepts).

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is architecturally sound after three rounds of refinement. Module boundaries are clean, dependency direction is correct (Commands -> core -> tree types), and the phase ordering rationale (4 before 2 for the breaking change boundary) shows good architectural thinking. The one IMPORTANT issue (version stamping vs INV-001) is the only substantive architectural concern — it's not a showstopper but needs an explicit decision rather than a silent invariant violation. The two MINOR issues are documentation improvements.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
