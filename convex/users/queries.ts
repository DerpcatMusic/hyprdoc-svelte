/**
 * users/queries.ts - User Queries
 */
import { zQuery, zProtectedQuery, zInternalQuery, z } from "../lib/core";

export const me = zQuery({
	args: {},
	handler: async (ctx) => {
		if (!ctx.user) return null;
		// ctx.user already contains the user object from zQuery context if available,
		// but let's re-fetch to ensure the latest state if needed, or just return ctx.user.
		// Usually we re-fetch to get the full document from DB.
		return ctx.db.get(ctx.user._id);
	},
});

export const getByWorkosId = zProtectedQuery({
	args: {
		workosId: z.string(),
	},
	handler: async (ctx, args) => {
		return ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.unique();
	},
});

export const internalGetByWorkosId = zInternalQuery({
	args: {
		workosId: z.string(),
	},
	handler: async (ctx, args) => {
		return ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.unique();
	},
});
