import type { PrInput } from "./types.js";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Parse a GitHub PR URL into owner, repo, and number.
 * Accepts: https://github.com/org/repo/pull/123
 */
export function parsePrUrl(url: string): PrInput {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    throw new Error(`Invalid PR URL: ${url}`);
  }
  return {
    owner: match[1],
    repo: match[2],
    number: parseInt(match[3], 10),
  };
}

/**
 * Build the repo slug: {owner}--{repo}
 * Double-dash avoids collision with hyphens in org/repo names.
 */
export function repoSlug(owner: string, repo: string): string {
  return `${owner}--${repo}`;
}

/**
 * Get the data directory for a repo.
 * Returns: ~/.config/review-patterns/{owner}--{repo}
 */
export function repoDataDir(owner: string, repo: string): string {
  return join(homedir(), ".config", "review-patterns", repoSlug(owner, repo));
}
