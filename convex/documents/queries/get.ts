/**
 * documents/queries/get.ts - Get Document
 */
import { zQuery, z, zid } from "@/convex/lib/core";

export const get = zQuery({
	args: {
		documentId: z.string(), // Input can be ID or string for normalize
		guestToken: z.string().optional(),
	},
	handler: async (ctx, args) => {
		const docId = ctx.db.normalizeId("documents", args.documentId);
		if (!docId) return null;
		// RLS handles access control (public docs or owned docs)
		return ctx.db.get(docId);
	},
});

export { get as getById };
