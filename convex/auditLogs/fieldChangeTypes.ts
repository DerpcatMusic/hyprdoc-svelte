/**
 * Field Change Types for eIDAS 2.0 Compliant Audit Trail
 *
 * These types define the precise data structure for tracking field-level changes
 * during document signing, providing irrefutable proof of:
 * - What was filled
 * - When it was filled
 * - Who filled it
 * - From what IP/device
 * - Cryptographic hash for integrity verification
 */

import { v } from 'convex/values';
import { fieldChangeValueValidator } from '@/convex/lib/schemas';

// ═══════════════════════════════════════════════════════════════════════════
// Block Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export const BLOCK_TYPES = [
	'text_input',
	'signature',
	'initials',
	'checkbox',
	'dropdown',
	'date',
	'number',
	'email',
	'phone',
	'address',
	'rating',
	'payment',
	'long_text',
	'file_upload',
	'image_upload',
	'formula',
	'select',
	'radio_group'
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// Convex Validators
// ═══════════════════════════════════════════════════════════════════════════

export const blockTypeValidator = v.union(
	v.literal('text_input'),
	v.literal('signature'),
	v.literal('initials'),
	v.literal('checkbox'),
	v.literal('dropdown'),
	v.literal('date'),
	v.literal('number'),
	v.literal('email'),
	v.literal('phone'),
	v.literal('address'),
	v.literal('rating'),
	v.literal('payment'),
	v.literal('long_text'),
	v.literal('file_upload'),
	v.literal('image_upload'),
	v.literal('formula'),
	v.literal('select'),
	v.literal('radio_group'),
	v.literal('unknown') // Fallback for unrecognized types
);

/**
 * Validator for precise field change data
 * Used in logFieldUpdate mutation
 */
export const fieldChangeValidator = v.object({
	// Block identification
	blockId: v.string(),
	blockType: blockTypeValidator,
	label: v.string(),

	// Value tracking (before/after)
	previousValue: v.optional(fieldChangeValueValidator),
	newValue: fieldChangeValueValidator,

	// Cryptographic integrity
	valueHash: v.string(), // SHA-256 of newValue

	// Document context
	fieldPosition: v.optional(v.number()), // Order in document (0-indexed)
	isRequired: v.optional(v.boolean()),

	// Display info for audit trail
	isSensitive: v.optional(v.boolean()) // true for signatures/initials
});

/**
 * Enhanced signer context for audit logs
 */
export const signerContextValidator = v.object({
	signerId: v.string(),
	signerName: v.string(),
	signerEmail: v.string(),
	signerRole: v.optional(v.string())
});

// ═══════════════════════════════════════════════════════════════════════════
// TypeScript Interfaces (for lib/pdf and frontend)
// ═══════════════════════════════════════════════════════════════════════════

export interface FieldChangeRecord {
	// Block identification
	blockId: string;
	blockType: BlockType | 'unknown';
	label: string;

	// Value tracking
	previousValue: unknown;
	newValue: unknown;

	// Cryptographic integrity
	valueHash: string;

	// Document context
	fieldPosition?: number;
	isRequired?: boolean;
	isSensitive?: boolean;

	// Timing
	changedAt: number; // Unix timestamp (ms)

	// Actor
	changedBy: SignerContext;

	// Request context
	context: RequestContext;
}

export interface SignerContext {
	signerId: string;
	signerName: string;
	signerEmail: string;
	signerRole?: string;
}

export interface RequestContext {
	ipAddress?: string;
	userAgent?: string;
	geoLocation?: string;
	sessionId?: string;
}

/**
 * Enhanced audit trail data for PDF generation
 */
export interface EnhancedAuditTrailData {
	// Document Identity
	documentId: string;
	documentTitle: string;

	// Timeline
	createdAt: number;
	sealedAt?: number;
	completedAt?: number;

	// Cryptographic Integrity
	contentHash?: string;
	completedHash?: string;
	hashChainValid: boolean;

	// Signers with verification proof
	signers: EnhancedSignerInfo[];

	// Complete field change history (the core eIDAS 2 requirement)
	fieldChanges: FieldChangeRecord[];

	// All audit events (for complete timeline)
	auditLogs: AuditLogEntry[];

	// Verification URL for QR code
	verificationUrl?: string;
}

export interface EnhancedSignerInfo {
	legalName: string;
	email: string;
	phone?: string;
	role?: string;

	// Verification timestamps
	emailVerifiedAt?: number;
	phoneVerifiedAt?: number;
	consentGivenAt?: number;
	signedAt?: number;

	// Verification proof hashes
	emailOtpHash?: string;
	phoneOtpHash?: string;

	// Signing context
	consentIpAddress?: string;
	consentUserAgent?: string;
	consentGeoLocation?: string;

	// Session info
	firstAccessedAt?: number;
	totalSessionDuration?: number;
	fieldsCompleted?: number;
}

export interface AuditLogEntry {
	timestamp: number;
	action: string;
	level?: string;
	ipAddress?: string;
	userAgent?: string;
	geoLocation?: string;
	metadata?: Record<string, unknown>;
	entryHash?: string;

	// Enhanced: structured field change data
	fieldChange?: FieldChangeRecord;
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine if a block type contains sensitive data
 * that should be redacted in logs but hash-preserved
 */
export function isSensitiveBlockType(blockType: string): boolean {
	return ['signature', 'initials'].includes(blockType);
}

/**
 * Format a value for display in audit trail
 * Redacts sensitive values but preserves hash reference
 */
export function formatValueForAudit(
	value: unknown,
	isSensitive: boolean,
	valueHash?: string
): string {
	if (isSensitive) {
		return valueHash ? `[REDACTED] (hash: ${valueHash.slice(0, 16)}...)` : '[REDACTED]';
	}

	if (value === null || value === undefined) {
		return '—';
	}

	if (typeof value === 'boolean') {
		return value ? '☑ Yes' : '☐ No';
	}

	if (typeof value === 'object') {
		// Handle complex values (addresses, etc.)
		try {
			return JSON.stringify(value);
		} catch {
			return '[Complex Value]';
		}
	}

	return String(value);
}
