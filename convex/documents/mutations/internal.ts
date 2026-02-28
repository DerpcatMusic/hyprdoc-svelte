import { zInternalMutation, z, zid } from "../../lib/core";

/**
 * Update document with signed PDF storage IDs (internal only).
 * Called from triggerCompletion action after PDF generation.
 */
export const updateWithSignedPdfs = zInternalMutation({
  args: {
    documentId: zid("documents"),
    signedPdfStorageId: zid("_storage"),
    auditPdfStorageId: zid("_storage").optional(),
    completedHash: z.string(),
  },
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
