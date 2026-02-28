"use node";

// Living Contract System - Core Mutations
// Example mutations using the hierarchical schema, validators, and helpers

import crypto from 'crypto';
import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import {
  createEnvelopeInputSchema,
  signEnvelopeInputSchema,
  updateBlockInputSchema,
} from './validators';
import {
  getDescendantBlocks,
  getRootBlocks,
  moveBlock,
  deleteBlockTree,
  areAllPartiesSigned,
  getPendingSigners,
  hashBlock,
  computeMerkleRoot,
} from './helpers';

// ============================================================================
// ENVELOPE MUTATIONS
// ============================================================================

/**
 * Create a new envelope (contract container)
 * WITH proper parent-child block relationship setup
 */
export const createEnvelope = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    templateId: v.optional(v.id('templates')),
    category: v.union(
      v.literal('financial'),
      v.literal('healthcare'),
      v.literal('employment'),
      v.literal('commercial'),
      v.literal('consumer'),
      v.literal('real_estate'),
      v.literal('intellectual_property'),
      v.literal('service_agreement'),
      v.literal('other')
    ),
    jurisdiction: v.union(v.literal('US'), v.literal('EU'), v.literal('UK'), v.literal('CA'), v.literal('AU'), v.literal('other')),
    parties: v.array(v.any()),
    documentJSON: v.any(), // Tiptap JSON
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const userId = identity.subject as Id<'users'>;

    // Generate envelope number (ENV-2026-001)
    const year = new Date().getFullYear();
    const counterName = `envelope_${year}`;

    // Get or create counter
    let counter = await ctx.db
      .query('counters')
      .withIndex('by_name_and_year', (q) => q.eq('name', counterName).eq('year', year))
      .first();

    if (!counter) {
      const counterId = await ctx.db.insert('counters', {
        name: counterName,
        year,
       currentValue: 1,
        updatedAt: Date.now(),
      });
      counter = await ctx.db.get(counterId);
    } else {
      await ctx.db.patch(counter._id, {
        currentValue: counter.currentValue + 1,
        updatedAt: Date.now(),
      });
      counter = await ctx.db.get(counter._id);
    }

    const envelopeNumber = `ENV-${year}-${String(counter!.currentValue).padStart(3, '0')}`;

    // Validate input with Zod
    const validatedData = createEnvelopeInputSchema.parse({
      ...args,
      createdBy: userId,
      updatedBy: userId,
      status: 'draft',
      liveBlocks: [],
      canDelete: true,
      isDeleted: false,
    });

    // Create envelope
    const envelopeId = await ctx.db.insert('envelopes', {
      ...validatedData,
      envelopeNumber,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any);

    // Create audit log entry
    await ctx.db.insert('auditLog', {
      envelopeId,
      userId,
      userEmail: identity.email!,
      userRole: 'author',
      action: 'created',
      metadata: {
        ipAddress: '0.0.0.0', // This would come from HTTP context
        userAgent: 'Mozilla/5.0', // This would come from HTTP context
      },
      timestamp: Date.now(),
    });

    return { envelopeId, envelopeNumber };
  },
});

/**
 * Add a new hierarchical block to an envelope
 * WITH proper parent-child relationship management
 */
export const addBlock = mutation({
  args: {
    envelopeId: v.id('envelopes'),
    blockId: v.string(),
    type: v.union(
      v.literal('paragraph'),
      v.literal('heading'),
      v.literal('table'),
      v.literal('list'),
      v.literal('signature'),
      v.literal('liveData'),
      v.literal('image'),
      v.literal('custom')
    ),
    parentBlockId: v.optional(v.string()),
    position: v.number(),
    content: v.any(),
    attrs: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const userId = identity.subject as Id<'users'>;
    const { envelopeId, blockId, parentBlockId, position, type, content, attrs } = args;

    // Calculate depth
    let depth = 0;
    if (parentBlockId) {
      const parent = await ctx.db
        .query('blocks')
        .withIndex('by_blockId', (q) => q.eq('blockId', parentBlockId))
        .first();

      if (!parent) throw new Error('Parent block not found');
      depth = parent.depth + 1;
    }

    // Hash the block
    const blockDoc = {
      blockId,
      type,
      content,
      attrs,
    } as any;
    const hash = hashBlock(blockDoc);

    // Create the block
    const newBlockId = await ctx.db.insert('blocks', {
      blockId,
      type,
      envelopeId,
      parentBlockId,
      childBlockIds: [],
      depth,
      position,
      content,
      attrs,
      hash,
      lastModified: Date.now(),
      modifiedBy: userId,
      version: 1,
      isDeleted: false,
    });

    // Update parent's childBlockIds if exists
    if (parentBlockId) {
      const parent = await ctx.db
        .query('blocks')
        .withIndex('by_blockId', (q) => q.eq('blockId', parentBlockId))
        .first();

      if (parent) {
        const updatedChildren = [...parent.childBlockIds];
        updatedChildren.splice(position, 0, blockId);

        await ctx.db.patch(parent._id, {
          childBlockIds: updatedChildren,
        });
      }
    }

    // Create audit log
    await ctx.db.insert('auditLog', {
      envelopeId,
      blockId,
      userId,
      userEmail: identity.email!,
      userRole: 'author',
      action: 'edited',
      changeDetails: {
        before: null,
        after: { blockId, type, content },
      },
      metadata: {
        ipAddress: '0.0.0.0',
        userAgent: 'Mozilla/5.0',
      },
      timestamp: Date.now(),
    });

    return { blockId: newBlockId };
  },
});

