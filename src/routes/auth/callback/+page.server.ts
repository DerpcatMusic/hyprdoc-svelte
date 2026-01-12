import { redirect } from '@sveltejs/kit';
import { authenticateWithCode } from '$lib/auth/session.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('state') ?? '/dashboard';

	if (!code) {
		throw redirect(302, '/login?error=no_code');
	}

	try {
		await authenticateWithCode(code, cookies);
	} catch (error) {
		console.error('Auth callback error:', error);
		throw redirect(302, '/login?error=auth_failed');
	}

	throw redirect(302, next);
};
