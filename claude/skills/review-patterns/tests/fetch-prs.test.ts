import { describe, test, expect, vi } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, unlinkSync } from "node:fs";
import {
  mockPrMeta,
  mockReviewComments,
  mockReviews,
  mockIssueComments,
} from "./fixtures/mock-responses.js";
import {
  parsePrsFile,
  filterBots,
  filterByAuthors,
  threadComments,
  renderPrMarkdown,
  ghApi,
  fetchPrMeta,
  fetchReviewComments,
  fetchReviews,
  fetchIssueComments,
  mapReviewComment,
  mapReview,
  mapIssueComment,
} from "../scripts/fetch-prs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePrsPath = join(__dirname, "fixtures", "sample-prs.md");

// ─── Layer 1: parsePrsFile ───────────────────────────────────────────────

describe("parsePrsFile", () => {
  test("extracts focus authors from ## Authors section", () => {
    const result = parsePrsFile(samplePrsPath);
    expect(result.focusAuthors).toEqual(["reviewer1", "reviewer2"]);
  });

  test("extracts PR URLs from ## Pull Requests section", () => {
    const result = parsePrsFile(samplePrsPath);
    expect(result.prs).toEqual([
      { owner: "acme", repo: "widget", number: 42 },
      { owner: "acme", repo: "widget", number: 43 },
    ]);
  });

  test("handles file with no authors section", () => {
    const noAuthorsPath = join(__dirname, "fixtures", "no-authors.md");
    writeFileSync(
      noAuthorsPath,
      "# PRs\n\n## Pull Requests\n- https://github.com/acme/widget/pull/1\n"
    );
    try {
      const result = parsePrsFile(noAuthorsPath);
      expect(result.focusAuthors).toEqual([]);
      expect(result.prs).toHaveLength(1);
    } finally {
      unlinkSync(noAuthorsPath);
    }
  });

  test("handles file with no PR URLs", () => {
    const noPrsPath = join(__dirname, "fixtures", "no-prs.md");
    writeFileSync(
      noPrsPath,
      "# PRs\n\n## Authors to Focus On\n- @alice\n\n## Pull Requests\n"
    );
    try {
      const result = parsePrsFile(noPrsPath);
      expect(result.focusAuthors).toEqual(["alice"]);
      expect(result.prs).toEqual([]);
    } finally {
      unlinkSync(noPrsPath);
    }
  });
});

// ─── Layer 2: Filters ────────────────────────────────────────────────────

describe("filterBots", () => {
  test("removes items where user.type is Bot", () => {
    const result = filterBots(mockReviewComments);
    expect(result.every((c: any) => c.user.type === "User")).toBe(true);
    expect(result).toHaveLength(4); // 5 total, 1 bot
  });

  test("returns all items when none are bots", () => {
    const users = mockReviewComments.filter((c) => c.user.type === "User");
    expect(filterBots(users)).toEqual(users);
  });

  test("returns empty array when all items are bots", () => {
    const bots = [{ user: { type: "Bot" } }, { user: { type: "Bot" } }];
    expect(filterBots(bots)).toEqual([]);
  });
});

describe("filterByAuthors", () => {
  test("keeps only items by specified authors", () => {
    const items = mockReviewComments.filter((c) => c.user.type === "User");
    const result = filterByAuthors(items, ["reviewer1"]);
    expect(result.every((c: any) => c.user.login === "reviewer1")).toBe(true);
    expect(result).toHaveLength(2); // reviewer1 has id 1001 and 1005
  });

  test("returns all when authors list is empty", () => {
    const items = mockReviewComments.filter((c) => c.user.type === "User");
    const result = filterByAuthors(items, []);
    expect(result).toEqual(items);
  });

  test("returns empty array when no authors match", () => {
    const items = mockReviewComments.filter((c) => c.user.type === "User");
    expect(filterByAuthors(items, ["nobody"])).toEqual([]);
  });

  test("is case-insensitive on author handles", () => {
    const items = [{ user: { login: "Reviewer1", type: "User" } }];
    const result = filterByAuthors(items, ["reviewer1"]);
    expect(result).toHaveLength(1);
  });
});

// ─── Layer 3: Threading ──────────────────────────────────────────────────

