/**
 * Realistic mock responses for GitHub API endpoints.
 * Covers: normal comments, bot comments, threaded replies,
 * empty bodies, missing diff_hunk.
 */

// PR metadata (gh pr view --json)
export const mockPrMeta = {
  number: 42,
  title: "Add caching layer for API responses",
  author: { login: "danielstocks" },
  baseRefName: "main",
  headRefName: "feature/cache",
  url: "https://github.com/acme/widget/pull/42",
};

// Inline review comments (/pulls/{n}/comments)
export const mockReviewComments = [
  {
    id: 1001,
    body: "Consider using a Map here for O(1) lookups instead of a plain object.",
    user: { login: "reviewer1", type: "User" },
    path: "src/cache.ts",
    line: 45,
    original_line: 44,
    diff_hunk:
      "@@ -40,6 +40,12 @@ export class Cache {\n   private store: Record<string, unknown> = {};\n \n+  get(key: string) {\n+    return this.store[key];\n+  }",
    in_reply_to_id: null,
    created_at: "2026-03-16T08:00:00Z",
  },
  {
    id: 1002,
    body: "Good point, updated to use Map.",
    user: { login: "danielstocks", type: "User" },
    path: "src/cache.ts",
    line: 45,
    original_line: 44,
    diff_hunk: "@@ -40,6 +40,12 @@ export class Cache {",
    in_reply_to_id: 1001, // threaded reply
    created_at: "2026-03-16T09:00:00Z",
  },
  {
    id: 1003,
    body: "",
    user: { login: "reviewer2", type: "User" },
    path: "src/index.ts",
    line: 10,
    original_line: 10,
    diff_hunk: "@@ -8,3 +8,5 @@\n import { Cache } from './cache';\n+import { Logger } from './logger';",
    in_reply_to_id: null,
    created_at: "2026-03-16T10:00:00Z",
  },
  {
    id: 1004,
    body: "Auto-generated coverage report: 87%",
    user: { login: "codecov[bot]", type: "Bot" },
    path: "src/cache.ts",
    line: 1,
    original_line: 1,
    diff_hunk: null,
    in_reply_to_id: null,
    created_at: "2026-03-16T11:00:00Z",
  },
  {
    id: 1005,
    body: "We should add error handling for cache misses here.",
    user: { login: "reviewer1", type: "User" },
    path: "src/cache.ts",
    line: 52,
    original_line: 50,
    diff_hunk:
      "@@ -48,4 +48,10 @@ export class Cache {\n+  delete(key: string) {\n+    delete this.store[key];\n+  }",
    in_reply_to_id: null,
    created_at: "2026-03-16T12:00:00Z",
  },
];

// Top-level reviews (/pulls/{n}/reviews)
export const mockReviews = [
  {
    id: 2001,
    body: "Looks good overall, a few nits inline.",
    state: "COMMENTED",
    user: { login: "reviewer1", type: "User" },
    submitted_at: "2026-03-16T08:30:00Z",
  },
  {
    id: 2002,
    body: "",
    state: "APPROVED",
    user: { login: "reviewer1", type: "User" },
    submitted_at: "2026-03-17T14:00:00Z",
  },
  {
    id: 2003,
    body: "CI passed.",
    state: "COMMENTED",
    user: { login: "github-actions[bot]", type: "Bot" },
    submitted_at: "2026-03-16T12:00:00Z",
  },
];

// Issue comments (/issues/{n}/comments)
export const mockIssueComments = [
  {
    id: 3001,
    body: "Should we also update the docs for the new cache API?",
    user: { login: "reviewer2", type: "User" },
    created_at: "2026-03-16T15:00:00Z",
  },
  {
    id: 3002,
    body: "This PR has been automatically labeled.",
    user: { login: "labeler[bot]", type: "Bot" },
    created_at: "2026-03-16T15:05:00Z",
  },
];
