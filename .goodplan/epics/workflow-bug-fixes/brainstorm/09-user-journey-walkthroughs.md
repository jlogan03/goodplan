# User Journey Walkthroughs

Three complete walkthroughs showing how a user interacts with the goodplan workflow system. Grounded in the mechanics defined in 08-ideal-implementation.md and the disciplines from 01-ideal-flow-from-first-principles.md.

---

## Walkthrough 1: Setting Up a Pre-Existing Repo

You have a TypeScript web API with a React frontend. Express backend, PostgreSQL database, Zod validation, Biome for linting. About 40k lines of code, a handful of subsystems that have never been formally named. You have been using Claude Code for a while but your development workflow is ad hoc -- you describe what you want, Claude builds it, you eyeball the result. You want more structure.

### Installing the plugin

You install the goodplan plugin from the marketplace:

```
/install-plugin ian97531/goodplan
```

Claude Code downloads the plugin. You see a confirmation message listing the skills it provides: `gp:init`, `gp:create-epic`, `gp:explore`, `gp:plan-slice`, `gp:implement`, `gp:status`, and others. The plugin also registers pre-tool-use hooks that will protect certain `.goodplan/` files from direct editing.

### Running init

You type:

```
/gp:init
```

**You see:** The LLM tells you it detected an existing codebase and will run in onboarding mode. It lists what it found at the surface level:

> Detected existing codebase at `/Users/you/Repos/my-api`.
> - `package.json` present (TypeScript, Express, React, PostgreSQL deps)
> - `tsconfig.json` with strict mode
> - `docs/` directory with 3 markdown files
> - `README.md` present
> - `src/` with ~40k lines across backend and frontend
>
> I'll analyze the codebase to identify subsystems, conventions, and architecture. This will take a few minutes.

**Behind the scenes:** The `gp:init` skill calls `gp init` which emits a `project-initialized { mode: "onboard" }` event once the `.goodplan/` directory is bootstrapped. It then spawns the `onboard-phase` agent with the context bundle: repo root, detected tech stack, existing docs, top-level directory tree.

The onboard agent reads your codebase structure -- not every file, but the import graph, directory layout, package dependencies, existing documentation, and test patterns. It builds a mental model of how your system is organized.

### What the system discovers

**You see:** After a couple of minutes, the LLM presents its findings:

> **Architecture (draft)**
>
> I identified 5 subsystems:
>
> | Subsystem | Description | Maturity (proposed) |
> |---|---|---|
> | `api-layer` | Express routes, middleware, request/response handling | stabilizing |
> | `data-layer` | PostgreSQL models, migrations, query builders | stabilizing |
> | `auth` | JWT authentication, session management, RBAC | stabilizing |
> | `frontend` | React SPA, components, hooks, state management | experimental |
> | `shared` | Zod schemas, utility types, constants shared between backend and frontend | stabilizing |
>
> **Conventions detected:**
> - TypeScript strict mode with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
> - Biome for linting and formatting
> - Vitest for testing
> - Express route handlers follow a controller-service-repository pattern
> - Zod schemas defined in `shared/schemas/` and imported by both API and frontend
> - Migrations in `src/data/migrations/` using raw SQL
>
> **Communication patterns:**
> - `frontend` -> `api-layer` (HTTP/JSON)
> - `api-layer` -> `auth` (middleware chain)
> - `api-layer` -> `data-layer` (service calls)
> - `data-layer` -> PostgreSQL (direct)
>
> Does this look right? Anything I missed or got wrong?

This is the interactive trust gate for P0 -- there is no refinement loop at init (chicken-and-egg problem: the reviewer registry is not yet trusted on a fresh project), so the user reviews directly.

### You steer the onboarding

**You say:** "The frontend is more mature than experimental -- we've had it in production for 6 months with paying users. Also, you missed the `jobs` subsystem -- there's a background job runner in `src/jobs/` that processes async tasks. It's pretty new though."

**You see:** The LLM updates:

> Got it. Updates:
> - `frontend`: experimental -> stabilizing
> - Added `jobs` subsystem (experimental): background job runner for async task processing, uses BullMQ
>
> I'll commit these as the initial architecture. The maturity tags will calibrate how much rigor the workflow applies to each subsystem -- stabilizing subsystems get standard review depth, experimental ones get lighter touch.

**Behind the scenes:** The skill calls a series of CLI commands:

```
gp subsystem:register < { slug: "api-layer", maturity: "stabilizing", filePath: "subsystems/api-layer.md" }
gp subsystem:register < { slug: "data-layer", maturity: "stabilizing", filePath: "subsystems/data-layer.md" }
gp subsystem:register < { slug: "auth", maturity: "stabilizing", filePath: "subsystems/auth.md" }
gp subsystem:register < { slug: "frontend", maturity: "stabilizing", filePath: "subsystems/frontend.md" }
gp subsystem:register < { slug: "shared", maturity: "stabilizing", filePath: "subsystems/shared.md" }
gp subsystem:register < { slug: "jobs", maturity: "experimental", filePath: "subsystems/jobs.md" }
```

Each call emits a `subsystem-registered` event. Then the architecture and conventions are committed:

```
gp epic:architecture-commit  (on project scope -- architecture-current.md)
gp milestone:commit --label="project initialized"
```

Events emitted: `project-initialized`, `architecture-committed`, `conventions-committed`, `subsystem-registered` (x6), `milestone-committed`.

### The resulting directory structure

```
.goodplan/
  events.jsonl                          # project-level event log (7 events so far)
  architecture-current.md               # structural map of the system as it exists today
  conventions.md                        # tech stack, code style, test patterns, naming
  invariants.md                         # empty but present (no project-specific invariants yet)
  subsystems/
    api-layer.md                        # per-subsystem doc: description, API surface, known limitations
    data-layer.md
    auth.md
    frontend.md
    shared.md
    jobs.md
```

The naming convention for files at the project level is simple -- no date-slug-suffix because these are singleton files. The date-slug-suffix pattern (`<YYYY-MM-DD>_<slug>_<6charsuffix>`) applies to epic and side-quest directories and artifact files within them.

### What `gp status` shows

**You type:** `gp status`

**You see:**

```json
{
  "project": {
    "initialized": true,
    "subsystems": [
      { "slug": "api-layer", "maturity": "stabilizing" },
      { "slug": "data-layer", "maturity": "stabilizing" },
      { "slug": "auth", "maturity": "stabilizing" },
      { "slug": "frontend", "maturity": "stabilizing" },
      { "slug": "shared", "maturity": "stabilizing" },
      { "slug": "jobs", "maturity": "experimental" }
    ],
    "activeEpic": null,
    "activeSideQuest": null,
    "totalEvents": 7,
    "lastMilestone": "project initialized"
  }
}
```

### What you do next

The LLM suggests:

> Project initialized. You can:
> 1. **Create an epic** (`/gp:create-epic`) -- for a major feature or architectural change
> 2. **Explore first** (`/gp:explore`) -- if you want to research something before committing to a plan
> 3. **Create a side quest** (`/gp:create-side-quest`) -- for a smaller, self-contained task
>
> What would you like to build?

You have an idea. You want real-time notifications.

---

## Walkthrough 2: Completing an Epic From Beginning to End

### P0/P1 -- The idea emerges and goal is captured

You type:

```
/gp:create-epic real-time-notifications
```

**Behind the scenes:** The skill calls `gp epic:create --slug=real-time-notifications`. The CLI generates a collision-resistant directory name.

Events emitted:
- `epic-created { slug: "real-time-notifications", dir: "2026-04-09_real-time-notifications_b7k2z8", date: "2026-04-09", suffix: "b7k2z8" }`

The skill loads the P1 context bundle: `architecture-current.md` (inlined), `conventions.md` (inlined), subsystem summaries with maturity (inlined), active decisions (inlined, currently 0), recent learnings (none yet).

**You see:** The LLM begins the design-tree interview:

> Let's define what "real-time notifications" means for your system.
>
> **Starting question:** What triggers a notification? Is this about system events (a background job completes, a payment succeeds, an error occurs), user-to-user communication (someone comments on your item), or both?

**You say:** "Both. System events like job completions and errors, and user actions like comments and status changes."

**You see:** The LLM builds a design tree and presents it:

> Here's the design tree as I see it. **Are there branches or alternatives I missed? This is your chance to add them before we explore.**
>
> ```
> Real-time notifications
>  +-- Transport
>  |    +-- WebSocket (persistent connection, bidirectional)
>  |    +-- Server-Sent Events (unidirectional, simpler)
>  |    +-- Long polling (fallback, simplest)
>  +-- Notification model
>  |    +-- Per-user (each user has a notification stream)
>  |    +-- Per-channel (users subscribe to topics)
>  |    +-- Hybrid (per-user inbox + topic subscriptions)
>  +-- Persistence
>  |    +-- Ephemeral only (in-memory, lost on restart)
>  |    +-- Persistent (stored in DB, queryable history)
>  |    +-- Hybrid (recent in-memory, historical in DB)
>  +-- Delivery guarantees
>  |    +-- At-most-once (fire and forget)
>  |    +-- At-least-once (retry with dedup)
>  +-- Frontend integration
>       +-- Toast/banner overlay
>       +-- Notification center (inbox UI)
>       +-- Both
> ```
>
> Note: this tree is limited to the branches I can think of. Some design spaces here might be better represented differently -- for instance, "delivery guarantees" and "persistence" are somewhat orthogonal dimensions rather than a strict tree hierarchy.

**You say:** "You missed one branch under Transport -- I've been thinking about using the new Streams API in modern browsers. Also, add a branch for 'notification preferences' -- users should be able to control what they get notified about."

The LLM adds your branches and walks through the key decisions with you, exploring trade-offs at each node. This is not exhaustive -- you spend maybe five minutes on it. The conversation narrows to: WebSocket transport (with SSE fallback), per-user model with topic subscriptions, persistent storage, at-least-once delivery, notification center with toast overlay, and user preferences.

