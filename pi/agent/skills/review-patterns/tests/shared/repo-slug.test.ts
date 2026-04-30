import { describe, test, expect } from "vitest";
import { parsePrUrl, repoSlug, repoDataDir } from "../../scripts/shared/repo-slug.js";
import { homedir } from "node:os";
import { join } from "node:path";

describe("parsePrUrl", () => {
  test("parses standard GitHub PR URL", () => {
    const result = parsePrUrl("https://github.com/acme/widget/pull/42");
    expect(result).toEqual({ owner: "acme", repo: "widget", number: 42 });
  });

  test("handles URLs with trailing slash", () => {
    const result = parsePrUrl("https://github.com/acme/widget/pull/42/");
    expect(result).toEqual({ owner: "acme", repo: "widget", number: 42 });
  });

  test("handles repo names with hyphens and dots", () => {
    const result = parsePrUrl("https://github.com/my-org/my-repo.js/pull/1");
    expect(result).toEqual({ owner: "my-org", repo: "my-repo.js", number: 1 });
  });

  test("throws on non-PR GitHub URL", () => {
    expect(() => parsePrUrl("https://github.com/acme/widget/issues/42")).toThrow(
      "Invalid PR URL"
    );
  });

  test("throws on malformed URL", () => {
    expect(() => parsePrUrl("not-a-url")).toThrow("Invalid PR URL");
  });

  test("throws on empty string", () => {
    expect(() => parsePrUrl("")).toThrow("Invalid PR URL");
  });
});

describe("repoSlug", () => {
  test("joins owner and repo with double-dash", () => {
    expect(repoSlug("acme", "widget")).toBe("acme--widget");
  });

  test("preserves hyphens in org and repo names", () => {
    expect(repoSlug("my-org", "my-repo")).toBe("my-org--my-repo");
  });
});

describe("repoDataDir", () => {
  test("returns path under ~/.config/review-patterns/", () => {
    const result = repoDataDir("acme", "widget");
    expect(result).toBe(join(homedir(), ".config", "review-patterns", "acme--widget"));
  });
});
