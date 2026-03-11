/**
 * documents/sharing.ts - Document Collaboration & Sharing
 * ════════════════════════════════════════════════════════════════════════════
 * Manages document members and collaborators.
 */
import { zQuery, zid } from "../lib/core";

/**
 * Get all collaborators for a document, including owner and members.
 */
export const getCollaborators = zQuery({
	args: {
		documentId: zid("documents"),
	},
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.documentId);
		if (!doc) return null;

		// 1. Get Owner
		const owner = await ctx.db.get(doc.ownerId);

		// 2. Get Members
		const members = await ctx.db
			.query("documentMembers")
			.withIndex("by_document", (q) => q.eq("documentId", args.documentId))
			.collect();

		// 3. Hydrate members with user data
		const hydratedMembers = await Promise.all(
			members.map(async (m) => {
				const user = m.workosId ? await ctx.db.get(m.workosId) : null;
				return {
					...m,
					user: user ? {
						name: user.name,
						imageUrl: user.imageUrl,
					} : null,
				};
			}),
		);

		return {
			owner: owner ? {
				_id: owner._id,
				name: owner.name,
				email: owner.email,
				imageUrl: owner.imageUrl,
			} : null,
			members: hydratedMembers,
		};
	},
});
