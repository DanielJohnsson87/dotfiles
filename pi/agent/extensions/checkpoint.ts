/**
 * Checkpoint Extension
 *
 * Registers a `checkpoint` tool the LLM can call to label the current session
 * entry with a named bookmark. Labeled entries appear prominently in /tree,
 * making it easy to navigate back to key moments (e.g. "plan-ready").
 *
 * The feature-plan skill calls this automatically at key pipeline milestones.
 */

import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "checkpoint",
		label: "Checkpoint",
		description:
			"Label the current session entry as a named checkpoint for easy navigation in /tree. " +
			"Call this at key milestones so the user can jump back to them if needed.",
		promptSnippet: "Set a named checkpoint label on the current session entry",
		parameters: Type.Object({
			label: Type.String({
				description: "Short label name, e.g. 'brief-ready' or 'plan-ready'",
			}),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const leaf = ctx.sessionManager.getLeafEntry();
			if (!leaf) throw new Error("No current session entry to label");
			pi.setLabel(leaf.id, params.label);
			return {
				content: [{ type: "text", text: `Checkpoint set: "${params.label}"` }],
				details: { label: params.label, entryId: leaf.id },
			};
		},
	});
}
