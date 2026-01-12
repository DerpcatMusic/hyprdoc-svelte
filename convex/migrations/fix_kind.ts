import { internalMutation } from '@/convex/_generated/server';

/**
 * Migration: Fix legacy kind values
 *
 * Converts old "envelope" type to proper terminology:
 * - If document is sealed (has sealedAt), it becomes "envelope"
 * - Otherwise, it becomes "template"
 *
 * Run with: npx convex run migrations/fix_document_types:migrate
 */
export const migrate = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Find all documents with legacy "envelope" type
		const envelopeDocs = await ctx.db
			.query('documents')
			.filter((q) => q.neq(q.field('documentType' as any), undefined))
			.collect();

		console.log(`[Migration] Found ${envelopeDocs.length} documents with 'envelope' type`);

		let templatesFixed = 0;
		let envelopesFixed = 0;

		for (const doc of envelopeDocs) {
			// Determine correct type based on sealed status
			const oldDoc = doc as any;
			const newType = oldDoc.documentType || (doc.sealedAt ? 'envelope' : 'template');

			await ctx.db.patch(doc._id, { kind: newType, documentType: undefined } as any);

			if (newType === 'envelope') {
				envelopesFixed++;
			} else {
				templatesFixed++;
			}

			console.log(`[Migration] Fixed ${doc._id}: envelope → ${newType}`);
		}

		console.log("[Migration] Complete:");
		console.log(`  - Converted to template: ${templatesFixed}`);
		console.log(`  - Converted to envelope: ${envelopesFixed}`);

		return {
			total: envelopeDocs.length,
			templatesFixed,
			envelopesFixed
		};
	}
});

/**
 * Also fix any documents with undefined/null kind
 */
export const fixUndefinedTypes = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Find all documents without a kind
		const allDocs = await ctx.db.query('documents').collect();

		const undefinedDocs = allDocs.filter((doc) => !doc.kind);

		console.log(`[Migration] Found ${undefinedDocs.length} documents without kind`);

		let templatesFixed = 0;
		let envelopesFixed = 0;

		for (const doc of undefinedDocs) {
			const newType = doc.sealedAt ? 'envelope' : 'template';

			await ctx.db.patch(doc._id, { kind: newType });

			if (newType === 'envelope') {
				envelopesFixed++;
			} else {
				templatesFixed++;
			}
		}

		console.log("[Migration] Complete:");
		console.log(`  - Set to template: ${templatesFixed}`);
		console.log(`  - Set to envelope: ${envelopesFixed}`);

		return {
			total: undefinedDocs.length,
			templatesFixed,
			envelopesFixed
		};
	}
});
