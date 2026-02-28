// convex/storage/mutations.ts
import { zMutation, zInternalMutation, z } from "../lib/core";

export const generateUploadUrl = zMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Store a PDF directly from a base64 string (internal use only).
 */
export const storePdf = zInternalMutation({
  args: {
    base64Data: z.string(),
    filename: z.string(),
  },
  handler: async (ctx, args) => {
    const buffer = Buffer.from(args.base64Data, "base64");
    const blob = new Blob([new Uint8Array(buffer)], {
      type: "application/pdf",
    });
    // Use unknown as any to bypass strict type checking for store method
    return await (ctx.storage as unknown as any).store(blob);
  },
});