**You see:** The LLM then asks the steering preference question:

> Before I commit this goal, one question about how you want to work with me on this epic:
>
> **Plan-shape checkpoints** happen when I draft a plan for each slice. I can handle these three ways:
>
> 1. **Always consult** -- I'll pause and show you the plan skeleton every time, waiting for your approval before refining it. Best if you want tight control.
> 2. **Best-guess and flag** -- I'll shape plans using my best judgment, flag the decisions in a briefing, and keep going. You review at the next natural pause. Best if you trust the workflow and want to stay hands-off.
> 3. **Ask in the moment** -- I'll ping you; if you respond quickly, we shape it together. If not, I'll best-guess. Best if your availability varies.
>
> Which do you prefer for this epic?

**You say:** "Always consult. This is a big feature and I want to see the plan shapes."

**Behind the scenes:**
```
gp epic:set-steering real-time-notifications < { value: "always-consult", scope: "epic" }
  -> epic-steering-preference-set { value: "always-consult" }
```

The LLM writes the goal artifact and submits it for light refinement (holistic + context-transport + goal-reviewer):

```
gp epic:goal-draft real-time-notifications < { artifactPath: "goal.md" }
  -> epic-goal-drafted
gp refine:start --artifact-type=epic-goal --rigor=minimum
  -> refinement-round-started
[dispatch three reviewers in parallel]
gp refine:score (x3)
gp refine:synthesize
gp refine:evaluate -> CONVERGED (light rigor, first round)
gp refine:converge
gp epic:goal-commit real-time-notifications
  -> epic-goal-committed
```

**The directory now looks like:**

```
.goodplan/
  events.jsonl
  architecture-current.md
  conventions.md
  invariants.md
  subsystems/
    api-layer.md
    ...
  epics/
    2026-04-09_real-time-notifications_b7k2z8/
      events.jsonl          # epic-level event log
      goal.md               # committed goal artifact
```

### P2 -- Exploration (collaborative)

Exploration is a collaborative phase -- the LLM cannot do this alone. Your domain knowledge, intuitions, and preferences shape the direction. It runs in cycles: research (autonomous), brainstorm (collaborative), assess (collaborative), loop until both of you feel the space is well-explored.

**You see:** The LLM transitions to exploration:

> Goal committed. Before designing the architecture, let's explore the notification space together. I'll start by researching your codebase to ground us, then we'll brainstorm the approach.
>
> **First research cycle -- I'll look at:**
> - How your existing Express middleware chain works (for WebSocket upgrade handling)
> - Your current auth flow (WebSocket connections need authentication)
> - BullMQ patterns in your jobs subsystem (notification triggers will originate here)
> - WebSocket library options for your stack
>
> I'll bring back what I find and we'll discuss. Anything to add to the research list?

**You say:** "Also check how the frontend currently handles real-time data -- I think there's a polling mechanism in the dashboard component."

#### Research cycle 1 (autonomous)

**Behind the scenes:** The `gp:explore` skill spawns the `explore-phase` agent. The agent reads the codebase -- `src/middleware/auth.ts`, `src/jobs/`, `src/frontend/components/Dashboard.tsx`, Express configuration, `package.json` -- and writes research artifacts.

```
exploration-cycle-started { cycleNumber: 1, mode: "research" }
research-captured { artifactRef: { path: "research/2026-04-09_websocket-auth-integration_m3p7q2.md", ... } }
research-captured { artifactRef: { path: "research/2026-04-09_bullmq-event-patterns_k8n2w5.md", ... } }
research-captured { artifactRef: { path: "research/2026-04-09_frontend-polling-patterns_j4v8n1.md", ... } }
exploration-cycle-completed { cycleNumber: 1, artifactsProduced: 3 }
```

#### Brainstorm session 1 (collaborative)

**You see:** The LLM presents research findings and opens the conversation:

> **Research findings -- let's discuss.**
>
> 1. **WebSocket + Auth integration** -- Your Express auth middleware runs as `app.use(authMiddleware)` which only fires on HTTP requests. WebSocket upgrade requests bypass Express middleware entirely in the `ws` library. You'd need a separate auth check in the WebSocket `verifyClient` callback. The JWT verification logic in `src/middleware/auth.ts` is tightly coupled to Express's `req` object. **This is a known risk for the architecture phase.**
>
> 2. **BullMQ event patterns** -- Your job runner already emits `completed` and `failed` events per queue. The notification system can subscribe to these directly. However, BullMQ events are in-process -- if the API server restarts, pending notifications are lost. Redis pub/sub (which BullMQ already uses under the hood) could bridge this gap.
>
> 3. **Frontend polling** -- Good call on checking. The Dashboard component polls `/api/stats` every 30 seconds with `setInterval`. No WebSocket infrastructure exists in the frontend yet. The polling approach would need to be replaced or complemented, not extended.
>
> What stands out to you? Any of these change your thinking?

**You say:** "Actually, finding #1 worries me more than I expected. If the auth middleware is that tightly coupled to Express, maybe we should consider Server-Sent Events instead of WebSockets for the notification stream. SSE runs over regular HTTP, so it would go through the existing middleware without any special handling."

**You see:** The LLM explores that branch with you:

> That's an interesting direction. Let me think through the trade-offs:
>
> WebSocket gives us bidirectional communication, but notifications are fundamentally one-way -- server to client. We don't need the client sending messages back through the notification channel. SSE is purpose-built for exactly this: server-to-client event streams over HTTP.
>
> **SSE advantages for your case:**
> - Goes through your existing Express middleware chain (auth, logging, rate limiting -- all work unchanged)
> - Automatic reconnection built into the browser `EventSource` API
> - Simpler server implementation (just write to the response stream)
>
> **SSE disadvantages:**
> - HTTP/1.1 has a 6-connection-per-domain limit (can be an issue if the user has multiple tabs)
> - No binary data (not relevant for notifications)
> - Some corporate proxies buffer SSE responses (increasingly rare)
>
> What's your CDN setup? That might matter here.

**You say:** "Our CDN doesn't support WebSocket passthrough. We've been routing WebSocket-capable services through a separate subdomain, but it's a pain. If SSE works through the normal HTTP path, that's a real advantage."

**You see:** The LLM shifts direction based on this domain knowledge:

> That's a strong signal. The CDN constraint makes SSE even more attractive -- no infrastructure workaround needed. And the one-way nature of notifications means we're not giving up anything meaningful by dropping bidirectional support.
>
> Let me update the design tree:
>
> ```
> Transport (revised)
>  +-- SSE (preferred -- works with CDN, existing auth, one-way model)
>  |    +-- HTTP/2 (multiplexed, no connection limit)
>  |    +-- HTTP/1.1 fallback (6-conn limit manageable with shared connection)
>  +-- WebSocket (kept as future option if bidirectional needed)
> ```
>
> The connection-limit concern is real though. If a user has 4 tabs open, that's 4 SSE connections out of 6. Are your users likely to have multiple tabs?

**You say:** "Typically 1-2 tabs. And we're on HTTP/2 in production, so the limit doesn't apply. Let's go with SSE."

This is the kind of direction change that only happens through genuine conversation. The LLM's initial research assumed WebSocket; the user's CDN constraint and one-way insight redirected to SSE.

#### Assess 1 (collaborative)

**You see:**

> Good. SSE it is. Before I move on -- the switch to SSE raises a new question. I found that BullMQ events are in-process and Redis pub/sub could bridge the gap. But with SSE going through the standard HTTP path, **how does SSE interact with your existing auth middleware's session handling?** The middleware attaches user context to `req` -- does it persist across a long-lived SSE connection, or does it run once at connection time?
>
> I think I need to research this before we design the architecture. Should I dig into that, or do you already know?

**You say:** "The middleware runs once per request, so it would run once when the SSE connection opens. After that, the response stream stays open. If the JWT expires mid-stream, the connection wouldn't know. That's probably fine -- the client will reconnect with a fresh token -- but worth confirming."

#### Research cycle 2 (autonomous)

**Behind the scenes:** A second research cycle focuses on SSE + auth middleware interaction:

```
exploration-cycle-started { cycleNumber: 2, mode: "research" }
research-captured { artifactRef: { path: "research/2026-04-09_sse-auth-middleware_p5w3k7.md", ... } }
exploration-cycle-completed { cycleNumber: 2, artifactsProduced: 1 }
```

#### Brainstorm session 2 (collaborative)

**You see:**

> Confirmed your intuition. The Express auth middleware runs once when the SSE endpoint is hit. The `res` stays open for streaming. If the JWT expires, the existing connection persists -- `EventSource` only re-auths on reconnect. This is standard SSE behavior and acceptable: the auth check at connection time is the trust boundary, and reconnection (which re-auths) happens automatically on disconnect.
>
> I also found that your Express setup already has `compression` middleware. SSE responses should skip compression (they need to flush immediately). We'll need `res.flushHeaders()` and a `no-compress` flag.
>
> I think we've explored enough to design the architecture. We have:
> - **Transport:** SSE (not WebSocket) -- works with CDN, existing auth, simpler
> - **Event source:** BullMQ -> Redis pub/sub -> SSE endpoint
> - **Auth:** Existing middleware, re-auth on reconnect
> - **Frontend:** Replace polling with EventSource API
> - **Known risk:** Compression middleware interaction (small, addressable)
>
> Ready to move to architecture design?

**You say:** "Yes, let's design it."

```
exploration-concluded { cyclesCompleted: 2, totalArtifacts: 4 }
```

Note how the exploration fundamentally changed the technical direction. The goal document said "WebSocket transport" during the design-tree interview, but exploration revealed that SSE is a better fit. The goal's intent (real-time notifications) is preserved; the implementation approach evolved through collaboration.

**The directory now:**

