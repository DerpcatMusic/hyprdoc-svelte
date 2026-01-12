// convex/documents/queries/templates.ts
import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';

/**
 * List public templates (marketplace).
 */
export const listPublicTemplates = query({
	args: {
		category: v.optional(v.string()),
		limit: v.optional(v.number())
	},
	returns: v.array(
		v.object({
			_id: v.id('documents'),
			_creationTime: v.number(),
			title: v.string(),
			description: v.optional(v.string()),
			category: v.optional(v.string()),
			usageCount: v.number(),
			updatedAt: v.number(),
			ownerId: v.id('users')
		})
	),
	handler: async (ctx, args) => {
		const limit = args.limit ?? 50;

		// Optimized: Use index "by_public_template"
		const templates = await ctx.db
			.query('documents')
			.withIndex('by_public_template', (q) => q.eq('isPublic', true).eq('kind', 'template'))
			.order('desc')
			.take(limit);

		let filteredTemplates = templates;

		if (args.category) {
			filteredTemplates = templates.filter((t) => t.settings?.category === args.category);
		}

		return filteredTemplates.map((t) => ({
			_id: t._id,
			_creationTime: t._creationTime,
			title: t.title,
			description: t.settings?.description,
			category: t.settings?.category,
			usageCount: t.instanceCount || 0,
			updatedAt: t.updatedAt,
			ownerId: t.ownerId
		}));
	}
});
