import { error, redirect } from '@sveltejs/kit';
import { workos, setSessionCookie } from '$lib/server/workos';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!code) {
		throw error(400, 'No code provided');
	}

	let returnTo = '/dashboard';

	try {
        // Exchange Code
		const response = await workos.userManagement.authenticateWithCode({
			clientId: env.WORKOS_CLIENT_ID!,
			code,
			session: {
				sealSession: true,
				cookiePassword: env.WORKOS_COOKIE_PASSWORD!
			}
		});

        // Store Sealed Session
		if (response.sealedSession) {
			await setSessionCookie(cookies, response.sealedSession);
		}

		// Determine Redirect
		if (state) {
			try {
				const decoded = JSON.parse(state);
				if (decoded.returnTo) returnTo = decoded.returnTo;
			} catch {
				// ignore invalid state
			}
		}

	} catch (e) {
		console.error('Auth Callback Error:', e);
		throw redirect(302, '/login'); // Retry
	}

    throw redirect(302, returnTo);
};
