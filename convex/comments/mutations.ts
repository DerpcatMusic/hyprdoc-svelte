/**
 * comments/mutations.ts - Comment Thread & Comment CRUD
 * ════════════════════════════════════════════════════════════════════════════
 * Mutations for creating and managing comment threads and individual comments.
 */
import { zProtectedMutation, z, zid } from "@/convex/lib/core";

/**
 * Create a new comment thread anchored to a text range
 */
export const createThread = zProtectedMutation({
	args: {
		documentId: zid("documents"),
		anchorFrom: z.number(),
		anchorTo: z.number(),
		anchorText: z.string().optional(),
		initialComment: z.string(), // First comment content
		authorName: z.string(),
		authorColor: z.string().optional(),
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		// Create the thread
		const threadId = await ctx.db.insert("commentThreads", {
			documentId: args.documentId,
			anchorFrom: args.anchorFrom,
			anchorTo: args.anchorTo,
			anchorText: args.anchorText,
			isResolved: false,
			createdAt: now,
			createdBy: ctx.user._id,
			createdByName: args.authorName,
			createdByColor: args.authorColor ?? "#6366f1",
		});

		// Create the first comment
		await ctx.db.insert("comments", {
			threadId,
			documentId: args.documentId,
			content: args.initialComment,
			authorId: ctx.user._id,
			authorName: args.authorName,
			authorColor: args.authorColor ?? "#6366f1",
			createdAt: now,
		});

		return threadId;
	},
});

/**
 * Add a comment to an existing thread
 */
export const addComment = zProtectedMutation({
	args: {
		threadId: zid("commentThreads"),
		content: z.string(),
		authorName: z.string(),
		authorColor: z.string().optional(),
	},
	handler: async (ctx, args) => {
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error("Thread not found");

		return ctx.db.insert("comments", {
			threadId: args.threadId,
			documentId: thread.documentId,
			content: args.content,
			authorId: ctx.user._id,
			authorName: args.authorName,
			authorColor: args.authorColor ?? "#6366f1",
			createdAt: Date.now(),
		});
	},
});

/**
 * Resolve a comment thread
 */
export const resolveThread = zProtectedMutation({
	args: {
		threadId: zid("commentThreads"),
	},
	handler: async (ctx, args) => {
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error("Thread not found");

		await ctx.db.patch(args.threadId, {
			isResolved: true,
			resolvedAt: Date.now(),
			resolvedBy: ctx.user._id,
		});

		return { success: true };
	},
});

/**
 * Reopen a resolved thread
 */
export const reopenThread = zProtectedMutation({
	args: {
		threadId: zid("commentThreads"),
	},
	handler: async (ctx, args) => {
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error("Thread not found");

		await ctx.db.patch(args.threadId, {
			isResolved: false,
			resolvedAt: undefined,
			resolvedBy: undefined,
		});

		return { success: true };
	},
});

/**
 * Update text anchor positions (when document changes)
 */
export const updateAnchor = zProtectedMutation({
	args: {
		threadId: zid("commentThreads"),
		anchorFrom: z.number(),
		anchorTo: z.number(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.threadId, {
			anchorFrom: args.anchorFrom,
			anchorTo: args.anchorTo,
		});

		return { success: true };
	},
});

/**
 * Edit a comment
 */
export const editComment = zProtectedMutation({
	args: {
		commentId: zid("comments"),
		content: z.string(),
	},
	handler: async (ctx, args) => {
		const comment = await ctx.db.get(args.commentId);
		if (!comment) throw new Error("Comment not found");
		if (comment.authorId !== ctx.user._id) {
			throw new Error("Not authorized to edit this comment");
		}

		await ctx.db.patch(args.commentId, {
			content: args.content,
			editedAt: Date.now(),
		});

		return { success: true };
	},
});

/**
 * Delete a comment (soft delete)
 */
export const deleteComment = zProtectedMutation({
	args: {
		commentId: zid("comments"),
	},
	handler: async (ctx, args) => {
		const comment = await ctx.db.get(args.commentId);
		if (!comment) throw new Error("Comment not found");
		if (comment.authorId !== ctx.user._id) {
			throw new Error("Not authorized to delete this comment");
		}

		await ctx.db.patch(args.commentId, {
			isDeleted: true,
		});

		return { success: true };
	},
});

/**
 * Delete thread and all comments
 */
export const deleteThread = zProtectedMutation({
	args: {
		threadId: zid("commentThreads"),
	},
	handler: async (ctx, args) => {
		const thread = await ctx.db.get(args.threadId);
		if (!thread) throw new Error("Thread not found");

		// Delete all comments
		const comments = await ctx.db
			.query("comments")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.collect();

		for (const comment of comments) {
			await ctx.db.delete(comment._id);
		}

		// Delete thread
		await ctx.db.delete(args.threadId);

		return { success: true, deletedComments: comments.length };
	},
});
