## Project Files
All paths below are relative to Claude Code's auto-memory directory (`~/.claude/projects/<project>/memory/`).
- Store plans in `memory/plans/<feature-name>/` — referenced as `PLANS_DIR` below.
- Store general lessons in `memory/lessons.md` - referenced as `LESSONS_FILE` below.

## Workflow

### Principles
- ALWAYS plan before you code.
- NEVER commit any code without asking the user first.
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


## gstack

- For all web browsing, use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools.
- Available skills: `/plan-ceo-review`, `/plan-eng-review`, `/review`, `/ship`, `/browse`, `/qa`, `/setup-browser-cookies`, `/retro`
