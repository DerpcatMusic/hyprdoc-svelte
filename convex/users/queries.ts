/**
 * users/queries.ts - User Queries
 */
import { v } from "convex/values";
import { query, protectedQuery, internalQuery } from "@/convex/lib/core";

export const me = query({
	args: {},
	handler: async (ctx) => {
		if (!ctx.user) return null;
		return ctx.db.get(ctx.user._id);
	},
});

export const getByWorkosId = protectedQuery({
	args: {
		workosId: v.string(),
	},
	handler: async (ctx, args) => {
		return ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.unique();
	},
});

export const internalGetByWorkosId = internalQuery({
	args: {
		workosId: v.string(),
	},
	handler: async (ctx, args) => {
		return ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.unique();
	},
});
