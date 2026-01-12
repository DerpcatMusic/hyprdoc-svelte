import { v } from 'convex/values';
import { internalQuery, query } from '@/convex/_generated/server';
import { userReturnValidator } from '@/convex/lib/validators';

/**
 * Get current user profile.
 */
export const me = query({
	args: {},
	returns: v.union(userReturnValidator, v.null()),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		return user;
	}
});

/**
 * Get user by WorkOS ID.
 */
export const get = query({
	args: { workosId: v.string() },
	returns: v.union(userReturnValidator, v.null()),
	handler: async (ctx, args) => {
		return await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', args.workosId))
			.unique();
	}
});

/**
 * Get user by ID (internal use).
 */
export const getUserInternal = internalQuery({
	args: { workosId: v.id('users') },
	returns: v.union(userReturnValidator, v.null()),
	handler: async (ctx, args) => {
		return await ctx.db.get(args.workosId);
	}
});

