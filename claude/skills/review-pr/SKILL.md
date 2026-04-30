---
name: review-pr
description: >
  Structured PR review pipeline with parallel agents and persistent tracking.
  Trigger: /review-pr <number | URL>, or "review this PR", "review PR #123".
  Supports multi-round reviews with triage and draft GitHub review posting.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
---

# PR Review Pipeline

Parallel review agents → persistent review doc → triage → draft GitHub review.

```
/review-pr 123

  1. Fetch PR metadata
  2. Detect existing review doc → Round N+1 or fresh Round 1
  3. Launch agents in parallel:

  ┌─────────────────────┐  ┌─────────────────────┐  ┌───────────┐
  │ code-review-        │  │ /review-patterns     │  │ (future   │
  │ simplicity agent    │  │ skill                │  │  agents)  │
  └──────────┬──────────┘  └──────────┬───────────┘  └─────┬─────┘
             │                        │                     │
             └───────────┬────────────┘─────────────────────┘
                         ▼
              4. Merge findings into review doc
              5. Interactive triage: POST / IGNORE / WATCH
              6. Post draft review to GitHub (pending)
```

## Trigger & Input

`/review-pr <number | URL>` — resolves the PR from the argument.

If no argument is given, detect from the current branch: `gh pr view --json number,title`.

## Review Agents

| Agent | Type | Focus |
|-------|------|-------|
| Structural | `code-review-simplicity` (Agent tool, `subagent_type: "code-review-simplicity"`) | Code quality, bugs, async patterns, security |
| Team Patterns | `/review-patterns` default mode (Skill tool) | Team-specific conventions from PR history |

To add a new review agent: add a row to this table and describe its behavior in a section below.

## Step-by-step

### 1. Fetch PR metadata

```bash
gh pr view <number> --json number,title,author,baseRefName,headRefName,url,body
```

Parse `{owner}/{repo}` from `git remote get-url origin`.

### 1b. Pre-review calibration

Before launching agents, check:
- **Author context**: Is this author known? Check memory for notes on their background, experience, and whether they use AI coding tools. This shapes comment tone and detail level.
- **Tech stack comfort**: If the PR spans multiple languages/stacks, note which areas the user (reviewer) is most/least comfortable with. Ask if unclear — this determines which findings need extra explanation vs which can be terse. Don't assume.

### 2. Determine review doc location and round

**Review doc path:** `<auto-memory>/memory/plans/reviews/pr-{N}.md`

- If the file does NOT exist → **Round 1**. Create the doc with the header.
- If the file exists → **Round N+1**. Read it, extract previous WATCH and POST items for cross-referencing.

### 3. Get the diff

```bash
gh pr diff <number>
```

For follow-up rounds, also get the incremental diff since last review if possible:
```bash
gh api repos/{owner}/{repo}/pulls/{N}/commits --jq '.[].sha'
```

### 4. Launch review agents in parallel

Launch ALL agents simultaneously using parallel Agent tool calls in a single message.

**Structural agent prompt — provide:**
- The full PR diff
- PR title, author, branch info
- Instruction: "Review this PR diff for code quality, bugs, security, and structural issues. For each finding, report: file path, line number (from the diff), title, description, why it matters, and a suggested comment. Be specific — cite exact lines."

**Team Patterns agent — invoke the `/review-patterns` skill:**
- It will auto-detect the repo, load the knowledge base, and check the diff
- If no knowledge base exists for this repo, skip silently

### 5. Merge findings and draft comments

Collect all findings from all agents. For each finding, write the **draft comment** immediately — the actual text that would appear on GitHub, following the Comment Tone & Style guidelines below. This lets the user triage based on how the comment actually reads.

Record in the review doc:

```markdown
#### [{STATUS}] {file}:{line} — {title} ({source})
**Draft comment:**
> {the actual text that would be posted to GitHub — friendly, questioning tone, with code snippets}
**Why:** {internal reasoning — not posted, just for the reviewer's context}
```

Where `{source}` is the agent name (Structural, Team Patterns, etc.) and `{STATUS}` starts as `PENDING`.

### 6. Interactive triage

Present ALL findings to the user, grouped by severity:
1. **Bugs / correctness issues** first
2. **Design concerns / product gaps** second
3. **Nits / cleanup** last (prefixed with `Nit:`)

Do NOT pre-filter or hide findings you consider minor — the user decides what matters. Show the draft comment text for each finding so the user can judge based on how it actually reads.

For each finding, the user decides:

- **POST** — will be posted as a review comment on the PR
- **IGNORE** — not worth raising. Ask for a short reason and record it.
- **WATCH** — don't comment now, check on next review round

