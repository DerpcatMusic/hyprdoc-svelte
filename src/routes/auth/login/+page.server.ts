import { redirect } from '@sveltejs/kit';
import { getAuthorizationUrl } from '$lib/auth/session.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const authUrl = getAuthorizationUrl();
	throw redirect(302, authUrl);
};
