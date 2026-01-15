/**
 * documents/mutations/delete.ts - Delete Document
 */
import { v } from "convex/values";
import { protectedMutation } from "@/convex/lib/core";

export const remove = protectedMutation({
	args: {
		documentId: v.id("documents"),
	},
	handler: async (ctx, args) => {
		// RLS ensures we can only delete our own documents
		await ctx.db.delete(args.documentId);
	},
});
