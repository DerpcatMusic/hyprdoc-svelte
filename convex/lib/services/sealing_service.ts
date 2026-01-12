/**
 * Sealing Service
 *
 * Centralized logic for document sealing operations.
 *
 * TERMINOLOGY:
 * - SEALED: Content hash created, document is tamper-proof (sealedAt is set)
 * - LOCKED: Cannot edit text/blocks (envelopes once sent)
 * - COMPLETED: All signers have signed (status === "completed")
 *
 * LIFECYCLE:
 * Template (draft) → Envelope (sealed + pending_signatures) → Completed
 */

import { hashContent } from '@/convex/lib/crypto';

export interface SealingContext {
	documentId: string;
	content: string;
	blocks: unknown[];
	settings: unknown;
	title: string;
}

export interface SealResult {
	contentHash: string;
	sealedAt: number;
}

/**
 * Generate the content hash for sealing.
 * This creates a cryptographic fingerprint of the document.
 */
export async function generateSealHash(ctx: SealingContext): Promise<string> {
	const contentToHash = JSON.stringify({
		title: ctx.title,
		content: ctx.content,
		blocks: ctx.blocks,
		settings: ctx.settings,
		timestamp: Date.now()
	});

	return await hashContent(contentToHash);
}

/**
 * Validate that a document can be sealed.
 * Returns error message if invalid, null if valid.
 */
export function validateForSealing(document: {
	status: string;
	sealedAt?: number;
	content: string;
}): string | null {
	if (document.status === 'completed') {
		return 'Cannot seal a completed document';
	}

	if (document.status === 'voided') {
		return 'Cannot seal a voided document';
	}

	if (document.sealedAt) {
		return 'Document is already sealed';
	}

	if (!document.content || document.content.trim().length === 0) {
		return 'Document has no content to seal';
	}

	return null;
}

/**
 * Check if a document structure is LOCKED (cannot edit text/blocks).
 *
 * LOCKED means:
 * - It's an envelope (kind === "envelope")
 * - AND it's been sealed (sealedAt is set) OR not in draft status
 *
 * Templates are NEVER locked - they're always editable.
 */
export function isDocumentLocked(document: {
	kind?: string;
	sealedAt?: number;
	status?: string;
}): boolean {
	// Templates and legacy docs (undefined kind) are always editable
	if (document.kind !== 'envelope') {
		return false;
	}

	// Envelopes are locked once:
	// 1. They have a seal timestamp (content hash created), OR
	// 2. They're not in draft (already sent for signing)
	return document.sealedAt !== undefined || document.status !== 'draft';
}

/**
 * Check if a document is SEALED (has cryptographic content hash).
 * This means the content is tamper-proof and should never change.
 *
 * NOTE: This is different from "completed" - a document can be sealed
 * but still awaiting signatures.
 */
export function isDocumentSealed(document: {
	kind?: string;
	sealedAt?: number;
	status?: string;
}): boolean {
	// Templates are never sealed
	if (document.kind === 'template') { return false; }

	// Sealed = has sealedAt timestamp OR is completed
	return (
		(document.sealedAt !== undefined && document.sealedAt !== null) ||
		document.status === 'completed'
	);
}

/**
 * Check if a document is COMPLETED (all signatures collected).
 * This is the final eIDAS-compliant state where the document is
 * fully executed and the completedHash should be set.
 */
export function isDocumentCompleted(document: { status?: string; completedAt?: number }): boolean {
	return document.status === 'completed' && document.completedAt !== undefined;
}

/**
 * Validate content hash integrity.
 * Compares the current content hash with the stored hash.
 */
export async function verifyContentIntegrity(
	ctx: SealingContext,
	expectedHash: string
): Promise<boolean> {
	const currentHash = await generateSealHash(ctx);
	return currentHash === expectedHash;
}
