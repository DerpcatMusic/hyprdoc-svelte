import { v } from 'convex/values';
import type { Id } from '@/convex/_generated/dataModel';
import type { MutationCtx } from '@/convex/_generated/server';
import { internalMutation } from '@/convex/_generated/server';
import { generateAuditHash } from '@/convex/lib/crypto';
import { auditMetadataValidator, fieldChangeValueValidator } from '@/convex/lib/schemas';
import {
	actorTypeValidator,
	auditLevelValidator,
	requestContextValidator,
	resourceTypeValidator
} from '@/convex/lib/validators';

interface LogHelperArgs {
	workosId?: Id<'users'>;
	signerId?: Id<'signers'>;
	actorType: 'user' | 'signer' | 'system' | 'member';
	documentId?: Id<'documents'>;
	resourceType: 'user' | 'document' | 'template' | 'signer' | 'signature' | 'otp';
	resourceId: string;
	action: string;
	level: 'info' | 'warn' | 'error' | 'security';
	ipAddress?: string;
	userAgent?: string;
	geoLocation?: string;
	sessionId?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Helper to log audit events.
 * Can be used internally by other mutations.
 */
async function logHelper(ctx: MutationCtx, args: LogHelperArgs) {
	const timestamp = Date.now();

	// Get previous hash for chain integrity
	const lastEntry = await ctx.db.query('auditLogs').withIndex('by_timestamp').order('desc').first();

	const previousHash = lastEntry?.entryHash ?? null;

	// Generate entry hash including previous hash
	const entryHash = await generateAuditHash(
		{
			action: args.action,
			timestamp,
			resourceId: args.resourceId,
			metadata: args.metadata
		},
		previousHash
	);

	return await ctx.db.insert('auditLogs', {
		workosId: args.workosId,
		signerId: args.signerId,
		actorType: args.actorType,
		documentId: args.documentId,
		resourceType: args.resourceType,
		resourceId: args.resourceId,
		action: args.action,
		level: args.level,
		timestamp,
		ipAddress: args.ipAddress,
		userAgent: args.userAgent,
		geoLocation: args.geoLocation,
		sessionId: args.sessionId,
		metadata: args.metadata,
		previousHash: previousHash ?? undefined,
		entryHash
	});
}

/**
 * Internal mutation to log audit events.
 * Creates hash chain for tamper detection.
 */
export const log = internalMutation({
	args: {
		workosId: v.optional(v.id('users')),
		signerId: v.optional(v.id('signers')),
		actorType: actorTypeValidator,
		documentId: v.optional(v.id('documents')),
		resourceType: resourceTypeValidator,
		resourceId: v.string(),
		action: v.string(),
		level: auditLevelValidator,
		ipAddress: v.optional(v.string()),
		userAgent: v.optional(v.string()),
		geoLocation: v.optional(v.string()),
		sessionId: v.optional(v.string()),
		metadata: auditMetadataValidator
	},
	returns: v.id('auditLogs'),
	handler: async (ctx, args) => {
		return await logHelper(ctx, args);
	}
});

/**
 * Specialized internal mutation for logging field updates.
 * Enhanced for eIDAS 2.0 compliant audit trails with precise field-level data.
 *
 * Captures:
 * - Block type (text_input, signature, checkbox, etc.)
 * - Previous value (before change)
 * - New value (after change)
 * - SHA-256 hash of new value for integrity verification
 * - Field position in document
 * - Whether field is sensitive (signatures/initials)
 */
export const logFieldUpdate = internalMutation({
	args: {
		signerId: v.id('signers'),
		documentId: v.id('documents'),

		// Enhanced field change data
		fieldChange: v.object({
			blockId: v.string(),
			blockType: v.string(),
			label: v.string(),
			previousValue: v.optional(fieldChangeValueValidator),
			newValue: fieldChangeValueValidator,
			valueHash: v.string(),
			fieldPosition: v.optional(v.number()),
			isRequired: v.optional(v.boolean()),
			isSensitive: v.optional(v.boolean())
		}),

		// Request context
		ctx: requestContextValidator
	},
	handler: async (ctx, args) => {
		// Get signer info for enhanced context
		const signer = await ctx.db.get(args.signerId);
		const signerContext = signer
			? {
					signerId: args.signerId,
					signerName: signer.legalName,
					signerEmail: signer.email,
					signerRole: signer.role
				}
			: {
					signerId: args.signerId,
					signerName: 'Unknown',
					signerEmail: 'unknown'
				};

		// Build precise action description
		const action = args.fieldChange.isSensitive
			? `field.${args.fieldChange.blockType}.signed`
			: `field.${args.fieldChange.blockType}.updated`;

		await logHelper(ctx, {
			signerId: args.signerId,
			actorType: 'signer',
			documentId: args.documentId,
			resourceType: 'document',
			resourceId: args.documentId,
			action,
			level: 'info',
			ipAddress: args.ctx.ipAddress,
			userAgent: args.ctx.userAgent,
			geoLocation: args.ctx.geoLocation,
			metadata: {
				// Core field change data (eIDAS 2 requirement)
				fieldChange: {
					blockId: args.fieldChange.blockId,
					blockType: args.fieldChange.blockType,
					label: args.fieldChange.label,
					previousValue: args.fieldChange.isSensitive
						? '[REDACTED]'
						: args.fieldChange.previousValue,
					newValue: args.fieldChange.isSensitive ? '[REDACTED]' : args.fieldChange.newValue,
					valueHash: args.fieldChange.valueHash,
					fieldPosition: args.fieldChange.fieldPosition,
					isRequired: args.fieldChange.isRequired,
					isSensitive: args.fieldChange.isSensitive
				},
				// Signer context
				signer: signerContext,
				// Timestamp in ISO format for human readability
				changedAt: new Date().toISOString()
			}
		});
	}
});
