---
name: review-patterns
description: >
  Capture and apply team-specific review patterns from real PR comments.
  Subcommands: fetch (download PR review data), refine (synthesize knowledge base),
  or invoke during code review to apply learned patterns.
  Trigger: code review, PR review, review diff, check code, team standards,
  review patterns, fetch patterns, refine patterns.
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
---

# Review Patterns

Capture implicit review knowledge from real PR comments, per-repo.
Two grouping dimensions: pattern-type (primary) and codebase-area (tags).

## Data Location

All per-repo data lives in `~/.config/review-patterns/{owner}--{repo}/`:
```
{owner}--{repo}/
  input/prs.md              ← user-curated list of PRs + focus authors
  raw/{pr-number}.md        ← fetched PR review data (one file per PR)
  knowledge/review-patterns.md  ← synthesized knowledge base
```

The `{owner}--{repo}` slug uses double-dash to avoid collision with hyphens in names.

## Subcommand Routing

### `/review-patterns fetch`

Run the fetch script to download PR review data from GitHub.

1. Detect the current repo: run `git remote get-url origin` and parse `{owner}/{repo}` from the remote URL.
2. Compute the data directory: `~/.config/review-patterns/{owner}--{repo}/`.
3. Check that `input/prs.md` exists in the data directory. If not, create `input/` and write a template:

```markdown
# PRs to Analyze

## Authors to Focus On
- @<replace with senior reviewer handle>

## Pull Requests
- <paste PR URLs here, one per line>
```

Tell the user: "Created template at `~/.config/review-patterns/{owner}--{repo}/input/prs.md`. Add PR URLs and focus authors, then run `/review-patterns fetch` again."

4. If `input/prs.md` exists and has PR URLs, run:
```bash
cd ~/.claude/skills/review-patterns && npx tsx scripts/fetch-prs.ts ~/.config/review-patterns/{owner}--{repo}/input/prs.md
```
5. Report results: how many PRs fetched, how many skipped, path to raw files.

### `/review-patterns refine`

Synthesize the raw PR review data into a structured knowledge base. This is done by YOU (Claude Code), not a script.

1. Detect the current repo (same as fetch).
2. Compute the data directory.
3. Read ALL files in `~/.config/review-patterns/{owner}--{repo}/raw/` using Glob and Read.
4. Analyze the review comments across all PRs. Look for:
   - **Recurring patterns**: the same type of feedback appearing across multiple PRs
   - **Codebase-area-specific rules**: patterns tied to specific directories, file types, or modules
   - **Implicit standards**: things reviewers consistently enforce that aren't in a style guide
   - **Common mistakes**: errors that get caught repeatedly

5. Write `~/.config/review-patterns/{owner}--{repo}/knowledge/review-patterns.md` in this format:

```markdown
# Review Patterns: {owner}/{repo}

> Auto-generated from {N} PR reviews. Last refined: {date}.
> Focus authors: {list of authors from prs.md}

## Patterns by Type

### {Pattern Category Name}

#### {Pattern Name}
- **What reviewers flag**: {description of what triggers this feedback}
- **Why it matters**: {the reasoning reviewers give}
- **Correct approach**: {what the code should look like}
- **Areas**: {codebase areas where this applies, e.g., `src/auth/`, `*.test.ts`}
- **Evidence**: [PR #{N} comment]({link_from_raw_file}) (@reviewer), [PR #{M} comment]({link_from_raw_file}) (@reviewer)
  Use the `**Link:**` URLs from the raw files when available. For older raw files without links, use the PR URL from the header (e.g., `https://github.com/owner/repo/pull/N`).

{repeat for each pattern}

---

## Index by Codebase Area

### `{area path or pattern}`
- {Pattern Name} (from {Category})
- {Pattern Name} (from {Category})

{repeat for each area}
```

6. **Category discovery**: Do NOT force patterns into predefined categories. Let the actual review comments drive what categories emerge. The following are hints, not requirements:
   - Naming & Conventions
   - Error Handling
   - Type Safety
   - Async Patterns
   - Performance
   - Security
   - Testing
   - Code Structure
   - Readability / Duplication
   - Edge Cases
   - UI & UX — component patterns, layout, accessibility, user-facing behavior
   - Design System — reusable UI/UX logic, component library usage, shared patterns
   - API Design — endpoints, contracts, backward compatibility, response shapes
   - Dependencies

7. **Quality bar**: Only include patterns that appear in 2+ PRs or where a reviewer explicitly states a team rule. One-off nitpicks are noise.

8. **Merge, don't replace**: If `review-patterns.md` already exists, read it first. Merge new patterns in. Update evidence lists. Remove patterns that are no longer supported by evidence. Update the "Last refined" date.

9. Present the draft to the user for approval before writing the file.

### `/review-patterns` (default — during review)

Apply the knowledge base to the current diff. This mode activates when reviewing code.

1. Detect the current repo from `git remote get-url origin`.
2. Compute the data directory and check if `knowledge/review-patterns.md` exists. If not, tell the user: "No review patterns found for this repo. Run `/review-patterns fetch` and `/review-patterns refine` first."
3. Read `knowledge/review-patterns.md`.
4. Get the current diff: `git diff origin/main` (or `git diff --cached` if no branch diff).
5. For each file in the diff, check the **Index by Codebase Area** to find which patterns apply to that file path.
6. Apply ALL relevant patterns to the diff. For each match:
   - Cite the pattern name and category
   - Show the specific line(s) in the diff that trigger it
   - Explain why it matters (from the knowledge base)
   - Suggest the correct approach
7. Output format:

```
## Review Patterns Check: {N} issues found

### {file:line} — {Pattern Name} ({Category})
**Issue:** {what's wrong, referencing the diff}
**Why:** {from knowledge base}
**Fix:** {suggested fix}
Evidence: {PR links from knowledge base}

---
```

8. If no patterns match the current diff, output: "Review patterns check: no team-specific issues found in this diff."

## Important Behavior Notes

- This skill is **standalone**. It does NOT inject into or modify the existing `/review` skill.
- When the user says "review this code" or similar, this skill may be triggered alongside `/review`. That is fine — they serve different purposes. `/review` checks for structural issues. `/review-patterns` checks for team-specific conventions.
- The fetch step is idempotent. Re-running skips already-fetched PRs.
- The refine step merges into existing knowledge. It never loses previously extracted patterns (unless they're contradicted by newer evidence).
- All raw data stays local in `~/.config/`. Never commit PR review data to git.
