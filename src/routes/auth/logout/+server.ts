import { redirect } from '@sveltejs/kit';
import { destroySession, getLogoutUrl } from '$lib/auth/session.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const logoutUrl = await getLogoutUrl(cookies);
	destroySession(cookies);

	if (logoutUrl) {
		throw redirect(302, logoutUrl);
	}

	throw redirect(302, '/');
};