/**
 * Move a block to a new parent (reparenting)
 */
export const reparentBlock = mutation({
  args: {
    blockId: v.string(),
    newParentId: v.optional(v.string()),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await moveBlock(ctx, args);

    return { success: true };
  },
});

/**
 * Delete a block and all its descendants
 */
export const deleteBlock = mutation({
  args: {
    blockId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const deletedCount = await deleteBlockTree(ctx, args.blockId);

    return { deletedCount };
  },
});

/**
 * Sign an envelope (with Merkle tree snapshot)
 */
export const signEnvelope = mutation({
  args: {
    envelopeId: v.id('envelopes'),
    partyId: v.string(),
    signatureType: v.union(v.literal('SES'), v.literal('AES'), v.literal('QES'), v.literal('US_ESIGN')),
    signatureValue: v.string(),
    eudiWalletId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const userId = identity.subject as Id<'users'>;
    const { envelopeId, partyId, signatureType, signatureValue, eudiWalletId } = args;

    // Validate with Zod
    const validatedInput = signEnvelopeInputSchema.parse({
      ...args,
      consentGiven: true, // Should come from UI
    });

    // Get envelope
    const envelope = await ctx.db.get(envelopeId);
    if (!envelope) throw new Error('Envelope not found');

    // Find party
    const party = envelope.parties.find((p) => p.partyId === partyId);
    if (!party) throw new Error('Party not found');

    // 1. Compute Merkle root of current state
    const blocks = await ctx.db
      .query('blocks')
      .withIndex('by_envelope', (q) => q.eq('envelopeId', envelopeId))
      .collect();

    const blockHashes = blocks.map((b) => hashBlock(b));
    const merkleRoot = computeMerkleRoot(blockHashes);

    // 2. Create immutable snapshot
    const snapshotId = `snapshot_${Date.now()}_signature`;
    const snapshotDocId = await ctx.db.insert('contractSnapshots', {
      envelopeId,
      snapshotId,
      eventType: 'signature_event',
      yStateVector: new Uint8Array(), // Would come from Yjs
      documentJSON: envelope.documentJSON,
      merkleRoot,
      coreTermsHash: merkleRoot, // Simplified
      blockHashes: Object.fromEntries(blocks.map((b) => [b.blockId, hashBlock(b)])),
      liveBlockStates: {},
      createdBy: userId,
      createdAt: Date.now(),
    });

    // 3. Create signature record
    const signatureData = {
      userId,
      partyId,
      snapshotId,
      merkleRoot,
      timestamp: Date.now(),
    };
    const signatureHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(signatureData))
      .digest('hex');

    const documentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(envelope.documentJSON))
      .digest('hex');

    await ctx.db.insert('signatures', {
      envelopeId,
      partyId,
      userId,
      type: signatureType,
      signatureValue,
      signatureHash,
      snapshotId: snapshotDocId,
      merkleRootAtSigning: merkleRoot,
      documentHashAtSigning: documentHash,
      eudiWalletId,
      signedAt: Date.now(),
      ipAddress: '0.0.0.0',
      userAgent: 'Mozilla/5.0',
    });

    // 4. Update party in envelope
    const updatedParties = envelope.parties.map((p) =>
      p.partyId === partyId
        ? { ...p, signedAt: Date.now(), signatureType }
        : p
    );

    // 5. Check if all parties have signed
    const allSigned = await areAllPartiesSigned(ctx, envelopeId);

    await ctx.db.patch(envelopeId, {
      parties: updatedParties,
      status: allSigned ? 'fully_signed' : 'partially_signed',
      merkleRoot, // Update envelope's Merkle root
      updatedAt: Date.now(),
      updatedBy: userId,
    });

    // 6. Create audit log
    await ctx.db.insert('auditLog', {
      envelopeId,
      userId,
      userEmail: identity.email!,
      userRole: party.role,
      action: 'signed',
      changeDetails: {
        before: { status: envelope.status },
        after: { status: allSigned ? 'fully_signed' : 'partially_signed' },
      },
      metadata: {
        ipAddress: '0.0.0.0',
        userAgent: 'Mozilla/5.0',
      },
      timestamp: Date.now(),
    });

    // 7. Trigger webhook (would be async in production)
    // await scheduleWebhookNotification(ctx, { event: 'envelope.signed', envelopeId });

    return {
      signatureHash,
      snapshotId,
      merkleRoot,
      allSigned,
      pendingSigners: await getPendingSigners(ctx, envelopeId),
    };
  },
});

