/**
 * JS/TS Auto-Format Extension
 *
 * After each agent response, automatically runs prettier and/or eslint --fix
 * on any JS/TS files that were written or edited during that turn.
 *
 * Detection strategy (all walk up the directory tree, so monorepos work):
 *   - Binaries: looks for node_modules/.bin/prettier|eslint starting from the
 *     project root and walking up (covers workspace roots in monorepos).
 *   - Config:   looks for the standard config files / package.json keys starting
 *     from the project root and walking up.
 *
 * Prettier runs first (formatting), then eslint --fix (lint auto-fixes).
 * Remaining eslint errors are shown as a warning notification.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JS_TS_EXTENSIONS = new Set([
	".js",
	".jsx",
	".ts",
	".tsx",
	".mjs",
	".cjs",
	".mts",
	".cts",
]);

const PRETTIER_CONFIG_FILES = [
	".prettierrc",
	".prettierrc.json",
	".prettierrc.yaml",
	".prettierrc.yml",
	".prettierrc.js",
	".prettierrc.cjs",
	".prettierrc.mjs",
	".prettierrc.toml",
	"prettier.config.js",
	"prettier.config.cjs",
	"prettier.config.mjs",
];

const ESLINT_CONFIG_FILES = [
	".eslintrc",
	".eslintrc.js",
	".eslintrc.cjs",
	".eslintrc.yaml",
	".eslintrc.yml",
	".eslintrc.json",
	"eslint.config.js",
	"eslint.config.cjs",
	"eslint.config.mjs",
	"eslint.config.ts",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isJsTs(filePath: string): boolean {
	return JS_TS_EXTENSIONS.has(extname(filePath).toLowerCase());
}

/**
 * Walk up from the file's directory to find the nearest package.json.
 * Returns that directory, or null if none is found.
 */
function findProjectRoot(filePath: string): string | null {
	let dir = dirname(resolve(filePath));
	while (true) {
		if (existsSync(join(dir, "package.json"))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return null; // reached filesystem root
		dir = parent;
	}
}

/**
 * Walk up from startDir looking for node_modules/.bin/<binName>.
 * Returns the full binary path, or null if not found.
 * Walking up handles monorepo workspace roots where the binary lives
 * one level above the sub-package.
 */
function findLocalBin(startDir: string, binName: string): string | null {
	let dir = startDir;
	while (true) {
		const bin = join(dir, "node_modules", ".bin", binName);
		if (existsSync(bin)) return bin;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

/**
 * Walk up from startDir looking for a prettier config file or a "prettier"
 * key in package.json. Returns true if found.
 */
function hasPrettierConfig(startDir: string): boolean {
	let dir = startDir;
	while (true) {
		if (PRETTIER_CONFIG_FILES.some((f) => existsSync(join(dir, f)))) return true;
		try {
			const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
			if ("prettier" in pkg) return true;
		} catch {
			// no package.json here or parse error — keep walking
		}
		const parent = dirname(dir);
		if (parent === dir) return false;
		dir = parent;
	}
}

/**
 * Walk up from startDir looking for an eslint config file or an "eslintConfig"
 * key in package.json. Returns true if found.
 */
function hasEslintConfig(startDir: string): boolean {
	let dir = startDir;
	while (true) {
		if (ESLINT_CONFIG_FILES.some((f) => existsSync(join(dir, f)))) return true;
		try {
			const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
			if ("eslintConfig" in pkg) return true;
		} catch {
			// keep walking
		}
		const parent = dirname(dir);
		if (parent === dir) return false;
		dir = parent;
	}
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
	// Files written or edited during the current agent run.
	// Reset at the start of each new user prompt.
	let editedFiles = new Set<string>();

	pi.on("agent_start", async () => {
		editedFiles = new Set();
	});

	// Collect JS/TS files that were successfully written or edited.
	pi.on("tool_result", async (event, ctx) => {
		if (event.isError) return;
		if (event.toolName !== "write" && event.toolName !== "edit") return;

		const input = event.input as { path?: string };
		if (!input.path) return;

		const absolutePath = resolve(ctx.cwd, input.path);
		if (isJsTs(absolutePath)) {
			editedFiles.add(absolutePath);
		}
	});

	// Run formatters once, after the agent has finished for this prompt.
	pi.on("agent_end", async (_event, ctx) => {
		if (editedFiles.size === 0) return;

		// Group files by their project root so multi-root workspaces each get
		// their own formatter invocation with the right binaries/config.
		const byRoot = new Map<string, string[]>();
		for (const file of editedFiles) {
			const root = findProjectRoot(file);
			if (!root) continue;
			const group = byRoot.get(root) ?? [];
			group.push(file);
			byRoot.set(root, group);
		}

		for (const [root, files] of byRoot) {
			// ----------------------------------------------------------------
			// Prettier
			// ----------------------------------------------------------------
			const prettierBin = findLocalBin(root, "prettier");
			if (prettierBin && hasPrettierConfig(root)) {
				const { code, stderr } = await pi.exec(prettierBin, ["--write", ...files]);
				if (ctx.hasUI) {
					if (code === 0) {
						ctx.ui.notify(`prettier: formatted ${files.length} file(s)`, "success");
					} else {
						ctx.ui.notify(`prettier failed:\n${stderr}`, "error");
					}
				}
			}

			// ----------------------------------------------------------------
			// ESLint
			// ----------------------------------------------------------------
			const eslintBin = findLocalBin(root, "eslint");
			if (eslintBin && hasEslintConfig(root)) {
				const { code, stdout, stderr } = await pi.exec(eslintBin, ["--fix", ...files]);
				if (ctx.hasUI) {
					if (code === 0) {
						ctx.ui.notify(`eslint: no issues in ${files.length} file(s)`, "success");
					} else {
						// exit 1 = unfixed lint errors, exit 2 = config/parse error
						const output = stdout.trim() || stderr.trim();
						ctx.ui.notify(`eslint: issues remaining after --fix:\n${output}`, "warning");
					}
				}
			}
		}
	});
}
