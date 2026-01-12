// convex/signatures/actions.ts
import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import { action } from '@/convex/_generated/server';

/**
 * Send signing complete email.
 */
export const sendCompletionEmail = action({
	args: {
		signerId: v.id('signers')
	},
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, args) => {
		const signer = await ctx.runQuery(internal.signers.queries.getSignerInternal, {
			signerId: args.signerId
		});

		if (!(signer?.signedAt)) { throw new Error('Signer has not signed'); }

		const document = await ctx.runQuery(internal.documents.queries.get.getDocumentInternal, {
			documentId: signer.documentId
		});

		if (!document) { throw new Error('Document not found'); }

		const { sendEmail, generateSigningCompleteEmail } = await import('../lib/email');
		const emailContent = generateSigningCompleteEmail({
			signerName: signer.legalName,
			documentTitle: document.title,
			signedAt: new Date(signer.signedAt).toLocaleString()
		});

		await sendEmail({ to: signer.email, ...emailContent });

		return { success: true };
	}
});
