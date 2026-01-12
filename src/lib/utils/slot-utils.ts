/**
 * Slot/Signer Utilities
 *
 * Unified handling of slot data across the application.
 * Slots (template placeholders) and Signers (real people) share similar
 * structure for UI purposes - this module normalizes both.
 *
 * OWNERSHIP MODEL:
 * - Blocks have slotId (assigned during template editing)
 * - Signers have sourceSlotId (set when envelope is created from template)
 * - Lookup: block.slotId → find signer where signer.sourceSlotId === block.slotId
 */

import { normalizeId } from "./id";

/**
 * Normalized slot representation for UI consumption.
 * Used by SmartBlock extension and components.
 */
export interface NormalizedSlot {
  id: string;
  name: string;
  color: string;
  sourceSlotId?: string;
}

/**
 * Convert any slot-like or signer-like entity to a normalized format.
 * Handles: Convex slots, Convex signers, mapped slot objects from queries.
 */
export const toNormalizedSlot = (entity: unknown): NormalizedSlot => {
  if (!entity || typeof entity !== "object") {
    return { id: "", name: "Unknown", color: "#6366f1" };
  }

  const e = entity as Record<string, unknown>;

  return {
    id: normalizeId(entity) || "",
    name: (e.name as string) || (e.legalName as string) || (e.role as string) || "Signer",
    color: (e.color as string) || "#6366f1",
    // Support sourceSlotId from signers table
    sourceSlotId: e.sourceSlotId ? String(e.sourceSlotId) : undefined,
  };
};

/**
 * Convert an array of slot-like entities to normalized format.
 */
export const toNormalizedSlots = (entities: unknown[]): NormalizedSlot[] => {
  if (!Array.isArray(entities)) { return []; }
  return entities.map(toNormalizedSlot);
};

/**
 * Find the slot/signer that a block is assigned to.
 *
 * LOOKUP STRATEGY:
 * 1. TEMPLATE: Block has slotId → Direct match on slot._id
 * 2. ENVELOPE: Block has slotId → Match via signer.sourceSlotId
 *
 * @param slots - Array of normalized slots (can include both slots AND signers)
 * @param blockSlotId - The slotId from the block's attributes
 * @returns The matching slot/signer or null
 */
export const findSlotForBlock = (
  slots: NormalizedSlot[],
  blockSlotId: unknown
): NormalizedSlot | null => {
  const slotIdNorm = normalizeId(blockSlotId);

  if (!slotIdNorm) { return null; }

  // 1. Direct slotId match (templates)
  const directMatch = slots.find((s) => s.id === slotIdNorm);
  if (directMatch) { return directMatch; }

  // 2. Reverse lookup via sourceSlotId (envelopes)
  // Block keeps original slotId, signer has sourceSlotId pointing to it
  const sourceMatch = slots.find((s) => s.sourceSlotId === slotIdNorm);
  if (sourceMatch) { return sourceMatch; }

  return null;
};

/**
 * Check if a block belongs to a specific slot/signer.
 *
 * @param blockSlotId - The slotId from the block
 * @param targetSlotId - The slot/signer ID to check against
 * @param slots - Optional list of slots for sourceSlotId lookup
 */
export const isBlockAssignedToSlot = (
  blockSlotId: unknown,
  targetSlotId: unknown,
  slots?: NormalizedSlot[]
): boolean => {
  const bid = normalizeId(blockSlotId);
  const tid = normalizeId(targetSlotId);

  if (!(bid && tid)) { return false; }

  // Direct match
  if (bid === tid) { return true; }

  // Check via slot mapping if slots provided
  if (slots) {
    const assignedSlot = findSlotForBlock(slots, blockSlotId);
    return assignedSlot?.id === tid;
  }

  return false;
};

/**
 * Check if a block belongs to the current signer.
 *
 * @param blockSlotId - The slotId from the block
 * @param signerId - The current signer's ID
 * @param signerSourceSlotId - The current signer's sourceSlotId
 * @returns true if block belongs to this signer
 */
export const isBlockOwnedBySigner = (
  blockSlotId: unknown,
  signerId: string,
  signerSourceSlotId?: string
): boolean => {
  const slotIdNorm = normalizeId(blockSlotId);

  // Unassigned blocks: treat as NOT owned (require assignment)
  if (!slotIdNorm) { return false; }

  // Direct match: block.slotId matches signer ID (shouldn't happen, but handle)
  if (slotIdNorm === signerId) { return true; }

  // Standard case: block.slotId matches signer.sourceSlotId
  if (signerSourceSlotId && slotIdNorm === signerSourceSlotId) { return true; }

  return false;
};
