/**
 * CommentMark.ts - Tiptap Mark for Comment Highlighting
 * ════════════════════════════════════════════════════════════════════════════
 * Custom mark extension to highlight text that has comments attached.
 */

import { Mark, mergeAttributes } from "@tiptap/core";

export interface CommentMarkOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		commentMark: {
			/** Set comment mark on selection */
			setCommentMark: (threadId: string) => ReturnType;
			/** Remove comment mark */
			unsetCommentMark: () => ReturnType;
			/** Toggle comment mark */
			toggleCommentMark: (threadId: string) => ReturnType;
		};
	}
}

export const CommentMark = Mark.create<CommentMarkOptions>({
	name: "commentMark",

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	addAttributes() {
		return {
			threadId: {
				default: null,
				parseHTML: (element) => element.getAttribute("data-thread-id"),
				renderHTML: (attributes) => {
					if (!attributes.threadId) return {};
					return { "data-thread-id": attributes.threadId };
				},
			},
			isResolved: {
				default: false,
				parseHTML: (element) => element.getAttribute("data-resolved") === "true",
				renderHTML: (attributes) => {
					if (!attributes.isResolved) return {};
					return { "data-resolved": "true" };
				},
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: "span[data-comment-mark]",
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"span",
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				"data-comment-mark": "",
				class: "comment-highlight",
			}),
			0,
		];
	},

	addCommands() {
		return {
			setCommentMark:
				(threadId: string) =>
				({ commands }) => {
					return commands.setMark(this.name, { threadId });
				},
			unsetCommentMark:
				() =>
				({ commands }) => {
					return commands.unsetMark(this.name);
				},
			toggleCommentMark:
				(threadId: string) =>
				({ commands }) => {
					return commands.toggleMark(this.name, { threadId });
				},
		};
	},
});

export default CommentMark;
