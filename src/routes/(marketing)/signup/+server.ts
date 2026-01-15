import { redirect } from '@sveltejs/kit';
import { getAuthorizationUrl } from '$lib/server/workos';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const returnTo = url.searchParams.get('returnTo') || '/dashboard';
	// We can encode returnTo in the state parameter
	const state = JSON.stringify({ returnTo });

	const authUrl = await getAuthorizationUrl({ 
		state, 
		screenHint: 'sign-up' 
	});

	throw redirect(302, authUrl);
};
