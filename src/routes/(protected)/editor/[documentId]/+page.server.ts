import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Id } from '@/convex/_generated/dataModel';

export const load: PageServerLoad = async ({ params, locals }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	
	// Inject Auth Token from Server Session
	if (locals.session?.accessToken) {
		client.setAuth(locals.session.accessToken);
	}

	const documentId = params.documentId as Id<'documents'>;

	try {
		const document = await client.query(api.documents.queries.get.get, { documentId });

		if (!document) {
			throw error(404, 'Document not found');
		}

		return {
			initialDocument: document,
			documentId,
			workosId: locals.session?.user?.id
		};
	} catch (e: any) {
		console.error('[SSR] Error fetching document:', e.message);
		
		// ━━━ ROBUSTNESS WINNER: Soft Fail on Auth/Sync Mismatch ━━━
		// If the user is authenticated in WorkOS but missing in Convex (not synced yet),
		// we return a shell state instead of a hard 403. This allows the client-side
		// UserSync component to fix the state.
		if (locals.session?.user && (e.message?.includes('authorized') || e.message?.includes('found'))) {
			console.warn('[SSR] User partially authenticated but not authorized. Falling back to client sync.');
			return {
				initialDocument: null,
				documentId,
				workosId: locals.session.user.id
			};
		}

		// Hard fail for non-auth errors or anonymous users
		throw error(404, 'Document not found or access denied');
	}
};
