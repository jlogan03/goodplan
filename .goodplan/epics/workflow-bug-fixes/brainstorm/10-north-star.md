# goodplan v2 — North Star

A 10-minute overview for anyone encountering this system for the first time. Read this before diving into the full spec (08) or the user journey walkthroughs (09).

---

## What goodplan is

goodplan is a workflow system for LLM-assisted software development. It sits between the user and the LLM (Claude Code), providing structure that makes autonomous work trustworthy and collaborative work productive. It is a Claude Code plugin backed by a CLI.

The core insight: LLMs are capable of doing real software engineering work, but their output cannot be trusted without evidence. A plan that hasn't been reviewed is a guess. Code that hasn't been executed is a wish. The workflow's job is to systematically produce evidence that makes LLM output trustworthy enough to act on.

## Why it exists

Without structure, LLM-assisted development falls into two failure modes:

1. **Babysitting.** The user manually triggers every step, reviews every output, and catches every mistake. The LLM is fast but the user is the bottleneck. The workflow is ad hoc: describe what you want, Claude builds it, you eyeball the result.

2. **Overconfidence.** The LLM operates autonomously, produces plausible-looking work, and the user trusts it. Tests pass but the code is wrong in ways tests don't catch. Plans look reasonable but miss the context an implementer needs. Confidence is manufactured, not earned.

goodplan eliminates both by making trust mechanical. The LLM does real work autonomously. The system verifies that work through defined mechanisms. The user steers at decision points rather than babysitting the entire process.

## Two non-negotiable constraints

Everything in the system is a consequence of these:

1. **Refinement before handoff.** Any substantive LLM-produced artifact (plan, architecture, goal) is untrusted until multiple specialized reviewers have scored it against a rubric and converged on a mechanical bar. No handoff happens until the bar is met.

2. **Execution verification before done.** When an LLM implements code, the work is not "done" until the LLM has executed the code in a live environment, observed the actual result, and verified that the observation matches a pre-specified expectation. Tests alone are not sufficient. When verification is impossible, that fact is surfaced as a real decision.

Both are the same rule applied to different media: for prose artifacts, evidence is reviewer scores; for code, evidence is live observation matching expectation.

## The trust substrate

The system is built on four pillars:

**Events, not state machines.** Everything is an append-only JSONL event log. There are no status enums. "What phase are we in?" is a query over the event log, not a mutable field. This makes the system auditable, replayable, and merge-friendly across branches.

**Invariants, not honor system.** The CLI enforces ~22 invariants that gate transitions. You can't implement without a converged plan. You can't land a slice without code refinement. You can't call a chunk "verified" without evidence. The LLM requests transitions; the CLI refuses if evidence is missing.

**Artifacts are context transport.** A plan isn't just a plan — it's a self-contained specification that a fresh implementer (who has never seen the conversation history) can execute against without re-discovering anything. The refinement loop's most important function is accumulating context, not catching mistakes.

**Maturity is the universal rigor dial.** Each subsystem carries a maturity tag (experimental → stabilizing → stable → foundational) that calibrates how much rigor the system applies. An experimental module gets light review; a foundational one gets full review with R1 sensitivity. One concept, four uses: Pressure Test depth, Refinement Loop strictness, R1 blocking sensitivity, and Triggered Reshape thresholds.

## How it feels to use

### Collaborative design, autonomous execution

The workflow has two fundamentally different modes:

**Collaborative phases** require the user present. You and the LLM work together in real-time — your domain knowledge, intuitions, and preferences shape the direction. This covers exploration (research → brainstorm cycles), architecture design (subsystem boundaries, API decisions), and plan drafting (chunking, verification strategy). These phases are conversational, back-and-forth, and cannot be delegated.

**Autonomous phases** proceed independently. The LLM does mechanical work — refinement, implementation (red-green-verify per chunk), code review — and pauses at defined checkpoints. You control how much you engage via a steering preference: always-consult, best-guess-and-flag, or ask-in-the-moment.

The shape is front-loaded collaboration, back-loaded autonomy. You spend 20 minutes designing the architecture together, then the LLM spends an hour implementing it while you do other things.

### The epic lifecycle

An epic is a major feature or architectural change. The lifecycle:

1. **Capture** — You describe what you want. The LLM runs a design-tree interview, exploring alternatives with you. A goal is committed.

2. **Explore** — Research/brainstorm cycles. The LLM researches your codebase autonomously, then you brainstorm together about what the findings mean. This is where technical direction changes happen (e.g., discovering that SSE is better than WebSocket for your constraints).

3. **Shape** — You and the LLM design the architecture target together. The LLM proposes subsystem boundaries; you push back and refine. Then: a pressure test (adversarial analysis looking for failure modes, scaling cliffs, foreclosed optionality), followed by slice definitions (ordered, thin cross-sections of work).

4. **Plan + Implement per slice** — For each slice: you and the LLM draft the plan together (chunking, red tests, verification methods), then the LLM implements autonomously through red-green-verify cycles per chunk, then code refinement reviewers clean up the result.

5. **Slice-land** — Each slice updates the project spine (architecture-current, conventions, invariants, learnings). The final slice automatically triggers epic completion: cross-slice synthesis, maturity transitions, side-quest proposals.

### Side quests

Smaller, self-contained tasks that run the same trust gates (refinement, red-green-verify, code review) but with compressed ceremony. Can run concurrent with an active epic when you need to unblock yourself.

### Orientation

When you return after a break, `/gp:status` reads the event log and tells you exactly where you are, what happened while you were away, what needs attention, and what to do next. Briefings are written when context is fresh (at every pause point) so orientation is retrieval, not reconstruction.

