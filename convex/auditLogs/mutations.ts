import { zInternalMutation, z, zid } from "../lib/core";
import { auditMetadataSchema } from "../domains/audit";
import { generateAuditHash } from "../lib/crypto";

export const log = zInternalMutation({
  args: {
    workosId: zid("users").optional(),
    memberId: zid("documentMembers").optional(),
    actorType: z.enum(["user", "system", "member"]),
    documentId: zid("documents").optional(),
    resourceType: z.enum(["document", "template", "user"]),
    resourceId: z.string(),
    action: z.string(),
    level: z.enum(["info", "warn", "error", "security"]),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    sessionId: z.string().optional(),
    metadata: auditMetadataSchema,
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const previousEntry = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .first();
    const previousHash = previousEntry?.entryHash ?? null;
    const entryHash = await generateAuditHash(
      {
        action: args.action,
        timestamp,
        resourceId: args.resourceId,
        metadata: args.metadata,
      },
      previousHash,
    );

    await ctx.db.insert("auditLogs", {
      ...args,
      timestamp,
      previousHash: previousHash ?? undefined,
      entryHash,
    });
  },
});
