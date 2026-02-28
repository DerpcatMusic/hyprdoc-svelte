"use node";

// Living Contract System - Convex Helpers Integration
// Robust utilities for hierarchical relationships and state management

import crypto from 'crypto';
import { type Doc, type Id } from '../_generated/dataModel';
import {type QueryCtx, type MutationCtx } from '../_generated/server';

// ============================================================================
// HIERARCHICAL BLOCK TRAVERSAL
// ============================================================================

/**
 * Get all descendant blocks (children, grandchildren, etc.) for a given block
 * Uses breadth-first traversal to maintain order
 */
export async function getDescendantBlocks(
  ctx: QueryCtx,
  blockId: string
): Promise<Array<Doc<'blocks'>>> {
  const descendants: Array<Doc<'blocks'>> = [];
  const queue: string[] = [blockId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const block = await ctx.db
      .query('blocks')
      .withIndex('by_blockId', (q) => q.eq('blockId', currentId))
      .first();

    if (!block) continue;

    descendants.push(block);

    // Add children to queue
    queue.push(...block.childBlockIds);
  }

  return descendants.slice(1); // Exclude the root block itself
}

/**
 * Get all ancestor blocks (parent, grandparent, etc.) up to the root
 * Returns in order from immediate parent to root
 */
export async function getAncestorBlocks(
  ctx: QueryCtx,
  blockId: string
): Promise<Array<Doc<'blocks'>>> {
  const ancestors: Array<Doc<'blocks'>> = [];
  let currentId: string | undefined = blockId;

  while (currentId) {
    const block = await ctx.db
      .query('blocks')
      .withIndex('by_blockId', (q) => q.eq('blockId', currentId!))
      .first();

    if (!block || !block.parentBlockId) break;

    const parent = await ctx.db
      .query('blocks')
      .withIndex('by_blockId', (q) => q.eq('blockId', block.parentBlockId!))
      .first();

    if (parent) {
      ancestors.push(parent);
      currentId = parent.parentBlockId;
    } else {
      break;
    }
  }

  return ancestors;
}

/**
 * Get all sibling blocks (blocks with the same parent)
 */
export async function getSiblingBlocks(
  ctx: QueryCtx,
  blockId: string
): Promise<Array<Doc<'blocks'>>> {
  const block = await ctx.db
    .query('blocks')
    .withIndex('by_blockId', (q) => q.eq('blockId', blockId))
    .first();

  if (!block || !block.parentBlockId) return [];

  return await ctx.db
    .query('blocks')
    .withIndex('by_parent', (q) => q.eq('parentBlockId', block.parentBlockId!))
    .filter((q) => q.neq(q.field('blockId'), blockId))
    .collect();
}

/**
 * Get root blocks for a given envelope or template
 */
export async function getRootBlocks(
  ctx: QueryCtx,
  options: { envelopeId?: Id<'envelopes'>; templateId?: Id<'templates'> }
): Promise<Array<Doc<'blocks'>>> {
  const { envelopeId, templateId } = options;

  if (envelopeId) {
    return await ctx.db
      .query('blocks')
      .withIndex('by_envelope', (q) => q.eq('envelopeId', envelopeId))
      .filter((q) => q.eq(q.field('parentBlockId'), undefined))
      .order('asc')
      .collect();
  }

  if (templateId) {
    return await ctx.db
      .query('blocks')
      .withIndex('by_template', (q) => q.eq('templateId', templateId))
      .filter((q) => q.eq(q.field('parentBlockId'), undefined))
      .order('asc')
      .collect();
  }

  throw new Error('Must provide either envelopeId or templateId');
}

/**
 * Calculate the depth of a block in the tree
 */
export async function calculateBlockDepth(
  ctx: QueryCtx,
  blockId: string
): Promise<number> {
  const ancestors = await getAncestorBlocks(ctx, blockId);
  return ancestors.length;
}

// ============================================================================
// BLOCK HIERARCHY MUTATIONS
// ============================================================================

/**
 * Move a block to a new parent (reparenting)
 * Handles updating childBlockIds arrays and recalculating depths
 */
