import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import { setSessionCookie, workos } from '$lib/server/workos';
import type { RequestHandler } from './$types';

function normalizeReturnTo(returnTo?: string | null) {
	if (!returnTo) return '/dashboard';
	if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return '/dashboard';
	return returnTo;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const email = url.searchParams.get('email')?.toLowerCase();
	const code = url.searchParams.get('code');
	const returnTo = normalizeReturnTo(url.searchParams.get('returnTo'));

	if (!email || !code) {
		throw redirect(302, '/login');
	}

	if (!env.WORKOS_CLIENT_ID || !env.WORKOS_COOKIE_PASSWORD) {
		console.error('[Auth Magic Link Verify] Missing WorkOS configuration');
		throw redirect(302, '/login');
	}

	let sealedSession: string | undefined;

	try {
		const response = await workos.userManagement.authenticateWithMagicAuth({
			clientId: env.WORKOS_CLIENT_ID,
			email,
			code,
			session: {
				sealSession: true,
				cookiePassword: env.WORKOS_COOKIE_PASSWORD
			}
		});

		sealedSession = response.sealedSession;
	} catch (error) {
		console.error('[Auth Magic Link Verify] Failed to verify magic link:', error);
		throw redirect(302, '/login');
	}

	if (!sealedSession) {
		console.error('[Auth Magic Link Verify] Missing sealed session');
		throw redirect(302, '/login');
	}

	await setSessionCookie(cookies, sealedSession);
	throw redirect(302, returnTo);
};
