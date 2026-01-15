/**
 * documents/queries/get.ts - Get Document
 */
import { v } from "convex/values";
import { query } from "@/convex/lib/core";

export const get = query({
	args: {
		documentId: v.string(),
		guestToken: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const docId = ctx.db.normalizeId("documents", args.documentId);
		if (!docId) return null;
		// RLS handles access control (public docs or owned docs)
		return ctx.db.get(docId);
	},
});

export { get as getById };