describe("threadComments", () => {
  test("groups replies under parent by in_reply_to_id", () => {
    const comments = [
      mapReviewComment(mockReviewComments[0]), // id 1001, parent
      mapReviewComment(mockReviewComments[1]), // id 1002, reply to 1001
    ];
    const threads = threadComments(comments);
    expect(threads).toHaveLength(1);
    expect(threads[0].parent.id).toBe(1001);
    expect(threads[0].replies).toHaveLength(1);
    expect(threads[0].replies[0].id).toBe(1002);
  });

  test("handles comments with no replies", () => {
    const comments = [mapReviewComment(mockReviewComments[0])]; // id 1001 alone
    const threads = threadComments(comments);
    expect(threads).toHaveLength(1);
    expect(threads[0].parent.id).toBe(1001);
    expect(threads[0].replies).toEqual([]);
  });

  test("handles empty input", () => {
    expect(threadComments([])).toEqual([]);
  });

  test("handles multiple separate threads", () => {
    const comments = [
      mapReviewComment(mockReviewComments[0]), // id 1001
      mapReviewComment(mockReviewComments[4]), // id 1005
    ];
    const threads = threadComments(comments);
    expect(threads).toHaveLength(2);
  });

  test("sorts replies chronologically within thread", () => {
    const parent = mapReviewComment(mockReviewComments[0]);
    const reply1 = mapReviewComment({
      ...mockReviewComments[1],
      id: 1010,
      created_at: "2026-03-16T11:00:00Z",
    });
    const reply2 = mapReviewComment({
      ...mockReviewComments[1],
      id: 1011,
      created_at: "2026-03-16T09:30:00Z",
    });
    // Pass in wrong order
    const threads = threadComments([parent, reply1, reply2]);
    expect(threads[0].replies[0].id).toBe(1011); // earlier
    expect(threads[0].replies[1].id).toBe(1010); // later
  });

  test("treats orphaned replies as standalone parents", () => {
    // Reply to a comment that was filtered out
    const orphan = mapReviewComment({
      ...mockReviewComments[1],
      in_reply_to_id: 9999, // parent doesn't exist
    });
    const threads = threadComments([orphan]);
    expect(threads).toHaveLength(1);
    expect(threads[0].parent.id).toBe(orphan.id);
    expect(threads[0].replies).toEqual([]);
  });
});

// ─── Layer 4: Markdown rendering ─────────────────────────────────────────

describe("renderPrMarkdown", () => {
  const meta = {
    title: "Add caching layer",
    author: "danielstocks",
    baseRefName: "main",
    headRefName: "feature/cache",
    url: "https://github.com/acme/widget/pull/42",
    number: 42,
  };

  test("renders PR header with title, repo, author, branch, URL", () => {
    const md = renderPrMarkdown(meta, [], [], []);
    expect(md).toContain("# PR #42: Add caching layer");
    expect(md).toContain("acme/widget");
    expect(md).toContain("danielstocks");
    expect(md).toContain("feature/cache");
    expect(md).toContain("main");
    expect(md).toContain("https://github.com/acme/widget/pull/42");
  });

  test("renders threaded review comments with diff context and links", () => {
    const threads = [
      {
        parent: mapReviewComment(mockReviewComments[0]),
        replies: [mapReviewComment(mockReviewComments[1])],
      },
    ];
    const md = renderPrMarkdown(meta, threads, [], []);
    expect(md).toContain("## Review Comments");
    expect(md).toContain("@reviewer1");
    expect(md).toContain("`src/cache.ts`");
    expect(md).toContain("line 45");
    expect(md).toContain("Consider using a Map");
    expect(md).toContain("https://github.com/acme/widget/pull/42#discussion_r1001");
    expect(md).toContain("Reply by @danielstocks");
    expect(md).toContain("https://github.com/acme/widget/pull/42#discussion_r1002");
    expect(md).toContain("Good point");
  });

  test("renders top-level reviews with state and link", () => {
    const reviews = [mapReview(mockReviews[0])];
    const md = renderPrMarkdown(meta, [], reviews, []);
    expect(md).toContain("## Top-Level Reviews");
    expect(md).toContain("COMMENTED");
    expect(md).toContain("@reviewer1");
    expect(md).toContain("Looks good overall");
    expect(md).toContain("https://github.com/acme/widget/pull/42#pullrequestreview-2001");
  });

  test("renders issue comments in Discussion section with link", () => {
    const comments = [mapIssueComment(mockIssueComments[0])];
    const md = renderPrMarkdown(meta, [], [], comments);
    expect(md).toContain("## Discussion");
    expect(md).toContain("@reviewer2");
    expect(md).toContain("update the docs");
    expect(md).toContain("https://github.com/acme/widget/pull/42#issuecomment-3001");
  });

  test("skips sections with no data", () => {
    const md = renderPrMarkdown(meta, [], [], []);
    expect(md).not.toContain("## Review Comments");
    expect(md).not.toContain("## Top-Level Reviews");
    expect(md).not.toContain("## Discussion");
  });

  test("handles comments with empty body", () => {
    const threads = [
      {
        parent: mapReviewComment(mockReviewComments[2]), // empty body
        replies: [],
      },
    ];
    const md = renderPrMarkdown(meta, threads, [], []);
    // Should not crash, section should still render
    expect(md).toContain("## Review Comments");
    expect(md).toContain("`src/index.ts`");
  });
});

