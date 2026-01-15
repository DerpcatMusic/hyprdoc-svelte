import { redirect } from '@sveltejs/kit';
import { getAuthorizationUrl } from '$lib/server/workos';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const returnTo = url.searchParams.get('returnTo');
	const state = returnTo ? JSON.stringify({ returnTo }) : undefined;

	// Parse query params for Direct Routing (Ultrathink)
    const provider = url.searchParams.get('provider');
    const screenHint = url.searchParams.get('screen_hint');
	const domainHint = url.searchParams.get('domain_hint');
	const connectionId = url.searchParams.get('connection_id');

	const authorizationUrl = await getAuthorizationUrl({
        state,
        provider: provider as any,
        screenHint: screenHint as any,
		domainHint: domainHint as any,
		connectionId: connectionId as any
    });

	throw redirect(302, authorizationUrl);
};
