/**
 * Certificate of Completion Mutations
 *
 * Handles generation and storage of Certificate of Completion PDFs.
 * Certificates are generated automatically when a document is completed.
 */

import { v } from 'convex/values';
import { internalMutation, mutation } from '../../_generated/server';

/**
 * Get next sequential certificate number for a given year
 * Uses atomic increment to ensure uniqueness
 */
export const getNextCertificateNumber = internalMutation({
	args: {},
	handler: async (ctx) => {
		const year = new Date().getFullYear();

		// Try to find existing counter for this year
		const existing = await ctx.db
			.query('counters')
			.withIndex('by_name_and_year', (q) => q.eq('name', 'certificate').eq('year', year))
			.unique();

		if (existing) {
			// Increment existing counter
			const newValue = existing.currentValue + 1;
			await ctx.db.patch(existing._id, {
				currentValue: newValue,
				updatedAt: Date.now()
			});
			return { year, sequence: newValue };
		}

		// Create new counter for this year
		await ctx.db.insert('counters', {
			name: 'certificate',
			year,
			currentValue: 1,
			updatedAt: Date.now()
		});
		return { year, sequence: 1 };
	}
});

/**
 * Store certificate details on a completed document
 */
export const storeCertificate = mutation({
	args: {
		documentId: v.id('documents'),
		certificateNumber: v.string(),
		certificateStorageId: v.id('_storage')
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) {
			throw new Error('Document not found');
		}

		if (document.status !== 'completed') {
			throw new Error('Certificate can only be stored for completed documents');
		}

		await ctx.db.patch(args.documentId, {
			certificateNumber: args.certificateNumber,
			certificateStorageId: args.certificateStorageId,
			certificateGeneratedAt: Date.now()
		});

		return { success: true };
	}
});

/**
 * Mark certificate as generated (internal use)
 */
export const markCertificateGenerated = internalMutation({
	args: {
		documentId: v.id('documents'),
		certificateNumber: v.string(),
		storageId: v.id('_storage')
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.documentId, {
			certificateNumber: args.certificateNumber,
			certificateStorageId: args.storageId,
			certificateGeneratedAt: Date.now()
		});
	}
});