```
.goodplan/epics/2026-04-09_real-time-notifications_b7k2z8/
  events.jsonl
  goal.md
  research/
    2026-04-09_websocket-auth-integration_m3p7q2.md
    2026-04-09_bullmq-event-patterns_k8n2w5.md
```

### P3 -- Shape: Architecture target (collaborative)

Architecture design is a collaborative phase. The LLM proposes structure based on the exploration findings; you and the LLM design the architecture together.

**Behind the scenes:** The `gp:create-epic` skill resumes for the shape sub-phase. It spawns the `architecture-phase` agent with the context bundle: epic goal (inline), `architecture-current.md` (inline), affected subsystems full docs (inline for api-layer, auth, frontend, jobs, data-layer), exploration outputs (inline, tightly budgeted).

**You see:** The LLM proposes initial subsystem boundaries:

> Based on our exploration, here's my first take on the architecture target. This is a starting point -- tell me where it's wrong.
>
> **New subsystem: `notifications`** (experimental)
> - Owns: SSE endpoint, notification model, delivery pipeline, user preference store
> - Depends on: `auth` (existing middleware handles SSE auth), `data-layer` (notification persistence), `jobs` (event source)
> - Communication: `jobs` -> `notifications` (Redis pub/sub), `notifications` -> `frontend` (SSE stream), `api-layer` -> `notifications` (REST endpoints for preferences and history)
>
> I'm putting the SSE endpoint, the notification routing logic, and the preference store all in the `notifications` subsystem. Thoughts?

**You say:** "I think the notification routing should be its own subsystem, not bundled with the transport layer. The routing logic -- deciding which users get which notifications based on event type, preferences, and subscriptions -- is complex enough to own separately. The SSE endpoint is just a delivery mechanism."

**You see:** The LLM pushes back thoughtfully:

> I see the appeal of separating routing from transport. But at this stage, with one transport mechanism (SSE) and routing rules that are relatively simple (event type + user preferences), splitting into two subsystems means two APIs to maintain, cross-subsystem calls for every notification, and more coordination overhead during implementation.
>
> Counter-proposal: keep them in one subsystem now, but structure the code so routing is a distinct internal module (`notifications/routing/`). If routing grows complex enough to warrant its own subsystem, we can split later without changing the external API.
>
> Does that work, or do you see routing complexity that I'm underestimating?

**You say:** "Fair point. We had a similar notification system at my last job -- routing started simple and became the most complex part within 3 months. But you're right that splitting now is premature. Let's keep it together with routing as a distinct module, and I'll flag it if routing starts growing."

**You see:** The LLM incorporates this and continues designing:

> Good -- I'll note that in the architecture as a potential split point. Here's the full target:
>
> **New subsystem: `notifications`** (experimental)
> - Owns: SSE endpoint, notification routing (internal module, potential future subsystem split), notification model, delivery pipeline, user preference store
> - Depends on: `auth` (existing middleware), `data-layer` (persistence), `jobs` (event source)
>
> **Modified subsystem: `auth`**
> - No new exports needed (SSE goes through existing middleware -- this is the payoff from choosing SSE over WebSocket)
> - Maturity impact: none
>
> **Modified subsystem: `frontend`**
> - New responsibility: EventSource client, notification center component, toast overlay
> - Replaces: dashboard polling mechanism (30s interval) with SSE stream
>
> **Modified subsystem: `data-layer`**
> - New tables: `notifications`, `notification_preferences`, `notification_subscriptions`
> - New queries: notification CRUD, preference management, unread counts
>
> **Communication patterns:**
> - `jobs` -> `notifications` via Redis pub/sub (decoupled event delivery)
> - `notifications` -> `frontend` via SSE (real-time push, unidirectional)
> - `api-layer` -> `notifications` via internal service calls (REST for preferences/history)
>
> Notice that `auth` doesn't need modification -- the SSE endpoint is a regular Express route, so auth middleware runs naturally. This is simpler than the WebSocket approach would have been.

**You say:** "The auth simplification is nice. One thing -- the communication from api-layer to notifications. Is that a service call or a direct import? I want the API layer to call notification endpoints via HTTP, not import notification internals."

**You see:** The LLM clarifies:

> Good distinction. Let's be explicit: `api-layer` -> `notifications` is via internal HTTP calls to the notifications REST endpoints. No direct imports across subsystem boundaries. The API layer exposes the notification preferences and history to the frontend by proxying to the notifications subsystem's REST API.

Together you've arrived at a target architecture. The key decisions -- SSE transport, single subsystem with routing module, no auth changes needed, HTTP boundaries between subsystems -- emerged from genuine back-and-forth.

### Architecture-shape checkpoint (new)

The architecture design was collaborative. Now it enters autonomous refinement. This checkpoint marks the transition.

**You see:**

> Here's the architecture target we've designed together. Before I send this to the reviewers for refinement, anything you want to change? Once refinement starts, the architecture accumulates reviewer context and becomes harder to redirect.

**You say:** "Looks good, go ahead with refinement."

**Behind the scenes:** `architecture-shape-approved` event emitted. The architecture enters P4 (autonomous refinement).

```
gp epic:architecture-draft real-time-notifications < { target: "target", artifactPath: "architecture-target.md" }
gp epic:architecture-shape-approve < { userConfirmation: "user approved" }
  -> architecture-shape-approved
gp refine:start --artifact-type=architecture-target --rigor=standard --subsystems=api-layer,auth,frontend,data-layer,jobs
[round 1: 6 reviewers score in parallel]
[reviewer-software-architecture flags: "dependency direction from api-layer to notifications -- confirm this is HTTP, not import"]
[editor agent fixes: adds explicit "HTTP boundary" annotation]
[round 2: reviewers see diff, answer "are prior concerns resolved"]
gp refine:evaluate -> CONVERGED
gp refine:converge
```

#### Optional post-refinement architecture review

**You see:**

> Architecture refinement complete (2 rounds). The reviewers clarified the HTTP boundary between api-layer and notifications and added a note about SSE compression handling. Want to review the changes before I commit, or are you comfortable with the refinement?

**You say:** "I trust the refinement. Commit it."

```
gp epic:architecture-commit real-time-notifications
  -> architecture-target-committed { delta: { subsystemsAdded: ["notifications"], subsystemsModified: ["frontend", "data-layer"], subsystemsRemoved: [] } }
```

Note that `auth` is not in the modified list -- the SSE approach means auth needs no changes. This is a concrete payoff from the exploration-phase pivot.

### P4 -- Shape: Pressure test (autonomous)

You grab a coffee while the pressure test runs. This phase is autonomous -- the LLM works independently.

**Behind the scenes:** The skill spawns the `pressure-test-phase` agent. This agent has a fundamentally different prompt posture: *"Your job in this step is to find ways this will hurt us. If you find none, press harder -- that usually means you haven't tried."* The framing is **"errors made impossible"** -- not "will this work?" but "what classes of error does this design fail to make impossible?"

**You see:** The pressure test report:

> **Pressure Test Report**
>
> **1. Failure-mode enumeration**
> - *SSE connection leak:* If a client disconnects without properly closing the HTTP connection, the server holds the response stream until timeout. With many users, this accumulates. The shape invites this because connection cleanup relies on HTTP keep-alive timeouts rather than being forced by the architecture.
> - *Notification ordering violation:* Redis pub/sub does not guarantee ordering across multiple publishers. If two job completions fire simultaneously, the user may see them in the wrong order.
>
> **2. Scaling cliffs**
> - At ~10k concurrent SSE connections on a single Node.js process, event loop latency degrades. SSE connections are lighter than WebSocket (no frame parsing), but each still holds an open HTTP response. The architecture does not mention horizontal scaling.
> - Notification history queries will full-table-scan without an index on `(user_id, created_at)`.
>
> **3. Optionality ledger**
> - *Preserved:* Transport is behind an abstraction (SSE now, WebSocket later if bidirectional needed -- swap at the transport layer without touching notification model)
> - *Foreclosed:* Per-user model is baked in. Switching to per-channel would require a data model redesign.
>
> **4. Error class inventory**
> - *Made impossible:* Auth bypass on SSE -- the endpoint goes through Express middleware, so unauthenticated connections are structurally impossible. (This was a design payoff from choosing SSE over WebSocket.)
> - *Still possible:* Duplicate notifications if Redis pub/sub retries on network partition.
> - *A different design could have made impossible:* If notification delivery used a persistent queue (not Redis pub/sub), message loss on subscriber restart would be impossible by construction. The current design accepts this risk.
>
> **5. Locked-in assumptions**
> - "A single Redis instance is sufficient for pub/sub." At scale, this becomes a single point of failure.
> - "The browser `EventSource` API will always reconnect." Reconnection is automatic but the retry interval and missed-event handling need explicit design.

**You see:** Each finding presented with a disposition question. Most are straightforward. One requires judgment:

> **Finding: SSE scaling cliff at ~10k connections**
>
> The architecture doesn't address horizontal scaling. At 10k concurrent SSE connections per process, you hit response-stream pressure.
>
> Options:
> 1. **Address now** -- add a pub/sub layer (Redis, NATS) between API servers to the architecture target
> 2. **Accept with justification** -- "We accept that SSE connections don't scale past 10k without a pub/sub layer; we'll add that in a future epic. Current user base is ~500."
>
> Which do you prefer?

**You say:** "Accept with justification. Our user base is nowhere near 10k. Let's not over-engineer."

**Behind the scenes:**
```
gp epic:pressure-test-finding-disposition < {
  findingId: "01JPW2...",
  disposition: "accepted-with-justification",
  promotedTo: null
}
  -> pressure-test-finding-accepted { disposition: "accepted-with-justification" }
```

The accepted finding is promoted into the spine as a tagged constraint so downstream reviewers don't re-raise it. The architecture target gets an annotation: *"Known scaling constraint: SSE connections limited to ~10k per process. Accepted for current scale; pub/sub horizontal scaling deferred to future epic."*