// ============================================================================
// QUERY EXAMPLES
// ============================================================================

/**
 * Get envelope with full block hierarchy
 */
export const getEnvelopeWithBlocks = query({
  args: { envelopeId: v.id('envelopes') },
  handler: async (ctx, args) => {
    const envelope = await ctx.db.get(args.envelopeId);
    if (!envelope) throw new Error('Envelope not found');

    // Get root blocks
    const rootBlocks = await getRootBlocks(ctx, { envelopeId: args.envelopeId });

    // For each root block, get descendants
    const blockTree = await Promise.all(
      rootBlocks.map(async (rootBlock) => ({
        ...rootBlock,
        descendants: await getDescendantBlocks(ctx, rootBlock.blockId),
      }))
    );

    return {
      envelope,
      blockTree,
    };
  },
});

/**
 * Get envelope's audit trail
 */
export const getEnvelopeAuditTrail = query({
  args: {
    envelopeId: v.id('envelopes'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const logs = await ctx.db
      .query('auditLog')
      .withIndex('by_envelope', (q) => q.eq('envelopeId', args.envelopeId))
      .order('desc')
      .take(limit);

    return logs;
  },
});

// ============================================================================
// AUDIT LOG MUTATIONS
// ============================================================================

/**
 * Create an audit log entry (called by Tiptap AuditTrailExtension)
 */
export const createAuditLog = mutation({
  args: {
    envelopeId: v.optional(v.id('envelopes')),
    templateId: v.optional(v.id('templates')),
    blockId: v.optional(v.string()),
    userId: v.string(),
    userEmail: v.string(),
    userRole: v.union(
      v.literal('author'),
      v.literal('reviewer'),
      v.literal('signer'),
      v.literal('approver'),
      v.literal('viewer'),
      v.literal('admin')
    ),
    action: v.union(
      v.literal('created'),
      v.literal('viewed'),
      v.literal('edited'),
      v.literal('commented'),
      v.literal('approved'),
      v.literal('rejected'),
      v.literal('signed'),
      v.literal('downloaded'),
      v.literal('shared'),
      v.literal('deleted'),
      v.literal('restored'),
      v.literal('api_sync'),
      v.literal('exported_pdf'),
      v.literal('sent_for_signature')
    ),
    changeDetails: v.optional(v.object({
      blockId: v.optional(v.string()),
      blockType: v.optional(v.string()),
      changeType: v.optional(v.string()),
      before: v.any(),
      after: v.any(),
      diff: v.optional(v.string()),
    })),
    metadata: v.object({
      ipAddress: v.string(),
      userAgent: v.string(),
      deviceFingerprint: v.optional(v.string()),
      geolocation: v.optional(v.object({
        country: v.string(),
        region: v.string(),
        city: v.string(),
      })),
      sessionId: v.optional(v.string()),
    }),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Note: This mutation can be called without authentication for signer actions
    // The userId is passed explicitly from the client context
    
    const auditEntry = await ctx.db.insert('auditLog', {
      envelopeId: args.envelopeId,
      templateId: args.templateId,
      blockId: args.blockId,
      userId: args.userId as any, // May be a signer ID or user ID
      userEmail: args.userEmail,
      userRole: args.userRole,
      action: args.action,
      changeDetails: args.changeDetails,
      metadata: args.metadata,
      timestamp: args.timestamp,
    });

    return { auditId: auditEntry };
  },
});
