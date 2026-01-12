import { redirect } from '@sveltejs/kit';
import { getAuthorizationUrl } from '$lib/auth/session.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const state = url.searchParams.get('state') ?? '/';
	const authUrl = getAuthorizationUrl(state);
	throw redirect(302, authUrl);
};