// ─── Layer 5: ghApi + fetch functions (mocked exec) ──────────────────────

describe("ghApi", () => {
  test("calls exec with correct gh api command", () => {
    const mockExec = vi.fn().mockReturnValue(JSON.stringify([{ id: 1 }]));
    ghApi("repos/acme/widget/pulls/42/comments", mockExec);
    expect(mockExec).toHaveBeenCalledWith(
      'gh api --paginate --slurp "repos/acme/widget/pulls/42/comments"',
      expect.objectContaining({ encoding: "utf-8" })
    );
  });

  test("parses JSON response and returns data", () => {
    const mockExec = vi.fn().mockReturnValue(JSON.stringify([{ id: 1 }]));
    const result = ghApi("repos/acme/widget/pulls/42/comments", mockExec);
    expect(result).toEqual([{ id: 1 }]);
  });

  test("flattens paginated nested array response", () => {
    const paginated = [[{ id: 1 }], [{ id: 2 }]];
    const mockExec = vi.fn().mockReturnValue(JSON.stringify(paginated));
    const result = ghApi("repos/acme/widget/pulls/42/comments", mockExec);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test("throws meaningful error on exec failure", () => {
    const mockExec = vi.fn().mockImplementation(() => {
      throw new Error("gh: not found");
    });
    expect(() => ghApi("repos/acme/widget/pulls/42/comments", mockExec)).toThrow();
  });
});

describe("fetchPrMeta", () => {
  test("calls exec with correct gh pr view command and maps response", () => {
    const mockExec = vi.fn().mockReturnValue(JSON.stringify(mockPrMeta));
    const result = fetchPrMeta("acme", "widget", 42, mockExec);
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining("gh pr view 42 --repo acme/widget"),
      expect.any(Object)
    );
    expect(result).toEqual({
      title: "Add caching layer for API responses",
      author: "danielstocks",
      baseRefName: "main",
      headRefName: "feature/cache",
      url: "https://github.com/acme/widget/pull/42",
      number: 42,
    });
  });
});

describe("fetchReviewComments", () => {
  test("calls ghApi with correct endpoint and maps to ReviewComment[]", () => {
    const mockExec = vi
      .fn()
      .mockReturnValue(JSON.stringify(mockReviewComments));
    const result = fetchReviewComments("acme", "widget", 42, mockExec);
    // Should have all 5 (filtering is done separately)
    expect(result).toHaveLength(5);
    expect(result[0]).toMatchObject({
      id: 1001,
      path: "src/cache.ts",
      line: 45,
      inReplyToId: null,
    });
    // Reply should have inReplyToId set
    expect(result[1].inReplyToId).toBe(1001);
  });
});

describe("fetchReviews", () => {
  test("calls ghApi with correct endpoint and maps to Review[]", () => {
    const mockExec = vi.fn().mockReturnValue(JSON.stringify(mockReviews));
    const result = fetchReviews("acme", "widget", 42, mockExec);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: 2001,
      state: "COMMENTED",
      body: "Looks good overall, a few nits inline.",
    });
  });
});

describe("fetchIssueComments", () => {
  test("calls ghApi with correct endpoint and maps to IssueComment[]", () => {
    const mockExec = vi.fn().mockReturnValue(JSON.stringify(mockIssueComments));
    const result = fetchIssueComments("acme", "widget", 42, mockExec);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 3001,
      body: "Should we also update the docs for the new cache API?",
    });
  });
});
