/**
 * documentChanges/mutations.ts - Track Changes CRUD
 * ════════════════════════════════════════════════════════════════════════════
 * Mutations for creating and managing document change suggestions (redlining).
 */
import { zProtectedMutation, z, zid } from "../lib/core";

// Schema for change type
const ChangeTypeSchema = z.enum(["insertion", "deletion", "replacement"]);

/**
 * Create a new tracked change (insertion, deletion, or replacement)
 */
export const create = zProtectedMutation({
	args: {
		documentId: zid("documents"),
		changeType: ChangeTypeSchema,
		originalContent: z.string().optional(),
		newContent: z.string().optional(),
		position: z.number(),
		endPosition: z.number().optional(),
		authorName: z.string(),
		authorColor: z.string().optional(),
		changeId: z.string(), // Client-side UUID for mapping to marks
		comment: z.string().optional(),
	},
	handler: async (ctx, args) => {
		// Verify document access
		const doc = await ctx.db.get(args.documentId);
		if (!doc) throw new Error("Document not found");

		return ctx.db.insert("documentChanges", {
			documentId: args.documentId,
			changeType: args.changeType,
			originalContent: args.originalContent,
			newContent: args.newContent,
			position: args.position,
			endPosition: args.endPosition,
			authorId: ctx.user._id,
			authorName: args.authorName,
			authorColor: args.authorColor ?? "#6366f1",
			changeId: args.changeId,
			status: "pending",
			createdAt: Date.now(),
			comment: args.comment,
		});
	},
});

/**
 * Accept a pending change (apply it permanently)
 */
export const accept = zProtectedMutation({
	args: {
		id: zid("documentChanges"),
	},
	handler: async (ctx, args) => {
		const change = await ctx.db.get(args.id);
		if (!change) throw new Error("Change not found");
		if (change.status !== "pending") {
			throw new Error(`Change already ${change.status}`);
		}

		// Verify user owns the document
		const doc = await ctx.db.get(change.documentId);
		if (!doc || doc.ownerId !== ctx.user._id) {
			throw new Error("Not authorized to accept changes");
		}

		await ctx.db.patch(args.id, {
			status: "accepted",
			resolvedAt: Date.now(),
			resolvedBy: ctx.user._id,
		});

		return { success: true, changeId: change.changeId };
	},
});

/**
 * Reject a pending change (discard it)
 */
export const reject = zProtectedMutation({
	args: {
		id: zid("documentChanges"),
	},
	handler: async (ctx, args) => {
		const change = await ctx.db.get(args.id);
		if (!change) throw new Error("Change not found");
		if (change.status !== "pending") {
			throw new Error(`Change already ${change.status}`);
		}

		// Verify user owns the document
		const doc = await ctx.db.get(change.documentId);
		if (!doc || doc.ownerId !== ctx.user._id) {
			throw new Error("Not authorized to reject changes");
		}

		await ctx.db.patch(args.id, {
			status: "rejected",
			resolvedAt: Date.now(),
			resolvedBy: ctx.user._id,
		});

		return { success: true, changeId: change.changeId };
	},
});

/**
 * Accept all pending changes for a document
 */
export const acceptAll = zProtectedMutation({
	args: {
		documentId: zid("documents"),
	},
	handler: async (ctx, args) => {
		// Verify user owns the document
		const doc = await ctx.db.get(args.documentId);
		if (!doc || doc.ownerId !== ctx.user._id) {
			throw new Error("Not authorized");
		}

		const pendingChanges = await ctx.db
			.query("documentChanges")
			.withIndex("by_document_and_status", (q) =>
				q.eq("documentId", args.documentId).eq("status", "pending")
			)
			.collect();

		const now = Date.now();
		for (const change of pendingChanges) {
			await ctx.db.patch(change._id, {
				status: "accepted",
				resolvedAt: now,
				resolvedBy: ctx.user._id,
			});
		}

		return { accepted: pendingChanges.length };
	},
});

/**
 * Reject all pending changes for a document
 */
export const rejectAll = zProtectedMutation({
	args: {
		documentId: zid("documents"),
	},
	handler: async (ctx, args) => {
		// Verify user owns the document
		const doc = await ctx.db.get(args.documentId);
		if (!doc || doc.ownerId !== ctx.user._id) {
			throw new Error("Not authorized");
		}

		const pendingChanges = await ctx.db
			.query("documentChanges")
			.withIndex("by_document_and_status", (q) =>
				q.eq("documentId", args.documentId).eq("status", "pending")
			)
			.collect();

		const now = Date.now();
		for (const change of pendingChanges) {
			await ctx.db.patch(change._id, {
				status: "rejected",
				resolvedAt: now,
				resolvedBy: ctx.user._id,
			});
		}

		return { rejected: pendingChanges.length };
	},
});