## Key mechanisms

### The Refinement Loop

Every artifact boundary runs through a refinement loop: dispatch specialized reviewers in parallel → synthesize scores → evaluate convergence → if not converged, edit and re-review → repeat until the bar is met or the circuit breaker trips. Reviewers score against rubric dimensions and produce structured findings (BLOCKING / CRITICAL / IMPORTANT / MINOR). Convergence is mechanical — not "does it feel done?" but "are all scores above threshold with zero BLOCKING/CRITICAL findings?"

Relevance weighting ensures reviewers that matter most for a given artifact have blocking power, while tangential reviewers produce warnings.

### Pause Discipline (R1)

During autonomous work, the LLM pauses for exactly one reason: a discovery so trade-off-changing that continuing would burn user time on a path the user wouldn't endorse. The question: *"If the user knew this, would they want to reconsider?"*

When pausing, the LLM reconstructs the context the user doesn't have. A question that requires the user to guess what the LLM was thinking is a puzzle, not a question.

### The Discovery Ledger

When work is discovered mid-epic, it's captured cheaply (5 seconds) and triaged at milestones. Findings are classified on two dimensions (blocking/non-blocking × in-scope/out-of-scope) with five granular reshape options for blocking+in-scope discoveries: expand the current slice, insert a slice before/after, reshape the epic, or promote to its own epic.

Findings older than 3 epics without promotion or reference are surfaced for culling — preventing stale TODOs from accumulating.

### Red-Green-Verify

Each implementation chunk follows: write a failing test (red) → implement until it passes (green) → verify live that the observation matches the expectation. The red test must fail for the *intended* reason. The verification must exercise the actual change, not a proxy. When verification is impossible, the LLM surfaces it as a real decision (redesign the chunk, accept approximation, or schedule human verification).

## The CLI

The `gp` CLI owns the trust substrate. It manages the event log, enforces invariants, routes reviewers, evaluates convergence, runs extractors, and computes derived state. Skills (the LLM-facing orchestrators) call CLI commands; they never touch `.goodplan/` files directly.

`gp status --json` returns derived state plus suggested next steps — the CLI tells the skill what to do next, not the other way around.

## What it doesn't do

- **It doesn't write code.** The LLM writes code; goodplan structures when and how that code is verified.
- **It doesn't replace judgment.** Collaborative phases exist because the user's domain knowledge is irreplaceable. The system provides scaffolding — context, prompts, blocking options — not rules.
- **It doesn't optimize for speed.** It optimizes for trust. A slower process that produces verified work beats a fast process that produces plausible work.

## Implementation risks

These are known risks to carry into the delta and implementation phases. The core mechanisms are achievable — most already work in some form in the current system. The risks are in calibration and context pressure, not feasibility.

### Will need iteration

**Reviewer threshold calibration.** The mechanical convergence bar (all scores above threshold, zero BLOCKING) is clear in principle. In practice, thresholds set too strict mean nothing converges and the system burns tokens endlessly; too loose and it rubber-stamps. Start conservative, measure how many rounds artifacts actually take, and adjust. The existing reviewer set gives us a head start — they've been through real-world use already.

**R1 pause judgment.** "If the user knew this, would they want to reconsider?" requires genuine judgment from the LLM. Current models can do this sometimes but not reliably. The pre-flight discipline helps (forces the LLM to commit upfront to what would make it pause), and the five reshape options give structure. But expect false negatives (continuing when it should have paused) more often than false positives. Design the system so that missed R1 pauses are recoverable — they should cost the user time, not correctness.

**Collaborative design quality.** The exploration and architecture phases depend on the LLM being a good design partner — pushing back, exploring alternatives, incorporating domain knowledge. Current models are decent but uneven. Sometimes they push back well; sometimes they agree too readily. The design-tree interview structure helps by forcing enumeration of alternatives before convergence.

### Biggest risks

**Context window pressure during implementation.** A slice with 4 chunks, each with red-green-verify, generates a lot of context: the plan, architecture docs, subsystem docs, test output, evidence files. The context bundler and token budgeting are spec'd but the actual implementation is the hard part. If the LLM loses context mid-slice, verification quality degrades. Mitigation: aggressive budgeting in context bundles, and the Agent SDK's sub-agent model (each chunk can run in a fresh context with only its relevant context loaded).

**Reviewer signal-to-noise.** With 20+ reviewer types, every artifact could generate 15+ findings, mostly MINOR. The important ones get lost. Relevance weighting helps (low-relevance reviewers produce warnings, not blocks), but the initial calibration matters. Mitigation: start with fewer reviewers active per artifact type, expand as we learn which reviewers actually catch meaningful issues.

**Spec-to-implementation gap.** 140KB of spec for a system that doesn't exist yet. The walkthroughs (09) show an ideal experience — every exploration pivots cleanly, every R1 pause is perfectly timed. In practice, it'll be messier. The mechanisms are sound, but messy-but-structured is the realistic target, not the polished walkthrough experience. Build the substrate first (events, invariants, CLI), validate with a real epic, then iterate on the experience.

## Reading order for the full spec

1. **This document** (you're here) — 10-minute overview
2. **09 (walkthroughs)** — three concrete scenarios showing how the tool feels to use
3. **08 S2 (Foundational decisions)** — the decisions table and collaboration model
4. **08 S3 (Phases)** — phase catalog with collaborative/autonomous modes
5. **08 S3.3 (Pause Discipline)** — how autonomy and user steering interact
6. **08 S14 (Judgment calls)** — 37+ design decisions with rationale
