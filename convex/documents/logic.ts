// convex/documents/logic.ts

/**
 * Process content during envelope instantiation.
 *
 * NOTE: We no longer remap slotId to signerId on blocks.
 * Instead, blocks keep their original slotId and signers have sourceSlotId.
 * The signing page uses sourceSlotId for runtime ownership lookup.
 */
// biome-ignore lint/suspicious/noExplicitAny: Node structure is dynamic
export const remapContent = (node: any, _slotToSignerMap: Map<string, string>): any => {
	// No remapping needed - return content as-is
	// Blocks keep their slotId, signers reference via sourceSlotId
	return node;
};
