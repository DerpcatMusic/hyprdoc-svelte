/**
 * documents/mutations/create.ts - Create Document
 * ════════════════════════════════════════════════════════════════════════════
 * Creates a new document with default settings.
 */
import { zProtectedMutation, z, zid } from "@/convex/lib/core";
import { internal } from "@/convex/_generated/api";
import { DEFAULT_DOCUMENT_SETTINGS } from "@/convex/domains/settings";
import { hashContent } from "@/convex/lib/crypto";
import { recordInitialBlockLineage } from "@/convex/lib/services/block_lineage_service";
import {
  extractSmartBlocksFromContent,
  normalizeSmartBlockSnapshot,
} from "@hyprdoc/domain-types";

function cloneSnapshotValue<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveCanonicalBlocks(input: { content: string; blocks?: unknown }) {
  if (input.blocks !== undefined) {
    const normalized = normalizeSmartBlockSnapshot(input.blocks);
    if (normalized.length > 0) return normalized;
  }
  return extractSmartBlocksFromContent(input.content);
}

export const create = zProtectedMutation({
  args: {
    title: z.string(),
    content: z.string().optional(),
    isPublic: z.boolean().optional(),
    kind: z.enum(["template", "envelope"]).optional(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const kind = args.kind ?? "template";
    const content =
      args.content || JSON.stringify({ type: "doc", content: [] });

    const settings = {
      ...DEFAULT_DOCUMENT_SETTINGS,
      realTimeEnabled: false,
      ...(args.isPublic !== undefined && { isPublic: args.isPublic }),
    };

    const documentId = await ctx.db.insert("documents", {
      ownerId: ctx.user._id,
      title: args.title,
      content,
      blocks: [],
      settings,
      status: "draft",
      kind,
      isPublic: args.isPublic || false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("documentVersions", {
      documentId,
      version: 1,
      content,
      blocks: [],
      contentHash: await hashContent(content),
      createdAt: now,
      createdBy: ctx.user._id,
    });

    return documentId;
  },
});

export const createFromImport = zProtectedMutation({
  args: {
    title: z.string(),
    content: z.string(),
    blocks: z.any().optional(),
    slots: z.array(z.any()).optional(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const blocks = resolveCanonicalBlocks({
      content: args.content,
      blocks: args.blocks,
    });

    const documentId = await ctx.db.insert("documents", {
      ownerId: ctx.user._id,
      title: args.title,
      content: args.content,
      blocks,
      settings: DEFAULT_DOCUMENT_SETTINGS,
      status: "draft",
      kind: "template",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("documentVersions", {
      documentId,
      version: 1,
      content: args.content,
      blocks,
      contentHash: await hashContent(args.content),
      createdAt: now,
      createdBy: ctx.user._id,
    });

    await recordInitialBlockLineage(ctx, {
      documentId,
      blocks,
      createdBy: ctx.user._id,
      reason: "import",
      how: "createFromImport",
    });

    // Initialize slots if provided
    if (args.slots && Array.isArray(args.slots)) {
      for (let i = 0; i < args.slots.length; i++) {
        const s = args.slots[i];
        await ctx.db.insert("slots", {
          documentId,
          name: s.name || `Slot ${i + 1}`,
          role: s.role || "signer",
          color: s.color || "#3b82f6",
          order: i,
          createdAt: now,
        });
      }
    }

    return documentId;
  },
});

export const createEnvelopeFromTemplate = zProtectedMutation({
  args: {
    templateId: zid("documents"),
    title: z.string().optional(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    if (template.ownerId !== ctx.user._id) {
      throw new Error("Not authorized");
    }

    if (template.kind !== "template") {
      throw new Error("Only templates can create envelopes");
    }

    const now = Date.now();
    const nextInstanceNumber = (template.instanceCount ?? 0) + 1;
    const envelopeTitle =
      args.title?.trim() ||
      `${template.title} - Envelope #${nextInstanceNumber}`;
    const templateBlocks = resolveCanonicalBlocks({
      content: template.content,
      blocks: cloneSnapshotValue(template.blocks),
    });
    const templateParties = cloneSnapshotValue(template.parties);
    const templateSettings =
      cloneSnapshotValue(template.settings) ?? DEFAULT_DOCUMENT_SETTINGS;

    const envelopeId = await ctx.db.insert("documents", {
      ownerId: ctx.user._id,
      title: envelopeTitle,
      content: template.content,
      blocks: templateBlocks,
      parties: templateParties,
      settings: templateSettings,
      status: "draft",
      kind: "envelope",
      sourceTemplateId: template._id,
      instanceNumber: nextInstanceNumber,
      version: template.version,
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    });

    const templateSlots = await ctx.db
      .query("slots")
      .withIndex("by_document", (q) => q.eq("documentId", template._id))
      .collect();

    for (const slot of templateSlots) {
      await ctx.db.insert("slots", {
        documentId: envelopeId,
        name: slot.name,
        role: slot.role,
        color: slot.color,
        order: slot.order,
        defaultFields: cloneSnapshotValue(slot.defaultFields),
        createdAt: now,
      });
    }

    await ctx.db.patch(template._id, {
      instanceCount: nextInstanceNumber,
      updatedAt: now,
    });

    await ctx.db.insert("documentVersions", {
      documentId: envelopeId,
      version: template.version,
      content: template.content,
      blocks: templateBlocks,
      parties: templateParties,
      contentHash: await hashContent(template.content),
      createdAt: now,
      createdBy: ctx.user._id,
    });

    await recordInitialBlockLineage(ctx, {
      documentId: envelopeId,
      blocks: templateBlocks,
      createdBy: ctx.user._id,
      reason: "template_clone",
      how: "createEnvelopeFromTemplate",
    });

    await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
      workosId: ctx.user._id,
      actorType: "user" as const,
      documentId: envelopeId,
      resourceType: "template" as const,
      resourceId: String(template._id),
      action: "envelope.created_from_template",
      level: "info" as const,
      metadata: {
        envelopeId: String(envelopeId),
        templateId: String(template._id),
        templateVersion: template.version,
        instanceNumber: nextInstanceNumber,
      },
    });

    return { envelopeId, instanceNumber: nextInstanceNumber };
  },
});
