import { internalMutation } from "../lib/core";
import { v } from "convex/values";
import { auditMetadataValidator } from "../domains/audit";

export const log = internalMutation({
  args: {
    workosId: v.optional(v.id("users")),
    memberId: v.optional(v.id("documentMembers")),
    actorType: v.union(
      v.literal("user"),
      v.literal("system"),
      v.literal("member")
    ),

    documentId: v.optional(v.id("documents")),

    resourceType: v.union(
      v.literal("document"),
      v.literal("template"),
      v.literal("user")
    ),
    resourceId: v.string(),

    action: v.string(),
    level: v.union(
      v.literal("info"),
      v.literal("warn"),
      v.literal("error"),
      v.literal("security")
    ),

    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    
    metadata: auditMetadataValidator,
  },
  handler: async (ctx, args) => {
    // Generate a simple hash for entryHash as required by schema
    // In production this might be a cryptographic hash of the content
    const entryHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    await ctx.db.insert("auditLogs", {
      ...args,
      timestamp: Date.now(),
      entryHash, 
    });
  },
});
