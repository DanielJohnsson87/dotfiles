/**
 * Work Context Extension
 *
 * Ties git branch → session name → plan directory into a single "work context".
 *
 * On session start:
 *   1. Reads the current git branch name
 *   2. Fuzzy-matches it against ~/plans/ (depth 1 and 2) to find the plan directory
 *   3. If no match found, prompts to create ~/plans/<branch>/
 *   4. Sets the session name and a status bar indicator (⬡ green = plan found, yellow = no plan)
 *   5. Injects branch + plan path into the system prompt before each agent turn
 *
 * Override manually with: /work [plan-path]
 * Show current context:    /work
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

interface WorkContext {
	branch: string;
	repoName: string | null;
	planDir: string | null;
}

export default function (pi: ExtensionAPI) {
	let work: WorkContext | null = null;

	// ---------------------------------------------------------------------------
	// Fuzzy matching — Jaccard similarity on hyphen-split tokens
	// ---------------------------------------------------------------------------

	function fuzzyScore(a: string, b: string): number {
		if (a === b) return 1.0;
		const ta = new Set(a.toLowerCase().split("-").filter(Boolean));
		const tb = new Set(b.toLowerCase().split("-").filter(Boolean));
		const intersection = [...ta].filter((t) => tb.has(t)).length;
		const union = new Set([...ta, ...tb]).size;
		return union === 0 ? 0 : intersection / union;
	}

	async function getRepoName(): Promise<string | null> {
		try {
			const { stdout, code } = await pi.exec("git", ["remote", "get-url", "origin"], {
				timeout: 3000,
			});
			if (code !== 0 || !stdout.trim()) return null;
			// Handles SSH (git@github.com:org/repo.git) and HTTPS (https://github.com/org/repo.git)
			const match = stdout.trim().match(/\/([^\/]+?)(?:\.git)?$/);
			return match ? match[1] : null;
		} catch {
			return null;
		}
	}

	function findPlanDir(branch: string, repoName: string | null): string | null {
		const searchRoot = repoName
			? join(homedir(), "plans", repoName)
			: join(homedir(), "plans");
		if (!existsSync(searchRoot)) return null;

		let best: { path: string; score: number } | null = null;

		try {
			for (const entry of readdirSync(searchRoot)) {
				const fullPath = join(searchRoot, entry);
				try {
					if (!statSync(fullPath).isDirectory()) continue;
				} catch {
					continue;
				}
				const score = fuzzyScore(branch, entry);
				if (score >= 0.4 && (!best || score > best.score)) {
					best = { path: fullPath, score };
				}
			}
		} catch {
			return null;
		}

		return best?.path ?? null;
	}

	// ---------------------------------------------------------------------------
	// Status bar
	// ---------------------------------------------------------------------------

	function updateStatus(ui: { setStatus: Function; theme: any }) {
		if (!work) {
			ui.setStatus("work-context", undefined);
			return;
		}
		const t = ui.theme;
		const icon = work.planDir ? t.fg("success", "⬡") : t.fg("warning", "⬡");
		const name = t.fg("accent", work.branch);
		ui.setStatus("work-context", `${icon} ${name}`);
	}

	// ---------------------------------------------------------------------------
	// Helper: restore or detect, then apply
	// ---------------------------------------------------------------------------

	async function restoreOrDetect(
		ctx: Parameters<Parameters<typeof pi.on<"session_start">>[1]>[1],
	) {
		// Restore from the most recent persisted entry on the current branch
		const entries = ctx.sessionManager.getBranch();
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i] as any;
			if (entry.type === "custom" && entry.customType === "work-context") {
				work = entry.data as WorkContext;
				pi.setSessionName(work.branch);
				updateStatus(ctx.ui);
				return;
			}
		}

		// Fresh session — detect from git
		try {
			const { stdout, code } = await pi.exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
				timeout: 3000,
			});
			if (code !== 0 || !stdout.trim() || stdout.trim() === "HEAD") return;

			const branch = stdout.trim();
			const repoName = await getRepoName();
			const planDir = findPlanDir(branch, repoName);

			if (planDir) {
				work = { branch, repoName, planDir };
			} else if (ctx.hasUI) {
				const newPlanDir = repoName
					? join(homedir(), "plans", repoName, branch)
					: join(homedir(), "plans", branch);
				const displayPath = repoName
					? `~/plans/${repoName}/${branch}/`
					: `~/plans/${branch}/`;
				const confirmed = await ctx.ui.confirm(
					`No plan found for "${branch}"`,
					`Create plan directory at ${displayPath}?`,
				);
				work = { branch, repoName, planDir: confirmed ? newPlanDir : null };
				if (confirmed) mkdirSync(newPlanDir, { recursive: true });
			} else {
				work = { branch, repoName, planDir: null };
			}

			pi.setSessionName(branch);
			updateStatus(ctx.ui);
			pi.appendEntry("work-context", work);
		} catch {
			// Not a git repo or git unavailable — silent
		}
	}

	// ---------------------------------------------------------------------------
	// Events
	// ---------------------------------------------------------------------------

	pi.on("session_start", async (_event, ctx) => {
		await restoreOrDetect(ctx);
	});

	// Re-sync when navigating the session tree (/tree)
	pi.on("session_tree" as any, async (_event: any, ctx: any) => {
		const entries = ctx.sessionManager.getBranch();
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i] as any;
			if (entry.type === "custom" && entry.customType === "work-context") {
				work = entry.data as WorkContext;
				pi.setSessionName(work.branch);
				updateStatus(ctx.ui);
				return;
			}
		}
	});

	// Inject work context into system prompt before each agent turn
	pi.on("before_agent_start", async (event) => {
		if (!work) return undefined;

		const planLine = work.planDir
			? `Plan directory: ${work.planDir}`
			: `Plan directory: not set — run /work <path> to set one`;

		return {
			systemPrompt:
				event.systemPrompt + `\n\n## Work Context\n\nBranch: ${work.branch}\n${planLine}\n`,
		};
	});

	// ---------------------------------------------------------------------------
	// /work command
	// ---------------------------------------------------------------------------

	pi.registerCommand("work", {
		description: "Show or override the current work context. Usage: /work [plan-path]",
		handler: async (args, ctx) => {
			if (!args.trim()) {
				if (!work) {
					ctx.ui.notify("No work context — not in a git repo or branch not detected", "info");
				} else {
					ctx.ui.notify(`Branch: ${work.branch}\nPlan: ${work.planDir ?? "not set"}`, "info");
				}
				return;
			}

			// Resolve the provided path
			const raw = args.trim();
			const fullPath =
				raw.startsWith("/") || raw.startsWith("~")
					? raw.replace(/^~/, homedir())
					: work?.repoName
						? join(homedir(), "plans", work.repoName, raw)
						: join(homedir(), "plans", raw);

			if (!existsSync(fullPath)) {
				const confirmed = await ctx.ui.confirm(`"${fullPath}" doesn't exist`, "Create it?");
				if (!confirmed) return;
				mkdirSync(fullPath, { recursive: true });
			}

			const branch = work?.branch ?? "unknown";
			const repoName = work?.repoName ?? null;
			work = { branch, repoName, planDir: fullPath };
			pi.setSessionName(branch);
			pi.appendEntry("work-context", work);
			updateStatus(ctx.ui);
			ctx.ui.notify(`Work context → ${fullPath}`, "success");
		},
	});
}
