// convex/documents/actions.ts
import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { internalAction } from '@/convex/_generated/server';

/**
 * Trigger completion API when all signers have signed.
 * Called from signatures.create mutation after detecting all signers completed.
 * Stores generated PDFs to Convex storage and updates document.
 */
export const triggerCompletion = internalAction({
	args: { documentId: v.id('documents') },
	returns: v.null(),
	handler: async (ctx, args) => {
		// Get the base URL from environment
		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL || process.env.CONVEX_SITE_URL || 'http://localhost:3000';

		// Fetch all necessary data for PDF generation internally
		const data = await ctx.runQuery(internal.documents.queries.signing.getForPdfGeneration, {
			documentId: args.documentId
		});

		if (!data) {
			console.error('[triggerCompletion] Document data not found');
			return null;
		}

		try {
			const response = await fetch(`${baseUrl}/api/documents/${args.documentId}/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					document: data.document,
					signatures: data.signatures,
					signers: data.signers,
					auditLogs: data.auditLogs
				})
			});

			if (!response.ok) {
				const error = await response.text();
				console.error('[triggerCompletion] API error:', error);
				throw new Error(`Completion API failed: ${response.status} ${error}`);
			}

			const result = await response.json();
			console.log('[triggerCompletion] PDF generation success');

			// Store PDFs to Convex storage
			if (result.signedPdfBase64) {
				// Store signed PDF
				const signedPdfStorageId = await ctx.runMutation(internal.storage.mutations.storePdf, {
					base64Data: result.signedPdfBase64,
					filename: `signed-${args.documentId}.pdf`
				});

				// Store audit PDF (fallback to signed if missing)
				let auditPdfStorageId: Id<'_storage'> | undefined;
				if (result.auditPdfBase64) {
					auditPdfStorageId = await ctx.runMutation(internal.storage.mutations.storePdf, {
						base64Data: result.auditPdfBase64,
						filename: `audit-${args.documentId}.pdf`
					});
				}

				// Update document with storage IDs
				await ctx.runMutation(internal.documents.mutations.internal.updateWithSignedPdfs, {
					documentId: args.documentId,
					signedPdfStorageId,
					auditPdfStorageId,
					completedHash: result.completedHash || ''
				});

				console.log('[triggerCompletion] PDFs stored successfully');

				// Schedule email notifications to all signers
				await ctx.scheduler.runAfter(0, internal.documents.actions.sendCompletionEmails, {
					documentId: args.documentId,
					signedPdfBase64: result.signedPdfBase64
				});
			}
		} catch (error) {
			console.error('[triggerCompletion] Failed:', error);
		}

		return null;
	}
});

/**
 * Send completion emails to all signers with the signed PDF attached.
 */
export const sendCompletionEmails = internalAction({
	args: {
		documentId: v.id('documents'),
		signedPdfBase64: v.string()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { generateDocumentCompletedEmail, sendEmailWithAttachments } = await import(
			'../lib/email'
		);
		const { format } = await import('date-fns');

		// Get document and signers
		const document = await ctx.runQuery(internal.documents.queries.get.getById, {
			documentId: args.documentId
		});

		if (!document) {
			console.error('[sendCompletionEmails] Document not found');
			return null;
		}

		// Get all signers for this document
		const signers = await ctx.runQuery(internal.documents.queries.signing.getSignersForEmail, {
			documentId: args.documentId
		});

		const completedAt = format(
			new Date(document.completedAt || Date.now()),
			"MMMM d, yyyy 'at' h:mm a"
		);

		// Send email to each signer
		for (const signer of signers) {
			if (!signer.email) { continue; }

			try {
				const emailContent = generateDocumentCompletedEmail({
					signerName: signer.legalName || signer.email,
					documentTitle: document.title || 'Document',
					completedAt
				});

				await sendEmailWithAttachments({
					to: signer.email,
					subject: emailContent.subject,
					html: emailContent.html,
					text: emailContent.text,
					attachments: [
						{
							filename: `${document.title || 'Document'}-signed.pdf`,
							content: args.signedPdfBase64,
							contentType: 'application/pdf'
						}
					]
				});

				console.log(`[sendCompletionEmails] Sent to ${signer.email}`);
			} catch (error) {
				console.error(`[sendCompletionEmails] Failed for ${signer.email}:`, error);
			}
		}

		return null;
	}
});
