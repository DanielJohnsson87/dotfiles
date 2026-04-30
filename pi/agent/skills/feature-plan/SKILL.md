---
name: feature-plan
description: >
  Structured feature planning pipeline with persistent handoff documents.
  Triggered when the user starts a message with "Feature plan:" followed by their description.
  Use this skill for any non-trivial feature work — new features, schema changes, multi-file changes,
  or anything that benefits from structured planning before implementation. Also trigger when the user
  references pipeline stages like "run research", "do a ceo review", "write the impl plan",
  or asks to continue a feature plan.
---

# Feature Plan Pipeline

A structured multi-agent pipeline that breaks feature work into discrete stages with persistent
handoff documents. Each stage produces a markdown file that the next stage can build on.

## Trigger

The user starts a message with `Feature plan:` or `/skill:feature-plan` followed by their description.

## Plans Directory

All pipeline artifacts are stored in `PLANS_DIR` which is `~/plans/<feature-name>/`.

Use kebab-case for `<feature-name>` (e.g., `add-stripe-webhooks`, `user-profile-redesign`).

## Pipeline Stages

```
PLANS_DIR/00-lessons.md        ← Always-available reference. Knowledge from previous iterations.

PLANS_DIR/01-research.md       ← Objective system map. No opinions, no suggestions.
PLANS_DIR/02-brief.md          ← What & why. Collaborative, end-user focused.

PLANS_DIR/03-test-cases.md ┐
PLANS_DIR/03-plan.md       ┘   Flexible. User picks which to run and in what order.

PLANS_DIR/04-impl-plan.md      ← Concrete implementation steps.
PLANS_DIR/05-review.md         ← Post-implementation review.
PLANS_DIR/06-pr.md             ← Prepare PR description, optionally create PR.
```

## Stage Details

### 00-lessons.md
This file is for storing knowledge about what we've learnt in previous iteration attempts. What didn't work, gotchas etc.
- ALWAYS check this file before starting research or planning to avoid repeating past mistakes.
- ALWAYS update this file with new insights, gotchas, and lessons after each iteration attempt, regardless of success or failure.

### Trigger: Interactive Scoping

On trigger, do NOT immediately write any files. Instead, start an interactive conversation to define
the research scope:

- Help the user identify the **area** of the system to explore and the **motivation/symptom** that prompted it.
- **Actively push back** on any solutions, decisions, or technical approaches that sneak into the scope.
  Strip these out and redirect: *"That sounds like a decision — let's save it for the brief. What area of the system should we explore?"*
- Guide the user to a clean, neutral research scope (e.g., "authentication system, with attention to session lifecycle").
- Once both sides agree on the scope, kick off the research stage.

### 01-research.md
Objective, factual documentation of how the system works. Good subagent task.

**This stage must be purely objective. No opinions, no risk assessments, no suggestions, no decisions.**

Document:
- What exists today: functions, files, line numbers
- Program flow and data flow end-to-end
- How the system currently works
- Patterns and conventions **observed** in the codebase — look wider than the immediate area.
  Note code age and compare with patterns in newer parts of the codebase
- External dependencies or APIs involved
- Testing infrastructure: test frameworks in use, existing test patterns/helpers, available test
  environments (local, staging, CI), REST API endpoints usable for verification, existing e2e tests
  that touch this area, how similar features are tested in the codebase
- Use ASCII diagrams and code snippets to illustrate

**Iterative:** After delivering research, ask the user if they want deeper exploration of any area.
Repeat until the user is satisfied with the factual map.

### 02-brief.md
Collaboratively written with the user, **after** research is complete.

The brief is a high-level description of what we want to achieve, written from the end user's
perspective where possible. It should be short, concise, and free of technical details.

- Agent works back-and-forth with the user to draft the brief
- Focus on **what** we want to achieve and **why**
- Minimal technical details — save those for later stages
- Written from the end user's perspective when possible
- Only finalized and written to file when the user explicitly approves

### 03-test-cases.md
High-level acceptance criteria. Optional, user-driven.
- Define what "done" looks like from the user's perspective
- List concrete scenarios to verify
- Identify which verification tools/methods apply to each criterion (e.g., Playwright e2e,
  REST API calls, unit tests, manual verification) — informed by what research discovered
- Do not define test implementations here — those belong in `04-impl-plan.md`

