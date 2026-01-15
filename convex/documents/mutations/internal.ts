import { v } from "convex/values";
import { internalMutation } from "@/convex/_generated/server";

/**
 * Update document with signed PDF storage IDs (internal only).
 * Called from triggerCompletion action after PDF generation.
 */
export const updateWithSignedPdfs = internalMutation({
  args: {
    documentId: v.id("documents"),
    signedPdfStorageId: v.id("_storage"),
    auditPdfStorageId: v.optional(v.id("_storage")),
    completedHash: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      signedPdfStorageId: args.signedPdfStorageId,
      ...(args.auditPdfStorageId && {
        auditPdfStorageId: args.auditPdfStorageId,
      }),
      completedHash: args.completedHash,
    });
    return null;
  },
});