export async function moveBlock(
  ctx: MutationCtx,
  options: {
    blockId: string;
    newParentId: string | undefined;
    newPosition: number;
  }
): Promise<void> {
  const { blockId, newParentId, newPosition } = options;

  const block = await ctx.db
    .query('blocks')
    .withIndex('by_blockId', (q) => q.eq('blockId', blockId))
    .first();

  if (!block) throw new Error('Block not found');

  // Remove from old parent's children
  if (block.parentBlockId) {
    const oldParent = await ctx.db
      .query('blocks')
      .withIndex('by_blockId', (q) => q.eq('blockId', block.parentBlockId!))
      .first();

    if (oldParent) {
      await ctx.db.patch(oldParent._id, {
        childBlockIds: oldParent.childBlockIds.filter((id) => id !== blockId),
      });
    }
  }

  // Add to new parent's children
  if (newParentId) {
    const newParent = await ctx.db
      .query('blocks')
      .withIndex('by_blockId', (q) => q.eq('blockId', newParentId))
      .first();

    if (!newParent) throw new Error('New parent not found');

    const updatedChildren = [...newParent.childBlockIds];
    updatedChildren.splice(newPosition, 0, blockId);

    await ctx.db.patch(newParent._id, {
      childBlockIds: updatedChildren,
    });
  }

  // Update the block itself
  const newDepth = newParentId
    ? (await calculateBlockDepth(ctx, newParentId)) + 1
    : 0;

  await ctx.db.patch(block._id, {
    parentBlockId: newParentId,
    position: newPosition,
    depth: newDepth,
  });

  // Recursively update depths of all descendants
  await updateDescendantDepths(ctx, blockId);
}

/**
 * Recursively update depths of all descendant blocks
 */
async function updateDescendantDepths(
  ctx: MutationCtx,
  blockId: string
): Promise<void> {
  const block = await ctx.db
    .query('blocks')
    .withIndex('by_blockId', (q) => q.eq('blockId', blockId))
    .first();

  if (!block) return;

  for (const childId of block.childBlockIds) {
    const child = await ctx.db
      .query('blocks')
      .withIndex('by_blockId', (q) => q.eq('blockId', childId))
      .first();

    if (child) {
      await ctx.db.patch(child._id, {
        depth: block.depth + 1,
      });

      // Recursively update grandchildren
      await updateDescendantDepths(ctx, childId);
    }
  }
}

/**
 * Delete a block and all its descendants
 * Soft delete by setting isDeleted = true
 */
export async function deleteBlockTree(
  ctx: MutationCtx,
  blockId: string
): Promise<number> {
  const descendants = await getDescendantBlocks(ctx, blockId);
  const block = await ctx.db
    .query('blocks')
    .withIndex('by_blockId', (q) => q.eq('blockId', blockId))
    .first();

  if (!block) throw new Error('Block not found');

  // Soft delete the root block
  await ctx.db.patch(block._id, { isDeleted: true });

  // Soft delete all descendants
  for (const descendant of descendants) {
    await ctx.db.patch(descendant._id, { isDeleted: true });
  }

  return descendants.length + 1; // Total deleted
}

// ============================================================================
// ENVELOPE-TEMPLATE RELATIONSHIP HELPERS
// ============================================================================

/**
 * Get all envelopes created from a specific template
 */
export async function getEnvelopesFromTemplate(
  ctx: QueryCtx,
  templateId: Id<'templates'>
): Promise<Array<Doc<'envelopes'>>> {
  return await ctx.db
    .query('envelopes')
    .withIndex('by_template', (q) => q.eq('templateId', templateId))
    .collect();
}

/**
 * Get the latest version of a template
 */
export async function getLatestTemplateVersion(
  ctx: QueryCtx,
  parentTemplateId: Id<'templates'>
): Promise<Doc<'templates'> | null> {
  return await ctx.db
    .query('templates')
    .withIndex('by_parent', (q) => q.eq('parentTemplateId', parentTemplateId))
    .filter((q) => q.eq(q.field('isLatestVersion'), true))
    .first();
}

/**
 * Get all versions of a template (version history)
 */