### 03-plan.md
High-level plan grounded in the brief and research.
- Approach and key decisions
- What changes where (broad strokes, not file-by-file)
- Open questions that need answering
- Risks and unknowns
- Question the plan from multiple perspectives (user, business, technical) to identify gaps or risks
- Use ASCII diagrams, state machines, flow charts etc to illustrate and find gaps in the plan before implementation

### 04-impl-plan.md
Concrete implementation steps. Follow TDD where possible.
- Ordered list of changes with specific files to touch
- For each change, define the test first: what test to write, where it lives, what it asserts
- Then define the implementation that makes the test pass
- Dependencies between steps
- Migration plan if needed
- When the research shows diverging patterns between old and new code, prefer newer patterns
  and current language/framework best practices over legacy conventions in the immediate area
- Verification plan: how to run and confirm each step (using tools identified in research and test cases)
- **Team patterns check**: If a review-patterns knowledge base exists for this repo
  (check `~/.config/review-patterns/{owner}--{repo}/knowledge/review-patterns.md`),
  read it and cross-reference the planned changes against known team patterns.
  Flag any steps that would violate team conventions. Cite the pattern name and evidence.
- What "done" looks like

### 05-review.md
Post-implementation review. Written after the work is complete.
- What was actually done (vs. what was planned)
- **Review patterns**: Run `/skill:review-patterns` to check the implementation diff against
  team-specific conventions. Include any findings in the review output.
- What to watch for (monitoring, edge cases)
- Follow-up work identified
- Lessons learned

### 06-pr.md
Prepare a pull request. Written after implementation and review.
1. Read the brief, plan, impl plan, review, and the actual git diff.
2. Check for `.github/pull_request_template.md` in the repo. If it exists, use it as the
   base structure and fill in its fields from the plan artifacts.
3. Ask the user if they also want a **human-readable section** added to the PR description.
   If yes, draft a section that includes:
   - What changed and why (plain language, not a diff summary)
   - How to test: ask the user which server/environment to use, then write step-by-step
     testing instructions (pull from test cases and impl plan verification steps)
   - What to look out for during review
4. Present the full draft to the user for review.
5. Ask the user if they want to create the PR via `gh pr create`.
6. Only create the PR if the user confirms.

## Handoff Contract

Every stage file **except `01-research.md`** must end with these three sections:

```markdown
## Decisions Made
- [List of decisions locked in at this stage]

## Open Questions
- [Unresolved items for future stages]

## Input for Next Agent
- [Key context the next stage needs to start working]
```

The next agent reads `## Input for Next Agent` first, then the full file if needed.

`01-research.md` is exempt — it is a factual map with no decisions or opinions.

## Behavior

1. On trigger, start an **interactive scoping conversation** — do not write any files yet.
2. Once the scope is agreed, run research. Iterate with the user until they're satisfied.
3. After research, collaboratively write the brief with the user.
4. After the brief, **ask the user how they'd like to proceed**. Present the available next stages and let them choose. They may skip stages, jump ahead, or stop.
5. Use subagents for individual stages to keep the main context clean.
6. Each subagent reads all previous `.md` files in `PLANS_DIR` before writing its own.
7. If a stage reveals something that invalidates an earlier stage, flag it to the user rather than silently overwriting.

## Example Flow

```
User: Feature plan: I want to rework auth to use JWT tokens

Agent: "You mentioned JWT tokens — that sounds like a solution rather
       than an area to explore. Can we scope the research as just
       'the authentication system'? What prompted you to look at
       this area?"

User: Users are getting logged out too frequently.

Agent: "Got it. So the research scope is: 'authentication system,
       with attention to session lifecycle.' I'll keep the solution
       space open. Sound good?"

User: Yes.

Agent: [runs subagent, writes 01-research.md]
       "Research complete. Here's what I found about the auth system:
        [summary]. Want me to dig deeper into any area?"

User: No, that covers it. Let's write the brief.

Agent: "Based on the research, here's a draft brief:
        'Users are experiencing frequent unexpected logouts,
         disrupting their workflow. We want sessions to feel
         seamless — users should stay logged in for the duration
         they expect.'
        How does that sound? Anything to add or change?"

User: Perfect.

Agent: [writes 02-brief.md]
       "Brief saved. How would you like to proceed?
        Available: test cases, plan, or skip ahead."

User: Let's go straight to the plan.

Agent: [runs subagent, writes 03-plan.md]
       ...
```
