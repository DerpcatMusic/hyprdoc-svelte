// convex/storage/mutations.ts
import { v } from "convex/values";
import { internalMutation, mutation } from "@/convex/_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Store a PDF directly from a base64 string (internal use only).
 */
export const storePdf = internalMutation({
  args: {
    base64Data: v.string(),
    filename: v.string(),
  },
  returns: v.id("_storage"),
  handler: async (ctx, args) => {
    const buffer = Buffer.from(args.base64Data, "base64");
    const blob = new Blob([new Uint8Array(buffer)], {
      type: "application/pdf",
    });
    // Use unknown as any to bypass strict type checking for store method
    return await (ctx.storage as unknown as any).store(blob);
  },
});
