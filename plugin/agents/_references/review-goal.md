# Goal Review Criteria

Domain-specific evaluation criteria for the goal reviewer. Evaluates the quality of goal definitions (epic, slice, or side-quest goals) — clarity, measurability, scope, and success criteria. Does NOT evaluate technical feasibility (domain reviewers) or project alignment (holistic reviewer).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- The project's existing goals and how they're structured (`.goodplan/epics/`, `.goodplan/quests/`)
- Related architecture documents — does the goal reference concepts that exist in the codebase?
- Existing implementation — is the goal's starting-point assumption about current state accurate?
- Project conventions (CLAUDE.md, `.goodplan/conventions.md`) — does the goal use consistent terminology?

## Evaluation Criteria

1. **Clarity**: Can a reader understand exactly what this goal aims to achieve in one reading?
   Consider: vague goals like "improve the auth system" leave room for interpretation. Clear goals state the specific change: "add JWT refresh token rotation with 7-day sliding window expiry." If a reader has to ask "what exactly do you mean?", the goal lacks clarity.

2. **Measurability**: Can you objectively determine when this goal is complete?
   Consider: "make the API faster" is not measurable. "Reduce p95 latency for `/api/projects` from 800ms to under 200ms" is measurable. Each goal should have at least one concrete, observable condition that marks completion. Goals without measurable outcomes lead to scope creep and "are we done yet?" debates.

3. **Scope definition**: Are the boundaries of the goal explicit?
   Consider: what's included vs. excluded. A goal to "add user authentication" — does that include OAuth? Password reset? Email verification? 2FA? Without explicit scope, planners will either under- or over-scope the implementation.

4. **Non-goals**: Are things that might seem in-scope but are explicitly excluded listed?
   Consider: non-goals prevent scope creep and misunderstandings. "Non-goal: we are NOT adding OAuth provider support in this slice — that's a separate slice." Missing non-goals is IMPORTANT, not CRITICAL — but their absence often leads to scope problems downstream.

5. **Success criteria concreteness**: Are success criteria specific enough to write verification steps from?
   Consider: "users can log in" is vague. "POST /auth/login with valid credentials returns 200 with a JWT; invalid credentials return 401 with error message" is concrete. Success criteria should be translatable into test assertions without interpretation.

6. **Context sufficiency**: Does the goal provide enough background for someone unfamiliar with the project to understand why this work matters?
   Consider: a brief motivation ("currently, tokens never expire, creating a security risk") helps planners make better decisions. Goals without context lead to technically correct but strategically wrong implementations.

7. **Dependency awareness**: Does the goal acknowledge what it depends on and what depends on it?
   Consider: "this slice requires the auth middleware from slice 1" makes ordering clear. Missing dependency declarations can cause implementation to stall.

## Examples

**Good (no issues):**
- "Add JWT refresh token rotation: when an access token expires, the client can POST /auth/refresh with a valid refresh token to get a new access/refresh pair. Refresh tokens expire after 7 days of inactivity (sliding window). Non-goal: token revocation (separate slice). Success: refresh endpoint returns new token pair; expired refresh tokens return 401; token rotation invalidates the old refresh token."
- Clear, measurable, scoped, with non-goals and concrete success criteria

**Bad (CRITICAL):**
- "Improve the authentication system" — no clarity on what "improve" means, no success criteria
- Goal contradicts an existing goal or architectural decision without acknowledging the conflict
- Success criteria are impossible to verify ("users feel more secure")

**Bad (IMPORTANT):**
- Goal is clear but has no non-goals — scope boundaries are ambiguous
- Success criteria exist but are too vague to write tests from
- Missing dependency on another slice/epic that would block implementation

**Bad (MINOR):**
- Goal is well-defined but motivation/context section is thin
- Non-goals list could be more comprehensive
- Success criteria are concrete but could be more specific
