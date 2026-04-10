import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parsePrUrl, repoDataDir } from "./shared/repo-slug.js";
import type {
  PrInput,
  PrMeta,
  ReviewComment,
  Review,
  IssueComment,
  CommentThread,
} from "./shared/types.js";

// ─── Types ───────────────────────────────────────────────────────────────

type Executor = (cmd: string, opts?: any) => string;

function defaultExec(cmd: string, opts?: any): string {
  return execSync(cmd, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024, ...opts });
}

// ─── Parsing ─────────────────────────────────────────────────────────────

export function parsePrsFile(filePath: string): {
  focusAuthors: string[];
  prs: PrInput[];
} {
  const content = readFileSync(filePath, "utf-8");
  const focusAuthors: string[] = [];
  const prs: PrInput[] = [];

  let section = "";
  for (const line of content.split("\n")) {
    if (line.startsWith("## Authors to Focus On")) {
      section = "authors";
      continue;
    }
    if (line.startsWith("## Pull Requests")) {
      section = "prs";
      continue;
    }
    if (line.startsWith("## ")) {
      section = "";
      continue;
    }

    const trimmed = line.trim();
    if (section === "authors" && trimmed.startsWith("- @")) {
      focusAuthors.push(trimmed.slice(3).trim());
    }
    if (section === "prs" && trimmed.startsWith("- http")) {
      prs.push(parsePrUrl(trimmed.slice(2).trim()));
    }
  }

  return { focusAuthors, prs };
}

// ─── Filters ─────────────────────────────────────────────────────────────

export function filterBots<T extends { user: { type: string } }>(
  items: T[]
): T[] {
  return items.filter((item) => item.user.type === "User");
}

export function filterByAuthors<T extends { user: { login: string } }>(
  items: T[],
  authors: string[]
): T[] {
  if (authors.length === 0) return items;
  const authorSet = new Set(authors.map((a) => a.toLowerCase()));
  return items.filter((item) =>
    authorSet.has(item.user.login.toLowerCase())
  );
}

// ─── Mappers (raw API → typed objects) ───────────────────────────────────

export function mapReviewComment(raw: any): ReviewComment {
  return {
    id: raw.id,
    body: raw.body ?? "",
    path: raw.path,
    line: raw.line ?? raw.original_line ?? null,
    diffHunk: raw.diff_hunk ?? "",
    user: { login: raw.user.login, type: raw.user.type },
    inReplyToId: raw.in_reply_to_id ?? null,
    createdAt: raw.created_at,
  };
}

export function mapReview(raw: any): Review {
  return {
    id: raw.id,
    body: raw.body ?? "",
    state: raw.state,
    user: { login: raw.user.login, type: raw.user.type },
    createdAt: raw.submitted_at,
  };
}

export function mapIssueComment(raw: any): IssueComment {
  return {
    id: raw.id,
    body: raw.body ?? "",
    user: { login: raw.user.login, type: raw.user.type },
    createdAt: raw.created_at,
  };
}

// ─── Threading ───────────────────────────────────────────────────────────

export function threadComments(comments: ReviewComment[]): CommentThread[] {
  const parentMap = new Map<number, ReviewComment>();
  const replyMap = new Map<number, ReviewComment[]>();

  // First pass: identify parents
  for (const c of comments) {
    if (c.inReplyToId === null) {
      parentMap.set(c.id, c);
      if (!replyMap.has(c.id)) replyMap.set(c.id, []);
    }
  }

  // Second pass: attach replies
  for (const c of comments) {
    if (c.inReplyToId !== null) {
      const parentId = c.inReplyToId;
      if (!parentMap.has(parentId)) {
        // Parent was filtered out — treat reply as standalone parent
        parentMap.set(c.id, c);
        replyMap.set(c.id, []);
      } else {
        replyMap.get(parentId)!.push(c);
      }
    }
  }

  // Build threads, sorted by parent creation time
  const threads: CommentThread[] = [];
  for (const [id, parent] of parentMap) {
    threads.push({
      parent,
      replies: (replyMap.get(id) ?? []).sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    });
  }

  return threads.sort(
    (a, b) =>
      new Date(a.parent.createdAt).getTime() -
      new Date(b.parent.createdAt).getTime()
  );
}

// ─── Markdown rendering ─────────────────────────────────────────────────

