import { zQuery, z } from "../lib/core";

/**
 * Get a public URL for a storage ID.
 */
export const getFileUrl = zQuery({
  args: { storageId: z.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get the public site URL for HTTP actions.
 */
export const getSiteUrl = zQuery({
  args: {},
  handler: async () => {
    return (process.env.CONVEX_SITE_URL as string) ?? null;
  },
});
