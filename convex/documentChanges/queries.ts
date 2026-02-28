/**
 * documentChanges/queries.ts - Track Changes Queries
 * ════════════════════════════════════════════════════════════════════════════
 * Queries for fetching document change suggestions.
 */
import { zProtectedQuery, z, zid } from "../lib/core";

// Status schema
const ChangeStatusSchema = z.enum(["pending", "accepted", "rejected"]);

/**
 * List all changes for a document, optionally filtered by status
 */
export const listByDocument = zProtectedQuery({
	args: {
		documentId: zid("documents"),
		status: ChangeStatusSchema.optional(),
	},
	handler: async (ctx, args) => {
		if (args.status) {
			return ctx.db
				.query("documentChanges")
				.withIndex("by_document_and_status", (q) =>
					q.eq("documentId", args.documentId).eq("status", args.status!)
				)
				.order("asc")
				.collect();
		}

		return ctx.db
			.query("documentChanges")
			.withIndex("by_document", (q) => q.eq("documentId", args.documentId))
			.order("asc")
			.collect();
	},
});

/**
 * Get pending changes count for a document (for UI badge)
 */
export const countPending = zProtectedQuery({
	args: {
		documentId: zid("documents"),
	},
	handler: async (ctx, args) => {
		const changes = await ctx.db
			.query("documentChanges")
			.withIndex("by_document_and_status", (q) =>
				q.eq("documentId", args.documentId).eq("status", "pending")
			)
			.collect();

		return changes.length;
	},
});

/**
 * Get a single change by its client-side changeId
 */
export const getByChangeId = zProtectedQuery({
	args: {
		documentId: zid("documents"),
		changeId: z.string(),
	},
	handler: async (ctx, args) => {
		const changes = await ctx.db
			.query("documentChanges")
			.withIndex("by_document", (q) => q.eq("documentId", args.documentId))
			.filter((q) => q.eq(q.field("changeId"), args.changeId))
			.first();

		return changes;
	},
});