export async function getTemplateVersions(
  ctx: QueryCtx,
  parentTemplateId: Id<'templates'>
): Promise<Array<Doc<'templates'>>> {
  return await ctx.db
    .query('templates')
    .withIndex('by_parent', (q) => q.eq('parentTemplateId', parentTemplateId))
    .order('desc')
    .collect();
}

// ============================================================================
// SNAPSHOT & VERSION CONTROL HELPERS
// ============================================================================

/**
 * Get all snapshots for an envelope, ordered by creation time
 */
export async function getEnvelopeSnapshots(
  ctx: QueryCtx,
  envelopeId: Id<'envelopes'>
): Promise<Array<Doc<'contractSnapshots'>>> {
  return await ctx.db
    .query('contractSnapshots')
    .withIndex('by_envelope', (q) => q.eq('envelopeId', envelopeId))
    .order('desc')
    .collect();
}

/**
 * Get the latest snapshot for an envelope
 */
export async function getLatestSnapshot(
  ctx: QueryCtx,
  envelopeId: Id<'envelopes'>
): Promise<Doc<'contractSnapshots'> | null> {
  return await ctx.db
    .query('contractSnapshots')
    .withIndex('by_envelope', (q) => q.eq('envelopeId', envelopeId))
    .order('desc')
    .first();
}

/**
 * Get all signature event snapshots
 */
export async function getSignatureSnapshots(
  ctx: QueryCtx,
  envelopeId: Id<'envelopes'>
): Promise<Array<Doc<'contractSnapshots'>>> {
  return await ctx.db
    .query('contractSnapshots')
    .withIndex('by_envelope', (q) => q.eq('envelopeId', envelopeId))
    .filter((q) => q.eq(q.field('eventType'), 'signature_event'))
    .order('desc')
    .collect();
}

// ============================================================================
// AUDIT LOG HELPERS
// ============================================================================

/**
 * Get paginated audit logs for an envelope
 */
export async function getEnvelopeAuditLogs(
  ctx: QueryCtx,
  options: {
    envelopeId?: Id<'envelopes'>;
    limit?: number;
    offset?: number;
  }
): Promise<Array<Doc<'auditLog'>>> {
  const { envelopeId, limit = 50, offset = 0 } = options;

  if (!envelopeId) throw new Error('envelopeId is required');

  const logs = await ctx.db
    .query('auditLog')
    .withIndex('by_envelope', (q) => q.eq('envelopeId', envelopeId))
    .order('desc')
    .collect();

  return logs.slice(offset, offset + limit);
}

/**
 * Get audit logs by action type
 */
export async function getAuditLogsByAction(
  ctx: QueryCtx,
  action: string,
  limit = 100
): Promise<Array<Doc<'auditLog'>>> {
  return await ctx.db
    .query('auditLog')
    .withIndex('by_action', (q) => q.eq('action', action))
    .order('desc')
    .take(limit);
}

// ============================================================================
// SIGNATURE & PARTY HELPERS
// ============================================================================

/**
 * Check if all required parties have signed
 */
export async function areAllPartiesSigned(
  ctx: QueryCtx,
  envelopeId: Id<'envelopes'>
): Promise<boolean> {
  const envelope = await ctx.db.get(envelopeId);
  if (!envelope) throw new Error('Envelope not found');

  const requiredParties = envelope.parties.filter((p) => p.signatureRequired);
  const signedParties = envelope.parties.filter((p) => p.signedAt !== undefined);

  return requiredParties.length === signedParties.length;
}

/**
 * Get all signatures for an envelope
 */
export async function getEnvelopeSignatures(
  ctx: QueryCtx,
  envelopeId: Id<'envelopes'>
): Promise<Array<Doc<'signatures'>>> {
  return await ctx.db
    .query('signatures')
    .withIndex('by_envelope', (q) => q.eq('envelopeId', envelopeId))
    .order('asc')
    .collect();
}

/**
 * Get pending signers (not yet signed)
 */
