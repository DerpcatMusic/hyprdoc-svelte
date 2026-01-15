import { v } from "convex/values";
import { query } from "@/convex/_generated/server";

/**
 * Get a public URL for a storage ID.
 */
export const getFileUrl = query({
  args: { storageId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get the public site URL for HTTP actions.
 */
export const getSiteUrl = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async () => {
    return process.env.CONVEX_SITE_URL ?? null;
  },
});
