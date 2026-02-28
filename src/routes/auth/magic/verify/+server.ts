import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { setSessionCookie, workos } from '$lib/server/workos';
import type { RequestHandler } from './$types';

const verifySchema = z.object({
	email: z.string().trim().email(),
	code: z.string().trim().min(4).max(12),
	returnTo: z.string().optional()
});

function normalizeReturnTo(returnTo?: string) {
	if (!returnTo) return '/dashboard';
	if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return '/dashboard';
	return returnTo;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid request body' }, { status: 400 });
	}

	const parsed = verifySchema.safeParse(payload);
	if (!parsed.success) {
		return json({ success: false, error: 'Please provide a valid email and code' }, { status: 400 });
	}

	if (!env.WORKOS_CLIENT_ID || !env.WORKOS_COOKIE_PASSWORD) {
		console.error('[Auth Magic Verify] Missing WorkOS configuration');
		return json({ success: false, error: 'Authentication is not configured' }, { status: 500 });
	}

	const email = parsed.data.email.toLowerCase();
	const code = parsed.data.code.trim();
	const redirectTo = normalizeReturnTo(parsed.data.returnTo);

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

		if (!response.sealedSession) {
			console.error('[Auth Magic Verify] Missing sealed session from WorkOS response');
			return json({ success: false, error: 'Authentication failed. Please try again.' }, { status: 500 });
		}

		await setSessionCookie(cookies, response.sealedSession);
		return json({ success: true, redirectTo });
	} catch (error) {
		console.error('[Auth Magic Verify] Failed to verify magic code:', error);
		return json(
			{ success: false, error: 'Invalid or expired code. Request a new one and try again.' },
			{ status: 401 }
		);
	}
};

