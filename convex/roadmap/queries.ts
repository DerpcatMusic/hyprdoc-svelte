import { zQuery, z } from '../lib/core';

/**
 * Get all public roadmap items grouped by quarter
 * This is the primary query for the public /roadmap page
 */
export const getPublicRoadmap = zQuery({
	args: {},
	handler: async (ctx) => {
		const items = await ctx.db
			.query('roadmapItems')
			.withIndex('by_public', (q) => q.eq('isPublic', true))
			.collect();

		// Sort by quarter and order
		items.sort((a, b) => {
			if (a.quarter !== b.quarter) {
				return a.quarter.localeCompare(b.quarter);
			}
			return a.order - b.order;
		});

		// Group by quarter
		const grouped = items.reduce(
			(acc, item) => {
				if (!acc[item.quarter]) {
					acc[item.quarter] = [];
				}
				acc[item.quarter].push(item);
				return acc;
			},
			{} as Record<string, typeof items>
		);

		return {
			items,
			byQuarter: grouped,
			stats: {
				total: items.length,
				completed: items.filter((i) => i.status === 'completed').length,
				inProgress: items.filter((i) => i.status === 'in_progress').length,
				planned: items.filter((i) => i.status === 'planned').length
			}
		};
	}
});

/**
 * Get all roadmap items (admin view)
 */
export const getAllRoadmapItems = zQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query('roadmapItems').collect();
	}
});

/**
 * Get roadmap items by status
 */
export const getByStatus = zQuery({
	args: {
		status: z.enum(['planned', 'in_progress', 'completed'])
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query('roadmapItems')
			.withIndex('by_status', (q) => q.eq('status', args.status))
			.collect();
	}
});
