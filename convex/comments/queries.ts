/**
 * comments/queries.ts - Comment Thread & Comment Queries
 * ════════════════════════════════════════════════════════════════════════════
 * Queries for fetching comment threads and individual comments.
 */
import { zProtectedQuery, z, zid } from "@/convex/lib/core";

/**
 * List all threads for a document with their comments
 */
export const listThreadsWithComments = zProtectedQuery({
	args: {
		documentId: zid("documents"),
		includeResolved: z.boolean().optional(),
	},
	handler: async (ctx, args) => {
		let threadsQuery = ctx.db
			.query("commentThreads")
			.withIndex("by_document", (q) => q.eq("documentId", args.documentId));

		const threads = await threadsQuery.order("asc").collect();

		// Filter resolved if needed
		const filteredThreads = args.includeResolved
			? threads
			: threads.filter((t) => !t.isResolved);

		// Get comments for each thread
		const result = await Promise.all(
			filteredThreads.map(async (thread) => {
				const comments = await ctx.db
					.query("comments")
					.withIndex("by_thread", (q) => q.eq("threadId", thread._id))
					.filter((q) => q.neq(q.field("isDeleted"), true))
					.order("asc")
					.collect();

				return {
					...thread,
					comments,
					commentCount: comments.length,
				};
			})
		);

		return result;
	},
});

/**
 * List threads only (without comments) for performance
 */
export const listThreads = zProtectedQuery({
	args: {
		documentId: zid("documents"),
		includeResolved: z.boolean().optional(),
	},
	handler: async (ctx, args) => {
		const threads = await ctx.db
			.query("commentThreads")
			.withIndex("by_document", (q) => q.eq("documentId", args.documentId))
			.order("asc")
			.collect();

		if (args.includeResolved) return threads;
		return threads.filter((t) => !t.isResolved);
	},
});

/**
 * Get a single thread with its comments
 */
export const getThread = zProtectedQuery({
	args: {
		threadId: zid("commentThreads"),
	},
	handler: async (ctx, args) => {
		const thread = await ctx.db.get(args.threadId);
		if (!thread) return null;

		const comments = await ctx.db
			.query("comments")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.filter((q) => q.neq(q.field("isDeleted"), true))
			.order("asc")
			.collect();

		return {
			...thread,
			comments,
			commentCount: comments.length,
		};
	},
});

/**
 * Count unresolved threads for a document (for badge)
 */
export const countUnresolved = zProtectedQuery({
	args: {
		documentId: zid("documents"),
	},
	handler: async (ctx, args) => {
		const threads = await ctx.db
			.query("commentThreads")
			.withIndex("by_document_resolved", (q) =>
				q.eq("documentId", args.documentId).eq("isResolved", false)
			)
			.collect();

		return threads.length;
	},
});

/**
 * Get comments for a specific thread
 */
export const getComments = zProtectedQuery({
	args: {
		threadId: zid("commentThreads"),
	},
	handler: async (ctx, args) => {
		return ctx.db
			.query("comments")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.filter((q) => q.neq(q.field("isDeleted"), true))
			.order("asc")
			.collect();
	},
});
