import { redirect } from '@sveltejs/kit';
import { workos, getSessionCookie, clearSessionCookie } from '$lib/server/workos';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const sealedSession = getSessionCookie(cookies);

	if (sealedSession) {
		try {
			const session = workos.userManagement.loadSealedSession({
				sessionData: sealedSession,
				cookiePassword: env.WORKOS_COOKIE_PASSWORD!
			});
			const url = await session.getLogoutUrl();
			clearSessionCookie(cookies);
			throw redirect(302, url);
		} catch (e) {
			if (e instanceof Response) throw e;
			clearSessionCookie(cookies);
		}
	}

	throw redirect(302, '/');
};
