/**
 * documents/mutations/delete.ts - Delete Document
 */
import { zProtectedMutation, zid } from "@/convex/lib/core";

export const remove = zProtectedMutation({
	args: {
		documentId: zid("documents"),
	},
	handler: async (ctx, args) => {
		// RLS ensures we can only delete our own documents
		await ctx.db.delete(args.documentId);
	},
});