All five findings are dispositioned. The pressure test report goes through light refinement and is committed.

```
gp epic:pressure-test-commit real-time-notifications
  -> pressure-test-committed
```

### P5 -- Shape: Slice definitions (autonomous with checkpoint)

The LLM works independently to define slices. You step away -- this runs autonomously.

**Behind the scenes:** The `slices-phase` agent drafts the slice set. It applies slicing heuristics -- tracer bullet, observability early, known unknowns first -- as guidelines, not rules. Note: with the SSE pivot from exploration, the slices look different than they would have with WebSocket.

The slice set goes through full refinement. A reviewer flags a dependency issue: slice 04 depends on both 01 and 02, but the dependency on 01 is implicit (it needs SSE transport working) rather than declared. The editor fixes this by making the dependency explicit in slice 04's goal. The reviewer also checks that the dependency DAG is acyclic (blocking check, pass/fail) -- it is.

The slice-set reviewer's contract is *"if they didn't apply this technique, why not?"* -- the observability justification passes because it's reasoned, not because a box was checked.

### Slice-shape checkpoint (new)

Once the slices are refined, the workflow pauses for your review. This is where you steer the slice structure before implementation begins.

**You see:**

> **Proposed slice set (6 slices):**
>
> | # | Slice | Rationale |
> |---|---|---|
> | 01 | `tracer-bullet` | Thin end-to-end: one notification type (job-completed), from BullMQ event through Redis pub/sub, through SSE endpoint, to a minimal frontend toast. Proves the full pipeline works. |
> | 02 | `notification-persistence` | Store notifications in PostgreSQL. Query history. Unread counts. This grounds the data model before building richer features on top. |
> | 03 | `notification-routing` | Notification routing rules: which events generate which notifications, fanout to multiple users, event-type filtering. Known unknown: the routing module's complexity (flagged during architecture design as a potential future subsystem split). |
> | 04 | `notification-center-ui` | Frontend notification center component -- inbox view, mark-as-read, infinite scroll. Depends on 02 (persistence) and 01 (SSE transport). |
> | 05 | `user-preferences` | Per-user notification preferences: which event types to receive, delivery channels, quiet hours. Depends on 02 (persistence). |
> | 06 | `reconnection-resilience` | SSE reconnection strategy, missed-notification catch-up via `Last-Event-ID`, connection health monitoring. Addresses the "EventSource always reconnects" locked-in assumption from the pressure test. |
>
> **Slicing technique justifications:**
> - *Tracer bullet:* Slice 01 threads through every layer (jobs -> notifications -> SSE -> frontend) with minimal scope. This is the first slice.
> - *Known unknowns first:* Slice 03 (notification routing) is the riskiest piece. Ordered after tracer-bullet and persistence because routing needs working infrastructure to test against.
> - *Observability:* Not a separate slice -- the tracer bullet (slice 01) includes basic connection logging and notification delivery logging. A dedicated observability slice would be over-engineering for this epic's scope.
>
> Want to adjust the slice set before I commit it?

**You say:** "Slice 3 and 4 should be swapped -- routing rules are more of a known unknown than the UI, and I want to tackle it while the architecture decisions are fresh. Also, can we merge 5 and 6 into one slice? The preferences UI is small, and reconnection resilience is related to the transport layer. Together they're still a reasonable scope."

**You see:** The LLM adjusts:

> Updated:
>
> | # | Slice | Change |
> |---|---|---|
> | 03 | `notification-center-ui` | Moved from 04 to 03 (lower risk, can parallelize) |
> | 04 | `notification-routing` | Moved from 03 to 04 (known unknown, tackle with fresh context) |
> | 05 | `preferences-and-resilience` | Merged slices 05 + 06: user preferences + SSE reconnection + missed-notification catch-up |
>
> Wait -- I'd push back slightly on swapping 3 and 4. You said you want to tackle routing while architecture decisions are fresh, but the UI slice (03) depends on the SSE transport from slice 01. If we put routing at 03, it doesn't depend on the UI. But if we put UI at 03, routing at 04 can use the UI for manual testing during development. Either ordering works from a dependency perspective.
>
> Do you still want routing first, or does the manual-testing argument change your mind?

**You say:** "Good point on manual testing. Keep routing at 03 -- I'd rather tackle the unknown early. We can test routing with curl and the SSE endpoint directly."

**Behind the scenes:** The LLM recomputes dependencies with the adjusted slice set.

```
gp epic:slice-set-shape-approve < { userConfirmation: "user approved adjusted set" }
  -> slice-set-shape-approved
gp epic:slices-commit real-time-notifications
  -> slice-set-committed { sliceCount: 5, sliceIds: [...] }
  -> slice-created (x5, one per slice with committed goals)
gp milestone:commit --label="epic shaped"
```

**The directory now:**

```
.goodplan/epics/2026-04-09_real-time-notifications_b7k2z8/
  events.jsonl
  goal.md
  architecture-target.md
  pressure-test.md
  slice-set.md
  research/
    2026-04-09_websocket-auth-integration_m3p7q2.md
    2026-04-09_bullmq-event-patterns_k8n2w5.md
    2026-04-09_frontend-polling-patterns_j4v8n1.md
    2026-04-09_sse-auth-middleware_p5w3k7.md
  slices/
    01_tracer-bullet/
      goal.md
    02_notification-persistence/
      goal.md
    03_notification-routing/
      goal.md
    04_notification-center-ui/
      goal.md
    05_preferences-and-resilience/
      goal.md
```

### P6 -- Epic activate

You type:

```
/gp:start-epic
```

**You see:** The LLM presents a summary of the architecture target, slice set, pressure-test findings (including the accepted WebSocket scaling constraint), and your steering preference (always-consult). It asks for explicit approval.

