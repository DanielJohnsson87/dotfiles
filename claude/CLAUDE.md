## Project Files
All paths below are relative to Claude Code's auto-memory directory (`~/.claude/projects/<project>/memory/`).
- Store plans in `memory/plans/<feature-name>/` — referenced as `PLANS_DIR` below.
- Store general lessons in `memory/lessons.md` - referenced as `LESSONS_FILE` below.

## Writing compression rules
Keep writing tight and concise. Avoid unnecessary words, especially in technical writing. Here are some rules to follow:
- Drop filler: "literally", "purely", "fairly", "substantially", "quite", "actually", "the whole",
"Strong ", "That's how long...", "It's worth ing".
- Collapse restatements: if a bullet's bold lead already says X, don't repeat X in the first
sentence.
- Shrink "Possible reads: (a)... (b)... (c)..." lists but keep all enumerated items.
- Merge adjacent short sentences connected by em-dashes where they say one thing.

## Workflow

### Workflow Rules
- NEVER edit code before presenting and getting approval on a plan. Always show your approach first, then wait for confirmation before making changes.
- NEVER commit any code without asking the user first.
- Do not modify auto-generated files (e.g., .d.ts files, phrasebook/translation files). If a change seems needed in an auto-generated file, flag it and ask first.
- When a feature plan or pipeline document exists, always check it first before searching globally or scoping independently. The user's plan docs are the source of truth for task context.
- ALWAYS start by evaluating if there is a existing plan in the `PLANS_DIR` for the current feature. If so, review it before doing any work.
- ALWAYS write detailed plans upfront before doing any implementation. 

### 1. Plan Mode Default
- Use ASCII diagrams when ever possible 
- Always persist your plan as `Feature plan`-ready artifacts:
  - `PLANS_DIR/00-lessons.md` — Store feature specific gotchas, insights and lessons learnt
  - `PLANS_DIR/01-research.md` — objective system map
  - `PLANS_DIR/02-brief.md` — the user's request + relevant context
  - `PLANS_DIR/03-plan.md` — your high-level plan, open questions, risks
  - See `~/.claude/skills/feature-plan/SKILL.md` for the full `Feature plan`.

### 2. Subagent Strategy
- Use subagents liberally to keep main context clean and focused.
- Offload research, exploration and parallel analysis to subagents to avoid context pollution.

### 3. Self-Improvement loop
- After ANY correction from the user: update your `LESSIONS_FILE` with the pattern.
- Write rules for yourself that prevents the same mistake.
- Review lessons at session start for relevant projects.

### 4. Verification Before Done
- Never mark a task as done without proving it works.
- Ask yourself: "Would a staff-engineer approve this change?"
- Run tests, check logs, demonstrate correctness.

### 5. Demand Elegance
- For non trivial code changes: pause and ask "Is there a more elegant way to do this?"
- If a fix feels hacky: "Knowing everything I know know, implement the elegant solution"
- Skip this for simple, obvious changes - don't over-engineer.
- Challenge your own work before presenting it to others.


## PR Reviews
- When reviewing a PR, always use the `/review-pr` skill. It launches parallel review agents (structural + team patterns), persists findings, and supports multi-round triage.

## gstack

- For all web browsing, use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools.
- Available skills: `/plan-ceo-review`, `/plan-eng-review`, `/review`, `/ship`, `/browse`, `/qa`, `/setup-browser-cookies`, `/retro`