export async function getPendingSigners(
  ctx: QueryCtx,
  envelopeId: Id<'envelopes'>
): Promise<Array<{ partyId: string; name: string; email: string }>> {
  const envelope = await ctx.db.get(envelopeId);
  if (!envelope) throw new Error('Envelope not found');

  return envelope.parties
    .filter((p) => p.signatureRequired && !p.signedAt)
    .map((p) => ({
      partyId: p.partyId,
      name: p.name,
      email: p.email,
    }));
}

// ============================================================================
// MERKLE TREE UTILITIES
// ============================================================================

/**
 * Compute SHA-256 hash of a block (for Merkle tree)
 */
export function hashBlock(block: Doc<'blocks'>): string {
  const canonical = JSON.stringify({
    blockId: block.blockId,
    type: block.type,
    content: block.content,
    attrs: block.attrs.isLive
      ? { ...block.attrs, lastSync: undefined }
      : block.attrs,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Compute Merkle root from an array of block hashes
 */
export function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) throw new Error('Cannot compute Merkle root of empty array');
  if (hashes.length === 1) return hashes[0];

  const pairs: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = i + 1 < hashes.length ? hashes[i + 1] : hashes[i];
    const combined = crypto.createHash('sha256').update(left + right).digest('hex');
    pairs.push(combined);
  }

  return computeMerkleRoot(pairs);
}

/**
 * Generate Merkle proof for a specific block
 */
export async function generateMerkleProof(
  ctx: QueryCtx,
  envelopeId: Id<'envelopes'>,
  blockId: string
): Promise<{
  blockHash: string;
  siblingHashes: string[];
  rootHash: string;
}> {
  const blocks = await ctx.db
    .query('blocks')
    .withIndex('by_envelope', (q) => q.eq('envelopeId', envelopeId))
    .collect();

  const blockHashes = blocks.map((b) => hashBlock(b));
  const targetIndex = blocks.findIndex((b) => b.blockId === blockId);

  if (targetIndex === -1) throw new Error('Block not found');

  const siblingHashes: string[] = [];
  let currentIndex = targetIndex;
  let currentHashes = [...blockHashes];

  while (currentHashes.length > 1) {
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

    if (siblingIndex < currentHashes.length) {
      siblingHashes.push(currentHashes[siblingIndex]);
    }

    // Move up the tree
    const newHashes: string[] = [];
    for (let i = 0; i < currentHashes.length; i += 2) {
      const left = currentHashes[i];
      const right = i + 1 < currentHashes.length ? currentHashes[i + 1] : currentHashes[i];
      const combined = crypto.createHash('sha256').update(left + right).digest('hex');
      newHashes.push(combined);
    }

    currentIndex = Math.floor(currentIndex / 2);
    currentHashes = newHashes;
  }

  return {
    blockHash: blockHashes[targetIndex],
    siblingHashes,
    rootHash: currentHashes[0],
  };
}

// ============================================================================
// LIVE BLOCK SYNC HELPERS
// ============================================================================

/**
 * Get all live blocks for an envelope
 */
export async function getLiveBlocks(
  ctx: QueryCtx,
  envelopeId: Id<'envelopes'>
): Promise<Array<Doc<'blocks'>>> {
  return await ctx.db
    .query('blocks')
    .withIndex('by_envelope', (q) => q.eq('envelopeId', envelopeId))
    .filter((q) => q.eq(q.field('attrs.isLive'), true))
    .collect();
}

/**
 * Get live blocks that need syncing (based on sync interval)
 */
export async function getLiveBlocksNeedingSync(
  ctx: QueryCtx,
  envelopeId: Id<'envelopes'>
): Promise<Array<Doc<'blocks'>>> {
  const envelope = await ctx.db.get(envelopeId);
  if (!envelope) throw new Error('Envelope not found');

  const now = Date.now();
  const needingSyncIds = envelope.liveBlocks
    .filter((lb) => {
      if (!lb.lastSync) return true; // Never synced
      return now - lb.lastSync >= lb.syncInterval;
    })
    .map((lb) => lb.blockId);

  const allLiveBlocks = await getLiveBlocks(ctx, envelopeId);
  return allLiveBlocks.filter((b) => needingSyncIds.includes(b.blockId));
}