> Ready to activate the real-time-notifications epic.
>
> **Architecture target:** New `notifications` subsystem (experimental), modifications to `frontend`, `data-layer`. (Auth subsystem unchanged -- SSE goes through existing middleware.)
> **Slices:** 5 slices, starting with tracer-bullet. Estimated 3-4 sessions of work.
> **Pressure test:** 5 findings; 2 addressed in architecture, 3 accepted with justification.
> **Steering:** always-consult (you'll review every plan skeleton).
>
> Activate this epic?

**You say:** "Yes."

```
gp epic:activate real-time-notifications < { userConfirmation: "user approved" }
  -> epic-activated
gp milestone:commit --label="epic activated"
```

The invariant `epic.single-active-per-branch` now holds with this epic as the active one.

### P7-P9 -- Planning the tracer-bullet slice (collaborative draft, autonomous refinement)

You type:

```
/gp:plan-slice real-time-notifications/01_tracer-bullet
```

**Behind the scenes:** The skill checks the entry invariant: `epic-activated` AND slice has `slice-created` but no `slice-plan-drafted`. The slice has no dependencies (`dependsOn: []`), so `slice.deps-landed-before-start` passes trivially. Context bundle loaded: slice goal, `architecture-target.md`, affected subsystem docs (api-layer, jobs, frontend, notifications), `plan/v1` rubric, recent learnings (none yet).

#### P7: Draft (collaborative)

Plan drafting is collaborative. You and the LLM build the plan skeleton together.

**You see:**

> **Let's plan slice 01: tracer-bullet.** This threads one notification type end-to-end: BullMQ event -> Redis pub/sub -> SSE endpoint -> frontend toast.
>
> Here's my initial skeleton -- 3 chunks:
>
> | Chunk | Description | Verification |
> |---|---|---|
> | c1 | Set up SSE endpoint on Express, basic connection handling, `text/event-stream` response | `live`: Start the server, connect with `curl`, observe the SSE stream opens and sends a heartbeat |
> | c2 | BullMQ event listener publishes to Redis pub/sub; SSE endpoint subscribes and forwards to connected clients | `live`: Trigger a test job completion, observe the notification arrives at the SSE client within 2 seconds |
> | c3 | Minimal frontend toast component that connects via EventSource and displays incoming notifications | `live`: Load the page, trigger a job completion, observe the toast appears in the browser |
>
> What do you think?

**You say:** "For the SSE endpoint, let's use the same pattern as the existing health-check endpoint in the API layer -- it already handles long-lived responses and has the right CORS headers. Also, split c2 into two chunks. I want to verify each hop independently: BullMQ-to-Redis, then Redis-to-SSE."

**You see:** The LLM incorporates both suggestions:

> Good call on both. The health-check endpoint pattern already handles `res.flushHeaders()` and CORS -- I'll use that as the template. And splitting c2 gives us independent verification of each hop.
>
> Revised plan (4 chunks):
>
> | Chunk | Description | Verification |
> |---|---|---|
> | c1 | SSE endpoint using health-check pattern (long-lived response, CORS, `text/event-stream`, `res.flushHeaders()`), basic connection handling | `live`: connect with `curl -N`, observe SSE stream opens with heartbeat comment |
> | c2 | BullMQ event listener publishes to Redis pub/sub channel | `live`: trigger job completion, observe message on Redis channel via `redis-cli subscribe` |
> | c3 | SSE endpoint subscribes to Redis pub/sub, formats as SSE events, forwards to connected clients | `live`: publish a test message to Redis channel, observe it arrives at the SSE client via `curl` |
> | c4 | Frontend toast component, EventSource client, display incoming notifications | `live`: load page, publish to Redis, observe toast appears in browser |
>
> **Red tests (distinct from verification):**
> - c1: Unit test that hitting the SSE endpoint returns `Content-Type: text/event-stream` and the connection stays open. Run before endpoint exists -- must fail.
> - c2: Integration test that a BullMQ `completed` event results in a message on the Redis pub/sub channel. Run before listener code exists -- must fail.
> - c3: Integration test that a message on the Redis pub/sub channel produces an SSE event on the endpoint. Run before subscription code exists -- must fail.
> - c4: Component test that rendering `<NotificationToast>` with a mock EventSource message displays the toast text. Run before component exists -- must fail.
>
> For the verification method on c3 -- I'm thinking we test this with `curl` piped to `grep`, which lets us programmatically check the SSE event format rather than eyeballing it. Sound right?

**You say:** "Yes, that's better than eyeballing. Approve the skeleton."

```
gp slice:plan-draft real-time-notifications/01_tracer-bullet < { artifactPath: "plan.md" }
  -> slice-plan-drafted { chunkCount: 4 }
```

#### P8: Plan-shape checkpoint

Because the steering preference is `always-consult`, the skill formally checkpoints the plan shape. Since you've been collaborating on the draft, this is lightweight -- the shape already reflects your input.

**Behind the scenes:** `plan-shape-checkpoint-reached` event emitted.

**You say:** "Already approved above. Go ahead."

```
gp slice:plan-shape-approve < { userConfirmation: "user approved split" }
  -> plan-shape-approved
```

**The invariant engine now allows refinement to proceed. Without `plan-shape-approved` or `plan-shape-checkpoint-auto-shaped`, `gp refine:start` on the plan would be rejected by the `slice.plan-shape-approval-required` invariant.**

#### P9: Plan refinement (autonomous)

The plan enters the autonomous refinement loop. You step away -- the reviewers work independently.

Reviewers dispatched: always-on trio (holistic, invariant-checker, context-transport), `reviewer-plan`, `reviewer-verification-plausibility` (BLOCKING), plus subsystem reviewers (`reviewer-typescript`, `reviewer-tui-cli`).

```
gp refine:start --artifact-type=plan --rigor=standard
```

**Round 1.** Five reviewers score in parallel.

The `reviewer-verification-plausibility` reviewer flags a BLOCKING finding:

> **BLOCKING on chunk c4:** The red-test ("component test that rendering `<NotificationToast>` with a mock EventSource message displays the toast text") and the verification method ("load page, publish to Redis, observe toast in browser") both verify the same thing at the component level. The red-test should exercise the component in isolation (unit); the verification should exercise the full pipeline (live). Currently, the red-test is a less rigorous version of the verification, not a distinct gate.

The `reviewer-context-transport` reviewer flags an IMPORTANT finding:

> A fresh implementer would not know that the SSE endpoint needs `res.flushHeaders()` to prevent Express's compression middleware from buffering the stream. The plan references the health-check pattern but doesn't call out the compression bypass explicitly. This is a stop-and-figure-out moment.

The `editor` agent applies revisions:
- c4's red-test is rewritten: "Unit test that the `<NotificationToast>` component renders toast text when its `onMessage` prop fires. Run before component exists -- must fail." Now distinct from the live verification.
- c1's description is expanded with the context: "Use the health-check endpoint pattern. Set `Content-Type: text/event-stream`, call `res.flushHeaders()`, and add `x-no-compression` header to bypass the compression middleware."

```
gp refine:revise < { artifactType: "plan", fromPath: "plan-r1.md", toPath: "plan-r2.md" }
```

**Round 2.** Reviewers see the diff only and answer: "did your prior concerns get resolved, and are there new ones in the changed region?"

- `reviewer-verification-plausibility`: prior BLOCKING resolved. No new issues. Score: pass on all dimensions.
- `reviewer-context-transport`: prior IMPORTANT resolved -- the compression bypass is now explicit. Score: 4/5 on `fresh-implementer-completeness`.

```
gp refine:evaluate -> CONVERGED
gp refine:converge
gp slice:plan-commit real-time-notifications/01_tracer-bullet
  -> slice-plan-committed { extracted: PlanExtract }
```

The `PlanExtract` captures the structured chunk data -- IDs, descriptions, expectations, red tests, verification methods, verification types. The CLI extracts this, not the LLM.

### P10 -- Implementing the tracer-bullet slice (autonomous)

Implementation is autonomous. You can step away -- the LLM works through red-green-verify for each chunk independently. It will only pause for reactive triggers (R1 trade-off shifts, unverifiable chunks).

**You see:**

> Plan committed. Ready to implement slice 01: tracer-bullet (4 chunks).
>
> **Pre-flight:**
> - **What I'm about to do:** Implement 4 chunks in sequence (c1-c4). Each chunk follows red-green-verify: write a failing test, implement until it passes, then verify live.
> - **What I'll return with:** Working end-to-end notification pipeline: BullMQ event -> Redis pub/sub -> SSE endpoint -> frontend toast.
> - **What would make me pause:** If the SSE endpoint setup breaks existing API routes (R1 -- trade-off shift). If the compression middleware interaction is harder than expected (R1 -- assumption invalidated). If any verification step fails in a way that suggests the plan is wrong, not just the code.
> - **Known context:** The health-check endpoint in `src/api/routes/health.ts` uses the long-lived response pattern. BullMQ queues are configured in `src/jobs/queues.ts`. Compression middleware needs bypassing for SSE.
>
> Anything to correct?

**You say:** "Go ahead." You grab lunch -- this will take a while.

```
gp slice:implement-start real-time-notifications/01_tracer-bullet
  -> slice-implementation-started
```

#### Chunk c1: SSE endpoint setup

```
gp slice:chunk-start --chunk=c1
  -> slice-implementation-chunk-started { chunkId: "c1" }
```

**Red phase.** The implement-phase agent writes the red test as specified in the plan: a test that hits the SSE endpoint and expects `Content-Type: text/event-stream` with the connection staying open. The test is run. It fails -- the SSE endpoint doesn't exist yet.

```
gp slice:chunk-red-written --chunk=c1 < { testPath: "src/notifications/__tests__/sse-endpoint.test.ts", diffPath: "..." }
  -> chunk-red-test-written
```

The agent runs the test. Output captured: `FAIL: 404 Not Found at GET /api/notifications/stream`.

```
gp slice:chunk-red-failed --chunk=c1 < { runOutputPath: "...", failureMatchesIntent: true }
  -> chunk-red-test-failed { failureMatchesIntent: true }
```

The invariant `chunk.red-test-failed-before-green` is now satisfied for c1.

**Green phase.** The agent creates `src/notifications/sse-endpoint.ts` using the health-check pattern: `res.setHeader('Content-Type', 'text/event-stream')`, `res.setHeader('Cache-Control', 'no-cache')`, `res.setHeader('x-no-compression', 'true')`, `res.flushHeaders()`. Registers the route. Runs the test again. It passes.

```
gp slice:chunk-green --chunk=c1 < { diffPath: "...", runOutputPath: "..." }
  -> chunk-green-achieved
```

**Verify phase.** The agent starts the server and connects with `curl`:

```bash
$ curl -N -H "Authorization: Bearer test-token-123" http://localhost:3001/api/notifications/stream
: heartbeat

: heartbeat
```

The SSE stream is open and sending heartbeat comments. Evidence captured.

```
gp slice:chunk-verify --chunk=c1 < {
  method: "live",
  expectation: "WebSocket client connects and receives welcome message",
  observationPath: "evidence/c1-observation.txt",
  evidencePath: "evidence/c1-full.txt"
}
  -> chunk-verified { matched: true }
```

The invariant `chunk.evidence-non-empty` verifies that `observation.bytes > 0` and `evidenceRef.bytes > 0`.

#### Chunks c2 and c3: Redis pub/sub pipeline

Similar pattern. c2: write failing test for BullMQ-to-Redis publishing, implement, verify by triggering a test job and observing the message on `redis-cli subscribe`. c3: write failing test for Redis-to-SSE forwarding, implement, verify by publishing a test message to Redis and observing it arrive as an SSE event via `curl -N` piped to `grep`.

Both chunks pass red-green-verify.

#### Chunk c4: Frontend toast (with a verification challenge)

**Red phase.** The agent writes a unit test: render `<NotificationToast>` with a mock EventSource message, assert the toast text appears. The test fails (component doesn't exist yet). Good.

**Green phase.** The agent implements the component and the EventSource client hook. The unit test passes.

**Verify phase.** The plan says: "load the page, publish to Redis, observe the toast appears in the browser." The agent starts the dev server, triggers a notification through the full pipeline, and... it needs to observe the toast in a browser.

**You see:**

> **Verification pause for chunk c4.**
>
> The verification method requires observing a toast notification in the browser. I can verify the pipeline is working (the WebSocket message arrives at the client -- I can see this in the browser console). However, I cannot visually confirm that the toast *renders correctly* in the UI -- that requires human eyes.
>
> I have three options:
>
> 1. **Accept approximation** -- I verify the SSE event arrives at the client and the component's test suite passes. The gap: visual rendering correctness is unverified.
> 2. **Awaiting user verification** -- I mark this chunk as needing your visual check. You'll verify after this slice lands.
> 3. **Redesign the verification** -- We could add a screenshot-based assertion using a headless browser, but that adds scope to this chunk.
>
> What do you prefer?

This is the Unverifiable-Chunk Decision from the Pause Discipline. The trigger is `unverifiable-chunk` -- a reactive pause that **ignores the steering preference** and always surfaces to the user.

**You say:** "Accept approximation. The component test covers rendering, and I'll eyeball it when I review the PR."

```
gp slice:chunk-unverifiable --chunk=c4 < {
  reason: "Visual rendering correctness requires human observation",
  attemptsPath: "evidence/c4-attempts.txt"
}
  -> chunk-unverifiable

gp slice:chunk-decide --chunk=c4 < {
  choice: "accept-approximation",
  reason: "Component test covers rendering; user will verify visually at PR review",
  limitation: "Visual rendering correctness unverified by model"
}
  -> chunk-unverifiable-decided
```

All chunks are now decided: c1-c3 have `chunk-verified { matched: true }`, c4 has `chunk-unverifiable-decided { choice: "accept-approximation" }`. The invariant `chunk.all-decided` holds.

### P11 -- Code refinement

```
gp slice:code-refine-start real-time-notifications/01_tracer-bullet
  -> slice-code-refinement-started
```

Code-quality reviewers are dispatched against the full slice diff: `reviewer-performance`, `reviewer-reliability`, `reviewer-security`, `reviewer-domain-correctness`, `reviewer-test-meaningfulness`, `reviewer-code-style`, plus `reviewer-typescript` (subsystem-specific).

**Round 1 findings:**

- `reviewer-reliability` (IMPORTANT): "The SSE endpoint has no connection limit. A malicious client could open thousands of connections and exhaust server memory. Add a `maxConnections` check in the endpoint middleware."
- `reviewer-test-meaningfulness` (MINOR): "The test in `sse-endpoint.test.ts` asserts on the heartbeat comment text. This is an implementation detail -- consider asserting on response headers and stream behavior rather than exact string."
- `reviewer-security` (pass): "SSE endpoint goes through Express auth middleware, so unauthenticated connections are structurally impossible. Input validation at trust boundary is present."

The editor agent fixes the reliability issue (adds a connection counter with `maxConnections: 1000` to the SSE endpoint) and updates the test assertion.

**Round 2:** Prior concerns resolved. No new issues. Convergence achieved.

```
gp slice:code-refine-commit < { finalDiffPath: "...", rounds: 2 }
  -> code-refinement-converged { roundsTaken: 2 }
```

### P12 -- Slice land

```
gp slice:land real-time-notifications/01_tracer-bullet
```

The `completion-slice` agent runs four substeps:

**1. Spine promotion.** `architecture-current.md` is updated to reflect the honest post-slice reality:

> **notifications** (experimental) -- SSE transport implemented. Single notification type (job-completed) flows end-to-end. Auth via existing Express middleware (no workaround needed). Persistence not yet implemented (slice 02). Connection limit at 1000.

This is the honest-intermediate-state rule in action: mid-implementation is described as mid-implementation. The architecture delta goes through light refinement (holistic + invariant-checker + context-transport) before committing.

**2. Discovery Ledger triage.** During implementation, one finding was captured:

> **Finding:** The compression middleware buffers SSE responses even with `x-no-compression` header on some Express versions. Had to use `res.flushHeaders()` before writing the first event, not just at connection time.
>
> - Blocking? No -- the workaround is in place.
> - In scope? Yes -- already addressed in this slice.
> - Disposition: `addressed` (captured as learning)

```
gp finding:triage < { findingId: "...", disposition: "addressed", rationale: "compression workaround implemented and documented" }
  -> finding-triaged
```

**3. Learnings captured.**

```
gp learning:capture < {
  category: "worked",
  summary: "Redis pub/sub integrates cleanly with BullMQ's existing Redis connection. No additional infrastructure needed.",
  tags: ["redis", "bullmq", "pub-sub"],
  subsystems: ["notifications", "jobs"]
}
  -> learning-captured

gp learning:capture < {
  category: "do-differently",
  summary: "SSE endpoints need res.flushHeaders() before EVERY write, not just at connection time, when compression middleware is present.",
  tags: ["sse", "express", "compression"],
  subsystems: ["notifications", "api-layer"]
}
  -> learning-captured
```

**4. User review.**

**You see:**

> **Slice 01 (tracer-bullet) complete.**
>
> **What landed:** End-to-end notification pipeline -- BullMQ job completion -> Redis pub/sub -> SSE endpoint -> frontend toast. Auth via existing Express middleware (no special handling needed).
>
> **Architecture updates:** `notifications` subsystem added to `architecture-current.md` as experimental.
>
> **Findings:** 1 finding addressed (compression middleware interaction).
>
> **Learnings:** 2 learnings captured (Redis pub/sub integration, SSE compression workaround).
>
> **Verification note:** Chunk c4 (frontend toast) was verified by approximation -- component tests pass but visual rendering unverified. Please check the toast component at your convenience.
>
> Ready for the next slice?

```
  -> slice-landed
  -> milestone-committed { label: "slice 01 tracer-bullet landed" }
```

### Between-slice review (optional checkpoint)

After slice 01 lands, the workflow offers an optional review before starting the next slice. This checkpoint respects the steering preference.

**You see:**

> Slice 1 (tracer-bullet) is done and landed. Here's what shipped: SSE endpoint with one notification type flowing end-to-end, including frontend toast. Architecture-current.md now includes the notification subsystem at experimental maturity.
>
> Before I start planning slice 2 (notification-persistence), want to review the implementation or adjust the approach?

**You say:** "Let me take a quick look at the SSE endpoint code... looks clean. One thing -- I noticed the heartbeat interval is every 30 seconds. That's pretty frequent for a keep-alive. Can we make that 60 seconds? And make sure slice 2's plan accounts for the `Last-Event-ID` header -- we'll need that for reconnection catch-up later in slice 5."

**Behind the scenes:** The LLM notes the heartbeat adjustment (small fix, applied immediately) and the `Last-Event-ID` foresight (captured as a finding for slice 5's planning context).

### Remaining slices -- the rhythm

The remaining slices follow the same rhythm. Here is how they play out at a higher level:

**Slice 02: notification-persistence.** Collaborative plan draft (you suggest using a materialized view for unread counts based on your experience with similar systems) -> shape-checkpoint (quick, since you were involved in drafting) -> autonomous refinement -> autonomous implementation (4 chunks: migration, model, queries, API endpoints) -> code-refine -> land. Straightforward. Architecture-current updated: "Persistence implemented. Notifications table with user_id index. Unread counts via materialized view."

**Slice 03: notification-routing.** This is the known-unknown slice -- the routing module whose complexity you flagged during architecture design.

**An R1 moment during slice 03.** Mid-implementation on chunk c2 (implementing event-type routing rules), the agent discovers something:

**You see:**

> **Pausing -- trade-off-shifting discovery.**
>
> *"If the user knew this, would they want to reconsider?"*
>
> **What I was doing:** Implementing routing rules that determine which users receive notifications for a given event type.
>
> **What I found:** The BullMQ job data doesn't include enough context to route notifications accurately. For example, a `task-completed` event has the task ID but not the project ID or the list of users watching that task. The routing module needs to query the database to resolve recipients, which means the notification pipeline now has a synchronous database dependency on the hot path.
>
> **Why this matters:** Every notification event triggers a database query to resolve recipients. At high event volumes, this becomes a bottleneck. This is the routing complexity you predicted during architecture design.
>
> **Options:**
> 1. **Expand current slice** -- add a recipient-resolution cache (Redis) that pre-computes recipient lists when subscriptions change. Moderate scope addition.
> 2. **Simplify routing** -- for now, include recipient IDs in the BullMQ job data (the event producer knows the recipients). This moves the complexity upstream but keeps the pipeline simple.
> 3. **Defer as finding** -- accept the database query for now, optimize later.
>
> **My recommendation:** Option 2 (simplify). The event producers already know the relevant users. Enriching the job data is a small change in the jobs subsystem, and it keeps the notification pipeline stateless.

**You say:** "Option 2, but capture a finding that this means event producers are coupled to the notification model. That's a trade-off we should revisit."

The finding is captured and triaged as `defer-task`. The plan is revised. Implementation continues with the simplified routing approach.

**Slice 04: notification-center-ui.** Depends on slices 01 and 02 (both landed). The `slice.deps-landed-before-start` invariant passes. Collaborative plan draft: you and the LLM design the component breakdown together (notification list, individual notification card, mark-as-read, infinite scroll). Implementation is autonomous -- two chunks where verification is `live` (start dev server, load page, observe notification list renders with test data) and one where the agent uses the browser dev tools to verify scroll behavior.

**Between-slice review after slice 04:** You come back and review:

> **You see:** "Slice 4 (notification-center-ui) landed. The notification center is working with infinite scroll and mark-as-read. Before slice 5 (preferences-and-resilience), want to review?"
>
> **You say:** "Quick look... the mark-as-read animation feels sluggish. Can you capture that as a finding? Not blocking, but I want to revisit it."

**Slice 05: preferences-and-resilience.** The merged slice. During collaborative plan drafting, you suggest separating the preferences work from the reconnection work into distinct chunks rather than interleaving them. The LLM agrees. Implementation goes cleanly. A learning is captured: "Zod schemas for notification preferences shared between frontend and API via the `shared` subsystem work cleanly for real-time validation." Reconnection verification: kill server, observe `EventSource` auto-reconnect, observe `Last-Event-ID` header sent on reconnect, observe missed events replayed.

### Return from absence (between slices 03 and 04)

You come back after a day away. You start a new Claude Code session.

**You type:** `/gp:status`

**You see:**

> **Orientation -- real-time-notifications epic**
>
> *Today is 2026-04-12. You last worked on this 2026-04-11.*
>
> **Current position:** Epic `real-time-notifications`, slice 03 (notification-routing) just landed. Slices 01-03 complete, slices 04-05 remaining.
>
> **Where you stopped:** Slice 03 landed successfully. Notification routing is implemented with simplified recipient resolution (event producers include recipient IDs in job data).
>
> **What happened since you left:** Nothing -- the workflow paused at the slice boundary.
>
> **Next action:** Plan slice 04 (notification-center-ui). It has no unresolved dependencies.
>
> **Attention items:**
> - Chunk c4 of slice 01 still has an `accept-approximation` verification. You mentioned you'd visually check the toast component.
> - The accepted SSE scaling constraint (10k connections) from the pressure test is still tagged in the architecture.
> - Deferred finding: event producers coupled to notification model (from slice 03).
>
> Ready to continue with `/gp:plan-slice real-time-notifications/04_notification-center-ui`?

**Behind the scenes:** The `gp:status` skill read the most-recent `briefing-written` event for the epic scope. The briefing was written at slice 04's landing milestone. The `BriefingExtract` provides: `timeContext`, `currentPosition`, `lastActionNarrative`, `whereStopped`, `nextAction`, and `attentionItems`. This is orientation, not reconstruction -- the briefing was written when context was fresh.

### P13 -- Epic land

All five slices have landed. You type:

```
/gp:complete-epic
```

**Behind the scenes:** The invariant `epic.all-slices-landed-before-complete` checks that every `slice-created` event has a corresponding `slice-landed` or `slice-abandoned`. All five have `slice-landed`. Entry condition met.

The `completion-epic` agent runs. It produces:

**1. Architecture reconciliation.** `architecture-target.md` (what we planned) is compared against `architecture-current.md` (what we actually built). In this case, they're close -- the main differences:

- Target said "SSE transport with WebSocket as future option." We built SSE only -- WebSocket was kept as an architectural option but not implemented. The reconciliation notes: "WebSocket option preserved in architecture but not implemented."
- The simplified recipient resolution (from the slice 03 R1 moment) was not in the original target. `architecture-current.md` already reflects it (promoted at slice 03 land), but `architecture-target.md` didn't. The target is updated.

The reconciliation goes through light-to-standard refinement.

```
gp epic:architecture-commit < { artifact: "architecture-current.md (reconciled)" }
  -> architecture-current-reconciled { reconciliationMethod: "auto", changesFromEpic: ["notifications subsystem added", "auth subsystem modified", "data-layer tables added", "frontend components added"] }
```

**2. Cross-slice learnings synthesis.** The learnings captured across slices are synthesized:

> - Redis pub/sub + BullMQ integration is seamless (slice 01)
> - SSE endpoints need careful compression middleware handling (slice 01)
> - Simplified recipient resolution keeps the notification pipeline stateless but couples event producers (slice 03)
> - Zod shared schemas work well for real-time validation (slice 05)
> - EventSource auto-reconnection with `Last-Event-ID` works reliably; no custom reconnection logic needed (slice 05)

**3. Maturity reconciliation.** The `notifications` subsystem was experimental throughout the epic. The completion agent asks: did it mature?

> The `notifications` subsystem now has: 6 API endpoints, a data model with 3 tables, SSE transport with auth, reconnection with event replay, routing rules, user preferences. 4 other subsystems depend on it. This looks like `stabilizing`, not `experimental`.
>
> Proposed maturity transition: `notifications` experimental -> stabilizing.

```
gp subsystem:update-maturity notifications < { to: "stabilizing", rationale: "6 endpoints, 3 tables, 4 dependents, production-ready after this epic" }
  -> subsystem-maturity-updated
```

**4. Side quest proposals.** Two proposals emerge from findings captured during the epic:

> 1. **WebSocket transport option** -- the architecture preserves the option for WebSocket if bidirectional communication is needed in the future. Propose as a side quest for when real-time features require client-to-server messaging.
> 2. **Recipient resolution decoupling** -- slice 03 simplified routing by having event producers include recipient IDs. The broader pattern (a recipient resolution service that event producers don't need to know about) would decouple the systems. Propose as a side quest.

**5. Final briefing.**

**You see:**

> **Epic complete: real-time-notifications**
>
> **What was built:** End-to-end real-time notification system. SSE transport, PostgreSQL persistence, notification routing, notification center UI, user preferences, reconnection with event replay. 5 slices, all landed.
>
> **Architecture changes:** `notifications` subsystem added (stabilizing). `data-layer`, `frontend` subsystems modified. `auth` subsystem unchanged (SSE goes through existing middleware). All changes reflected in `architecture-current.md`.
>
> **Pressure test outcomes:** 5 findings at the start; 2 addressed in implementation, 3 accepted with justification (SSE scaling cliff at 10k, Redis single-instance assumption, per-user model lock-in). All remain tagged in the architecture as known constraints.
>
> **Maturity transitions:** `notifications` experimental -> stabilizing.
>
> **Proposed side quests:**
> 1. WebSocket transport option (for future bidirectional needs)
> 2. Recipient resolution decoupling
>
> **Open items:**
> - Chunk c4 of slice 01 still has `accept-approximation` verification (visual toast check). Did you get a chance to verify?
>
> The epic branch is ready to merge to main.

```
  -> epic-synthesis-committed
  -> epic-completed
  -> milestone-committed { label: "epic real-time-notifications completed" }
```

### After the epic

`gp status` shows:

```json
{
  "project": {
    "initialized": true,
    "subsystems": [
      { "slug": "api-layer", "maturity": "stabilizing" },
      { "slug": "data-layer", "maturity": "stabilizing" },
      { "slug": "auth", "maturity": "stabilizing" },
      { "slug": "frontend", "maturity": "stabilizing" },
      { "slug": "shared", "maturity": "stabilizing" },
      { "slug": "jobs", "maturity": "experimental" },
      { "slug": "notifications", "maturity": "stabilizing" }
    ],
    "activeEpic": null,
    "activeSideQuest": null,
    "totalEvents": 247,
    "lastMilestone": "epic real-time-notifications completed",
    "proposedSideQuests": ["WebSocket transport option", "Recipient resolution decoupling"]
  }
}
```

The `architecture-current.md` now accurately reflects the system with 7 subsystems. Learnings are captured and tagged by subsystem so they surface when relevant subsystems are touched by future epics. The epic directory is preserved as history:

```
.goodplan/epics/2026-04-09_real-time-notifications_b7k2z8/
  events.jsonl              # full epic event log (200+ events)
  goal.md
  architecture-target.md    # reconciled with current
  pressure-test.md
  slice-set.md
  research/
    2026-04-09_websocket-auth-integration_m3p7q2.md
    2026-04-09_bullmq-event-patterns_k8n2w5.md
    2026-04-09_frontend-polling-patterns_j4v8n1.md
    2026-04-09_sse-auth-middleware_p5w3k7.md
  slices/
    01_tracer-bullet/
      goal.md
      plan.md
    02_notification-persistence/
      goal.md
      plan.md
    03_notification-routing/
      goal.md
      plan.md
    04_notification-center-ui/
      goal.md
      plan.md
    05_preferences-and-resilience/
      goal.md
      plan.md
  epic-land.md              # synthesis artifact
```

---

## Walkthrough 3: Completing a Side Quest

During the notifications epic (slice 03), you discovered that event producers are coupled to the notification model -- they include recipient IDs in the BullMQ job data. You proposed decoupling this as a side quest during epic land. Now the epic is done and you want to tackle it.

### S0 -- Side quest capture

You type:

```
/gp:create-side-quest recipient-resolution-service
```

**Behind the scenes:**
```
gp side-quest:create --slug=recipient-resolution-service
  -> side-quest-created { slug: "recipient-resolution-service", dir: "2026-04-14_recipient-resolution-service_q9r3t5", parentEpic: "real-time-notifications" }
```

**You see:** The LLM begins the design-tree interview, but lighter than an epic:

> What specifically do you want to achieve with recipient resolution decoupling?
>
> From the finding captured during the notifications epic: "Event producers currently include recipient IDs in BullMQ job data. This couples the jobs subsystem to the notification model -- every event producer needs to know who should receive notifications."
>
> **Design branches I see:**
> ```
> Recipient resolution decoupling
>  +-- Centralized resolution service
>  |    +-- Subscription-based (users subscribe to event types / entities)
>  |    +-- Rule-based (declarative routing config)
>  +-- Resolution timing
>  |    +-- At publish time (eager, current approach but centralized)
>  |    +-- At delivery time (lazy, query when notification dispatched)
>  |    +-- Pre-computed (cache recipient lists, update on subscription change)
>  +-- Integration approach
>       +-- Middleware in the notification pipeline
>       +-- Separate service called by the notification subsystem
> ```
>
> Anything I missed?

**You say:** "Add a branch for 'hybrid eager/lazy' -- I'm thinking we pre-compute for high-frequency events but resolve lazily for rare ones."

### S1 -- Explore and plan (collaborative explore, then autonomous plan refinement)

The `gp:create-side-quest` skill continues into S1.

#### Quick research cycle (autonomous)

The LLM reads the notification routing code, examines how event producers currently embed recipient IDs, and checks the subscription data model.

#### Brainstorm session (collaborative)

**You see:**

> Quick research done. Here's what I found:
>
> - 4 event producers in the jobs subsystem currently include recipient IDs. Each does its own recipient lookup before publishing.
> - The `notification_subscriptions` table (from slice 02) already has the data needed for centralized resolution -- it maps users to event types and entity IDs.
> - The highest-frequency event (`task-status-changed`) fires ~200 times/day. At this volume, lazy resolution is fine -- no need for pre-computation.
>
> Given the low volume, I'd recommend the simplest approach: a resolution middleware in the notification pipeline that looks up recipients from the subscriptions table when a notification event arrives. Event producers just emit the event with entity context (task ID, project ID) -- no recipient IDs needed.
>
> This means the jobs subsystem stops knowing about notifications entirely. Clean decoupling.

**You say:** "I like the middleware approach. But what about the hybrid branch I suggested? Is there a case where pre-computation would matter?"

**You see:**

> At your current scale, no. Pre-computation adds complexity (cache invalidation when subscriptions change, stale-recipient risk) for no measurable benefit at 200 events/day. If you hit 10k+ events/day, the database query per event becomes a concern and pre-computation would help. But that's the same scale where you'd also hit the SSE connection limit -- it's a future-epic problem.
>
> I'd build the simple middleware now and capture "add pre-computation cache at scale" as a task for later.

**You say:** "Agreed. Simple middleware it is."

```
gp side-quest:goal-commit < { artifactPath: "goal.md" }
  -> side-quest-goal-committed { extracted: SideQuestGoalExtract }
```

**The directory:**

```
.goodplan/side-quests/2026-04-14_recipient-resolution-service_q9r3t5/
  events.jsonl
  goal.md
```

#### Plan draft (autonomous after goal)

The LLM drafts the plan based on the collaborative brainstorm conclusions.

**You see:** The plan draft:

> **Plan for recipient-resolution-service** (3 chunks)
>
> | Chunk | Description | Red test | Verification |
> |---|---|---|---|
> | c1 | Create `resolveRecipients` middleware in `src/notifications/routing/resolve.ts`. Given an event type and entity context, query `notification_subscriptions` to return recipient user IDs. | Unit test: call `resolveRecipients({ eventType: "task-completed", entityId: "task-123" })` expecting a list of subscribed user IDs. Run before module exists -- must fail. | `live`: Insert test subscriptions, call resolver, observe correct recipients returned. |
> | c2 | Integrate resolver into the notification pipeline. Remove recipient IDs from BullMQ job data. Events now carry only entity context; the pipeline resolves recipients. | Integration test: publish a `task-completed` event *without* recipient IDs, assert that subscribed users receive the notification. Run before pipeline change -- must fail (no recipients resolved). | `live`: Trigger a real job completion, observe correct users notified without explicit recipient IDs in the job data. |
> | c3 | Remove recipient-embedding code from the 4 event producers in the jobs subsystem. Each producer now emits events with entity context only. | Unit test per producer: assert the job data does *not* contain a `recipientIds` field. Run before producer changes -- must fail (they still include recipients). | `live`: Trigger each event type, observe notifications delivered correctly via the resolver. |

**Plan-shape checkpoint.** The skill checks the steering preference. Side quests inherit the project-level default (if set) or fall back to `ask-in-the-moment`. Since no project default is set, it asks:

> Plan drafted. Want to review the skeleton before I refine it, or should I best-guess and proceed?

**You say:** "Looks good, proceed."

```
gp side-quest:plan-shape-approve < { userConfirmation: "user approved" }
  -> plan-shape-approved
```

The plan enters refinement. The side quest defaults to minimum-rigor routing. Reviewers: always-on trio + `reviewer-plan` + `reviewer-verification-plausibility` (still BLOCKING even at minimum rigor).

Round 1: `reviewer-verification-plausibility` passes all chunks. `reviewer-context-transport` flags one IMPORTANT: "Chunk c3 removes recipient IDs from 4 event producers, but a fresh implementer wouldn't know which 4 files to change. List them explicitly." The editor adds: "The 4 producers are in `src/jobs/producers/task-status.ts`, `src/jobs/producers/job-completion.ts`, `src/jobs/producers/comment-added.ts`, and `src/jobs/producers/payment-processed.ts`."

Round 2: CONVERGED.

```
gp side-quest:plan-commit < { artifactPath: "plan.md" }
  -> side-quest-plan-committed
```

### S2 -- Implementation (autonomous)

```
gp side-quest:implement-start recipient-resolution-service
```

**Pre-flight:**

> **What I'm about to do:** Implement 3 chunks -- resolution middleware, pipeline integration, producer cleanup.
> **What I'll return with:** A decoupled notification pipeline where event producers don't know about recipients. All existing notifications still work.
> **What would make me pause:** If any event producer has special recipient logic that can't be expressed as a subscription query. If the subscription table is missing data needed for resolution.
> **Known context:** The `notification_subscriptions` table has `(user_id, event_type, entity_id)` tuples. 4 event producers currently embed recipient IDs.

**Chunk c1: Recipient resolution middleware.**

**Red:** Write test -- `import { resolveRecipients } from '../notifications/routing/resolve'`. Call with test event context. Expect subscriber list. Run: FAIL (module doesn't exist).

**Green:** Create `src/notifications/routing/resolve.ts`. Query `notification_subscriptions` for matching event type and entity. Run test: PASS.

**Verify:** Insert test subscriptions, call resolver, observe correct recipients returned.

Evidence captured. `chunk-verified { matched: true }`.

**Chunk c2: Pipeline integration.**

**Red:** Integration test: publish a `task-completed` event without recipient IDs. Assert subscribed users receive notification. Run: FAIL (pipeline still expects `recipientIds` in the event data).

**Green:** Modify the notification pipeline to call `resolveRecipients` when `recipientIds` is not present in the event data. This is backward-compatible -- events that still include `recipientIds` work unchanged. Run test: PASS.

**Verify:** Trigger a real job completion (without recipient IDs), observe correct users notified.

**Chunk c3: Producer cleanup.**

**Red:** Unit test per producer: assert job data does *not* contain `recipientIds`. Run: FAIL (all 4 still include it).

**Green:** Remove recipient-embedding code from each producer. They now emit events with entity context only (`{ eventType, entityId, entityContext }`). Run tests: PASS.

**Verify:** Trigger each event type, observe notifications delivered correctly.

All chunks decided. Code refinement runs (one round, clean).

### S3 -- Side quest land

```
gp side-quest:land recipient-resolution-service
```

The `completion-side-quest` agent runs a lighter version of slice-land:

**Learnings captured:**

```
gp learning:capture < {
  category: "worked",
  summary: "Backward-compatible pipeline changes (check for field presence, fall back to resolver) allow incremental migration of event producers without a coordinated cutover.",
  tags: ["decoupling", "migration", "notifications"],
  subsystems: ["notifications", "jobs"]
}
  -> learning-captured
```

This learning is tagged to the `notifications` and `jobs` subsystems. The next time someone touches either, it will surface in the context bundle.

**Spine update proposal.** The completion agent proposes an update to the `notifications` subsystem doc:

> **notifications** subsystem update:
> - New internal module: `src/notifications/routing/resolve.ts` (recipient resolution middleware)
> - Event producers no longer include `recipientIds` -- the pipeline resolves recipients from `notification_subscriptions`
> - The `jobs` subsystem no longer depends on the notification model for recipient information

Side quests do not produce spine updates *unless* the completion agent proposes them and the user accepts. This is one of those cases.

**You see:**

> The completion agent proposes updating the `notifications` and `jobs` subsystem docs to reflect the decoupled recipient resolution. This changes the communication pattern between the two subsystems. Accept the update?

**You say:** "Yes."

The subsystem docs are updated through light refinement and committed.

```
  -> side-quest-landed
  -> milestone-committed { label: "side quest recipient-resolution-service landed" }
```

**The directory:**

```
.goodplan/side-quests/2026-04-14_recipient-resolution-service_q9r3t5/
  events.jsonl
  goal.md
  plan.md
```

**How findings propagate back.** The learning captured during this side quest ("backward-compatible pipeline changes allow incremental migration") is tagged to the `notifications` and `jobs` subsystems. When a future epic touches either, this learning will appear in the P7 plan-draft context bundle under "recent learnings filtered by subsystem tag."

The side quest also captured a finding during implementation: "The `resolveRecipients` query joins `notification_subscriptions` with `notification_preferences` to filter out users who have disabled that event type. At scale, this join could be expensive without a composite index." This finding was triaged as `defer-task` -- too small for a side quest, not blocking, but worth tracking.

After the side quest, `gp status` shows:

```json
{
  "project": {
    "activeEpic": null,
    "activeSideQuest": null,
    "totalEvents": 285,
    "lastMilestone": "side quest recipient-resolution-service landed",
    "subsystems": [
      { "slug": "notifications", "maturity": "stabilizing" }
    ],
    "pendingTasks": 1,
    "recentLearnings": [
      "Backward-compatible pipeline changes allow incremental migration of event producers..."
    ]
  }
}
```

The workflow is idle, waiting for the next idea.

---

## Appendix: Mechanics Reference

Key mechanics demonstrated across these walkthroughs:

| Mechanism | Where demonstrated |
|---|---|
| Design-tree interviewing (with LLM acknowledging tree limitations) | Walkthrough 2, P1 |
| Steering preference (always-consult) | Walkthrough 2, P1 and P8 |
| Collaborative exploration (research/brainstorm/assess cycle) | Walkthrough 2, P2 |
| Collaborative architecture design | Walkthrough 2, P3 |
| Architecture-shape checkpoint (collaborative-to-autonomous transition) | Walkthrough 2, between P3 and P4 |
| Pre-flight discipline (structured format) | Walkthrough 2, P10 |
| R1 blocking discovery ("if the user knew this...") | Walkthrough 2, slice 03 mid-implementation |
| Red-green-verify loop | Walkthrough 2, P10 (all chunks) |
| Unverifiable chunk decision | Walkthrough 2, P10 chunk c4 |
| Pressure test ("errors made impossible") | Walkthrough 2, P4 |
| Accept-with-justification as first-class outcome | Walkthrough 2, P4 (SSE scaling cliff) |
| Refinement convergence (reviewer sees diff in round 2) | Walkthrough 2, P9 and P11 |
| Collaborative plan drafting | Walkthrough 2, P7 |
| Plan-shape checkpoint respecting steering preference | Walkthrough 2, P8 |
| Slice-shape checkpoint (user steers slice structure) | Walkthrough 2, between P5 and P6 |
| Between-slice review (optional checkpoint) | Walkthrough 2, between slice 01 and slice 02 |
| Discovery matrix / finding triage (2x2) | Walkthrough 2, slice 03 R1 moment |
| Honest intermediate state in spine promotion | Walkthrough 2, P12 |
| Return-from-absence orientation via briefing | Walkthrough 2, between slices 03 and 04 |
| Maturity reconciliation at epic land | Walkthrough 2, P13 |
| Side quest proposals at epic land | Walkthrough 2, P13 |
| Side quest collaborative brainstorm (compressed) | Walkthrough 3, S1 |
| Learning propagation by subsystem tag | Walkthrough 3, S3 |
| Invariant enforcement (plan-shape-approval-required) | Walkthrough 2, P8/P9 boundary |
| Milestone commits at phase boundaries | Throughout |
| Context bundle per phase | Throughout (noted in behind-the-scenes) |
| Expand-current-slice reshape option | Walkthrough 2, slice 03 R1 moment |
| User domain knowledge redirecting technical approach | Walkthrough 2, P2 (CDN constraint -> SSE pivot) |