export function renderPrMarkdown(
  meta: PrMeta,
  threads: CommentThread[],
  reviews: Review[],
  issueComments: IssueComment[]
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# PR #${meta.number}: ${meta.title}`);
  lines.push("");
  lines.push(
    `- **Repo**: ${meta.url.match(/github\.com\/([^/]+\/[^/]+)/)?.[1] ?? "unknown"}`
  );
  lines.push(`- **Author**: ${meta.author}`);
  lines.push(`- **Branch**: ${meta.headRefName} → ${meta.baseRefName}`);
  lines.push(`- **URL**: ${meta.url}`);
  lines.push("");

  // Review comments (threaded, inline on diff)
  if (threads.length > 0) {
    lines.push("## Review Comments");
    lines.push("");

    for (const thread of threads) {
      const p = thread.parent;
      lines.push(
        `### Comment by @${p.user.login} on \`${p.path}\`${p.line ? ` (line ${p.line})` : ""}`
      );
      lines.push("");

      if (p.diffHunk) {
        lines.push("**Diff context:**");
        const hunkLines = p.diffHunk.split("\n");
        const relevantLines = hunkLines.slice(
          Math.max(0, hunkLines.length - 8)
        );
        lines.push("```");
        lines.push(relevantLines.join("\n"));
        lines.push("```");
        lines.push("");
      }

      lines.push("**Comment:**");
      lines.push(p.body);
      lines.push("");

      for (const reply of thread.replies) {
        lines.push(`#### Reply by @${reply.user.login}`);
        lines.push(reply.body);
        lines.push("");
      }

      lines.push("---");
      lines.push("");
    }
  }

  // Top-level reviews (skip empty bodies)
  const reviewsWithBody = reviews.filter((r) => r.body.trim().length > 0);
  if (reviewsWithBody.length > 0) {
    lines.push("## Top-Level Reviews");
    lines.push("");

    for (const r of reviewsWithBody) {
      lines.push(`### ${r.state} by @${r.user.login}`);
      lines.push(r.body);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  // General discussion comments
  if (issueComments.length > 0) {
    lines.push("## Discussion");
    lines.push("");

    for (const c of issueComments) {
      lines.push(`### Comment by @${c.user.login}`);
      lines.push(c.body);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ─── GitHub API calls ────────────────────────────────────────────────────

export function ghApi<T>(endpoint: string, exec: Executor = defaultExec): T {
  const cmd = `gh api --paginate --slurp "${endpoint}"`;
  try {
    const stdout = exec(cmd, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout);
    // --slurp wraps paginated results as array of arrays — flatten
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      Array.isArray(parsed[0])
    ) {
      return parsed.flat() as T;
    }
    return parsed as T;
  } catch (e: any) {
    throw new Error(`gh api failed for ${endpoint}: ${e.message}`);
  }
}

export function fetchPrMeta(
  owner: string,
  repo: string,
  number: number,
  exec: Executor = defaultExec
): PrMeta {
  const cmd = `gh pr view ${number} --repo ${owner}/${repo} --json title,author,baseRefName,headRefName,url,number`;
  const stdout = exec(cmd, { encoding: "utf-8" });
  const data = JSON.parse(stdout);
  return {
    title: data.title,
    author: data.author.login,
    baseRefName: data.baseRefName,
    headRefName: data.headRefName,
    url: data.url,
    number: data.number,
  };
}

export function fetchReviewComments(
  owner: string,
  repo: string,
  number: number,
  exec: Executor = defaultExec
): ReviewComment[] {
  const raw = ghApi<any[]>(
    `repos/${owner}/${repo}/pulls/${number}/comments`,
    exec
  );
  return raw.map(mapReviewComment);
}

export function fetchReviews(
  owner: string,
  repo: string,
  number: number,
  exec: Executor = defaultExec
): Review[] {
  const raw = ghApi<any[]>(
    `repos/${owner}/${repo}/pulls/${number}/reviews`,
    exec
  );
  return raw.map(mapReview);
}

export function fetchIssueComments(
  owner: string,
  repo: string,
  number: number,
  exec: Executor = defaultExec
): IssueComment[] {
  const raw = ghApi<any[]>(
    `repos/${owner}/${repo}/issues/${number}/comments`,
    exec
  );
  return raw.map(mapIssueComment);
}

// ─── Auth check ──────────────────────────────────────────────────────────

function checkGhAuth(): void {
  try {
    execSync("gh auth status", { stdio: "pipe" });
  } catch {
    console.error(
      "Error: GitHub CLI is not authenticated.\n" +
        "Run `gh auth login` to authenticate, then try again."
    );
    process.exit(1);
  }
}

// ─── Main (only runs when invoked directly) ──────────────────────────────

const isMain =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isMain) {
  checkGhAuth();

  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: npx tsx scripts/fetch-prs.ts <path-to-prs.md>");
    process.exit(1);
  }

  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const { focusAuthors, prs } = parsePrsFile(inputPath);

  if (prs.length === 0) {
    console.error("No PR URLs found in input file.");
    process.exit(1);
  }

  const { owner, repo } = prs[0];
  const dataDir = repoDataDir(owner, repo);
  const rawDir = join(dataDir, "raw");
  mkdirSync(rawDir, { recursive: true });

  let fetched = 0;
  let skipped = 0;

  for (const pr of prs) {
    if (pr.owner !== owner || pr.repo !== repo) {
      console.warn(
        `Warning: PR #${pr.number} is from ${pr.owner}/${pr.repo}, ` +
          `expected ${owner}/${repo}. Skipping.`
      );
      continue;
    }

    const outputPath = join(rawDir, `${pr.number}.md`);
    if (existsSync(outputPath)) {
      console.log(`Skipping PR #${pr.number} (already fetched)`);
      skipped++;
      continue;
    }

    console.log(`Fetching PR #${pr.number}...`);

    try {
      const meta = fetchPrMeta(owner, repo, pr.number);

      let reviewComments = filterBots(
        fetchReviewComments(owner, repo, pr.number)
      );
      let reviews = filterBots(fetchReviews(owner, repo, pr.number));
      let issueComments = filterBots(
        fetchIssueComments(owner, repo, pr.number)
      );

      if (focusAuthors.length > 0) {
        reviewComments = filterByAuthors(reviewComments, focusAuthors);
        reviews = filterByAuthors(reviews, focusAuthors);
        issueComments = filterByAuthors(issueComments, focusAuthors);
      }

      const threads = threadComments(reviewComments);
      const markdown = renderPrMarkdown(meta, threads, reviews, issueComments);

      writeFileSync(outputPath, markdown, "utf-8");
      fetched++;
      console.log(`  → Wrote ${outputPath}`);
    } catch (e: any) {
      console.error(`  Error fetching PR #${pr.number}: ${e.message}`);
    }
  }

  console.log(
    `\nDone. Fetched: ${fetched}, Skipped: ${skipped}, Total: ${prs.length}`
  );
  console.log(`Raw files: ${rawDir}`);
}
