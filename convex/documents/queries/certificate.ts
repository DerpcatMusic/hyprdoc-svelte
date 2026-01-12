/**
 * Certificate Queries
 *
 * Queries for retrieving certificate information
 */

import { v } from 'convex/values';
import { query } from '../../_generated/server';

/**
 * Get certificate data for a completed document
 */
export const getCertificateData = query({
	args: {
		documentId: v.id('documents')
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) {
			return null;
		}

		// Get signers for this document
		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		// Build signer summaries
		const signerSummaries = signers
			.filter((s) => s.status === 'signed')
			.map((signer) => {
				const verificationMethods: ('email' | 'phone' | 'consent')[] = [];
				if (signer.emailVerifiedAt) { verificationMethods.push('email'); }
				if (signer.phoneVerifiedAt) { verificationMethods.push('phone'); }
				if (signer.consentGivenAt) { verificationMethods.push('consent'); }

				return {
					name: signer.legalName,
					email: signer.email,
					role: signer.role,
					signedAt: signer.signedAt ?? 0,
					verificationMethods
				};
			});

		return {
			documentId: args.documentId,
			documentTitle: document.title,
			documentType: document.kind,
			createdAt: document.createdAt,
			completedAt: document.completedAt ?? 0,
			contentHash: document.contentHash ?? '',
			completedHash: document.completedHash ?? '',
			signers: signerSummaries,
			certificateNumber: document.certificateNumber,
			certificateStorageId: document.certificateStorageId,
			certificateGeneratedAt: document.certificateGeneratedAt
		};
	}
});

/**
 * Check if a document has a certificate
 */
export const hasCertificate = query({
	args: {
		documentId: v.id('documents')
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) {
			return { hasCertificate: false };
		}

		return {
			hasCertificate: !!document.certificateStorageId,
			certificateNumber: document.certificateNumber,
			certificateGeneratedAt: document.certificateGeneratedAt
		};
	}
});
