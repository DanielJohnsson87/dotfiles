/** Parsed from input/prs.md */
export interface PrInput {
  owner: string;
  repo: string;
  number: number;
}

/** PR metadata from gh pr view */
export interface PrMeta {
  title: string;
  author: string;
  baseRefName: string;
  headRefName: string;
  url: string;
  number: number;
}

/** Inline review comment from /pulls/{n}/comments */
export interface ReviewComment {
  id: number;
  body: string;
  path: string;
  line: number | null;
  diffHunk: string;
  user: { login: string; type: string };
  inReplyToId: number | null;
  createdAt: string;
}

/** Top-level review from /pulls/{n}/reviews */
export interface Review {
  id: number;
  body: string;
  state: string;
  user: { login: string; type: string };
  createdAt: string;
}

/** General issue comment from /issues/{n}/comments */
export interface IssueComment {
  id: number;
  body: string;
  user: { login: string; type: string };
  createdAt: string;
}

/** A threaded comment group: parent + replies */
export interface CommentThread {
  parent: ReviewComment;
  replies: ReviewComment[];
}
