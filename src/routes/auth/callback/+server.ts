import { error, redirect } from '@sveltejs/kit';
import { authenticateWithCode } from '$lib/auth/session.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const errorParam = url.searchParams.get('error');
	const errorDescription = url.searchParams.get('error_description');

	if (errorParam) {
		console.error('WorkOS auth error:', errorParam, errorDescription);
		throw error(400, {
			message: errorDescription || 'Authentication failed'
		});
	}

	if (!code) {
		throw error(400, {
			message: 'No authorization code provided'
		});
	}

	try {
		await authenticateWithCode(code, cookies);
	} catch (err) {
		console.error('Authentication failed:', err);
		throw error(500, {
			message: 'Authentication failed. Please try again.'
		});
	}

	throw redirect(302, '/dashboard');
};
