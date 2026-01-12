import { v, type Infer } from 'convex/values';
import { mutation } from '@/convex/_generated/server';
import { requireDocumentAccess } from '@/convex/lib/auth';
import { documentSettingsValidator } from '@/convex/lib/schemas';

/**
 * Update default signer fields for a document.
 */
export const updateDefaultSignerFields = mutation({
	args: {
		documentId: v.id('documents'),
		fields: v.array(
			v.object({
				type: v.string(),
				label: v.string(),
				required: v.boolean(),
				placeholder: v.optional(v.string()),
				options: v.optional(v.array(v.string())),
				order: v.optional(v.number())
			})
		)
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { document } = await requireDocumentAccess(ctx, args.documentId, 'editor');
		const currentSettings = document.settings || {
			fontBody: 'Inter',
			fontHeading: 'Outfit',
			paperColor: '#ffffff',
			paperTexture: 'none',
			paperTextureOpacity: 0,
			paperTextureScale: 1,
			marginVertical: 40,
			marginHorizontal: 40,
			showMargins: false,
			mirrorMargins: false,
			timeFormat: '12h' as const
		};

		const newSettings: Infer<typeof documentSettingsValidator> = {
			...currentSettings,
			defaultSignerFields: args.fields
		};

		await ctx.db.patch(args.documentId, {
			settings: newSettings,
			updatedAt: Date.now()
		});
		return null;
	}
});