The user may also revise the draft comment text during triage. Update accordingly.

After triage, write the triage summary:
```markdown
### Triage Summary
- Posted: {N} comments
- Ignored: {N}
- Watching: {N}
```

### 7. Post draft review to GitHub

Only proceed if the user confirms they want to post.

Create a pending (draft) review — the user submits it from the GitHub UI.

Build a JSON body with a `comments` array (each with `path`, `line`, `body`) and a `body` field for the review summary. Do NOT include `"event": "PENDING"` — omit the event field entirely (the API rejects "PENDING" as a string value; omitting defaults to pending).

```bash
gh api repos/{owner}/{repo}/pulls/{N}/reviews \
  --method POST \
  --input /tmp/pr-review-body.json
```

JSON structure:
```json
{
  "body": "Review summary text. Include any findings that don't map to specific diff lines here.",
  "comments": [
    { "path": "relative/file/path", "line": 123, "body": "Comment text" }
  ]
}
```

- Line numbers must be right-side (new file) line numbers from the diff.
- For POST findings that don't map to a specific diff line (e.g., general UX feedback, bugs in files not in the diff), include them in the review `body` instead.

Tell the user: "Draft review created. Go to {pr_url} to review and submit it."

## Follow-up Rounds

When the review doc already exists (Round 2+):

1. Read the existing doc. Extract all WATCH and POST items.
2. Fetch the updated diff.
3. Re-run all agents on the new diff.
4. Cross-reference previous items:
   - If the relevant lines changed → likely addressed. Mark as resolved.
   - If unchanged → still present. Carry forward.
5. Append a new round section:

```markdown
---

## Round {N} — {date}

### Previous items
- [x] {file}:{line} — {title} (was POST, addressed in latest push)
- [ ] {file}:{line} — {title} (was WATCH, still present)

### New findings
#### [PENDING] ...
```

6. Triage new findings + unresolved previous items.
7. Post draft review if requested.

## Review Doc Format

```markdown
# PR Review: #{N} — {title}

> Repo: {owner}/{repo} | Author: {author} | Branch: {head} → {base}
> URL: {pr_url}

## Round 1 — {date}

### Findings

#### [POST] src/auth.ts:42 — Missing error boundary (Structural)
**Draft comment:**
> Does `validateToken()` need a try/catch here? If the token service is down, this looks like it would crash the request rather than returning 401.
**Why:** Unhandled rejection will crash the request pipeline.

#### [IGNORE] src/utils.ts:10 — Naming convention (Team Patterns)
**Draft comment:**
> Nit: this uses camelCase — team convention is snake_case for helpers.
**Why:** Legacy file, not worth changing in this PR.
**Reason ignored:** Legacy file, not worth changing in this PR.

#### [WATCH] src/api.ts:88 — No retry logic (Structural)
**Draft comment:**
> Should this external API call have retry logic for transient failures?
**Why:** External dependency with no resilience.
**Watch for:** Check if addressed in next push.

### Triage Summary
- Posted: 1 comments
- Ignored: 1
- Watching: 1
```

## Important Behavior Notes

- Always present findings to the user before posting anything. Never auto-post.
- The review doc is the source of truth. Always read it before starting a new round.
- If an agent returns no findings, note it in the doc: "{Agent}: no issues found."
- The user may edit the review doc manually between rounds. Respect any manual changes.

## Comment Tone & Style

### Voice
- Write as a curious colleague, not an authority. Default to **questions that point toward the answer**:
  - "Is this file loaded anywhere? I couldn't find a reference to it."
  - "Do we need this prop here? It looks like it could be derived from X."
  - "Could this guard be removed since `_aiScriptingEnabled` already checks the same conditions?"
- Never phrase comments as certain mandates. Even when confident, frame as suggestions or questions.
- Acknowledge good work. Start the review body with something positive about the PR.

### Clarity
- Every comment must make the issue **immediately visible**. Include:
  - **Code snippets** showing the problematic code and/or a suggested fix
  - **File paths** with line numbers
  - **Before/after examples** when suggesting a change
  - **ASCII diagrams** for flow or architecture issues
- Don't make the reader go find the code — bring the code to them.

### Severity prefixes
- Prefix low-severity comments with `Nit:` — signals these are optional improvements, not blockers.
- Reserve unprefixed comments for bugs, correctness issues, and important design concerns.

### Adapt to the author
- If the PR was AI-coded, assume the author may not know every detail of the generated code. Be extra clear in explanations.
- Match tone to the author's experience level — educational for juniors/designers, peer-level for seniors.
- Check memory for author notes before drafting comments.
